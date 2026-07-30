import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { FileText, Plus, X, Loader2, LayoutTemplate, Star } from 'lucide-react';
import { api, Page, Collection } from '../lib/api';

interface TemplatePickerProps {
  open: boolean;
  onClose: () => void;
  collections: Collection[];
  userId: string | null;
  navigate: (path: string) => void;
}

export function TemplatePicker({
  open,
  onClose,
  collections,
  userId,
  navigate,
}: TemplatePickerProps) {
  const [templates, setTemplates] = useState<Page[]>([]);
  const [loading, setLoading] = useState(false);
  const [creating, setCreating] = useState(false);
  const [selectedCol, setSelectedCol] = useState('');

  useEffect(() => {
    if (!open) return;
    setLoading(true);
    setSelectedCol(collections[0]?.id || '');
    api.pages
      .listTemplates()
      .then(setTemplates)
      .catch((err) => console.error("Failed to load templates:", err))
      .finally(() => setLoading(false));
  }, [open, collections]);

  const handleCreateFromTemplate = async (template: Page) => {
    if (!userId) return;
    setCreating(true);
    try {
      const newId = await api.pages.createFromTemplate(
        template.id,
        `${template.title} (copy)`,
        selectedCol,
        userId,
      );
      onClose();
      navigate(`/page/${newId}/edit`);
    } catch (e) {
      console.error('Failed to create from template:', e);
    } finally {
      setCreating(false);
    }
  };

  const handleBlankPage = () => {
    onClose();
    navigate('/new');
  };

  if (!open) return null;

  return createPortal(
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60"
      onClick={onClose}
    >
      <div
        className="w-full max-w-lg rounded-xl border border-border bg-card shadow-2xl overflow-hidden max-h-[80vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 h-12 border-b border-border shrink-0">
          <h3 className="text-sm font-semibold flex items-center gap-2">
            <LayoutTemplate className="h-4 w-4 text-muted-foreground" />
            New page from template
          </h3>
          <button
            onClick={onClose}
            className="p-1 rounded text-muted-foreground hover:text-foreground hover:bg-muted"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Collection selector */}
        <div className="px-4 py-3 border-b border-border shrink-0">
          <label className="text-[10px] text-muted-foreground/60 font-medium mb-1 block">
            Collection
          </label>
          <select
            value={selectedCol}
            onChange={(e) => setSelectedCol(e.target.value)}
            className="w-full h-8 px-2 rounded-md border border-border bg-[#0a0a0a] text-xs focus:outline-hidden focus:ring-1 focus:ring-primary/50"
          >
            {collections.map((c) => (
              <option key={c.id} value={c.id}>
                {c.icon || '📁'} {c.name}
              </option>
            ))}
            <option value="">Uncategorized</option>
          </select>
        </div>

        {/* Template list */}
        <div className="flex-1 overflow-y-auto p-3 space-y-1">
          {/* Blank page option */}
          <button
            onClick={handleBlankPage}
            disabled={creating}
            className="w-full flex items-center gap-3 px-3 py-3 rounded-lg border border-dashed border-border bg-transparent hover:bg-muted/30 transition-colors text-left"
          >
            <span className="w-8 h-8 rounded flex items-center justify-center bg-muted shrink-0">
              <Plus className="h-4 w-4 text-muted-foreground" />
            </span>
            <div>
              <div className="text-sm font-medium text-foreground">Blank page</div>
              <div className="text-[11px] text-muted-foreground">Start with an empty document</div>
            </div>
          </button>

          {loading && (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
            </div>
          )}

          {!loading && templates.length === 0 && (
            <div className="py-8 text-center text-xs text-muted-foreground">
              <LayoutTemplate className="h-6 w-6 mx-auto mb-2 opacity-40" />
              No templates yet. Save a page as a template to use it here.
            </div>
          )}

          {!loading &&
            templates.length > 0 &&
            (() => {
              // Group templates by collection
              const grouped: Record<string, Page[]> = {};
              for (const t of templates) {
                const key = t.collection_id || '__uncategorized__';
                if (!grouped[key]) grouped[key] = [];
                grouped[key].push(t);
              }
              const colLabel = (colId: string) => {
                if (colId === '__uncategorized__') return 'Uncategorized';
                return (
                  collections.find((c) => c.id === colId)?.icon +
                    ' ' +
                    collections.find((c) => c.id === colId)?.name || colId
                );
              };
              const groupKeys = Object.keys(grouped);
              // Sort groups: uncategorized last
              groupKeys.sort((a, b) => {
                if (a === '__uncategorized__') return 1;
                if (b === '__uncategorized__') return -1;
                return (collections.find((c) => c.id === a)?.name || '').localeCompare(
                  collections.find((c) => c.id === b)?.name || '',
                );
              });
              const templateGroups = groupKeys.flatMap((key) => {
                return [
                  <div
                    key={key}
                    className="text-[10px] font-semibold text-muted-foreground/60 uppercase tracking-wider px-1 py-1.5 mt-2 first:mt-0"
                  >
                    {colLabel(key)}
                  </div>,
                  ...grouped[key].map((t) => (
                    <button
                      key={t.id}
                      onClick={() => handleCreateFromTemplate(t)}
                      disabled={creating}
                      className="w-full flex items-center gap-3 px-3 py-3 rounded-lg border border-border bg-card hover:bg-muted/50 transition-colors text-left disabled:opacity-50"
                    >
                      <span className="w-8 h-8 rounded flex items-center justify-center bg-purple-500/10 text-purple-400 shrink-0 text-base">
                        {t.icon || <LayoutTemplate className="h-4 w-4" />}
                      </span>
                      <div className="min-w-0 flex-1">
                        <div className="text-sm font-medium text-foreground truncate">
                          {t.title}
                        </div>
                        <div className="text-[11px] text-muted-foreground">
                          {collections.find((c) => c.id === t.collection_id)?.name ||
                            'No collection'}
                          {t.color && (
                            <span
                              className="ml-2 w-1.5 h-1.5 rounded-full inline-block"
                              style={{ backgroundColor: t.color }}
                            />
                          )}
                        </div>
                      </div>
                      <span className="text-[10px] text-muted-foreground/50 shrink-0">
                        Template
                      </span>
                    </button>
                  )),
                ];
              });
              return templateGroups;
            })()}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-4 h-9 border-t border-border text-[10px] text-muted-foreground shrink-0">
          <span>
            {templates.length} template{templates.length !== 1 ? 's' : ''} available
          </span>
          <span>Pick a template or start blank</span>
        </div>
      </div>
    </div>,
    document.body,
  );
}
