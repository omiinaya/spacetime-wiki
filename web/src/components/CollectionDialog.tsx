import { X } from 'lucide-react';

interface CollectionDialogProps {
  open: boolean;
  onClose: () => void;
  editingCol: { id: string; name: string; description: string; icon: string; color: string } | null;
  colName: string;
  onColNameChange: (v: string) => void;
  colDesc: string;
  onColDescChange: (v: string) => void;
  colIcon: string;
  onColIconChange: (v: string) => void;
  colColor: string;
  onColColorChange: (v: string) => void;
  colSortMode: string;
  onColSortModeChange: (v: string) => void;
  colAutoApply: boolean;
  onColAutoApplyChange: (v: boolean) => void;
  onSave: () => Promise<void>;
  saveDisabled: boolean;
}

export function CollectionDialog({
  open,
  onClose,
  editingCol,
  colName,
  onColNameChange,
  colDesc,
  onColDescChange,
  colIcon,
  onColIconChange,
  colColor,
  onColColorChange,
  colSortMode,
  onColSortModeChange,
  colAutoApply,
  onColAutoApplyChange,
  onSave,
  saveDisabled,
}: CollectionDialogProps) {
  if (!open) return null;

  return (
    <div
      className="dialog-overlay fixed inset-0 z-50 flex items-center justify-center bg-black/60"
      onClick={onClose}
    >
      <div
        className="dialog-container w-full max-w-sm p-5 rounded-xl border border-border bg-card shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <h3 className="text-sm font-semibold mb-4">
          {editingCol ? 'Edit collection' : 'New collection'}
        </h3>
        <div className="space-y-3">
          <div className="flex gap-2">
            <input
              type="text"
              value={colIcon}
              onChange={(e) => onColIconChange(e.target.value)}
              placeholder="📁"
              maxLength={4}
              className="w-12 h-9 text-center rounded-md border border-border bg-[#0a0a0a] text-sm focus:outline-hidden focus:ring-1 focus:ring-primary/50"
            />
            <input
              type="text"
              value={colName}
              onChange={(e) => onColNameChange(e.target.value)}
              placeholder="Collection name"
              autoFocus
              className="flex-1 h-9 px-3 rounded-md border border-border bg-[#0a0a0a] text-sm text-foreground placeholder:text-muted-foreground/50 focus:outline-hidden focus:ring-1 focus:ring-primary/50"
            />
          </div>
          <input
            type="text"
            value={colDesc}
            onChange={(e) => onColDescChange(e.target.value)}
            placeholder="Description (optional)"
            className="w-full h-9 px-3 rounded-md border border-border bg-[#0a0a0a] text-sm text-foreground placeholder:text-muted-foreground/50 focus:outline-hidden focus:ring-1 focus:ring-primary/50"
          />
          <input
            type="text"
            value={colColor}
            onChange={(e) => onColColorChange(e.target.value)}
            placeholder="Color (hex, optional)"
            className="w-full h-9 px-3 rounded-md border border-border bg-[#0a0a0a] text-sm text-foreground placeholder:text-muted-foreground/50 focus:outline-hidden focus:ring-1 focus:ring-primary/50"
          />
          {editingCol && (
            <div>
              <label className="text-[10px] text-muted-foreground/60 font-medium mb-1 block">
                Page sort order
              </label>
              <select
                value={colSortMode}
                onChange={(e) => onColSortModeChange(e.target.value)}
                className="w-full h-9 px-2 rounded-md border border-border bg-[#0a0a0a] text-xs text-foreground focus:outline-hidden focus:ring-1 focus:ring-primary/50"
              >
                <option value="manual">Manual (drag to reorder)</option>
                <option value="title-asc">Title A–Z</option>
                <option value="title-desc">Title Z–A</option>
                <option value="created-asc">Oldest first</option>
                <option value="created-desc">Newest first</option>
                <option value="updated-asc">Least recently updated</option>
                <option value="updated-desc">Most recently updated</option>
              </select>
              {colSortMode !== 'manual' && (
                <label className="flex items-center gap-2 mt-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={colAutoApply}
                    onChange={(e) => onColAutoApplyChange(e.target.checked)}
                    className="rounded border-border"
                  />
                  <span className="text-[10px] text-muted-foreground/80">
                    Auto-apply sort on page create/update
                  </span>
                </label>
              )}
            </div>
          )}
          <div className="flex gap-2 justify-end pt-2">
            <button
              onClick={onClose}
              className="h-8 px-3 rounded-md text-xs text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={onSave}
              disabled={saveDisabled}
              className="h-8 px-4 rounded-md text-xs font-medium bg-primary text-white hover:bg-primary/90 disabled:opacity-50 transition-colors"
            >
              {editingCol ? 'Save' : 'Create'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
