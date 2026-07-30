"""Import endpoints — Notion, Markdown, Confluence imports via REST API."""

import html.parser
import logging
import re

from fastapi import APIRouter, File, Form, HTTPException, UploadFile
from models import ImportResponse
from stdb_client import call_reducer

logger = logging.getLogger("spacetime-wiki-api.imports")

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
        if text and self._stack and self._stack[-1][2] is not None:
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
            content = []
            self._stack.append(("bulletList", {}, content))
            self.doc["content"].append({"type": "bulletList", "content": content})
        elif tag == "ol":
            content = []
            self._stack.append(("orderedList", {}, content))
            self.doc["content"].append({"type": "orderedList", "content": content})
        elif tag == "li":
            self._stack.append(("listItem", {}, []))
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
        # Pop from stack if this tag was tracked and commit content
        for i in range(len(self._stack) - 1, -1, -1):
            entry = self._stack[i]
            if entry[0] in (
                "heading", "paragraph", "bulletList", "orderedList",
                "listItem", "blockquote", "codeBlock", "code",
                "bold", "italic", "underline", "strike", "link",
            ):
                if entry[0] in ("bulletList", "orderedList", "blockquote", "codeBlock"):
                    # These have content at self.doc["content"] — nothing extra to do
                    break
                elif entry[0] == "listItem":
                    # Commit list item content to parent list
                    content = entry[2]
                    for parent in reversed(self._stack[:i]):
                        if parent[0] in ("bulletList", "orderedList"):
                            if parent[2] is not None:
                                parent[2].append({"type": "listItem", "content": content} if content else {"type": "listItem"})
                            break
                    break
                # For inline marks, pop the stack and wrap preceding text
                # (simplified: marks are handled via handle_data text accumulation)
                break
        # Pop stack entries up to and including the matching tag
        # (for proper nesting we'd do more, but this is a simplified parser)

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


@router.post("/markdown", response_model=ImportResponse)
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


@router.post("/notion", response_model=ImportResponse)
async def import_notion(
    file: UploadFile = File(...),
    collection_id: str = Form(""),
    created_by: str = Form("api"),
):
    """Import a Notion export file (Markdown ZIP or HTML file)."""
    raw = await file.read()
    filename = (file.filename or "export").lower()

    # Single HTML file
    if filename.endswith((".html", ".htm")):
        html = raw.decode("utf-8", errors="replace")
        doc = convert_html_to_prosemirror(html)
        title = filename.rsplit(".", 1)[0]
        page_id = _make_id("page")
        await call_reducer("create_page", [page_id, title, _json_dumps(doc), collection_id, "", created_by])
        return {"status": "created", "id": page_id, "title": title, "pages_created": 1}

    # Notion Markdown export (ZIP)
    if filename.endswith(".zip"):
        import io
        import zipfile

        try:
            zf = zipfile.ZipFile(io.BytesIO(raw))
        except (zipfile.BadZipFile, zipfile.LargeZipFile):
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
            elif fname.endswith((".html", ".htm")):
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
            except (RuntimeError, ValueError, KeyError, OSError) as e:
                logger.exception("Failed to create page .%s.", entry["path"])
                errors.append(f"{entry['path']}: {e}")

        zf.close()
        result = {"status": "completed", "pages_created": created, "errors": errors}
        return result

    raise HTTPException(400, "Unsupported file format. Accepted: .md, .html, .zip (Notion Markdown export)")


