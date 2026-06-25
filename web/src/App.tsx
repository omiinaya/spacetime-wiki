import { useState, useEffect, useCallback, useRef } from "react";
import {
  BrowserRouter, Routes, Route, useNavigate, useParams, useLocation,
} from "react-router-dom";
import JSZip from "jszip";
import {
  FileText, Search, Plus, Hash, BookOpen, ChevronDown, ChevronRight, Menu, X, Library,
  MoreHorizontal, Pencil, FolderPlus, Trash2, Copy, Archive, Star, History, Edit3,
  Upload, Loader2, Shield, Link2, RefreshCw, Key, LayoutTemplate, Users, Send, Pin, Download,
} from "lucide-react";
import { api, Page, Collection, ApiKey, OidcProvider } from "./lib/api";
import { cn, timeAgo } from "./lib/utils";
import { PageEditor } from "./pages/PageEditor";
import { PageView } from "./pages/PageView";
import { SearchFilters, EMPTY_FILTERS, type SearchFilterState } from "./components/SearchFilters";
import { WebhookSettings } from "./components/WebhookSettings";

// ─── Layout ──────────────────────────────────────────────────────────────────

function AppLayout() {
  const navigate = useNavigate();
  const location = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [collections, setCollections] = useState<Collection[]>([]);
  const [pages, setPages] = useState<Page[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchFilters, setSearchFilters] = useState<SearchFilterState>(EMPTY_FILTERS);
  const [expandedCollections, setExpandedCollections] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [userId, setUserId] = useState<string | null>(null);

  // Collection dialog state
  const [colDialogOpen, setColDialogOpen] = useState(false);
  const [editingCol, setEditingCol] = useState<Collection | null>(null);
  const [colName, setColName] = useState("");
  const [colDesc, setColDesc] = useState("");
  const [colIcon, setColIcon] = useState("");
  const [colColor, setColColor] = useState("");

  // Context menu state
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number; colId: string } | null>(null);

  // Trash state
  const [trashPages, setTrashPages] = useState<Page[]>([]);
  const [trashLoading, setTrashLoading] = useState(false);

  // Admin state
  const [adminOpen, setAdminOpen] = useState(false);
  const [allUsers, setAllUsers] = useState<{ id: string; name: string; email: string; role: string }[]>([]);
  const [adminTab, setAdminTab] = useState<"users" | "groups" | "webhooks" | "sso" | "export">("users");

  // Group state
  const [groups, setGroups] = useState<{ id: string; name: string; description: string; created_by: string; created_at: number; updated_at: number }[]>([]);
  const [groupDialogOpen, setGroupDialogOpen] = useState(false);
  const [editingGroup, setEditingGroup] = useState<{ id: string; name: string; description: string } | null>(null);
  const [groupName, setGroupName] = useState("");
  const [groupDesc, setGroupDesc] = useState("");
  const [expandedGroup, setExpandedGroup] = useState<string | null>(null);
  const [groupMembers, setGroupMembers] = useState<{ id: string; group_id: string; user_id: string; role: string }[]>([]);
  const [addMemberGroupId, setAddMemberGroupId] = useState<string | null>(null);
  const [memberUserId, setMemberUserId] = useState("");
  const [memberRole, setMemberRole] = useState("member");

  // OIDC provider state
  const [oidcProviders, setOidcProviders] = useState<OidcProvider[]>([]);
  const [oidcDialogOpen, setOidcDialogOpen] = useState(false);
  const [editingOidc, setEditingOidc] = useState<OidcProvider | null>(null);
  const [oidcName, setOidcName] = useState("");
  const [oidcSlug, setOidcSlug] = useState("");
  const [oidcIssuer, setOidcIssuer] = useState("");
  const [oidcClientId, setOidcClientId] = useState("");
  const [oidcClientSecret, setOidcClientSecret] = useState("");
  const [oidcScopes, setOidcScopes] = useState("openid email profile");

  // Share state
  const [shareDialog, setShareDialog] = useState<{ pageId: string; pageTitle: string } | null>(null);
  const [sharePassword, setSharePassword] = useState("");
  const [shareDays, setShareDays] = useState(0);
  const [shareUrl, setShareUrl] = useState("");
  const [shareLinks, setShareLinks] = useState<{ id: string; token: string; expires_at: number; visit_count: number; password_hash: string }[]>([]);

  useEffect(() => {
    setUserId(localStorage.getItem("sw_user_id"));
  }, [location.pathname]);

  const loadData = useCallback(async () => {
    try {
      const [cols, allPages] = await Promise.all([
        api.collections.list(),
        api.pages.list(),
      ]);
      setCollections(cols);
      setPages(allPages);
    } catch (e) {
      console.error("Failed to load data:", e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadData(); }, [loadData, location.pathname]);
  
  // Load favorites for sidebar
  const [favoritePages, setFavoritePages] = useState<Page[]>([]);
  useEffect(() => {
    if (!userId) { setFavoritePages([]); return; }
    api.favorites.list(userId).then((rows: any) => {
      const favPageIds = new Set((rows as any[][] || []).map((r: any) => String(r[2])));
      api.pages.list().then(allPages => {
        setFavoritePages(allPages.filter(p => favPageIds.has(p.id)));
      });
    }).catch(() => {});
  }, [userId, location.pathname]);

  const toggleCollection = (id: string) => {
    setExpandedCollections((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  // Search — query STDB when user types or filters change
  useEffect(() => {
    const timer = setTimeout(async () => {
      try {
        const results = await api.pages.list();
        setPages(results);
      } catch { /* keep existing */ }
    }, 200);
    return () => clearTimeout(timer);
  }, [searchQuery, searchFilters, loadData]);

  // Filter pages client-side for instant feel (text + filters)
  const filteredPages = pages.filter((p) => {
    // Text filter
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      const matchTitle = p.title.toLowerCase().includes(q);
      const matchContent = p.text_content.toLowerCase().includes(q);
      if (!matchTitle && !matchContent) return false;
    }
    // Collection filter
    if (searchFilters.collectionId && p.collection_id !== searchFilters.collectionId) {
      return false;
    }
    // Author filter
    if (searchFilters.authorId && p.created_by !== searchFilters.authorId) {
      return false;
    }
    // Date range filter (updated_at in ms)
    if (searchFilters.dateFrom) {
      const fromMs = new Date(searchFilters.dateFrom).getTime();
      if (p.updated_at < fromMs) return false;
    }
    if (searchFilters.dateTo) {
      // Include the entire "to" day (set to end of day)
      const toMs = new Date(searchFilters.dateTo).getTime() + 86_400_000;
      if (p.updated_at > toMs) return false;
    }
    return true;
  });

  // Group pages by collection, pinned first
  const pagesByCollection: Record<string, Page[]> = {};
  for (const page of filteredPages.filter((p) => p.status !== "deleted")) {
    const cid = page.collection_id || "uncategorized";
    if (!pagesByCollection[cid]) pagesByCollection[cid] = [];
    pagesByCollection[cid].push(page);
  }
  // Sort pages within each collection: pinned first, then by sort_order
  for (const cid of Object.keys(pagesByCollection)) {
    pagesByCollection[cid].sort((a, b) => {
      if (a.is_pinned && !b.is_pinned) return -1;
      if (!a.is_pinned && b.is_pinned) return 1;
      return a.sort_order - b.sort_order;
    });
  }

  const isActive = (pageId: string) =>
    location.pathname === `/page/${pageId}` || location.pathname.startsWith(`/page/${pageId}`);

  // ─── Collection CRUD handlers ───────────────────────────────────────────

  const openCreateCol = () => {
    setEditingCol(null);
    setColName("");
    setColDesc("");
    setColIcon("📁");
    setColColor("");
    setColDialogOpen(true);
  };

  const openEditCol = (col: Collection) => {
    setEditingCol(col);
    setColName(col.name);
    setColDesc(col.description);
    setColIcon(col.icon || "📁");
    setColColor(col.color);
    setColDialogOpen(true);
    setContextMenu(null);
  };

  const saveCollection = async () => {
    if (!colName.trim()) return;
    try {
      if (editingCol) {
        await api.collections.update(editingCol.id, colName, colDesc, colIcon, colColor);
      } else {
        await api.collections.create(colName, colDesc, "", colIcon, colColor, userId || "anonymous");
      }
      setColDialogOpen(false);
      await loadData();
    } catch (e) { console.error(e); }
  };

  const deleteCollection = async (id: string) => {
    if (!confirm("Archive this collection and all its pages?")) return;
    setContextMenu(null);
    await api.collections.delete(id);
    await loadData();
  };

  // ─── Trash handlers ─────────────────────────────────────────────────────

  const loadTrashPage = async () => {
    setTrashLoading(true);
    try {
      const deleted = await api.pages.listDeleted();
      setTrashPages(deleted);
    } catch (e) { console.error(e); }
    finally { setTrashLoading(false); }
    navigate("/trash");
  };

  const restorePage = async (id: string) => {
    await api.pages.restore(id);
    setTrashPages(prev => prev.filter(p => p.id !== id));
    await loadData();
  };

  const permanentDelete = async (id: string) => {
    if (!confirm("Permanently delete this page? This cannot be undone.")) return;
    await api.pages.delete(id);
    setTrashPages(prev => prev.filter(p => p.id !== id));
    await loadData();
  };

  const emptyTrash = async () => {
    if (!confirm("Permanently delete ALL pages in trash? This cannot be undone.")) return;
    await api.pages.emptyTrash();
    setTrashPages([]);
    await loadData();
  };

  // ─── Admin handlers ─────────────────────────────────────────────────────

  const openAdmin = async () => {
    try {
      const users = await api.users.list();
      setAllUsers(users);
      const grps = await api.groups.list();
      setGroups(grps);
      const oidc = await api.oidc.list();
      setOidcProviders(oidc);
    } catch (e) { console.error(e); }
    setAdminOpen(true);
    setAdminTab("users");
    navigate("/admin");
  };

  const updateUserRole = async (userId: string, newRole: string) => {
    const currentUser = localStorage.getItem("sw_user_id") || "";
    try {
      await api.users.updateRole(userId, newRole, currentUser);
      setAllUsers(prev => prev.map(u => u.id === userId ? { ...u, role: newRole } : u));
    } catch (e) { alert(String(e)); }
  };

  // ─── Share handlers ─────────────────────────────────────────────────────

  const openShareDialog = async (pageId: string, pageTitle: string) => {
    try {
      const links = await api.shareLinks.list(pageId);
      setShareLinks(links);
    } catch { /* noop */ }
    setShareDialog({ pageId, pageTitle });
    setSharePassword("");
    setShareDays(0);
    setShareUrl("");
  };

  const createShare = async () => {
    if (!shareDialog) return;
    try {
      const result = await api.shareLinks.create(shareDialog.pageId, sharePassword, userId || "anon", shareDays);
      const host = window.location.host;
      setShareUrl(`http://${host}/shared/${result.token}`);
      const links = await api.shareLinks.list(shareDialog.pageId);
      setShareLinks(links);
    } catch (e) { alert(String(e)); }
  };

  const deleteShare = async (linkId: string) => {
    await api.shareLinks.delete(linkId);
    if (shareDialog) {
      const links = await api.shareLinks.list(shareDialog.pageId);
      setShareLinks(links);
    }
  };

  // ─── Template handlers ──────────────────────────────────────────────────

  const [templateModalOpen, setTemplateModalOpen] = useState(false);
  const [templates, setTemplates] = useState<Page[]>([]);
  const [newPageTitle, setNewPageTitle] = useState("");
  const [selectedTemplate, setSelectedTemplate] = useState<string>("");

  const openTemplates = async () => {
    try {
      const tmpls = await api.pages.listTemplates();
      setTemplates(tmpls);
    } catch (e) { console.error(e); }
    setTemplateModalOpen(true);
  };

  const createFromTemplate = async () => {
    if (!selectedTemplate || !newPageTitle.trim()) return;
    try {
      const newId = await api.pages.createFromTemplate(selectedTemplate, newPageTitle, "", userId || "anon");
      setTemplateModalOpen(false);
      setNewPageTitle("");
      setSelectedTemplate("");
      await loadData();
      navigate(`/page/${newId}`);
    } catch (e) { alert(String(e)); }
  };

  // ─── Drag-and-drop ─────────────────────────────────────────────────────

  const [dragPageId, setDragPageId] = useState<string | null>(null);

  // ─── Command palette (Cmd+K) ────────────────────────────────────────────

  const [paletteOpen, setPaletteOpen] = useState(false);
  const [paletteQuery, setPaletteQuery] = useState("");
  const [paletteIndex, setPaletteIndex] = useState(0);

  const handleDragStart = (e: React.DragEvent, pageId: string) => {
    setDragPageId(pageId);
    e.dataTransfer.effectAllowed = "move";
    e.dataTransfer.setData("text/plain", pageId);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
  };

  const handleDropOnCollection = async (e: React.DragEvent, colId: string) => {
    e.preventDefault();
    const pageId = e.dataTransfer.getData("text/plain") || dragPageId;
    if (pageId && pageId !== colId) {
      await api.pages.move(pageId, colId, "");
      setDragPageId(null);
      await loadData();
    }
  };

  const handleDropOnPage = async (e: React.DragEvent, targetPageId: string) => {
    e.preventDefault();
    const pageId = e.dataTransfer.getData("text/plain") || dragPageId;
    if (pageId && pageId !== targetPageId) {
      // Move after the target page (reorder within collection)
      const colId = pages.find(p => p.id === targetPageId)?.collection_id || "";
      await api.pages.move(pageId, colId, targetPageId);
      setDragPageId(null);
      await loadData();
    }
  };

  const movePageToCollection = async (pageId: string, newColId: string) => {
    await api.pages.move(pageId, newColId, "");
    await loadData();
  };

  // ─── Command palette handlers ───────────────────────────────────────────

  const collectionLabel = (colId: string) => collections.find(c => c.id === colId)?.name || "";

  const closePalette = () => { setPaletteOpen(false); setPaletteQuery(""); setPaletteIndex(0); };

  const paletteItems = (() => {
    const q = paletteQuery.toLowerCase();
    const results: { type: "page" | "collection" | "action"; id?: string; label: string; subtitle: string; icon: React.ReactNode; action: () => void }[] = [];

    // Pages
    for (const p of pages.filter(x => x.status !== "deleted" && (x.title.toLowerCase().includes(q) || q === ""))) {
      results.push({
        type: "page", id: p.id, label: p.title,
        subtitle: `${p.status === "draft" ? "Draft" : p.status === "archived" ? "Archived" : ""} ${collectionLabel(p.collection_id)}`.trim(),
        icon: <FileText className="h-4 w-4" />,
        action: () => navigate(`/page/${p.id}`),
      });
    }
    // Collections
    for (const c of collections.filter(x => x.name.toLowerCase().includes(q))) {
      results.push({
        type: "collection", id: c.id, label: c.name,
        subtitle: `${c.icon || "📁"} Collection`,
        icon: <BookOpen className="h-4 w-4" />,
        action: () => { navigate("/"); toggleCollection(c.id); },
      });
    }
    // Actions
    const actions = [
      { label: "New page", subtitle: "Create a new document", icon: <Plus className="h-4 w-4" />, action: () => { closePalette(); navigate("/new"); } },
      { label: "New collection", subtitle: "Create a new collection", icon: <FolderPlus className="h-4 w-4" />, action: () => { closePalette(); openCreateCol(); } },
    ];
    for (const a of actions) {
      if (a.label.toLowerCase().includes(q) || q === "") results.push({ type: "action", label: a.label, subtitle: a.subtitle, icon: a.icon, action: a.action });
    }
    return results.slice(0, 15);
  })();

  const executePalette = (idx: number) => {
    const item = paletteItems[idx];
    if (item) { closePalette(); item.action(); }
  };

  // Cmd+K keyboard handler
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") { e.preventDefault(); setPaletteOpen(true); return; }
      if (paletteOpen) {
        if (e.key === "ArrowDown") { e.preventDefault(); setPaletteIndex(i => Math.min(i + 1, paletteItems.length - 1)); }
        else if (e.key === "ArrowUp") { e.preventDefault(); setPaletteIndex(i => Math.max(i - 1, 0)); }
        else if (e.key === "Enter") { e.preventDefault(); executePalette(paletteIndex); }
        else if (e.key === "Escape") { e.preventDefault(); closePalette(); }
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [paletteOpen, paletteIndex, paletteItems.length]);

  return (
    <div className="flex h-screen bg-background" onClick={() => setContextMenu(null)}>
      {/* Sidebar */}
      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-40 w-72 max-w-[85vw] bg-sidebar border-r border-border flex flex-col transition-transform md:relative md:translate-x-0",
          sidebarOpen ? "translate-x-0" : "-translate-x-full",
        )}
      >
        <div className="flex items-center gap-2 px-4 h-14 border-b border-border shrink-0">
          <div className="w-7 h-7 rounded-md bg-gradient-to-br from-primary to-purple-600 flex items-center justify-center shrink-0">
            <Library className="h-3.5 w-3.5 text-white" />
          </div>
          <span className="font-semibold text-sm">Spacetime Wiki</span>
          <button className="md:hidden ml-auto p-1" onClick={() => setSidebarOpen(false)}>
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Search */}
        <div className="px-3 py-2">
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground/60" />
            <input
              type="text" placeholder="Search..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full h-8 pl-8 pr-7 rounded-md border border-border bg-[#0a0a0a] text-xs text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-1 focus:ring-primary/50"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery("")}
                className="absolute right-2 top-1/2 -translate-y-1/2 h-4 w-4 flex items-center justify-center rounded text-muted-foreground/60 hover:text-foreground"
              >
                <X className="h-3 w-3" />
              </button>
            )}
          </div>
          {/* Filters toggle */}
          <div className="mt-1">
            <SearchFilters filters={searchFilters} onChange={setSearchFilters} />
          </div>
        </div>

        {/* New page + New collection buttons */}
        <div className="px-3 pb-2 space-y-1">
          <button
            onClick={() => navigate("/new")}
            className="w-full flex items-center gap-2 px-3 py-1.5 rounded-md text-xs font-medium bg-primary/10 text-primary hover:bg-primary/20 transition-colors"
          >
            <Plus className="h-3.5 w-3.5" /> New page
          </button>
          <button
            onClick={openCreateCol}
            className="w-full flex items-center gap-2 px-3 py-1.5 rounded-md text-xs font-medium text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors"
          >
            <FolderPlus className="h-3.5 w-3.5" /> New collection
          </button>
        </div>

        {/* Favorites */}
        {favoritePages.length > 0 && (
          <div className="px-2 py-1 mb-1">
            <p className="text-[10px] text-muted-foreground/60 font-semibold uppercase tracking-wider px-2 mb-1">Favorites</p>
            {favoritePages.map(p => (
              <button key={p.id}
                onClick={() => navigate(`/page/${p.id}`)}
                className={cn("w-full flex items-center gap-2 pl-2 pr-2 py-1 rounded-md text-xs transition-colors text-left",
                  isActive(p.id) ? "bg-primary/10 text-primary font-medium" : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
                )}
              >
                {p.icon || <Star className="h-3.5 w-3.5 text-yellow-500 shrink-0" fill="currentColor" />}
                {p.color && <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ backgroundColor: p.color }} />}
                {p.is_pinned && <Pin className="h-3 w-3 shrink-0 text-primary" fill="currentColor" />}
                <span className="truncate">{p.title}</span>
              </button>
            ))}
            <div className="h-px bg-border/50 mx-2 mt-2 mb-1" />
          </div>
        )}

        {/* Collections + Pages tree */}
        <nav className="flex-1 overflow-y-auto px-2 py-1">
          {loading ? (
            <div className="px-3 py-4 text-xs text-muted-foreground">Loading...</div>
          ) : (
            <>
              {collections.map((col) => {
                const colPages = pagesByCollection[col.id] || [];
                const expanded = expandedCollections.has(col.id);
                return (
                  <div key={col.id} className="mb-0.5">
                    <div className="flex items-center group">
                      <button
                        onClick={() => toggleCollection(col.id)}
                        onContextMenu={(e) => {
                          e.preventDefault();
                          setContextMenu({ x: e.clientX, y: e.clientY, colId: col.id });
                        }}
                        onDragOver={handleDragOver}
                        onDrop={(e) => handleDropOnCollection(e, col.id)}
                        className="flex-1 flex items-center gap-1.5 px-2 py-1.5 rounded-md text-xs font-medium text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors text-left"
                      >
                        {expanded ? <ChevronDown className="h-3 w-3 shrink-0" /> : <ChevronRight className="h-3 w-3 shrink-0" />}
                        <span className="text-xs">{col.icon || "📁"}</span>
                        <span className="truncate">{col.name}</span>
                        <span className="text-[10px] text-muted-foreground/50 ml-auto">{colPages.length}</span>
                      </button>
                      <button
                        onClick={(e) => { e.stopPropagation(); openEditCol(col); }}
                        className="opacity-0 group-hover:opacity-100 p-1 rounded text-muted-foreground hover:text-foreground hover:bg-muted transition-all"
                      >
                        <MoreHorizontal className="h-3 w-3" />
                      </button>
                    </div>
                    {expanded &&
                      colPages.map((page) => (
                        <button
                          key={page.id}
                          onClick={() => navigate(`/page/${page.id}`)}
                          draggable
                          onDragStart={(e) => handleDragStart(e, page.id)}
                          onDragOver={handleDragOver}
                          onDrop={(e) => handleDropOnPage(e, page.id)}
                          className={cn(
                            "w-full flex items-center gap-2 pl-8 pr-2 py-1 rounded-md text-xs transition-colors text-left",
                            isActive(page.id)
                              ? "bg-primary/10 text-primary font-medium"
                              : "text-muted-foreground hover:text-foreground hover:bg-muted/50",
                          )}
                        >
                          {page.icon || <FileText className="h-3.5 w-3.5 shrink-0" />}
                          {page.color && <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ backgroundColor: page.color }} />}
                          {page.is_pinned && <Pin className="h-3 w-3 shrink-0 text-primary" fill="currentColor" />}
                          <span className="truncate">{page.title}</span>
                          {page.status === "draft" && (
                            <span className="ml-auto text-[10px] px-1 py-0.5 rounded bg-yellow-500/10 text-yellow-500 shrink-0">Draft</span>
                          )}
                          {page.status === "archived" && (
                            <span className="ml-auto text-[10px] px-1 py-0.5 rounded bg-muted text-muted-foreground shrink-0">Archived</span>
                          )}
                        </button>
                      ))}
                  </div>
                );
              })}

              {/* Uncategorized pages */}
              {pagesByCollection["uncategorized"]?.length > 0 && (
                <div className="mb-0.5">
                  <button
                    onClick={() => toggleCollection("uncategorized")}
                    className="w-full flex items-center gap-1.5 px-2 py-1.5 rounded-md text-xs font-medium text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors"
                  >
                    {expandedCollections.has("uncategorized") ? <ChevronDown className="h-3 w-3 shrink-0" /> : <ChevronRight className="h-3 w-3 shrink-0" />}
                    <Hash className="h-3.5 w-3.5" /> Uncategorized
                    <span className="text-[10px] text-muted-foreground/50 ml-auto">{pagesByCollection["uncategorized"].length}</span>
                  </button>
                  {expandedCollections.has("uncategorized") &&
                    pagesByCollection["uncategorized"].map((page) => (
                      <button
                        key={page.id}
                        onClick={() => navigate(`/page/${page.id}`)}
                        draggable
                        onDragStart={(e) => handleDragStart(e, page.id)}
                        onDragOver={handleDragOver}
                        onDrop={(e) => handleDropOnPage(e, page.id)}
                        className={cn(
                          "w-full flex items-center gap-2 pl-8 pr-2 py-1 rounded-md text-xs transition-colors text-left",
                          isActive(page.id) ? "bg-primary/10 text-primary font-medium" : "text-muted-foreground hover:text-foreground hover:bg-muted/50",
                        )}
                      >
                        <FileText className="h-3.5 w-3.5 shrink-0" />
                        {page.color && <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ backgroundColor: page.color }} />}
                        {page.is_pinned && <Pin className="h-3 w-3 shrink-0 text-primary" fill="currentColor" />}
                        <span className="truncate">{page.title}</span>
                      </button>
                    ))}
                </div>
              )}

              {collections.length === 0 && Object.keys(pagesByCollection).length === 0 && (
                <div className="px-3 py-4 text-xs text-muted-foreground">No pages yet. Create your first page!</div>
              )}
            </>
          )}
        </nav>

        <div className="px-3 py-2 border-t border-border space-y-1">
          <button onClick={openTemplates} className="w-full flex items-center gap-2 px-2 py-1.5 rounded-md text-xs text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors">
            <LayoutTemplate className="h-3 w-3" /> Templates
          </button>
          <button onClick={loadTrashPage} className="w-full flex items-center gap-2 px-2 py-1.5 rounded-md text-xs text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors">
            <Trash2 className="h-3 w-3" /> Trash
          </button>
          <button onClick={openAdmin} className="w-full flex items-center gap-2 px-2 py-1.5 rounded-md text-xs text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors">
            <Shield className="h-3 w-3" /> Admin
          </button>
          <div className="flex items-center gap-2 px-2 py-1.5 text-xs text-muted-foreground">
            {userId ? (
              <span className="truncate">Logged in</span>
            ) : (
              <button onClick={() => navigate("/login")} className="text-primary hover:underline">Sign in</button>
            )}
          </div>
        </div>
      </aside>

      {/* Overlay */}
      {sidebarOpen && <div className="fixed inset-0 z-30 bg-black/50 md:hidden" onClick={() => setSidebarOpen(false)} />}

      {/* Context menu */}
      {contextMenu && (
        <div
          className="fixed z-50 w-40 py-1 rounded-lg border border-border bg-card shadow-xl"
          style={{
            left: Math.min(contextMenu.x, window.innerWidth - 160),
            top: Math.min(contextMenu.y, window.innerHeight - 120),
          }}
          onClick={(e) => e.stopPropagation()}
        >
          <button
            onClick={() => { const col = collections.find(c => c.id === contextMenu.colId); if (col) openEditCol(col); }}
            className="w-full flex items-center gap-2 px-3 py-1.5 text-xs hover:bg-muted transition-colors text-left"
          >
            <Pencil className="h-3 w-3" /> Edit
          </button>
          <button
            onClick={() => deleteCollection(contextMenu.colId)}
            className="w-full flex items-center gap-2 px-3 py-1.5 text-xs text-red-400 hover:bg-red-500/10 transition-colors text-left"
          >
            <Trash2 className="h-3 w-3" /> Delete
          </button>
        </div>
      )}

      {/* Trash panel */}
      {location.pathname === "/trash" && (
        <div className="dialog-overlay fixed inset-0 z-50 flex items-center justify-center bg-black/60" onClick={() => navigate("/")}>
          <div className="dialog-container w-full max-w-lg mx-4 p-5 rounded-xl border border-border bg-card shadow-2xl max-h-[80vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-semibold flex items-center gap-2"><Trash2 className="h-4 w-4 text-red-400" /> Trash</h3>
              <button onClick={() => navigate("/")} className="p-1 rounded hover:bg-muted"><X className="h-4 w-4" /></button>
            </div>
            {trashLoading ? (
              <div className="py-8 text-center text-xs text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin mx-auto mb-2" /> Loading...</div>
            ) : trashPages.length === 0 ? (
              <div className="py-8 text-center text-xs text-muted-foreground">Trash is empty</div>
            ) : (
              <>
                <div className="space-y-1 mb-4">
                  {trashPages.map(p => (
                    <div key={p.id} className="flex items-center gap-2 px-3 py-2 rounded-md border border-border hover:bg-muted/30 transition-colors">
                      <FileText className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                      <span className="text-xs truncate flex-1">{p.title}</span>
                      <span className="text-[10px] text-muted-foreground/60 shrink-0">{timeAgo(p.deleted_at)}</span>
                      <button onClick={() => restorePage(p.id)} className="p-1 rounded text-xs text-primary hover:bg-primary/10 shrink-0">Restore</button>
                      <button onClick={() => permanentDelete(p.id)} className="p-1 rounded text-xs text-red-400 hover:bg-red-500/10 shrink-0">Delete</button>
                    </div>
                  ))}
                </div>
                <button
                  onClick={emptyTrash}
                  className="w-full py-2 rounded-md text-xs font-medium text-red-400 hover:bg-red-500/10 transition-colors border border-red-500/20"
                >
                  Empty trash
                </button>
              </>
            )}
          </div>
        </div>
      )}

      {/* Admin panel */}
      {location.pathname === "/admin" && (
        <div className="dialog-overlay fixed inset-0 z-50 flex items-center justify-center bg-black/60" onClick={() => { setAdminOpen(false); navigate("/"); }}>
          <div className="dialog-container w-full max-w-2xl mx-4 p-5 rounded-xl border border-border bg-card shadow-2xl max-h-[80vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-semibold flex items-center gap-2"><Shield className="h-4 w-4 text-primary" /> Admin</h3>
              <button onClick={() => { setAdminOpen(false); navigate("/"); }} className="p-1 rounded hover:bg-muted"><X className="h-4 w-4" /></button>
            </div>

            {/* Tab bar */}
            <div className="flex gap-1 mb-4 border-b border-border">
              <button onClick={() => setAdminTab("users")}
                className={`px-3 py-1.5 text-xs font-medium rounded-t-md transition-colors ${adminTab === "users" ? "bg-primary/10 text-primary border-b-2 border-primary" : "text-muted-foreground hover:text-foreground"}`}>
                Users
              </button>
              <button onClick={() => setAdminTab("groups")}
                className={`px-3 py-1.5 text-xs font-medium rounded-t-md transition-colors ${adminTab === "groups" ? "bg-primary/10 text-primary border-b-2 border-primary" : "text-muted-foreground hover:text-foreground"}`}>
                <Users className="h-3 w-3 inline mr-1" />Groups
              </button>
              <button onClick={() => setAdminTab("webhooks")}
                className={`px-3 py-1.5 text-xs font-medium rounded-t-md transition-colors ${adminTab === "webhooks" ? "bg-primary/10 text-primary border-b-2 border-primary" : "text-muted-foreground hover:text-foreground"}`}>
                <Send className="h-3 w-3 inline mr-1" />Webhooks
              </button>
              <button onClick={() => setAdminTab("sso")}
                className={`px-3 py-1.5 text-xs font-medium rounded-t-md transition-colors ${adminTab === "sso" ? "bg-primary/10 text-primary border-b-2 border-primary" : "text-muted-foreground hover:text-foreground"}`}>
                <Users className="h-3 w-3 inline mr-1" />SSO
              </button>
              <button onClick={() => setAdminTab("export")}
                className={`px-3 py-1.5 text-xs font-medium rounded-t-md transition-colors ${adminTab === "export" ? "bg-primary/10 text-primary border-b-2 border-primary" : "text-muted-foreground hover:text-foreground"}`}>
                <Download className="h-3 w-3 inline mr-1" />Export
              </button>
            </div>

            {adminTab === "users" && (
              <>
                <div className="space-y-1 mb-4">
                  {allUsers.map(u => (
                    <div key={u.id} className="flex items-center gap-3 px-3 py-2 rounded-md border border-border hover:bg-muted/30 transition-colors">
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-medium truncate">{u.name}</p>
                        <p className="text-[10px] text-muted-foreground/60 truncate">{u.email}</p>
                      </div>
                      <select
                        value={u.role}
                        onChange={(e) => updateUserRole(u.id, e.target.value)}
                        className="h-7 pl-2 pr-6 rounded-md border border-border bg-[#0a0a0a] text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary/50"
                      >
                        <option value="admin">Admin</option>
                        <option value="member">Member</option>
                        <option value="viewer">Viewer</option>
                      </select>
                    </div>
                  ))}
                  {allUsers.length === 0 && (
                    <div className="py-4 text-center text-xs text-muted-foreground">No users found</div>
                  )}
                </div>
                <div className="pt-4 border-t border-border">
                  <h4 className="text-xs font-semibold mb-3">Google OAuth</h4>
                  <div className="flex gap-2 mb-2">
                    <input
                      type="text" id="googleClientId"
                      defaultValue={localStorage.getItem("sw_google_client_id") || ""}
                      onChange={(e) => localStorage.setItem("sw_google_client_id", e.target.value)}
                      placeholder="Google OAuth Client ID"
                      className="flex-1 h-7 px-2 rounded-md border border-border bg-[#0a0a0a] text-xs focus:outline-none focus:ring-1 focus:ring-primary/50" />
                  </div>
                  <p className="text-[10px] text-muted-foreground/60 mb-3">
                    Create a project at <a href="https://console.cloud.google.com/apis/credentials" target="_blank" className="text-primary hover:underline">Google Cloud Console</a>.
                    Add <code className="bg-muted px-1 rounded">{window.location.origin}/oauth/google/callback</code> as an authorized redirect URI.
                  </p>
                  <h4 className="text-xs font-semibold mb-3 flex items-center gap-2"><Key className="h-3.5 w-3.5" /> API Keys</h4>
                  <ApiKeySection userId={userId} />
                </div>
              </>
            )}

            {adminTab === "groups" && (
              <div>
                <div className="flex items-center justify-between mb-3">
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Groups & Teams</p>
                  <button onClick={() => {
                    setEditingGroup(null);
                    setGroupName("");
                    setGroupDesc("");
                    setGroupDialogOpen(true);
                  }} className="inline-flex items-center gap-1 px-2 py-1 rounded-md text-xs font-medium bg-primary/10 text-primary hover:bg-primary/20 transition-colors">
                    <Plus className="h-3 w-3" /> New Group
                  </button>
                </div>
                <div className="space-y-2">
                  {groups.map(g => (
                    <div key={g.id} className="rounded-md border border-border overflow-hidden">
                      <div className="flex items-center gap-2 px-3 py-2 hover:bg-muted/30 transition-colors">
                        <button onClick={() => {
                          if (expandedGroup === g.id) {
                            setExpandedGroup(null);
                          } else {
                            setExpandedGroup(g.id);
                            api.groups.listMembers(g.id).then(setGroupMembers).catch(() => {});
                          }
                        }} className="flex-1 flex items-center gap-2 text-left">
                          <Users className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                          <span className="text-xs font-medium truncate">{g.name}</span>
                          <span className="text-[10px] text-muted-foreground/60">{g.description ? `— ${g.description}` : ""}</span>
                        </button>
                        <button onClick={() => {
                          setEditingGroup({ id: g.id, name: g.name, description: g.description });
                          setGroupName(g.name);
                          setGroupDesc(g.description);
                          setGroupDialogOpen(true);
                        }} className="p-1 rounded text-muted-foreground hover:text-foreground hover:bg-muted transition-colors">
                          <Pencil className="h-3 w-3" />
                        </button>
                        <button onClick={async () => {
                          if (!confirm(`Delete group "${g.name}"?`)) return;
                          await api.groups.delete(g.id);
                          setGroups(prev => prev.filter(x => x.id !== g.id));
                        }} className="p-1 rounded text-red-400 hover:text-red-300 hover:bg-red-500/10 transition-colors">
                          <Trash2 className="h-3 w-3" />
                        </button>
                      </div>
                      {expandedGroup === g.id && (
                        <div className="px-3 pb-2 border-t border-border">
                          {/* Members list */}
                          <div className="space-y-1 py-2">
                            <p className="text-[10px] text-muted-foreground/60 font-semibold uppercase tracking-wider">Members</p>
                            {groupMembers.filter(m => m.group_id === g.id).map(m => (
                              <div key={m.id} className="flex items-center gap-2 px-2 py-1 rounded text-xs">
                                <span className="flex-1 truncate text-muted-foreground">{m.user_id}</span>
                                <select value={m.role} onChange={async (e) => {
                                  await api.groups.updateMemberRole(m.id, e.target.value);
                                  setGroupMembers(prev => prev.map(x => x.id === m.id ? { ...x, role: e.target.value } : x));
                                }} className="h-6 pl-1 pr-5 rounded border border-border bg-[#0a0a0a] text-[10px] focus:outline-none">
                                  <option value="admin">Admin</option>
                                  <option value="member">Member</option>
                                </select>
                                <button onClick={async () => {
                                  await api.groups.removeMember(m.id);
                                  setGroupMembers(prev => prev.filter(x => x.id !== m.id));
                                }} className="text-red-400 hover:text-red-300 text-[10px]">×</button>
                              </div>
                            ))}
                            {groupMembers.filter(m => m.group_id === g.id).length === 0 && (
                              <p className="text-[10px] text-muted-foreground/50 px-2">No members yet</p>
                            )}
                          </div>
                          {/* Add member */}
                          <div className="flex gap-2 pt-1 border-t border-border">
                            <select value={memberUserId} onChange={(e) => setMemberUserId(e.target.value)}
                              className="flex-1 h-7 px-2 rounded-md border border-border bg-[#0a0a0a] text-xs focus:outline-none focus:ring-1 focus:ring-primary/50">
                              <option value="">Select user...</option>
                              {allUsers.filter(u => !groupMembers.some(m => m.group_id === g.id && m.user_id === u.id)).map(u => (
                                <option key={u.id} value={u.id}>{u.name} ({u.email})</option>
                              ))}
                            </select>
                            <select value={memberRole} onChange={(e) => setMemberRole(e.target.value)}
                              className="h-7 pl-1 pr-5 rounded border border-border bg-[#0a0a0a] text-xs focus:outline-none">
                              <option value="member">Member</option>
                              <option value="admin">Admin</option>
                            </select>
                            <button onClick={async () => {
                              if (!memberUserId || !expandedGroup) return;
                              await api.groups.addMember(expandedGroup, memberUserId, memberRole, userId || "anon");
                              setMemberUserId("");
                              const updated = await api.groups.listMembers(expandedGroup);
                              setGroupMembers(updated);
                            }} disabled={!memberUserId || !expandedGroup}
                              className="h-7 px-2 rounded-md text-xs font-medium bg-primary text-white hover:bg-primary/90 disabled:opacity-50 transition-colors">
                              Add
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                  {groups.length === 0 && (
                    <div className="py-6 text-center text-xs text-muted-foreground">
                      No groups yet. Create your first team group.
                    </div>
                  )}
                </div>
              </div>
            )}
            {adminTab === "webhooks" && (
              <WebhookSettings userId={userId} />
            )}
            {adminTab === "sso" && (
              <div>
                <div className="flex items-center justify-between mb-3">
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">OIDC Providers</p>
                  <button onClick={() => {
                    setEditingOidc(null);
                    setOidcName(""); setOidcSlug(""); setOidcIssuer("");
                    setOidcClientId(""); setOidcClientSecret(""); setOidcScopes("openid email profile");
                    setOidcDialogOpen(true);
                  }} className="inline-flex items-center gap-1 px-2 py-1 rounded-md text-xs font-medium bg-primary/10 text-primary hover:bg-primary/20 transition-colors">
                    <Plus className="h-3 w-3" /> Add Provider
                  </button>
                </div>
                <div className="space-y-2">
                  {oidcProviders.map(p => (
                    <div key={p.id} className="flex items-center gap-3 px-3 py-2 rounded-md border border-border hover:bg-muted/30 transition-colors">
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-medium truncate flex items-center gap-2">
                          {p.name}
                          {p.is_active ? (
                            <span className="text-[10px] text-emerald-500 bg-emerald-500/10 px-1.5 py-0.5 rounded">Active</span>
                          ) : (
                            <span className="text-[10px] text-muted-foreground bg-muted px-1.5 py-0.5 rounded">Disabled</span>
                          )}
                        </p>
                        <p className="text-[10px] text-muted-foreground/60 truncate">{p.issuer_url}</p>
                      </div>
                      <button onClick={() => {
                        setEditingOidc(p);
                        setOidcName(p.name); setOidcSlug(p.slug); setOidcIssuer(p.issuer_url);
                        setOidcClientId(p.client_id); setOidcClientSecret(""); setOidcScopes(p.scopes);
                        setOidcDialogOpen(true);
                      }} className="p-1 rounded text-muted-foreground hover:text-foreground hover:bg-muted transition-colors">
                        <Pencil className="h-3 w-3" />
                      </button>
                      <button onClick={async () => {
                        if (!confirm(`Delete OIDC provider "${p.name}"?`)) return;
                        await api.oidc.delete(p.id);
                        setOidcProviders(prev => prev.filter(x => x.id !== p.id));
                      }} className="p-1 rounded text-red-400 hover:text-red-300 hover:bg-red-500/10 transition-colors">
                        <Trash2 className="h-3 w-3" />
                      </button>
                    </div>
                  ))}
                  {oidcProviders.length === 0 && (
                    <div className="py-4 text-center text-xs text-muted-foreground">
                      No OIDC providers configured. Add one to enable SSO login.
                    </div>
                  )}
                </div>
                <div className="pt-4 mt-4 border-t border-border">
                  <h4 className="text-xs font-semibold mb-2 text-muted-foreground">How it works</h4>
                  <p className="text-[10px] text-muted-foreground/60 leading-relaxed">
                    Configure any OpenID Connect provider (Keycloak, Okta, Auth0, Azure AD, etc.).
                    Users will see a <strong className="text-foreground">"Sign in with {oidcProviders.find(p => p.is_active)?.name || "SSO"}"</strong> button on the login page.
                    The callback URL for all providers is: <code className="bg-muted px-1 rounded">{window.location.origin}/oauth/oidc/callback</code>
                  </p>
                </div>
              </div>
            )}
            {adminTab === "export" && <BulkExport />}
          </div>
        </div>
      )}

      {/* Share dialog */}
      {shareDialog && (
        <div className="dialog-overlay fixed inset-0 z-50 flex items-center justify-center bg-black/60" onClick={() => setShareDialog(null)}>
          <div className="dialog-container w-full max-w-sm mx-4 p-5 rounded-xl border border-border bg-card shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-semibold flex items-center gap-2"><Link2 className="h-4 w-4 text-primary" /> Share "{shareDialog.pageTitle}"</h3>
              <button onClick={() => setShareDialog(null)} className="p-1 rounded hover:bg-muted"><X className="h-4 w-4" /></button>
            </div>
            <div className="space-y-3">
              <div>
                <label className="text-[10px] text-muted-foreground/60 mb-1 block">Password (optional)</label>
                <input
                  type="text" value={sharePassword} onChange={(e) => setSharePassword(e.target.value)}
                  placeholder="Leave empty for public link"
                  className="w-full h-8 px-3 rounded-md border border-border bg-[#0a0a0a] text-xs text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-1 focus:ring-primary/50"
                />
              </div>
              <div>
                <label className="text-[10px] text-muted-foreground/60 mb-1 block">Expires in days (0 = never)</label>
                <input
                  type="number" value={shareDays} onChange={(e) => setShareDays(parseInt(e.target.value) || 0)} min={0}
                  className="w-full h-8 px-3 rounded-md border border-border bg-[#0a0a0a] text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary/50"
                />
              </div>
              <button
                onClick={createShare}
                className="w-full h-8 rounded-md text-xs font-medium bg-primary text-primary-foreground hover:bg-primary/90 transition-colors"
              >
                Create share link
              </button>
              {shareUrl && (
                <div className="p-2 rounded-md bg-primary/5 border border-primary/20">
                  <p className="text-[10px] text-muted-foreground/60 mb-1">Share URL</p>
                  <input readOnly value={shareUrl} onClick={(e) => (e.target as HTMLInputElement).select()}
                    className="w-full h-8 px-3 rounded-md border border-border bg-[#0a0a0a] text-xs text-foreground font-mono"
                  />
                </div>
              )}
              {shareLinks.length > 0 && (
                <div className="space-y-1 pt-2 border-t border-border">
                  <p className="text-[10px] text-muted-foreground/60 mb-1">Active shares</p>
                  {shareLinks.map(s => (
                    <div key={s.id} className="flex items-center gap-2 text-xs">
                      <span className="text-muted-foreground font-mono truncate flex-1">{s.token.slice(0, 12)}...</span>
                      <span className="text-[10px] text-muted-foreground/60">{s.visit_count} views</span>
                      {s.password_hash && <span className="text-[10px]">🔒</span>}
                      <button onClick={() => deleteShare(s.id)} className="text-red-400 hover:text-red-300 text-[10px]">×</button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Template picker dialog */}
      {templateModalOpen && (
        <div className="dialog-overlay fixed inset-0 z-50 flex items-center justify-center bg-black/60" onClick={() => setTemplateModalOpen(false)}>
          <div className="dialog-container w-full max-w-lg mx-4 p-5 rounded-xl border border-border bg-card shadow-2xl max-h-[80vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-semibold flex items-center gap-2"><LayoutTemplate className="h-4 w-4 text-purple-400" /> New from template</h3>
              <button onClick={() => setTemplateModalOpen(false)} className="p-1 rounded hover:bg-muted"><X className="h-4 w-4" /></button>
            </div>
            {templates.length === 0 ? (
              <div className="py-8 text-center text-xs text-muted-foreground">No templates yet. Save any page as a template first!</div>
            ) : (
              <>
                <div className="grid grid-cols-2 gap-2 mb-4">
                  {templates.map(t => (
                    <button key={t.id}
                      onClick={() => { setSelectedTemplate(t.id); setNewPageTitle(t.title); }}
                      className={`p-3 rounded-lg border text-left transition-colors ${selectedTemplate === t.id ? 'border-purple-500 bg-purple-500/10' : 'border-border hover:bg-muted/50'}`}>
                      <p className="text-xs font-medium truncate">{t.icon || "📄"} {t.title}</p>
                      <p className="text-[10px] text-muted-foreground/60 mt-0.5 truncate">{t.text_content.slice(0, 60) || "No content"}</p>
                    </button>
                  ))}
                </div>
                {selectedTemplate && (
                  <div className="space-y-2 pt-3 border-t border-border">
                    <input
                      value={newPageTitle} onChange={(e) => setNewPageTitle(e.target.value)}
                      placeholder="New page title" autoFocus
                      className="w-full h-8 px-3 rounded-md border border-border bg-[#0a0a0a] text-xs focus:outline-none focus:ring-1 focus:ring-primary/50" />
                    <button onClick={createFromTemplate} disabled={!newPageTitle.trim()}
                      className="w-full h-8 rounded-md text-xs font-medium bg-primary text-white hover:bg-primary/90 disabled:opacity-50">
                      Create from template
                    </button>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      )}

      {/* Collection dialog */}
      {colDialogOpen && (
        <div className="dialog-overlay fixed inset-0 z-50 flex items-center justify-center bg-black/60" onClick={() => setColDialogOpen(false)}>
          <div className="dialog-container w-full max-w-sm p-5 rounded-xl border border-border bg-card shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-sm font-semibold mb-4">{editingCol ? "Edit collection" : "New collection"}</h3>
            <div className="space-y-3">
              <div className="flex gap-2">
                <input
                  type="text" value={colIcon} onChange={(e) => setColIcon(e.target.value)}
                  placeholder="📁" maxLength={4}
                  className="w-12 h-9 text-center rounded-md border border-border bg-[#0a0a0a] text-sm focus:outline-none focus:ring-1 focus:ring-primary/50"
                />
                <input
                  type="text" value={colName} onChange={(e) => setColName(e.target.value)}
                  placeholder="Collection name" autoFocus
                  className="flex-1 h-9 px-3 rounded-md border border-border bg-[#0a0a0a] text-sm text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-1 focus:ring-primary/50"
                />
              </div>
              <input
                type="text" value={colDesc} onChange={(e) => setColDesc(e.target.value)}
                placeholder="Description (optional)"
                className="w-full h-9 px-3 rounded-md border border-border bg-[#0a0a0a] text-sm text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-1 focus:ring-primary/50"
              />
              <input
                type="text" value={colColor} onChange={(e) => setColColor(e.target.value)}
                placeholder="Color (hex, optional)"
                className="w-full h-9 px-3 rounded-md border border-border bg-[#0a0a0a] text-sm text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-1 focus:ring-primary/50"
              />
              <div className="flex gap-2 justify-end pt-2">
                <button onClick={() => setColDialogOpen(false)} className="h-8 px-3 rounded-md text-xs text-muted-foreground hover:text-foreground hover:bg-muted transition-colors">
                  Cancel
                </button>
                <button onClick={saveCollection} disabled={!colName.trim()} className="h-8 px-4 rounded-md text-xs font-medium bg-primary text-white hover:bg-primary/90 disabled:opacity-50 transition-colors">
                  {editingCol ? "Save" : "Create"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Group dialog */}
      {groupDialogOpen && (
        <div className="dialog-overlay fixed inset-0 z-50 flex items-center justify-center bg-black/60" onClick={() => setGroupDialogOpen(false)}>
          <div className="dialog-container w-full max-w-sm p-5 rounded-xl border border-border bg-card shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-sm font-semibold mb-4">{editingGroup ? "Edit group" : "New group"}</h3>
            <div className="space-y-3">
              <input
                type="text" value={groupName} onChange={(e) => setGroupName(e.target.value)}
                placeholder="Group name" autoFocus
                className="w-full h-9 px-3 rounded-md border border-border bg-[#0a0a0a] text-sm text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-1 focus:ring-primary/50"
              />
              <input
                type="text" value={groupDesc} onChange={(e) => setGroupDesc(e.target.value)}
                placeholder="Description (optional)"
                className="w-full h-9 px-3 rounded-md border border-border bg-[#0a0a0a] text-sm text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-1 focus:ring-primary/50"
              />
              <div className="flex gap-2 justify-end pt-2">
                <button onClick={() => setGroupDialogOpen(false)} className="h-8 px-3 rounded-md text-xs text-muted-foreground hover:text-foreground hover:bg-muted transition-colors">
                  Cancel
                </button>
                <button onClick={async () => {
                  if (!groupName.trim()) return;
                  try {
                    if (editingGroup) {
                      await api.groups.update(editingGroup.id, groupName, groupDesc);
                      setGroups(prev => prev.map(g => g.id === editingGroup.id ? { ...g, name: groupName, description: groupDesc } : g));
                    } else {
                      const id = await api.groups.create(groupName, groupDesc, userId || "anon");
                      setGroups(prev => [...prev, { id, name: groupName, description: groupDesc, created_by: userId || "anon", created_at: Date.now(), updated_at: Date.now() }]);
                    }
                    setGroupDialogOpen(false);
                  } catch (e) { alert(String(e)); }
                }} disabled={!groupName.trim()}
                  className="h-8 px-4 rounded-md text-xs font-medium bg-primary text-white hover:bg-primary/90 disabled:opacity-50 transition-colors">
                  {editingGroup ? "Save" : "Create"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* OIDC Provider dialog */}
      {oidcDialogOpen && (
        <div className="dialog-overlay fixed inset-0 z-50 flex items-center justify-center bg-black/60" onClick={() => setOidcDialogOpen(false)}>
          <div className="dialog-container w-full max-w-md p-5 rounded-xl border border-border bg-card shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-sm font-semibold mb-4">{editingOidc ? "Edit OIDC Provider" : "Add OIDC Provider"}</h3>
            <div className="space-y-3">
              <input
                type="text" value={oidcName} onChange={(e) => setOidcName(e.target.value)}
                placeholder="Provider name (e.g. Keycloak, Okta)" autoFocus
                className="w-full h-9 px-3 rounded-md border border-border bg-[#0a0a0a] text-sm text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-1 focus:ring-primary/50"
              />
              <input
                type="text" value={oidcSlug} onChange={(e) => setOidcSlug(e.target.value)}
                placeholder="Slug (e.g. keycloak — appears in URL)"
                className="w-full h-9 px-3 rounded-md border border-border bg-[#0a0a0a] text-sm text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-1 focus:ring-primary/50"
              />
              <input
                type="text" value={oidcIssuer} onChange={(e) => setOidcIssuer(e.target.value)}
                placeholder="Issuer URL (e.g. https://auth.example.com/realms/myrealm)"
                className="w-full h-9 px-3 rounded-md border border-border bg-[#0a0a0a] text-sm text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-1 focus:ring-primary/50"
              />
              <input
                type="text" value={oidcClientId} onChange={(e) => setOidcClientId(e.target.value)}
                placeholder="Client ID"
                className="w-full h-9 px-3 rounded-md border border-border bg-[#0a0a0a] text-sm text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-1 focus:ring-primary/50"
              />
              <input
                type="password" value={oidcClientSecret} onChange={(e) => setOidcClientSecret(e.target.value)}
                placeholder={editingOidc ? "Client secret (leave blank to keep current)" : "Client secret"}
                className="w-full h-9 px-3 rounded-md border border-border bg-[#0a0a0a] text-sm text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-1 focus:ring-primary/50"
              />
              <input
                type="text" value={oidcScopes} onChange={(e) => setOidcScopes(e.target.value)}
                placeholder="Scopes (default: openid email profile)"
                className="w-full h-9 px-3 rounded-md border border-border bg-[#0a0a0a] text-sm text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-1 focus:ring-primary/50"
              />
              <div className="flex gap-2 justify-end pt-2">
                <button onClick={() => setOidcDialogOpen(false)} className="h-8 px-3 rounded-md text-xs text-muted-foreground hover:text-foreground hover:bg-muted transition-colors">
                  Cancel
                </button>
                <button onClick={async () => {
                  if (!oidcName.trim() || !oidcSlug.trim() || !oidcIssuer.trim() || !oidcClientId.trim()) {
                    alert("Name, slug, issuer URL, and client ID are required.");
                    return;
                  }
                  try {
                    if (editingOidc) {
                      await api.oidc.update(editingOidc.id, oidcName, oidcSlug, oidcIssuer, oidcClientId, oidcClientSecret, oidcScopes, editingOidc.is_active);
                      setOidcProviders(prev => prev.map(p => p.id === editingOidc.id ? {
                        ...p, name: oidcName, slug: oidcSlug, issuer_url: oidcIssuer,
                        client_id: oidcClientId, scopes: oidcScopes, updated_at: Date.now(),
                      } : p));
                    } else {
                      const id = await api.oidc.create(oidcName, oidcSlug, oidcIssuer, oidcClientId, oidcClientSecret, oidcScopes, userId || "anon");
                      setOidcProviders(prev => [...prev, {
                        id, name: oidcName, slug: oidcSlug, issuer_url: oidcIssuer,
                        client_id: oidcClientId, client_secret: oidcClientSecret, scopes: oidcScopes,
                        is_active: true, created_by: userId || "anon", created_at: Date.now(), updated_at: Date.now(),
                      }]);
                    }
                    setOidcDialogOpen(false);
                  } catch (e: any) { alert(String(e)); }
                }} disabled={!oidcName.trim() || !oidcSlug.trim() || !oidcIssuer.trim() || !oidcClientId.trim()}
                  className="h-8 px-4 rounded-md text-xs font-medium bg-primary text-white hover:bg-primary/90 disabled:opacity-50 transition-colors">
                  {editingOidc ? "Save" : "Add"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Main content */}
      <main className="flex-1 overflow-y-auto">
        <div className="md:hidden flex items-center gap-2 px-4 h-14 border-b border-border">
          <button onClick={() => setSidebarOpen(true)}><Menu className="h-5 w-5" /></button>
          <div className="w-6 h-6 rounded-md bg-gradient-to-br from-primary to-purple-600 flex items-center justify-center">
            <Library className="h-3 w-3 text-white" />
          </div>
          <span className="font-semibold text-sm">Spacetime Wiki</span>
        </div>

        <Routes>
          <Route path="/" element={<HomeView />} />
          <Route path="/new" element={<PageEditor userId={userId} />} />
          <Route path="/page/:id" element={<PageViewWrapper userId={userId} />} />
          <Route path="/page/:id/edit" element={<PageEditor userId={userId} />} />
          <Route path="/p/:slug" element={<SlugView />} />
          <Route path="/oauth/google/callback" element={<GoogleCallback />} />
          <Route path="/oauth/oidc/callback" element={<OidcCallback />} />
          <Route path="/login" element={<LoginView />} />
        </Routes>
      </main>

      {/* Command Palette Modal */}
      {paletteOpen && (
        <div className="fixed inset-0 z-50 flex items-start justify-center pt-[15vh] bg-black/60" onClick={closePalette}>
          <div className="w-full max-w-xl rounded-xl border border-border bg-card shadow-2xl overflow-hidden" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center gap-3 px-4 h-12 border-b border-border">
              <Search className="h-4 w-4 text-muted-foreground shrink-0" />
              <input
                type="text"
                value={paletteQuery}
                onChange={(e) => { setPaletteQuery(e.target.value); setPaletteIndex(0); }}
                placeholder="Search pages, collections, or actions..."
                autoFocus
                className="flex-1 h-full bg-transparent text-sm text-foreground placeholder:text-muted-foreground/50 outline-none border-none"
              />
              <kbd className="px-1.5 py-0.5 rounded bg-muted text-[10px] text-muted-foreground font-mono">esc</kbd>
            </div>
            <div className="max-h-[50vh] overflow-y-auto">
              {paletteItems.length === 0 && (
                <div className="px-4 py-6 text-center text-xs text-muted-foreground">No results for "{paletteQuery}"</div>
              )}
              {paletteItems.map((item, i) => (
                <button
                  key={item.type + (item.id || item.label)}
                  onClick={() => executePalette(i)}
                  className={cn(
                    "w-full flex items-center gap-3 px-4 py-2.5 text-left transition-colors",
                    i === paletteIndex ? "bg-primary/10" : "hover:bg-muted/50",
                  )}
                >
                  <span className="text-muted-foreground shrink-0">{item.icon}</span>
                  <div className="min-w-0 flex-1">
                    <div className="text-sm font-medium truncate">{item.label}</div>
                    <div className="text-[11px] text-muted-foreground">{item.subtitle}</div>
                  </div>
                  {item.type === "page" && <span className="text-[10px] text-muted-foreground/50">Page</span>}
                  {item.type === "collection" && <span className="text-[10px] text-muted-foreground/50">Collection</span>}
                </button>
              ))}
            </div>
            <div className="flex items-center gap-4 px-4 h-9 border-t border-border text-[10px] text-muted-foreground">
              <span>↑↓ navigate</span>
              <span>↵ open</span>
              <span>esc close</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Home View ───────────────────────────────────────────────────────────────

function HomeView() {
  const navigate = useNavigate();
  const [recentPages, setRecentPages] = useState<Page[]>([]);
  const [importing, setImporting] = useState(false);
  const importRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    api.pages.list().then((pages) => {
      setRecentPages(
        pages
          .filter((p) => p.status === "published" || p.status === "draft")
          .sort((a, b) => b.updated_at - a.updated_at)
          .slice(0, 10),
      );
    });
  }, []);

  const handleImportMD = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setImporting(true);
    try {
      const text = await file.text();
      const title = file.name.replace(/\.md$/i, "");
      const lines = text.split("\n");
      const content: any[] = [];
      let codeBlock: string[] = [];
      let inCode = false;
      for (const line of lines) {
        if (line.startsWith("```")) {
          if (inCode) { content.push({ type: "codeBlock", attrs: { language: "" }, content: [{ type: "text", text: codeBlock.join("\n") }] }); codeBlock = []; inCode = false; }
          else { inCode = true; }
        } else if (inCode) { codeBlock.push(line); }
        else if (line.startsWith("# ")) content.push({ type: "heading", attrs: { level: 1 }, content: [{ type: "text", text: line.slice(2) }] });
        else if (line.startsWith("## ")) content.push({ type: "heading", attrs: { level: 2 }, content: [{ type: "text", text: line.slice(3) }] });
        else if (line.startsWith("### ")) content.push({ type: "heading", attrs: { level: 3 }, content: [{ type: "text", text: line.slice(4) }] });
        else if (line.startsWith("- ")) content.push({ type: "bulletList", content: [{ type: "listItem", content: [{ type: "paragraph", content: [{ type: "text", text: line.slice(2) }] }] }] });
        else if (line.startsWith("> ")) content.push({ type: "blockquote", content: [{ type: "paragraph", content: [{ type: "text", text: line.slice(2) }] }] });
        else if (line.trim()) content.push({ type: "paragraph", content: [{ type: "text", text: line }] });
        else content.push({ type: "paragraph" });
      }
      const id = await api.pages.create(title, JSON.stringify({ type: "doc", content }), "", "", "anonymous");
      navigate(`/page/${id}`);
    } catch (err) { console.error(err); }
    finally { setImporting(false); e.target.value = ""; }
  };

  return (
    <div className="p-4 md:p-6 lg:p-8 space-y-6 max-w-4xl mx-auto">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Home</h1>
        <p className="text-sm text-muted-foreground mt-1">Welcome to Spacetime Wiki — your team's knowledge base.</p>
      </div>

      {recentPages.length > 0 && (
        <div className="space-y-3">
          <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Recently Updated</h2>
          <div className="grid gap-2">
            {recentPages.map((page) => (
              <button
                key={page.id}
                onClick={() => navigate(`/page/${page.id}`)}
                className="flex items-center gap-3 p-3 rounded-lg border border-border bg-card hover:bg-secondary transition-colors text-left"
              >
                <FileText className="h-4 w-4 text-muted-foreground shrink-0" />
                <div className="min-w-0 flex-1">
                  <div className="text-sm font-medium truncate">{page.title}</div>
                  <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
                    <span>Updated {timeAgo(page.updated_at)}</span>
                    {page.status === "draft" && <span className="text-yellow-500">· Draft</span>}
                    {page.status === "archived" && <span className="text-muted-foreground">· Archived</span>}
                  </div>
                </div>
              </button>
            ))}
          </div>
        </div>
      )}

      <div className="p-8 rounded-lg border border-border bg-card text-center">
        <FileText className="h-8 w-8 mx-auto text-muted-foreground/40 mb-3" />
        <h3 className="text-sm font-medium mb-1">Create your first page</h3>
        <p className="text-xs text-muted-foreground mb-3">Start documenting your knowledge.</p>
        <button
          onClick={() => navigate("/new")}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium bg-primary text-white hover:bg-primary/90 transition-colors"
        >
          <Plus className="h-3.5 w-3.5" /> New Page
        </button>
        <input ref={importRef} type="file" accept=".md,.txt" onChange={handleImportMD} className="hidden" />
        <button
          onClick={() => importRef.current?.click()}
          disabled={importing}
          className="ml-2 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium border border-border text-muted-foreground hover:text-foreground hover:bg-muted transition-colors disabled:opacity-50"
        >
          {importing ? <Loader2 className="h-3 w-3 animate-spin" /> : <Upload className="h-3 w-3" />}
          Import MD
        </button>
      </div>
    </div>
  );
}

// ─── Page View Wrapper ───────────────────────────────────────────────────────

function PageViewWrapper({ userId }: { userId: string | null }) {
  const { id } = useParams<{ id: string }>();
  if (!id) return null;
  return <PageView pageId={id} userId={userId} />;
}

// ─── Login View ──────────────────────────────────────────────────────────────

function GoogleCallback() {
  const navigate = useNavigate();
  const [status, setStatus] = useState("Completing sign-in...");
  
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const code = params.get("code");
    const error = params.get("error");
    if (error || !code) { setStatus(`Authentication failed: ${error || "No authorization code"}`); return; }
    
    const code_verifier = localStorage.getItem("sw_oauth_verifier") || "";
    localStorage.removeItem("sw_oauth_verifier");
    
    const GOOGLE_CLIENT_ID = localStorage.getItem("sw_google_client_id") || "";
    const redirectUri = `${window.location.origin}/oauth/google/callback`;
    
    (async () => {
      try {
        setStatus("Exchanging code...");
        const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
          method: "POST",
          headers: { "Content-Type": "application/x-www-form-urlencoded" },
          body: new URLSearchParams({
            client_id: GOOGLE_CLIENT_ID,
            code, code_verifier,
            grant_type: "authorization_code",
            redirect_uri: redirectUri,
          }),
        });
        const tokens = await tokenRes.json();
        if (tokens.error) { setStatus(`Token error: ${tokens.error_description || tokens.error}`); return; }
        
        setStatus("Fetching profile...");
        const userRes = await fetch("https://www.googleapis.com/oauth2/v3/userinfo", {
          headers: { Authorization: `Bearer ${tokens.access_token}` },
        });
        const profile = await userRes.json();
        if (!profile.email) { setStatus("Could not get email from Google"); return; }
        
        setStatus("Signing in...");
        // Try to log in with existing account
        const existing = await api.users.getByEmail(profile.email);
        if (existing) {
          localStorage.setItem("sw_user_id", existing.id);
        } else {
          // Auto-register with Google profile
          const id = "user_" + Math.random().toString(36).slice(2, 8);
          await callReducerLocal("register_user", [id, profile.name || profile.email.split("@")[0], profile.email, crypto.randomUUID(), "member"]);
          localStorage.setItem("sw_user_id", id);
        }
        navigate("/", { replace: true });
      } catch (err: any) {
        setStatus(`Error: ${err.message || err}`);
      }
    })();
  }, [navigate]);
  
  return <div className="flex items-center justify-center h-full"><div className="text-center"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground mx-auto mb-2" /><p className="text-xs text-muted-foreground">{status}</p></div></div>;
}

// ─── OIDC Callback ───────────────────────────────────────────────────────────

function OidcCallback() {
  const navigate = useNavigate();
  const [status, setStatus] = useState("Completing sign-in...");

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const code = params.get("code");
    const error = params.get("error");
    if (error || !code) { setStatus(`Authentication failed: ${error || "No authorization code"}`); return; }

    const code_verifier = localStorage.getItem("sw_oauth_verifier") || "";
    localStorage.removeItem("sw_oauth_verifier");
    const providerId = localStorage.getItem("sw_oidc_provider_id") || "";
    localStorage.removeItem("sw_oidc_provider_id");

    if (!providerId) { setStatus("No OIDC provider configured"); return; }

    (async () => {
      try {
        // Get provider config from STDB
        const provider = await api.oidc.get(providerId);
        if (!provider) { setStatus("OIDC provider not found"); return; }

        const issuer = provider.issuer_url.replace(/\/$/, "");
        const redirectUri = `${window.location.origin}/oauth/oidc/callback`;

        setStatus("Exchanging code...");

        // Fetch OIDC discovery to get token endpoint
        const discRes = await fetch(`${issuer}/.well-known/openid-configuration`);
        const discovery = await discRes.json();
        const tokenUrl = discovery.token_endpoint;
        const userinfoUrl = discovery.userinfo_endpoint;

        // Exchange code for tokens
        const body = new URLSearchParams({
          client_id: provider.client_id,
          code, code_verifier,
          grant_type: "authorization_code",
          redirect_uri: redirectUri,
        });
        if (provider.client_secret) {
          body.append("client_secret", provider.client_secret);
        }

        const tokenRes = await fetch(tokenUrl, {
          method: "POST",
          headers: { "Content-Type": "application/x-www-form-urlencoded" },
          body,
        });
        const tokens = await tokenRes.json();
        if (tokens.error) { setStatus(`Token error: ${tokens.error_description || tokens.error}`); return; }

        // Get user info from ID token or userinfo endpoint
        let email = "";
        let name = "";

        if (tokens.id_token) {
          // Decode JWT payload (base64)
          try {
            const payload = JSON.parse(atob(tokens.id_token.split(".")[1].replace(/-/g, "+").replace(/_/g, "/")));
            email = payload.email || "";
            name = payload.name || payload.preferred_username || payload.sub || "";
          } catch {}
        }

        if (!email && userinfoUrl) {
          setStatus("Fetching profile...");
          const userRes = await fetch(userinfoUrl, {
            headers: { Authorization: `Bearer ${tokens.access_token}` },
          });
          const profile = await userRes.json();
          email = profile.email || "";
          name = profile.name || profile.preferred_username || profile.sub || "";
        }

        if (!email) { setStatus("Could not get email from provider"); return; }

        setStatus("Signing in...");
        // Try to log in with existing account
        const existing = await api.users.getByEmail(email);
        if (existing) {
          localStorage.setItem("sw_user_id", existing.id);
        } else {
          // Auto-register with profile
          const id = "user_" + Math.random().toString(36).slice(2, 8);
          await callReducerLocal("register_user", [id, name || email.split("@")[0], email, crypto.randomUUID(), "member"]);
          localStorage.setItem("sw_user_id", id);
        }
        navigate("/", { replace: true });
      } catch (err: any) {
        setStatus(`Error: ${err.message || err}`);
      }
    })();
  }, [navigate]);

  return <div className="flex items-center justify-center h-full"><div className="text-center"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground mx-auto mb-2" /><p className="text-xs text-muted-foreground">{status}</p></div></div>;
}

async function callReducerLocal(reducer: string, args: unknown[]) {
  const DB_ID = "c2003d19339f9932811b3d54bf9b15e18ae48a47a8c8b7135a47367faa03481e";
  await fetch(`http://192.168.1.10:3001/v1/database/${DB_ID}/call/${reducer}`, {
    method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(args),
  });
}

function SlugView() {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const [error, setError] = useState("");
  
  useEffect(() => {
    if (!slug) return;
    api.pages.getBySlug(slug).then(page => {
      if (page) navigate(`/page/${page.id}`, { replace: true });
      else setError("Page not found");
    }).catch(() => setError("Page not found"));
  }, [slug, navigate]);
  
  if (error) return <div className="flex items-center justify-center h-full"><div className="text-center"><p className="text-sm font-semibold mb-1">404</p><p className="text-xs text-muted-foreground">{error}</p></div></div>;
  return <div className="flex items-center justify-center h-full"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>;
}

function LoginView() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [isRegister, setIsRegister] = useState(false);
  const [error, setError] = useState("");
  const [oidcProviders, setOidcProviders] = useState<OidcProvider[]>([]);

  // Load active OIDC providers
  useEffect(() => {
    api.oidc.listActive().then(setOidcProviders).catch(() => {});
  }, []);

  // Generic OIDC sign-in
  const handleOidcSignIn = (provider: OidcProvider) => {
    const code_verifier = Array.from(crypto.getRandomValues(new Uint8Array(32)))
      .map(b => "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-._~"[b % 66]).join("");
    crypto.subtle.digest("SHA-256", new TextEncoder().encode(code_verifier)).then(hash => {
      const code_challenge = btoa(String.fromCharCode(...new Uint8Array(hash)))
        .replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
      localStorage.setItem("sw_oauth_verifier", code_verifier);
      localStorage.setItem("sw_oidc_provider_id", provider.id);
      // Fetch OIDC discovery to get auth endpoint
      const issuer = provider.issuer_url.replace(/\/$/, "");
      fetch(`${issuer}/.well-known/openid-configuration`)
        .then(r => r.json())
        .then(discovery => {
          const authUrl = discovery.authorization_endpoint;
          const redirectUri = `${window.location.origin}/oauth/oidc/callback`;
          const scopes = encodeURIComponent(provider.scopes || "openid email profile");
          const url = `${authUrl}?client_id=${provider.client_id}&redirect_uri=${encodeURIComponent(redirectUri)}&response_type=code&scope=${scopes}&code_challenge=${code_challenge}&code_challenge_method=S256`;
          window.location.href = url;
        })
        .catch(() => {
          // Fallback: try well-known relative paths
          fetch(`${issuer}/.well-known/openid-configuration/`)
            .then(r => r.json())
            .then(discovery => {
              const authUrl = discovery.authorization_endpoint;
              const redirectUri = `${window.location.origin}/oauth/oidc/callback`;
              const scopes = encodeURIComponent(provider.scopes || "openid email profile");
              const url = `${authUrl}?client_id=${provider.client_id}&redirect_uri=${encodeURIComponent(redirectUri)}&response_type=code&scope=${scopes}&code_challenge=${code_challenge}&code_challenge_method=S256`;
              window.location.href = url;
            })
            .catch(() => {
              setError("Could not discover OIDC endpoints. Check the issuer URL.");
            });
        });
    });
  };

  // Google OAuth
  const handleGoogleSignIn = () => {
    const GOOGLE_CLIENT_ID = localStorage.getItem("sw_google_client_id") || "";
    if (!GOOGLE_CLIENT_ID) {
      setError("Google OAuth is not configured. Ask your admin to set a Google Client ID in the admin panel.");
      return;
    }
    const code_verifier = Array.from(crypto.getRandomValues(new Uint8Array(32)))
      .map(b => "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-._~"[b % 66]).join("");
    crypto.subtle.digest("SHA-256", new TextEncoder().encode(code_verifier)).then(hash => {
      const code_challenge = btoa(String.fromCharCode(...new Uint8Array(hash)))
        .replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
      localStorage.setItem("sw_oauth_verifier", code_verifier);
      const redirectUri = `${window.location.origin}/oauth/google/callback`;
      const url = `https://accounts.google.com/o/oauth2/v2/auth?client_id=${GOOGLE_CLIENT_ID}&redirect_uri=${encodeURIComponent(redirectUri)}&response_type=code&scope=openid%20email%20profile&code_challenge=${code_challenge}&code_challenge_method=S256`;
      window.location.href = url;
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    try {
      if (isRegister) await api.users.register(name, email, password, "member");
      const user = await api.users.login(email, password);
      if (!user) throw new Error("Login failed");
      localStorage.setItem("sw_user_id", user.id);
      navigate("/");
    } catch (err: any) { setError(String(err)); }
  };

  return (
    <div className="p-4 md:p-6 lg:p-8 max-w-md mx-auto">
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold">{isRegister ? "Create account" : "Sign in"}</h1>
          <p className="text-sm text-muted-foreground mt-1">
            {isRegister ? "Join your team's knowledge base." : "Welcome back to Spacetime Wiki."}
          </p>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4">
          {isRegister && (
            <div>
              <label className="block text-xs font-medium mb-1">Name</label>
              <input type="text" value={name} onChange={(e) => setName(e.target.value)}
                className="w-full h-9 px-3 rounded-md border border-border bg-card text-sm focus:outline-none focus:ring-1 focus:ring-primary/50" required />
            </div>
          )}
          <div>
            <label className="block text-xs font-medium mb-1">Email</label>
            <input type="email" value={email} onChange={(e) => setEmail(e.target.value)}
              className="w-full h-9 px-3 rounded-md border border-border bg-card text-sm focus:outline-none focus:ring-1 focus:ring-primary/50" required />
          </div>
          <div>
            <label className="block text-xs font-medium mb-1">Password</label>
            <input type="password" value={password} onChange={(e) => setPassword(e.target.value)}
              className="w-full h-9 px-3 rounded-md border border-border bg-card text-sm focus:outline-none focus:ring-1 focus:ring-primary/50" required />
          </div>
          {error && <div className="text-xs text-red-400 bg-red-500/10 px-3 py-2 rounded-md">{error}</div>}
          <button type="submit" className="w-full h-9 rounded-md bg-primary text-white text-sm font-medium hover:bg-primary/90 transition-colors">
            {isRegister ? "Create account" : "Sign in"}
          </button>
          <div className="relative my-4">
            <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-border"></div></div>
            <div className="relative flex justify-center text-xs"><span className="bg-background px-2 text-muted-foreground">or</span></div>
          </div>
          {/* OIDC SSO buttons */}
          {oidcProviders.map(p => (
            <button key={p.id} onClick={() => handleOidcSignIn(p)}
              className="w-full h-9 rounded-md border border-border bg-card text-sm font-medium hover:bg-muted transition-colors flex items-center justify-center gap-2">
              <svg className="h-4 w-4 text-muted-foreground" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/></svg>
              Sign in with {p.name}
            </button>
          ))}
          <button onClick={handleGoogleSignIn} className="w-full h-9 rounded-md border border-border bg-card text-sm font-medium hover:bg-muted transition-colors flex items-center justify-center gap-2">
            <svg className="h-4 w-4" viewBox="0 0 24 24"><path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z"/><path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/><path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/><path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/></svg>
            Sign in with Google
          </button>
        </form>
        <p className="text-xs text-muted-foreground text-center">
          {isRegister ? "Already have an account?" : "Don't have an account?"}{" "}
          <button onClick={() => setIsRegister(!isRegister)} className="text-primary hover:underline">
            {isRegister ? "Sign in" : "Register"}
          </button>
        </p>
      </div>
    </div>
  );
}

// ─── App ─────────────────────────────────────────────────────────────────────

function ApiKeySection({ userId }: { userId: string | null }) {
  const [keys, setKeys] = useState<ApiKey[]>([]);
  const [keyName, setKeyName] = useState("");
  const [keyExpiry, setKeyExpiry] = useState(0);
  const [newKey, setNewKey] = useState<{ key: string; prefix: string } | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (userId) api.apiKeys.list(userId).then(setKeys).catch(() => {});
  }, [userId]);

  const handleCreate = async () => {
    if (!keyName.trim() || !userId) return;
    setLoading(true);
    try {
      // Generate a key client-side
      const arr = new Uint8Array(32);
      crypto.getRandomValues(arr);
      const key = "sw_" + Array.from(arr).map(b => b.toString(16).padStart(2, "0")).join("");
      const prefix = key.slice(0, 12);
      const hash = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(key))
        .then(buf => Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, "0")).join(""));
      await api.apiKeys.create(userId, keyName, hash, prefix, keyExpiry);
      setNewKey({ key, prefix });
      setKeyName("");
      const updated = await api.apiKeys.list(userId);
      setKeys(updated);
    } catch (e) { alert(String(e)); }
    finally { setLoading(false); }
  };

  return (
    <div className="space-y-2">
      {keys.map(k => (
        <div key={k.id} className="flex items-center gap-2 px-3 py-1.5 rounded-md border border-border text-xs">
          <Key className="h-3 w-3 text-muted-foreground shrink-0" />
          <span className="flex-1 truncate">{k.name}</span>
          <span className="text-[10px] text-muted-foreground/60 font-mono">{k.key_prefix}...</span>
          <button onClick={async () => { await api.apiKeys.revoke(k.id); setKeys(prev => prev.filter(x => x.id !== k.id)); }}
            className="text-red-400 hover:text-red-300 text-[10px]">Revoke</button>
        </div>
      ))}
      {newKey && (
        <div className="p-2 rounded-md bg-green-500/10 border border-green-500/20">
          <p className="text-[10px] text-green-500 font-medium mb-1">New API key created — copy it now:</p>
          <input readOnly value={newKey.key} onClick={(e) => (e.target as HTMLInputElement).select()}
            className="w-full h-7 px-2 rounded border border-border bg-[#0a0a0a] text-[10px] font-mono text-foreground" />
          <p className="text-[10px] text-muted-foreground/60 mt-1">This key won't be shown again.</p>
        </div>
      )}
      <div className="flex gap-2">
        <input value={keyName} onChange={(e) => setKeyName(e.target.value)} placeholder="Key name"
          className="flex-1 h-7 px-2 rounded-md border border-border bg-[#0a0a0a] text-xs focus:outline-none focus:ring-1 focus:ring-primary/50" />
        <input type="number" value={keyExpiry} onChange={(e) => setKeyExpiry(parseInt(e.target.value) || 0)} min={0} placeholder="Days"
          className="w-14 h-7 px-2 rounded-md border border-border bg-[#0a0a0a] text-xs focus:outline-none focus:ring-1 focus:ring-primary/50" />
        <button onClick={handleCreate} disabled={loading}
          className="h-7 px-3 rounded-md text-xs font-medium bg-primary text-white hover:bg-primary/90 disabled:opacity-50">
          {loading ? <Loader2 className="h-3 w-3 animate-spin" /> : "Create"}
        </button>
      </div>
    </div>
  );
}

// ─── Export helpers (duplicated from PageView to avoid export dependency) ──

function tiptapToMarkdown(doc: any): string {
  const lines: string[] = [];
  function walk(node: any, depth = 0) {
    if (!node) return;
    if (node.type === "doc" || node.type === "tableRow" || node.type === "tableHeader") {
      node.content?.forEach((c: any) => walk(c, depth));
    } else if (node.type === "paragraph") {
      let text = "";
      node.content?.forEach((c: any) => {
        if (c.type === "text") {
          let t = c.text || "";
          if (c.marks) {
            c.marks.forEach((m: any) => {
              if (m.type === "bold") t = `**${t}**`;
              if (m.type === "italic") t = `_${t}_`;
              if (m.type === "strike") t = `~~${t}~~`;
              if (m.type === "code") t = `\`${t}\``;
              if (m.type === "link") t = `[${t}](${m.attrs?.href || ""})`;
            });
          }
          text += t;
        } else if (c.type === "image") {
          text += `![${c.attrs?.alt || ""}](${c.attrs?.src || ""})`;
        } else if (c.type === "hardBreak") {
          text += "\n";
        }
      });
      lines.push(text);
      lines.push("");
    } else if (node.type === "heading") {
      const level = node.attrs?.level || 1;
      let text = "";
      node.content?.forEach((c: any) => { if (c.text) text += c.text; });
      lines.push(`${"#".repeat(level)} ${text}`);
      lines.push("");
    } else if (node.type === "bulletList" || node.type === "orderedList") {
      node.content?.forEach((c: any) => walk(c, depth));
    } else if (node.type === "listItem") {
      let text = "";
      node.content?.forEach((c: any) => {
        if (c.type === "paragraph") {
          c.content?.forEach((cc: any) => {
            if (cc.type === "text") {
              let t = cc.text || "";
              if (cc.marks) {
                cc.marks.forEach((m: any) => {
                  if (m.type === "bold") t = `**${t}**`;
                  if (m.type === "italic") t = `_${t}_`;
                  if (m.type === "code") t = `\`${t}\``;
                  if (m.type === "link") t = `[${t}](${m.attrs?.href || ""})`;
                });
              }
              text += t;
            }
          });
        }
      });
      lines.push(`- ${text}`);
    } else if (node.type === "codeBlock") {
      let text = "";
      node.content?.forEach((c: any) => { if (c.text) text += c.text; });
      const lang = node.attrs?.language || "";
      lines.push(`\`\`\`${lang}`);
      lines.push(text);
      lines.push("```");
      lines.push("");
    } else if (node.type === "blockquote") {
      node.content?.forEach((c: any) => {
        const before = lines.length;
        walk(c, depth + 1);
        for (let i = before; i < lines.length; i++) {
          if (lines[i]) lines[i] = `> ${lines[i]}`;
        }
      });
    } else if (node.type === "horizontalRule") {
      lines.push("---");
      lines.push("");
    } else if (node.type === "callout") {
      const ctype = node.attrs?.type || "info";
      lines.push(`> [!${ctype.toUpperCase()}]`);
      node.content?.forEach((c: any) => walk(c, depth + 1));
      lines.push("");
    } else if (node.type === "taskList") {
      node.content?.forEach((c: any) => walk(c, depth));
    } else if (node.type === "taskItem") {
      const checked = node.attrs?.checked ? "x" : " ";
      let text = "";
      node.content?.forEach((c: any) => {
        if (c.type === "paragraph") {
          c.content?.forEach((cc: any) => { if (cc.text) text += cc.text; });
        }
      });
      lines.push(`- [${checked}] ${text}`);
    } else if (node.type === "table") {
      const rows: string[][] = [];
      node.content?.forEach((row: any) => {
        const cells: string[] = [];
        row.content?.forEach((cell: any) => {
          let text = "";
          cell.content?.forEach((p: any) => {
            p.content?.forEach((cc: any) => { if (cc.text) text += cc.text; });
          });
          cells.push(text);
        });
        rows.push(cells);
      });
      if (rows.length > 0) {
        const colCount = rows[0].length;
        rows.forEach((row, i) => {
          lines.push("| " + row.join(" | ") + " |");
          if (i === 0) lines.push("| " + "---".repeat(colCount) + " |");
        });
        lines.push("");
      }
    } else {
      node.content?.forEach((c: any) => walk(c, depth));
    }
  }
  walk(doc);
  return lines.join("\n").trim();
}

function tiptapToHTML(doc: any): string {
  if (!doc || !doc.content) return "";
  let html = "";
  for (const node of doc.content) {
    switch (node.type) {
      case "heading": {
        const level = node.attrs?.level || 1;
        html += `<h${level}>${node.content?.map((n: any) => n.text || "").join("") || ""}</h${level}>\n`;
        break;
      }
      case "paragraph":
        html += `<p>${node.content?.map((n: any) => n.text || "").join("") || ""}</p>\n`;
        break;
      case "bulletList":
        html += "<ul>\n";
        for (const item of node.content || []) {
          html += `<li>${item.content?.map((n: any) => n.content?.map((m: any) => m.text || "").join("") || n.text || "").join("") || ""}</li>\n`;
        }
        html += "</ul>\n";
        break;
      case "orderedList":
        html += "<ol>\n";
        for (const item of node.content || []) {
          html += `<li>${item.content?.map((n: any) => n.content?.map((m: any) => m.text || "").join("") || n.text || "").join("") || ""}</li>\n`;
        }
        html += "</ol>\n";
        break;
      case "codeBlock":
        html += `<pre><code>${node.content?.map((n: any) => n.text || "").join("") || ""}</code></pre>\n`;
        break;
      case "blockquote": {
        const qText = node.content?.map((n: any) => n.content?.map((m: any) => m.text || "").join("") || "").join("") || "";
        html += `<blockquote>${qText}</blockquote>\n`;
        break;
      }
      case "horizontalRule":
        html += "<hr />\n";
        break;
      case "callout": {
        const ctype = node.attrs?.type || "info";
        const colorClass = ctype === "warning" ? "border-amber-500 bg-amber-50" :
          ctype === "tip" ? "border-emerald-500 bg-emerald-50" :
          ctype === "danger" ? "border-red-500 bg-red-50" :
          "border-blue-500 bg-blue-50";
        const icon = ctype === "warning" ? "⚠️" : ctype === "tip" ? "💡" : ctype === "danger" ? "🚨" : "ℹ️";
        html += `<div class="callout ${colorClass}" style="border-left:4px solid;padding:12px;margin:12px 0;border-radius:6px">`;
        html += `<div style="display:flex;align-items:center;gap:8px;margin-bottom:4px;font-size:12px;font-weight:600;text-transform:uppercase">`;
        html += `<span>${icon}</span><span>${ctype}</span></div>`;
        html += `<div>${node.content?.map((n: any) => n.content?.map((m: any) => m.text || "").join("") || n.text || "").join("") || ""}</div></div>\n`;
        break;
      }
      case "image":
        html += `<img src="${node.attrs?.src || ""}" alt="${node.attrs?.alt || ""}" />\n`;
        break;
      default:
        if (node.text) html += node.text;
        break;
    }
  }
  return html;
}

// ─── Bulk Export ──────────────────────────────────────────────────────────────

function BulkExport() {
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);
  const [allPages, setAllPages] = useState<Page[]>([]);
  const [collections, setCollections] = useState<Collection[]>([]);
  const [selectedColId, setSelectedColId] = useState<string>("__all");
  const [exportFormat, setExportFormat] = useState<"md" | "html">("md");

  useEffect(() => {
    (async () => {
      try {
        const [pages, cols] = await Promise.all([
          api.pages.list(),
          api.collections.list(),
        ]);
        setAllPages(pages);
        setCollections(cols);
      } catch (e) {
        console.error("Failed to load data for export:", e);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const filteredPages = selectedColId === "__all"
    ? allPages
    : allPages.filter((p) => p.collection_id === selectedColId);

  const handleBulkExport = async () => {
    setExporting(true);
    try {
      const zip = new JSZip();
      let exported = 0;

      for (const page of filteredPages) {
        const safeName = page.title.replace(/[^a-z0-9]/gi, "_").slice(0, 64) || page.id.slice(0, 12);
        try {
          const json = JSON.parse(page.content || "{}");
          if (exportFormat === "md") {
            const md = tiptapToMarkdown(json);
            zip.file(`${safeName}/${safeName}.md`, md);
          } else {
            const html = tiptapToHTML(json);
            const fullHtml = `<!DOCTYPE html>
<html><head><meta charset="UTF-8"><title>${page.title}</title></head>
<body>${html}</body></html>`;
            zip.file(`${safeName}/${safeName}.html`, fullHtml);
          }
        } catch {
          zip.file(`${safeName}/${safeName}.txt`, page.content || "");
        }

        try {
          const atts = await api.attachments.list(page.id);
          for (const att of atts as any[]) {
            const filename = att[2] || "file";
            const base64Data = att[5] || "";
            if (base64Data) {
              zip.file(`${safeName}/attachments/${filename}`, base64Data, { base64: true });
            }
          }
        } catch { /* no attachments */ }

        zip.file(`${safeName}/${safeName}.meta.json`, JSON.stringify({
          title: page.title, slug: page.slug, icon: page.icon,
          color: page.color, status: page.status,
          collection_id: page.collection_id,
          created_at: page.created_at, updated_at: page.updated_at,
        }, null, 2));

        exported++;
      }

      const indexEntries = filteredPages.map((p) => ({
        title: p.title, slug: p.slug, status: p.status,
        collection: collections.find((c) => c.id === p.collection_id)?.name || "",
        updated_at: p.updated_at,
      }));
      zip.file("index.json", JSON.stringify(indexEntries, null, 2));

      const blob = await zip.generateAsync({ type: "blob" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `wiki-export-${new Date().toISOString().slice(0, 10)}.zip`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error("Bulk export failed:", err);
    } finally {
      setExporting(false);
    }
  };

  if (loading) {
    return <div className="flex items-center justify-center py-8"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>;
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Export Wiki Pages</p>
      </div>

      <div>
        <label className="text-[10px] text-muted-foreground/60 font-medium mb-1 block">Collection</label>
        <select
          value={selectedColId}
          onChange={(e) => setSelectedColId(e.target.value)}
          className="w-full h-8 px-2 rounded-md border border-border bg-[#0a0a0a] text-xs focus:outline-none focus:ring-1 focus:ring-primary/50"
        >
          <option value="__all">All collections ({allPages.length} pages)</option>
          {collections.map((c) => {
            const count = allPages.filter((p) => p.collection_id === c.id).length;
            return <option key={c.id} value={c.id}>{c.icon || "📁"} {c.name} ({count})</option>;
          })}
          <option value="uncategorized">Uncategorized ({allPages.filter((p) => !p.collection_id || p.collection_id === "").length})</option>
        </select>
      </div>

      <div>
        <label className="text-[10px] text-muted-foreground/60 font-medium mb-1 block">Format</label>
        <div className="flex gap-2">
          <button
            onClick={() => setExportFormat("md")}
            className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
              exportFormat === "md"
                ? "bg-primary/10 text-primary border border-primary/20"
                : "border border-border text-muted-foreground hover:text-foreground hover:bg-muted"
            }`}
          >
            Markdown
          </button>
          <button
            onClick={() => setExportFormat("html")}
            className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
              exportFormat === "html"
                ? "bg-primary/10 text-primary border border-primary/20"
                : "border border-border text-muted-foreground hover:text-foreground hover:bg-muted"
            }`}
          >
            HTML
          </button>
        </div>
      </div>

      <div className="p-3 rounded-md border border-border bg-muted/10">
        <p className="text-xs text-muted-foreground">
          Exporting <strong className="text-foreground">{filteredPages.length} pages</strong>
          {exportFormat === "md" ? " as Markdown" : " as HTML"}
          {selectedColId !== "__all" && (
            <> from <strong className="text-foreground">{collections.find((c) => c.id === selectedColId)?.name || "Uncategorized"}</strong></>
          )}
        </p>
        <div className="mt-2 max-h-32 overflow-y-auto space-y-0.5">
          {filteredPages.slice(0, 20).map((p) => (
            <div key={p.id} className="flex items-center gap-2 text-[10px] text-muted-foreground">
              <FileText className="h-3 w-3 shrink-0" />
              <span className="truncate">{p.title}</span>
              {p.collection_id && (
                <span className="text-muted-foreground/40 shrink-0">{collections.find((c) => c.id === p.collection_id)?.name}</span>
              )}
            </div>
          ))}
          {filteredPages.length > 20 && (
            <p className="text-[10px] text-muted-foreground/50 pt-1">...and {filteredPages.length - 20} more</p>
          )}
        </div>
      </div>

      <button
        onClick={handleBulkExport}
        disabled={exporting || filteredPages.length === 0}
        className="w-full h-9 rounded-md text-xs font-medium bg-primary text-white hover:bg-primary/90 disabled:opacity-50 flex items-center justify-center gap-2 transition-colors"
      >
        {exporting ? (
          <><Loader2 className="h-3.5 w-3.5 animate-spin" /> Exporting...</>
        ) : (
          <><Download className="h-3.5 w-3.5" /> Export ZIP ({filteredPages.length} pages)</>
        )}
      </button>
    </div>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AppLayout />
    </BrowserRouter>
  );
}
