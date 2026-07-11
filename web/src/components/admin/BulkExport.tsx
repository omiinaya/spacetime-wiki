import { useState, useEffect } from "react";
import JSZip from "jszip";
import { api, Page, Collection } from "../../lib/api";
import { useToast } from "../Toast";
import { tiptapToMarkdown, tiptapToHTML } from "../../lib/helpers";
import { FileText, Download, Loader2 } from "lucide-react";

export function BulkExport() {
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);
  const [allPages, setAllPages] = useState<Page[]>([]);
  const [collections, setCollections] = useState<Collection[]>([]);
  const [selectedColId, setSelectedColId] = useState<string>("__all");
  const [exportFormat, setExportFormat] = useState<"md" | "html" | "pdf">("md");

  useEffect(() => {
    (async () => {
      try {
        const [pages, cols] = await Promise.all([
          api.pages.list(),
          api.collections.list(),
        ]);
        setAllPages(pages);
        setCollections(cols);
      } catch (e) {
        console.error("Failed to load data for export:", e);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const filteredPages = selectedColId === "__all"
    ? allPages
    : allPages.filter((p) => p.collection_id === selectedColId);

  const handleBulkExport = async () => {
    setExporting(true);
    try {
      if (exportFormat === "pdf") {
        // Generate a print-ready HTML document with all pages
        let pdfHtml = `<!DOCTYPE html>
<html><head><meta charset="UTF-8"><title>Wiki Export</title>
<style>
  @media print { body { margin: 0; padding: 0; } .page-break { page-break-before: always; } }
  body { font-family: system-ui, -apple-system, sans-serif; max-width: 800px; margin: 0 auto; padding: 40px; line-height: 1.6; color: #1a1a1a; }
  h1, h2, h3, h4 { color: #000; margin-top: 1.5em; margin-bottom: 0.5em; }
  h1 { font-size: 2em; border-bottom: 2px solid #e5e5e5; padding-bottom: 0.3em; }
  h2 { font-size: 1.5em; border-bottom: 1px solid #e5e5e5; padding-bottom: 0.2em; }
  h3 { font-size: 1.25em; }
  pre { background: #f5f5f5; padding: 16px; border-radius: 6px; overflow-x: auto; font-size: 13px; }
  code { background: #f0f0f0; padding: 2px 6px; border-radius: 3px; font-size: 0.9em; }
  pre code { background: none; padding: 0; }
  blockquote { border-left: 4px solid #d0d0d0; margin: 1em 0; padding: 0.5em 1em; color: #555; background: #fafafa; }
  table { border-collapse: collapse; width: 100%; margin: 1em 0; }
  th, td { border: 1px solid #d0d0d0; padding: 8px 12px; text-align: left; }
  th { background: #f0f0f0; font-weight: 600; }
  img { max-width: 100%; height: auto; }
  ul, ol { padding-left: 1.5em; }
  li { margin: 0.25em 0; }
  .page-header { border-bottom: 2px solid #333; padding-bottom: 0.5em; margin-bottom: 1em; }
  .page-footer { font-size: 0.8em; color: #888; border-top: 1px solid #e5e5e5; padding-top: 0.5em; margin-top: 1em; }
  .cover-page { text-align: center; padding-top: 30vh; }
  .cover-page h1 { font-size: 2.5em; border: none; }
  .cover-page p { color: #666; font-size: 1.1em; }
  .toc { margin: 2em 0; }
  .toc a { color: #333; text-decoration: none; display: block; padding: 0.3em 0; }
  .toc a:hover { color: #0066cc; }
</style></head><body>
  <div class="cover-page">
    <h1>Wiki Export</h1>
    <p>${filteredPages.length} pages exported on ${new Date().toLocaleDateString()}</p>
  </div>`;
        for (let i = 0; i < filteredPages.length; i++) {
          const page = filteredPages[i];
          const safeTitle = page.title || "Untitled";
          let contentHtml = "";
          try {
            const json = JSON.parse(page.content || "{}");
            contentHtml = tiptapToHTML(json);
          } catch { contentHtml = `<p>${page.content || ""}</p>`; }
          const colName = collections.find(c => c.id === page.collection_id)?.name || "";
          pdfHtml += `<div class="${i > 0 ? "page-break" : ""}">
            <div class="page-header"><h1>${safeTitle}</h1>${colName ? `<span style="color:#888;font-size:0.9em">📁 ${colName}</span>` : ""}</div>
            ${contentHtml}
            <div class="page-footer">Updated ${new Date(page.updated_at).toLocaleDateString()} | v${page.id.slice(0,8)}</div>
          </div>`;
        }
        pdfHtml += `</body></html>`;
        // Open in new window for print/PDF save
        const win = window.open("", "_blank");
        if (win) {
          win.document.write(pdfHtml);
          win.document.close();
          win.focus();
        }
        setExporting(false);
        return;
      }

      const zip = new JSZip();
      let exported = 0;

      for (const page of filteredPages) {
        const safeName = page.title.replace(/[^a-z0-9]/gi, "_").slice(0, 64) || page.id.slice(0, 12);
        try {
          const json = JSON.parse(page.content || "{}");
          if (exportFormat === "md") {
            const md = tiptapToMarkdown(json);
            zip.file(`${safeName}/${safeName}.md`, md);
          } else {
            const html = tiptapToHTML(json);
            const fullHtml = `<!DOCTYPE html>
<html><head><meta charset="UTF-8"><title>${page.title}</title></head>
<body>${html}</body></html>`;
            zip.file(`${safeName}/${safeName}.html`, fullHtml);
          }
        } catch {
          zip.file(`${safeName}/${safeName}.txt`, page.content || "");
        }

        try {
          const atts = await api.attachments.list(page.id);
          for (const att of atts as unknown[]) {
            const filename = att[2] || "file";
            const base64Data = att[5] || "";
            if (base64Data) {
              zip.file(`${safeName}/attachments/${filename}`, base64Data, { base64: true });
            }
          }
        } catch { /* no attachments */ }

        zip.file(`${safeName}/${safeName}.meta.json`, JSON.stringify({
          title: page.title, slug: page.slug, icon: page.icon,
          color: page.color, status: page.status,
          collection_id: page.collection_id,
          created_at: page.created_at, updated_at: page.updated_at,
        }, null, 2));

        exported++;
      }

      const indexEntries = filteredPages.map((p) => ({
        title: p.title, slug: p.slug, status: p.status,
        collection: collections.find((c) => c.id === p.collection_id)?.name || "",
        updated_at: p.updated_at,
      }));
      zip.file("index.json", JSON.stringify(indexEntries, null, 2));

      const blob = await zip.generateAsync({ type: "blob" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `wiki-export-${new Date().toISOString().slice(0, 10)}.zip`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error("Bulk export failed:", err);
    } finally {
      setExporting(false);
    }
  };

  if (loading) {
    return <div className="flex items-center justify-center py-8"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>;
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Export Wiki Pages</p>
      </div>

      <div>
        <label className="text-[10px] text-muted-foreground/60 font-medium mb-1 block">Collection</label>
        <select
          value={selectedColId}
          onChange={(e) => setSelectedColId(e.target.value)}
          className="w-full h-8 px-2 rounded-md border border-border bg-[#0a0a0a] text-xs focus:outline-hidden focus:ring-1 focus:ring-primary/50"
        >
          <option value="__all">All collections ({allPages.length} pages)</option>
          {collections.map((c) => {
            const count = allPages.filter((p) => p.collection_id === c.id).length;
            return <option key={c.id} value={c.id}>{c.icon || "📁"} {c.name} ({count})</option>;
          })}
          <option value="uncategorized">Uncategorized ({allPages.filter((p) => !p.collection_id || p.collection_id === "").length})</option>
        </select>
      </div>

      <div>
        <label className="text-[10px] text-muted-foreground/60 font-medium mb-1 block">Format</label>
        <div className="flex gap-2">
          <button
            onClick={() => setExportFormat("md")}
            className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
              exportFormat === "md"
                ? "bg-primary/10 text-primary border border-primary/20"
                : "border border-border text-muted-foreground hover:text-foreground hover:bg-muted"
            }`}
          >
            Markdown
          </button>
          <button
            onClick={() => setExportFormat("html")}
            className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
              exportFormat === "html"
                ? "bg-primary/10 text-primary border border-primary/20"
                : "border border-border text-muted-foreground hover:text-foreground hover:bg-muted"
            }`}
          >
            HTML
          </button>
          <button
            onClick={() => setExportFormat("pdf")}
            className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
              exportFormat === "pdf"
                ? "bg-primary/10 text-primary border border-primary/20"
                : "border border-border text-muted-foreground hover:text-foreground hover:bg-muted"
            }`}
          >
            PDF
          </button>
        </div>
      </div>

      <div className="p-3 rounded-md border border-border bg-muted/10">
        <p className="text-xs text-muted-foreground">
          Exporting <strong className="text-foreground">{filteredPages.length} pages</strong>
          {exportFormat === "md" ? " as Markdown" : " as HTML"}
          {selectedColId !== "__all" && (
            <> from <strong className="text-foreground">{collections.find((c) => c.id === selectedColId)?.name || "Uncategorized"}</strong></>
          )}
        </p>
        <div className="mt-2 max-h-32 overflow-y-auto space-y-0.5">
          {filteredPages.slice(0, 20).map((p) => (
            <div key={p.id} className="flex items-center gap-2 text-[10px] text-muted-foreground">
              <FileText className="h-3 w-3 shrink-0" />
              <span className="truncate">{p.title}</span>
              {p.collection_id && (
                <span className="text-muted-foreground/40 shrink-0">{collections.find((c) => c.id === p.collection_id)?.name}</span>
              )}
            </div>
          ))}
          {filteredPages.length > 20 && (
            <p className="text-[10px] text-muted-foreground/50 pt-1">...and {filteredPages.length - 20} more</p>
          )}
        </div>
      </div>

      <button
        onClick={handleBulkExport}
        disabled={exporting || filteredPages.length === 0}
        className="w-full h-9 rounded-md text-xs font-medium bg-primary text-white hover:bg-primary/90 disabled:opacity-50 flex items-center justify-center gap-2 transition-colors"
      >
        {exporting ? (
          <><Loader2 className="h-3.5 w-3.5 animate-spin" /> Exporting...</>
        ) : (
          <><Download className="h-3.5 w-3.5" /> Export ZIP ({filteredPages.length} pages)</>
        )}
      </button>
    </div>
  );
}
