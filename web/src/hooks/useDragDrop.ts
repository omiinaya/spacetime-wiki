import { useState, useCallback } from "react";
import { api, Page, Collection } from "../lib/api";

export function useDragDrop(collections: Collection[], pages: Page[], onRefresh: () => void) {
  const [dragPageId, setDragPageId] = useState<string | null>(null);
  const [dragColId, setDragColId] = useState<string | null>(null);
  const [dragOverTarget, setDragOverTarget] = useState<string | null>(null);

  const handleDragStart = useCallback((e: React.DragEvent, pageId: string) => {
    setDragPageId(pageId);
    e.dataTransfer.effectAllowed = "move";
    e.dataTransfer.setData("text/plain", pageId);
  }, []);

  const handleColDragStart = useCallback((e: React.DragEvent, colId: string) => {
    setDragColId(colId);
    e.dataTransfer.effectAllowed = "move";
    e.dataTransfer.setData("text/plain", colId);
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent, pageId?: string) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
    if (pageId && pageId !== dragOverTarget) setDragOverTarget(pageId);
  }, [dragOverTarget]);

  const handleDragLeave = useCallback(() => setDragOverTarget(null), []);

  const handleDragEnd = useCallback(() => {
    setDragPageId(null);
    setDragColId(null);
    setDragOverTarget(null);
  }, []);

  const handleDropOnCollection = useCallback(async (e: React.DragEvent, colId: string) => {
    e.preventDefault();
    const droppedId = e.dataTransfer.getData("text/plain") || dragPageId || dragColId;
    if (!droppedId || droppedId === colId) { setDragColId(null); return; }

    if (droppedId.startsWith("col_")) {
      setDragColId(null);
      const droppedCol = collections.find(c => c.id === droppedId);
      const targetCol = collections.find(c => c.id === colId);
      if (!droppedCol || !targetCol) return;
      const parentId = droppedCol.parent_id || "";
      const siblings = collections
        .filter(c => (c.parent_id || "") === parentId)
        .sort((a, b) => a.sort_order - b.sort_order);
      const newOrder = siblings.filter(c => c.id !== droppedId);
      const targetIdx = newOrder.findIndex(c => c.id === colId);
      newOrder.splice(targetIdx + 1, 0, droppedCol);
      await api.collections.reorder(newOrder.map(c => c.id));
      onRefresh();
      return;
    }
    await api.pages.move(droppedId, colId, "");
    setDragPageId(null);
    onRefresh();
  }, [collections, dragPageId, dragColId, onRefresh]);

  const handleDropOnPage = useCallback(async (e: React.DragEvent, targetPageId: string) => {
    e.preventDefault();
    const pageId = e.dataTransfer.getData("text/plain") || dragPageId;
    if (pageId && pageId !== targetPageId) {
      const colId = pages.find(p => p.id === targetPageId)?.collection_id || "";
      await api.pages.move(pageId, colId, targetPageId);
      setDragPageId(null);
      onRefresh();
    }
  }, [dragPageId, pages, onRefresh]);

  const movePageToCollection = useCallback(async (pageId: string, newColId: string) => {
    await api.pages.move(pageId, newColId, "");
    onRefresh();
  }, [onRefresh]);

  return {
    dragPageId, setDragPageId, dragColId, setDragColId,
    dragOverTarget, setDragOverTarget,
    handleDragStart, handleColDragStart,
    handleDragOver, handleDragLeave, handleDragEnd,
    handleDropOnCollection, handleDropOnPage, movePageToCollection,
  };
}
