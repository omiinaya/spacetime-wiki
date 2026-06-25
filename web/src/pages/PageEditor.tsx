import { useState, useEffect, useCallback, useRef } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useEditor, EditorContent } from "@tiptap/react";
import { createPortal } from "react-dom";
import StarterKit from "@tiptap/starter-kit";
import Placeholder from "@tiptap/extension-placeholder";
import Link from "@tiptap/extension-link";
import { ImageEnhanced } from "../extensions/ImageEnhanced";
import { Table } from "@tiptap/extension-table";
import { TableRow } from "@tiptap/extension-table-row";
import { TableHeader } from "@tiptap/extension-table-header";
import { TableCell } from "@tiptap/extension-table-cell";
import TaskList from "@tiptap/extension-task-list";
import TaskItem from "@tiptap/extension-task-item";
import Highlight from "@tiptap/extension-highlight";
import CodeBlockLowlight from "@tiptap/extension-code-block-lowlight";
import { Details } from "../extensions/Details";
import { Callout, CALLOUT_TYPES } from "../extensions/Callout";
import { Mention } from "../extensions/Mention";
import { DragHandle } from "../extensions/DragHandle";
import { Mermaid } from "../extensions/Mermaid";
import { MathInline, MathBlock } from "../extensions/Math";
import { VideoEmbed, detectProvider } from "../extensions/VideoEmbed";
import { Drawio } from "../extensions/Drawio";
import { PlantUML } from "../extensions/PlantUML";
import { ImageLightbox } from "../components/ImageLightbox";
import { common, createLowlight } from "lowlight";
import {
  Bold,
  Italic,
  Underline as UnderlineIcon,
  Strikethrough,
  Code,
  List,
  ListOrdered,
  Quote,
  Heading1,
  Heading2,
  Heading3,
  CheckSquare,
  Minus,
  Link as LinkIcon,
  Image as ImageIcon,
  Table as TableIcon,
  Eye,
  Save,
  ArrowLeft,
  Trash2,
  Archive,
  Copy,
  Loader2,
  Highlighter,
  X,
  ChevronDown,
  Maximize2,
  Palette,
  Code2,
} from "lucide-react";
import { api, Page } from "../lib/api";
import { cn } from "../lib/utils";

const lowlight = createLowlight(common);

// ─── Slash command items ─────────────────────────────────────────────────────
// Keyboard handler in the editor detects "/" and shows a dropdown.
// No tippy/ReactRenderer dependency — just portals + DOM coordinates.

const SLASH_COMMANDS = [
  { title: "Heading 1", description: "Large section heading", icon: "H1", command: (e) => e?.chain().focus().toggleHeading({ level: 1 }).run() },
  { title: "Heading 2", description: "Medium section heading", icon: "H2", command: (e) => e?.chain().focus().toggleHeading({ level: 2 }).run() },
  { title: "Heading 3", description: "Small section heading", icon: "H3", command: (e) => e?.chain().focus().toggleHeading({ level: 3 }).run() },
  { title: "Bullet List", description: "Create a simple bulleted list", icon: "•", command: (e) => e?.chain().focus().toggleBulletList().run() },
  { title: "Numbered List", description: "Create a numbered list", icon: "1.", command: (e) => e?.chain().focus().toggleOrderedList().run() },
  { title: "Task List", description: "Track tasks with checkboxes", icon: "☑", command: (e) => e?.chain().focus().toggleTaskList().run() },
  { title: "Blockquote", description: "Capture a quote", icon: "❝", command: (e) => e?.chain().focus().toggleBlockquote().run() },
  { title: "Code Block", description: "Capture a code snippet", icon: "</>", command: (e) => e?.chain().focus().toggleCodeBlock().run() },
  { title: "Table", description: "Add a table", icon: "⊞", command: (e) => e?.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run() },
  { title: "Image", description: "Insert an image", icon: "🖼", command: (e) => { const url = prompt("Image URL:"); if (url) e?.chain().focus().setImageEnhanced({ src: url }).run(); } },
  { title: "Divider", description: "Insert a horizontal divider", icon: "—", command: (e) => e?.chain().focus().setHorizontalRule().run() },
  { title: "Toggle", description: "Collapsible toggle block", icon: "▶", command: (e) => e?.chain().focus().toggleDetails().run() },
  { title: "Info Callout", description: "Blue info notice block", icon: "ℹ️", command: (e) => e?.chain().focus().toggleCallout("info").run() },
  { title: "Warning Callout", description: "Amber warning notice block", icon: "⚠️", command: (e) => e?.chain().focus().toggleCallout("warning").run() },
  { title: "Tip Callout", description: "Green tip notice block", icon: "💡", command: (e) => e?.chain().focus().toggleCallout("tip").run() },
  { title: "Danger Callout", description: "Red danger notice block", icon: "🚨", command: (e) => e?.chain().focus().toggleCallout("danger").run() },
  { title: "Diagram", description: "Insert a Mermaid diagram", icon: "📊", command: (e) => e?.chain().focus().setMermaid({ src: "graph TD\\n  A[Start] --> B[Process]\\n  B --> C[End]" }).run() },
  { title: "Math Block", description: "Insert LaTeX math (KaTeX)", icon: "∑", command: (e) => e?.chain().focus().setMathBlock({ tex: "E = mc^2" }).run() },
  { title: "Video", description: "Insert a video embed (YouTube, Vimeo, Loom)", icon: "🎬", command: (e) => { const url = prompt("Video URL:"); if (url) e?.chain().focus().setVideoEmbed({ src: url }).run(); } },
  { title: "Draw.io", description: "Insert a draw.io diagram", icon: "📐", command: (e) => e?.chain().focus().setDrawio({ src: "" }).run() },
  { title: "PlantUML", description: "Insert a PlantUML diagram", icon: "🌿", command: (e) => e?.chain().focus().setPlantUML({ src: "@startuml\\nAlice -> Bob: Hello\\nBob -> Alice: Hi!\\n@enduml" }).run() },
];

// ─── Format conversion utilities ─────────────────────────────────────────────

