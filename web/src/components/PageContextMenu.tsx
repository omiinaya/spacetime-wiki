import { FileText, Edit3, Copy, Download, Link2, Code, Trash2, Pencil } from 'lucide-react';
import { Page, Collection } from '../lib/api';
import { showToast } from '../components/Toast';

interface ContextMenuState {
  x: number;
  y: number;
  colId?: string;
  pageId?: string;
}

interface PageContextMenuProps {
  contextMenu: ContextMenuState;
  onClose: () => void;
  pages: Page[];
  collections: Collection[];
  navigate: (path: string) => void;
  onDuplicate: (pageId: string) => void;
  onExportMD: (pageId: string) => void;
  onExportHTML: (pageId: string) => void;
  onEditCol: (col: Collection) => void;
  onDeleteCol: (colId: string) => void;
  onDeletePage: (pageId: string) => void;
}

export function PageContextMenu({
  contextMenu,
  onClose,
  pages,
  collections,
  navigate,
  onDuplicate,
  onExportMD,
  onExportHTML,
  onEditCol,
  onDeleteCol,
  onDeletePage,
}: PageContextMenuProps) {
  return (
    <div
      className="fixed z-50 w-48 py-1 rounded-lg border border-border bg-card shadow-xl"
      style={{
        left: Math.min(contextMenu.x, window.innerWidth - 192),
        top: Math.min(contextMenu.y, window.innerHeight - 180),
      }}
      onClick={(e) => e.stopPropagation()}
    >
      {contextMenu.pageId ? (
        <>
          <button
            onClick={() => {
              const page = pages.find((p) => p.id === contextMenu.pageId);
              if (page) navigate(`/page/${page.id}`);
              onClose();
            }}
            className="w-full flex items-center gap-2 px-3 py-1.5 text-xs hover:bg-muted transition-colors text-left"
          >
            <FileText className="h-3 w-3" /> Open
          </button>
          <button
            onClick={() => {
              const page = pages.find((p) => p.id === contextMenu.pageId);
              if (page) navigate(`/page/${page.id}/edit`);
              onClose();
            }}
            className="w-full flex items-center gap-2 px-3 py-1.5 text-xs hover:bg-muted transition-colors text-left"
          >
            <Edit3 className="h-3 w-3" /> Edit
          </button>
          <button
            onClick={() => {
              onDuplicate(contextMenu.pageId!);
              onClose();
            }}
            className="w-full flex items-center gap-2 px-3 py-1.5 text-xs hover:bg-muted transition-colors text-left"
          >
            <Copy className="h-3 w-3" /> Duplicate
          </button>
          <div className="h-px bg-border/50 mx-2 my-1" />
          <button
            onClick={() => {
              onExportMD(contextMenu.pageId!);
              onClose();
            }}
            className="w-full flex items-center gap-2 px-3 py-1.5 text-xs hover:bg-muted transition-colors text-left"
          >
            <Download className="h-3 w-3" /> Export Markdown
          </button>
          <button
            onClick={() => {
              onExportHTML(contextMenu.pageId!);
              onClose();
            }}
            className="w-full flex items-center gap-2 px-3 py-1.5 text-xs hover:bg-muted transition-colors text-left"
          >
            <Download className="h-3 w-3" /> Export HTML
          </button>
          <div className="h-px bg-border/50 mx-2 my-1" />
          <button
            onClick={() => {
              const url = `${window.location.origin}/page/${contextMenu.pageId}`;
              navigator.clipboard.writeText(url).catch((err) => console.error("API error:", err));
              onClose();
              showToast({ type: 'success', title: 'Link copied', duration: 2000 });
            }}
            className="w-full flex items-center gap-2 px-3 py-1.5 text-xs hover:bg-muted transition-colors text-left"
          >
            <Link2 className="h-3 w-3" /> Copy link
          </button>
          <button
            onClick={() => {
              const page = pages.find((p) => p.id === contextMenu.pageId);
              if (page) {
                const mdLink = `[${page.title}](${window.location.origin}/page/${page.slug || page.id})`;
                navigator.clipboard.writeText(mdLink).catch((err) => console.error("API error:", err));
                showToast({ type: 'success', title: 'Markdown link copied', duration: 2000 });
              }
              onClose();
            }}
            className="w-full flex items-center gap-2 px-3 py-1.5 text-xs hover:bg-muted transition-colors text-left"
          >
            <Code className="h-3 w-3" /> Copy as markdown link
          </button>
          <div className="h-px bg-border/50 mx-2 my-1" />
          <button
            onClick={() => {
              onClose();
              onDeletePage(contextMenu.pageId!);
            }}
            className="w-full flex items-center gap-2 px-3 py-1.5 text-xs text-red-400 hover:bg-red-500/10 transition-colors text-left"
          >
            <Trash2 className="h-3 w-3" /> Move to trash
          </button>
        </>
      ) : (
        <>
          <button
            onClick={() => {
              const col = collections.find((c) => c.id === contextMenu.colId);
              if (col) onEditCol(col);
            }}
            className="w-full flex items-center gap-2 px-3 py-1.5 text-xs hover:bg-muted transition-colors text-left"
          >
            <Pencil className="h-3 w-3" /> Edit collection
          </button>
          <button
            onClick={() => onDeleteCol(contextMenu.colId!)}
            className="w-full flex items-center gap-2 px-3 py-1.5 text-xs text-red-400 hover:bg-red-500/10 transition-colors text-left"
          >
            <Trash2 className="h-3 w-3" /> Delete collection
          </button>
        </>
      )}
    </div>
  );
}
