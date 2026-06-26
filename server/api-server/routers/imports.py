"""Import endpoints — Notion, Markdown, Confluence imports via REST API."""

from fastapi import APIRouter, HTTPException, UploadFile, File, Form
import html.parser
import re

from stdb_client import call_reducer, sql_query

router = APIRouter(prefix="/api/v1/import", tags=["import"])


# ─── HTML → ProseMirror (server-side) ────────────────────────────────────────

class HtmlToProseMirror(html.parser.HTMLParser):
    """Parse simple HTML (e.g., Notion HTML export) into ProseMirror JSON AST."""

    def __init__(self):
        super().__init__()
        self.doc = {"type": "doc", "content": []}
        self._stack = []  # [(type, attrs, content_list), ...]
        self._current_text = ""

    def _flush_text(self):
        text = self._current_text.strip()
        if text and self._stack:
            self._stack[-1][2].append({"type": "text", "text": text})
        self._current_text = ""

    def handle_starttag(self, tag, attrs):
        self._flush_text()
        attrs_dict = dict(attrs)
        if tag in ("h1", "h2", "h3", "h4", "h5", "h6"):
            level = int(tag[1])
            content = []
            self._stack.append(("heading", {"level": level}, content))
            self.doc["content"].append({"type": "heading", "attrs": {"level": level}, "content": content})
        elif tag == "p":
            content = []
            self._stack.append(("paragraph", {}, content))
            self.doc["content"].append({"type": "paragraph", "content": content})
        elif tag == "ul":
            self._stack.append(("bulletList", {}, None))
            self.doc["content"].append({"type": "bulletList", "content": []})
        elif tag == "ol":
            self._stack.append(("orderedList", {}, None))
            self.doc["content"].append({"type": "orderedList", "content": []})
        elif tag == "li":
            self._stack.append(("listItem", {}, None))
        elif tag == "blockquote":
            content = []
            self._stack.append(("blockquote", {}, None))
            self.doc["content"].append({"type": "blockquote", "content": [{"type": "paragraph", "content": content}]})
        elif tag == "pre":
            self._stack.append(("codeBlock", {}, None))
            self.doc["content"].append({"type": "codeBlock", "content": []})
        elif tag == "code":
            self._stack.append(("code", {}, None))
        elif tag == "hr":
            self.doc["content"].append({"type": "horizontalRule"})
        elif tag == "img":
            src = attrs_dict.get("src", "")
            alt = attrs_dict.get("alt", "")
            self.doc["content"].append({"type": "image", "attrs": {"src": src, "alt": alt}})
        elif tag in ("strong", "b"):
            self._stack.append(("bold", {}, None))
        elif tag in ("em", "i"):
            self._stack.append(("italic", {}, None))
        elif tag == "u":
            self._stack.append(("underline", {}, None))
        elif tag in ("s", "del"):
            self._stack.append(("strike", {}, None))
        elif tag == "a":
            href = attrs_dict.get("href", "")
            self._stack.append(("link", {"href": href}, None))

    def handle_endtag(self, tag):
        self._flush_text()
        # Pop from stack if this tag was tracked
        for i in range(len(self._stack) - 1, -1, -1):
            if self._stack[i][0] in (
                "heading", "paragraph", "bulletList", "orderedList",
                "listItem", "blockquote", "codeBlock", "code",
                "bold", "italic", "underline", "strike", "link",
            ):
                # For inline marks, wrap preceding text in the last paragraph
                break
        # Simplification: for this server-side parser we keep it basic
        # Marks are handled in handle_data via simple regex in the frontend too

    def handle_data(self, data):
        # Store text for inline mark wrapping
        stripped = data
        if self._stack and self._stack[-1][0] == "codeBlock":
            # Inside code block
            for item in reversed(self.doc["content"]):
                if item["type"] == "codeBlock":
                    item.setdefault("content", []).append({"type": "text", "text": stripped})
                    break
        elif self._stack and self._stack[-1][0] in ("bold", "italic", "underline", "strike", "link"):
            self._current_text += stripped
        else:
            # Append to last paragraph/list item
            self._current_text += stripped

    def get_doc(self) -> dict:
        self._flush_text()
        if not self.doc["content"]:
            self.doc["content"].append({"type": "paragraph", "content": []})
        return self.doc


