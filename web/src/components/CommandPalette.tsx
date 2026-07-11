import { Search, FileText, BookOpen } from 'lucide-react';
import { cn } from '../lib/utils';

interface PaletteItem {
  type: 'page' | 'collection' | 'action';
  id?: string;
  label: string;
  subtitle: string;
  icon: React.ReactNode;
  action: () => void;
  shortcut?: string;
}

interface CommandPaletteProps {
  open: boolean;
  query: string;
  onQueryChange: (v: string) => void;
  index: number;
  items: PaletteItem[];
  onExecute: (idx: number) => void;
  onClose: () => void;
}

export function CommandPalette({
  open,
  query,
  onQueryChange,
  index,
  items,
  onExecute,
  onClose,
}: CommandPaletteProps) {
  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center pt-[15vh] bg-black/60"
      onClick={onClose}
    >
      <div
        className="w-full max-w-xl rounded-xl border border-border bg-card shadow-2xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center gap-3 px-4 h-12 border-b border-border">
          <Search className="h-4 w-4 text-muted-foreground shrink-0" />
          <input
            type="text"
            value={query}
            onChange={(e) => {
              onQueryChange(e.target.value);
            }}
            placeholder="Search pages, collections, or actions..."
            autoFocus
            className="flex-1 h-full bg-transparent text-sm text-foreground placeholder:text-muted-foreground/50 outline-hidden border-none"
          />
          <kbd className="px-1.5 py-0.5 rounded bg-muted text-[10px] text-muted-foreground font-mono">
            esc
          </kbd>
        </div>
        <div className="max-h-[50vh] overflow-y-auto">
          {items.length === 0 && (
            <div className="px-4 py-6 text-center text-xs text-muted-foreground">
              No results for &quot;{query}&quot;
            </div>
          )}
          {items.map((item, i) => (
            <button
              key={item.type + (item.id || item.label)}
              onClick={() => onExecute(i)}
              className={cn(
                'w-full flex items-center gap-3 px-4 py-2.5 text-left transition-colors',
                i === index ? 'bg-primary/10' : 'hover:bg-muted/50',
              )}
            >
              <span className="text-muted-foreground shrink-0">{item.icon}</span>
              <div className="min-w-0 flex-1">
                <div className="text-sm font-medium truncate">{item.label}</div>
                <div className="text-[11px] text-muted-foreground">{item.subtitle}</div>
              </div>
              {item.type === 'page' && (
                <span className="text-[10px] text-muted-foreground/50">Page</span>
              )}
              {item.type === 'collection' && (
                <span className="text-[10px] text-muted-foreground/50">Collection</span>
              )}
              {item.shortcut && (
                <kbd className="hidden sm:inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[10px] font-mono bg-muted/50 text-muted-foreground/60 border border-border/50">
                  {item.shortcut}
                </kbd>
              )}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-4 px-4 h-9 border-t border-border text-[10px] text-muted-foreground">
          <span>↑↓ navigate</span>
          <span>↵ open</span>
          <span>esc close</span>
        </div>
      </div>
    </div>
  );
}
