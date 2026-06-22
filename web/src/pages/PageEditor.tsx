import { useState, useEffect, useCallback, useRef } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useEditor, EditorContent } from "@tiptap/react";
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
} from "lucide-react";
import { api, Page } from "../lib/api";
import { cn } from "../lib/utils";

const lowlight = createLowlight(common);

// ─── Slash command suggestion ────────────────────────────────────────────────

import { Extension } from "@tiptap/core";
import { ReactRenderer } from "@tiptap/react";
import Suggestion from "@tiptap/suggestion";
import tippy, { type Instance as TippyInstance, type Props as TippyProps } from "tippy.js";
import "tippy.js/dist/tippy.css";

interface SlashItem {
  title: string;
  description: string;
  icon: string;
  command: (editor: ReturnType<typeof useEditor>) => void;
}

const slashItems: SlashItem[] = [
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
];

const SlashCommand = Extension.create({
  name: "slashCommand",
  addProseMirrorPlugins() {
    return [
      Suggestion({
        editor: this.editor,
        char: "/",
        command: ({ editor, range, props }) => {
          props.command(editor);
          editor.chain().focus().deleteRange(range).run();
        },
        items: ({ query }) => {
          return slashItems
            .filter((item) => item.title.toLowerCase().startsWith(query.toLowerCase()))
            .slice(0, 10);
        },
        render: () => {
          let component: ReactRenderer | null = null;
          let popup: TippyInstance<TippyProps>[] | null = null;

          return {
            onStart: (props) => {
              component = new ReactRenderer(SlashList, {
                props,
                editor: props.editor,
              });
              if (!props.clientRect) return;
              popup = tippy("body", {
                getReferenceClientRect: props.clientRect as () => DOMRect,
                appendTo: () => document.body,
                content: component.element,
                showOnCreate: true,
                interactive: true,
                trigger: "manual",
                placement: "bottom-start",
              });
            },
            onUpdate(props) {
              component?.updateProps(props);
              if (!props.clientRect) return;
              popup?.[0]?.setProps({
                getReferenceClientRect: props.clientRect as () => DOMRect,
              });
            },
            onKeyDown(props) {
              if (props.event.key === "Escape") {
                popup?.[0]?.hide();
                return true;
              }
              return (component?.ref as any)?.onKeyDown?.(props) ?? false;
            },
            onExit() {
              popup?.[0]?.destroy();
              component?.destroy();
            },
          };
        },
      }),
    ];
  },
});

// Slash command popup component
function SlashList(props: { items: SlashItem[]; command: (item: SlashItem) => void; editor: any }) {
  const [selectedIndex, setSelectedIndex] = useState(0);

  useEffect(() => {
    setSelectedIndex(0);
  }, [props.items]);

  const onKeyDown = ({ event }: { event: KeyboardEvent }) => {
    if (event.key === "ArrowUp") {
      setSelectedIndex((i) => (i <= 0 ? props.items.length - 1 : i - 1));
      return true;
    }
    if (event.key === "ArrowDown") {
      setSelectedIndex((i) => (i >= props.items.length - 1 ? 0 : i + 1));
      return true;
    }
    if (event.key === "Enter") {
      props.command(props.items[selectedIndex]);
      return true;
    }
    return false;
  };

  // Expose onKeyDown to parent
  (props as any).onKeyDown = onKeyDown;

  return (
    <div className="w-64 py-1.5 rounded-lg border border-border bg-[#161616] shadow-2xl overflow-hidden">
      {props.items.map((item, i) => (
        <button
          key={item.title}
          onClick={() => props.command(item)}
          className={cn(
            "w-full flex items-center gap-3 px-3 py-2 text-left transition-colors",
            i === selectedIndex ? "bg-muted" : "hover:bg-muted/50",
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
  );
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

  // ─── Editor ──────────────────────────────────────────────────────────────

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: { levels: [1, 2, 3] },
        codeBlock: false, // replaced by CodeBlockLowlight
        link: false,     // use explicit Link.configure below
      }),
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
      // SlashCommand, // TODO: fix ReactRenderer compatibility
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
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [handleSave]);

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

      {/* Editor content */}
      <div className="px-4 md:px-8 pb-32">
        {editor && <EditorContent editor={editor} />}
      </div>

      {error && (
        <div className="fixed bottom-4 right-4 px-4 py-2 rounded-md bg-red-500/10 border border-red-500/30 text-sm text-red-400">
          {error}
        </div>
      )}
    </div>
  );
}
