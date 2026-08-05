import { describe, it, expect } from 'vitest';
import {
  normalizeSortMode,
  sortPages,
  groupPagesByCollection,
  buildCollectionTree,
  isActivePage,
  pageIdFromPath,
  buildPaletteItems,
  COLLECTION_SORT_KEY,
} from '../hooks/appLayoutUtils';
import type { Page, Collection } from '../lib/api';

function makePage(overrides: Partial<Page> & { id: string }): Page {
  return {
    title: 'Title',
    slug: 'title',
    content: '',
    text_content: '',
    collection_id: '',
    parent_page_id: '',
    status: 'published',
    icon: '',
    color: '',
    full_width: false,
    is_pinned: false,
    is_template: false,
    template_id: '',
    sort_order: 0,
    created_by: 'u1',
    updated_by: 'u1',
    created_at: 100,
    updated_at: 100,
    published_at: 100,
    deleted_at: null,
    direction: 'ltr',
    ...overrides,
  };
}

function makeCollection(overrides: Partial<Collection> & { id: string }): Collection {
  return {
    name: overrides.name ?? 'C',
    slug: overrides.slug ?? (overrides.id || 'c'),
    description: '',
    icon: '',
    color: '',
    parent_id: '',
    sort_order: 0,
    created_by: 'u1',
    created_at: 100,
    updated_at: 100,
    ...overrides,
  };
}

describe('normalizeSortMode', () => {
  it('returns valid modes unchanged', () => {
    expect(normalizeSortMode('title-asc')).toBe('title-asc');
    expect(normalizeSortMode('updated-desc')).toBe('updated-desc');
    expect(normalizeSortMode('manual')).toBe('manual');
  });

  it('falls back to manual for unknown/garbage values', () => {
    expect(normalizeSortMode('bogus')).toBe('manual');
    expect(normalizeSortMode(undefined)).toBe('manual');
    expect(normalizeSortMode('')).toBe('manual');
  });

  it('exposes the localStorage key used by the hook', () => {
    expect(COLLECTION_SORT_KEY).toBe('sw_collection_sort_modes');
  });
});

describe('sortPages', () => {
  const a = makePage({ id: 'a', title: 'Alpha', sort_order: 2, created_at: 300, updated_at: 300 });
  const b = makePage({ id: 'b', title: 'beta', sort_order: 0, created_at: 100, updated_at: 500 });
  const c = makePage({ id: 'c', title: 'Charlie', sort_order: 1, created_at: 200, updated_at: 100 });

  it('manual sort uses sort_order ascending', () => {
    expect(sortPages([a, b, c], 'manual').map((p) => p.id)).toEqual(['b', 'c', 'a']);
  });

  it('title-asc is case-insensitive via localeCompare', () => {
    expect(sortPages([b, a, c], 'title-asc').map((p) => p.id)).toEqual(['a', 'b', 'c']);
  });

  it('title-desc reverses', () => {
    expect(sortPages([a, b, c], 'title-desc').map((p) => p.id)).toEqual(['c', 'b', 'a']);
  });

  it('created-asc / created-desc', () => {
    expect(sortPages([a, c, b], 'created-asc').map((p) => p.id)).toEqual(['b', 'c', 'a']);
    expect(sortPages([a, c, b], 'created-desc').map((p) => p.id)).toEqual(['a', 'c', 'b']);
  });

  it('updated-asc / updated-desc', () => {
    expect(sortPages([a, b, c], 'updated-asc').map((p) => p.id)).toEqual(['c', 'a', 'b']);
    expect(sortPages([a, b, c], 'updated-desc').map((p) => p.id)).toEqual(['b', 'a', 'c']);
  });

  it('pinned pages float to the top regardless of mode', () => {
    const pinned = makePage({ id: 'p', title: 'Pinned', is_pinned: true, sort_order: 9 });
    expect(sortPages([a, b, pinned], 'manual').map((p) => p.id)).toEqual(['p', 'b', 'a']);
    expect(sortPages([a, b, pinned], 'title-desc').map((p) => p.id)).toEqual(['p', 'b', 'a']);
  });

  it('does not mutate the input array', () => {
    const input = [a, b, c];
    const out = sortPages(input, 'title-asc');
    expect(out).not.toBe(input);
    expect(input.map((p) => p.id)).toEqual(['a', 'b', 'c']);
  });
});

describe('groupPagesByCollection', () => {
  const p1 = makePage({ id: 'p1', collection_id: 'c1' });
  const p2 = makePage({ id: 'p2', collection_id: 'c2' });
  const p3 = makePage({ id: 'p3', collection_id: '' });
  const p4 = makePage({ id: 'p4', collection_id: 'c1', status: 'deleted' });

  it('groups by collection_id and maps empty to uncategorized', () => {
    const out = groupPagesByCollection([p1, p2, p3, p4], {});
    expect(Object.keys(out).sort()).toEqual(['c1', 'c2', 'uncategorized']);
    expect(out.c1.map((p) => p.id)).toEqual(['p1']);
    expect(out.uncategorized.map((p) => p.id)).toEqual(['p3']);
  });

  it('excludes deleted pages', () => {
    const out = groupPagesByCollection([p1, p4], {});
    expect(out.c1.map((p) => p.id)).toEqual(['p1']);
  });

  it('applies per-collection sort modes', () => {
    const x = makePage({ id: 'x', collection_id: 'c1', title: 'Zulu', sort_order: 0 });
    const y = makePage({ id: 'y', collection_id: 'c1', title: 'Alpha', sort_order: 1 });
    const out = groupPagesByCollection([x, y], { c1: 'title-asc' });
    expect(out.c1.map((p) => p.id)).toEqual(['y', 'x']);
  });

  it('applies the optional filter before grouping', () => {
    const out = groupPagesByCollection([p1, p2], {}, (p) => p.id === 'p1');
    expect(Object.keys(out)).toEqual(['c1']);
  });
});

