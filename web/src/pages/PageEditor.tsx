import { useState, useEffect, useCallback } from "react";
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
import Underline from "@tiptap/extension-underline";
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
} from "lucide-react";
import { api, Page } from "../lib/api";
import { cn } from "../lib/utils";

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

  // Load existing page
  useEffect(() => {
    if (id) {
      api.pages.get(id).then((p) => {
        if (p) {
          setPage(p);
          setTitle(p.title);
          editor?.commands.setContent(JSON.parse(p.content || "{}"));
        }
        setLoading(false);
      });
    }
  }, [id]);

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: { levels: [1, 2, 3] },
      }),
      Placeholder.configure({
        placeholder: "Start writing...",
      }),
      Link.configure({ openOnClick: false }),
      ImageExtension,
      Table.configure({ resizable: true }),
      TableRow,
      TableHeader,
      TableCell,
      TaskList,
      TaskItem.configure({ nested: true }),
      Highlight,
      Underline,
    ],
    content: page ? JSON.parse(page.content || "{}") : undefined,
    editable: !preview,
    onUpdate: ({ editor: ed }) => {
      // Auto-save indicator would go here
    },
  });

  // Set editor editable when preview changes
  useEffect(() => {
    if (editor) editor.setEditable(!preview);
  }, [preview, editor]);

  const handleSave = useCallback(async () => {
    if (!editor || !title.trim()) return;
    setSaving(true);
    setError("");
    try {
      const content = JSON.stringify(editor.getJSON());
      if (isNew) {
        const result = await api.pages.create(
          title,
          content,
          "", // collection_id - will be selectable later
          "", // parent_page_id
          userId || "anonymous",
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

  // Keyboard shortcut: Cmd/Ctrl+S to save
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
    onClick,
    active = false,
    children,
    title,
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
      {/* Toolbar */}
      <div className="sticky top-0 z-10 bg-background/95 backdrop-blur-sm border-b border-border">
        <div className="flex items-center justify-between px-4 h-12">
          <div className="flex items-center gap-2">
            <button
              onClick={() => navigate(-1)}
              className="p-1.5 rounded text-muted-foreground hover:text-foreground hover:bg-muted"
              title="Back"
            >
              <ArrowLeft className="h-4 w-4" />
            </button>
            <span className="text-xs text-muted-foreground">
              {isNew ? "New page" : "Editing"}
            </span>
            {page?.status === "draft" && (
              <span className="text-[10px] px-1.5 py-0.5 rounded bg-yellow-500/10 text-yellow-500">
                Draft
              </span>
            )}
          </div>

          <div className="flex items-center gap-1">
            {!isNew && (
              <>
                <button
                  onClick={() => setPreview(!preview)}
                  className={cn(
                    "p-1.5 rounded text-muted-foreground hover:text-foreground hover:bg-muted transition-colors",
                    preview && "text-primary bg-primary/10",
                  )}
                  title="Preview"
                >
                  <Eye className="h-4 w-4" />
                </button>
                {!preview && (
                  <>
                    <button
                      onClick={handleDuplicate}
                      className="p-1.5 rounded text-muted-foreground hover:text-foreground hover:bg-muted"
                      title="Duplicate"
                    >
                      <Copy className="h-4 w-4" />
                    </button>
                    <button
                      onClick={handleArchive}
                      className="p-1.5 rounded text-muted-foreground hover:text-foreground hover:bg-muted"
                      title="Archive"
                    >
                      <Archive className="h-4 w-4" />
                    </button>
                    <button
                      onClick={handleDelete}
                      className="p-1.5 rounded text-muted-foreground hover:text-red-400 hover:bg-red-500/10"
                      title="Delete"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </>
                )}
              </>
            )}
            {!isNew && page?.status === "draft" && (
              <button
                onClick={handlePublish}
                className="ml-2 h-7 px-3 rounded-md text-xs font-medium bg-primary text-white hover:bg-primary/90"
              >
                Publish
              </button>
            )}
            <button
              onClick={handleSave}
              disabled={saving}
              className="ml-1 h-7 px-3 rounded-md text-xs font-medium bg-primary/10 text-primary hover:bg-primary/20 flex items-center gap-1.5"
            >
              {saving ? (
                <Loader2 className="h-3 w-3 animate-spin" />
              ) : (
                <Save className="h-3 w-3" />
              )}
              Save
            </button>
          </div>
        </div>

        {/* Formatting toolbar */}
        {!preview && editor && (
          <div className="flex items-center gap-0.5 px-4 pb-2 flex-wrap">
            <EditorButton
              onClick={() => editor.chain().focus().toggleBold().run()}
              active={editor.isActive("bold")}
              title="Bold"
            >
              <Bold className="h-3.5 w-3.5" />
            </EditorButton>
            <EditorButton
              onClick={() => editor.chain().focus().toggleItalic().run()}
              active={editor.isActive("italic")}
              title="Italic"
            >
              <Italic className="h-3.5 w-3.5" />
            </EditorButton>
            <EditorButton
              onClick={() => editor.chain().focus().toggleUnderline().run()}
              active={editor.isActive("underline")}
              title="Underline"
            >
              <UnderlineIcon className="h-3.5 w-3.5" />
            </EditorButton>
            <EditorButton
              onClick={() => editor.chain().focus().toggleStrike().run()}
              active={editor.isActive("strike")}
              title="Strikethrough"
            >
              <Strikethrough className="h-3.5 w-3.5" />
            </EditorButton>
            <span className="w-px h-4 bg-border mx-0.5" />
            <EditorButton
              onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
              active={editor.isActive("heading", { level: 1 })}
              title="Heading 1"
            >
              <Heading1 className="h-3.5 w-3.5" />
            </EditorButton>
            <EditorButton
              onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
              active={editor.isActive("heading", { level: 2 })}
              title="Heading 2"
            >
              <Heading2 className="h-3.5 w-3.5" />
            </EditorButton>
            <EditorButton
              onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
              active={editor.isActive("heading", { level: 3 })}
              title="Heading 3"
            >
              <Heading3 className="h-3.5 w-3.5" />
            </EditorButton>
            <span className="w-px h-4 bg-border mx-0.5" />
            <EditorButton
              onClick={() => editor.chain().focus().toggleBulletList().run()}
              active={editor.isActive("bulletList")}
              title="Bullet List"
            >
              <List className="h-3.5 w-3.5" />
            </EditorButton>
            <EditorButton
              onClick={() => editor.chain().focus().toggleOrderedList().run()}
              active={editor.isActive("orderedList")}
              title="Numbered List"
            >
              <ListOrdered className="h-3.5 w-3.5" />
            </EditorButton>
            <EditorButton
              onClick={() => editor.chain().focus().toggleTaskList().run()}
              active={editor.isActive("taskList")}
              title="Task List"
            >
              <CheckSquare className="h-3.5 w-3.5" />
            </EditorButton>
            <span className="w-px h-4 bg-border mx-0.5" />
            <EditorButton
              onClick={() => editor.chain().focus().toggleBlockquote().run()}
              active={editor.isActive("blockquote")}
              title="Quote"
            >
              <Quote className="h-3.5 w-3.5" />
            </EditorButton>
            <EditorButton
              onClick={() => editor.chain().focus().toggleCodeBlock().run()}
              active={editor.isActive("codeBlock")}
              title="Code Block"
            >
              <Code className="h-3.5 w-3.5" />
            </EditorButton>
            <EditorButton
              onClick={() => editor.chain().focus().setHorizontalRule().run()}
              active={false}
              title="Divider"
            >
              <Minus className="h-3.5 w-3.5" />
            </EditorButton>
          </div>
        )}
      </div>

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
        {editor && (
          <EditorContent
            editor={editor}
            className="prose prose-invert max-w-none"
          />
        )}
      </div>

      {error && (
        <div className="fixed bottom-4 right-4 px-4 py-2 rounded-md bg-red-500/10 border border-red-500/30 text-sm text-red-400">
          {error}
        </div>
      )}
    </div>
  );
}
