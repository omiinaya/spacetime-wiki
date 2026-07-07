import { useState, useCallback } from "react";
import { api, Page } from "../lib/api";

export function useTrash(
  navigate: (path: string) => void,
  refreshData: () => Promise<void>,
  addToast: (t: { type: string; title: string; message?: string; duration?: number }) => void,
) {
  const [trashPages, setTrashPages] = useState<Page[]>([]);
  const [trashLoading, setTrashLoading] = useState(false);

  const loadTrashPage = useCallback(async () => {
    setTrashLoading(true);
    try {
      const deleted = await api.pages.listDeleted();
      setTrashPages(deleted);
    } catch (e) { console.error(e); }
    finally { setTrashLoading(false); }
    navigate("/trash");
  }, [navigate]);

  const restorePage = useCallback(async (id: string) => {
    await api.pages.restore(id);
    setTrashPages(prev => prev.filter(p => p.id !== id));
    await refreshData();
    const page = trashPages.find(p => p.id === id);
    addToast({ type: "success", title: "Page restored", message: page?.title, duration: 3000 });
  }, [trashPages, refreshData, addToast]);

  const permanentDelete = useCallback(async (id: string) => {
    if (!confirm("Permanently delete this page? This cannot be undone.")) return;
    await api.pages.delete(id);
    setTrashPages(prev => prev.filter(p => p.id !== id));
    await refreshData();
    addToast({ type: "success", title: "Page permanently deleted", duration: 3000 });
  }, [refreshData, addToast]);

  const emptyTrash = useCallback(async () => {
    if (!confirm("Permanently delete ALL pages in trash? This cannot be undone.")) return;
    await api.pages.emptyTrash();
    setTrashPages([]);
    await refreshData();
    addToast({ type: "success", title: "Trash emptied", duration: 3000 });
  }, [refreshData, addToast]);

  return {
    trashPages, trashLoading,
    loadTrashPage,
    restorePage,
    permanentDelete,
    emptyTrash,
  };
}
