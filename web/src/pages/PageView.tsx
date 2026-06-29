import React, { useState, useEffect, useRef, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { useEditor, EditorContent } from "@tiptap/react";
import Link from "@tiptap/extension-link";
import ImageExtension from "@tiptap/extension-image";
import { HeadingWithId } from "../extensions/HeadingWithId";
import { Table } from "@tiptap/extension-table";
import { TableRow } from "@tiptap/extension-table-row";
import { TableHeader } from "@tiptap/extension-table-header";
import { TableCell } from "@tiptap/extension-table-cell";
import TaskList from "@tiptap/extension-task-list";
import TaskItem from "@tiptap/extension-task-item";
import Highlight from "@tiptap/extension-highlight";
import CodeBlockLowlight from "@tiptap/extension-code-block-lowlight";
import { Details } from "../extensions/Details";
import { Callout } from "../extensions/Callout";
import { MathInline, MathBlock } from "../extensions/Math";
import { VideoEmbed } from "../extensions/VideoEmbed";
import { RichEmbed } from "../extensions/RichEmbed";
import { Drawio } from "../extensions/Drawio";
import { Mermaid } from "../extensions/Mermaid";
import { ImageEnhanced } from "../extensions/ImageEnhanced";
import { Transclusion } from "../extensions/Transclusion";
import JSZip from "jszip";
import { common, createLowlight } from "lowlight";
import {
  ArrowLeft, Edit3, Star, Archive, Trash2, Copy, Loader2,
  MessageSquare, Clock, Send, History, RotateCcw, X, ChevronRight, Download, Paperclip,
  List, FileText, Link2, LayoutTemplate, Shield, Maximize2, Palette, Pin, Eye, FolderOpen,
  Bell, Share2,
} from "lucide-react";
import { api, Page, PageRevision, Comment, Collection, resolveContentAttachments, resolveTransclusions, accessRequestApi } from "../lib/api";
import { cn, formatDate, timeAgo } from "../lib/utils";
import { diffArrays } from "diff";
import { PagePermissions } from "../components/PagePermissions";
import { RevisionDiff } from "../components/RevisionDiff";
const ImageLightbox = React.lazy(() => import("../components/ImageLightbox"));
import { PageTags } from "../components/PageTags";
import { showToast } from "../components/Toast";
import { MentionInput } from "../components/MentionInput";
import { MediaManager } from "../components/MediaManager";

const lowlight = createLowlight(common);

// ─── Diff helpers (same logic as RevisionDiff) ─────────────────────────────────

function tiptapToPlain(doc: any): string {
  const parts: string[] = [];
  function walk(node: any) {
    if (!node) return;
    if (node.type === "text") { parts.push(node.text || ""); }
    if (node.content) { for (const child of node.content) walk(child); }
    if (node.type === "paragraph" || node.type === "heading" || node.type === "codeBlock" || node.type === "blockquote" || node.type === "callout" || node.type === "listItem") { parts.push("\n"); }
    if (node.type === "horizontalRule") { parts.push("\n---\n"); }
  }
  walk(doc);
  return parts.join("");
}

function tryParseTiptap(json: string): any {
  try { const p = JSON.parse(json); if (p && p.type === "doc") return p; } catch {}
  return null;
}

function revisionContentToLines(content: string): string[] {
  const doc = tryParseTiptap(content);
  if (doc) return tiptapToPlain(doc).split("\n");
  return content.split("\n");
}

interface RevisionDiffPreview {
  titleChanged: boolean;
  addedCount: number;
  removedCount: number;
  sampleLines: string[];
}

function computeDiffPreview(oldRev: PageRevision, newRev: PageRevision): RevisionDiffPreview {
  const titleChanged = oldRev.title !== newRev.title;
  const oldLines = revisionContentToLines(oldRev.content);
  const newLines = revisionContentToLines(newRev.content);
  const changes = diffArrays(oldLines, newLines);
  let addedCount = 0, removedCount = 0;
  const sampleLines: string[] = [];
  for (const change of changes) {
    const lines = change.value as string[];
    if (change.added) {
      addedCount += lines.length;
      if (sampleLines.length < 5) sampleLines.push(...lines.slice(0, 5 - sampleLines.length).map(l => `+ ${l}`));
    } else if (change.removed) {
      removedCount += lines.length;
      if (sampleLines.length < 5) sampleLines.push(...lines.slice(0, 5 - sampleLines.length).map(l => `- ${l}`));
    }
  }
  return { titleChanged, addedCount, removedCount, sampleLines };
}

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
    } else if (node.type === "callout") {
      const ctype = node.attrs?.type || "info";
      lines.push(`> [!${ctype.toUpperCase()}]`);
      node.content?.forEach((c: any) => walk(c, depth + 1));
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

/* function tiptapToHTML(doc: any): string {
  if (!doc || !doc.content) return "";
  let html = "";
  for (const node of doc.content) {
    switch (node.type) {
      case "heading": {
        const level = node.attrs?.level || 1;
        html += `<h${level}>${node.content?.map((n: any) => n.text || "").join("") || ""}</h${level}>\n`;
        break;
      }
      case "paragraph":
        html += `<p>${node.content?.map((n: any) => n.text || "").join("") || ""}</p>\n`;
        break;
      case "bulletList":
        html += "<ul>\n";
        for (const item of node.content || []) {
          html += `<li>${item.content?.map((n: any) => n.content?.map((m: any) => m.text || "").join("") || n.text || "").join("") || ""}</li>\n`;
        }
        html += "</ul>\n";
        break;
      case "orderedList":
        html += "<ol>\n";
        for (const item of node.content || []) {
          html += `<li>${item.content?.map((n: any) => n.content?.map((m: any) => m.text || "").join("") || n.text || "").join("") || ""}</li>\n`;
        }
        html += "</ol>\n";
        break;
      case "codeBlock":
        html += `<pre><code>${node.content?.map((n: any) => n.text || "").join("") || ""}</code></pre>\n`;
        break;
      case "blockquote": {
        const qText = node.content?.map((n: any) => n.content?.map((m: any) => m.text || "").join("") || "").join("") || "";
        html += `<blockquote>${qText}</blockquote>\n`;
        break;
      }
      case "horizontalRule":
        html += "<hr />\n";
        break;
      case "callout": {
        const ctype = node.attrs?.type || "info";
        const colorClass = ctype === "warning" ? "border-amber-500 bg-amber-50" :
          ctype === "tip" ? "border-emerald-500 bg-emerald-50" :
          ctype === "danger" ? "border-red-500 bg-red-50" :
          "border-blue-500 bg-blue-50";
        const icon = ctype === "warning" ? "⚠️" : ctype === "tip" ? "💡" : ctype === "danger" ? "🚨" : "ℹ️";
        html += `<div class="callout ${colorClass}" style="border-left:4px solid;padding:12px;margin:12px 0;border-radius:6px">`;
        html += `<div style="display:flex;align-items:center;gap:8px;margin-bottom:4px;font-size:12px;font-weight:600;text-transform:uppercase">`;
        html += `<span>${icon}</span><span>${ctype}</span></div>`;
        html += `<div>${node.content?.map((n: any) => n.content?.map((m: any) => m.text || "").join("") || n.text || "").join("") || ""}</div></div>\n`;
        break;
      }
      case "image":
        html += `<img src="${node.attrs?.src || ""}" alt="${node.attrs?.alt || ""}" />\n`;
        break;
      default:
        if (node.text) html += node.text;
        break;
    }
  }
  return html;
} */

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
  const [replyTo, setReplyTo] = useState<string | null>(null);
  const [replyText, setReplyText] = useState<Record<string, string>>({});
  const [anchorComment, setAnchorComment] = useState<{ from: number; to: number; text: string } | null>(null);
  const [anchorInput, setAnchorInput] = useState("");
  const [isFavorite, setIsFavorite] = useState(false);
  const [isWatching, setIsWatching] = useState(false);
  const [restoring, setRestoring] = useState(false);
  const [showConfirm, setShowConfirm] = useState<"publish" | "archive" | "delete" | null>(null);
  const [collection, setCollection] = useState<Collection | null>(null);
  const [showExport, setShowExport] = useState(false);
  const [showEmoji, setShowEmoji] = useState(false);
  const [viewCount, setViewCount] = useState(0);

  // Revision diff preview on hover
  const [hoveredRevId, setHoveredRevId] = useState<string | null>(null);
  const revisionDiffPreviews = useMemo(() => {
    const map = new Map<string, RevisionDiffPreview>();
    if (revisions.length < 2) return map;
    for (let i = 0; i < revisions.length; i++) {
      const rev = revisions[i];
      const prev = revisions[i - 1];
      if (prev) {
        map.set(rev.id, computeDiffPreview(prev, rev));
      } else {
        map.set(rev.id, { titleChanged: false, addedCount: 0, removedCount: 0, sampleLines: [] });
      }
    }
    return map;
  }, [revisions]);

  // Diff state
  const [diffOldRev, setDiffOldRev] = useState<PageRevision | null>(null);
  const [diffNewRev, setDiffNewRev] = useState<PageRevision | null>(null);

  // Share state
  const [showShare, setShowShare] = useState(false);
  const [showPermissions, setShowPermissions] = useState(false);
  const [sharePassword, setSharePassword] = useState("");
  const [shareDays, setShareDays] = useState(0);
  const [shareUrl, setShareUrl] = useState("");
  const [shareLinks, setShareLinks] = useState<{ id: string; token: string; expires_at: number; visit_count: number; password_hash: string }[]>([]);
  // const [shareLoading, setShareLoading] = useState(false);
  const [shareCreating, setShareCreating] = useState(false);
  const [attachments, setAttachments] = useState<any[]>([]);
  const [uploading, setUploading] = useState(false);
  const attachInputRef = useRef<HTMLInputElement>(null);
  const [showToc, setShowToc] = useState(false);
  const [showRelationships, setShowRelationships] = useState(false);
  const [backlinks, setBacklinks] = useState<Page[]>([]);
  const [childPages, setChildPages] = useState<Page[]>([]);
  const [lightboxImages, setLightboxImages] = useState<{ src: string; alt: string; imageId?: string }[] | null>(null);
  const [lightboxIndex, setLightboxIndex] = useState(0);
  const [showColorPicker, setShowColorPicker] = useState(false);
  const [showMoveDialog, setShowMoveDialog] = useState(false);
  const [moveCollections, setMoveCollections] = useState<Collection[]>([]);
  const [parentPages, setParentPages] = useState<Page[]>([]);
  const [showMediaBrowser, setShowMediaBrowser] = useState(false);
  const [reactions, setReactions] = useState<Record<string, Record<string, string[]>>>({});

  // Access request state
  const [showAccessRequest, setShowAccessRequest] = useState(false);
  const [accessReason, setAccessReason] = useState("");

  // Inline title editing
  const [editingTitle, setEditingTitle] = useState(false);
  const [titleDraft, setTitleDraft] = useState("");
  const titleInputRef = useRef<HTMLInputElement>(null);

  // Scroll-spy: active heading in TOC
  const [activeHeading, setActiveHeading] = useState<string | null>(null);

  const handleTitleSave = async () => {
    const trimmed = titleDraft.trim();
    if (!trimmed || !page || trimmed === page.title) {
      setEditingTitle(false);
      return;
    }
    try {
      await api.pages.update(pageId, trimmed, page.content, userId || "anonymous");
      setPage(prev => prev ? { ...prev, title: trimmed } : prev);
      showToast({ type: "success", title: "Title updated", duration: 2000 });
    } catch (err) {
      showToast({ type: "error", title: "Failed to update title", message: String(err), duration: 4000 });
    }
    setEditingTitle(false);
  };

  // Auto-focus the title input when editing starts
  useEffect(() => {
    if (editingTitle && titleInputRef.current) {
      titleInputRef.current.focus();
      titleInputRef.current.select();
    }
  }, [editingTitle]);

  // ─── TOC: extract headings from page JSON ───────────────────────────────

  const toc = (() => {
    if (!page) return [];
    try { return extractHeadings(JSON.parse(page.content || "{}")); } catch { return []; }
  })();

  // Scroll-spy: IntersectionObserver for active heading tracking in TOC
  useEffect(() => {
    if (!showToc || toc.length === 0) return;
    const ids = toc.map(h => h.id);
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            setActiveHeading(entry.target.id);
          }
        }
      },
      { rootMargin: "-80px 0px -60% 0px" }
    );
    // Observe heading elements after a tick to ensure DOM is rendered
    const timer = setTimeout(() => {
      for (const id of ids) {
        const el = document.getElementById(id);
        if (el) observer.observe(el);
      }
    }, 100);
    return () => { clearTimeout(timer); observer.disconnect(); };
  // @ts-expect-error toc used before declaration (variable is hoisted within function)
  }, [showToc, toc]);

  // Link preview tooltip
  const [linkPreview, setLinkPreview] = useState<{ x: number; y: number; title: string; url: string } | null>(null);
  const linkPreviewTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [allPageTitles, setAllPageTitles] = useState<Record<string, string>>({});
  const blobUrlCacheRef = useRef<Map<string, string>>(new Map());

  useEffect(() => { loadPage(); }, [pageId]);

  // Load existing share links when dialog opens
  useEffect(() => {
    if (showShare) {
      setSharePassword("");
      setShareDays(0);
      setShareUrl("");
      api.shareLinks.list(pageId)
        .then((links) => setShareLinks(links))
        .catch(() => {})
    }
  }, [showShare, pageId]);

  // ─── TOC: extract headings from page JSON ───────────────────────────────

  function extractHeadings(doc: any): { level: number; text: string; id: string }[] {
    const headings: { level: number; text: string; id: string }[] = [];
    function walk(node: any) {
      if (!node) return;
      if (node.type === "heading") {
        let text = "";
        node.content?.forEach((c: any) => { if (c.text) text += c.text; });
        if (text) headings.push({ level: node.attrs?.level || 1, text, id: `h-${text.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "")}` });
      }
      node.content?.forEach((c: any) => walk(c));
    }
    walk(doc);
    return headings;
  }

  const loadPage = async () => {
    try {
      const p = await api.pages.get(pageId);
      if (!p) { setError("Page not found"); setLoading(false); return; }
      setPage(p);
      // Load collection if page has one
      if (p.collection_id) {
        api.collections.get(p.collection_id).then(setCollection);
      }
      // Load parent page chain for breadcrumbs
      const loadParentChain = async (childId: string, chain: Page[] = []): Promise<Page[]> => {
        if (!childId || chain.length >= 10) return chain;
        try {
          const parent = await api.pages.get(childId);
          if (!parent) return chain;
          const updated = [parent, ...chain];
          return loadParentChain(parent.parent_page_id, updated);
        } catch { return chain; }
      };
      loadParentChain(p.parent_page_id).then(setParentPages);
      // Load backlinks
      api.pages.list().then((allPages) => {
        // Build page title lookup for link previews
        const titles: Record<string, string> = {};
        for (const ap of allPages) {
          if (ap.id) titles[ap.id] = ap.title;
          if (ap.slug) titles[ap.slug] = ap.title;
        }
        setAllPageTitles(titles);
        const links = allPages.filter(
          (other) =>
            other.id !== p.id &&
            other.text_content.toLowerCase().includes(p.title.toLowerCase()) &&
            other.status !== "deleted",
        );
        setBacklinks(links);
        // Load child pages (pages that have this page as parent)
        const children = allPages.filter(
          (ap) => ap.parent_page_id === p.id && ap.status !== "deleted",
        );
        setChildPages(children);
      });
      // Record page view (debounced, deduplicated per viewer)
      const viewer = localStorage.getItem("sw_user_id") || "anonymous";
      api.analytics.recordView(pageId, viewer).catch(() => {});
      // Fetch view count
      api.analytics.getViewCount(pageId).then(setViewCount).catch(() => {});
      const [revs, coms] = await Promise.all([
        api.revisions.list(pageId),
        api.comments.list(pageId),
      ]);
      setRevisions(revs);
      setComments(coms);
      // Load reactions for all comments
      const reactionPromises = coms.map(c => api.comments.listReactions(c.id));
      const reactionResults = await Promise.all(reactionPromises);
      const reactionMap: Record<string, Record<string, string[]>> = {};
      for (let i = 0; i < coms.length; i++) {
        const commentId = coms[i].id;
        const emojiGroups: Record<string, string[]> = {};
        for (const r of reactionResults[i]) {
          if (!emojiGroups[r.emoji]) emojiGroups[r.emoji] = [];
          emojiGroups[r.emoji].push(r.user_id);
        }
        reactionMap[commentId] = emojiGroups;
      }
      setReactions(reactionMap);
      // Load attachments
      api.attachments.list(pageId).then((rows) => setAttachments(rows as any[]));
    } catch (err: any) { setError(String(err)); }
    finally { setLoading(false); }
  };

  const [editorMounted, setEditorMounted] = useState(false);

  const editor = useEditor({
    extensions: [
      StarterKit.configure({ heading: false, codeBlock: false, link: false }), HeadingWithId.configure({ levels: [1, 2, 3] }), Placeholder,
      Link, ImageExtension, Table.configure({ resizable: true }), TableRow, TableHeader, TableCell,
      TaskList, TaskItem.configure({ nested: true }), Highlight,
      CodeBlockLowlight.configure({ lowlight }),
      Details,
      Callout,
      MathInline,
      MathBlock,
      VideoEmbed,
      RichEmbed,
      Drawio,
      Mermaid,
      ImageEnhanced.configure({ inline: true }),
      Transclusion,
    ],
    content: (() => {
      if (!page) return undefined;
      try {
        return JSON.parse(page.content || "{}");
      } catch {
        // content is plain text/HTML, not Tiptap JSON — render as plain paragraph
        const text = page.text_content || page.content?.replace(/<[^>]*>/g, "") || "(Empty page)";
        return { type: "doc", content: [{ type: "paragraph", content: text ? [{ type: "text", text }] : [] }] };
      }
    })(),
    editable: false,
    editorProps: {
      handleClick: (_view, _pos, event) => {
        const target = event.target as HTMLElement;
        if (target.tagName === "IMG" && target.getAttribute("src")) {
          // Collect all images from the page content for gallery nav
          const clickedSrc = target.getAttribute("src")!;
          const clickedAlt = target.getAttribute("alt") || "";
          try {
            const content = JSON.parse(page!.content || "{}");
            const images: { src: string; alt: string; imageId?: string }[] = [];
            const walkNodes = (node: any) => {
              if (node.attrs?.src && typeof node.attrs.src === "string") {
                images.push({ src: node.attrs.src, alt: node.attrs.alt || "", imageId: node.attrs.imageId || undefined });
              }
              if (node.content) {
                node.content.forEach(walkNodes);
              }
            };
            if (content.type === "doc" && content.content) {
              content.content.forEach(walkNodes);
            }
            const idx = images.findIndex(i => i.src === clickedSrc);
            setLightboxImages(images);
            setLightboxIndex(idx >= 0 ? idx : 0);
          } catch {
            setLightboxImages([{ src: clickedSrc, alt: clickedAlt }]);
            setLightboxIndex(0);
          }
          return true;
        }
        return false;
      },
    },
    onCreate: () => { setEditorMounted(true); },
    onSelectionUpdate: ({ editor: ed }) => {
      const { from, to } = ed.state.selection;
      if (from !== to) {
        const text = ed.state.doc.textBetween(from, to, " ");
        if (text.trim().length > 0) {
          setAnchorComment({ from, to, text: text.trim().slice(0, 200) });
          return;
        }
      }
      setAnchorComment(null);
    },
  });

  useEffect(() => {
    if (editor && page && editorMounted) {
      try {
        const parsed = JSON.parse(page.content || "{}");
        if (parsed && parsed.type === "doc") {
          // Resolve attachment:// URLs to blob URLs for display
          resolveContentAttachments(parsed, blobUrlCacheRef.current).then((resolved) => {
            // Then resolve transclusions ({{@page_id}} syntax)
            resolveTransclusions(resolved).then((resolvedWithTransclusions) => {
              editor.commands.setContent(resolvedWithTransclusions as any);
            });
          });
        } else {
          editor.commands.setContent({ type: "doc", content: [{ type: "paragraph" }] });
        }
      } catch { editor.commands.setContent(page.content || ""); }
      // Scroll to heading from URL fragment on load
      requestAnimationFrame(() => {
        const hash = window.location.hash;
        if (hash) {
          const el = document.getElementById(hash.slice(1));
          if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
        }
      });
    }
  }, [editor, page, editorMounted]);

  // ─── Link preview on hover ───────────────────────────────────────────────

  useEffect(() => {
    if (!editor || !editorMounted) return;
    const el = editor.view.dom;
    const mouseover = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      const anchor = target.closest("a");
      if (!anchor || !anchor.getAttribute("href")) {
        setLinkPreview(null);
        return;
      }
      const href = anchor.getAttribute("href")!;
      // Clear any existing timer
      if (linkPreviewTimer.current) clearTimeout(linkPreviewTimer.current);
      // Debounce: wait 300ms before showing
      linkPreviewTimer.current = setTimeout(() => {
        // Check if it's an internal link (/page/<id> or /p/<slug>)
        const pageMatch = href.match(/^\/page\/([a-zA-Z0-9_]+)/);
        const slugMatch = href.match(/^\/p\/([a-zA-Z0-9_-]+)/);
        let title = "";
        if (pageMatch && allPageTitles[pageMatch[1]]) {
          title = allPageTitles[pageMatch[1]];
        } else if (slugMatch && allPageTitles[slugMatch[1]]) {
          title = allPageTitles[slugMatch[1]];
        } else if (!href.startsWith("/") && !href.startsWith("#")) {
          // External link: show domain
          try {
            const url = new URL(href);
            title = url.hostname.replace(/^www\./, "");
          } catch { title = "External link"; }
        } else {
          title = "Wiki link";
        }
        const rect = anchor.getBoundingClientRect();
        setLinkPreview({
          x: rect.left + rect.width / 2,
          y: rect.top - 8,
          url: href,
          title,
        });
      }, 300);
    };
    const mouseout = () => {
      if (linkPreviewTimer.current) clearTimeout(linkPreviewTimer.current);
      setLinkPreview(null);
    };
    el.addEventListener("mouseover", mouseover);
    el.addEventListener("mouseout", mouseout);
    return () => {
      el.removeEventListener("mouseover", mouseover);
      el.removeEventListener("mouseout", mouseout);
      if (linkPreviewTimer.current) clearTimeout(linkPreviewTimer.current);
    };
  }, [editor, allPageTitles]);

  // Clean up blob URLs on unmount
  useEffect(() => {
    const cache = blobUrlCacheRef.current;
    return () => {
      cache.forEach((blobUrl) => URL.revokeObjectURL(blobUrl));
      cache.clear();
    };
  }, []);

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

  const handleToggleWatch = async () => {
    if (!userId) return;
    await api.watch.toggle(userId, "page", pageId);
    setIsWatching(!isWatching);
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

  const handleExportPDF = () => {
    if (!page) return;
    window.print();
    setShowExport(false);
  };

  const [exportingZip, setExportingZip] = useState(false);

  const handleExportZIP = async () => {
    if (!page) return;
    setExportingZip(true);
    try {
      const zip = new JSZip();

      // Add page content as Markdown
      try {
        const json = JSON.parse(page.content || "{}");
        const md = tiptapToMarkdown(json);
        zip.file(`${page.title || "Untitled"}.md`, md);
        // Also add as HTML
        const html = `<!DOCTYPE html>
<html>
<head><meta charset="UTF-8"><title>${page.title || "Untitled"}</title></head>
<body>
${md.split("\n").map(l => l.startsWith("#") ? `<h${l.match(/^#+/)?.[0]?.length || 1}>${l.replace(/^#+\s*/, "")}</h${l.match(/^#+/)?.[0]?.length || 1}>` : l.startsWith("- ") ? `<li>${l.slice(2)}</li>` : l.startsWith("> ") ? `<blockquote>${l.slice(2)}</blockquote>` : l.startsWith("```") ? "<pre><code>" : l ? `<p>${l}</p>` : "<br>").join("\n")}
</body>
</html>`;
        zip.file(`${page.title || "Untitled"}.html`, html);
      } catch {
        zip.file(`${page.title || "Untitled"}.md`, page.content || "");
      }

      // Add attachments
      const atts = await api.attachments.list(pageId);
      for (const att of atts as any[]) {
        const filename = att[2] || "file";
        const base64Data = att[5] || "";
        if (base64Data) {
          zip.file(`attachments/${filename}`, base64Data, { base64: true });
        }
      }

      // Add page metadata as JSON
      zip.file(`${page.title || "Untitled"}.meta.json`, JSON.stringify({
        title: page.title,
        slug: page.slug,
        icon: page.icon,
        color: page.color,
        status: page.status,
        collection_id: page.collection_id,
        created_at: page.created_at,
        updated_at: page.updated_at,
        attachment_count: atts.length,
      }, null, 2));

      const blob = await zip.generateAsync({ type: "blob" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${page.title || "page-export"}.zip`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error("ZIP export failed:", err);
    } finally {
      setExportingZip(false);
      setShowExport(false);
    }
  };

  // ─── JSON Export ─────────────────────────────────────────────────────────

  const [exportingJSON, setExportingJSON] = useState(false);

  const handleExportJSON = async () => {
    if (!page) return;
    setExportingJSON(true);
    try {
      // Parse content as ProseMirror doc
      let doc: any;
      try { doc = JSON.parse(page.content); } catch { doc = null; }

      // Fetch tags for this page
      let tags: { name: string; value: string }[] = [];
      try {
        const tagRows = await api.tags.list(pageId);
        tags = tagRows.map((t: any) => ({ name: t.name, value: t.value }));
      } catch { /* no tags */ }

      // Build the export payload
      const exportData: Record<string, any> = {
        title: page.title,
        slug: page.slug,
        icon: page.icon || "",
        color: page.color || "",
        collection_id: page.collection_id || "",
        parent_page_id: page.parent_page_id || "",
        status: page.status,
        is_pinned: page.is_pinned,
        is_template: page.is_template,
        tags,
        created_by: page.created_by,
        updated_by: page.updated_by,
        created_at: page.created_at,
        updated_at: page.updated_at,
        published_at: page.published_at,
        content: doc,
      };

      // If we have collection info, include it
      if (collection) {
        exportData.collection = {
          id: collection.id,
          name: collection.name,
          icon: collection.icon,
          color: collection.color,
        };
      }

      const json = JSON.stringify(exportData, null, 2);
      downloadFile(json, `${page.title || "Untitled"}.json`, "application/json");
    } catch (err) {
      console.error("JSON export failed:", err);
    } finally {
      setExportingJSON(false);
      setShowExport(false);
    }
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
    // Reload reactions for all comments
    const reactionPromises = coms.map(c => api.comments.listReactions(c.id));
    const reactionResults = await Promise.all(reactionPromises);
    const reactionMap: Record<string, Record<string, string[]>> = {};
    for (let i = 0; i < coms.length; i++) {
      const cid = coms[i].id;
      const emojiGroups: Record<string, string[]> = {};
      for (const r of reactionResults[i]) {
        if (!emojiGroups[r.emoji]) emojiGroups[r.emoji] = [];
        emojiGroups[r.emoji].push(r.user_id);
      }
      reactionMap[cid] = emojiGroups;
    }
    setReactions(reactionMap);
  };

  const handleReply = async (parentId: string) => {
    const text = replyText[parentId]?.trim();
    if (!text || !userId) return;
    await api.comments.add(pageId, parentId, userId, text);
    setReplyText((prev) => ({ ...prev, [parentId]: "" }));
    setReplyTo(null);
    const coms = await api.comments.list(pageId);
    setComments(coms);
    // Reload reactions for all comments
    const reactionPromises = coms.map(c => api.comments.listReactions(c.id));
    const reactionResults = await Promise.all(reactionPromises);
    const reactionMap: Record<string, Record<string, string[]>> = {};
    for (let i = 0; i < coms.length; i++) {
      const cid = coms[i].id;
      const emojiGroups: Record<string, string[]> = {};
      for (const r of reactionResults[i]) {
        if (!emojiGroups[r.emoji]) emojiGroups[r.emoji] = [];
        emojiGroups[r.emoji].push(r.user_id);
      }
      reactionMap[cid] = emojiGroups;
    }
    setReactions(reactionMap);
  };

  const handleResolve = async (id: string) => {
    await api.comments.resolve(id);
    const coms = await api.comments.list(pageId);
    setComments(coms);
  };

  const handleDeleteComment = async (id: string) => {
    await api.comments.delete(id);
    const coms = await api.comments.list(pageId);
    setComments(coms);
  };

  const handleAnchorComment = async () => {
    if (!anchorInput.trim() || !userId || !anchorComment) return;
    const anchorJson = JSON.stringify({
      from: anchorComment.from,
      to: anchorComment.to,
      text: anchorComment.text,
    });
    await api.comments.add(pageId, "", userId, anchorInput, anchorJson);
    setAnchorInput("");
    setAnchorComment(null);
    const coms = await api.comments.list(pageId);
    setComments(coms);
  };

  const handleToggleReaction = async (commentId: string, emoji: string) => {
    if (!userId) return;
    await api.comments.addReaction(commentId, userId, emoji);
    // Reload reactions for this comment
    const commentReactions = await api.comments.listReactions(commentId);
    const emojiGroups: Record<string, string[]> = {};
    for (const r of commentReactions) {
      if (!emojiGroups[r.emoji]) emojiGroups[r.emoji] = [];
      emojiGroups[r.emoji].push(r.user_id);
    }
    setReactions((prev) => ({ ...prev, [commentId]: emojiGroups }));
  };

  // Default reaction emoji list
  const REACTION_EMOJIS = ["👍", "❤️", "🎉", "😄", "😕"];

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

  const handleCompareRevisions = (oldRev: PageRevision, newRev: PageRevision) => {
    setDiffOldRev(oldRev);
    setDiffNewRev(newRev);
  };

  const handleCloseDiff = () => {
    setDiffOldRev(null);
    setDiffNewRev(null);
  };

  // ─── Render states ──────────────────────────────────────────────────────

  if (loading) {
    return <div className="flex items-center justify-center h-64"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>;
  }

  if (error || !page) {
    return (
      <div className="p-4 md:p-6 lg:p-8 max-w-4xl mx-auto">
        <div className="p-8 rounded-lg border border-destructive/30 bg-destructive/5 text-center space-y-3">
          <p className="text-sm text-destructive">{error || "Page not found"}</p>
          <p className="text-[10px] text-muted-foreground/60">You may not have permission to view this page.</p>
          <div className="flex items-center justify-center gap-2">
            <button onClick={() => navigate("/")} className="text-xs text-primary hover:underline">Go home</button>
            {userId && (
              <button
                onClick={() => setShowAccessRequest(true)}
                className="text-xs px-3 py-1 rounded-md bg-primary/10 text-primary hover:bg-primary/20 transition-colors"
              >
                Request Access
              </button>
            )}
          </div>
        </div>

        {/* Access Request dialog */}
        {showAccessRequest && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60" onClick={() => setShowAccessRequest(false)}>
            <div className="w-full max-w-sm mx-4 p-5 rounded-xl border border-border bg-card shadow-2xl" onClick={(e) => e.stopPropagation()}>
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-semibold flex items-center gap-2">
                  <Shield className="h-4 w-4 text-primary" /> Request Access
                </h3>
                <button onClick={() => setShowAccessRequest(false)} className="p-1 rounded hover:bg-muted">
                  <X className="h-4 w-4" />
                </button>
              </div>
              <p className="text-[10px] text-muted-foreground/60 mb-3">
                Request permission to view this page. The page owner and admins will be notified.
              </p>
              <div className="space-y-3">
                <div>
                  <label className="text-[10px] text-muted-foreground/60 mb-1 block">Reason (optional)</label>
                  <textarea
                    value={accessReason}
                    onChange={e => setAccessReason(e.target.value)}
                    placeholder="e.g. I need to review this document for the project..."
                    rows={3}
                    className="w-full px-3 py-2 rounded-md border border-border bg-[#0a0a0a] text-xs text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-1 focus:ring-primary/50 resize-none"
                  />
                </div>
                <div className="flex gap-2 justify-end">
                  <button
                    onClick={() => setShowAccessRequest(false)}
                    className="h-8 px-3 rounded-md text-xs text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={async () => {
                      try {
                        const id = `arq_${Date.now().toString(16)}_${Math.random().toString(36).slice(2, 6)}`;
                        await accessRequestApi.create(id, pageId, userId || "", accessReason);
                        setShowAccessRequest(false);
                        setAccessReason("");
                        showToast({ type: "success", title: "Access Request Sent", message: "The page owner has been notified.", duration: 4000 });
                      } catch (e: any) {
                        showToast({ type: "error", title: "Failed", message: e.message || "Could not send request", duration: 5000 });
                      }
                    }}
                    className="h-8 px-4 rounded-md text-xs font-medium bg-primary text-white hover:bg-primary/90 transition-colors"
                  >
                    Send Request
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
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
    <div className={cn(page?.full_width ? "mx-auto px-4 md:px-8" : "max-w-4xl mx-auto", "page-content")}>
      {page.color && (
        <div className="h-1 w-full rounded-t-lg" style={{ backgroundColor: page.color }} />
      )}
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
            {viewCount > 0 && (
              <span className="flex items-center gap-1 text-[10px] text-muted-foreground/60 px-1.5 py-0.5">
                <Eye className="h-3 w-3" />
                {viewCount}
              </span>
            )}
          </div>

          <div className="page-actions flex items-center gap-1">
            <button onClick={handleToggleFavorite} className={cn("p-1.5 rounded text-muted-foreground hover:text-foreground hover:bg-muted", isFavorite && "text-yellow-500")} title="Favorite">
              <Star className="h-4 w-4" fill={isFavorite ? "currentColor" : "none"} />
            </button>
            <button onClick={handleToggleWatch} className={cn("p-1.5 rounded text-muted-foreground hover:text-foreground hover:bg-muted", isWatching && "text-blue-500")} title={isWatching ? "Unwatch page" : "Watch page for changes"}>
              <Bell className="h-4 w-4" fill={isWatching ? "currentColor" : "none"} />
            </button>
            <button onClick={async () => {
              const newVal = !page?.is_pinned;
              await api.pages.setPinned(pageId, newVal);
              setPage(prev => prev ? { ...prev, is_pinned: newVal } : prev);
            }} className={cn("p-1.5 rounded text-muted-foreground hover:text-foreground hover:bg-muted", page?.is_pinned && "text-primary bg-primary/10")} title={page?.is_pinned ? "Unpin" : "Pin to top"}>
              <Pin className="h-4 w-4" fill={page?.is_pinned ? "currentColor" : "none"} />
            </button>
            <button className="relative p-1.5 rounded text-muted-foreground hover:text-foreground hover:bg-muted" onClick={() => setShowColorPicker(!showColorPicker)} title="Page color">
              <Palette className="h-4 w-4" style={page?.color ? { color: page.color } : undefined} />
              {showColorPicker && (
                <div className="absolute top-full right-0 mt-1 p-2 rounded-lg border border-border bg-card shadow-xl z-30" onClick={(e) => e.stopPropagation()}>
                  <div className="grid grid-cols-6 gap-1.5">
                    {["#ef4444","#f97316","#eab308","#22c55e","#06b6d4","#3b82f6","#8b5cf6","#d946ef","#ec4899","#78716c","#0f0f0f",""].map((c) => (
                      <button
                        key={c}
                        onClick={async () => {
                          await api.pages.setColor(pageId, c);
                          setPage(prev => prev ? { ...prev, color: c } : prev);
                          setShowColorPicker(false);
                        }}
                        className={cn(
                          "w-6 h-6 rounded border border-border hover:scale-110 transition-transform",
                          page?.color === c && "ring-2 ring-primary ring-offset-2 ring-offset-card",
                        )}
                        style={{ backgroundColor: c || "transparent" }}
                        title={c || "None"}
                      >
                        {!c && <X className="h-3 w-3 mx-auto" />}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </button>
            <button onClick={() => setShowRevisions(!showRevisions)} className={cn("p-1.5 rounded text-muted-foreground hover:text-foreground hover:bg-muted", showRevisions && "text-primary bg-primary/10")} title="History">
              <History className="h-4 w-4" />
            </button>
            <button onClick={() => setShowToc(!showToc)} className={cn("p-1.5 rounded text-muted-foreground hover:text-foreground hover:bg-muted", showToc && "text-primary bg-primary/10")} title="Table of Contents">
              <List className="h-4 w-4" />
            </button>
            <button onClick={() => setShowRelationships(!showRelationships)} className={cn("p-1.5 rounded text-muted-foreground hover:text-foreground hover:bg-muted", showRelationships && "text-primary bg-primary/10")} title="Relationships">
              <Share2 className="h-4 w-4" />
            </button>
            {/* Full-width toggle */}
            <button
              onClick={async () => {
                const newVal = !page.full_width;
                await api.pages.setFullWidth(pageId, newVal);
                setPage(prev => prev ? { ...prev, full_width: newVal } : prev);
              }}
              className={cn(
                "p-1.5 rounded text-muted-foreground hover:text-foreground hover:bg-muted",
                page.full_width && "text-primary bg-primary/10",
              )}
              title={page.full_width ? "Constrain width" : "Full width"}
            >
              <Maximize2 className="h-4 w-4" />
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
                  <button onClick={handleExportPDF} className="w-full flex items-center gap-2 px-3 py-1.5 text-xs hover:bg-muted transition-colors text-left">
                    Export as PDF (print)
                  </button>
                  <button
                    onClick={handleExportZIP}
                    disabled={exportingZip}
                    className="w-full flex items-center gap-2 px-3 py-1.5 text-xs hover:bg-muted transition-colors text-left disabled:opacity-50"
                  >
                    {exportingZip ? "Exporting..." : "Export as ZIP"}
                  </button>
                  <button
                    onClick={handleExportJSON}
                    disabled={exportingJSON}
                    className="w-full flex items-center gap-2 px-3 py-1.5 text-xs hover:bg-muted transition-colors text-left disabled:opacity-50"
                  >
                    {exportingJSON ? "Exporting..." : "Export as JSON"}
                  </button>
                </div>
              )}
            </div>

            {/* Share button */}
            <button onClick={() => setShowShare(true)} className="p-1.5 rounded text-muted-foreground hover:text-foreground hover:bg-muted" title="Share">
              <Link2 className="h-4 w-4" />
            </button>

            {/* Move to collection */}
            <div className="relative">
              <button onClick={() => { setShowMoveDialog(!showMoveDialog); if (!showMoveDialog) api.collections.list().then(setMoveCollections); }} className={cn("p-1.5 rounded text-muted-foreground hover:text-foreground hover:bg-muted", showMoveDialog && "text-primary bg-primary/10")} title="Move to collection">
                <FolderOpen className="h-4 w-4" />
              </button>
              {showMoveDialog && (
                <div className="absolute right-0 top-full mt-1 w-48 py-1 rounded-lg border border-border bg-card shadow-xl z-20 max-h-48 overflow-y-auto" onClick={(e) => e.stopPropagation()}>
                  {moveCollections.length === 0 ? (
                    <div className="px-3 py-2 text-xs text-muted-foreground">Loading...</div>
                  ) : (
                    moveCollections.map((col) => (
                      <button
                        key={col.id}
                        onClick={async () => {
                          await api.pages.move(pageId, col.id, "");
                          setPage(prev => prev ? { ...prev, collection_id: col.id } : prev);
                          setShowMoveDialog(false);
                          showToast({ type: "success", title: "Moved", message: `Page moved to "${col.name}"`, duration: 3000 });
                        }}
                        className={cn(
                          "w-full flex items-center gap-2 px-3 py-1.5 text-xs hover:bg-muted transition-colors text-left",
                          page?.collection_id === col.id && "text-primary bg-primary/5",
                        )}
                      >
                        {col.icon || "📁"} {col.name}
                      </button>
                    ))
                  )}
                  <div className="border-t border-border mt-1 pt-1">
                    <button
                      onClick={async () => {
                        await api.pages.move(pageId, "", "");
                        setPage(prev => prev ? { ...prev, collection_id: "" } : prev);
                        setShowMoveDialog(false);
                        showToast({ type: "success", title: "Moved", message: "Page moved to root (no collection)", duration: 3000 });
                      }}
                      className="w-full flex items-center gap-2 px-3 py-1.5 text-xs hover:bg-muted transition-colors text-left"
                    >
                      📄 No collection
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Permissions button */}
            <button onClick={() => setShowPermissions(true)} className="p-1.5 rounded text-muted-foreground hover:text-foreground hover:bg-muted" title="Permissions">
              <Shield className="h-4 w-4" />
            </button>

            {/* Template toggle */}
            <button onClick={async () => { await api.pages.markAsTemplate(pageId || "", !page?.is_template); setPage(prev => prev ? { ...prev, is_template: !prev.is_template } : prev); }}
              className={`p-1.5 rounded hover:bg-muted ${page?.is_template ? 'text-purple-400 bg-purple-500/10' : 'text-muted-foreground hover:text-foreground'}`}
              title={page?.is_template ? "Remove from templates" : "Save as template"}>
              <LayoutTemplate className="h-4 w-4" />
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
          <div className="flex items-center gap-1.5 mb-2 text-[11px] text-muted-foreground flex-wrap">
            <span
              onClick={() => navigate(`/collection/${collection.id}`)}
              className="hover:text-foreground cursor-pointer transition-colors"
            >{collection.icon || "📁"} {collection.name}</span>
            {parentPages.length > 0 && parentPages.map((parent) => (
              <span key={parent.id} className="flex items-center gap-1.5">
                <ChevronRight className="h-3 w-3" />
                <span
                  onClick={() => navigate(`/page/${parent.id}`)}
                  className="hover:text-foreground cursor-pointer transition-colors"
                >{parent.icon || "📄"} {parent.title}</span>
              </span>
            ))}
            <ChevronRight className="h-3 w-3" />
            <span className="text-foreground/80">{page.title}</span>
          </div>
        )}
        <h1 className="text-3xl font-bold flex items-center gap-2 min-w-0">
          <button onClick={() => setShowEmoji(!showEmoji)} className="text-2xl hover:scale-110 transition-transform shrink-0">
            {page.icon || "📄"}
          </button>
          {editingTitle ? (
            <input
              ref={titleInputRef}
              type="text"
              value={titleDraft}
              onChange={(e) => setTitleDraft(e.target.value)}
              onBlur={handleTitleSave}
              onKeyDown={(e) => {
                if (e.key === "Enter") { e.preventDefault(); handleTitleSave(); }
                if (e.key === "Escape") { e.preventDefault(); setEditingTitle(false); setTitleDraft(page.title); }
              }}
              className="flex-1 min-w-0 bg-transparent border-b-2 border-primary/50 text-3xl font-bold text-foreground outline-none py-0.5"
              autoFocus
            />
          ) : (
            <button
              onClick={() => {
                setTitleDraft(page.title);
                setEditingTitle(true);
              }}
              className="flex-1 min-w-0 text-left text-3xl font-bold text-foreground hover:text-primary/80 transition-colors truncate"
              title="Click to rename"
            >
              {page.title}
            </button>
          )}
        </h1>
        {showEmoji && (
          <div className="absolute mt-1 p-2 rounded-lg border border-border bg-card shadow-xl z-30" onClick={(e) => e.stopPropagation()}>
            <div className="grid grid-cols-8 gap-1">
              {["📄","📝","📋","📌","📎","🔖","📚","📖","📕","📗","📘","📙","🗂️","📁","📂","🗃️",
                "⭐","💡","🔧","⚙️","🚀","🎯","✅","❌","⚠️","🔒","🔑","💬","📊","📈","📉","🏗️",
                "🧪","🔬","🛠️","📡","🎨","💻","🖥️","⌨️","🖱️","🔗","🌐","📱","🤖","🧠","💪","🔥"].map(emoji => (
                <button key={emoji} onClick={async () => {
                  await api.pages.setIcon(pageId || "", emoji);
                  setPage(prev => prev ? { ...prev, icon: emoji } : prev);
                  setShowEmoji(false);
                }} className="w-8 h-8 flex items-center justify-center rounded hover:bg-muted text-lg">{emoji}</button>
              ))}
            </div>
          </div>
        )}
        <div className="flex items-center gap-3 mt-2 text-xs text-muted-foreground">
          {page.published_at > 0 && <span className="flex items-center gap-1"><Clock className="h-3 w-3" /> Published {formatDate(page.published_at)}</span>}
          <span>Updated {timeAgo(page.updated_at)}</span>
          {(page.status === "published" || page.status === "draft") && (
            <span className="flex items-center gap-1">
              <History className="h-3 w-3" /> {revisions.length} revisions
            </span>
          )}
        </div>
        {/* Tags */}
        <PageTags pageId={pageId || ''} editable={false} userId={userId} />
      </div>

      {/* Content */}
      <div className="px-4 md:px-8 py-6" dir={page?.direction || "ltr"}>
        {editor && <EditorContent editor={editor} />}
      </div>

      {/* Reading time / word count footer */}
      {(() => {
        let wordCount = 0;
        let charCount = 0;
        try {
          const doc = JSON.parse(page.content || "{}");
          const walkText = (node: any) => {
            if (!node) return;
            if (node.type === "text" && node.text) {
              const text = node.text;
              charCount += text.length;
              const words = text.trim().split(/\s+/);
              wordCount += words.filter((w: string) => w.length > 0).length;
            }
            if (node.content) {
              node.content.forEach(walkText);
            }
          };
          walkText(doc);
        } catch {
          // fallback to text_content if not valid JSON
          const text = page.text_content || "";
          charCount = text.length;
          wordCount = text.trim().split(/\s+/).filter((w) => w.length > 0).length;
        }
        const readingTimeMin = Math.max(1, Math.round(wordCount / 238));
        return (
          <div className="px-4 md:px-8 pb-2 border-b border-border/50">
            <div className="flex items-center gap-3 text-[11px] text-muted-foreground/60">
              <span title="Word count">{wordCount.toLocaleString()} words</span>
              <span>·</span>
              <span title="Character count">{charCount.toLocaleString()} characters</span>
              <span>·</span>
              <span title="Estimated reading time">{readingTimeMin} min read</span>
            </div>
          </div>
        );
      })()}

      {/* Inline comment anchor popup */}
      {anchorComment && (
        <div
          className="fixed z-50 bottom-4 right-4 w-72 p-3 rounded-xl border border-border bg-card shadow-2xl"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="flex items-center justify-between mb-2">
            <span className="text-[10px] font-medium text-muted-foreground">Comment on selected text</span>
            <button onClick={() => { setAnchorComment(null); setAnchorInput(""); }} className="text-muted-foreground hover:text-foreground">
              <X className="h-3 w-3" />
            </button>
          </div>
          <p className="text-xs text-muted-foreground mb-2 italic line-clamp-2">&ldquo;{anchorComment.text}&rdquo;</p>
          <MentionInput
            value={anchorInput}
            onChange={setAnchorInput}
            placeholder="Write a comment..."
            className="w-full min-h-[60px] px-2 py-1.5 rounded-md border border-border bg-background text-sm focus:outline-none focus:ring-1 focus:ring-primary/50 resize-none"
            minRows={2}
          />
          <div className="flex gap-2 mt-2 justify-end">
            <button onClick={() => { setAnchorComment(null); setAnchorInput(""); }}
              className="h-7 px-3 rounded-md text-xs text-muted-foreground hover:text-foreground hover:bg-muted">
              Cancel
            </button>
            <button onClick={handleAnchorComment} disabled={!anchorInput.trim()}
              className="h-7 px-3 rounded-md text-xs font-medium bg-primary text-white hover:bg-primary/90 disabled:opacity-50">
              <Send className="h-3 w-3 inline mr-1" /> Add
            </button>
          </div>
        </div>
      )}

      {/* Comments */}
      <div className="px-4 md:px-8 pb-8 border-t border-border mt-8">
        <div className="pt-6 space-y-4">
          <div className="flex items-center gap-2">
            <MessageSquare className="h-4 w-4 text-muted-foreground" />
            <h3 className="text-sm font-semibold">Comments ({comments.length})</h3>
            {anchorComment && (
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-primary/10 text-primary font-medium">
                Text selected
              </span>
            )}
          </div>

          {userId && !anchorComment && (
            <div className="flex gap-2">
              <MentionInput
                value={newComment}
                onChange={(v) => setNewComment(v)}
                onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleAddComment(); } }}
                placeholder="Add a comment... (@ to mention users)"
                className="flex-1 min-h-[36px] px-3 py-2 rounded-md border border-border bg-card text-sm focus:outline-none focus:ring-1 focus:ring-primary/50 resize-none"
                minRows={1}
              />
              <button onClick={handleAddComment} disabled={!newComment.trim()}
                className="h-9 px-3 rounded-md text-xs font-medium bg-primary text-white hover:bg-primary/90 disabled:opacity-50 self-start">
                <Send className="h-3.5 w-3.5" />
              </button>
            </div>
          )}

          {comments.length > 0 && (
            <div className="space-y-3">
              {/* ── Threaded comments ──────────────────────────────────────── */}
              {(() => {
                // Build thread tree: top-level comments sorted by creation, replies nested under them
                const threads: Comment[] = comments.filter((c) => !c.parent_comment_id);
                const repliesByParent: Record<string, Comment[]> = {};
                for (const c of comments) {
                  if (c.parent_comment_id) {
                    if (!repliesByParent[c.parent_comment_id]) repliesByParent[c.parent_comment_id] = [];
                    repliesByParent[c.parent_comment_id].push(c);
                  }
                }
                // Sort each reply group by creation time
                for (const key of Object.keys(repliesByParent)) {
                  repliesByParent[key].sort((a, b) => a.created_at - b.created_at);
                }
                // Sort top-level threads by creation time
                threads.sort((a, b) => a.created_at - b.created_at);

                const renderComment = (com: Comment, depth: number = 0) => {
                  const replies = repliesByParent[com.id] || [];
                  const isResolved = com.is_resolved;
                  let anchorData: { from: number; to: number; text: string } | null = null;
                  try {
                    if (com.text_anchor) anchorData = JSON.parse(com.text_anchor);
                  } catch {}

                  return (
                    <div key={com.id} className={depth > 0 ? "ml-6 pl-3 border-l-2 border-border/50" : ""}>
                      <div className={`p-3 rounded-lg border ${isResolved ? "border-green-500/30 bg-green-500/5" : "border-border bg-card"}`}>
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-xs font-medium">{com.user_id}</span>
                          <span className="text-[10px] text-muted-foreground">{timeAgo(com.created_at)}</span>
                          {isResolved && <span className="text-[10px] px-1 py-0.5 rounded bg-green-500/10 text-green-500">Resolved</span>}
                          {anchorData && (
                            <span className="text-[10px] px-1 py-0.5 rounded bg-blue-500/10 text-blue-500 truncate max-w-[120px]" title={anchorData.text}>
                              &ldquo;{anchorData.text.slice(0, 30)}{anchorData.text.length > 30 ? "…" : ""}&rdquo;
                            </span>
                          )}
                        </div>
                        <p className="text-sm whitespace-pre-wrap">{com.body}</p>
                        <div className="flex items-center gap-2 mt-1.5">
                          {userId && !isResolved && (
                            <button
                              onClick={() => setReplyTo(replyTo === com.id ? null : com.id)}
                              className="text-[10px] text-muted-foreground hover:text-primary transition-colors"
                            >
                              Reply
                            </button>
                          )}
                          {userId && !isResolved && (
                            <button
                              onClick={() => handleResolve(com.id)}
                              className="text-[10px] text-muted-foreground hover:text-green-500 transition-colors"
                            >
                              Resolve
                            </button>
                          )}
                          {userId && (
                            <button
                              onClick={() => handleDeleteComment(com.id)}
                              className="text-[10px] text-muted-foreground hover:text-red-400 transition-colors"
                            >
                              Delete
                            </button>
                          )}
                        </div>

                        {/* Reaction buttons */}
                        <div className="flex items-center gap-1 mt-2 flex-wrap">
                          {REACTION_EMOJIS.map((emoji) => {
                            const commentReactions = reactions[com.id] || {};
                            const usersForEmoji = commentReactions[emoji] || [];
                            const count = usersForEmoji.length;
                            const hasReacted = userId ? usersForEmoji.includes(userId) : false;
                            return (
                              <button
                                key={emoji}
                                onClick={() => handleToggleReaction(com.id, emoji)}
                                className={cn(
                                  "inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md text-xs transition-all",
                                  hasReacted
                                    ? "bg-primary/15 text-primary border border-primary/20"
                                    : "text-muted-foreground hover:text-foreground hover:bg-muted/50 border border-transparent"
                                )}
                                title={`React with ${emoji}`}
                              >
                                <span className="text-sm leading-none">{emoji}</span>
                                {count > 0 && <span className="text-[10px] font-medium leading-none">{count}</span>}
                              </button>
                            );
                          })}
                        </div>

                        {/* Inline reply input */}
                        {replyTo === com.id && (
                          <div className="flex gap-2 mt-2">
                            <MentionInput
                              value={replyText[com.id] || ""}
                              onChange={(v) => setReplyText((prev) => ({ ...prev, [com.id]: v }))}
                              onKeyDown={(e) => {
                                if (e.key === "Enter" && !e.shiftKey) {
                                  e.preventDefault();
                                  handleReply(com.id);
                                }
                                if (e.key === "Escape") {
                                  setReplyTo(null);
                                  setReplyText((prev) => ({ ...prev, [com.id]: "" }));
                                }
                              }}
                              placeholder="Write a reply..."
                              className="flex-1 min-h-[28px] px-2 py-1 rounded-md border border-border bg-background text-xs focus:outline-none focus:ring-1 focus:ring-primary/50 resize-none"
                              minRows={1}
                            />
                            <button onClick={() => handleReply(com.id)} disabled={!replyText[com.id]?.trim()}
                              className="h-7 px-2 rounded-md text-[10px] font-medium bg-primary text-white hover:bg-primary/90 disabled:opacity-50 self-start">
                              <Send className="h-2.5 w-2.5" />
                            </button>
                          </div>
                        )}
                      </div>

                      {/* Recursively render replies */}
                      {replies.map((reply) => renderComment(reply, depth + 1))}
                    </div>
                  );
                };

                return threads.map((thread) => renderComment(thread, 0));
              })()}
            </div>
          )}
          {comments.length === 0 && (
            <p className="text-xs text-muted-foreground py-2">
              {anchorComment ? "Write your comment above, then click Add." : "No comments yet. Select text in the document to leave an inline comment."}
            </p>
          )}
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
            <div className="flex items-center gap-2">
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
              <button
                onClick={() => setShowMediaBrowser(true)}
                className="inline-flex items-center gap-1.5 h-8 px-3 rounded-md text-xs font-medium border border-border text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
              >
                Browse media
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

      {/* Media Browser Dialog */}
      {showMediaBrowser && (
        <MediaManager
          pageId={pageId}
          userId={userId}
          onClose={() => setShowMediaBrowser(false)}
        />
      )}

      {/* Link preview tooltip */}
      {linkPreview && (
        <div
          className="fixed z-50 px-3 py-1.5 rounded-lg border border-border bg-card shadow-xl"
          style={{
            left: `${linkPreview.x}px`,
            top: `${linkPreview.y}px`,
            transform: "translate(-50%, -100%)",
            pointerEvents: "none",
          }}
        >
          <div className="flex items-center gap-1.5 text-xs">
            <Link2 className="h-3 w-3 text-primary shrink-0" />
            <span className="text-foreground font-medium truncate max-w-[200px]">{linkPreview.title}</span>
          </div>
          <div className="text-[10px] text-muted-foreground truncate max-w-[240px] mt-0.5">
            {linkPreview.url}
          </div>
        </div>
      )}

      {/* Backlinks */}
      {backlinks.length > 0 && (
        <div className="px-4 md:px-8 pb-8 border-t border-border">
          <div className="pt-6 space-y-3">
            <div className="flex items-center gap-2">
              <FileText className="h-4 w-4 text-muted-foreground" />
              <h3 className="text-sm font-semibold">Backlinks ({backlinks.length})</h3>
            </div>
            <div className="grid gap-2">
              {backlinks.map((bp) => (
                <button
                  key={bp.id}
                  onClick={() => navigate(`/page/${bp.id}`)}
                  className="flex items-center gap-3 p-3 rounded-lg border border-border bg-card hover:bg-muted/30 transition-colors text-left"
                >
                  <FileText className="h-4 w-4 text-muted-foreground shrink-0" />
                  <div className="min-w-0 flex-1">
                    <div className="text-sm font-medium truncate">{bp.title}</div>
                    <div className="text-[10px] text-muted-foreground">Updated {timeAgo(bp.updated_at)}</div>
                  </div>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Table of Contents */}
      {showToc && (
        <div className="side-panel fixed inset-y-0 right-0 w-64 bg-sidebar border-l border-border z-20 overflow-y-auto">
          <div className="sticky top-0 bg-sidebar z-10">
            <div className="flex items-center justify-between px-4 h-12 border-b border-border">
              <h3 className="text-sm font-semibold">Table of Contents</h3>
              <button onClick={() => setShowToc(false)} className="p-1 rounded text-muted-foreground hover:text-foreground hover:bg-muted">
                <X className="h-4 w-4" />
              </button>
            </div>
          </div>
          <div className="p-3 space-y-0.5">
            {toc.length === 0 && <p className="text-xs text-muted-foreground py-4 text-center">No headings found.</p>}
            {toc.map((h, i) => (
              <a
                key={i}
                href={`#${h.id}`}
                onClick={(e) => {
                  e.preventDefault();
                  const el = document.getElementById(h.id);
                  if (el) {
                    el.scrollIntoView({ behavior: "smooth", block: "start" });
                    history.replaceState(null, "", `#${h.id}`);
                    setActiveHeading(h.id);
                  }
                }}
                className={cn(
                  "block px-2 py-1 rounded text-xs transition-colors",
                  activeHeading === h.id
                    ? "text-primary font-medium bg-primary/10"
                    : "text-muted-foreground hover:text-foreground hover:bg-muted/50",
                )}
                style={{ paddingLeft: `${8 + (h.level - 1) * 12}px` }}
              >
                {h.text}
              </a>
            ))}
          </div>
        </div>
      )}

      {/* Relationship Map Panel */}
      {showRelationships && (
        <div className="side-panel fixed inset-y-0 right-0 w-72 bg-sidebar border-l border-border z-20 overflow-y-auto">
          <div className="sticky top-0 bg-sidebar z-10">
            <div className="flex items-center justify-between px-4 h-12 border-b border-border">
              <h3 className="text-sm font-semibold flex items-center gap-2"><Share2 className="h-3.5 w-3.5" /> Relationships</h3>
              <button onClick={() => setShowRelationships(false)} className="p-1 rounded text-muted-foreground hover:text-foreground hover:bg-muted">
                <X className="h-4 w-4" />
              </button>
            </div>
          </div>
          <div className="p-3 space-y-4">
            {/* Collection */}
            {collection && (
              <div>
                <p className="text-[10px] text-muted-foreground/60 font-semibold uppercase tracking-wider mb-1.5">Collection</p>
                <button
                  onClick={() => navigate(`/?collection=${collection.id}`)}
                  className="flex items-center gap-2 w-full px-2 py-1.5 rounded text-xs text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors text-left"
                >
                  <FolderOpen className="h-3.5 w-3.5 shrink-0" />
                  <span className="truncate">{collection.name}</span>
                </button>
              </div>
            )}

            {/* Parent page */}
            {parentPages.length > 0 && (
              <div>
                <p className="text-[10px] text-muted-foreground/60 font-semibold uppercase tracking-wider mb-1.5">Parent {parentPages.length > 1 ? "chain" : "page"}</p>
                <div className="space-y-0.5">
                  {parentPages.map((pp) => (
                    <button
                      key={pp.id}
                      onClick={() => navigate(`/page/${pp.id}`)}
                      className="flex items-center gap-2 w-full px-2 py-1.5 rounded text-xs text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors text-left"
                    >
                      <ChevronRight className="h-3 w-3 shrink-0 text-muted-foreground/40" />
                      <span className="truncate">{pp.title}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Child pages */}
            {childPages.length > 0 && (
              <div>
                <p className="text-[10px] text-muted-foreground/60 font-semibold uppercase tracking-wider mb-1.5">Child pages ({childPages.length})</p>
                <div className="space-y-0.5">
                  {childPages.map((cp) => (
                    <button
                      key={cp.id}
                      onClick={() => navigate(`/page/${cp.id}`)}
                      className="flex items-center gap-2 w-full px-2 py-1.5 rounded text-xs text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors text-left"
                    >
                      <FileText className="h-3.5 w-3.5 shrink-0" />
                      <span className="truncate">{cp.title}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Backlinks */}
            {backlinks.length > 0 && (
              <div>
                <p className="text-[10px] text-muted-foreground/60 font-semibold uppercase tracking-wider mb-1.5">Backlinks ({backlinks.length})</p>
                <div className="space-y-0.5">
                  {backlinks.slice(0, 10).map((bp) => (
                    <button
                      key={bp.id}
                      onClick={() => navigate(`/page/${bp.id}`)}
                      className="flex items-center gap-2 w-full px-2 py-1.5 rounded text-xs text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors text-left"
                    >
                      <Link2 className="h-3.5 w-3.5 shrink-0" />
                      <span className="truncate">{bp.title}</span>
                    </button>
                  ))}
                  {backlinks.length > 10 && (
                    <p className="text-[10px] text-muted-foreground/40 px-2 pt-1">+ {backlinks.length - 10} more</p>
                  )}
                </div>
              </div>
            )}

            {!collection && parentPages.length === 0 && childPages.length === 0 && backlinks.length === 0 && (
              <p className="text-xs text-muted-foreground py-4 text-center">No relationships found for this page.</p>
            )}
          </div>
        </div>
      )}

      {/* Revisions panel */}
      {showRevisions && (
        <div className="side-panel fixed inset-y-0 right-0 w-80 bg-sidebar border-l border-border z-20 overflow-y-auto">
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
            {[...revisions].reverse().map((rev, i) => {
              const preview = revisionDiffPreviews.get(rev.id);
              const isHovered = hoveredRevId === rev.id;
              return (
              <div key={rev.id}
                onMouseEnter={() => setHoveredRevId(rev.id)}
                onMouseLeave={() => setHoveredRevId(null)}
                className="relative p-3 rounded-lg border border-border bg-card"
              >
                {isHovered && preview && (preview.titleChanged || preview.addedCount > 0 || preview.removedCount > 0) && (
                  <div className="absolute left-0 right-0 bottom-full mb-1.5 z-30 mx-2">
                    <div className="bg-popover border border-border rounded-lg shadow-xl p-2.5 text-[10px]">
                      {preview.titleChanged && (
                        <div className="flex items-center gap-1.5 mb-1.5 pb-1.5 border-b border-border/50">
                          <span className="text-[10px] font-medium text-foreground/80">Title changed</span>
                        </div>
                      )}
                      <div className="flex items-center gap-2 mb-1.5">
                        <span className="text-green-400 font-medium">+{preview.addedCount}</span>
                        <span className="text-red-400 font-medium">-{preview.removedCount}</span>
                      </div>
                      {preview.sampleLines.length > 0 && (
                        <div className="space-y-0.5 max-h-20 overflow-hidden">
                          {preview.sampleLines.slice(0, 4).map((line, li) => (
                            <div key={li} className={cn("font-mono leading-tight truncate", line.startsWith("+ ") ? "text-green-300" : line.startsWith("- ") ? "text-red-300" : "text-muted-foreground")}>{line}</div>
                          ))}
                          {(preview.addedCount + preview.removedCount) > 4 && (
                            <div className="text-muted-foreground/60 mt-0.5">… and {preview.addedCount + preview.removedCount - 4} more changes</div>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                )}
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs font-medium">v{rev.revision_number}</span>
                  <span className="text-[10px] text-muted-foreground">{formatDate(rev.created_at)}</span>
                </div>
                <div className="text-xs text-muted-foreground mb-2">by {rev.edited_by}</div>
                <div className="flex items-center gap-2">
                  {i === revisions.length - 1 ? (
                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-green-500/10 text-green-500">Current</span>
                  ) : (
                    <>
                      <button
                        onClick={() => handleRestoreRevision(rev)}
                        disabled={restoring}
                        className="text-[10px] px-2 py-1 rounded bg-primary/10 text-primary hover:bg-primary/20 disabled:opacity-50 flex items-center gap-1"
                      >
                        <RotateCcw className="h-2.5 w-2.5" /> Restore
                      </button>
                      <button
                        onClick={() => handleCompareRevisions(rev, revisions[revisions.length - 1])}
                        className="text-[10px] px-2 py-1 rounded bg-blue-500/10 text-blue-400 hover:bg-blue-500/20 flex items-center gap-1"
                      >
                        <svg className="h-2.5 w-2.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <path d="M5 12h14M12 5l7 7-7 7" />
                        </svg>
                        Diff
                      </button>
                    </>
                  )}
                </div>
              </div>
            );
          })}
          </div>
        </div>
      )}

      {/* Revision Diff Panel */}
      {diffOldRev && diffNewRev && (
        <RevisionDiff
          oldRev={diffOldRev}
          newRev={diffNewRev}
          onClose={handleCloseDiff}
        />
      )}

      {/* Page Permissions Dialog */}
      {showPermissions && (
        <PagePermissions
          pageId={pageId}
          userId={userId}
          onClose={() => setShowPermissions(false)}
        />
      )}

      {/* Share Dialog */}
      {showShare && (
        <div className="dialog-overlay fixed inset-0 z-50 flex items-center justify-center bg-black/60" onClick={() => setShowShare(false)}>
          <div className="dialog-container w-full max-w-sm mx-4 p-5 rounded-xl border border-border bg-card shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-semibold flex items-center gap-2">
                <Link2 className="h-4 w-4 text-primary" /> Share "{page?.title || pageId}"
              </h3>
              <button onClick={() => setShowShare(false)} className="p-1 rounded hover:bg-muted">
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="space-y-3">
              {/* Password field */}
              <div>
                <label className="text-[10px] text-muted-foreground/60 mb-1 block">Password (optional)</label>
                <input
                  type="text"
                  value={sharePassword}
                  onChange={(e) => setSharePassword(e.target.value)}
                  placeholder="Leave empty for public link"
                  className="w-full h-8 px-3 rounded-md border border-border bg-[#0a0a0a] text-xs text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-1 focus:ring-primary/50"
                />
              </div>
              {/* TTL field */}
              <div>
                <label className="text-[10px] text-muted-foreground/60 mb-1 block">Expires in days (0 = never)</label>
                <input
                  type="number"
                  value={shareDays}
                  onChange={(e) => setShareDays(parseInt(e.target.value) || 0)}
                  min={0}
                  className="w-full h-8 px-3 rounded-md border border-border bg-[#0a0a0a] text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary/50"
                />
              </div>
              {/* Create button */}
              <button
                onClick={async () => {
                  setShareCreating(true);
                  try {
                    const result = await api.shareLinks.create(pageId, sharePassword, userId || "anon", shareDays);
                    const host = window.location.host;
                    const url = `http://${host}/shared/${result.token}`;
                    setShareUrl(url);
                    const links = await api.shareLinks.list(pageId);
                    setShareLinks(links);
                  } catch (err) {
                    alert(String(err));
                  } finally {
                    setShareCreating(false);
                  }
                }}
                disabled={shareCreating}
                className="w-full h-8 rounded-md text-xs font-medium bg-primary text-primary-foreground hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {shareCreating ? "Creating..." : "Create share link"}
              </button>
              {/* Share URL display */}
              {shareUrl && (
                <div className="p-2 rounded-md bg-primary/5 border border-primary/20">
                  <p className="text-[10px] text-muted-foreground/60 mb-1">Share URL</p>
                  <div className="flex gap-1">
                    <input
                      readOnly
                      value={shareUrl}
                      onClick={(e) => (e.target as HTMLInputElement).select()}
                      className="flex-1 h-8 px-3 rounded-md border border-border bg-[#0a0a0a] text-xs text-foreground font-mono"
                    />
                    <button
                      onClick={() => { navigator.clipboard.writeText(shareUrl); }}
                      className="h-8 px-2 rounded-md text-xs bg-muted hover:bg-muted/80 text-muted-foreground"
                      title="Copy URL"
                    >
                      <Copy className="h-3 w-3" />
                    </button>
                  </div>
                </div>
              )}
              {/* Existing share links */}
              {shareLinks.length > 0 && (
                <div className="space-y-1 pt-2 border-t border-border">
                  <p className="text-[10px] text-muted-foreground/60 mb-1">Active shares</p>
                  {shareLinks.map((s) => (
                    <div key={s.id} className="flex items-center gap-2 text-xs">
                      <span className="text-muted-foreground font-mono truncate flex-1">{s.token.slice(0, 12)}...</span>
                      <span className="text-[10px] text-muted-foreground/60">{s.visit_count} views</span>
                      {s.password_hash && <span className="text-[10px]">🔒</span>}
                      <button
                        onClick={async () => {
                          await api.shareLinks.delete(s.id);
                          const links = await api.shareLinks.list(pageId);
                          setShareLinks(links);
                        }}
                        className="text-red-400 hover:text-red-300 text-[10px]"
                      >
                        ×
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Image Lightbox */}
      {lightboxImages && (
          <React.Suspense fallback={null}>
            <ImageLightbox
              images={lightboxImages}
              initialIndex={lightboxIndex}
              onClose={() => setLightboxImages(null)}
              pageId={page?.id}
              comments={comments}
              onAddComment={async (imageId, body) => {
                if (!userId) return;
                await api.comments.add(pageId, "", userId, body, `image:${imageId}`);
                const coms = await api.comments.list(pageId);
                setComments(coms);
                const reactionPromises = coms.map(c => api.comments.listReactions(c.id));
                const reactionResults = await Promise.all(reactionPromises);
                const reactionMap: Record<string, Record<string, string[]>> = {};
                for (let i = 0; i < coms.length; i++) {
                  const emojiGroups: Record<string, string[]> = {};
                  for (const r of reactionResults[i]) {
                    if (!emojiGroups[r.emoji]) emojiGroups[r.emoji] = [];
                    emojiGroups[r.emoji].push(r.user_id);
                  }
                  reactionMap[coms[i].id] = emojiGroups;
                }
                setReactions(reactionMap);
              }}
            />
          </React.Suspense>
      )}
    </div>
  );
}
