import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useTrash } from '../hooks/useTrash';
import type { Page } from '../lib/api';

const mockListDeleted = vi.fn();
const mockRestore = vi.fn();
const mockDelete = vi.fn();
const mockEmptyTrash = vi.fn();
vi.mock('../lib/api', () => ({
  api: {
    pages: {
      listDeleted: (...a: unknown[]) => mockListDeleted(...a),
      restore: (...a: unknown[]) => mockRestore(...a),
      delete: (...a: unknown[]) => mockDelete(...a),
      emptyTrash: (...a: unknown[]) => mockEmptyTrash(...a),
    },
  },
}));

import { useTrash as importedUseTrash } from '../hooks/useTrash';

function page(id: string, title: string): Page {
  return {
    id,
    title,
    slug: id,
    content: '',
    text_content: '',
    collection_id: '',
    parent_page_id: '',
    status: 'deleted',
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
    published_at: 0,
    deleted_at: 1700000,
    direction: 'ltr',
  };
}

describe('useTrash', () => {
  const navigate = vi.fn();
  const refreshData = vi.fn().mockResolvedValue(undefined);
  const addToast = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    mockListDeleted.mockResolvedValue([page('p1', 'Old'), page('p2', 'Older')]);
    mockRestore.mockResolvedValue(undefined);
    mockDelete.mockResolvedValue(undefined);
    mockEmptyTrash.mockResolvedValue(undefined);
    vi.spyOn(window, 'confirm').mockReturnValue(true);
  });

  function setup() {
    return renderHook(() => importedUseTrash(navigate, refreshData, addToast));
  }

  it('loadTrashPage loads deleted pages and navigates to /trash', async () => {
    const { result } = setup();
    await act(async () => {
      await result.current.loadTrashPage();
    });
    expect(mockListDeleted).toHaveBeenCalled();
    expect(result.current.trashPages).toHaveLength(2);
    expect(result.current.trashLoading).toBe(false);
    expect(navigate).toHaveBeenCalledWith('/trash');
  });

  it('loadTrashPage navigates even on failure', async () => {
    mockListDeleted.mockRejectedValue(new Error('nope'));
    const { result } = setup();
    await act(async () => {
      await result.current.loadTrashPage();
    });
    expect(navigate).toHaveBeenCalledWith('/trash');
    expect(result.current.trashLoading).toBe(false);
  });

  it('restorePage removes from list, refreshes, toasts with title', async () => {
    const { result } = setup();
    await act(async () => {
      await result.current.loadTrashPage();
    });
    await act(async () => {
      await result.current.restorePage('p1');
    });
    expect(mockRestore).toHaveBeenCalledWith('p1');
    expect(result.current.trashPages.map((p) => p.id)).toEqual(['p2']);
    expect(refreshData).toHaveBeenCalled();
    expect(addToast).toHaveBeenCalledWith(
      expect.objectContaining({ title: 'Page restored', message: 'Old' }),
    );
  });

  it('permanentDelete confirms, deletes, removes from list, refreshes', async () => {
    const { result } = setup();
    await act(async () => {
      await result.current.loadTrashPage();
    });
    await act(async () => {
      await result.current.permanentDelete('p1');
    });
    expect(mockDelete).toHaveBeenCalledWith('p1');
    expect(result.current.trashPages.map((p) => p.id)).toEqual(['p2']);
    expect(refreshData).toHaveBeenCalled();
    expect(addToast).toHaveBeenCalledWith(
      expect.objectContaining({ title: 'Page permanently deleted' }),
    );
  });

  it('permanentDelete skips when confirm is cancelled', async () => {
    vi.spyOn(window, 'confirm').mockReturnValue(false);
    const { result } = setup();
    await act(async () => {
      await result.current.loadTrashPage();
    });
    await act(async () => {
      await result.current.permanentDelete('p1');
    });
    expect(mockDelete).not.toHaveBeenCalled();
    expect(refreshData).not.toHaveBeenCalled();
  });

  it('emptyTrash confirms, empties list, refreshes, toasts', async () => {
    const { result } = setup();
    await act(async () => {
      await result.current.loadTrashPage();
    });
    await act(async () => {
      await result.current.emptyTrash();
    });
    expect(mockEmptyTrash).toHaveBeenCalled();
    expect(result.current.trashPages).toHaveLength(0);
    expect(refreshData).toHaveBeenCalled();
    expect(addToast).toHaveBeenCalledWith(expect.objectContaining({ title: 'Trash emptied' }));
  });

  it('emptyTrash skips when confirm is cancelled', async () => {
    vi.spyOn(window, 'confirm').mockReturnValue(false);
    const { result } = setup();
    await act(async () => {
      await result.current.emptyTrash();
    });
    expect(mockEmptyTrash).not.toHaveBeenCalled();
    expect(refreshData).not.toHaveBeenCalled();
  });
});