def convert_html_to_prosemirror(html: str) -> dict:
    """Convert HTML string to ProseMirror JSON document."""
    parser = HtmlToProseMirror()
    parser.feed(html)
    return parser.get_doc()


# ─── Helper: generate page ID ────────────────────────────────────────────────

import time


def _make_id(prefix: str = "page") -> str:
    ts = int(time.time() * 1000)
    rand = ((ts * 1103515245 + 12345) & 0xFFFFFFFF)
    return f"{prefix}_{rand:x}"


# ─── Endpoints ────────────────────────────────────────────────────────────────


@router.post("/markdown")
async def import_markdown(
    file: UploadFile = File(...),
    collection_id: str = Form(""),
    parent_page_id: str = Form(""),
    created_by: str = Form("api"),
):
    """Import a single Markdown file as a new page."""
    content = await file.read()
    md = content.decode("utf-8", errors="replace")
    title = (file.filename or "Untitled").replace(".md", "").replace(".txt", "")
    # Simple MD → ProseMirror conversion (basic)
    doc = _markdown_to_prosemirror(md)
    page_id = _make_id("page")
    await call_reducer("create_page", [page_id, title, _json_dumps(doc), collection_id, parent_page_id, created_by])
    return {"status": "created", "id": page_id, "title": title}


@router.post("/notion")
async def import_notion(
    file: UploadFile = File(...),
    collection_id: str = Form(""),
    created_by: str = Form("api"),
):
    """Import a Notion export file (Markdown ZIP or HTML file)."""
    raw = await file.read()
    filename = (file.filename or "export").lower()

    # Single HTML file
    if filename.endswith(".html") or filename.endswith(".htm"):
        html = raw.decode("utf-8", errors="replace")
        doc = convert_html_to_prosemirror(html)
        title = filename.rsplit(".", 1)[0]
        page_id = _make_id("page")
        await call_reducer("create_page", [page_id, title, _json_dumps(doc), collection_id, "", created_by])
        return {"status": "created", "id": page_id, "title": title, "pages_created": 1}

    # Notion Markdown export (ZIP)
    if filename.endswith(".zip"):
        import zipfile
        import io

        try:
            zf = zipfile.ZipFile(io.BytesIO(raw))
        except Exception:
            raise HTTPException(400, "Invalid ZIP file")

        # Collect entries
        entries = []
        for path in zf.namelist():
            if path.endswith("/"):
                continue
            parts = path.split("/")
            fname = parts[-1]
            if fname.endswith(".md"):
                entries.append({
                    "path": path,
                    "name": fname[:-3],
                    "dir": "/".join(parts[:-1]),
                    "ext": ".md",
                })
            elif fname.endswith(".html") or fname.endswith(".htm"):
                entries.append({
                    "path": path,
                    "name": fname.rsplit(".", 1)[0],
                    "dir": "/".join(parts[:-1]),
                    "ext": ".html",
                })

        if not entries:
            raise HTTPException(400, "No Markdown or HTML files found in ZIP archive")

        # Sort shallow first
        entries.sort(key=lambda e: len(e["path"].split("/")))

        page_ids_by_dir: dict[str, str] = {}
        created = 0
        errors: list[str] = []

        for entry in entries:
            try:
                raw_content = zf.read(entry["path"]).decode("utf-8", errors="replace")
                if entry["ext"] == ".html":
                    doc = convert_html_to_prosemirror(raw_content)
                else:
                    doc = _markdown_to_prosemirror(raw_content)

                parent_id = page_ids_by_dir.get(entry["dir"], "")
                page_id = _make_id("page")
                await call_reducer("create_page", [page_id, entry["name"], _json_dumps(doc), collection_id, parent_id, created_by])

                child_key = entry["path"].rsplit(".", 1)[0]
                page_ids_by_dir[child_key] = page_id
                page_ids_by_dir[f"{entry['dir']}/{entry['name']}"] = page_id
                created += 1
            except Exception as e:
                errors.append(f"{entry['path']}: {e}")

        zf.close()
        result = {"status": "completed", "pages_created": created, "errors": errors}
        return result

    raise HTTPException(400, "Unsupported file format. Accepted: .md, .html, .zip (Notion Markdown export)")


