import { useState, useEffect, useRef } from 'react';
import { Filter, X, Calendar, Folder, User, Tags as TagsIcon, RotateCcw } from 'lucide-react';
import { cn } from '../lib/utils';
import { api, Collection } from '../lib/api';

export interface SearchFilterState {
  collectionId: string;
  authorId: string;
  dateFrom: string;
  dateTo: string;
  tags: string;
}

export const EMPTY_FILTERS: SearchFilterState = {
  collectionId: '',
  authorId: '',
  dateFrom: '',
  dateTo: '',
  tags: '',
};

interface Props {
  filters: SearchFilterState;
  onChange: (filters: SearchFilterState) => void;
}

export function SearchFilters({ filters, onChange }: Props) {
  const [open, setOpen] = useState(false);
  const [collections, setCollections] = useState<Collection[]>([]);
  const [users, setUsers] = useState<{ id: string; name: string; email: string }[]>([]);
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    api.collections
      .list()
      .then(setCollections)
      .catch(() => {});
    api.users
      .list()
      .then(setUsers)
      .catch(() => {});
  }, []);

  // Close on click outside
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    if (open) document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  const hasActiveFilters =
    filters.collectionId || filters.authorId || filters.dateFrom || filters.dateTo || filters.tags;

  const activeCount = [
    filters.collectionId,
    filters.authorId,
    filters.dateFrom || filters.dateTo,
    filters.tags,
  ].filter(Boolean).length;

  const update = (key: keyof SearchFilterState, value: string) => {
    onChange({ ...filters, [key]: value });
  };

  return (
    <div className="relative" ref={panelRef}>
      <button
        onClick={() => setOpen(!open)}
        className={cn(
          'flex items-center gap-1.5 w-full px-2 py-1.5 rounded-md text-xs transition-colors',
          hasActiveFilters
            ? 'bg-primary/10 text-primary font-medium'
            : 'text-muted-foreground hover:text-foreground hover:bg-muted/50',
        )}
      >
        <Filter className="h-3.5 w-3.5 shrink-0" />
        <span>Filters</span>
        {activeCount > 0 && (
          <span className="ml-auto flex items-center justify-center w-4 h-4 rounded-full bg-primary/20 text-[10px] font-bold">
            {activeCount}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute left-0 top-full mt-1 z-50 w-72 p-3 rounded-xl border border-border bg-card shadow-xl space-y-3">
          {/* Header */}
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold">Search filters</span>
            <button
              onClick={() => {
                onChange(EMPTY_FILTERS);
                setOpen(false);
              }}
              className="flex items-center gap-1 text-[10px] text-muted-foreground hover:text-foreground transition-colors"
            >
              <RotateCcw className="h-3 w-3" /> Clear all
            </button>
          </div>

          {/* Collection filter */}
          <div>
            <label
              htmlFor="filter-collection"
              className="flex items-center gap-1 text-[10px] text-muted-foreground/60 font-semibold uppercase tracking-wider mb-1.5"
            >
              <Folder className="h-3 w-3" /> Collection
            </label>
            <select
              id="filter-collection"
              value={filters.collectionId}
              onChange={(e) => update('collectionId', e.target.value)}
              className="w-full h-8 px-2 rounded-md border border-border bg-[#0a0a0a] text-xs text-foreground focus:outline-hidden focus:ring-1 focus:ring-primary/50"
            >
              <option value="">All collections</option>
              {collections.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.icon || '📁'} {c.name}
                </option>
              ))}
            </select>
          </div>

          {/* Author filter */}
          <div>
            <label
              htmlFor="filter-author"
              className="flex items-center gap-1 text-[10px] text-muted-foreground/60 font-semibold uppercase tracking-wider mb-1.5"
            >
              <User className="h-3 w-3" /> Author
            </label>
            <select
              id="filter-author"
              value={filters.authorId}
              onChange={(e) => update('authorId', e.target.value)}
              className="w-full h-8 px-2 rounded-md border border-border bg-[#0a0a0a] text-xs text-foreground focus:outline-hidden focus:ring-1 focus:ring-primary/50"
            >
              <option value="">All authors</option>
              {users.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.name || u.email}
                </option>
              ))}
            </select>
          </div>

          {/* Date range */}
          <div>
            <label className="flex items-center gap-1 text-[10px] text-muted-foreground/60 font-semibold uppercase tracking-wider mb-1.5">
              <Calendar className="h-3 w-3" /> Updated date
            </label>
            <div className="flex items-center gap-2">
              <input
                type="date"
                value={filters.dateFrom}
                onChange={(e) => update('dateFrom', e.target.value)}
                placeholder="From"
                className="flex-1 h-8 px-2 rounded-md border border-border bg-[#0a0a0a] text-xs text-foreground focus:outline-hidden focus:ring-1 focus:ring-primary/50"
              />
              <span className="text-[10px] text-muted-foreground/60">—</span>
              <input
                type="date"
                value={filters.dateTo}
                onChange={(e) => update('dateTo', e.target.value)}
                placeholder="To"
                className="flex-1 h-8 px-2 rounded-md border border-border bg-[#0a0a0a] text-xs text-foreground focus:outline-hidden focus:ring-1 focus:ring-primary/50"
              />
            </div>
          </div>

          {/* Tag filter */}
          <div>
            <label className="flex items-center gap-1 text-[10px] text-muted-foreground/60 font-semibold uppercase tracking-wider mb-1.5">
              <TagsIcon className="h-3 w-3" /> Tags
            </label>
            <input
              type="text"
              value={filters.tags}
              onChange={(e) => update('tags', e.target.value)}
              placeholder="important, meeting, draft"
              className="w-full h-8 px-2 rounded-md border border-border bg-[#0a0a0a] text-xs text-foreground placeholder:text-muted-foreground/50 focus:outline-hidden focus:ring-1 focus:ring-primary/50"
            />
            <p className="text-[9px] text-muted-foreground/40 mt-1">
              Comma-separated. Filters pages matching ANY of these tags.
            </p>
          </div>

          {/* Active filter chips */}
          {hasActiveFilters && (
            <div className="flex flex-wrap gap-1.5 pt-1 border-t border-border">
              {filters.collectionId && (
                <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-primary/10 text-[10px] text-primary">
                  {collections.find((c) => c.id === filters.collectionId)?.name || 'Collection'}
                  <button
                    onClick={() => update('collectionId', '')}
                    aria-label="Remove collection filter"
                    className="hover:text-primary/80"
                  >
                    <X className="h-2.5 w-2.5" />
                  </button>
                </span>
              )}
              {filters.authorId && (
                <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-primary/10 text-[10px] text-primary">
                  {users.find((u) => u.id === filters.authorId)?.name || 'Author'}
                  <button
                    onClick={() => update('authorId', '')}
                    aria-label="Remove author filter"
                    className="hover:text-primary/80"
                  >
                    <X className="h-2.5 w-2.5" />
                  </button>
                </span>
              )}
              {(filters.dateFrom || filters.dateTo) && (
                <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-primary/10 text-[10px] text-primary">
                  Date
                  <button
                    onClick={() => {
                      onChange({ ...filters, dateFrom: '', dateTo: '' });
                    }}
                    aria-label="Remove date filter"
                    className="hover:text-primary/80"
                  >
                    <X className="h-2.5 w-2.5" />
                  </button>
                </span>
              )}
              {filters.tags && (
                <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-primary/10 text-[10px] text-primary">
                  <TagsIcon className="h-2.5 w-2.5" /> {filters.tags}
                  <button
                    onClick={() => update('tags', '')}
                    aria-label="Remove tags filter"
                    className="hover:text-primary/80"
                  >
                    <X className="h-2.5 w-2.5" />
                  </button>
                </span>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
