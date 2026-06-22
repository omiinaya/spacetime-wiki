import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
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
  ArrowLeft,
  Edit3,
  Eye,
  Star,
  Archive,
  Trash2,
  Copy,
  Loader2,
  MessageSquare,
  Clock,
} from "lucide-react";
import { api, Page, PageRevision, Comment } from "../lib/api";
import { cn, formatDate, timeAgo } from "../lib/utils";

interface Props {
  pageId: string;
  userId: string | null;
}

export function PageView({ pageId, userId }: Props) {
  const navigate = useNavigate();
  const [page, setPage] = useState<Page | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [showRevisions, setShowRevisions] = useState(false);
  const [revisions, setRevisions] = useState<PageRevision[]>([]);
  const [comments, setComments] = useState<Comment[]>([]);
  const [newComment, setNewComment] = useState("");
  const [isFavorite, setIsFavorite] = useState(false);

  useEffect(() => {
    loadPage();
  }, [pageId]);

  const loadPage = async () => {
    try {
      const p = await api.pages.get(pageId);
      if (!p) {
        setError("Page not found");
        setLoading(false);
        return;
      }
      setPage(p);

      // Load revisions and comments
      const [revs, coms] = await Promise.all([
        api.revisions.list(pageId),
        api.comments.list(pageId),
      ]);
      setRevisions(revs);
      setComments(coms);
    } catch (err: any) {
      setError(String(err));
    } finally {
      setLoading(false);
    }
  };

  const editor = useEditor({
    extensions: [
      StarterKit.configure({ heading: { levels: [1, 2, 3] } }),
      Placeholder,
      Link,
      ImageExtension,
      Table,
      TableRow,
      TableHeader,
      TableCell,
      TaskList,
      TaskItem.configure({ nested: true }),
      Highlight,
      Underline,
    ],
    content: page ? JSON.parse(page.content || "{}") : undefined,
    editable: false,
  });

  // Update editor content when page loads
  useEffect(() => {
    if (editor && page) {
      try {
        const parsed = JSON.parse(page.content || "{}");
        if (parsed && parsed.type === "doc") {
          editor.commands.setContent(parsed);
        } else {
          // Default to empty document
          editor.commands.setContent({ type: "doc", content: [{ type: "paragraph" }] });
        }
      } catch {
        editor.commands.setContent(page.content || "");
      }
    }
  }, [editor, page]);

  const handlePublish = async () => {
    await api.pages.setStatus(pageId, "published");
    loadPage();
  };

  const handleArchive = async () => {
    await api.pages.setStatus(pageId, "archived");
    navigate("/");
  };

  const handleDelete = async () => {
    if (!confirm("Permanently delete this page?")) return;
    await api.pages.delete(pageId);
    navigate("/");
  };

  const handleDuplicate = async () => {
    const result = await api.pages.duplicate(pageId, userId || "anonymous");
    const newId = typeof result === "string" ? result : String((result as any)[0] || result);
    navigate(`/page/${newId}/edit`);
  };

  const handleToggleFavorite = async () => {
    if (!userId) return;
    await api.favorites.toggle(userId, pageId);
    setIsFavorite(!isFavorite);
  };

  const handleAddComment = async () => {
    if (!newComment.trim() || !userId) return;
    await api.comments.add(pageId, "", userId, newComment);
    setNewComment("");
    const coms = await api.comments.list(pageId);
    setComments(coms);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (error || !page) {
    return (
      <div className="p-4 md:p-6 lg:p-8 max-w-4xl mx-auto">
        <div className="p-8 rounded-lg border border-destructive/30 bg-destructive/5 text-center">
          <p className="text-sm text-destructive">{error || "Page not found"}</p>
          <button
            onClick={() => navigate("/")}
            className="mt-3 text-xs text-primary hover:underline"
          >
            Go home
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto">
      {/* Header bar */}
      <div className="sticky top-0 z-10 bg-background/95 backdrop-blur-sm border-b border-border">
        <div className="flex items-center justify-between px-4 h-12">
          <div className="flex items-center gap-2">
            <button
              onClick={() => navigate(-1)}
              className="p-1.5 rounded text-muted-foreground hover:text-foreground hover:bg-muted"
            >
              <ArrowLeft className="h-4 w-4" />
            </button>
            {page.status === "draft" && (
              <span className="text-[10px] px-1.5 py-0.5 rounded bg-yellow-500/10 text-yellow-500">
                Draft
              </span>
            )}
            {page.status === "archived" && (
              <span className="text-[10px] px-1.5 py-0.5 rounded bg-muted text-muted-foreground">
                Archived
              </span>
            )}
          </div>

          <div className="flex items-center gap-1">
            <button
              onClick={handleToggleFavorite}
              className={cn(
                "p-1.5 rounded text-muted-foreground hover:text-foreground hover:bg-muted",
                isFavorite && "text-yellow-500",
              )}
              title="Favorite"
            >
              <Star className="h-4 w-4" fill={isFavorite ? "currentColor" : "none"} />
            </button>
            <button
              onClick={() => navigate(`/page/${pageId}/edit`)}
              className="p-1.5 rounded text-muted-foreground hover:text-foreground hover:bg-muted"
              title="Edit"
            >
              <Edit3 className="h-4 w-4" />
            </button>
            <button
              onClick={handleDuplicate}
              className="p-1.5 rounded text-muted-foreground hover:text-foreground hover:bg-muted"
              title="Duplicate"
            >
              <Copy className="h-4 w-4" />
            </button>
            {page.status === "draft" && (
              <button
                onClick={handlePublish}
                className="ml-2 h-7 px-3 rounded-md text-xs font-medium bg-primary text-white hover:bg-primary/90"
              >
                Publish
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Title */}
      <div className="px-4 md:px-8 pt-8">
        <h1 className="text-3xl font-bold">{page.title}</h1>
        <div className="flex items-center gap-3 mt-2 text-xs text-muted-foreground">
          {page.published_at > 0 && (
            <span className="flex items-center gap-1">
              <Clock className="h-3 w-3" />
              {formatDate(page.published_at)}
            </span>
          )}
          <span>Updated {timeAgo(page.updated_at)}</span>
        </div>
      </div>

      {/* Content */}
      <div className="px-4 md:px-8 py-6">
        {editor && <EditorContent editor={editor} />}
      </div>

      {/* Comments section */}
      <div className="px-4 md:px-8 pb-8 border-t border-border mt-8">
        <div className="pt-6 space-y-4">
          <div className="flex items-center gap-2">
            <MessageSquare className="h-4 w-4 text-muted-foreground" />
            <h3 className="text-sm font-semibold">
              Comments ({comments.length})
            </h3>
          </div>

          {userId && (
            <div className="flex gap-2">
              <input
                type="text"
                value={newComment}
                onChange={(e) => setNewComment(e.target.value)}
                placeholder="Add a comment..."
                className="flex-1 h-9 px-3 rounded-md border border-border bg-card text-sm focus:outline-none focus:ring-1 focus:ring-primary/50"
                onKeyDown={(e) => {
                  if (e.key === "Enter") handleAddComment();
                }}
              />
              <button
                onClick={handleAddComment}
                disabled={!newComment.trim()}
                className="h-9 px-3 rounded-md text-xs font-medium bg-primary text-white hover:bg-primary/90 disabled:opacity-50"
              >
                Post
              </button>
            </div>
          )}

          <div className="space-y-2">
            {comments.map((com) => (
              <div
                key={com.id}
                className="p-3 rounded-lg border border-border bg-card"
              >
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-xs font-medium">{com.user_id}</span>
                  <span className="text-[10px] text-muted-foreground">
                    {timeAgo(com.created_at)}
                  </span>
                  {com.is_resolved && (
                    <span className="text-[10px] px-1 py-0.5 rounded bg-green-500/10 text-green-500">
                      Resolved
                    </span>
                  )}
                </div>
                <p className="text-sm">{com.body}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Revisions panel */}
      {showRevisions && (
        <div className="fixed inset-y-0 right-0 w-80 bg-sidebar border-l border-border z-20 overflow-y-auto p-4">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-semibold">Revisions</h3>
            <button
              onClick={() => setShowRevisions(false)}
              className="text-xs text-muted-foreground hover:text-foreground"
            >
              Close
            </button>
          </div>
          <div className="space-y-3">
            {revisions.map((rev) => (
              <div key={rev.id} className="p-2 rounded border border-border bg-card">
                <div className="text-xs font-medium">
                  v{rev.revision_number}
                </div>
                <div className="text-[10px] text-muted-foreground">
                  {formatDate(rev.created_at)}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