describe('buildCollectionTree', () => {
  const root1 = makeCollection({ id: 'r1', name: 'Root 1', sort_order: 2 });
  const root2 = makeCollection({ id: 'r2', name: 'Root 2', sort_order: 1 });
  const child = makeCollection({ id: 'ch', name: 'Child', parent_id: 'r1', sort_order: 1 });
  const grand = makeCollection({ id: 'gr', name: 'Grand', parent_id: 'ch', sort_order: 0 });

  it('sorts root collections by sort_order', () => {
    const tree = buildCollectionTree([root1, root2]);
    expect(tree.map((c) => c.id)).toEqual(['r2', 'r1']);
  });

  it('nests children recursively and sorts them', () => {
    const tree = buildCollectionTree([root1, child, grand]);
    expect(tree[0].id).toBe('r1');
    expect(tree[0].children.map((c) => c.id)).toEqual(['ch']);
    expect(tree[0].children[0].children.map((c) => c.id)).toEqual(['gr']);
  });

  it('ignores orphan children whose parent is missing', () => {
    const tree = buildCollectionTree([child]);
    expect(tree).toHaveLength(0);
  });

  it('keeps parent_id intact on nodes', () => {
    const tree = buildCollectionTree([root1, child]);
    expect(tree[0].children[0].parent_id).toBe('r1');
  });
});

describe('isActivePage / pageIdFromPath', () => {
  it('matches exact and nested paths', () => {
    expect(isActivePage('/page/abc', 'abc')).toBe(true);
    expect(isActivePage('/page/abc/edit', 'abc')).toBe(true);
    expect(isActivePage('/page/abc/history', 'abc')).toBe(true);
  });

  it('rejects other pages and non-page routes', () => {
    expect(isActivePage('/page/xyz', 'abc')).toBe(false);
    expect(isActivePage('/', 'abc')).toBe(false);
  });

  it('extracts page id including edit routes', () => {
    expect(pageIdFromPath('/page/abc')).toBe('abc');
    expect(pageIdFromPath('/page/abc/edit')).toBe('abc');
    expect(pageIdFromPath('/')).toBe('');
    expect(pageIdFromPath('/admin')).toBe('');
  });
});

describe('buildPaletteItems', () => {
  const pages = [
    makePage({ id: 'p1', title: 'Alpha Page', status: 'draft' }),
    makePage({ id: 'p2', title: 'Beta Page', status: 'published', collection_id: 'c1' }),
    makePage({ id: 'p3', title: 'Gone Page', status: 'deleted' }),
  ];
  const collections = [makeCollection({ id: 'c1', name: 'Docs', icon: '📘' })];
  const label = (id: string) => (id === 'c1' ? 'Docs' : '');

  it('lists non-deleted pages first, then collections, then actions when empty query', () => {
    const items = buildPaletteItems(pages, collections, '', label);
    const types = items.map((i) => i.type);
    expect(types.filter((t) => t === 'page')).toHaveLength(2);
    expect(types.filter((t) => t === 'collection')).toHaveLength(1);
    expect(types.filter((t) => t === 'action').length).toBeGreaterThan(0);
    expect(items[0]).toMatchObject({ type: 'page', label: 'Alpha Page', subtitle: 'Draft' });
    expect(items[1]).toMatchObject({ type: 'page', label: 'Beta Page', subtitle: 'Docs' });
    expect(items[2]).toMatchObject({ type: 'collection', label: 'Docs', subtitle: '📘 Collection' });
  });

  it('excludes deleted pages', () => {
    const items = buildPaletteItems(pages, collections, '', label);
    expect(items.filter((i) => i.id === 'p3')).toHaveLength(0);
  });

  it('filters pages and collections by case-insensitive query; actions match by label', () => {
    const items = buildPaletteItems(pages, collections, 'alpha', label);
    expect(items.map((i) => i.label)).toEqual(['Alpha Page']);
    const actionItems = buildPaletteItems(pages, collections, 'trash', label);
    expect(actionItems.map((i) => i.label)).toEqual(['Trash']);
  });

  it('action set is stable and complete', () => {
    const items = buildPaletteItems(pages, collections, '', label);
    const actionLabels = items.filter((i) => i.type === 'action').map((i) => i.label);
    expect(actionLabels).toContain('New page');
    expect(actionLabels).toContain('New collection');
    expect(actionLabels).toContain('Admin panel');
    expect(actionLabels).toContain('Favorites');
  });
});
