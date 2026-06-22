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
  MessageSquare, Clock, Send, History, RotateCcw, X, ChevronRight, Download, Paperclip,
} from "lucide-react";
import { api, Page, PageRevision, Comment, Collection } from "../lib/api";
import { cn, formatDate, timeAgo } from "../lib/utils";

const lowlight = createLowlight(common);

// ─── Markdown export helper ──────────────────────────────────────────────────

function tiptapToMarkdown(doc: any): string {
  const lines: string[] = [];
  function walk(node: any, depth = 0) {
    if (!node) return;
    if (node.type === "doc" || node.type === "tableRow" || node.type === "tableHeader") {
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
        } else if (c.type === "image") {
          text += `![${c.attrs?.alt || ""}](${c.attrs?.src || ""})`;
        } else if (c.type === "hardBreak") {
          text += "\n";
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
    } else if (node.type === "bulletList" || node.type === "orderedList") {
      node.content?.forEach((c: any) => walk(c, depth));
    } else if (node.type === "listItem") {
      let text = "";
      node.content?.forEach((c: any) => {
        if (c.type === "paragraph") {
          c.content?.forEach((cc: any) => {
            if (cc.type === "text") {
              let t = cc.text || "";
              if (cc.marks) {
                cc.marks.forEach((m: any) => {
                  if (m.type === "bold") t = `**${t}**`;
                  if (m.type === "italic") t = `_${t}_`;
                  if (m.type === "code") t = `\`${t}\``;
                  if (m.type === "link") t = `[${t}](${m.attrs?.href || ""})`;
                });
              }
              text += t;
            }
          });
        }
      });
      lines.push(`- ${text}`);
    } else if (node.type === "codeBlock") {
      let text = "";
      node.content?.forEach((c: any) => { if (c.text) text += c.text; });
      const lang = node.attrs?.language || "";
      lines.push(`\`\`\`${lang}`);
      lines.push(text);
      lines.push("```");
      lines.push("");
    } else if (node.type === "blockquote") {
      node.content?.forEach((c: any) => {
        const before = lines.length;
        walk(c, depth + 1);
        for (let i = before; i < lines.length; i++) {
          if (lines[i]) lines[i] = `> ${lines[i]}`;
        }
      });
    } else if (node.type === "horizontalRule") {
      lines.push("---");
      lines.push("");
    } else if (node.type === "taskList") {
      node.content?.forEach((c: any) => walk(c, depth));
    } else if (node.type === "taskItem") {
      const checked = node.attrs?.checked ? "x" : " ";
      let text = "";
      node.content?.forEach((c: any) => {
        if (c.type === "paragraph") {
          c.content?.forEach((cc: any) => { if (cc.text) text += cc.text; });
        }
      });
      lines.push(`- [${checked}] ${text}`);
    } else if (node.type === "table") {
      // Basic table export
      const rows: string[][] = [];
      node.content?.forEach((row: any) => {
        const cells: string[] = [];
        row.content?.forEach((cell: any) => {
          let text = "";
          cell.content?.forEach((p: any) => {
            p.content?.forEach((cc: any) => { if (cc.text) text += cc.text; });
          });
          cells.push(text);
        });
        rows.push(cells);
      });
      if (rows.length > 0) {
        const colCount = rows[0].length;
        rows.forEach((row, i) => {
          lines.push("| " + row.join(" | ") + " |");
          if (i === 0) lines.push("| " + "---".repeat(colCount) + " |");
        });
        lines.push("");
      }
    } else {
      // Unknown node — recurse into content
      node.content?.forEach((c: any) => walk(c, depth));
    }
  }
  walk(doc);
  return lines.join("\n").trim();
}

