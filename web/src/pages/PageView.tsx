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
import CodeBlockLowlight from "@tiptap/extension-code-block-lowlight";
import { common, createLowlight } from "lowlight";
import {
  ArrowLeft, Edit3, Star, Archive, Trash2, Copy, Loader2,
  MessageSquare, Clock, Send, History, RotateCcw, X, ChevronRight,
} from "lucide-react";
import { api, Page, PageRevision, Comment, Collection } from "../lib/api";
import { cn, formatDate, timeAgo } from "../lib/utils";

const lowlight = createLowlight(common);

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
  const [restoring, setRestoring] = useState(false);
  const [showConfirm, setShowConfirm] = useState<"publish" | "archive" | "delete" | null>(null);
  const [collection, setCollection] = useState<Collection | null>(null);

  useEffect(() => { loadPage(); }, [pageId]);

  const loadPage = async () => {
    try {
      const p = await api.pages.get(pageId);
      if (!p) { setError("Page not found"); setLoading(false); return; }
      setPage(p);
      // Load collection if page has one
      if (p.collection_id) {
        api.collections.get(p.collection_id).then(setCollection);
      }
      const [revs, coms] = await Promise.all([
        api.revisions.list(pageId),
        api.comments.list(pageId),
      ]);
      setRevisions(revs);
      setComments(coms);
    } catch (err: any) { setError(String(err)); }
    finally { setLoading(false); }
  };

  const editor = useEditor({
    extensions: [
      StarterKit.configure({ heading: { levels: [1, 2, 3] }, codeBlock: false, link: false }), Placeholder,
      Link, ImageExtension, Table.configure({ resizable: true }), TableRow, TableHeader, TableCell,
      TaskList, TaskItem.configure({ nested: true }), Highlight,
      CodeBlockLowlight.configure({ lowlight }),
    ],
    content: page ? JSON.parse(page.content || "{}") : undefined,
    editable: false,
  });

  useEffect(() => {
    if (editor && page) {
      try {
        const parsed = JSON.parse(page.content || "{}");
        if (parsed && parsed.type === "doc") {
          editor.commands.setContent(parsed);
        } else {
          editor.commands.setContent({ type: "doc", content: [{ type: "paragraph" }] });
        }
      } catch { editor.commands.setContent(page.content || ""); }
    }
  }, [editor, page]);

  // ─── Lifecycle actions ──────────────────────────────────────────────────

  const handlePublish = async () => {
    await api.pages.setStatus(pageId, "published");
    setShowConfirm(null);
    await loadPage();
  };
  const handleArchive = async () => {
    await api.pages.setStatus(pageId, "archived");
    setShowConfirm(null);
    navigate("/");
  };
  const handleUnarchive = async () => {
    await api.pages.setStatus(pageId, "published");
    await loadPage();
  };
  const handleDelete = async () => {
    await api.pages.delete(pageId);
    setShowConfirm(null);
    navigate("/");
  };
  const handleDuplicate = async () => {
    const newId = await api.pages.duplicate(pageId, userId || "anonymous");
    navigate(`/page/${newId}/edit`);
  };
  const handleToggleFavorite = async () => {
    if (!userId) return;
    await api.favorites.toggle(userId, pageId);
    setIsFavorite(!isFavorite);
  };

  // ─── Comments ───────────────────────────────────────────────────────────

  const handleAddComment = async () => {
    if (!newComment.trim() || !userId) return;
    await api.comments.add(pageId, "", userId, newComment);
    setNewComment("");
    const coms = await api.comments.list(pageId);
    setComments(coms);
  };

  // ─── Revisions ──────────────────────────────────────────────────────────

  const handleRestoreRevision = async (rev: PageRevision) => {
    if (!userId) return;
    setRestoring(true);
    try {
      await api.pages.update(pageId, rev.title, rev.content, userId);
      await loadPage();
      setShowRevisions(false);
    } catch (e) { console.error(e); }
    finally { setRestoring(false); }
  };

  // ─── Render states ──────────────────────────────────────────────────────

  if (loading) {
    return <div className="flex items-center justify-center h-64"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>;
  }

  if (error || !page) {
    return (
      <div className="p-4 md:p-6 lg:p-8 max-w-4xl mx-auto">
        <div className="p-8 rounded-lg border border-destructive/30 bg-destructive/5 text-center">
          <p className="text-sm text-destructive">{error || "Page not found"}</p>
          <button onClick={() => navigate("/")} className="mt-3 text-xs text-primary hover:underline">Go home</button>
        </div>
      </div>
    );
  }

  const ConfirmDialog = () => {
    if (!showConfirm) return null;
    const titles: Record<string, string> = {
      publish: "Publish this page?",
      archive: "Archive this page?",
      delete: "Permanently delete this page?",
    };
    const btnLabel = showConfirm === "delete" ? "Delete" : showConfirm === "archive" ? "Archive" : "Publish";
    const btnClass = showConfirm === "delete" ? "bg-red-600 hover:bg-red-700" : "bg-primary hover:bg-primary/90";
    const action = showConfirm === "publish" ? handlePublish : showConfirm === "archive" ? handleArchive : handleDelete;

    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60" onClick={() => setShowConfirm(null)}>
        <div className="w-80 p-5 rounded-xl border border-border bg-card shadow-2xl" onClick={(e) => e.stopPropagation()}>
          <h3 className="text-sm font-semibold mb-2">{titles[showConfirm]}</h3>
          <p className="text-xs text-muted-foreground mb-4">
            {showConfirm === "delete" ? "This action cannot be undone. All revisions and comments will be lost." :
             showConfirm === "archive" ? "The page will be hidden from the main view but can be restored." :
             "The page will be visible to all team members."}
          </p>
          <div className="flex gap-2 justify-end">
            <button onClick={() => setShowConfirm(null)} className="h-8 px-3 rounded-md text-xs text-muted-foreground hover:text-foreground hover:bg-muted">Cancel</button>
            <button onClick={action} className={`h-8 px-4 rounded-md text-xs font-medium text-white ${btnClass}`}>{btnLabel}</button>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="max-w-4xl mx-auto">
      <ConfirmDialog />

      {/* Header bar */}
      <div className="sticky top-0 z-10 bg-background/95 backdrop-blur-sm border-b border-border">
        <div className="flex items-center justify-between px-4 h-12">
          <div className="flex items-center gap-2">
            <button onClick={() => navigate(-1)} className="p-1.5 rounded text-muted-foreground hover:text-foreground hover:bg-muted">
              <ArrowLeft className="h-4 w-4" />
            </button>
            {page.status === "draft" && <span className="text-[10px] px-1.5 py-0.5 rounded bg-yellow-500/10 text-yellow-500">Draft</span>}
            {page.status === "archived" && <span className="text-[10px] px-1.5 py-0.5 rounded bg-muted text-muted-foreground">Archived</span>}
            {page.status === "published" && <span className="text-[10px] px-1.5 py-0.5 rounded bg-green-500/10 text-green-500">Published</span>}
          </div>

          <div className="flex items-center gap-1">
            <button onClick={handleToggleFavorite} className={cn("p-1.5 rounded text-muted-foreground hover:text-foreground hover:bg-muted", isFavorite && "text-yellow-500")} title="Favorite">
              <Star className="h-4 w-4" fill={isFavorite ? "currentColor" : "none"} />
            </button>
            <button onClick={() => setShowRevisions(!showRevisions)} className={cn("p-1.5 rounded text-muted-foreground hover:text-foreground hover:bg-muted", showRevisions && "text-primary bg-primary/10")} title="History">
              <History className="h-4 w-4" />
            </button>
            <button onClick={() => navigate(`/page/${pageId}/edit`)} className="p-1.5 rounded text-muted-foreground hover:text-foreground hover:bg-muted" title="Edit">
              <Edit3 className="h-4 w-4" />
            </button>
            <button onClick={handleDuplicate} className="p-1.5 rounded text-muted-foreground hover:text-foreground hover:bg-muted" title="Duplicate">
              <Copy className="h-4 w-4" />
            </button>

            {/* Lifecycle buttons */}
            {page.status === "draft" && (
              <button onClick={() => setShowConfirm("publish")} className="ml-2 h-7 px-3 rounded-md text-xs font-medium bg-primary text-white hover:bg-primary/90">
                Publish
              </button>
            )}
            {page.status === "published" && (
              <button onClick={() => setShowConfirm("archive")} className="ml-2 h-7 px-3 rounded-md text-xs font-medium text-muted-foreground hover:text-foreground hover:bg-muted border border-border">
                <Archive className="h-3 w-3 inline mr-1" /> Archive
              </button>
            )}
            {page.status === "archived" && (
              <>
                <button onClick={handleUnarchive} className="ml-2 h-7 px-3 rounded-md text-xs font-medium bg-primary/10 text-primary hover:bg-primary/20">
                  <RotateCcw className="h-3 w-3 inline mr-1" /> Restore
                </button>
                <button onClick={() => setShowConfirm("delete")} className="h-7 px-2 rounded-md text-xs text-red-400 hover:bg-red-500/10">
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Title + meta */}
      <div className="px-4 md:px-8 pt-8">
        {/* Breadcrumbs */}
        {collection && (
          <div className="flex items-center gap-1.5 mb-2 text-[11px] text-muted-foreground">
            <span className="hover:text-foreground cursor-pointer transition-colors">{collection.icon || "📁"} {collection.name}</span>
            <ChevronRight className="h-3 w-3" />
            <span className="text-foreground/80">{page.title}</span>
          </div>
        )}
        <h1 className="text-3xl font-bold">{page.title}</h1>
        <div className="flex items-center gap-3 mt-2 text-xs text-muted-foreground">
          {page.published_at > 0 && <span className="flex items-center gap-1"><Clock className="h-3 w-3" /> Published {formatDate(page.published_at)}</span>}
          <span>Updated {timeAgo(page.updated_at)}</span>
          {(page.status === "published" || page.status === "draft") && (
            <span className="flex items-center gap-1">
              <History className="h-3 w-3" /> {revisions.length} revisions
            </span>
          )}
        </div>
      </div>

      {/* Content */}
      <div className="px-4 md:px-8 py-6">
        {editor && <EditorContent editor={editor} />}
      </div>

      {/* Comments */}
      <div className="px-4 md:px-8 pb-8 border-t border-border mt-8">
        <div className="pt-6 space-y-4">
          <div className="flex items-center gap-2">
            <MessageSquare className="h-4 w-4 text-muted-foreground" />
            <h3 className="text-sm font-semibold">Comments ({comments.length})</h3>
          </div>

          {userId && (
            <div className="flex gap-2">
              <input
                type="text" value={newComment} onChange={(e) => setNewComment(e.target.value)}
                placeholder="Add a comment..." onKeyDown={(e) => { if (e.key === "Enter") handleAddComment(); }}
                className="flex-1 h-9 px-3 rounded-md border border-border bg-card text-sm focus:outline-none focus:ring-1 focus:ring-primary/50"
              />
              <button onClick={handleAddComment} disabled={!newComment.trim()}
                className="h-9 px-3 rounded-md text-xs font-medium bg-primary text-white hover:bg-primary/90 disabled:opacity-50">
                <Send className="h-3.5 w-3.5" />
              </button>
            </div>
          )}

          <div className="space-y-2">
            {comments.map((com) => (
              <div key={com.id} className="p-3 rounded-lg border border-border bg-card">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-xs font-medium">{com.user_id}</span>
                  <span className="text-[10px] text-muted-foreground">{timeAgo(com.created_at)}</span>
                  {com.is_resolved && <span className="text-[10px] px-1 py-0.5 rounded bg-green-500/10 text-green-500">Resolved</span>}
                </div>
                <p className="text-sm">{com.body}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Revisions panel */}
      {showRevisions && (
        <div className="fixed inset-y-0 right-0 w-80 bg-sidebar border-l border-border z-20 overflow-y-auto">
          <div className="sticky top-0 bg-sidebar z-10">
            <div className="flex items-center justify-between px-4 h-12 border-b border-border">
              <h3 className="text-sm font-semibold">History ({revisions.length})</h3>
              <button onClick={() => setShowRevisions(false)} className="p-1 rounded text-muted-foreground hover:text-foreground hover:bg-muted">
                <X className="h-4 w-4" />
              </button>
            </div>
          </div>
          <div className="p-3 space-y-2">
            {revisions.length === 0 && (
              <p className="text-xs text-muted-foreground py-4 text-center">No revisions yet.</p>
            )}
            {[...revisions].reverse().map((rev, i) => (
              <div key={rev.id} className="p-3 rounded-lg border border-border bg-card">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs font-medium">v{rev.revision_number}</span>
                  <span className="text-[10px] text-muted-foreground">{formatDate(rev.created_at)}</span>
                </div>
                <div className="text-xs text-muted-foreground mb-2">by {rev.edited_by}</div>
                {i === revisions.length - 1 ? (
                  <span className="text-[10px] px-1.5 py-0.5 rounded bg-green-500/10 text-green-500">Current</span>
                ) : (
                  <button
                    onClick={() => handleRestoreRevision(rev)}
                    disabled={restoring}
                    className="text-[10px] px-2 py-1 rounded bg-primary/10 text-primary hover:bg-primary/20 disabled:opacity-50 flex items-center gap-1"
                  >
                    <RotateCcw className="h-2.5 w-2.5" /> Restore this version
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