function tiptapToMarkdown(doc: any): string {
  const lines: string[] = [];
  function walk(node: any, depth = 0) {
    if (!node) return;
    if (node.type === "doc" || node.type === "tableRow" || node.type === "tableHeader" || node.type === "table") {
      node.content?.forEach((c: any) => walk(c, depth));
    } else if (node.type === "paragraph") {
      let text = "";
      node.content?.forEach((c: any) => {
        if (c.type === "text") {
          let t = c.text || "";
          if (c.marks) {
            c.marks.forEach((m: any) => {
              if (m.type === "bold") t = `**${t}**`;
              if (m.type === "italic") t = `_${t}_`;
              if (m.type === "strike") t = `~~${t}~~`;
              if (m.type === "code") t = `\`${t}\``;
              if (m.type === "link") t = `[${t}](${m.attrs?.href || ""})`;
            });
          }
          text += t;
        } else if (c.type === "image" || c.type === "imageEnhanced") {
          text += `![${c.attrs?.alt || ""}](${c.attrs?.src || ""})`;
        } else if (c.type === "hardBreak") {
          text += "  \n";
        }
      });
      lines.push(text);
      lines.push("");
    } else if (node.type === "heading") {
      const level = node.attrs?.level || 1;
      let text = "";
      node.content?.forEach((c: any) => { if (c.text) text += c.text; });
      lines.push(`${"#".repeat(level)} ${text}`);
      lines.push("");
    } else if (node.type === "bulletList") {
      node.content?.forEach((item: any) => {
        item.content?.forEach((p: any) => {
          let text = "";
          p.content?.forEach((c: any) => { if (c.text) text += c.text; });
          lines.push(`- ${text}`);
        });
      });
      lines.push("");
    } else if (node.type === "orderedList") {
      node.content?.forEach((item: any, i: number) => {
        item.content?.forEach((p: any) => {
          let text = "";
          p.content?.forEach((c: any) => { if (c.text) text += c.text; });
          lines.push(`${i + 1}. ${text}`);
        });
      });
      lines.push("");
    } else if (node.type === "codeBlock") {
      const lang = node.attrs?.language || "";
      lines.push("```" + lang);
      let text = "";
      node.content?.forEach((c: any) => { if (c.text) text += c.text; });
      lines.push(text);
      lines.push("```");
      lines.push("");
    } else if (node.type === "blockquote") {
      node.content?.forEach((c: any) => {
        const inner: string[] = [];
        (c.content || []).forEach((cc: any) => { if (cc.text) inner.push(cc.text); });
        lines.push(`> ${inner.join(" ")}`);
      });
      lines.push("");
    } else if (node.type === "horizontalRule") {
      lines.push("---");
      lines.push("");
    } else if (node.type === "taskList") {
      node.content?.forEach((item: any) => {
        item.content?.forEach((p: any) => {
          const checked = item.attrs?.checked ? "x" : " ";
          let text = "";
          p.content?.forEach((c: any) => { if (c.text) text += c.text; });
          lines.push(`- [${checked}] ${text}`);
        });
      });
      lines.push("");
    } else if (node.type === "callout") {
      const type = node.attrs?.type || "info";
      lines.push(`> **${type}:**`);
      node.content?.forEach((c: any) => {
        let text = "";
        c.content?.forEach((cc: any) => { if (cc.text) text += cc.text; });
        lines.push(`> ${text}`);
      });
      lines.push("");
    } else if (node.type === "details") {
      lines.push("<details>");
      node.content?.forEach((c: any) => {
        if (c.type === "detailsSummary") {
          let text = "";
          c.content?.forEach((cc: any) => { if (cc.text) text += cc.text; });
          lines.push(`<summary>${text}</summary>`);
        } else {
          walk(c, depth);
        }
      });
      lines.push("</details>");
      lines.push("");
    } else {
      // fallback: render any unrecognised node as its text content
      let text = "";
      node.content?.forEach((c: any) => { if (c.text) text += c.text; });
      if (text) lines.push(text);
    }
  }
  walk(doc);
  while (lines.length > 0 && lines[lines.length - 1] === "") lines.pop();
  return lines.join("\n");
}

