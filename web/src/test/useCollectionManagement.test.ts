import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useCollectionManagement } from '../hooks/useCollectionManagement';
import type { Collection } from '../lib/api';

const mockSortRulesGet = vi.fn();
const mockCollectionUpdate = vi.fn();
const mockCollectionCreate = vi.fn();
const mockCollectionDelete = vi.fn();
vi.mock('../lib/api', () => ({
  api: {
    collections: {
      sortRules: { get: (...a: unknown[]) => mockSortRulesGet(...a) },
      update: (...a: unknown[]) => mockCollectionUpdate(...a),
      create: (...a: unknown[]) => mockCollectionCreate(...a),
      delete: (...a: unknown[]) => mockCollectionDelete(...a),
    },
  },
}));

import { useCollectionManagement as importedUseCollectionManagement } from '../hooks/useCollectionManagement';

const col: Collection = {
  id: 'c1',
  name: 'Docs',
  slug: 'docs',
  description: 'repo',
  parent_id: '',
  icon: '📚',
  color: 'blue',
  sort_order: 0,
  created_by: 'u1',
  created_at: 1700000,
  updated_at: 1700000,
};

describe('useCollectionManagement', () => {
  const refreshData = vi.fn().mockResolvedValue(undefined);
  const addToast = vi.fn();
  const navigate = vi.fn();
  const saveCollectionSortMode = vi.fn();

  function setup(overrides: Partial<Parameters<typeof importedUseCollectionManagement>> = {}) {
    return renderHook(() =>
      importedUseCollectionManagement(
        overrides.collections ?? [col],
        overrides.collectionSortModes ?? {},
        overrides.userId ?? 'u1',
        overrides.refreshData ?? refreshData,
        overrides.addToast ?? addToast,
        overrides.navigate ?? navigate,
        overrides.saveCollectionSortMode ?? saveCollectionSortMode,
      ),
    );
  }

  beforeEach(() => {
    vi.clearAllMocks();
    mockSortRulesGet.mockResolvedValue(null);
    mockCollectionUpdate.mockResolvedValue(undefined);
    mockCollectionCreate.mockResolvedValue(undefined);
    mockCollectionDelete.mockResolvedValue(undefined);
    vi.spyOn(window, 'confirm').mockReturnValue(true);
  });

  it('openCreateCol resets the form and opens the dialog', () => {
    const { result } = setup();
    act(() => result.current.openCreateCol());
    expect(result.current.editingCol).toBeNull();
    expect(result.current.colName).toBe('');
    expect(result.current.colIcon).toBe('📁');
    expect(result.current.colSortMode).toBe('manual');
    expect(result.current.colDialogOpen).toBe(true);
  });

  it('openEditCol populates from the collection', async () => {
    const { result } = setup();
    await act(async () => {
      await result.current.openEditCol(col);
    });
    expect(result.current.editingCol?.id).toBe('c1');
    expect(result.current.colName).toBe('Docs');
    expect(result.current.colDesc).toBe('repo');
    expect(result.current.colIcon).toBe('📚');
    expect(result.current.colDialogOpen).toBe(true);
  });

  it('openEditCol loads the server sort rule when present', async () => {
    mockSortRulesGet.mockResolvedValue({
      sort_field: 'title',
      sort_direction: 'desc',
      auto_apply: true,
    });
    const { result } = setup();
    await act(async () => {
      await result.current.openEditCol(col);
    });
    expect(mockSortRulesGet).toHaveBeenCalledWith('c1');
    expect(result.current.colSortMode).toBe('title-desc');
    expect(result.current.colAutoApply).toBe(true);
  });

  it('openEditCol falls back to manual when sort rule lookup fails', async () => {
    mockSortRulesGet.mockRejectedValue(new Error('nope'));
    const { result } = setup({ collectionSortModes: { c1: 'created_at-asc' } });
    await act(async () => {
      await result.current.openEditCol(col);
    });
    // sort mode retains the local map value (no server rule to override it)
    expect(result.current.colSortMode).toBe('created_at-asc');
    expect(result.current.colDialogOpen).toBe(true);
  });

  it('saveCollection creates a new collection and refreshes', async () => {
    const { result } = setup();
    act(() => result.current.openCreateCol());
    act(() => result.current.setColName('New Col'));
    await act(async () => {
      await result.current.saveCollection();
    });
    expect(mockCollectionCreate).toHaveBeenCalledWith('New Col', '', '', '📁', '', 'u1');
    expect(result.current.colDialogOpen).toBe(false);
    expect(refreshData).toHaveBeenCalled();
    expect(addToast).toHaveBeenCalledWith(expect.objectContaining({ title: 'Collection created' }));
  });

  it('saveCollection updates an existing collection and its sort mode', async () => {
    const { result } = setup();
    await act(async () => {
      await result.current.openEditCol(col);
    });
    act(() => result.current.setColName('Renamed'));
    act(() => result.current.setColSortMode('title-asc'));
    await act(async () => {
      await result.current.saveCollection();
    });
    expect(mockCollectionUpdate).toHaveBeenCalledWith('c1', 'Renamed', 'repo', '📚', 'blue');
    expect(saveCollectionSortMode).toHaveBeenCalledWith('c1', 'title-asc', false);
    expect(refreshData).toHaveBeenCalled();
    expect(addToast).toHaveBeenCalledWith(expect.objectContaining({ title: 'Collection updated' }));
  });

  it('saveCollection no-ops when name is blank', async () => {
    const { result } = setup();
    act(() => result.current.openCreateCol());
    await act(async () => {
      await result.current.saveCollection();
    });
    expect(mockCollectionCreate).not.toHaveBeenCalled();
  });

  it('saveCollection shows error toast on API failure', async () => {
    mockCollectionCreate.mockRejectedValue(new Error('boom'));
    const { result } = setup();
    act(() => result.current.openCreateCol());
    act(() => result.current.setColName('New Col'));
    await act(async () => {
      await result.current.saveCollection();
    });
    expect(addToast).toHaveBeenCalledWith(
      expect.objectContaining({ type: 'error', title: 'Failed to save collection' }),
    );
  });

  it('deleteCollection archives after confirm and refreshes', async () => {
    const { result } = setup();
    await act(async () => {
      await result.current.deleteCollection('c1');
    });
    expect(mockCollectionDelete).toHaveBeenCalledWith('c1');
    expect(refreshData).toHaveBeenCalled();
    expect(addToast).toHaveBeenCalledWith(
      expect.objectContaining({ title: 'Collection archived' }),
    );
  });

  it('deleteCollection skips when confirm is cancelled', async () => {
    vi.spyOn(window, 'confirm').mockReturnValue(false);
    const { result } = setup();
    await act(async () => {
      await result.current.deleteCollection('c1');
    });
    expect(mockCollectionDelete).not.toHaveBeenCalled();
    expect(refreshData).not.toHaveBeenCalled();
  });
});
