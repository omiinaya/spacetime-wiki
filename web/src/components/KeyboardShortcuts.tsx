import { createPortal } from 'react-dom';
import { X, Command, Keyboard } from 'lucide-react';

interface ShortcutGroup {
  title: string;
  shortcuts: { keys: string; label: string }[];
}

const SHORTCUTS: ShortcutGroup[] = [
  {
    title: 'Global',
    shortcuts: [
      { keys: '⌘K / Ctrl+K', label: 'Command palette' },
      { keys: '?', label: 'Keyboard shortcuts (this)' },
      { keys: '⌘S / Ctrl+S', label: 'Save page' },
    ],
  },
  {
    title: 'Navigation',
    shortcuts: [
      { keys: '⌘B / Ctrl+B', label: 'Bold' },
      { keys: '⌘I / Ctrl+I', label: 'Italic' },
      { keys: '⌘U / Ctrl+U', label: 'Underline' },
      { keys: '⌘Shift+X', label: 'Strikethrough' },
      { keys: '⌘Alt+1', label: 'Heading 1' },
      { keys: '⌘Alt+2', label: 'Heading 2' },
      { keys: '⌘Alt+3', label: 'Heading 3' },
      { keys: '⌘Shift+8', label: 'Bullet list' },
      { keys: '⌘Shift+7', label: 'Ordered list' },
      { keys: '⌘Shift+B', label: 'Blockquote' },
      { keys: '⌘Alt+C', label: 'Code block' },
    ],
  },
  {
    title: 'Slash Commands',
    shortcuts: [
      { keys: '/', label: 'Open slash command menu' },
      { keys: '↑ ↓', label: 'Navigate commands' },
      { keys: '↵', label: 'Select command' },
      { keys: 'esc', label: 'Close menu' },
    ],
  },
  {
    title: 'Emoji Picker',
    shortcuts: [
      { keys: ':word', label: 'Type `:` followed by name' },
      { keys: '↑ ↓', label: 'Navigate emoji' },
      { keys: '↵ / space', label: 'Insert selected emoji' },
      { keys: 'esc', label: 'Close picker' },
    ],
  },
  {
    title: 'Mentions',
    shortcuts: [
      { keys: '@', label: 'Open mention menu' },
      { keys: '↑ ↓', label: 'Navigate suggestions' },
      { keys: '↵', label: 'Insert mention' },
    ],
  },
];

interface KeyboardShortcutsProps {
  open: boolean;
  onClose: () => void;
}

export function KeyboardShortcuts({ open, onClose }: KeyboardShortcutsProps) {
  if (!open) return null;

  return createPortal(
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60"
      onClick={onClose}
    >
      <div
        className="w-full max-w-lg rounded-xl border border-border bg-card shadow-2xl max-h-[80vh] flex flex-col"
        role="dialog"
        aria-modal="true"
        aria-label="Keyboard shortcuts"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 h-12 border-b border-border shrink-0">
          <h3 className="text-sm font-semibold flex items-center gap-2">
            <Keyboard className="h-4 w-4 text-muted-foreground" />
            Keyboard Shortcuts
          </h3>
          <button
            onClick={onClose}
            className="p-1 rounded text-muted-foreground hover:text-foreground hover:bg-muted"
            aria-label="Close keyboard shortcuts"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4 space-y-5">
          {SHORTCUTS.map((group) => (
            <div key={group.title}>
              <h4 className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider mb-2">
                {group.title}
              </h4>
              <div className="space-y-1">
                {group.shortcuts.map((s) => (
                  <div key={s.label} className="flex items-center justify-between py-1">
                    <span className="text-xs text-muted-foreground">{s.label}</span>
                    <kbd className="px-1.5 py-0.5 rounded bg-muted text-[10px] font-mono text-muted-foreground whitespace-nowrap">
                      {s.keys}
                    </kbd>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-4 h-9 border-t border-border text-[10px] text-muted-foreground shrink-0">
          <span>5 shortcut groups</span>
          <span>
            Press <kbd className="px-1 py-0.5 rounded bg-muted font-mono">?</kbd> to toggle
          </span>
        </div>
      </div>
    </div>,
    document.body,
  );
}
