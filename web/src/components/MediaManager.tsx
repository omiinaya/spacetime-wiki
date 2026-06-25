import { useState, useEffect, useRef, useCallback } from "react";
import { api, Attachment } from "../lib/api";
import { X, Search, Paperclip, Image, FileText, Film, Trash2, Copy, Check, Upload, Loader2, ArrowUpRight } from "lucide-react";

// ─── Helpers ────────────────────────────────────────────────────────────────

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function formatDate(ts: number): string {
  if (!ts) return "";
  return new Date(ts).toLocaleDateString("en-US", {
    month: "short", day: "numeric", year: "numeric",
  });
}

function getIcon(mime: string) {
  if (mime.startsWith("image/")) return Image;
  if (mime.startsWith("video/")) return Film;
  if (mime.includes("pdf")) return FileText;
  if (mime.includes("text") || mime.includes("code")) return FileText;
  return Paperclip;
}

function isPreviewable(mime: string): boolean {
  return mime.startsWith("image/") || mime.startsWith("video/");
}

// ─── Props ─────────────────────────────────────────────────────────────────

interface MediaManagerProps {
  pageId: string;
  userId: string | null;
  onClose: () => void;
  /** If true, clicking a media item copies its attachment:// URL */
  pickMode?: boolean;
  onPick?: (url: string) => void;
}

// ─── Component ──────────────────────────────────────────────────────────────

