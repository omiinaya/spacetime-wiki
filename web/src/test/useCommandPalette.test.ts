import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useCommandPalette } from '../hooks/useCommandPalette';
import type { Page, Collection } from '../lib/api';

const pages: Page[] = [
  {
    id: 'p1',
    title: 'Alpha Docs',
    slug: 'alpha',
    content: '',
    text_content: '',
    collection_id: 'c1',
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
    created_at: 1700000,
    updated_at: 1700000,
    published_at: 1700000,
    deleted_at: null,
    direction: 'ltr',
  },
  {
    id: 'p2',
    title: 'Beta Manual',
    slug: 'beta',
    content: '',
    text_content: '',
    collection_id: 'c2',
    parent_page_id: '',
    status: 'draft',
    icon: '',
    color: '',
    full_width: false,
    is_pinned: false,
    is_template: false,
    template_id: '',
    sort_order: 1,
    created_by: 'u2',
    updated_by: 'u2',
    created_at: 1701000,
    updated_at: 1701000,
    published_at: 0,
    deleted_at: null,
    direction: 'ltr',
  },
  {
    id: 'p3',
    title: 'Gone Page',
    slug: 'gone',
    content: '',
    text_content: '',
    collection_id: 'c1',
    parent_page_id: '',
    status: 'deleted',
    icon: '',
    color: '',
    full_width: false,
    is_pinned: false,
    is_template: false,
    template_id: '',
    sort_order: 2,
    created_by: 'u1',
    updated_by: 'u1',
    created_at: 1702000,
    updated_at: 1702000,
    published_at: 0,
    deleted_at: 1702000,
    direction: 'ltr',
  },
];

const collections: Collection[] = [
  {
    id: 'c1',
    name: 'Docs',
    slug: 'docs',
    description: '',
    parent_id: '',
    icon: '📚',
    color: '',
    sort_order: 0,
    created_by: 'u1',
    created_at: 1700000,
    updated_at: 1700000,
  },
  {
    id: 'c2',
    name: 'Manual',
    slug: 'manual',
    description: '',
    parent_id: '',
    icon: '📗',
    color: '',
    sort_order: 1,
    created_by: 'u2',
    created_at: 1701000,
    updated_at: 1701000,
  },
];

describe('useCommandPalette', () => {
  const navigate = vi.fn();
  const openCreateCol = vi.fn();
  const toggleCollection = vi.fn();
  const closePalette = vi.fn();
  const setTemplatePickerOpen = vi.fn();
  const setShortcutsOpen = vi.fn();
  const setTheme = vi.fn();

  function setup(query = '') {
    const hook = renderHook(() =>
      useCommandPalette(
        pages,
        collections,
        navigate,
        'dark',
        openCreateCol,
        toggleCollection,
        closePalette,
        setTemplatePickerOpen,
        setShortcutsOpen,
        setTheme,
      ),
    );
    if (query) act(() => hook.result.current.setPaletteQuery(query));
    return hook;
  }

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('empty query returns pages (non-deleted), collections, and all actions (capped at 15)', () => {
    const { result } = setup();
    const items = result.current.paletteItems;
    expect(items.length).toBeLessThanOrEqual(15);
    // both live pages present
    expect(items.some((i) => i.type === 'page' && i.id === 'p1')).toBe(true);
    expect(items.some((i) => i.type === 'page' && i.id === 'p2')).toBe(true);
    // deleted page excluded
    expect(items.some((i) => i.type === 'page' && i.id === 'p3')).toBe(false);
    // collections present
    expect(items.some((i) => i.type === 'collection' && i.id === 'c1')).toBe(true);
    // actions present
    expect(items.some((i) => i.type === 'action' && i.label === 'New page')).toBe(true);
    expect(items.some((i) => i.type === 'action' && i.label === 'Toggle dark mode')).toBe(true);
  });

  it('filters pages and collections by query text', () => {
    const { result } = setup('beta');
    const items = result.current.paletteItems;
    expect(items.some((i) => i.type === 'page' && i.id === 'p2')).toBe(true);
    expect(items.some((i) => i.type === 'page' && i.id === 'p1')).toBe(false);
    // 'Manual' collection matches 'beta'? no — but 'Beta' page does. 'Manual' collection also has 'man'... no.
    expect(items.some((i) => i.type === 'collection' && i.id === 'c2')).toBe(false);
  });

  it('matches collections by name', () => {
    const { result } = setup('docs');
    expect(result.current.paletteItems.some((i) => i.type === 'collection' && i.id === 'c1')).toBe(
      true,
    );
  });

  it('collection items carry the icon prefix in subtitle', () => {
    const { result } = setup('docs');
    const item = result.current.paletteItems.find((i) => i.type === 'collection' && i.id === 'c1');
    expect(item?.subtitle).toContain('Collection');
  });

  it('page action navigates to the page', () => {
    const { result } = setup('alpha');
    const item = result.current.paletteItems.find((i) => i.type === 'page' && i.id === 'p1');
    act(() => item?.action());
    expect(navigate).toHaveBeenCalledWith('/page/p1');
  });

  it('collection action navigates home and toggles the collection', () => {
    const { result } = setup('docs');
    const item = result.current.paletteItems.find((i) => i.type === 'collection' && i.id === 'c1');
    act(() => item?.action());
    expect(navigate).toHaveBeenCalledWith('/');
    expect(toggleCollection).toHaveBeenCalledWith('c1');
  });

  it('New page action closes palette and navigates to /new', () => {
    const { result } = setup();
    const item = result.current.paletteItems.find(
      (i) => i.type === 'action' && i.label === 'New page',
    );
    act(() => item?.action());
    expect(closePalette).toHaveBeenCalled();
    expect(navigate).toHaveBeenCalledWith('/new');
  });

  it('New collection action closes palette and opens create dialog', () => {
    const { result } = setup();
    const item = result.current.paletteItems.find(
      (i) => i.type === 'action' && i.label === 'New collection',
    );
    act(() => item?.action());
    expect(closePalette).toHaveBeenCalled();
    expect(openCreateCol).toHaveBeenCalled();
  });

  it('Admin panel action navigates to /admin', () => {
    const { result } = setup('admin');
    const item = result.current.paletteItems.find(
      (i) => i.type === 'action' && i.label === 'Admin panel',
    );
    act(() => item?.action());
    expect(navigate).toHaveBeenCalledWith('/admin');
  });

  it('Toggle dark mode action flips the theme', () => {
    const { result } = setup();
    const item = result.current.paletteItems.find(
      (i) => i.type === 'action' && i.label === 'Toggle dark mode',
    );
    act(() => item?.action());
    expect(setTheme).toHaveBeenCalledWith('light');
  });

  it('executePalette runs the action at the given index', () => {
    const { result } = setup('alpha');
    const idx = result.current.paletteItems.findIndex((i) => i.type === 'page' && i.id === 'p1');
    act(() => result.current.executePalette(idx));
    expect(closePalette).toHaveBeenCalled();
    expect(navigate).toHaveBeenCalledWith('/page/p1');
  });

  it('executePalette is a no-op for an out-of-range index', () => {
    const { result } = setup();
    act(() => result.current.executePalette(999));
    expect(closePalette).not.toHaveBeenCalled();
  });

  it('setPaletteIndex updates the cursor', () => {
    const { result } = setup();
    act(() => result.current.setPaletteIndex(3));
    expect(result.current.paletteIndex).toBe(3);
  });
});
