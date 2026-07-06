import { useState, useCallback } from "react";
import { api } from "../lib/api";
import { useToast } from "../components/Toast";

export function useBatchSelect(onRefresh: () => void) {
  const [selectedPageIds, setSelectedPageIds] = useState<Set<string>>(new Set());
  const [batchTagOpen, setBatchTagOpen] = useState(false);
  const [batchTagName, setBatchTagName] = useState("");
  const [batchTagValue, setBatchTagValue] = useState("");
  const [batchMoveOpen, setBatchMoveOpen] = useState(false);
  const { addToast } = useToast();

  const togglePageSelection = useCallback((pageId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    setSelectedPageIds(prev => {
      const next = new Set(prev);
      if (next.has(pageId)) next.delete(pageId);
      else next.add(pageId);
      return next;
    });
  }, []);

  const clearSelection = useCallback(() => setSelectedPageIds(new Set()), []);

  const handlePageClick = useCallback((pageId: string, e: React.MouseEvent, navigate: (path: string) => void) => {
    if (e.metaKey || e.ctrlKey) {
      togglePageSelection(pageId, e);
      return;
    }
    if (selectedPageIds.size > 0) clearSelection();
    navigate(`/page/${pageId}`);
  }, [selectedPageIds.size, togglePageSelection, clearSelection]);

  const handleBatchArchive = useCallback(async () => {
    if (selectedPageIds.size === 0) return;
    if (!confirm(`Archive ${selectedPageIds.size} page(s)?`)) return;
    await api.pages.batchSetStatus(Array.from(selectedPageIds), "archived");
    clearSelection();
    onRefresh();
    addToast({ type: "success", title: `Archived ${selectedPageIds.size} page(s)`, duration: 3000 });
  }, [selectedPageIds, clearSelection, onRefresh, addToast]);

  const handleBatchDelete = useCallback(async () => {
    if (selectedPageIds.size === 0) return;
    if (!confirm(`Move ${selectedPageIds.size} page(s) to trash?`)) return;
    await api.pages.batchSetStatus(Array.from(selectedPageIds), "deleted");
    clearSelection();
    onRefresh();
    addToast({ type: "success", title: `Moved ${selectedPageIds.size} page(s) to trash`, duration: 3000 });
  }, [selectedPageIds, clearSelection, onRefresh, addToast]);

  const handleBatchMove = useCallback(async (newColId: string) => {
    if (selectedPageIds.size === 0) return;
    await api.pages.batchMove(Array.from(selectedPageIds), newColId);
    setBatchMoveOpen(false);
    clearSelection();
    onRefresh();
    addToast({ type: "success", title: `Moved ${selectedPageIds.size} page(s)`, duration: 3000 });
  }, [selectedPageIds, clearSelection, onRefresh, addToast]);

  const handleBatchTag = useCallback(async () => {
    if (selectedPageIds.size === 0 || !batchTagName.trim()) return;
    await api.pages.batchAddTag(Array.from(selectedPageIds), batchTagName.trim(), batchTagValue.trim());
    setBatchTagOpen(false);
    setBatchTagName("");
    setBatchTagValue("");
    clearSelection();
    onRefresh();
    addToast({ type: "success", title: `Tagged ${selectedPageIds.size} page(s)`, duration: 3000 });
  }, [selectedPageIds, batchTagName, batchTagValue, clearSelection, onRefresh, addToast]);

  return {
    selectedPageIds, setSelectedPageIds,
    batchTagOpen, setBatchTagOpen,
    batchTagName, setBatchTagName,
    batchTagValue, setBatchTagValue,
    batchMoveOpen, setBatchMoveOpen,
    togglePageSelection, clearSelection, handlePageClick,
    handleBatchArchive, handleBatchDelete, handleBatchMove, handleBatchTag,
  };
}
