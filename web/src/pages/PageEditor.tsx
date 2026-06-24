import { useState, useEffect, useCallback, useRef } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useEditor, EditorContent } from "@tiptap/react";
import { createPortal } from "react-dom";
import StarterKit from "@tiptap/starter-kit";
import Placeholder from "@tiptap/extension-placeholder";
import Link from "@tiptap/extension-link";
import ImageExtension from "@tiptap/extension-image";
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
  { title: "Image", description: "Insert an image", icon: "🖼", command: (e) => { const url = prompt("Image URL:"); if (url) e?.chain().focus().setImage({ src: url }).run(); } },
  { title: "Divider", description: "Insert a horizontal divider", icon: "—", command: (e) => e?.chain().focus().setHorizontalRule().run() },
  { title: "Toggle", description: "Collapsible toggle block", icon: "▶", command: (e) => e?.chain().focus().toggleDetails().run() },
  { title: "Info Callout", description: "Blue info notice block", icon: "ℹ️", command: (e) => e?.chain().focus().toggleCallout("info").run() },
  { title: "Warning Callout", description: "Amber warning notice block", icon: "⚠️", command: (e) => e?.chain().focus().toggleCallout("warning").run() },
  { title: "Tip Callout", description: "Green tip notice block", icon: "💡", command: (e) => e?.chain().focus().toggleCallout("tip").run() },
  { title: "Danger Callout", description: "Red danger notice block", icon: "🚨", command: (e) => e?.chain().focus().toggleCallout("danger").run() },
];

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
      ImageExtension,
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
      Mention.configure({ HTMLAttributes: { class: 'mention' } }),
    ],
    content: page ? (() => { try { return JSON.parse(page.content || "{}"); } catch { return "<p></p>"; } })() : undefined,
    editable: !preview,
    editorProps: {
      handlePaste: (_, event) => {
        const items = event.clipboardData?.items;
        if (!items) return false;
        for (const item of items) {
          if (item.type.startsWith("image/")) {
            event.preventDefault();
            const file = item.getAsFile();
            if (file) {
              const url = URL.createObjectURL(file);
              editor?.chain().focus().setImage({ src: url }).run();
            }
            return true;
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
            editor?.chain().focus().setImage({ src: url }).run();
            return true;
          }
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

  // Image insert via file picker
  const handleImageUpload = () => fileInputRef.current?.click();
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const url = URL.createObjectURL(file);
      editor?.chain().focus().setImage({ src: url }).run();
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
    <div className="max-w-4xl mx-auto">
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
          <div className="flex items-center gap-0.5 px-4 pb-2 flex-wrap">
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
          </div>
        )}
      </div>

      {/* Floating format toolbar on text selection */}
      {editor && !preview && <SelectionToolbar editor={editor} handleAddLink={handleAddLink} />}

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

      {/* Editor content */}
      <div className="px-4 md:px-8 pb-32">
        {editor && <EditorContent editor={editor} />}
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
    </div>
  );
}