function downloadFile(content: string, filename: string, mime: string) {
  const blob = new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

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
  const [showExport, setShowExport] = useState(false);
  const [attachments, setAttachments] = useState<any[]>([]);
  const [uploading, setUploading] = useState(false);
  const attachInputRef = useRef<HTMLInputElement>(null);

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
      // Load attachments
      api.attachments.list(pageId).then((rows) => setAttachments(rows as any[]));
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

  // ─── Export ──────────────────────────────────────────────────────────────

  const handleExportMD = async () => {
    if (!page) return;
    try {
      const json = JSON.parse(page.content || "{}");
      const md = tiptapToMarkdown(json);
      downloadFile(md, `${page.title || "Untitled"}.md`, "text/markdown");
    } catch { downloadFile(page.content || "", `${page.title || "Untitled"}.md`, "text/markdown"); }
    setShowExport(false);
  };

  const handleExportHTML = async () => {
    if (!page) return;
    try {
      const json = JSON.parse(page.content || "{}");
      const md = tiptapToMarkdown(json);
      const html = `<!DOCTYPE html>
<html>
<head><meta charset="UTF-8"><title>${page.title || "Untitled"}</title></head>
<body>
${md.split("\n").map(l => l.startsWith("#") ? `<h${l.match(/^#+/)?.[0]?.length || 1}>${l.replace(/^#+\s*/, "")}</h${l.match(/^#+/)?.[0]?.length || 1}>` : l.startsWith("- ") ? `<li>${l.slice(2)}</li>` : l.startsWith("> ") ? `<blockquote>${l.slice(2)}</blockquote>` : l.startsWith("```") ? "<pre><code>" : l ? `<p>${l}</p>` : "<br>").join("\n")}
</body>
</html>`;
      downloadFile(html, `${page.title || "Untitled"}.html`, "text/html");
    } catch { /* fallback */ }
    setShowExport(false);
  };

  // ─── Attachments ─────────────────────────────────────────────────────────

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !page || !userId) return;
    setUploading(true);
    try {
      const reader = new FileReader();
      const base64 = await new Promise<string>((resolve) => {
        reader.onload = () => resolve((reader.result as string).split(",")[1] || "");
        reader.readAsDataURL(file);
      });
      await api.attachments.add(pageId, file.name, file.type, file.size, base64, userId);
      const rows = await api.attachments.list(pageId);
      setAttachments(rows as any[]);
    } catch (err) { console.error(err); }
    finally { setUploading(false); }
    e.target.value = "";
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

            {/* Export dropdown */}
            <div className="relative">
              <button onClick={() => setShowExport(!showExport)} className={cn("p-1.5 rounded text-muted-foreground hover:text-foreground hover:bg-muted", showExport && "text-primary bg-primary/10")} title="Export">
                <Download className="h-4 w-4" />
              </button>
              {showExport && (
                <div className="absolute right-0 top-full mt-1 w-40 py-1 rounded-lg border border-border bg-card shadow-xl z-20" onClick={(e) => e.stopPropagation()}>
                  <button onClick={handleExportMD} className="w-full flex items-center gap-2 px-3 py-1.5 text-xs hover:bg-muted transition-colors text-left">
                    Export as Markdown
                  </button>
                  <button onClick={handleExportHTML} className="w-full flex items-center gap-2 px-3 py-1.5 text-xs hover:bg-muted transition-colors text-left">
                    Export as HTML
                  </button>
                </div>
              )}
            </div>

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

      {/* Attachments */}
      <div className="px-4 md:px-8 pb-8 border-t border-border">
        <div className="pt-6 space-y-4">
          <div className="flex items-center gap-2">
            <Paperclip className="h-4 w-4 text-muted-foreground" />
            <h3 className="text-sm font-semibold">Attachments ({attachments.length})</h3>
          </div>

          {userId && (
            <div>
              <input
                ref={attachInputRef}
                type="file"
                onChange={handleFileUpload}
                className="hidden"
              />
              <button
                onClick={() => attachInputRef.current?.click()}
                disabled={uploading}
                className="inline-flex items-center gap-1.5 h-8 px-3 rounded-md text-xs font-medium border border-border text-muted-foreground hover:text-foreground hover:bg-muted transition-colors disabled:opacity-50"
              >
                {uploading ? <Loader2 className="h-3 w-3 animate-spin" /> : <Paperclip className="h-3 w-3" />}
                {uploading ? "Uploading..." : "Upload file"}
              </button>
            </div>
          )}

          <div className="grid gap-2">
            {attachments.map((att: any) => (
              <div key={att[0]} className="flex items-center justify-between p-3 rounded-lg border border-border bg-card">
                <a
                  href={`data:${att[3] || "application/octet-stream"};base64,${att[5] || ""}`}
                  download={att[2] || "file"}
                  className="flex items-center gap-2 text-sm text-primary hover:underline"
                >
                  <Paperclip className="h-3.5 w-3.5" />
                  {att[2] || "file"}
                  <span className="text-[10px] text-muted-foreground">
                    ({att[4] ? `${(att[4] / 1024).toFixed(1)} KB` : ""})
                  </span>
                </a>
                {userId && (
                  <button
                    onClick={async () => { await api.attachments.delete(att[0]); setAttachments(atts => atts.filter((a: any) => a[0] !== att[0])); }}
                    className="p-1 rounded text-muted-foreground hover:text-red-400 hover:bg-red-500/10"
                  >
                    <Trash2 className="h-3 w-3" />
                  </button>
                )}
              </div>
            ))}
            {attachments.length === 0 && (
              <p className="text-xs text-muted-foreground py-2">No attachments yet.</p>
            )}
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
