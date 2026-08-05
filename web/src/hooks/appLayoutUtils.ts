import type { Page, Collection } from '../lib/api';

/**
 * Pure derived-data helpers for the app layout.
 *
 * Extracted from useAppLayout so the grouping/sorting/tree logic can be unit
 * tested without React, subscriptions, or STDB. useAppLayout imports these
 * and feeds them live state.
 */

export type CollectionSortMode =
  | 'manual'
  | 'title-asc'
  | 'title-desc'
  | 'created-asc'
  | 'created-desc'
  | 'updated-asc'
  | 'updated-desc';

export const COLLECTION_SORT_KEY = 'sw_collection_sort_modes';

/** Map a stored sort mode string to a valid CollectionSortMode. */
export function normalizeSortMode(mode: string | undefined): CollectionSortMode {
  switch (mode) {
    case 'title-asc':
    case 'title-desc':
    case 'created-asc':
    case 'created-desc':
    case 'updated-asc':
    case 'updated-desc':
      return mode;
    default:
      return 'manual';
  }
}

/** Sort pages within a single collection bucket by mode then manual order. */
export function sortPages(
  pages: Page[],
  mode: CollectionSortMode,
): Page[] {
  return [...pages].sort((a, b) => {
    if (a.is_pinned && !b.is_pinned) return -1;
    if (!a.is_pinned && b.is_pinned) return 1;
    if (mode === 'title-asc') return a.title.localeCompare(b.title);
    if (mode === 'title-desc') return b.title.localeCompare(a.title);
    if (mode === 'created-asc') return a.created_at - b.created_at;
    if (mode === 'created-desc') return b.created_at - a.created_at;
    if (mode === 'updated-asc') return a.updated_at - b.updated_at;
    if (mode === 'updated-desc') return b.updated_at - a.updated_at;
    return a.sort_order - b.sort_order;
  });
}

/**
 * Group non-deleted pages by collection id ('uncategorized' for empty
 * collection_id), apply per-collection sort modes, and return insertion-order
 * buckets. Mirrors useAppLayout's pagesByCollection computed value.
 */
export function groupPagesByCollection(
  pages: Page[],
  sortModes: Record<string, string>,
  filter?: (page: Page) => boolean,
): Record<string, Page[]> {
  const byCol: Record<string, Page[]> = {};
  for (const page of pages) {
    if (page.status === 'deleted') continue;
    if (filter && !filter(page)) continue;
    const cid = page.collection_id || 'uncategorized';
    if (!byCol[cid]) byCol[cid] = [];
    byCol[cid].push(page);
  }
  for (const cid of Object.keys(byCol)) {
    byCol[cid] = sortPages(byCol[cid], normalizeSortMode(sortModes[cid]));
  }
  return byCol;
}

/**
 * Build a nested collection tree from a flat collection list. Root children
 * have parent_id === '' ; children sort by sort_order. Mirrors useAppLayout's
 * collectionTree computed value.
 */
export function buildCollectionTree(
  collections: Collection[],
): (Collection & { children: (Collection & { children: Collection[] })[] })[] {
  const colChildren = new Map<string, Collection[]>();
  for (const col of collections) {
    const parentId = col.parent_id || '';
    if (!colChildren.has(parentId)) colChildren.set(parentId, []);
    colChildren.get(parentId)!.push(col);
  }
  const getTree = (parentId: string): (Collection & { children: Collection[] })[] => {
    return (colChildren.get(parentId) || [])
      .sort((a, b) => a.sort_order - b.sort_order)
      .map((col) => ({ ...col, children: getTree(col.id) }));
  };
  return getTree('');
}

/** True when the given pathname matches the page (with optional /edit suffix). */
export function isActivePage(pathname: string, pageId: string): boolean {
  return (
    pathname === `/page/${pageId}` || pathname.startsWith(`/page/${pageId}`)
  );
}

/** Extract the current page id from a pathname ('' when not a page route). */
export function pageIdFromPath(pathname: string): string {
  return pathname.match(/^\/page\/([^\/]+)(?:\/edit)?$/)?.[1] || '';
}

export interface PaletteItemData {
  type: 'page' | 'collection' | 'action';
  id?: string;
  label: string;
  subtitle: string;
  shortcut?: string;
}

export type PalettePageItem = PaletteItemData & { type: 'page'; id: string };
export type PaletteCollectionItem = PaletteItemData & { type: 'collection'; id: string };

/**
 * Compute the palette item list (data only — no action callbacks, which the
 * hook attaches to real handlers). Mirrors useAppLayout's paletteItems.
 */
export function buildPaletteItems(
  pages: Page[],
  collections: Collection[],
  query: string,
  collectionLabel: (colId: string) => string,
): PaletteItemData[] {
  const q = query.toLowerCase();
  const items: PaletteItemData[] = [];

  for (const p of pages) {
    if (p.status === 'deleted') continue;
    if (q !== '' && !p.title.toLowerCase().includes(q)) continue;
    const statusLabel =
      p.status === 'draft' ? 'Draft' : p.status === 'archived' ? 'Archived' : '';
    items.push({
      type: 'page',
      id: p.id,
      label: p.title,
      subtitle: `${statusLabel} ${collectionLabel(p.collection_id)}`.trim(),
    });
  }

  for (const c of collections) {
    if (q !== '' && !c.name.toLowerCase().includes(q)) continue;
    items.push({
      type: 'collection',
      id: c.id,
      label: c.name,
      subtitle: `${c.icon || '📁'} Collection`,
    });
  }

  const actions: PaletteItemData[] = [
    { type: 'action', label: 'New page', subtitle: 'Create a new document' },
    { type: 'action', label: 'New collection', subtitle: 'Create a new collection' },
    { type: 'action', label: 'New template', subtitle: 'Save current page as a template' },
    { type: 'action', label: 'Admin panel', subtitle: 'Manage users, groups, settings' },
    { type: 'action', label: 'Trash', subtitle: 'View deleted pages' },
    { type: 'action', label: 'Favorites', subtitle: 'Show starred pages' },
    { type: 'action', label: 'Activity', subtitle: 'View recent wiki activity' },
  ];
  if (q === '' || actions.some((a) => a.label.toLowerCase().includes(q))) {
    items.push(...actions.filter((a) => q === '' || a.label.toLowerCase().includes(q)));
  }

  return items;
}