export function MediaManager({ pageId, userId, onClose, pickMode, onPick }: MediaManagerProps) {
  const [atts, setAtts] = useState<Attachment[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [previewId, setPreviewId] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const rows = await api.attachments.list(pageId);
      setAtts(rows);
    } catch (err) {
      console.error("Failed to load attachments:", err);
    } finally {
      setLoading(false);
    }
  }, [pageId]);

  useEffect(() => { load(); }, [load]);

  // ─── Upload ────────────────────────────────────────────────────────────────

  const handleUpload = async (file: File) => {
    if (!userId || !pageId) return;
    setUploading(true);
    try {
      const base64 = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve((reader.result as string).split(",")[1] || "");
        reader.onerror = reject;
        reader.readAsDataURL(file);
      });
      await api.attachments.add(pageId, file.name, file.type, file.size, base64, userId);
      await load();
    } catch (err) {
      console.error("Upload failed:", err);
    } finally {
      setUploading(false);
    }
  };

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleUpload(file);
    e.target.value = "";
  };

  // ─── Drag and drop ───────────────────────────────────────────────────────

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragOver(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragOver(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragOver(false);
    const file = e.dataTransfer.files?.[0];
    if (file) handleUpload(file);
  };

  // ─── Delete ──────────────────────────────────────────────────────────────

  const handleDelete = async (id: string) => {
    try {
      await api.attachments.delete(id);
      setAtts((prev) => prev.filter((a) => a.id !== id));
    } catch (err) {
      console.error("Delete failed:", err);
    }
  };

  // ─── Copy attachment:// URL ──────────────────────────────────────────────

  const handleCopyLink = (id: string) => {
    const url = `attachment://${id}`;
    navigator.clipboard.writeText(url).then(() => {
      setCopiedId(id);
      setTimeout(() => setCopiedId(null), 2000);
    });
  };

  // ─── Filter & preview ────────────────────────────────────────────────────

  const filtered = search.trim()
    ? atts.filter(
        (a) =>
          a.filename.toLowerCase().includes(search.toLowerCase()) ||
          a.mime_type.toLowerCase().includes(search.toLowerCase()),
      )
    : atts;

  const previewAtt = previewId ? atts.find((a) => a.id === previewId) : null;

  // ─── Render ────────────────────────────────────────────────────────────────

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60" onClick={onClose}>
      <div
        className="w-full max-w-3xl mx-4 max-h-[85vh] flex flex-col rounded-xl border border-border bg-card shadow-2xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
        ref={dropZoneRef}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
      >
        {/* ─── Header ──────────────────────────────────────────────────────── */}
        <div className="flex items-center justify-between px-4 h-12 border-b border-border shrink-0">
          <h3 className="text-sm font-semibold flex items-center gap-2">
            <Paperclip className="h-4 w-4 text-primary" />
            Media Browser
            {atts.length > 0 && (
              <span className="text-[10px] text-muted-foreground font-normal">
                ({atts.length} file{atts.length !== 1 ? "s" : ""})
              </span>
            )}
          </h3>
          <div className="flex items-center gap-2">
            {userId && (
              <>
                <input
                  ref={fileInputRef}
                  type="file"
                  onChange={handleFileInput}
                  className="hidden"
                />
                <button
                  onClick={() => fileInputRef.current?.click()}
                  disabled={uploading}
                  className="inline-flex items-center gap-1 h-7 px-2.5 rounded-md text-xs font-medium border border-border text-muted-foreground hover:text-foreground hover:bg-muted transition-colors disabled:opacity-50"
                >
                  {uploading ? (
                    <Loader2 className="h-3 w-3 animate-spin" />
                  ) : (
                    <Upload className="h-3 w-3" />
                  )}
                  {uploading ? "Uploading..." : "Upload"}
                </button>
              </>
            )}
            <button onClick={onClose} className="p-1.5 rounded text-muted-foreground hover:text-foreground hover:bg-muted">
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* ─── Search bar ──────────────────────────────────────────────────── */}
        {atts.length > 0 && (
          <div className="px-4 py-2 border-b border-border shrink-0">
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Filter by filename or type..."
                className="w-full h-8 pl-8 pr-3 rounded-md border border-border bg-[#0a0a0a] text-xs text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-1 focus:ring-primary/50"
              />
            </div>
          </div>
        )}

        {/* ─── Drag-drop overlay ────────────────────────────────────────────── */}
        {dragOver && (
          <div className="absolute inset-0 z-10 flex items-center justify-center bg-primary/10 border-2 border-dashed border-primary/50 rounded-xl pointer-events-none">
            <div className="text-center">
              <Upload className="h-8 w-8 text-primary mx-auto mb-2" />
              <p className="text-sm font-medium text-primary">Drop file to upload</p>
            </div>
          </div>
        )}

        {/* ─── Content ──────────────────────────────────────────────────────── */}
        <div className="flex-1 overflow-y-auto p-4">
          {loading && (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
            </div>
          )}

          {!loading && atts.length === 0 && (
            <div className="text-center py-12">
              <Paperclip className="h-10 w-10 text-muted-foreground/30 mx-auto mb-3" />
              <p className="text-sm text-muted-foreground mb-1">No attachments yet</p>
              <p className="text-xs text-muted-foreground/60 mb-4">
                Upload images, documents, or other files by clicking Upload or dragging them here.
              </p>
            </div>
          )}

          {!loading && filtered.length === 0 && search.trim() && (
            <div className="text-center py-8">
              <Search className="h-8 w-8 text-muted-foreground/30 mx-auto mb-2" />
              <p className="text-sm text-muted-foreground">No files matching "{search}"</p>
            </div>
          )}

          {/* ─── Grid view ──────────────────────────────────────────────────── */}
          {!loading && filtered.length > 0 && (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
              {filtered.map((att) => {
                const Icon = getIcon(att.mime_type);
                const isPreviewableFile = isPreviewable(att.mime_type);
                const isCopied = copiedId === att.id;

                return (
                  <div
                    key={att.id}
                    className="group relative rounded-lg border border-border bg-card hover:bg-muted/30 transition-all overflow-hidden cursor-pointer"
                    onClick={() => {
                      if (pickMode && onPick) {
                        const url = `attachment://${att.id}`;
                        onPick(url);
                        onClose();
                      } else if (isPreviewableFile) {
                        setPreviewId(att.id);
                      } else {
                        handleCopyLink(att.id);
                      }
                    }}
                  >
                    {/* Thumbnail / Icon */}
                    <div className="aspect-video flex items-center justify-center bg-muted/20 relative overflow-hidden">
                      {isPreviewableFile ? (
                        att.mime_type.startsWith("image/") ? (
                          <img
                            src={`data:${att.mime_type};base64,${att.storage_key}`}
                            alt={att.filename}
                            className="w-full h-full object-cover"
                            loading="lazy"
                          />
                        ) : (
                          <Film className="h-8 w-8 text-muted-foreground" />
                        )
                      ) : (
                        <Icon className="h-8 w-8 text-muted-foreground" />
                      )}
                      {/* Hover actions overlay */}
                      <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-1.5">
                        {isPreviewableFile && (
                          <button
                            onClick={(e) => { e.stopPropagation(); setPreviewId(att.id); }}
                            className="p-1.5 rounded bg-white/20 text-white hover:bg-white/30 transition-colors"
                            title="Preview"
                          >
                            <ArrowUpRight className="h-3.5 w-3.5" />
                          </button>
                        )}
                        <button
                          onClick={(e) => { e.stopPropagation(); handleCopyLink(att.id); }}
                          className="p-1.5 rounded bg-white/20 text-white hover:bg-white/30 transition-colors"
                          title="Copy link"
                        >
                          {isCopied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
                        </button>
                        {userId && !pickMode && (
                          <button
                            onClick={(e) => { e.stopPropagation(); handleDelete(att.id); }}
                            className="p-1.5 rounded bg-red-500/30 text-white hover:bg-red-500/50 transition-colors"
                            title="Delete"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        )}
                      </div>
                    </div>

                    {/* File info */}
                    <div className="p-2">
                      <p className="text-xs font-medium truncate" title={att.filename}>
                        {att.filename}
                      </p>
                      <p className="text-[10px] text-muted-foreground mt-0.5">
                        {formatSize(att.size_bytes)} &middot; {formatDate(att.created_at)}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* ─── Preview full-screen ──────────────────────────────────────────── */}
        {previewAtt && (
          <div
            className="absolute inset-0 z-20 flex items-center justify-center bg-black/80"
            onClick={() => setPreviewId(null)}
          >
            <div
              className="relative max-w-full max-h-full p-4"
              onClick={(e) => e.stopPropagation()}
            >
              <button
                onClick={() => setPreviewId(null)}
                className="absolute top-2 right-2 z-10 p-1.5 rounded bg-black/50 text-white hover:bg-black/70 transition-colors"
              >
                <X className="h-4 w-4" />
              </button>
              {previewAtt.mime_type.startsWith("image/") ? (
                <img
                  src={`data:${previewAtt.mime_type};base64,${previewAtt.storage_key}`}
                  alt={previewAtt.filename}
                  className="max-w-full max-h-[75vh] rounded-lg shadow-2xl object-contain"
                />
              ) : previewAtt.mime_type.startsWith("video/") ? (
                <video
                  src={`data:${previewAtt.mime_type};base64,${previewAtt.storage_key}`}
                  controls
                  className="max-w-full max-h-[75vh] rounded-lg shadow-2xl"
                />
              ) : null}
              <div className="mt-3 text-center">
                <p className="text-sm text-white font-medium">{previewAtt.filename}</p>
                <p className="text-xs text-white/60 mt-1">{formatSize(previewAtt.size_bytes)}</p>
                <button
                  onClick={() => handleCopyLink(previewAtt.id)}
                  className="mt-2 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium bg-primary text-white hover:bg-primary/90 transition-colors"
                >
                  {copiedId === previewAtt.id ? (
                    <><Check className="h-3 w-3" /> Copied!</>
                  ) : (
                    <><Copy className="h-3 w-3" /> Copy attachment link</>
                  )}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