# ─── Simple MD → ProseMirror (server-side helper) ────────────────────────────

def _markdown_to_prosemirror(md: str) -> dict:
    """Simple Markdown to ProseMirror JSON conversion."""
    doc = {"type": "doc", "content": []}
    lines = md.split("\n")
    i = 0
    in_code = False
    code_lang = ""
    code_lines: list[str] = []

    def add_para(text: str):
        text = text.strip()
        if not text:
            return
        doc["content"].append({
            "type": "paragraph",
            "content": [{"type": "text", "text": text}],
        })

    while i < len(lines):
        line = lines[i]

        if in_code:
            if line.startswith("```"):
                doc["content"].append({
                    "type": "codeBlock",
                    "attrs": {"language": code_lang},
                    "content": [{"type": "text", "text": "\n".join(code_lines)}],
                })
                code_lines = []
                code_lang = ""
                in_code = False
                i += 1
                continue
            code_lines.append(line)
            i += 1
            continue

        if line.startswith("```"):
            in_code = True
            code_lang = line[3:].strip()
            i += 1
            continue

        if not line.strip():
            i += 1
            continue

        # Heading
        hm = re.match(r"^(#{1,6})\s+(.+)$", line)
        if hm:
            level = len(hm.group(1))
            doc["content"].append({
                "type": "heading",
                "attrs": {"level": level},
                "content": [{"type": "text", "text": hm.group(2)}],
            })
            i += 1
            continue

        # Horizontal rule
        if re.match(r"^---+$", line):
            doc["content"].append({"type": "horizontalRule"})
            i += 1
            continue

        # Blockquote
        if line.startswith("> "):
            doc["content"].append({
                "type": "blockquote",
                "content": [{
                    "type": "paragraph",
                    "content": [{"type": "text", "text": line[2:]}],
                }],
            })
            i += 1
            continue

        # Unordered list
        if re.match(r"^[-*+]\s+", line):
            items = []
            while i < len(lines) and re.match(r"^[-*+]\s+", lines[i]):
                items.append({
                    "type": "listItem",
                    "content": [{
                        "type": "paragraph",
                        "content": [{"type": "text", "text": re.sub(r"^[-*+]\s+", "", lines[i])}],
                    }],
                })
                i += 1
            doc["content"].append({"type": "bulletList", "content": items})
            continue

        # Ordered list
        if re.match(r"^\d+\.\s+", line):
            items = []
            while i < len(lines) and re.match(r"^\d+\.\s+", lines[i]):
                items.append({
                    "type": "listItem",
                    "content": [{
                        "type": "paragraph",
                        "content": [{"type": "text", "text": re.sub(r"^\d+\.\s+", "", lines[i])}],
                    }],
                })
                i += 1
            doc["content"].append({"type": "orderedList", "content": items})
            continue

        add_para(line)
        i += 1

    if in_code and code_lines:
        doc["content"].append({
            "type": "codeBlock",
            "content": [{"type": "text", "text": "\n".join(code_lines)}],
        })

    if not doc["content"]:
        doc["content"].append({"type": "paragraph", "content": []})

    return doc


def _json_dumps(obj) -> str:
    """Minimal JSON serialiser (no external dep needed)."""
    import json as _json
    return _json.dumps(obj, ensure_ascii=False)