function markdownToProseMirror(md: string): any {
  const doc: any = { type: "doc", content: [] };
  const lines = md.split("\n");
  let i = 0;
  let inCodeBlock = false;
  let codeLang = "";
  let codeLines: string[] = [];

  function addParagraph(text: string) {
    if (!text.trim()) return;
    const content: any[] = [];
    // Parse inline marks: **bold**, _italic_, `code`, [link](url), ~~strike~~
    const parts = text.split(/(\*\*.*?\*\*|_.*?_|`.*?`|~~.*?~~|\[.*?\]\(.*?\))/g);
    for (const part of parts) {
      if (!part) continue;
      if (part.startsWith("**") && part.endsWith("**")) {
        content.push({ type: "text", text: part.slice(2, -2), marks: [{ type: "bold" }] });
      } else if (part.startsWith("_") && part.endsWith("_")) {
        content.push({ type: "text", text: part.slice(1, -1), marks: [{ type: "italic" }] });
      } else if (part.startsWith("`") && part.endsWith("`")) {
        content.push({ type: "text", text: part.slice(1, -1), marks: [{ type: "code" }] });
      } else if (part.startsWith("~~") && part.endsWith("~~")) {
        content.push({ type: "text", text: part.slice(2, -2), marks: [{ type: "strike" }] });
      } else if (part.startsWith("[") && part.includes("](")) {
        const match = part.match(/^\[(.*?)\]\((.*?)\)$/);
        if (match) {
          content.push({ type: "text", text: match[1], marks: [{ type: "link", attrs: { href: match[2] } }] });
        } else {
          content.push({ type: "text", text: part });
        }
      } else {
        content.push({ type: "text", text: part });
      }
    }
    if (content.length > 0) {
      doc.content.push({ type: "paragraph", content });
    }
  }

  while (i < lines.length) {
    const line = lines[i];

    if (inCodeBlock) {
      if (line.startsWith("```")) {
        doc.content.push({ type: "codeBlock", attrs: { language: codeLang }, content: [{ type: "text", text: codeLines.join("\n") }] });
        codeLines = [];
        codeLang = "";
        inCodeBlock = false;
        i++;
        continue;
      }
      codeLines.push(line);
      i++;
      continue;
    }

    if (line.startsWith("```")) {
      inCodeBlock = true;
      codeLang = line.slice(3).trim();
      i++;
      continue;
    }

    if (!line.trim()) { i++; continue; }

    // Heading
    const headingMatch = line.match(/^(#{1,6})\s+(.+)$/);
    if (headingMatch) {
      const level = headingMatch[1].length;
      const text = headingMatch[2];
      doc.content.push({ type: "heading", attrs: { level }, content: [{ type: "text", text }] });
      i++;
      continue;
    }

    // Horizontal rule
    if (/^---+\s*$/.test(line)) {
      doc.content.push({ type: "horizontalRule" });
      i++;
      continue;
    }

    // Blockquote
    if (line.startsWith("> ")) {
      const text = line.slice(2);
      doc.content.push({ type: "blockquote", content: [{ type: "paragraph", content: [{ type: "text", text }] }] });
      i++;
      continue;
    }

    // Unordered list
    if (/^[-*+]\s+/.test(line)) {
      const items: any[] = [];
      while (i < lines.length && /^[-*+]\s+/.test(lines[i])) {
        const itemText = lines[i].replace(/^[-*+]\s+/, "");
        items.push({ type: "listItem", content: [{ type: "paragraph", content: [{ type: "text", text: itemText }] }] });
        i++;
      }
      doc.content.push({ type: "bulletList", content: items });
      continue;
    }

    // Ordered list
    if (/^\d+\.\s+/.test(line)) {
      const items: any[] = [];
      while (i < lines.length && /^\d+\.\s+/.test(lines[i])) {
        const itemText = lines[i].replace(/^\d+\.\s+/, "");
        items.push({ type: "listItem", content: [{ type: "paragraph", content: [{ type: "text", text: itemText }] }] });
        i++;
      }
      doc.content.push({ type: "orderedList", content: items });
      continue;
    }

    // Task list
    if (/^\s*[-*+]\s+\[[ x]\]\s+/i.test(line)) {
      const items: any[] = [];
      while (i < lines.length && /^\s*[-*+]\s+\[[ x]\]\s+/i.test(lines[i])) {
        const checked = lines[i].includes("[x]") || lines[i].includes("[X]");
        const text = lines[i].replace(/^\s*[-*+]\s+\[[ x]\]\s+/i, "");
        items.push({ type: "taskItem", attrs: { checked }, content: [{ type: "paragraph", content: [{ type: "text", text }] }] });
        i++;
      }
      doc.content.push({ type: "taskList", content: items });
      continue;
    }

    // Default: paragraph
    addParagraph(line);
    i++;
  }

  // Add trailing code block if unclosed
  if (inCodeBlock && codeLines.length > 0) {
    doc.content.push({ type: "codeBlock", attrs: { language: codeLang }, content: [{ type: "text", text: codeLines.join("\n") }] });
  }

  if (doc.content.length === 0) {
    doc.content.push({ type: "paragraph", content: [] });
  }
  return doc;
}

// ─── Selection Floating Toolbar ──────────────────────────────────────────────

function SelectionToolbar({
  editor, handleAddLink,
}: {
  editor: ReturnType<typeof useEditor>;
  handleAddLink: () => void;
}) {
  const [pos, setPos] = useState<{ top: number; left: number } | null>(null);

  useEffect(() => {
    if (!editor) return;
    const update = () => {
      const { from, to, empty } = editor.state.selection;
      if (empty || from === to) {
        setPos(null);
        return;
      }
      const view = editor.view;
      const start = view.coordsAtPos(from);
      const end = view.coordsAtPos(to);
      setPos({
        top: start.top - 44,
        left: (start.left + end.right) / 2,
      });
    };
    editor.on("selectionUpdate", update);
    editor.on("blur", () => setPos(null));
    return () => {
      editor.off("selectionUpdate", update);
      editor.off("blur", () => setPos(null));
    };
  }, [editor]);

  if (!pos || !editor) return null;

  return (
    <div
      className="fixed z-50 flex items-center gap-0.5 p-1 rounded-lg border border-border bg-[#1a1a1a] shadow-2xl transform -translate-x-1/2"
      style={{ top: pos.top, left: pos.left }}
    >
      <button onClick={() => editor.chain().focus().toggleBold().run()} className={cn("p-1.5 rounded text-muted-foreground hover:text-foreground hover:bg-muted transition-colors", editor.isActive("bold") && "text-primary bg-primary/10")} title="Bold">
        <Bold className="h-3.5 w-3.5" />
      </button>
      <button onClick={() => editor.chain().focus().toggleItalic().run()} className={cn("p-1.5 rounded text-muted-foreground hover:text-foreground hover:bg-muted transition-colors", editor.isActive("italic") && "text-primary bg-primary/10")} title="Italic">
        <Italic className="h-3.5 w-3.5" />
      </button>
      <button onClick={() => editor.chain().focus().toggleStrike().run()} className={cn("p-1.5 rounded text-muted-foreground hover:text-foreground hover:bg-muted transition-colors", editor.isActive("strike") && "text-primary bg-primary/10")} title="Strikethrough">
        <Strikethrough className="h-3.5 w-3.5" />
      </button>
      <button onClick={() => editor.chain().focus().toggleCode().run()} className={cn("p-1.5 rounded text-muted-foreground hover:text-foreground hover:bg-muted transition-colors", editor.isActive("code") && "text-primary bg-primary/10")} title="Inline Code">
        <Code className="h-3.5 w-3.5" />
      </button>
      <span className="w-px h-4 bg-border" />
      <button onClick={handleAddLink} className={cn("p-1.5 rounded text-muted-foreground hover:text-foreground hover:bg-muted transition-colors", editor.isActive("link") && "text-primary bg-primary/10")} title="Link">
        <LinkIcon className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}

// ─── Image Floating Toolbar ───────────────────────────────────────────────────

function ImageToolbar({
  editor,
}: {
  editor: ReturnType<typeof useEditor>;
}) {
  const [pos, setPos] = useState<{ top: number; left: number } | null>(null);
  const [widthInput, setWidthInput] = useState("");

  useEffect(() => {
    if (!editor) return;
    const update = () => {
      const { selection } = editor.state;
      if (selection.type.name !== "NodeSelection") {
        setPos(null);
        return;
      }
      const node = selection.node;
      if (!node || (node.type.name !== "imageEnhanced")) {
        setPos(null);
        return;
      }
      const view = editor.view;
      const from = selection.from;
      const coords = view.coordsAtPos(from);
      setPos({
        top: coords.top - 56,
        left: coords.left + (view.dom.getBoundingClientRect().width / 2),
      });
      setWidthInput(node.attrs.width || "");
    };
    editor.on("selectionUpdate", update);
    editor.on("blur", () => setTimeout(() => setPos(null), 200));
    // Also update on click
    editor.view.dom.addEventListener("mouseup", update);
    return () => {
      editor.off("selectionUpdate", update);
      editor.off("blur", () => setPos(null));
      editor.view.dom.removeEventListener("mouseup", update);
    };
  }, [editor]);

  if (!pos || !editor) return null;

  const { selection } = editor.state;
  if (selection.type.name !== "NodeSelection") return null;
  const node = selection.node;
  if (!node || node.type.name !== "imageEnhanced") return null;

  const currentAttrs = node.attrs;
  const align = currentAttrs.align || "center";
  const width = currentAttrs.width || "";

  const setAlign = (newAlign: "left" | "center" | "right") => {
    editor.chain().focus().updateAttributes("imageEnhanced", { align: newAlign }).run();
  };

  const resizePresets = [
    { label: "S", width: "200px" },
    { label: "M", width: "400px" },
    { label: "L", width: "600px" },
    { label: "XL", width: "800px" },
    { label: "Full", width: "100%" },
  ];

  const handleWidthApply = () => {
    const val = widthInput.trim();
    if (val) {
      const num = parseInt(val);
      if (!isNaN(num) && num > 0) {
        editor.chain().focus().updateAttributes("imageEnhanced", { width: `${num}px` }).run();
      } else if (val.endsWith("%") || val.endsWith("px")) {
        editor.chain().focus().updateAttributes("imageEnhanced", { width: val }).run();
      }
    }
  };

  return createPortal(
    <div
      className="fixed z-50 flex items-center gap-1 px-2 py-1.5 rounded-lg border border-border bg-[#1a1a1a] shadow-2xl"
      style={{
        top: pos.top,
        left: "50%",
        transform: "translateX(-50%)",
      }}
      contentEditable={false}
      onMouseDown={(e) => e.preventDefault()}
    >
      {/* Alignment */}
      <div className="flex items-center gap-0.5 mr-1">
        <button
          onClick={() => setAlign("left")}
          className={`p-1 rounded transition-colors ${align === "left" ? "text-primary bg-primary/10" : "text-muted-foreground hover:text-foreground hover:bg-muted"}`}
          title="Align left"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="17" y1="10" x2="3" y2="10" /><line x1="21" y1="6" x2="3" y2="6" /><line x1="17" y1="14" x2="3" y2="14" /><line x1="21" y1="18" x2="3" y2="18" />
          </svg>
        </button>
        <button
          onClick={() => setAlign("center")}
          className={`p-1 rounded transition-colors ${align === "center" ? "text-primary bg-primary/10" : "text-muted-foreground hover:text-foreground hover:bg-muted"}`}
          title="Align center"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="18" y1="10" x2="6" y2="10" /><line x1="21" y1="6" x2="3" y2="6" /><line x1="18" y1="14" x2="6" y2="14" /><line x1="21" y1="18" x2="3" y2="18" />
          </svg>
        </button>
        <button
          onClick={() => setAlign("right")}
          className={`p-1 rounded transition-colors ${align === "right" ? "text-primary bg-primary/10" : "text-muted-foreground hover:text-foreground hover:bg-muted"}`}
          title="Align right"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="21" y1="10" x2="7" y2="10" /><line x1="21" y1="6" x2="3" y2="6" /><line x1="21" y1="14" x2="7" y2="14" /><line x1="21" y1="18" x2="3" y2="18" />
          </svg>
        </button>
      </div>

      <span className="w-px h-5 bg-border mx-0.5" />

      {/* Resize presets */}
      <div className="flex items-center gap-0.5">
        {resizePresets.map((preset) => (
          <button
            key={preset.label}
            onClick={() => editor.chain().focus().updateAttributes("imageEnhanced", { width: preset.width }).run()}
            className={`px-1.5 py-0.5 rounded text-[11px] font-medium transition-colors ${
              width === preset.width
                ? "text-primary bg-primary/10"
                : "text-muted-foreground hover:text-foreground hover:bg-muted"
            }`}
            title={`${preset.label} (${preset.width})`}
          >
            {preset.label}
          </button>
        ))}
      </div>

      {/* Custom width input */}
      <div className="flex items-center gap-1 ml-1">
        <input
          type="text"
          value={widthInput}
          onChange={(e) => setWidthInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") { e.preventDefault(); handleWidthApply(); }
            if (e.key === "Escape") { e.preventDefault(); (e.target as HTMLInputElement).blur(); }
          }}
          placeholder="Width"
          className="w-16 h-6 px-1.5 rounded border border-border/50 bg-transparent text-[11px] text-foreground placeholder:text-muted-foreground/40 outline-none focus:border-primary/50 text-center"
        />
      </div>
    </div>,
    document.body,
  );
}

// ─── Page Editor Component ────────────────────────────────────────────────────

interface Props {
  userId: string | null;
}

export function PageEditor({ userId }: Props) {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const isNew = !id;
  const [page, setPage] = useState<Page | null>(null);
  const [title, setTitle] = useState("");
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(!isNew);
  const [preview, setPreview] = useState(false);
  const [error, setError] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);
  const editorRef = useRef<HTMLDivElement>(null);

  // Slash menu state
  const [slashOpen, setSlashOpen] = useState(false);
  const [slashQuery, setSlashQuery] = useState("");
  const [slashIndex, setSlashIndex] = useState(0);
  const [slashPos, setSlashPos] = useState<{ top: number; left: number }>({ top: 0, left: 0 });

  // Tags state
  const [tags, setTags] = useState<{ id: string; name: string; value: string }[]>([]);
  const [tagInput, setTagInput] = useState("");

  // Keyboard shortcuts modal
  const [showShortcuts, setShowShortcuts] = useState(false);
  const [lightboxSrc, setLightboxSrc] = useState<string | null>(null);
  const [lightboxAlt, setLightboxAlt] = useState<string>("");
  const [showColorPicker, setShowColorPicker] = useState(false);
  const [editorMode, setEditorMode] = useState<"wysiwyg" | "markdown" | "split">("wysiwyg");
  const [markdownSource, setMarkdownSource] = useState("");

  // Load existing page
  useEffect(() => {
    if (id) {
      api.pages.get(id).then((p) => {
        if (p) {
          setPage(p);
          setTitle(p.title);
        }
        setLoading(false);
      });
    }
  }, [id]);

  // Load tags when editing existing page
  useEffect(() => {
    if (id) api.tags.list(id).then(setTags);
  }, [id, page]);

  const handleAddTag = async () => {
    const name = tagInput.trim();
    if (!name || !id) return;
    const tagId = await api.tags.add(id, name, "");
    setTags([...tags, { id: tagId, name, value: "" }]);
    setTagInput("");
  };

  const handleRemoveTag = async (tagId: string) => {
    await api.tags.remove(tagId);
    setTags(tags.filter((t) => t.id !== tagId));
  };

  // ─── Editor ──────────────────────────────────────────────────────────────

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: { levels: [1, 2, 3] },
        codeBlock: false, // replaced by CodeBlockLowlight
        link: false,     // use explicit Link.configure below
      }),
      DragHandle,
      Placeholder.configure({ placeholder: "Start writing... or type / for commands" }),
      Link.configure({ openOnClick: false }),
      ImageEnhanced,
      Table.configure({ resizable: true }),
      TableRow,
      TableHeader,
      TableCell,
      TaskList,
      TaskItem.configure({ nested: true }),
      Highlight,
      CodeBlockLowlight.configure({ lowlight }),
      // Slash commands handled via keydown listener below
      Details,
      Callout,
      Mermaid,
      MathInline,
      MathBlock,
      VideoEmbed,
      Drawio,
      PlantUML,
      Mention.configure({ HTMLAttributes: { class: 'mention' } }),
    ],
    content: page ? (() => { try { return JSON.parse(page.content || "{}"); } catch { return "<p></p>"; } })() : undefined,
    editable: !preview,
    editorProps: {
      handlePaste: (_, event) => {
        const items = event.clipboardData?.items;
        if (!items) return false;
        // Check for pasted images first
        for (const item of items) {
          if (item.type.startsWith("image/")) {
            event.preventDefault();
            const file = item.getAsFile();
            if (file) {
              const url = URL.createObjectURL(file);
              editor?.chain().focus().setImageEnhanced({ src: url }).run();
            }
            return true;
          }
        }
        // Check for pasted video URLs (text)
        const text = event.clipboardData?.getData("text");
        if (text) {
          // Check each line for video URLs
          const lines = text.split("\n").map(l => l.trim()).filter(Boolean);
          for (const line of lines) {
            const provider = detectProvider(line);
            if (provider) {
              event.preventDefault();
              editor?.chain().focus().setVideoEmbed({ src: line }).run();
              return true;
            }
          }
        }
        return false;
      },
      handleDrop: (_, event) => {
        const files = event.dataTransfer?.files;
        if (!files) return false;
        for (const file of files) {
          if (file.type.startsWith("image/")) {
            event.preventDefault();
            const url = URL.createObjectURL(file);
            editor?.chain().focus().setImageEnhanced({ src: url }).run();
            return true;
          }
        }
        return false;
      },
      handleClick: (_view, _pos, event) => {
        const target = event.target as HTMLElement;
        if (target.tagName === "IMG" && target.getAttribute("src")) {
          setLightboxSrc(target.getAttribute("src")!);
          setLightboxAlt(target.getAttribute("alt") || "");
          return true;
        }
        return false;
      },
      attributes: {
        class: "prose prose-invert max-w-none focus:outline-none min-h-[60vh]",
      },
    },
  });

  // Sync content when page loads
  useEffect(() => {
    if (editor && page) {
      try {
        const parsed = JSON.parse(page.content || "{}");
        if (parsed?.type === "doc") {
          editor.commands.setContent(parsed);
        }
      } catch { /* ignore */ }
    }
  }, [page, editor]);

  // Toggle editable for preview
  useEffect(() => {
    if (editor) editor.setEditable(!preview);
  }, [preview, editor]);

  // ─── Save ────────────────────────────────────────────────────────────────

  const handleSave = useCallback(async () => {
    if (!editor || !title.trim()) return;
    setSaving(true);
    setError("");
    try {
      const content = JSON.stringify(editor.getJSON());
      if (isNew) {
        const result = await api.pages.create(
          title, content, "", "", userId || "anonymous",
        );
        const newId = typeof result === "string" ? result : String((result as any)[0] || result);
        navigate(`/page/${newId}`);
      } else if (id) {
        await api.pages.update(id, title, content, userId || "anonymous");
      }
    } catch (err: any) {
      setError(String(err));
    } finally {
      setSaving(false);
    }
  }, [editor, title, isNew, id, userId, navigate]);

  const handleImageUpload = () => fileInputRef.current?.click();
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const url = URL.createObjectURL(file);
      editor?.chain().focus().setImageEnhanced({ src: url }).run();
    }
    e.target.value = "";
  };

  // Add link
  const handleAddLink = () => {
    const url = prompt("URL:");
    if (url) {
      editor?.chain().focus().setLink({ href: url }).run();
    }
  };

  const handlePublish = async () => {
    if (!id) return;
    await api.pages.setStatus(id, "published");
    navigate(`/page/${id}`);
  };
  const handleArchive = async () => {
    if (!id) return;
    await api.pages.setStatus(id, "archived");
    navigate("/");
  };
  const handleDelete = async () => {
    if (!id) return;
    if (!confirm("Permanently delete this page?")) return;
    await api.pages.delete(id);
    navigate("/");
  };
  const handleDuplicate = async () => {
    if (!id) return;
    const result = await api.pages.duplicate(id, userId || "anonymous");
    const newId = typeof result === "string" ? result : String((result as any)[0] || result);
    navigate(`/page/${newId}/edit`);
  };

  // Keyboard shortcut: Cmd+S
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "s") {
        e.preventDefault();
        handleSave();
      }
      if (e.key === "?" && !e.metaKey && !e.ctrlKey && !e.altKey) {
        if (document.activeElement?.tagName !== "INPUT" && document.activeElement?.tagName !== "TEXTAREA") {
          e.preventDefault();
          setShowShortcuts(true);
        }
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [handleSave]);

  // Slash command: detect "/" in editor
  const filteredCommands = SLASH_COMMANDS.filter((c) =>
    c.title.toLowerCase().includes(slashQuery.toLowerCase()),
  );

  const closeSlash = () => { setSlashOpen(false); setSlashQuery(""); setSlashIndex(0); };

  const executeSlashCommand = (idx: number) => {
    const cmd = filteredCommands[idx];
    if (cmd && editor) {
      // Remove the "/" character(s) typed
      const { from } = editor.state.selection;
      const $pos = editor.state.doc.resolve(from);
      const nodeStart = $pos.start();
      const textBefore = editor.state.doc.textBetween(nodeStart, from);
      const slashIdx = textBefore.lastIndexOf("/");
      if (slashIdx >= 0) {
        editor.chain().focus().deleteRange({ from: nodeStart + slashIdx, to: from }).run();
      }
      cmd.command(editor);
    }
    closeSlash();
  };

  // Listen for / in the editor
  useEffect(() => {
    if (!editor || preview) return;
    const handler = (view: any, event: KeyboardEvent) => {
      if (event.key === "/" && !slashOpen) {
        const { from } = view.state.selection;
        const $pos = view.state.doc.resolve(from);
        const nodeStart = $pos.start();
        const text = view.state.doc.textBetween(nodeStart, from);
        // Only trigger at line start or after whitespace
        if (text.trim() === "" || text.endsWith(" ")) {
          const coords = view.coordsAtPos(from);
          setSlashPos({ top: coords.top + 24, left: coords.left });
          setSlashOpen(true);
          setSlashQuery("");
          setSlashIndex(0);
          return false; // let the "/" be typed
        }
      }
      if (slashOpen) {
        if (event.key === "ArrowDown") { event.preventDefault(); setSlashIndex(i => Math.min(i + 1, filteredCommands.length - 1)); return true; }
        if (event.key === "ArrowUp") { event.preventDefault(); setSlashIndex(i => Math.max(i - 1, 0)); return true; }
        if (event.key === "Enter" && filteredCommands.length > 0) { event.preventDefault(); executeSlashCommand(slashIndex); return true; }
        if (event.key === "Escape") { event.preventDefault(); closeSlash(); return true; }
        // Track typed query
        if (event.key.length === 1) {
          setTimeout(() => {
            const sel = editor.state.selection;
            const text = editor.state.doc.textBetween(Math.max(0, sel.from - 20), sel.from);
            const slashIdx = text.lastIndexOf("/");
            if (slashIdx >= 0) setSlashQuery(text.slice(slashIdx + 1));
          }, 10);
        } else if (event.key === "Backspace") {
          setTimeout(() => {
            setSlashQuery(q => q.slice(0, -1));
          }, 10);
        }
        return false;
      }
      return false;
    };
    editor.view.dom.addEventListener("keydown", handler as any, true);
    return () => editor.view.dom.removeEventListener("keydown", handler as any, true);
  }, [editor, slashOpen, preview, filteredCommands, slashIndex]);

  // Close slash menu on click outside
  useEffect(() => {
    if (!slashOpen) return;
    const handler = (e: MouseEvent) => closeSlash();
    document.addEventListener("click", handler);
    return () => document.removeEventListener("click", handler);
  }, [slashOpen]);

  // Close color picker on click outside
  useEffect(() => {
    if (!showColorPicker) return;
    const handler = () => setShowColorPicker(false);
    document.addEventListener("click", handler);
    return () => document.removeEventListener("click", handler);
  }, [showColorPicker]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const EditorButton = ({
    onClick, active = false, children, title,
  }: {
    onClick: () => void;
    active?: boolean;
    children: React.ReactNode;
    title: string;
  }) => (
    <button
      onClick={onClick}
      title={title}
      className={cn(
        "p-1.5 rounded text-muted-foreground hover:text-foreground hover:bg-muted transition-colors",
        active && "text-primary bg-primary/10",
      )}
    >
      {children}
    </button>
  );

  return (
    <div className={cn(page?.full_width ? "mx-auto px-4 md:px-8" : "max-w-4xl mx-auto")}>
      {/* Hidden file input for image upload */}
      <input ref={fileInputRef} type="file" accept="image/*" onChange={handleFileChange} className="hidden" />

      {/* Top toolbar */}
      <div className="sticky top-0 z-10 bg-background/95 backdrop-blur-sm border-b border-border">
        <div className="flex items-center justify-between px-4 h-12">
          <div className="flex items-center gap-2">
            <button onClick={() => navigate(-1)} className="p-1.5 rounded text-muted-foreground hover:text-foreground hover:bg-muted" title="Back">
              <ArrowLeft className="h-4 w-4" />
            </button>
            <span className="text-xs text-muted-foreground">
              {isNew ? "New page" : "Editing"}
            </span>
            {page?.status === "draft" && (
              <span className="text-[10px] px-1.5 py-0.5 rounded bg-yellow-500/10 text-yellow-500">Draft</span>
            )}
          </div>
          <div className="flex items-center gap-1">
            {!isNew && (
              <>
                <button onClick={() => setPreview(!preview)} className={cn("p-1.5 rounded text-muted-foreground hover:text-foreground hover:bg-muted", preview && "text-primary bg-primary/10")} title="Preview">
                  <Eye className="h-4 w-4" />
                </button>
                {/* Full-width toggle */}
                {page && (
                  <button
                    onClick={async () => {
                      const newVal = !page.full_width;
                      await api.pages.setFullWidth(id || page.id, newVal);
                      setPage(prev => prev ? { ...prev, full_width: newVal } : prev);
                    }}
                    className={cn(
                      "p-1.5 rounded text-muted-foreground hover:text-foreground hover:bg-muted",
                      page?.full_width && "text-primary bg-primary/10",
                    )}
                    title={page?.full_width ? "Constrain width" : "Full width"}
                  >
                    <Maximize2 className="h-4 w-4" />
                  </button>
                )}
                {!preview && (
                  <>
                    <button onClick={handleDuplicate} className="p-1.5 rounded text-muted-foreground hover:text-foreground hover:bg-muted" title="Duplicate">
                      <Copy className="h-4 w-4" />
                    </button>
                    <button onClick={handleArchive} className="p-1.5 rounded text-muted-foreground hover:text-foreground hover:bg-muted" title="Archive">
                      <Archive className="h-4 w-4" />
                    </button>
                    <button onClick={handleDelete} className="p-1.5 rounded text-muted-foreground hover:text-red-400 hover:bg-red-500/10" title="Delete">
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </>
                )}
              </>
            )}
            {!isNew && page?.status === "draft" && (
              <button onClick={handlePublish} className="ml-2 h-7 px-3 rounded-md text-xs font-medium bg-primary text-white hover:bg-primary/90">Publish</button>
            )}
            <button onClick={handleSave} disabled={saving}
              className="ml-1 h-7 px-3 rounded-md text-xs font-medium bg-primary/10 text-primary hover:bg-primary/20 flex items-center gap-1.5"
            >
              {saving ? <Loader2 className="h-3 w-3 animate-spin" /> : <Save className="h-3 w-3" />}
              Save
            </button>
          </div>
        </div>

        {/* Formatting toolbar */}
        {!preview && editor && (
          <div className="editor-toolbar flex items-center gap-0.5 px-4 pb-2 flex-wrap">
            <EditorButton onClick={() => editor.chain().focus().toggleBold().run()} active={editor.isActive("bold")} title="Bold (Cmd+B)">
              <Bold className="h-3.5 w-3.5" />
            </EditorButton>
            <EditorButton onClick={() => editor.chain().focus().toggleItalic().run()} active={editor.isActive("italic")} title="Italic (Cmd+I)">
              <Italic className="h-3.5 w-3.5" />
            </EditorButton>
            <EditorButton onClick={() => editor.chain().focus().toggleUnderline().run()} active={editor.isActive("underline")} title="Underline (Cmd+U)">
              <UnderlineIcon className="h-3.5 w-3.5" />
            </EditorButton>
            <EditorButton onClick={() => editor.chain().focus().toggleStrike().run()} active={editor.isActive("strike")} title="Strikethrough">
              <Strikethrough className="h-3.5 w-3.5" />
            </EditorButton>
            <EditorButton onClick={() => editor.chain().focus().toggleHighlight().run()} active={editor.isActive("highlight")} title="Highlight">
              <Highlighter className="h-3.5 w-3.5" />
            </EditorButton>
            <EditorButton onClick={() => editor.chain().focus().toggleCode().run()} active={editor.isActive("code")} title="Inline Code">
              <Code className="h-3.5 w-3.5" />
            </EditorButton>
            <span className="w-px h-4 bg-border mx-0.5" />
            <EditorButton onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()} active={editor.isActive("heading", { level: 1 })} title="Heading 1">
              <Heading1 className="h-3.5 w-3.5" />
            </EditorButton>
            <EditorButton onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()} active={editor.isActive("heading", { level: 2 })} title="Heading 2">
              <Heading2 className="h-3.5 w-3.5" />
            </EditorButton>
            <EditorButton onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()} active={editor.isActive("heading", { level: 3 })} title="Heading 3">
              <Heading3 className="h-3.5 w-3.5" />
            </EditorButton>
            <span className="w-px h-4 bg-border mx-0.5" />
            <EditorButton onClick={() => editor.chain().focus().toggleBulletList().run()} active={editor.isActive("bulletList")} title="Bullet List">
              <List className="h-3.5 w-3.5" />
            </EditorButton>
            <EditorButton onClick={() => editor.chain().focus().toggleOrderedList().run()} active={editor.isActive("orderedList")} title="Numbered List">
              <ListOrdered className="h-3.5 w-3.5" />
            </EditorButton>
            <EditorButton onClick={() => editor.chain().focus().toggleTaskList().run()} active={editor.isActive("taskList")} title="Task List">
              <CheckSquare className="h-3.5 w-3.5" />
            </EditorButton>
            <span className="w-px h-4 bg-border mx-0.5" />
            <EditorButton onClick={() => editor.chain().focus().toggleBlockquote().run()} active={editor.isActive("blockquote")} title="Quote">
              <Quote className="h-3.5 w-3.5" />
            </EditorButton>
            <EditorButton onClick={() => editor.chain().focus().toggleDetails().run()} active={editor.isActive("details")} title="Toggle Block">
              <ChevronDown className="h-3.5 w-3.5" />
            </EditorButton>
            <EditorButton onClick={() => editor.chain().focus().toggleCodeBlock().run()} active={editor.isActive("codeBlock")} title="Code Block">
              <Code className="h-3.5 w-3.5" />
            </EditorButton>
            <EditorButton onClick={() => editor.chain().focus().setHorizontalRule().run()} active={false} title="Divider">
              <Minus className="h-3.5 w-3.5" />
            </EditorButton>
            <EditorButton onClick={handleAddLink} active={editor.isActive("link")} title="Add Link">
              <LinkIcon className="h-3.5 w-3.5" />
            </EditorButton>
            <EditorButton onClick={handleImageUpload} active={false} title="Insert Image">
              <ImageIcon className="h-3.5 w-3.5" />
            </EditorButton>
            <EditorButton
              onClick={() => editor.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run()}
              active={editor.isActive("table")}
              title="Insert Table"
            >
              <TableIcon className="h-3.5 w-3.5" />
            </EditorButton>
            <span className="w-px h-4 bg-border mx-0.5" />
            {/* Page color accent */}
            <div className="relative">
              <button
                onClick={() => setShowColorPicker(!showColorPicker)}
                className={cn(
                  "p-1.5 rounded text-muted-foreground hover:text-foreground hover:bg-muted transition-colors",
                  page?.color && "text-primary",
                )}
                title="Page color accent"
              >
                <Palette className="h-3.5 w-3.5" />
                {page?.color && (
                  <span className="absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full border border-background"
                    style={{ backgroundColor: page.color }}
                  />
                )}
              </button>
              {showColorPicker && (
                <div className="absolute top-full left-0 mt-1 p-2 rounded-lg border border-border bg-card shadow-xl z-30 w-56"
                  onClick={(e) => e.stopPropagation()}>
                  <div className="grid grid-cols-8 gap-1">
                    {["", "#ef4444","#f97316","#eab308","#22c55e","#06b6d4","#3b82f6","#8b5cf6",
                      "#ec4899","#f43f5e","#a855f7","#6366f1","#00FFFF","#14b8a6","#84cc16","#d946ef",
                      "#f59e0b","#64748b","#78716c","#b45309","#047857","#0d9488","#2563eb","#7c3aed",
                    ].map(color => (
                      <button key={color}
                        onClick={async () => {
                          if (page && id) {
                            await api.pages.setColor(id, color);
                            setPage(prev => prev ? { ...prev, color } : prev);
                          }
                          setShowColorPicker(false);
                        }}
                        className="w-6 h-6 rounded-md border border-border/50 hover:scale-110 transition-transform flex items-center justify-center"
                        style={{ backgroundColor: color || "transparent" }}
                        title={color || "No color"}
                      >
                        {color === "" && <X className="h-3 w-3 text-muted-foreground" />}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Floating format toolbar on text selection */}
      {editor && !preview && <SelectionToolbar editor={editor} handleAddLink={handleAddLink} />}

      {/* Floating image toolbar when an image is selected */}
      {editor && !preview && <ImageToolbar editor={editor} />}

      {/* Title */}
      <div className="px-4 md:px-8 pt-6">
        <input
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Untitled"
          className="w-full text-3xl font-bold bg-transparent text-foreground placeholder:text-muted-foreground/40 outline-none border-none"
          disabled={preview}
        />
      </div>

      {/* Tags */}
      {!isNew && !preview && (
        <div className="px-4 md:px-8 pt-2">
          <div className="flex items-center gap-2 flex-wrap">
            {tags.map((tag) => (
              <span key={tag.id} className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-muted text-xs text-muted-foreground">
                <span className="text-[10px] text-muted-foreground/60">#</span>
                {tag.name}
                <button onClick={() => handleRemoveTag(tag.id)} className="ml-0.5 hover:text-red-400 transition-colors">
                  <X className="h-3 w-3" />
                </button>
              </span>
            ))}
            <input
              type="text"
              value={tagInput}
              onChange={(e) => setTagInput(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); handleAddTag(); } }}
              placeholder={tags.length === 0 ? "Add tags..." : "+ tag"}
              className="h-6 px-2 rounded-md border border-transparent bg-transparent text-xs text-muted-foreground placeholder:text-muted-foreground/40 focus:outline-none focus:border-border focus:bg-muted/50 w-24"
            />
          </div>
        </div>
      )}

      {/* Tags display (view mode in page view) */}
      {!isNew && preview && tags.length > 0 && (
        <div className="px-4 md:px-8 pt-2 flex items-center gap-2 flex-wrap">
          {tags.map((tag) => (
            <span key={tag.id} className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-muted text-xs text-muted-foreground">
              <span className="text-[10px] text-muted-foreground/60">#</span>
              {tag.name}
            </span>
          ))}
        </div>
      )}

      {page?.color && (
        <div className="px-4 md:px-8">
          <div className="h-1 rounded-full" style={{ backgroundColor: page.color }} />
        </div>
      )}

      {/* Editor mode tabs */}
      {!preview && (
        <div className="px-4 md:px-8 pt-2 pb-1">
          <div className="flex items-center gap-0.5 border-b border-border">
            <button
              onClick={() => {
                if (editor && editorMode === "markdown") {
                  try {
                    const doc = markdownToProseMirror(markdownSource);
                    editor.commands.setContent(doc);
                  } catch { /* keep current content */ }
                }
                setEditorMode("wysiwyg");
              }}
              className={cn(
                "px-3 py-1.5 text-xs font-medium border-b-2 transition-colors",
                editorMode === "wysiwyg"
                  ? "border-primary text-foreground"
                  : "border-transparent text-muted-foreground hover:text-foreground"
              )}
            >
              WYSIWYG
            </button>
            <button
              onClick={() => {
                if (editor && editorMode !== "markdown") {
                  setMarkdownSource(tiptapToMarkdown(editor.getJSON()));
                }
                setEditorMode("markdown");
              }}
              className={cn(
                "px-3 py-1.5 text-xs font-medium border-b-2 transition-colors flex items-center gap-1",
                editorMode === "markdown"
                  ? "border-primary text-foreground"
                  : "border-transparent text-muted-foreground hover:text-foreground"
              )}
            >
              <Code2 className="h-3 w-3" /> Markdown
            </button>
            <button
              onClick={() => {
                if (editor && editorMode !== "split") {
                  setMarkdownSource(tiptapToMarkdown(editor.getJSON()));
                }
                setEditorMode("split");
              }}
              className={cn(
                "px-3 py-1.5 text-xs font-medium border-b-2 transition-colors",
                editorMode === "split"
                  ? "border-primary text-foreground"
                  : "border-transparent text-muted-foreground hover:text-foreground"
              )}
            >
              Split
            </button>
          </div>
        </div>
      )}

      {/* Editor content */}
      <div className="px-4 md:px-8 pb-32">
        {editor && editorMode === "wysiwyg" && (
          <div className={preview ? "" : "min-h-[60vh]"}>
            <EditorContent editor={editor} />
          </div>
        )}
        {editor && editorMode === "markdown" && (
          <textarea
            value={markdownSource}
            onChange={(e) => setMarkdownSource(e.target.value)}
            className="w-full min-h-[60vh] bg-[#0a0a0a] text-foreground font-mono text-sm p-4 rounded-lg border border-border resize-y focus:outline-none focus:ring-1 focus:ring-primary/50"
            spellCheck={false}
          />
        )}
        {editor && editorMode === "split" && (
          <div className="grid grid-cols-2 gap-4 min-h-[60vh]">
            <div className="border border-border rounded-lg p-3 overflow-y-auto">
              <EditorContent editor={editor} />
            </div>
            <textarea
              value={markdownSource}
              readOnly
              className="w-full h-full bg-[#0a0a0a] text-foreground font-mono text-sm p-3 rounded-lg border border-border resize-none focus:outline-none"
              spellCheck={false}
            />
          </div>
        )}
      </div>

      {error && (
        <div className="fixed bottom-4 right-4 px-4 py-2 rounded-md bg-red-500/10 border border-red-500/30 text-sm text-red-400">
          {error}
        </div>
      )}

      {/* Mention popup */}
      {showMention && (
        <div className="fixed z-50 w-56 py-1 rounded-lg border border-border bg-card shadow-xl max-h-48 overflow-y-auto"
          style={{ bottom: "auto", left: "50%", transform: "translateX(-50%)", marginTop: "4px" }}
          onClick={(e) => e.stopPropagation()}>
          {[
            ...allPages.filter(p => p.title.toLowerCase().includes(mentionQuery.toLowerCase())).slice(0, 8).map(p => ({ type: "page" as const, id: p.id, label: p.title, icon: "📄" })),
            ...allUsers.filter(u => u.name.toLowerCase().includes(mentionQuery.toLowerCase())).slice(0, 4).map(u => ({ type: "user" as const, id: u.id, label: u.name, icon: "👤" })),
          ].length === 0 ? (
          <div className="px-3 py-2 text-xs text-muted-foreground/60">No matches</div>
          ) : (
          [{ type: "page" as const, id: "", label: "", icon: "" }, ...allPages.filter(p => p.title.toLowerCase().includes(mentionQuery.toLowerCase())).slice(0, 8).map(p => ({ type: "page" as const, id: p.id, label: p.title, icon: "📄" })),
          ...allUsers.filter(u => u.name.toLowerCase().includes(mentionQuery.toLowerCase())).slice(0, 4).map(u => ({ type: "user" as const, id: u.id, label: u.name, icon: "👤" })),
          ].filter(m => m.label).map((m, i) => (
              <button key={m.id}
                onClick={() => { editor?.chain().focus().insertMention({ id: m.id, label: m.label }).run(); setShowMention(false); }}
                className={`w-full flex items-center gap-2 px-3 py-1.5 text-xs hover:bg-muted transition-colors text-left ${i === mentionPos ? "bg-muted" : ""}`}>
                <span>{m.icon}</span>
                <span className="truncate">{m.label}</span>
                <span className="text-[10px] text-muted-foreground/60 ml-auto">{m.type}</span>
              </button>
            ))
          )}
        </div>
      )}

      {/* Slash command popup */}
      {showSlash && editor && (
        <div
          className="fixed z-[100] w-64 py-1.5 rounded-lg border border-border bg-[#161616] shadow-2xl overflow-hidden"
          style={{ top: slashPos.top, left: slashPos.left }}
          onClick={(e) => e.stopPropagation()}
        >
          {filteredCommands.length === 0 && (
            <div className="px-3 py-4 text-xs text-muted-foreground text-center">No results</div>
          )}
          {filteredCommands.map((item, i) => (
            <button
              key={item.title}
              onClick={() => executeSlashCommand(i)}
              className={cn(
                "w-full flex items-center gap-3 px-3 py-2 text-left transition-colors",
                i === slashIndex ? "bg-muted" : "hover:bg-muted/50",
              )}
            >
              <span className="w-8 h-8 rounded flex items-center justify-center bg-muted text-xs font-mono text-muted-foreground shrink-0">
                {item.icon}
              </span>
              <div>
                <div className="text-sm font-medium text-foreground">{item.title}</div>
                <div className="text-[11px] text-muted-foreground">{item.description}</div>
              </div>
            </button>
          ))}
        </div>
      )}

      {/* Keyboard Shortcuts Modal */}
      {showShortcuts && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60" onClick={() => setShowShortcuts(false)}>
          <div className="w-full max-w-lg p-6 rounded-xl border border-border bg-card shadow-2xl max-h-[80vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold">Keyboard Shortcuts</h2>
              <button onClick={() => setShowShortcuts(false)} className="p-1 rounded text-muted-foreground hover:text-foreground hover:bg-muted">
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="grid gap-3">
              {[
                ["Navigation", [
                  ["Go back", "⌫ or click Back"],
                  ["Open page", "Click in sidebar"],
                  ["Home", "Click Spacetime Wiki logo"],
                ]],
                ["Editor", [
                  ["Bold", "Cmd+B"],
                  ["Italic", "Cmd+I"],
                  ["Underline", "Cmd+U"],
                  ["Strikethrough", "Cmd+Shift+X"],
                  ["Heading 1", "Cmd+Alt+1"],
                  ["Heading 2", "Cmd+Alt+2"],
                  ["Heading 3", "Cmd+Alt+3"],
                  ["Bullet list", "Cmd+Shift+8"],
                  ["Ordered list", "Cmd+Shift+7"],
                  ["Blockquote", "Cmd+Shift+B"],
                  ["Code block", "Cmd+Alt+C"],
                  ["Save", "Cmd+S"],
                ]],
                ["Slash Commands", [
                  ["Open menu", "Type / at start of line"],
                  ["Navigate", "↑ ↓"],
                  ["Select", "Enter"],
                  ["Close", "Escape"],
                ]],
                ["Page Actions", [
                  ["Edit page", "Click Edit icon"],
                  ["Publish", "Click Publish button"],
                  ["Archive", "Click Archive button"],
                  ["View history", "Click History icon"],
                  ["Duplicate", "Click Copy icon"],
                ]],
              ].map(([section, items]) => (
                <div key={section as string}>
                  <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1.5">{section}</h3>
                  <div className="space-y-1">
                    {(items as string[][]).map(([label, key]) => (
                      <div key={label} className="flex items-center justify-between text-sm">
                        <span className="text-muted-foreground">{label}</span>
                        <kbd className="px-2 py-0.5 rounded bg-muted text-xs font-mono text-muted-foreground">{key}</kbd>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Image Lightbox */}
      {lightboxSrc && (
        <ImageLightbox
          src={lightboxSrc}
          alt={lightboxAlt}
          onClose={() => { setLightboxSrc(null); setLightboxAlt(""); }}
        />
      )}
    </div>
  );
}
