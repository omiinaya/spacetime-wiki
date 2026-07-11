import { useState, useCallback } from 'react';
import { api, Collection } from '../lib/api';

export function useCollectionManagement(
  collections: Collection[],
  collectionSortModes: Record<string, string>,
  userId: string | null,
  refreshData: () => Promise<void>,
  addToast: (t: { type: string; title: string; message?: string; duration?: number }) => void,
  navigate: (path: string) => void,
  saveCollectionSortMode: (colId: string, mode: string, autoApply?: boolean) => void,
) {
  const [colDialogOpen, setColDialogOpen] = useState(false);
  const [editingCol, setEditingCol] = useState<Collection | null>(null);
  const [colName, setColName] = useState('');
  const [colDesc, setColDesc] = useState('');
  const [colIcon, setColIcon] = useState('');
  const [colColor, setColColor] = useState('');
  const [colSortMode, setColSortMode] = useState('manual');
  const [colAutoApply, setColAutoApply] = useState(false);

  const openCreateCol = useCallback(() => {
    setEditingCol(null);
    setColName('');
    setColDesc('');
    setColIcon('📁');
    setColColor('');
    setColSortMode('manual');
    setColAutoApply(false);
    setColDialogOpen(true);
  }, []);

  const openEditCol = useCallback(
    async (col: Collection) => {
      setEditingCol(col);
      setColName(col.name);
      setColDesc(col.description);
      setColIcon(col.icon || '📁');
      setColColor(col.color);
      setColSortMode(collectionSortModes[col.id] || 'manual');
      setColAutoApply(false);
      // Load server-side sort rule if available
      try {
        const rule = await api.collections.sortRules.get(col.id);
        if (rule) {
          const mode =
            rule.sort_field === 'manual' ? 'manual' : rule.sort_field + '-' + rule.sort_direction;
          setColSortMode(mode);
          setColAutoApply(rule.auto_apply);
        }
      } catch {
        /* ignore */
      }
      setColDialogOpen(true);
    },
    [collectionSortModes],
  );

  const saveCollection = useCallback(async () => {
    if (!colName.trim()) return;
    try {
      if (editingCol) {
        await api.collections.update(editingCol.id, colName, colDesc, colIcon, colColor);
        saveCollectionSortMode(editingCol.id, colSortMode, colAutoApply);
        addToast({ type: 'success', title: 'Collection updated', duration: 3000 });
      } else {
        await api.collections.create(
          colName,
          colDesc,
          '',
          colIcon,
          colColor,
          userId || 'anonymous',
        );
        addToast({ type: 'success', title: 'Collection created', duration: 3000 });
      }
      setColDialogOpen(false);
      await refreshData();
    } catch (err) {
      addToast({
        type: 'error',
        title: 'Failed to save collection',
        message: String(err),
        duration: 5000,
      });
    }
  }, [
    colName,
    editingCol,
    colDesc,
    colIcon,
    colColor,
    colSortMode,
    colAutoApply,
    userId,
    saveCollectionSortMode,
    refreshData,
    addToast,
  ]);

  const deleteCollection = useCallback(
    async (id: string) => {
      if (!confirm('Archive this collection and all its pages?')) return;
      await api.collections.delete(id);
      await refreshData();
      addToast({ type: 'success', title: 'Collection archived', duration: 3000 });
    },
    [refreshData, addToast],
  );

  return {
    colDialogOpen,
    setColDialogOpen,
    editingCol,
    colName,
    setColName,
    colDesc,
    setColDesc,
    colIcon,
    setColIcon,
    colColor,
    setColColor,
    colSortMode,
    setColSortMode,
    colAutoApply,
    setColAutoApply,
    openCreateCol,
    openEditCol,
    saveCollection,
    deleteCollection,
  };
}
