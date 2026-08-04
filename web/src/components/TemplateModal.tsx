import { LayoutTemplate, X } from 'lucide-react';
import { Page } from '../lib/api';

interface TemplateModalProps {
  open: boolean;
  onClose: () => void;
  templates: Page[];
  selectedTemplate: string;
  onSelectTemplate: (id: string, title: string) => void;
  newPageTitle: string;
  onNewPageTitleChange: (v: string) => void;
  onCreateFromTemplate: () => Promise<void>;
  createDisabled: boolean;
}

export function TemplateModal({
  open,
  onClose,
  templates,
  selectedTemplate,
  onSelectTemplate,
  newPageTitle,
  onNewPageTitleChange,
  onCreateFromTemplate,
  createDisabled,
}: TemplateModalProps) {
  if (!open) return null;

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
            <LayoutTemplate className="h-4 w-4 text-purple-400" /> New from template
          </h3>
          <button
            onClick={onClose}
            aria-label="Close dialog"
            className="p-1 rounded hover:bg-muted"
          >
            <X aria-hidden="true" className="h-4 w-4" />
          </button>
        </div>
        {templates.length === 0 ? (
          <div className="py-8 text-center text-xs text-muted-foreground">
            No templates yet. Save any page as a template first!
          </div>
        ) : (
          <>
            <div className="grid grid-cols-2 gap-2 mb-4">
              {templates.map((t) => (
                <button
                  key={t.id}
                  onClick={() => onSelectTemplate(t.id, t.title)}
                  className={`p-3 rounded-lg border text-left transition-colors ${selectedTemplate === t.id ? 'border-purple-500 bg-purple-500/10' : 'border-border hover:bg-muted/50'}`}
                >
                  <p className="text-xs font-medium truncate">
                    {t.icon || '📄'} {t.title}
                  </p>
                  <p className="text-[10px] text-muted-foreground/60 mt-0.5 truncate">
                    {t.text_content?.slice(0, 60) || 'No content'}
                  </p>
                </button>
              ))}
            </div>
            {selectedTemplate && (
              <div className="space-y-2 pt-3 border-t border-border">
                <input
                  value={newPageTitle}
                  onChange={(e) => onNewPageTitleChange(e.target.value)}
                  placeholder="New page title"
                  autoFocus
                  className="w-full h-8 px-3 rounded-md border border-border bg-[#0a0a0a] text-xs focus:outline-hidden focus:ring-1 focus:ring-primary/50"
                />
                <button
                  onClick={onCreateFromTemplate}
                  disabled={createDisabled}
                  className="w-full h-8 rounded-md text-xs font-medium bg-primary text-white hover:bg-primary/90 disabled:opacity-50"
                >
                  Create from template
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
