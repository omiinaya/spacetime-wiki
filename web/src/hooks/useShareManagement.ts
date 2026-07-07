import { useState, useCallback } from "react";
import { api } from "../lib/api";

export function useShareManagement(userId: string | null) {
  const [shareDialog, setShareDialog] = useState<{ pageId: string; pageTitle: string } | null>(null);
  const [sharePassword, setSharePassword] = useState("");
  const [shareDays, setShareDays] = useState(0);
  const [shareUrl, setShareUrl] = useState("");
  const [shareLinks, setShareLinks] = useState<
    { id: string; token: string; expires_at: number; visit_count: number; password_hash: string; brand_title: string | null; brand_logo_url: string | null }[]
  >([]);
  const [shareLoading, setShareLoading] = useState(false);
  const [editBrandShareId, setEditBrandShareId] = useState<string | null>(null);
  const [editBrandTitle, setEditBrandTitle] = useState("");
  const [editBrandLogoUrl, setEditBrandLogoUrl] = useState("");

  const openShareDialog = useCallback(async (pageId: string, pageTitle: string) => {
    setShareLoading(true);
    try {
      const links = await api.shareLinks.list(pageId);
      setShareLinks(links);
    } catch { /* noop */ }
    setShareDialog({ pageId, pageTitle });
    setSharePassword("");
    setShareDays(0);
    setShareUrl("");
    setShareLoading(false);
  }, []);

  const createShare = useCallback(async () => {
    if (!shareDialog) return;
    try {
      const result = await api.shareLinks.create(shareDialog.pageId, sharePassword, userId || "anon", shareDays);
      const host = window.location.host;
      setShareUrl(`http://${host}/shared/${result.token}`);
      const links = await api.shareLinks.list(shareDialog.pageId);
      setShareLinks(links);
    } catch (e) { alert(String(e)); }
  }, [shareDialog, sharePassword, userId, shareDays]);

  const deleteShare = useCallback(async (linkId: string) => {
    await api.shareLinks.delete(linkId);
    if (shareDialog) {
      const links = await api.shareLinks.list(shareDialog.pageId);
      setShareLinks(links);
    }
  }, [shareDialog]);

  const updateShareBranding = useCallback(async (shareId: string) => {
    try {
      await api.shareLinks.updateBranding(shareId, editBrandTitle || null, editBrandLogoUrl || null);
      setEditBrandShareId(null);
      if (shareDialog) {
        const links = await api.shareLinks.list(shareDialog.pageId);
        setShareLinks(links);
      }
    } catch (e) { alert(String(e)); }
  }, [editBrandTitle, editBrandLogoUrl, shareDialog]);

  const openBrandingEditor = useCallback((share: { id: string; brand_title: string | null; brand_logo_url: string | null }) => {
    setEditBrandShareId(share.id);
    setEditBrandTitle(share.brand_title || "");
    setEditBrandLogoUrl(share.brand_logo_url || "");
  }, []);

  return {
    shareDialog, setShareDialog,
    sharePassword, setSharePassword,
    shareDays, setShareDays,
    shareUrl,
    shareLinks,
    shareLoading,
    editBrandShareId, setEditBrandShareId,
    editBrandTitle, setEditBrandTitle,
    editBrandLogoUrl, setEditBrandLogoUrl,
    openShareDialog,
    createShare,
    deleteShare,
    updateShareBranding,
    openBrandingEditor,
  };
}
