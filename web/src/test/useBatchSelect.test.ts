import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useBatchSelect } from '../hooks/useBatchSelect';

const mockAddToast = vi.fn();
vi.mock('../components/Toast', () => ({
  useToast: () => ({ addToast: mockAddToast }),
}));

const mockBatchSetStatus = vi.fn();
const mockBatchMove = vi.fn();
const mockBatchAddTag = vi.fn();
vi.mock('../lib/api', () => ({
  api: {
    pages: {
      batchSetStatus: (...args: unknown[]) => mockBatchSetStatus(...args),
      batchMove: (...args: unknown[]) => mockBatchMove(...args),
      batchAddTag: (...args: unknown[]) => mockBatchAddTag(...args),
    },
  },
}));

import { useBatchSelect as importedUseBatchSelect } from '../hooks/useBatchSelect';

describe('useBatchSelect', () => {
  const onRefresh = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    mockBatchSetStatus.mockResolvedValue(undefined);
    mockBatchMove.mockResolvedValue(undefined);
    mockBatchAddTag.mockResolvedValue(undefined);
    vi.spyOn(window, 'confirm').mockReturnValue(true);
  });

  function mouseEvent() {
    return { stopPropagation: vi.fn(), preventDefault: vi.fn() } as unknown as React.MouseEvent;
  }

  it('toggles page selection on/off', () => {
    const { result } = renderHook(() => importedUseBatchSelect(onRefresh));
    act(() => result.current.togglePageSelection('p1', mouseEvent()));
    expect(result.current.selectedPageIds.has('p1')).toBe(true);
    act(() => result.current.togglePageSelection('p1', mouseEvent()));
    expect(result.current.selectedPageIds.has('p1')).toBe(false);
  });

  it('ctrl/cmd-click toggles selection without navigating', () => {
    const { result } = renderHook(() => importedUseBatchSelect(onRefresh));
    const nav = vi.fn();
    const e = {
      metaKey: true,
      stopPropagation: vi.fn(),
      preventDefault: vi.fn(),
    } as unknown as React.MouseEvent;
    act(() => result.current.handlePageClick('p1', e, nav));
    expect(result.current.selectedPageIds.has('p1')).toBe(true);
    expect(nav).not.toHaveBeenCalled();
  });

  it('plain click navigates and clears selection', () => {
    const { result } = renderHook(() => importedUseBatchSelect(onRefresh));
    const nav = vi.fn();
    act(() => result.current.togglePageSelection('p1', mouseEvent()));
    expect(result.current.selectedPageIds.size).toBe(1);
    act(() => result.current.handlePageClick('p2', mouseEvent(), nav));
    expect(result.current.selectedPageIds.size).toBe(0);
    expect(nav).toHaveBeenCalledWith('/page/p2');
  });

  it('clearSelection empties the set', () => {
    const { result } = renderHook(() => importedUseBatchSelect(onRefresh));
    act(() => result.current.togglePageSelection('p1', mouseEvent()));
    act(() => result.current.togglePageSelection('p2', mouseEvent()));
    act(() => result.current.clearSelection());
    expect(result.current.selectedPageIds.size).toBe(0);
  });

  it('archive batches with confirm, API call, clear, refresh, toast', async () => {
    const { result } = renderHook(() => importedUseBatchSelect(onRefresh));
    act(() => result.current.togglePageSelection('p1', mouseEvent()));
    act(() => result.current.togglePageSelection('p2', mouseEvent()));
    await act(async () => {
      await result.current.handleBatchArchive();
    });
    expect(mockBatchSetStatus).toHaveBeenCalledWith(['p1', 'p2'], 'archived');
    expect(result.current.selectedPageIds.size).toBe(0);
    expect(onRefresh).toHaveBeenCalled();
    expect(mockAddToast).toHaveBeenCalledWith(
      expect.objectContaining({ title: 'Archived 2 page(s)' }),
    );
  });

  it('delete batches with confirm, API call, refresh, toast', async () => {
    const { result } = renderHook(() => importedUseBatchSelect(onRefresh));
    act(() => result.current.togglePageSelection('p1', mouseEvent()));
    await act(async () => {
      await result.current.handleBatchDelete();
    });
    expect(mockBatchSetStatus).toHaveBeenCalledWith(['p1'], 'deleted');
    expect(mockAddToast).toHaveBeenCalledWith(
      expect.objectContaining({ title: 'Moved 1 page(s) to trash' }),
    );
  });

  it('move batches to a collection', async () => {
    const { result } = renderHook(() => importedUseBatchSelect(onRefresh));
    act(() => result.current.togglePageSelection('p1', mouseEvent()));
    await act(async () => {
      await result.current.handleBatchMove('c2');
    });
    expect(mockBatchMove).toHaveBeenCalledWith(['p1'], 'c2');
    expect(result.current.batchMoveOpen).toBe(false);
    expect(mockAddToast).toHaveBeenCalledWith(
      expect.objectContaining({ title: 'Moved 1 page(s)' }),
    );
  });

  it('tag batches with name and value, resets inputs', async () => {
    const { result } = renderHook(() => importedUseBatchSelect(onRefresh));
    act(() => result.current.togglePageSelection('p1', mouseEvent()));
    act(() => result.current.setBatchTagName('priority'));
    act(() => result.current.setBatchTagValue('high'));
    await act(async () => {
      await result.current.handleBatchTag();
    });
    expect(mockBatchAddTag).toHaveBeenCalledWith(['p1'], 'priority', 'high');
    expect(result.current.batchTagName).toBe('');
    expect(result.current.batchTagValue).toBe('');
    expect(result.current.batchTagOpen).toBe(false);
  });

  it('no-op when nothing selected', async () => {
    const { result } = renderHook(() => importedUseBatchSelect(onRefresh));
    await act(async () => {
      await result.current.handleBatchArchive();
      await result.current.handleBatchDelete();
      await result.current.handleBatchMove('c2');
    });
    expect(mockBatchSetStatus).not.toHaveBeenCalled();
    expect(mockBatchMove).not.toHaveBeenCalled();
    expect(onRefresh).not.toHaveBeenCalled();
  });

  it('skips archive when confirm is cancelled', async () => {
    vi.spyOn(window, 'confirm').mockReturnValue(false);
    const { result } = renderHook(() => importedUseBatchSelect(onRefresh));
    act(() => result.current.togglePageSelection('p1', mouseEvent()));
    await act(async () => {
      await result.current.handleBatchArchive();
    });
    expect(mockBatchSetStatus).not.toHaveBeenCalled();
    expect(onRefresh).not.toHaveBeenCalled();
  });

  it('skips tag when tag name is blank', async () => {
    const { result } = renderHook(() => importedUseBatchSelect(onRefresh));
    act(() => result.current.togglePageSelection('p1', mouseEvent()));
    await act(async () => {
      await result.current.handleBatchTag();
    });
    expect(mockBatchAddTag).not.toHaveBeenCalled();
  });
});