@router.post("/confluence", response_model=ImportResponse)
async def import_confluence(
    file: UploadFile = File(...),
    collection_id: str = Form(""),
    created_by: str = Form("api"),
):
    """Import a Confluence Cloud/Server space export ZIP.

    Confluence space exports contain pages.xml for metadata and
    individual HTML files per page with Confluence-specific tags
    like <ac:structured-macro>, <ac:link>, <ri:page>, etc.
    """
    raw = await file.read()
    filename = (file.filename or "export").lower()

    if not filename.endswith(".zip"):
        raise HTTPException(400, "Confluence import requires a .zip file (space export). Supported: Confluence Cloud/Server HTML export ZIP.")

    import io
    import xml.etree.ElementTree as ET
    import zipfile

    try:
        zf = zipfile.ZipFile(io.BytesIO(raw))
    except (zipfile.BadZipFile, zipfile.LargeZipFile):
        raise HTTPException(400, "Invalid ZIP file")

    # ── Parse pages.xml for page metadata ─────────────────────────────────
    pages_meta: dict[str, dict] = {}  # page_id -> {title, parent_id}
    try:
        if "pages.xml" in zf.namelist():
            tree = ET.parse(zf.open("pages.xml"))
            root = tree.getroot()
            for page_elem in root.iter("page"):
                pid = page_elem.get("id", "") or page_elem.get("title", "")
                title = page_elem.get("title", page_elem.get("page-title", ""))
                parent = page_elem.get("parent-id", page_elem.get("parent_id", ""))
                if pid:
                    pages_meta[pid] = {"title": title, "parent_id": parent}
        elif "entities.xml" in zf.namelist():
            tree = ET.parse(zf.open("entities.xml"))
            root = tree.getroot()
            for entity in root.iter("entity"):
                if entity.get("type") == "page":
                    pid = entity.get("id", "")
                    title = ""
                    parent = ""
                    for prop in entity.iter("property"):
                        if prop.get("name") == "title":
                            title = prop.text or ""
                        if prop.get("name") in ("parent", "parentId", "parent_id"):
                            parent = prop.text or ""
                    if pid:
                        pages_meta[pid] = {"title": title, "parent_id": parent}
    except (ET.ParseError, zipfile.BadZipFile, ValueError):
        # pages.xml/entities.xml is optional; fall back to HTML filenames
        pass

    # ── Collect HTML entries ───────────────────────────────────────────────
    html_entries: list[dict] = []
    for path in zf.namelist():
        if path.endswith("/") or path.startswith("attachments/"):
            continue
        parts = path.split("/")
        fname = parts[-1]
        if fname.endswith((".html", ".htm")):
            entry_name = fname.rsplit(".", 1)[0]
            # Try to find matching metadata
            meta = pages_meta.get(entry_name, pages_meta.get(path, {}))
            display_name = meta.get("title", entry_name)
            parent_id_ref = meta.get("parent_id", "")
            html_entries.append({
                "path": path,
                "name": display_name,
                "dir": "/".join(parts[:-1]),
                "meta_id": entry_name,
                "parent_ref": parent_id_ref,
            })

    if not html_entries:
        # Fall back: maybe the HTML is directly in ZIP root with no pages.xml
        for path in zf.namelist():
            if path.endswith("/"):
                continue
            fname = path.split("/")[-1]
            if fname.endswith((".html", ".htm")):
                html_entries.append({
                    "path": path,
                    "name": fname.rsplit(".", 1)[0],
                    "dir": "",
                    "meta_id": "",
                    "parent_ref": "",
                })

    if not html_entries:
        raise HTTPException(400, "No HTML pages found in Confluence export ZIP")

    # Sort shallow first
    html_entries.sort(key=lambda e: len(e["path"].split("/")))

    # ── Process pages ──────────────────────────────────────────────────────
    page_ids_by_dir: dict[str, str] = {}
    page_ids_by_meta_id: dict[str, str] = {}
    created = 0
    errors: list[str] = []

    for entry in html_entries:
        try:
            raw_content = zf.read(entry["path"]).decode("utf-8", errors="replace")
            doc = _confluence_html_to_prosemirror(raw_content)

            # Determine parent page ID
            parent_id = ""
            if entry["parent_ref"] and entry["parent_ref"] in page_ids_by_meta_id:
                parent_id = page_ids_by_meta_id[entry["parent_ref"]]
            if not parent_id:
                parent_id = page_ids_by_dir.get(entry["dir"], "")

            page_id = _make_id("page")
            await call_reducer(
                "create_page",
                [
                    page_id, entry["name"],
                    _json_dumps(doc),
                    collection_id, parent_id, created_by,
                ],
            )

            page_ids_by_dir[entry["path"].rsplit(".", 1)[0]] = page_id
            page_ids_by_dir[f"{entry['dir']}/{entry['name']}"] = page_id
            if entry["meta_id"]:
                page_ids_by_meta_id[entry["meta_id"]] = page_id
            created += 1
        except (RuntimeError, ValueError, KeyError, OSError) as e:
            logger.exception("Failed to create Confluence page .%s.", entry["path"])
            errors.append(f"{entry['path']}: {e}")

    zf.close()
    return {
        "status": "completed",
        "pages_created": created,
        "errors": errors,
    }


