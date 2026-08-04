import { Trash2, FileText, Loader2, X } from 'lucide-react';
import { timeAgo } from '../lib/utils';
import { Page } from '../lib/api';

interface TrashDialogProps {
  trashPages: Page[];
  trashLoading: boolean;
  onClose: () => void;
  onRestore: (id: string) => Promise<void>;
  onPermanentDelete: (id: string) => Promise<void>;
  onEmptyTrash: () => Promise<void>;
}

export function TrashDialog({
  trashPages,
  trashLoading,
  onClose,
  onRestore,
  onPermanentDelete,
  onEmptyTrash,
}: TrashDialogProps) {
  return (
    <div
      className="dialog-overlay fixed inset-0 z-50 flex items-center justify-center bg-black/60"
      onClick={onClose}
    >
      <div
        className="dialog-container w-full max-w-lg mx-4 p-5 rounded-xl border border-border bg-card shadow-2xl max-h-[80vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-semibold flex items-center gap-2">
            <Trash2 className="h-4 w-4 text-red-400" /> Trash
          </h3>
          <button
            onClick={onClose}
            aria-label="Close dialog"
            className="p-1 rounded hover:bg-muted"
          >
            <X aria-hidden="true" className="h-4 w-4" />
          </button>
        </div>
        {trashLoading ? (
          <div className="py-8 text-center text-xs text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin mx-auto mb-2" /> Loading...
          </div>
        ) : trashPages.length === 0 ? (
          <div className="py-8 text-center text-xs text-muted-foreground">Trash is empty</div>
        ) : (
          <>
            <div className="space-y-1 mb-4">
              {trashPages.map((p) => (
                <div
                  key={p.id}
                  className="flex items-center gap-2 px-3 py-2 rounded-md border border-border hover:bg-muted/30 transition-colors"
                >
                  <FileText className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                  <span className="text-xs truncate flex-1">{p.title}</span>
                  <span className="text-[10px] text-muted-foreground/60 shrink-0">
                    {timeAgo(p.deleted_at)}
                  </span>
                  <button
                    onClick={() => onRestore(p.id)}
                    className="p-1 rounded text-xs text-primary hover:bg-primary/10 shrink-0"
                  >
                    Restore
                  </button>
                  <button
                    onClick={() => onPermanentDelete(p.id)}
                    className="p-1 rounded text-xs text-red-400 hover:bg-red-500/10 shrink-0"
                  >
                    Delete
                  </button>
                </div>
              ))}
            </div>
            <button
              onClick={onEmptyTrash}
              className="w-full py-2 rounded-md text-xs font-medium text-red-400 hover:bg-red-500/10 transition-colors border border-red-500/20"
            >
              Empty trash
            </button>
          </>
        )}
      </div>
    </div>
  );
}
