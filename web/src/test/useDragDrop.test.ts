import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useDragDrop } from '../hooks/useDragDrop';
import type { Page, Collection } from '../lib/api';

const mockReorder = vi.fn();
const mockMove = vi.fn();
vi.mock('../lib/api', () => ({
  api: {
    collections: { reorder: (...a: unknown[]) => mockReorder(...a) },
    pages: { move: (...a: unknown[]) => mockMove(...a) },
  },
}));

import { useDragDrop as importedUseDragDrop } from '../hooks/useDragDrop';

function col(id: string, name: string, parentId = '', sortOrder = 0): Collection {
  return {
    id,
    name,
    slug: id,
    description: '',
    parent_id: parentId,
    icon: '📁',
    color: '',
    sort_order: sortOrder,
    created_by: 'u1',
    created_at: 1700000,
    updated_at: 1700000,
  };
}

function page(id: string, title: string, collectionId: string): Page {
  return {
    id,
    title,
    slug: id,
    content: '',
    text_content: '',
    collection_id: collectionId,
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
  };
}

const collections = [
  col('col_c1', 'Docs', '', 0),
  col('col_c2', 'Manual', '', 1),
  col('col_c3', 'Sub', 'col_c1', 0),
  col('col_c4', 'Sub2', 'col_c1', 1),
];
const pages = [page('p1', 'Alpha', 'col_c1'), page('p2', 'Beta', 'col_c2')];

describe('useDragDrop', () => {
  const onRefresh = vi.fn();

  function dragEvent(data: Record<string, string> = {}) {
    const store = new Map<string, string>();
    for (const [k, v] of Object.entries(data)) store.set(k, v);
    return {
      preventDefault: vi.fn(),
      dataTransfer: {
        effectAllowed: '',
        dropEffect: '',
        setData: (k: string, v: string) => store.set(k, v),
        getData: (k: string) => store.get(k) || '',
      },
    } as unknown as React.DragEvent;
  }

  beforeEach(() => {
    vi.clearAllMocks();
    mockReorder.mockResolvedValue(undefined);
    mockMove.mockResolvedValue(undefined);
  });

  function setup() {
    return renderHook(() => importedUseDragDrop(collections, pages, onRefresh));
  }

  it('handleDragStart sets the page id and dataTransfer', () => {
    const { result } = setup();
    const e = dragEvent();
    act(() => result.current.handleDragStart(e, 'p1'));
    expect(result.current.dragPageId).toBe('p1');
    expect(e.dataTransfer.effectAllowed).toBe('move');
  });

  it('handleDragEnd clears all drag state', () => {
    const { result } = setup();
    act(() => result.current.handleDragStart(dragEvent(), 'p1'));
    act(() => result.current.handleDragOver(dragEvent(), 'p2'));
    act(() => result.current.handleDragEnd());
    expect(result.current.dragPageId).toBeNull();
    expect(result.current.dragColId).toBeNull();
    expect(result.current.dragOverTarget).toBeNull();
  });

  it('handleDragOver sets the target page id', () => {
    const { result } = setup();
    act(() => result.current.handleDragOver(dragEvent(), 'p2'));
    expect(result.current.dragOverTarget).toBe('p2');
  });

  it('dropping a page on a collection moves it', async () => {
    const { result } = setup();
    act(() => result.current.handleDragStart(dragEvent(), 'p1'));
    await act(async () => {
      await result.current.handleDropOnCollection(dragEvent({ 'text/plain': 'p1' }), 'col_c2');
    });
    expect(mockMove).toHaveBeenCalledWith('p1', 'col_c2', '');
    expect(result.current.dragPageId).toBeNull();
    expect(onRefresh).toHaveBeenCalled();
  });

  it('dropping a collection reorders siblings under the same parent', async () => {
    const { result } = setup();
    act(() => result.current.handleColDragStart(dragEvent(), 'col_c3'));
    await act(async () => {
      await result.current.handleDropOnCollection(dragEvent({ 'text/plain': 'col_c3' }), 'col_c4');
    });
    // c3 and c4 share parent c1; dropping c3 onto c4 => [c4, c3]
    expect(mockReorder).toHaveBeenCalledWith(['col_c4', 'col_c3']);
    expect(onRefresh).toHaveBeenCalled();
  });

  it('dropping a collection on itself is a no-op', async () => {
    const { result } = setup();
    await act(async () => {
      await result.current.handleDropOnCollection(dragEvent({ 'text/plain': 'col_c2' }), 'col_c2');
    });
    expect(mockReorder).not.toHaveBeenCalled();
    expect(mockMove).not.toHaveBeenCalled();
  });

  it('dropping a page on a page moves it under the target page', async () => {
    const { result } = setup();
    act(() => result.current.handleDragStart(dragEvent(), 'p1'));
    await act(async () => {
      await result.current.handleDropOnPage(dragEvent({ 'text/plain': 'p1' }), 'p2');
    });
    expect(mockMove).toHaveBeenCalledWith('p1', 'col_c2', 'p2');
    expect(onRefresh).toHaveBeenCalled();
  });

  it('dropping a page on itself is a no-op', async () => {
    const { result } = setup();
    await act(async () => {
      await result.current.handleDropOnPage(dragEvent({ 'text/plain': 'p1' }), 'p1');
    });
    expect(mockMove).not.toHaveBeenCalled();
  });

  it('movePageToCollection moves a page and refreshes', async () => {
    const { result } = setup();
    await act(async () => {
      await result.current.movePageToCollection('p1', 'col_c2');
    });
    expect(mockMove).toHaveBeenCalledWith('p1', 'col_c2', '');
    expect(onRefresh).toHaveBeenCalled();
  });
});