def _confluence_html_to_prosemirror(html: str) -> dict:
    """Convert Confluence HTML export to ProseMirror JSON.

    Strips Confluence-specific markup (<ac:structured-macro>, <ac:link>,
    <ri:page>, <ac:image>, etc.) and converts basic HTML to PM nodes.
    """
    import re

    # ── Pre-clean Confluence-specific tags ────────────────────────────────
    # Remove CDATA sections
    html = re.sub(r'<!\[CDATA\[(.*?)\]\]>', r'\1', html, flags=re.DOTALL)

    # Convert <ac:structured-macro ac:name="xxx">...</ac:structured-macro>
    # to a styled blockquote or callout-like paragraph
    def _replace_macro(m):
        name = m.group(1) or ""
        body = m.group(2) or ""
        # Extract rich-text body content
        body_clean = re.sub(r'</?ac:rich-text-body[^>]*>', '', body)
        body_clean = re.sub(r'<ac:parameter[^>]*>.*?</ac:parameter>', '', body_clean, flags=re.DOTALL)
        # Map common macros to readable prefixes
        labels = {
            "info": "ℹ️",
            "warning": "⚠️",
            "note": "📝",
            "tip": "💡",
            "code": "```",
            "expand": "",
            "toc": "",
        }
        prefix = labels.get(name.lower(), f"[{name}]")
        return f"{prefix} {body_clean}" if prefix else body_clean
    html = re.sub(
        r'<ac:structured-macro\s+ac:name="([^"]*)"[^>]*>(.*?)</ac:structured-macro>',
        _replace_macro,
        html,
        flags=re.DOTALL,
    )

    # Convert <ac:link><ri:page ri:content-title="Title"/><ac:plain-text-link-body>...</ac:plain-text-link-body></ac:link>
    html = re.sub(
        r'<ac:link>.*?<ri:page[^>]*ri:content-title="([^"]*)"[^>]*/>.*?</ac:link>',
        r'\1',
        html,
        flags=re.DOTALL,
    )
    # Convert <ac:link><ri:attachment .../></ac:link>
    html = re.sub(r'<ac:link>.*?<ri:attachment[^>]*/>.*?</ac:link>', '[attachment]', html, flags=re.DOTALL)
    # Convert plain <ac:link>...</ac:link>
    html = re.sub(
        r'<ac:link>\s*<ac:plain-text-link-body>(.*?)</ac:plain-text-link-body>\s*</ac:link>',
        r'\1',
        html,
        flags=re.DOTALL,
    )
    html = re.sub(r'<ac:link>.*?</ac:link>', '', html, flags=re.DOTALL)

    # Convert <ac:image> to placeholder
    html = re.sub(r'<ac:image>.*?<ri:attachment[^>]*ri:filename="([^"]*)"[^>]*/>.*?</ac:image>', r'[image: \1]', html, flags=re.DOTALL)
    html = re.sub(r'<ac:image>.*?<ri:url[^>]*ri:value="([^"]*)"[^>]*/>.*?</ac:image>', r'[image: \1]', html, flags=re.DOTALL)
    html = re.sub(r'<ac:image>.*?</ac:image>', '[image]', html, flags=re.DOTALL)

    # Remove remaining Confluence namespaced tags
    html = re.sub(r'</?ac:[\w-]+[^>]*>', '', html)
    html = re.sub(r'</?ri:[\w-]+[^>]*>', '', html)
    html = re.sub(r'</?at:[\w-]+[^>]*>', '', html)

    # Remove Confluence-specific meta/ style sections
    html = re.sub(r'<meta[^>]*>', '', html, flags=re.IGNORECASE)
    html = re.sub(r'<style[^>]*>.*?</style>', '', html, flags=re.DOTALL | re.IGNORECASE)

    # Remove Confluence chrome: #main-content, #Content, etc. keep inner
    main_content = re.search(r'<div[^>]*id="(main-content|Content|page-content)"[^>]*>(.*?)</div>\s*$', html, re.DOTALL)
    if main_content:
        html = main_content.group(2)

    # ── Now convert cleaned HTML to ProseMirror ────────────────────────────
    # Use the existing HtmlToProseMirror parser for the cleaned HTML
    return convert_html_to_prosemirror(html)


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
