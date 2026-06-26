import { useState, useEffect, useCallback, useRef } from "react";
import {
  BrowserRouter, Routes, Route, useNavigate, useParams, useLocation,
} from "react-router-dom";
import JSZip from "jszip";
import {
  FileText, Search, Plus, Hash, BookOpen, ChevronDown, ChevronRight, Menu, X, Library,
  MoreHorizontal, Pencil, FolderPlus, Trash2, Copy, Archive, Star, History, Edit3,
  Upload, Loader2, Shield, Link2, RefreshCw, Key, LayoutTemplate, Users, Send, Pin, Download,
  Sun, Moon, Keyboard, Eye, CheckSquare, Square, Tags, MessageSquare, Package,
} from "lucide-react";
import { api, Page, Collection, ApiKey, OidcProvider, SamlProvider, usePagesSubscription, useCollectionsSubscription } from "./lib/api";
import { cn, timeAgo } from "./lib/utils";
import { connectSubscriptions, disconnectSubscriptions, defaultSubscriptionManager } from "./lib/subscriptions";
import { PageEditor } from "./pages/PageEditor";
import { PageView } from "./pages/PageView";
import { SearchFilters, EMPTY_FILTERS, type SearchFilterState } from "./components/SearchFilters";
import { WebhookSettings } from "./components/WebhookSettings";
import { TemplatePicker } from "./components/TemplatePicker";
import { KeyboardShortcuts } from "./components/KeyboardShortcuts";
import { ToastProvider, useToast, initGlobalToast, showToast } from "./components/Toast";
import { LanguageSwitcher } from "./components/LanguageSwitcher";

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
  const [pageLimits, setPageLimits] = useState<Record<string, number>>({});
  const PAGE_LIMIT = 50;
  const [loading, setLoading] = useState(true);
  const [userId, setUserId] = useState<string | null>(null);

  // Batch selection state
  const [selectedPageIds, setSelectedPageIds] = useState<Set<string>>(new Set());
  const [batchTagOpen, setBatchTagOpen] = useState(false);
  const [batchTagName, setBatchTagName] = useState("");
  const [batchTagValue, setBatchTagValue] = useState("");
  const [batchMoveOpen, setBatchMoveOpen] = useState(false);

  // Collection page sort modes (stored in localStorage)
  const COLLECTION_SORT_KEY = "sw_collection_sort";
  const [collectionSortModes, setCollectionSortModes] = useState<Record<string, string>>(() => {
    try { return JSON.parse(localStorage.getItem(COLLECTION_SORT_KEY) || "{}"); }
    catch { return {}; }
  });
  const [colSortMode, setColSortMode] = useState("manual");

  const sidebarNavRef = useRef<HTMLDivElement>(null);

  const saveCollectionSortMode = (colId: string, mode: string) => {
    const updated = { ...collectionSortModes, [colId]: mode };
    setCollectionSortModes(updated);
    try { localStorage.setItem(COLLECTION_SORT_KEY, JSON.stringify(updated)); } catch {}
  };

  // Collection dialog state
  const [colDialogOpen, setColDialogOpen] = useState(false);
  const [editingCol, setEditingCol] = useState<Collection | null>(null);
  const [colName, setColName] = useState("");
  const [colDesc, setColDesc] = useState("");
  const [colIcon, setColIcon] = useState("");
  const [colColor, setColColor] = useState("");

  // Context menu state
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number; colId?: string; pageId?: string } | null>(null);

  // Trash state
  const [trashPages, setTrashPages] = useState<Page[]>([]);
  const [trashLoading, setTrashLoading] = useState(false);

  // Admin state
  const [adminOpen, setAdminOpen] = useState(false);
  const [allUsers, setAllUsers] = useState<{ id: string; name: string; email: string; role: string }[]>([]);
  const [adminTab, setAdminTab] = useState<"users" | "groups" | "webhooks" | "sso" | "settings" | "features" | "export">("users");

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

  // SAML provider state
  const [samlProviders, setSamlProviders] = useState<SamlProvider[]>([]);
  const [samlDialogOpen, setSamlDialogOpen] = useState(false);
  const [editingSaml, setEditingSaml] = useState<SamlProvider | null>(null);
  const [samlName, setSamlName] = useState("");
  const [samlSlug, setSamlSlug] = useState("");
  const [samlEntityId, setSamlEntityId] = useState("");
  const [samlSsoUrl, setSamlSsoUrl] = useState("");
  const [samlCert, setSamlCert] = useState("");
  const [samlNameIdFmt, setSamlNameIdFmt] = useState("urn:oasis:names:tc:SAML:1.1:nameid-format:emailAddress");
  const [samlAttrMapping, setSamlAttrMapping] = useState('{"email":"email","name":"name"}');
  const [samlAutoRegister, setSamlAutoRegister] = useState(true);

  // OAuth state (login page)
  const [shareDialog, setShareDialog] = useState<{ pageId: string; pageTitle: string } | null>(null);
  const [sharePassword, setSharePassword] = useState("");
  const [shareDays, setShareDays] = useState(0);
  const [shareUrl, setShareUrl] = useState("");
  const [shareLinks, setShareLinks] = useState<{ id: string; token: string; expires_at: number; visit_count: number; password_hash: string }[]>([]);
  const [templatePickerOpen, setTemplatePickerOpen] = useState(false);
  // Theme toggle
  const [theme, setTheme] = useState<"dark" | "light">(() => {
    return (localStorage.getItem("sw_theme") as "dark" | "light") || "dark";
  });

  // Toast notifications
  const { addToast } = useToast();

  // Initialize global toast for use outside React components
  useEffect(() => {
    initGlobalToast(addToast);
  }, [addToast]);

  // ─── Toast: STDB connection state changes ────────────────────────────────
  const [prevConnected, setPrevConnected] = useState(false);
  useEffect(() => {
    const unsub = defaultSubscriptionManager.onStateChange((state) => {
      if (state === "connected" && !prevConnected) {
        showToast({ type: "success", title: "Connected", message: "Real-time updates active", duration: 3000 });
      }
      if (state === "connected") {
        setPrevConnected(true);
      }
      if (state === "reconnecting") {
        showToast({ type: "warning", title: "Reconnecting...", message: "Trying to restore real-time connection", duration: 3000 });
      }
    });
    return () => unsub();
  }, [prevConnected]);

  // ─── Toast: Comment notifications (when on a different page) ─────────────
  // Monitored via the comments subscription in PageView (handled there)

  // Import MD state
  const importRef = useRef<HTMLInputElement>(null);
  const [importing, setImporting] = useState(false);
  const notionImportRef = useRef<HTMLInputElement>(null);
  const [importingNotion, setImportingNotion] = useState(false);

  // Sidebar swipe-to-close refs (mobile)
  const touchStartRef = useRef(0);
  const sidebarDragRef = useRef(false);
  const sidebarElRef = useRef<HTMLDivElement>(null);
  const sidebarTouchDelta = useRef(0);
  const SIDEBAR_W = 288; // w-72 = 18rem

  // Sidebar drag progress → overlay opacity
  const [sidebarOverlayVisible, setSidebarOverlayVisible] = useState(false);
  const sidebarOverlayRef = useRef<HTMLDivElement>(null);

  // Apply theme class on mount and on change
  useEffect(() => {
    document.documentElement.classList.toggle("light-theme", theme === "light");
    localStorage.setItem("sw_theme", theme);
  }, [theme]);

  const [shortcutsOpen, setShortcutsOpen] = useState(false);

  // Global ? key opens shortcuts
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "?" && !e.metaKey && !e.ctrlKey && !e.altKey) {
        if (document.activeElement?.tagName !== "INPUT" && document.activeElement?.tagName !== "TEXTAREA") {
          e.preventDefault();
          setShortcutsOpen(true);
        }
      }
      if (e.key === "Escape") setShortcutsOpen(false);
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);

  useEffect(() => {
    setUserId(localStorage.getItem("sw_user_id"));
  }, [location.pathname]);

  // ─── Real-time subscriptions ────────────────────────────────────────────
  // Replace polling-based loadData() with STDB WebSocket subscriptions
  // for real-time updates across browser tabs/users

  // Connect on mount, disconnect on unmount
  useEffect(() => {
    connectSubscriptions();
    return () => { disconnectSubscriptions(); };
  }, []);

  // Subscribe to pages (real-time)
  const { rows: subPages, connected: pagesConnected } = usePagesSubscription();
  // Subscribe to collections (real-time)
  const { rows: subCollections, connected: colsConnected } = useCollectionsSubscription();

  // Sync subscription data to local state
  useEffect(() => {
    setPages(subPages);
  }, [subPages]);

  useEffect(() => {
    setCollections(subCollections);
  }, [subCollections]);

  // Stop loading once we have data from either source
  useEffect(() => {
    if ((pagesConnected || colsConnected) && (subPages.length > 0 || subCollections.length > 0)) {
      setLoading(false);
    }
  }, [pagesConnected, colsConnected, subPages.length, subCollections.length]);

  // ─── Toast: Page updates from other users via subscriptions ──────────────
  const prevPagesRef = useRef<Page[]>([]);
  useEffect(() => {
    if (!pagesConnected) return;
    const prev = prevPagesRef.current;
    if (prev.length > 0 && subPages.length > 0) {
      const myId = localStorage.getItem("sw_user_id") || "";
      for (const page of subPages) {
        const was = prev.find((p) => p.id === page.id);
        if (!was && page.created_by !== myId) {
          showToast({
            type: "info",
            title: "New page created",
            message: `"${page.title}" was added`,
            duration: 5000,
            action: { label: "Open", onClick: () => window.location.assign(`/page/${page.id}`) },
          });
        } else if (was && was.updated_at !== page.updated_at && page.updated_by !== myId && page.status !== "deleted") {
          showToast({
            type: "info",
            title: "Page updated",
            message: `"${page.title}" was modified`,
            duration: 4000,
            action: { label: "Open", onClick: () => window.location.assign(`/page/${page.id}`) },
          });
        }
      }
    }
    prevPagesRef.current = subPages;
  }, [subPages, pagesConnected]);

  // Fallback: if subscriptions never connect after 5s, load via HTTP
  useEffect(() => {
    const timer = setTimeout(async () => {
      if (loading) {
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
      }
    }, 5000);
    return () => clearTimeout(timer);
  }, [loading]);

  // Manual data refresh for after CRUD operations (as backup to subscriptions)
  const refreshData = useCallback(async () => {
    try {
      const [cols, allPages] = await Promise.all([
        api.collections.list(),
        api.pages.list(),
      ]);
      setCollections(cols);
      setPages(allPages);
    } catch (e) {
      console.error("Failed to refresh data:", e);
    }
  }, []);
  
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
  }, [searchQuery, searchFilters]);

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
  // Sort pages within each collection: pinned first, then by sort_order or preference
  for (const cid of Object.keys(pagesByCollection)) {
    const sortMode = collectionSortModes[cid] || "manual";
    pagesByCollection[cid].sort((a, b) => {
      if (a.is_pinned && !b.is_pinned) return -1;
      if (!a.is_pinned && b.is_pinned) return 1;
      if (sortMode === "title-asc") return a.title.localeCompare(b.title);
      if (sortMode === "title-desc") return b.title.localeCompare(a.title);
      if (sortMode === "created-asc") return a.created_at - b.created_at;
      if (sortMode === "created-desc") return b.created_at - a.created_at;
      if (sortMode === "updated-asc") return a.updated_at - b.updated_at;
      if (sortMode === "updated-desc") return b.updated_at - a.updated_at;
      return a.sort_order - b.sort_order;
    });
  }

  // Build collection tree for nested rendering
  const colChildren = new Map<string, Collection[]>();
  for (const col of collections) {
    const parentId = col.parent_id || "";
    if (!colChildren.has(parentId)) colChildren.set(parentId, []);
    colChildren.get(parentId)!.push(col);
  }
  function getTree(parentId: string): (Collection & { children: Collection[] })[] {
    return (colChildren.get(parentId) || []).map(col => ({
      ...col,
      children: getTree(col.id),
    }));
  }
  const collectionTree = getTree("");

  const isActive = (pageId: string) =>
    location.pathname === `/page/${pageId}` || location.pathname.startsWith(`/page/${pageId}`);

  // ─── Import/Export handlers ─────────────────────────────────────────────

  const handleImportMD = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setImporting(true);
    try {
      const text = await file.text();
      const title = file.name.replace(/\.md$/i, "");
      const doc = markdownToProseMirror(text);
      const id = await api.pages.create(title, JSON.stringify(doc), "", "", userId || "anonymous");
      addToast({ type: "success", title: "Imported", message: `"${title}" imported from Markdown`, duration: 4000 });
      navigate(`/page/${id}`);
    } catch (err) {
      addToast({ type: "error", title: "Import failed", message: String(err), duration: 5000 });
    }
    finally { setImporting(false); e.target.value = ""; }
  };

  const handleImportNotion = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setImportingNotion(true);
    try {
      const zip = await JSZip.loadAsync(file);
      // Collect all .md entries with their paths
      const mdEntries: { path: string; name: string; dir: string }[] = [];
      zip.forEach((path, entry) => {
        if (!entry.dir && path.endsWith(".md")) {
          const parts = path.split("/");
          mdEntries.push({
            path,
            name: (parts.pop() || "").replace(/\.md$/i, ""),
            dir: parts.join("/"),
          });
        }
      });
      if (mdEntries.length === 0) {
        addToast({ type: "error", title: "No pages found", message: "No Markdown files found in the ZIP archive", duration: 5000 });
        return;
      }
      // Sort by path depth (shallow first = parents created before children)
      mdEntries.sort((a, b) => a.path.split("/").length - b.path.split("/").length);
      // Track created page IDs by their directory prefix
      const pageIdsByDir: Record<string, string> = {};
      let created = 0;
      for (const entry of mdEntries) {
        const markdown = await zip.file(entry.path)?.async("string") || "";
        const doc = markdownToProseMirror(markdown);
        const parentId = pageIdsByDir[entry.dir] || "";
        const id = await api.pages.create(entry.name, JSON.stringify(doc), "", parentId, userId || "anonymous");
        // Map this entry's path prefix (without .md) so children can find it
        const childKey = entry.path.replace(/\.md$/, "");
        pageIdsByDir[childKey] = id;
        // Also map the directory name itself for sibling lookups
        pageIdsByDir[entry.dir + "/" + entry.name] = id;
        created++;
      }
      addToast({ type: "success", title: "Wiki imported", message: `Created ${created} pages from "${file.name}"`, duration: 4000 });
      // Reload pages
      api.pages.list().then(setPages).catch(() => {});
    } catch (err) {
      addToast({ type: "error", title: "Import failed", message: String(err), duration: 5000 });
    } finally {
      setImportingNotion(false);
      e.target.value = "";
    }
  };

  const handleExportPageMD = async (pageId: string) => {
    try {
      const page = pages.find(p => p.id === pageId);
      if (!page) return;
      const json = JSON.parse(page.content || "{}");
      const md = tiptapToMarkdown(json);
      const blob = new Blob([md], { type: "text/markdown" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${page.title || "Untitled"}.md`;
      a.click();
      URL.revokeObjectURL(url);
      addToast({ type: "success", title: "Exported", message: `"${page.title}" as Markdown`, duration: 3000 });
    } catch (err) { console.error(err); }
  };

  const handleExportPageHTML = async (pageId: string) => {
    try {
      const page = pages.find(p => p.id === pageId);
      if (!page) return;
      const json = JSON.parse(page.content || "{}");
      const md = tiptapToMarkdown(json);
      const html = `<!DOCTYPE html>\n<html>\n<head><meta charset="UTF-8"><title>${page.title || "Untitled"}</title><style>body{font-family:system-ui,sans-serif;max-width:800px;margin:40px auto;padding:0 20px;line-height:1.6;color:#333}h1,h2,h3{color:#111}pre{background:#f5f5f5;padding:16px;border-radius:4px;overflow-x:auto}code{background:#f0f0f0;padding:2px 4px;border-radius:2px}blockquote{border-left:3px solid #ddd;margin:0;padding-left:16px;color:#666}table{border-collapse:collapse;width:100%}td,th{border:1px solid #ddd;padding:8px}th{background:#f5f5f5}</style></head>\n<body>\n${md.split("\n").map(l => l.startsWith("#") ? `<h${l.match(/^#+/)?.[0]?.length || 1}>${l.replace(/^#+\s*/, "")}</h${l.match(/^#+/)?.[0]?.length || 1}>` : l.startsWith("- ") ? `<li>${l.slice(2)}</li>` : l.startsWith("> ") ? `<blockquote>${l.slice(2)}</blockquote>` : l.startsWith("```") ? "<pre><code>" : l === "```" ? "</code></pre>" : l ? `<p>${l}</p>` : "<br>").join("\n")}\n</body>\n</html>`;
      const blob = new Blob([html], { type: "text/html" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${page.title || "Untitled"}.html`;
      a.click();
      URL.revokeObjectURL(url);
      addToast({ type: "success", title: "Exported", message: `"${page.title}" as HTML`, duration: 3000 });
    } catch (err) { console.error(err); }
  };

  const handleDuplicatePage = async (pageId: string) => {
    try {
      const newId = await api.pages.duplicate(pageId, userId || "anonymous");
      addToast({ type: "success", title: "Page duplicated", duration: 3000 });
      navigate(`/page/${newId}/edit`);
    } catch (err) {
      addToast({ type: "error", title: "Failed to duplicate page", message: String(err), duration: 5000 });
    }
  };

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
    setColSortMode(collectionSortModes[col.id] || "manual");
    setColDialogOpen(true);
    setContextMenu(null);
  };

  const saveCollection = async () => {
    if (!colName.trim()) return;
    try {
      if (editingCol) {
        await api.collections.update(editingCol.id, colName, colDesc, colIcon, colColor);
        saveCollectionSortMode(editingCol.id, colSortMode);
        addToast({ type: "success", title: "Collection updated", duration: 3000 });
      } else {
        await api.collections.create(colName, colDesc, "", colIcon, colColor, userId || "anonymous");
        addToast({ type: "success", title: "Collection created", duration: 3000 });
      }
      setColDialogOpen(false);
      await refreshData();
    } catch (e) {
      addToast({ type: "error", title: "Failed to save collection", message: String(e), duration: 5000 });
    }
  };

  const deleteCollection = async (id: string) => {
    if (!confirm("Archive this collection and all its pages?")) return;
    setContextMenu(null);
    await api.collections.delete(id);
    await refreshData();
    addToast({ type: "success", title: "Collection archived", duration: 3000 });
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
    await refreshData();
    const page = trashPages.find(p => p.id === id);
    addToast({ type: "success", title: "Page restored", message: page?.title, duration: 3000 });
  };

  const permanentDelete = async (id: string) => {
    if (!confirm("Permanently delete this page? This cannot be undone.")) return;
    await api.pages.delete(id);
    setTrashPages(prev => prev.filter(p => p.id !== id));
    await refreshData();
    addToast({ type: "success", title: "Page permanently deleted", duration: 3000 });
  };

  const emptyTrash = async () => {
    if (!confirm("Permanently delete ALL pages in trash? This cannot be undone.")) return;
    await api.pages.emptyTrash();
    setTrashPages([]);
    await refreshData();
    addToast({ type: "success", title: "Trash emptied", duration: 3000 });
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
      const saml = await api.saml.list();
      setSamlProviders(saml);
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
      await refreshData();
      navigate(`/page/${newId}`);
    } catch (e) { alert(String(e)); }
  };

  // ─── Drag-and-drop ─────────────────────────────────────────────────────

  const [dragPageId, setDragPageId] = useState<string | null>(null);

  // ─── Command palette (Cmd+K) ────────────────────────────────────────────

  const [paletteOpen, setPaletteOpen] = useState(false);
  const [paletteQuery, setPaletteQuery] = useState("");
  const [paletteIndex, setPaletteIndex] = useState(0);

  // Drag-and-drop state
  const [dragOverTarget, setDragOverTarget] = useState<string | null>(null);

  const handleDragStart = (e: React.DragEvent, pageId: string) => {
    setDragPageId(pageId);
    e.dataTransfer.effectAllowed = "move";
    e.dataTransfer.setData("text/plain", pageId);
  };

  const handleDragOver = (e: React.DragEvent, pageId?: string) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
    if (pageId && pageId !== dragOverTarget) {
      setDragOverTarget(pageId);
    }
  };

  const handleDragLeave = () => {
    setDragOverTarget(null);
  };

  const handleDragEnd = () => {
    setDragPageId(null);
    setDragOverTarget(null);
  };

  const handleDropOnCollection = async (e: React.DragEvent, colId: string) => {
    e.preventDefault();
    const pageId = e.dataTransfer.getData("text/plain") || dragPageId;
    if (pageId && pageId !== colId) {
      await api.pages.move(pageId, colId, "");
      setDragPageId(null);
      await refreshData();
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
      await refreshData();
    }
  };

  const movePageToCollection = async (pageId: string, newColId: string) => {
    await api.pages.move(pageId, newColId, "");
    await refreshData();
  };

  // ─── Batch selection handlers ────────────────────────────────────────────

  const togglePageSelection = (pageId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    setSelectedPageIds(prev => {
      const next = new Set(prev);
      if (next.has(pageId)) next.delete(pageId);
      else next.add(pageId);
      return next;
    });
  };

  const clearSelection = () => setSelectedPageIds(new Set());

  // Cmd+click on a page row: toggle selection without navigating
  const handlePageClick = (pageId: string, e: React.MouseEvent) => {
    if (e.metaKey || e.ctrlKey) {
      togglePageSelection(pageId, e);
      return;
    }
    // If any items are selected, clicking without Cmd clears selection then navigates
    if (selectedPageIds.size > 0) {
      clearSelection();
    }
    navigate(`/page/${pageId}`);
  };

  const handleBatchArchive = async () => {
    if (selectedPageIds.size === 0) return;
    if (!confirm(`Archive ${selectedPageIds.size} page(s)?`)) return;
    await api.pages.batchSetStatus(Array.from(selectedPageIds), "archived");
    clearSelection();
    await refreshData();
    addToast({ type: "success", title: `Archived ${selectedPageIds.size} page(s)`, duration: 3000 });
  };

  const handleBatchDelete = async () => {
    if (selectedPageIds.size === 0) return;
    if (!confirm(`Move ${selectedPageIds.size} page(s) to trash?`)) return;
    await api.pages.batchSetStatus(Array.from(selectedPageIds), "deleted");
    clearSelection();
    await refreshData();
    addToast({ type: "success", title: `Moved ${selectedPageIds.size} page(s) to trash`, duration: 3000 });
  };

  const handleBatchMove = async (newColId: string) => {
    if (selectedPageIds.size === 0) return;
    await api.pages.batchMove(Array.from(selectedPageIds), newColId);
    setBatchMoveOpen(false);
    clearSelection();
    await refreshData();
    addToast({ type: "success", title: `Moved ${selectedPageIds.size} page(s)`, duration: 3000 });
  };

  const handleBatchTag = async () => {
    if (selectedPageIds.size === 0 || !batchTagName.trim()) return;
    await api.pages.batchAddTag(Array.from(selectedPageIds), batchTagName.trim(), batchTagValue.trim());
    setBatchTagOpen(false);
    setBatchTagName("");
    setBatchTagValue("");
    clearSelection();
    await refreshData();
    addToast({ type: "success", title: `Tagged ${selectedPageIds.size} page(s)`, duration: 3000 });
  };

  // ─── Command palette handlers ───────────────────────────────────────────

  const collectionLabel = (colId: string) => collections.find(c => c.id === colId)?.name || "";

  const closePalette = () => { setPaletteOpen(false); setPaletteQuery(""); setPaletteIndex(0); };

  const paletteItems = (() => {
    const q = paletteQuery.toLowerCase();
    const results: { type: "page" | "collection" | "action"; id?: string; label: string; subtitle: string; icon: React.ReactNode; action: () => void; shortcut?: string }[] = [];

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
      { label: "New page", subtitle: "Create a new document", icon: <Plus className="h-4 w-4" />, shortcut: "N", action: () => { closePalette(); navigate("/new"); } },
      { label: "New collection", subtitle: "Create a new collection", icon: <FolderPlus className="h-4 w-4" />, shortcut: "C", action: () => { closePalette(); openCreateCol(); } },
      { label: "New template", subtitle: "Save current page as a template", icon: <LayoutTemplate className="h-4 w-4" />, shortcut: "T", action: () => { closePalette(); setTemplatePickerOpen(true); } },
      { label: "Admin panel", subtitle: "Manage users, groups, settings", icon: <Shield className="h-4 w-4" />, shortcut: "A", action: () => { closePalette(); navigate("/admin"); } },
      { label: "Trash", subtitle: "View deleted pages", icon: <Trash2 className="h-4 w-4" />, shortcut: "G T", action: () => { closePalette(); navigate("/trash"); } },
      { label: "Favorites", subtitle: "Show starred pages", icon: <Star className="h-4 w-4" />, shortcut: "G F", action: () => { closePalette(); navigate("/favorites"); } },
      { label: "Keyboard shortcuts", subtitle: "View all keyboard shortcuts", icon: <Keyboard className="h-4 w-4" />, shortcut: "?", action: () => { closePalette(); setShortcutsOpen(true); } },
      { label: "Toggle dark mode", subtitle: `Switch to ${theme === "dark" ? "light" : "dark"} theme`, icon: theme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />, shortcut: "D", action: () => { closePalette(); setTheme(theme === "dark" ? "light" : "dark"); } },
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

  // ─── Recursive collection tree renderer ────────────────────────────────
  const renderColTree = (tree: (Collection & { children: Collection[] })[], depth: number) => {
    return tree.map((col) => {
      const colPages = pagesByCollection[col.id] || [];
      const expanded = expandedCollections.has(col.id);
      const childCount = col.children.length;
      return (
        <div key={col.id} className="mb-0.5">
          <div className="flex items-center group" style={depth > 0 ? { paddingLeft: depth * 16 } : undefined}>
            <button
              onClick={() => toggleCollection(col.id)}
              onContextMenu={(e) => { e.preventDefault(); setContextMenu({ x: e.clientX, y: e.clientY, colId: col.id }); }}
              onDragOver={(e) => { e.preventDefault(); setDragOverTarget(col.id); }}
              onDrop={(e) => handleDropOnCollection(e, col.id)}
              className="flex-1 flex items-center gap-1.5 px-2 py-1.5 rounded-md text-xs font-medium text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors text-left"
            >
              {expanded ? <ChevronDown className="h-3 w-3 shrink-0" /> : <ChevronRight className="h-3 w-3 shrink-0" />}
              <span className="text-xs">{col.icon || "📁"}</span>
              <span className="truncate">{col.name}</span>
              <span className="text-[10px] text-muted-foreground/50 ml-auto">{colPages.length}{childCount > 0 ? ` +${childCount}` : ""}</span>
            </button>
            <button onClick={(e) => { e.stopPropagation(); openEditCol(col); }} className="opacity-0 group-hover:opacity-100 p-1 rounded text-muted-foreground hover:text-foreground hover:bg-muted transition-all">
              <MoreHorizontal className="h-3 w-3" />
            </button>
          </div>
          {expanded && (
            <>
              {(col as any).children.length > 0 && renderColTree((col as any).children as any, depth + 1)}
              {colPages.slice(0, pageLimits[col.id] || PAGE_LIMIT).map((page) => (
                <div key={page.id} draggable onDragStart={(e) => handleDragStart(e, page.id)}
                  onDragOver={(e) => handleDragOver(e, page.id)} onDragLeave={handleDragLeave}
                  onDrop={(e) => handleDropOnPage(e, page.id)} onDragEnd={handleDragEnd}
                  className={cn("w-full flex items-center gap-0.5 pl-2 pr-2 py-0.5 rounded-md text-xs transition-colors group/page", isActive(page.id) ? "bg-primary/10 text-primary font-medium" : "text-muted-foreground hover:text-foreground hover:bg-muted/50", selectedPageIds.has(page.id) && "bg-primary/5 ring-1 ring-primary/20", dragOverTarget === page.id && "ring-1 ring-primary/40 bg-primary/5")}>
                  <button onClick={(e) => togglePageSelection(page.id, e)} className="p-0.5 rounded text-muted-foreground/40 hover:text-foreground shrink-0 opacity-0 group-hover/page:opacity-100 transition-opacity" title={selectedPageIds.has(page.id) ? "Deselect" : "Select"}>
                    {selectedPageIds.has(page.id) ? <CheckSquare className="h-3.5 w-3.5 text-primary" /> : <Square className="h-3.5 w-3.5" />}
                  </button>
                  <button onClick={(e) => handlePageClick(page.id, e)} className="flex-1 flex items-center gap-1.5 min-w-0 text-left">
                    {page.icon || <FileText className="h-3.5 w-3.5 shrink-0" />}
                    {page.color && <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ backgroundColor: page.color }} />}
                    {page.is_pinned && <Pin className="h-3 w-3 shrink-0 text-primary" fill="currentColor" />}
                    <span className="truncate">{page.title}</span>
                    {searchQuery && page.text_content && (<span className="block text-[10px] text-muted-foreground/50 truncate mt-0.5 max-w-full">{(() => { const idx = page.text_content.toLowerCase().indexOf(searchQuery.toLowerCase()); if (idx < 0) return page.text_content.slice(0, 60).replace(/\n/g, " "); const start = Math.max(0, idx - 20); const end = Math.min(page.text_content.length, idx + searchQuery.length + 40); const snippet = page.text_content.slice(start, end).replace(/\n/g, " "); return (start > 0 ? "…" : "") + snippet + (end < page.text_content.length ? "…" : ""); })()}</span>)}
                    {page.status === "draft" && <span className="ml-auto text-[10px] px-1 py-0.5 rounded bg-yellow-500/10 text-yellow-500 shrink-0">Draft</span>}
                    {page.status === "archived" && <span className="ml-auto text-[10px] px-1 py-0.5 rounded bg-muted text-muted-foreground shrink-0">Archived</span>}
                    {page.is_template && <span className="ml-auto text-[10px] px-1 py-0.5 rounded bg-purple-500/10 text-purple-400 shrink-0">Template</span>}
                  </button>
                </div>
              ))}
              {colPages.length > (pageLimits[col.id] || PAGE_LIMIT) && (
                <button onClick={() => setPageLimits(prev => ({ ...prev, [col.id]: (prev[col.id] || PAGE_LIMIT) + PAGE_LIMIT }))} className="w-full flex items-center gap-2 pl-8 pr-2 py-1 text-[10px] text-muted-foreground hover:text-foreground hover:bg-muted/30 rounded-md transition-colors text-left">
                  <ChevronDown className="h-3 w-3 shrink-0" /> Show {colPages.length - (pageLimits[col.id] || PAGE_LIMIT)} more
                </button>
              )}
            </>
          )}
        </div>
      );
    });
  };

  return (
    <div className="flex h-screen bg-background" onClick={() => setContextMenu(null)}>
      {/* Sidebar */}
      <aside
        ref={sidebarElRef}
        className={cn(
          "fixed inset-y-0 left-0 z-40 w-72 max-w-[85vw] bg-sidebar border-r border-border flex flex-col transition-transform duration-200 ease-out md:relative md:translate-x-0",
          sidebarDragRef.current ? "" : (sidebarOpen ? "translate-x-0" : "-translate-x-full"),
        )}
        onTouchStart={(e) => {
          touchStartRef.current = e.touches[0].clientX;
          if (!sidebarOpen) {
            // Edge swipe to open — only if touch is near left edge
            if (touchStartRef.current < 30) {
              sidebarDragRef.current = true;
              sidebarTouchDelta.current = 0;
            }
          } else {
            // Drag to close — any touch on sidebar
            sidebarDragRef.current = true;
            sidebarTouchDelta.current = 0;
          }
        }}
        onTouchMove={(e) => {
          if (!sidebarDragRef.current) return;
          const dx = e.touches[0].clientX - touchStartRef.current;
          sidebarTouchDelta.current = dx;
          const el = sidebarElRef.current;
          if (!el) return;
          el.style.transition = "none";
          if (!sidebarOpen) {
            // Opening: drag from edge → translate from -100% to dx
            const offset = Math.min(Math.max(dx, 0), SIDEBAR_W);
            el.style.transform = `translateX(${offset - SIDEBAR_W}px)`;
            // Show overlay with progress
            const progress = offset / SIDEBAR_W;
            if (progress > 0.05 && !sidebarOverlayVisible) setSidebarOverlayVisible(true);
            const ov = sidebarOverlayRef.current;
            if (ov) ov.style.opacity = String(progress * 0.6);
          } else {
            // Closing: drag from 0 to -dx (leftwards)
            const offset = Math.max(-dx, -SIDEBAR_W);
            el.style.transform = `translateX(${offset}px)`;
            const progress = Math.abs(dx) / SIDEBAR_W;
            const ov = sidebarOverlayRef.current;
            if (ov) ov.style.opacity = String((1 - progress) * 0.6);
          }
        }}
        onTouchEnd={() => {
          if (!sidebarDragRef.current) return;
          sidebarDragRef.current = false;
          const el = sidebarElRef.current;
          if (!el) return;
          el.style.transition = "";
          el.style.transform = "";
          const progress = Math.abs(sidebarTouchDelta.current) / SIDEBAR_W;
          if (!sidebarOpen && sidebarTouchDelta.current > 60) {
            // Swipe far enough right to open
            setSidebarOpen(true);
            setSidebarOverlayVisible(true);
          } else if (sidebarOpen && progress > 0.4) {
            // Swipe far enough left to close
            setSidebarOpen(false);
            setSidebarOverlayVisible(false);
          }
          // Close overlay if didn't open
          if (!sidebarOpen && sidebarTouchDelta.current <= 60) {
            setSidebarOverlayVisible(false);
          }
          sidebarTouchDelta.current = 0;
        }}
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
            onClick={() => setTemplatePickerOpen(true)}
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
              {renderColTree(collectionTree, 0)}

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
                    pagesByCollection["uncategorized"].slice(0, pageLimits["uncategorized"] || PAGE_LIMIT).map((page) => (
                      <div
                        key={page.id}
                        draggable
                        onDragStart={(e) => handleDragStart(e, page.id)}
                        onDragOver={(e) => handleDragOver(e, page.id)}
                        onDragLeave={handleDragLeave}
                        onDrop={(e) => handleDropOnPage(e, page.id)}
                        onDragEnd={handleDragEnd}
                        onContextMenu={(e) => {
                          e.preventDefault();
                          setContextMenu({ x: e.clientX, y: e.clientY, pageId: page.id });
                        }}
                        className={cn(
                          "w-full flex items-center gap-0.5 pl-2 pr-2 py-0.5 rounded-md text-xs transition-colors group/page",
                          isActive(page.id) ? "bg-primary/10 text-primary font-medium" : "text-muted-foreground hover:text-foreground hover:bg-muted/50",
                          selectedPageIds.has(page.id) && "bg-primary/5 ring-1 ring-primary/20",
                          dragOverTarget === page.id && "ring-1 ring-primary/40 bg-primary/5",
                        )}
                      >
                        {/* Selection checkbox */}
                        <button
                          onClick={(e) => togglePageSelection(page.id, e)}
                          className="p-0.5 rounded text-muted-foreground/40 hover:text-foreground shrink-0 opacity-0 group-hover/page:opacity-100 transition-opacity"
                          title={selectedPageIds.has(page.id) ? "Deselect" : "Select"}
                        >
                          {selectedPageIds.has(page.id) ? (
                            <CheckSquare className="h-3.5 w-3.5 text-primary" />
                          ) : (
                            <Square className="h-3.5 w-3.5" />
                          )}
                        </button>
                        {/* Clicking the page name navigates (or Cmd+click toggles) */}
                        <button
                          onClick={(e) => handlePageClick(page.id, e)}
                          className="flex-1 flex items-center gap-1.5 min-w-0 text-left"
                        >
                          <FileText className="h-3.5 w-3.5 shrink-0" />
                          {page.color && <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ backgroundColor: page.color }} />}
                          {page.is_pinned && <Pin className="h-3 w-3 shrink-0 text-primary" fill="currentColor" />}
                          <span className="truncate">{page.title}</span>
                          {page.status === "draft" && (
                            <span className="ml-auto text-[10px] px-1 py-0.5 rounded bg-yellow-500/10 text-yellow-500 shrink-0">Draft</span>
                          )}
                          {page.status === "archived" && (
                            <span className="ml-auto text-[10px] px-1 py-0.5 rounded bg-muted text-muted-foreground shrink-0">Archived</span>
                          )}
                          {page.is_template && (
                            <span className="ml-auto text-[10px] px-1 py-0.5 rounded bg-purple-500/10 text-purple-400 shrink-0">Template</span>
                          )}
                        </button>
                      </div>
                    ))}
                  {expandedCollections.has("uncategorized") && (pagesByCollection["uncategorized"]?.length || 0) > (pageLimits["uncategorized"] || PAGE_LIMIT) && (
                    <button
                      onClick={() => setPageLimits(prev => ({ ...prev, "uncategorized": (prev["uncategorized"] || PAGE_LIMIT) + PAGE_LIMIT }))}
                      className="w-full flex items-center gap-2 pl-8 pr-2 py-1 text-[10px] text-muted-foreground hover:text-foreground hover:bg-muted/30 rounded-md transition-colors text-left"
                    >
                      <ChevronDown className="h-3 w-3 shrink-0" />
                      Show {(pagesByCollection["uncategorized"]?.length || 0) - (pageLimits["uncategorized"] || PAGE_LIMIT)} more
                    </button>
                  )}
                </div>
              )}

              {collections.length === 0 && Object.keys(pagesByCollection).length === 0 && (
                <div className="px-3 py-6 text-center">
                  <div className="w-10 h-10 mx-auto mb-3 rounded-xl bg-gradient-to-br from-primary/20 to-purple-600/20 flex items-center justify-center">
                    <Library className="h-5 w-5 text-primary/60" />
                  </div>
                  <p className="text-xs text-muted-foreground mb-2">Welcome! Your wiki is empty.</p>
                  <button
                    onClick={() => navigate("/new")}
                    className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-[10px] font-medium bg-primary/10 text-primary hover:bg-primary/20 transition-colors"
                  >
                    <Plus className="h-3 w-3" /> Create first page
                  </button>
                </div>
              )}
            </>
          )}
        </nav>

        {/* ── Batch action bar (shown when pages are selected) ── */}
        {selectedPageIds.size > 0 && (
          <div className="px-2 py-2 border-t border-border bg-muted/20">
            <div className="flex items-center gap-1.5 mb-1.5">
              <span className="text-[10px] text-muted-foreground font-medium px-1">
                {selectedPageIds.size} selected
              </span>
              <button
                onClick={clearSelection}
                className="text-[10px] text-muted-foreground/60 hover:text-foreground ml-auto px-1"
              >
                Clear
              </button>
            </div>
            <div className="flex flex-wrap gap-1">
              <button
                onClick={() => setBatchMoveOpen(true)}
                className="inline-flex items-center gap-1 px-2 py-1 rounded text-[10px] font-medium bg-primary/10 text-primary hover:bg-primary/20 transition-colors"
              >
                <FolderPlus className="h-3 w-3" /> Move
              </button>
              <button
                onClick={handleBatchArchive}
                className="inline-flex items-center gap-1 px-2 py-1 rounded text-[10px] font-medium bg-yellow-500/10 text-yellow-500 hover:bg-yellow-500/20 transition-colors"
              >
                <Archive className="h-3 w-3" /> Archive
              </button>
              <button
                onClick={() => setBatchTagOpen(true)}
                className="inline-flex items-center gap-1 px-2 py-1 rounded text-[10px] font-medium bg-blue-500/10 text-blue-400 hover:bg-blue-500/20 transition-colors"
              >
                <Tags className="h-3 w-3" /> Tag
              </button>
              <button
                onClick={handleBatchDelete}
                className="inline-flex items-center gap-1 px-2 py-1 rounded text-[10px] font-medium bg-red-500/10 text-red-400 hover:bg-red-500/20 transition-colors"
              >
                <Trash2 className="h-3 w-3" /> Delete
              </button>
            </div>
          </div>
        )}

        {/* ── Batch Move dialog ── */}
        {batchMoveOpen && (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/60"
            onClick={() => setBatchMoveOpen(false)}
          >
            <div
              className="w-full max-w-sm mx-4 p-4 rounded-xl border border-border bg-card shadow-2xl"
              onClick={(e) => e.stopPropagation()}
            >
              <h3 className="text-sm font-semibold mb-3">Move {selectedPageIds.size} page(s)</h3>
              <div className="space-y-2 max-h-48 overflow-y-auto mb-3">
                {collections.map((col) => (
                  <button
                    key={col.id}
                    onClick={() => handleBatchMove(col.id)}
                    className="w-full flex items-center gap-2 px-3 py-2 rounded-md text-xs hover:bg-muted transition-colors text-left"
                  >
                    <span>{col.icon || "📁"}</span>
                    <span className="truncate">{col.name}</span>
                  </button>
                ))}
                <button
                  onClick={() => handleBatchMove("")}
                  className="w-full flex items-center gap-2 px-3 py-2 rounded-md text-xs hover:bg-muted transition-colors text-left"
                >
                  <Hash className="h-3.5 w-3.5" /> Uncategorized
                </button>
              </div>
              <button
                onClick={() => setBatchMoveOpen(false)}
                className="w-full py-2 rounded-md text-xs text-muted-foreground hover:text-foreground border border-border transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        )}

        {/* ── Batch Tag dialog ── */}
        {batchTagOpen && (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/60"
            onClick={() => setBatchTagOpen(false)}
          >
            <div
              className="w-full max-w-sm mx-4 p-4 rounded-xl border border-border bg-card shadow-2xl"
              onClick={(e) => e.stopPropagation()}
            >
              <h3 className="text-sm font-semibold mb-3">Add tag to {selectedPageIds.size} page(s)</h3>
              <div className="space-y-2 mb-3">
                <input
                  type="text"
                  value={batchTagName}
                  onChange={(e) => setBatchTagName(e.target.value)}
                  placeholder="Tag name (e.g. 'department')"
                  className="w-full h-8 px-2 rounded-md border border-border bg-[#0a0a0a] text-xs focus:outline-none focus:ring-1 focus:ring-primary/50"
                />
                <input
                  type="text"
                  value={batchTagValue}
                  onChange={(e) => setBatchTagValue(e.target.value)}
                  placeholder="Tag value (e.g. 'engineering')"
                  className="w-full h-8 px-2 rounded-md border border-border bg-[#0a0a0a] text-xs focus:outline-none focus:ring-1 focus:ring-primary/50"
                />
              </div>
              <div className="flex gap-2">
                <button
                  onClick={handleBatchTag}
                  disabled={!batchTagName.trim()}
                  className="flex-1 h-8 rounded-md text-xs font-medium bg-primary text-white hover:bg-primary/90 disabled:opacity-50 transition-colors"
                >
                  Add Tag
                </button>
                <button
                  onClick={() => setBatchTagOpen(false)}
                  className="flex-1 h-8 rounded-md text-xs text-muted-foreground hover:text-foreground border border-border transition-colors"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        )}

        <div className="px-3 py-2 border-t border-border space-y-1">
          <button onClick={openTemplates} className="w-full flex items-center gap-2 px-2 py-1.5 rounded-md text-xs text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors">
            <LayoutTemplate className="h-3 w-3" /> Templates
          </button>
          <button
            onClick={loadTrashPage}
            onDragOver={(e) => { e.preventDefault(); setDragOverTarget("__trash__"); }}
            onDragLeave={() => setDragOverTarget(null)}
            onDrop={async (e) => {
              e.preventDefault();
              const pageId = e.dataTransfer.getData("text/plain") || dragPageId;
              if (pageId && pageId !== "__trash__") {
                if (!confirm("Move this page to trash?")) return;
                await api.pages.batchSetStatus([pageId], "deleted");
                setDragPageId(null);
                setDragOverTarget(null);
                await refreshData();
                showToast({ type: "success", title: "Page moved to trash", duration: 3000 });
              }
            }}
            onDragEnd={() => { setDragPageId(null); setDragOverTarget(null); }}
            className={cn(
              "w-full flex items-center gap-2 px-2 py-1.5 rounded-md text-xs transition-colors",
              dragOverTarget === "__trash__"
                ? "bg-red-500/10 text-red-400 border border-red-500/30"
                : "text-muted-foreground hover:text-foreground hover:bg-muted/50",
            )}
          >
            <Trash2 className="h-3 w-3" /> Trash
          </button>
          <button onClick={openAdmin} className="w-full flex items-center gap-2 px-2 py-1.5 rounded-md text-xs text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors">
            <Shield className="h-3 w-3" /> Admin
          </button>
          <input ref={importRef} type="file" accept=".md,.txt" onChange={handleImportMD} className="hidden" />
          <button
            onClick={() => importRef.current?.click()}
            disabled={importing}
            className="w-full flex items-center gap-2 px-2 py-1.5 rounded-md text-xs text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors disabled:opacity-50"
          >
            {importing ? <Loader2 className="h-3 w-3 animate-spin" /> : <Upload className="h-3 w-3" />}
            {importing ? "Importing..." : "Import MD"}
          </button>
          <input ref={notionImportRef} type="file" accept=".zip" onChange={handleImportNotion} className="hidden" />
          <button
            onClick={() => notionImportRef.current?.click()}
            disabled={importingNotion}
            className="w-full flex items-center gap-2 px-2 py-1.5 rounded-md text-xs text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors disabled:opacity-50"
          >
            {importingNotion ? <Loader2 className="h-3 w-3 animate-spin" /> : <Package className="h-3 w-3" />}
            {importingNotion ? "Importing..." : "Import Wiki"}
          </button>
          <button
            onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
            className="w-full flex items-center gap-2 px-2 py-1.5 rounded-md text-xs text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors"
            title={`Switch to ${theme === "dark" ? "light" : "dark"} theme`}
          >
            {theme === "dark" ? <Sun className="h-3 w-3" /> : <Moon className="h-3 w-3" />}
            {theme === "dark" ? "Light mode" : "Dark mode"}
          </button>
          <button onClick={() => setShortcutsOpen(true)} className="w-full flex items-center gap-2 px-2 py-1.5 rounded-md text-xs text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors">
            <Keyboard className="h-3 w-3" /> Keyboard shortcuts
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
      {(sidebarOpen || sidebarOverlayVisible) && (
        <div
          ref={sidebarOverlayRef}
          className="fixed inset-0 z-30 bg-black/60 backdrop-blur-sm md:hidden transition-opacity duration-300"
          style={{ opacity: sidebarOpen && !sidebarDragRef.current ? 1 : undefined }}
          onClick={() => { setSidebarOpen(false); setSidebarOverlayVisible(false); }}
        />
      )}

      {/* Context menu */}
      {contextMenu && (
        <div
          className="fixed z-50 w-48 py-1 rounded-lg border border-border bg-card shadow-xl"
          style={{
            left: Math.min(contextMenu.x, window.innerWidth - 192),
            top: Math.min(contextMenu.y, window.innerHeight - 180),
          }}
          onClick={(e) => e.stopPropagation()}
        >
          {contextMenu.pageId ? (
            <>
              <button
                onClick={() => { const page = pages.find(p => p.id === contextMenu.pageId); if (page) navigate(`/page/${page.id}`); setContextMenu(null); }}
                className="w-full flex items-center gap-2 px-3 py-1.5 text-xs hover:bg-muted transition-colors text-left"
              >
                <FileText className="h-3 w-3" /> Open
              </button>
              <button
                onClick={() => { const page = pages.find(p => p.id === contextMenu.pageId); if (page) navigate(`/page/${page.id}/edit`); setContextMenu(null); }}
                className="w-full flex items-center gap-2 px-3 py-1.5 text-xs hover:bg-muted transition-colors text-left"
              >
                <Edit3 className="h-3 w-3" /> Edit
              </button>
              <button
                onClick={() => { handleDuplicatePage(contextMenu.pageId!); setContextMenu(null); }}
                className="w-full flex items-center gap-2 px-3 py-1.5 text-xs hover:bg-muted transition-colors text-left"
              >
                <Copy className="h-3 w-3" /> Duplicate
              </button>
              <div className="h-px bg-border/50 mx-2 my-1" />
              <button
                onClick={() => { handleExportPageMD(contextMenu.pageId!); setContextMenu(null); }}
                className="w-full flex items-center gap-2 px-3 py-1.5 text-xs hover:bg-muted transition-colors text-left"
              >
                <Download className="h-3 w-3" /> Export Markdown
              </button>
              <button
                onClick={() => { handleExportPageHTML(contextMenu.pageId!); setContextMenu(null); }}
                className="w-full flex items-center gap-2 px-3 py-1.5 text-xs hover:bg-muted transition-colors text-left"
              >
                <Download className="h-3 w-3" /> Export HTML
              </button>
              <div className="h-px bg-border/50 mx-2 my-1" />
              <button
                onClick={() => { const url = `${window.location.origin}/page/${contextMenu.pageId}`; navigator.clipboard.writeText(url).catch(() => {}); setContextMenu(null); showToast({ type: "success", title: "Link copied", duration: 2000 }); }}
                className="w-full flex items-center gap-2 px-3 py-1.5 text-xs hover:bg-muted transition-colors text-left"
              >
                <Link2 className="h-3 w-3" /> Copy link
              </button>
              <div className="h-px bg-border/50 mx-2 my-1" />
              <button
                onClick={async () => {
                  const pageId = contextMenu.pageId!;
                  setContextMenu(null);
                  if (!confirm("Move this page to trash?")) return;
                  await api.pages.batchSetStatus([pageId], "deleted");
                  await refreshData();
                  showToast({ type: "success", title: "Page moved to trash", duration: 3000 });
                }}
                className="w-full flex items-center gap-2 px-3 py-1.5 text-xs text-red-400 hover:bg-red-500/10 transition-colors text-left"
              >
                <Trash2 className="h-3 w-3" /> Move to trash
              </button>
            </>
          ) : (
            <>
              <button
                onClick={() => { const col = collections.find(c => c.id === contextMenu.colId); if (col) openEditCol(col); }}
                className="w-full flex items-center gap-2 px-3 py-1.5 text-xs hover:bg-muted transition-colors text-left"
              >
                <Pencil className="h-3 w-3" /> Edit collection
              </button>
              <button
                onClick={() => deleteCollection(contextMenu.colId!)}
                className="w-full flex items-center gap-2 px-3 py-1.5 text-xs text-red-400 hover:bg-red-500/10 transition-colors text-left"
              >
                <Trash2 className="h-3 w-3" /> Delete collection
              </button>
            </>
          )}
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
              <button onClick={() => setAdminTab("settings")}
                className={`px-3 py-1.5 text-xs font-medium rounded-t-md transition-colors ${adminTab === "settings" ? "bg-primary/10 text-primary border-b-2 border-primary" : "text-muted-foreground hover:text-foreground"}`}>
                <Trash2 className="h-3 w-3 inline mr-1" />Settings
              </button>
              <button onClick={() => setAdminTab("features")}
                className={`px-3 py-1.5 text-xs font-medium rounded-t-md transition-colors ${adminTab === "features" ? "bg-primary/10 text-primary border-b-2 border-primary" : "text-muted-foreground hover:text-foreground"}`}>
                <CheckSquare className="h-3 w-3 inline mr-1" />Features
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
              <>
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
              {/* ── SAML Providers ── */}
              <div className="mt-6 pt-4 border-t border-border">
                <div className="flex items-center justify-between mb-3">
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">SAML 2.0 Providers</p>
                  <button onClick={() => {
                    setEditingSaml(null);
                    setSamlName(""); setSamlSlug(""); setSamlEntityId(""); setSamlSsoUrl("");
                    setSamlCert(""); setSamlNameIdFmt("urn:oasis:names:tc:SAML:1.1:nameid-format:emailAddress");
                    setSamlAttrMapping('{"email":"email","name":"name"}'); setSamlAutoRegister(true);
                    setSamlDialogOpen(true);
                  }} className="inline-flex items-center gap-1 px-2 py-1 rounded-md text-xs font-medium bg-primary/10 text-primary hover:bg-primary/20 transition-colors">
                    <Plus className="h-3 w-3" /> Add Provider
                  </button>
                </div>
                <div className="space-y-2">
                  {samlProviders.map(p => (
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
                        <p className="text-[10px] text-muted-foreground/60 truncate">Entity: {p.entity_id}</p>
                      </div>
                      <button onClick={() => {
                        setEditingSaml(p);
                        setSamlName(p.name); setSamlSlug(p.slug); setSamlEntityId(p.entity_id);
                        setSamlSsoUrl(p.sso_url); setSamlCert(""); setSamlNameIdFmt(p.name_id_format);
                        setSamlAttrMapping(p.attribute_mapping); setSamlAutoRegister(p.auto_register);
                        setSamlDialogOpen(true);
                      }} className="p-1 rounded text-muted-foreground hover:text-foreground hover:bg-muted transition-colors">
                        <Pencil className="h-3 w-3" />
                      </button>
                      <button onClick={async () => {
                        if (!confirm(`Delete SAML provider "${p.name}"?`)) return;
                        await api.saml.delete(p.id);
                        setSamlProviders(prev => prev.filter(x => x.id !== p.id));
                      }} className="p-1 rounded text-red-400 hover:text-red-300 hover:bg-red-500/10 transition-colors">
                        <Trash2 className="h-3 w-3" />
                      </button>
                    </div>
                  ))}
                  {samlProviders.length === 0 && (
                    <div className="py-4 text-center text-xs text-muted-foreground">
                      No SAML providers configured. Add one to enable SAML SSO login.
                    </div>
                  )}
                </div>
                <div className="pt-4 mt-4 border-t border-border">
                  <h4 className="text-xs font-semibold mb-2 text-muted-foreground">How it works</h4>
                  <p className="text-[10px] text-muted-foreground/60 leading-relaxed">
                    Configure any SAML 2.0 identity provider (Keycloak, Okta, Azure AD, ADFS, etc.).
                    The ACS (Assertion Consumer Service) URL is: <code className="bg-muted px-1 rounded">{window.location.origin}/auth/saml/callback</code>
                  </p>
                </div>
              </div>
            </>)}
            {adminTab === "settings" && (
              <div>
                <div className="space-y-4">
                  <div>
                    <div className="flex items-center justify-between mb-3">
                      <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Language</p>
                    </div>
                    <LanguageSwitcher />
                  </div>
                  <div className="border-t border-border pt-4">
                    <div className="flex items-center justify-between mb-3">
                      <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Trash Retention</p>
                    </div>
                    <TrashSettings />
                  </div>
                </div>
              </div>
            )}
            {adminTab === "features" && <FeatureFlags />}
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
              {editingCol && (
                <div>
                  <label className="text-[10px] text-muted-foreground/60 font-medium mb-1 block">Page sort order</label>
                  <select
                    value={colSortMode}
                    onChange={(e) => setColSortMode(e.target.value)}
                    className="w-full h-9 px-2 rounded-md border border-border bg-[#0a0a0a] text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary/50"
                  >
                    <option value="manual">Manual (drag to reorder)</option>
                    <option value="title-asc">Title A–Z</option>
                    <option value="title-desc">Title Z–A</option>
                    <option value="created-asc">Oldest first</option>
                    <option value="created-desc">Newest first</option>
                    <option value="updated-asc">Least recently updated</option>
                    <option value="updated-desc">Most recently updated</option>
                  </select>
                </div>
              )}
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

      {/* SAML Provider dialog */}
      {samlDialogOpen && (
        <div className="dialog-overlay fixed inset-0 z-50 flex items-center justify-center bg-black/60" onClick={() => setSamlDialogOpen(false)}>
          <div className="dialog-container w-full max-w-md p-5 rounded-xl border border-border bg-card shadow-2xl max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-sm font-semibold mb-4">{editingSaml ? "Edit SAML Provider" : "Add SAML Provider"}</h3>
            <div className="space-y-3">
              <input type="text" value={samlName} onChange={(e) => setSamlName(e.target.value)}
                placeholder="Provider name (e.g. Keycloak, Okta)" autoFocus
                className="w-full h-9 px-3 rounded-md border border-border bg-[#0a0a0a] text-sm text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-1 focus:ring-primary/50" />
              <input type="text" value={samlSlug} onChange={(e) => setSamlSlug(e.target.value)}
                placeholder="Slug (e.g. keycloak — appears in URL)"
                className="w-full h-9 px-3 rounded-md border border-border bg-[#0a0a0a] text-sm text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-1 focus:ring-primary/50" />
              <input type="text" value={samlEntityId} onChange={(e) => setSamlEntityId(e.target.value)}
                placeholder="IdP Entity ID (issuer URI)"
                className="w-full h-9 px-3 rounded-md border border-border bg-[#0a0a0a] text-sm text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-1 focus:ring-primary/50" />
              <input type="text" value={samlSsoUrl} onChange={(e) => setSamlSsoUrl(e.target.value)}
                placeholder="IdP SSO URL (e.g. https://idp.example.com/saml/sso)"
                className="w-full h-9 px-3 rounded-md border border-border bg-[#0a0a0a] text-sm text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-1 focus:ring-primary/50" />
              <textarea value={samlCert} onChange={(e) => setSamlCert(e.target.value)}
                placeholder="IdP X.509 certificate (optional, for signature verification)"
                rows={3}
                className="w-full px-3 py-2 rounded-md border border-border bg-[#0a0a0a] text-sm text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-1 focus:ring-primary/50 resize-none font-mono text-[11px]" />
              <input type="text" value={samlNameIdFmt} onChange={(e) => setSamlNameIdFmt(e.target.value)}
                placeholder="Name ID format (default: emailAddress)"
                className="w-full h-9 px-3 rounded-md border border-border bg-[#0a0a0a] text-sm text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-1 focus:ring-primary/50" />
              <input type="text" value={samlAttrMapping} onChange={(e) => setSamlAttrMapping(e.target.value)}
                placeholder='Attribute mapping JSON, e.g. {"email":"email","name":"name"}'
                className="w-full h-9 px-3 rounded-md border border-border bg-[#0a0a0a] text-sm text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-1 focus:ring-primary/50" />
              <label className="flex items-center gap-2 text-xs text-muted-foreground">
                <input type="checkbox" checked={samlAutoRegister} onChange={(e) => setSamlAutoRegister(e.target.checked)} className="rounded border-border" />
                Auto-register new users
              </label>
              <div className="flex gap-2 justify-end pt-2">
                <button onClick={() => setSamlDialogOpen(false)} className="h-8 px-3 rounded-md text-xs text-muted-foreground hover:text-foreground hover:bg-muted transition-colors">
                  Cancel
                </button>
                <button onClick={async () => {
                  if (!samlName.trim() || !samlSlug.trim() || !samlEntityId.trim() || !samlSsoUrl.trim()) {
                    alert("Name, slug, entity ID, and SSO URL are required.");
                    return;
                  }
                  try {
                    if (editingSaml) {
                      await api.saml.update(editingSaml.id, samlName, samlSlug, samlEntityId, samlSsoUrl, samlCert, samlNameIdFmt, samlAttrMapping, samlAutoRegister, editingSaml.is_active);
                      setSamlProviders(prev => prev.map(p => p.id === editingSaml.id ? {
                        ...p, name: samlName, slug: samlSlug, entity_id: samlEntityId,
                        sso_url: samlSsoUrl, name_id_format: samlNameIdFmt,
                        attribute_mapping: samlAttrMapping, auto_register: samlAutoRegister,
                        updated_at: Date.now(),
                      } : p));
                    } else {
                      const id = await api.saml.create(samlName, samlSlug, samlEntityId, samlSsoUrl, samlCert, samlNameIdFmt, samlAttrMapping, samlAutoRegister, userId || "anon");
                      setSamlProviders(prev => [...prev, {
                        id, name: samlName, slug: samlSlug, entity_id: samlEntityId,
                        sso_url: samlSsoUrl, certificate: samlCert, name_id_format: samlNameIdFmt,
                        attribute_mapping: samlAttrMapping, auto_register: samlAutoRegister,
                        is_active: true, created_by: userId || "anon", created_at: Date.now(), updated_at: Date.now(),
                      }]);
                    }
                    setSamlDialogOpen(false);
                  } catch (e: any) { alert(String(e)); }
                }} disabled={!samlName.trim() || !samlSlug.trim() || !samlEntityId.trim() || !samlSsoUrl.trim()}
                  className="h-8 px-4 rounded-md text-xs font-medium bg-primary text-white hover:bg-primary/90 disabled:opacity-50 transition-colors">
                  {editingSaml ? "Save" : "Add"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Main content */}
      <main
        className="flex-1 overflow-y-auto"
        onTouchStart={(e) => {
          if (!sidebarOpen && sidebarElRef.current && e.touches[0].clientX < 30) {
            // Edge swipe to open — start tracking on sidebar itself
            touchStartRef.current = e.touches[0].clientX;
            sidebarDragRef.current = true;
            sidebarTouchDelta.current = 0;
            const el = sidebarElRef.current;
            el.style.transition = "none";
          }
        }}
        onTouchMove={(e) => {
          if (!sidebarDragRef.current) return;
          const dx = e.touches[0].clientX - touchStartRef.current;
          sidebarTouchDelta.current = dx;
          const el = sidebarElRef.current;
          if (!el) return;
          el.style.transition = "none";
          if (!sidebarOpen && dx > 0) {
            // Edge swipe to open
            const offset = Math.min(dx, SIDEBAR_W);
            el.style.transform = `translateX(${offset - SIDEBAR_W}px)`;
            const progress = offset / SIDEBAR_W;
            if (progress > 0.05 && !sidebarOverlayVisible) setSidebarOverlayVisible(true);
            const ov = sidebarOverlayRef.current;
            if (ov) ov.style.opacity = String(progress * 0.6);
          } else if (sidebarOpen && dx < 0) {
            // Swipe on overlay to close
            const offset = Math.max(dx, -SIDEBAR_W);
            el.style.transform = `translateX(${offset}px)`;
            const progress = Math.abs(dx) / SIDEBAR_W;
            const ov = sidebarOverlayRef.current;
            if (ov) ov.style.opacity = String((1 - progress) * 0.6);
          }
        }}
        onTouchEnd={() => {
          if (!sidebarDragRef.current) return;
          // Handle edge-to-open completion
          if (!sidebarOpen && sidebarTouchDelta.current > 60) {
            setSidebarOpen(true);
            setSidebarOverlayVisible(true);
          }
          sidebarDragRef.current = false;
          const el = sidebarElRef.current;
          if (el) { el.style.transition = ""; el.style.transform = ""; }
          sidebarTouchDelta.current = 0;
        }}
      >
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
          <Route path="/permalink/:id" element={<PermalinkRedirect />} />
          <Route path="/oauth/google/callback" element={<GoogleCallback />} />
          <Route path="/oauth/oidc/callback" element={<OidcCallback />} />
          <Route path="/auth/saml/callback" element={<SamlCallback />} />
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
                  {"shortcut" in item && item.shortcut && (
                    <kbd className="hidden sm:inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[10px] font-mono bg-muted/50 text-muted-foreground/60 border border-border/50">
                      {(item as any).shortcut}
                    </kbd>
                  )}
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

      {/* Template Picker */}
      <TemplatePicker
        open={templatePickerOpen}
        onClose={() => setTemplatePickerOpen(false)}
        collections={collections}
        userId={userId}
        navigate={navigate}
      />
      <KeyboardShortcuts
        open={shortcutsOpen}
        onClose={() => setShortcutsOpen(false)}
      />
    </div>
  );
}

// ─── Home View ───────────────────────────────────────────────────────────────

function HomeView() {
  const navigate = useNavigate();
  const [recentPages, setRecentPages] = useState<Page[]>([]);
  const [importing, setImporting] = useState(false);
  const importRef = useRef<HTMLInputElement>(null);
  const [trendingPages, setTrendingPages] = useState<{page_id: string; views: number; title: string; icon: string}[]>([]);

  useEffect(() => {
    api.pages.list().then((pages) => {
      setRecentPages(
        pages
          .filter((p: any) => p.status === "published" || p.status === "draft")
          .sort((a: any, b: any) => b.updated_at - a.updated_at)
          .slice(0, 10),
      );
    });
    // Load trending pages
    api.analytics.getTrending(5).then(async (trending) => {
      const enriched = await Promise.all(trending.map(async (t: any) => {
        try {
          const p = await api.pages.get(t.page_id);
          return { ...t, title: p?.title || "Unknown", icon: p?.icon || "" };
        } catch {
          return { ...t, title: "Unknown", icon: "" };
        }
      }));
      setTrendingPages(enriched.filter((t: any) => t.title !== "Unknown"));
    }).catch(() => {});
  }, []);

  const handleImportMD = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setImporting(true);
    try {
      const text = await file.text();
      const title = file.name.replace(/\.md$/i, "");
      const doc = markdownToProseMirror(text);
      const id = await api.pages.create(title, JSON.stringify(doc), "", "", "anonymous");
      navigate(`/page/${id}`);
    } catch (err) { console.error(err); }
    finally { setImporting(false); e.target.value = ""; }
  };

  const hasPages = recentPages.length > 0;

  // ─── Onboarding for empty wikis ────────────────────────────────────────
  if (!hasPages) {
    return (
      <div className="p-4 md:p-6 lg:p-8 max-w-3xl mx-auto">
        {/* Hero */}
        <div className="text-center py-8 md:py-12">
          <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-gradient-to-br from-primary to-purple-600 flex items-center justify-center shadow-lg">
            <Library className="h-8 w-8 text-white" />
          </div>
          <h1 className="text-3xl font-bold text-foreground mb-2">Welcome to Spacetime Wiki</h1>
          <p className="text-sm text-muted-foreground max-w-md mx-auto">
            Your team's knowledge base, powered by SpacetimeDB for real-time collaboration.
            Start by creating your first page or importing existing content.
          </p>
        </div>

        {/* Quick actions */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-8">
          <button
            onClick={() => navigate("/new")}
            className="flex flex-col items-center gap-2 p-6 rounded-xl border border-border bg-card hover:bg-secondary hover:border-primary/30 transition-all group"
          >
            <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center group-hover:bg-primary/20 transition-colors">
              <Plus className="h-6 w-6 text-primary" />
            </div>
            <span className="text-sm font-semibold">Create a page</span>
            <span className="text-xs text-muted-foreground text-center">Start writing in our rich WYSIWYG editor with markdown support</span>
          </button>
          <button
            onClick={() => importRef.current?.click()}
            disabled={importing}
            className="flex flex-col items-center gap-2 p-6 rounded-xl border border-border bg-card hover:bg-secondary hover:border-primary/30 transition-all group disabled:opacity-50"
          >
            <div className="w-12 h-12 rounded-lg bg-emerald-500/10 flex items-center justify-center group-hover:bg-emerald-500/20 transition-colors">
              {importing ? <Loader2 className="h-6 w-6 animate-spin text-emerald-500" /> : <Upload className="h-6 w-6 text-emerald-500" />}
            </div>
            <span className="text-sm font-semibold">Import Markdown</span>
            <span className="text-xs text-muted-foreground text-center">Drag or select .md files to instantly create wiki pages</span>
            <input ref={importRef} type="file" accept=".md,.txt" onChange={handleImportMD} className="hidden" />
          </button>
          <button
            onClick={() => document.dispatchEvent(new KeyboardEvent("keydown", { key: "?" }))}
            className="flex flex-col items-center gap-2 p-6 rounded-xl border border-border bg-card hover:bg-secondary hover:border-primary/30 transition-all group"
          >
            <div className="w-12 h-12 rounded-lg bg-purple-500/10 flex items-center justify-center group-hover:bg-purple-500/20 transition-colors">
              <Keyboard className="h-6 w-6 text-purple-400" />
            </div>
            <span className="text-sm font-semibold">Keyboard shortcuts</span>
            <span className="text-xs text-muted-foreground text-center">Press <kbd className="px-1 py-0.5 rounded bg-muted font-mono text-[10px]">?</kbd> to see all shortcuts</span>
          </button>
        </div>

        {/* Feature tour */}
        <div className="mb-8">
          <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3">What you can do</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
            {[
              { icon: <Edit3 className="h-4 w-4" />, title: "Rich editing", desc: "WYSIWYG, Markdown, or split view with / commands, emoji picker, and drag-and-drop blocks" },
              { icon: <Search className="h-4 w-4" />, title: "Full-text search", desc: "Instant search across all pages with collection, author, and date filters" },
              { icon: <BookOpen className="h-4 w-4" />, title: "Collections & tags", desc: "Organize pages into collections with custom icons, colors, and labels/tags" },
              { icon: <MessageSquare className="h-4 w-4" />, title: "Comments & history", desc: "Leave comments, restore previous revisions, and compare visual diffs" },
              { icon: <Shield className="h-4 w-4" />, title: "Permissions & sharing", desc: "Role-based access control, public share links with passwords, and SSO (OIDC/SAML)" },
              { icon: <Download className="h-4 w-4" />, title: "Import/export", desc: "Import from Markdown, export as MD, HTML, JSON, PDF, or ZIP with attachments" },
              { icon: <Star className="h-4 w-4" />, title: "Favorites & pinning", desc: "Star your frequently-accessed pages and pin important ones to the top" },
              { icon: <LayoutTemplate className="h-4 w-4" />, title: "Templates & embeds", desc: "Create pages from templates, embed YouTube/Figma/30+ providers, and diagrams" },
            ].map((feature, i) => (
              <div key={i} className="flex items-start gap-3 p-3 rounded-lg border border-border bg-card hover:bg-secondary transition-colors">
                <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center shrink-0 text-primary">
                  {feature.icon}
                </div>
                <div>
                  <p className="text-xs font-semibold">{feature.title}</p>
                  <p className="text-[11px] text-muted-foreground mt-0.5">{feature.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Footer note */}
        <div className="text-center pb-8">
          <p className="text-[11px] text-muted-foreground/60">
            Spacetime Wiki &middot; Built with SpacetimeDB + React + Tiptap
          </p>
        </div>
      </div>
    );
  }

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

      {trendingPages.length > 0 && (
        <div className="space-y-3">
          <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-2">
            <Eye className="h-3.5 w-3.5" /> Trending
          </h2>
          <div className="grid gap-2">
            {trendingPages.map((item) => (
              <button
                key={item.page_id}
                onClick={() => navigate(`/page/${item.page_id}`)}
                className="flex items-center gap-3 p-3 rounded-lg border border-border bg-card hover:bg-secondary transition-colors text-left"
              >
                {item.icon ? <span className="text-base">{item.icon}</span> : <FileText className="h-4 w-4 text-muted-foreground shrink-0" />}
                <div className="min-w-0 flex-1">
                  <div className="text-sm font-medium truncate">{item.title}</div>
                  <div className="flex items-center gap-1 text-[11px] text-muted-foreground">
                    <Eye className="h-3 w-3" />
                    <span>{item.views} view{item.views !== 1 ? "s" : ""}</span>
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

// ─── SAML 2.0 Callback ─────────────────────────────────────────────────────────

function SamlCallback() {
  const navigate = useNavigate();
  const [status, setStatus] = useState("Completing SAML sign-in...");

  useEffect(() => {
    (async () => {
      try {
        // SAML IdP POSTs a SAMLResponse to this page.
        // The response is in the URL search params (GET after redirect)
        // or in a form POST body. Most IdPs use POST binding.
        const params = new URLSearchParams(window.location.search);
        const samlResponse = params.get("SAMLResponse");
        const relayState = params.get("RelayState");

        if (!samlResponse) {
          // Try to get from POST body — if this page was loaded via POST,
          // we need to extract the form data. For SPA routing, we look at the hash or stored data.
          setStatus("No SAMLResponse received. Ensure your IdP POSTs to this URL.");
          return;
        }

        setStatus("Parsing SAML response...");

        // Base64 decode the SAMLResponse
        let decodedXml: string;
        try {
          const binaryStr = atob(samlResponse);
          const bytes = new Uint8Array(binaryStr.length);
          for (let i = 0; i < binaryStr.length; i++) {
            bytes[i] = binaryStr.charCodeAt(i);
          }
          // Try to inflate (decompress) if deflated
          const pako = await import("pako");
          try {
            const inflated = pako.inflate(bytes, { to: "string" });
            decodedXml = inflated as string;
          } catch {
            // Not compressed, raw XML
            decodedXml = new TextDecoder().decode(bytes);
          }
        } catch {
          setStatus("Failed to decode SAMLResponse.");
          return;
        }

        // Parse SAML assertion XML to extract attributes
        const parser = new DOMParser();
        const xmlDoc = parser.parseFromString(decodedXml, "text/xml");

        // Get the provider config from STDB using relayState as provider ID
        let providerId = relayState || "";
        if (!providerId) {
          // Try to find the provider by entity ID in the response
          const issuerEl = xmlDoc.querySelector("Issuer");
          if (issuerEl?.textContent) {
            const providers = await api.saml.list();
            const matched = providers.find(p => p.entity_id === issuerEl.textContent);
            if (matched) providerId = matched.id;
          }
        }

        if (!providerId) {
          setStatus("Could not determine SAML provider. Make sure RelayState is configured.");
          return;
        }

        // Extract attributes from SAML assertion
        const attributeStatement = xmlDoc.querySelector("AttributeStatement");
        const attributes: Record<string, string> = {};

        // NameID from Subject
        const nameIdEl = xmlDoc.querySelector("Subject NameID");
        if (nameIdEl?.textContent) {
          attributes["nameId"] = nameIdEl.textContent;
        }
        // Also check for NameID in SubjectConfirmation
        const subjectConfNameId = xmlDoc.querySelector("SubjectConfirmationData NameID");
        if (subjectConfNameId?.textContent && !attributes["nameId"]) {
          attributes["nameId"] = subjectConfNameId.textContent;
        }

        // SAML attributes
        if (attributeStatement) {
          const attrs = attributeStatement.querySelectorAll("Attribute");
          attrs.forEach(attr => {
            const name = attr.getAttribute("Name") || attr.getAttribute("FriendlyName") || "";
            const value = attr.querySelector("AttributeValue")?.textContent || "";
            if (name && value) {
              attributes[name] = value;
            }
          });
        }

        // Also try to get from the main Attribute elements at root level
        if (attributeStatement) {
          const attrEls = attributeStatement.children;
          for (let i = 0; i < attrEls.length; i++) {
            const el = attrEls[i];
            const name = el.getAttribute("Name") || el.getAttribute("FriendlyName") || "";
            const valEl = el.querySelector("AttributeValue");
            if (name && valEl?.textContent) {
              attributes[name] = valEl.textContent;
            }
          }
        }

        setStatus("Signing in...");

        // Apply attribute mapping
        const provider = await api.saml.get(providerId);
        if (!provider) {
          setStatus("SAML provider not found in database.");
          return;
        }

        let mapping: Record<string, string> = {};
        try { mapping = JSON.parse(provider.attribute_mapping); } catch { mapping = { email: "email", name: "name" }; }

        const email = attributes[mapping.email] || attributes["email"] || attributes["http://schemas.xmlsoap.org/ws/2005/05/identity/claims/emailaddress"] || attributes["nameId"] || "";
        const displayName = attributes[mapping.name] || attributes["name"] || attributes["displayName"] || attributes["http://schemas.xmlsoap.org/ws/2005/05/identity/claims/name"] || email?.split("@")[0] || "User";

        if (!email) {
          setStatus("Could not determine email from SAML response.");
          return;
        }

        // Try to log in with existing account
        const existing = await api.users.getByEmail(email);
        if (existing) {
          localStorage.setItem("sw_user_id", existing.id);
        } else if (provider.auto_register) {
          const id = "user_" + Math.random().toString(36).slice(2, 8);
          await callReducerLocal("register_user", [id, displayName, email, crypto.randomUUID(), "member"]);
          localStorage.setItem("sw_user_id", id);
        } else {
          setStatus(`No account found for ${email}. Auto-registration is disabled.`);
          return;
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

// ─── Permalink Redirect ───────────────────────────────────────────────────

function PermalinkRedirect() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [error, setError] = useState("");

  useEffect(() => {
    if (!id) return;
    // Preserve the hash anchor from the incoming URL (e.g. #heading-id)
    const anchor = window.location.hash;
    api.pages.get(id).then(page => {
      if (page) navigate(`/page/${page.id}${anchor}`, { replace: true });
      else setError("Page not found");
    }).catch(() => setError("Page not found"));
  }, [id, navigate]);

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
  const [samlProviders, setSamlProviders] = useState<SamlProvider[]>([]);

  // Load active OIDC and SAML providers
  useEffect(() => {
    api.oidc.listActive().then(setOidcProviders).catch(() => {});
    api.saml.listActive().then(setSamlProviders).catch(() => {});
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

  // Generic SAML sign-in (HTTP Redirect binding)
  const handleSamlSignIn = (provider: SamlProvider) => {
    // Generate SAML AuthnRequest
    const requestId = "_" + crypto.randomUUID().replace(/-/g, "");
    const issueInstant = new Date().toISOString();
    const acsUrl = `${window.location.origin}/auth/saml/callback`;
    const authnRequest = `<?xml version="1.0" encoding="UTF-8"?>
<samlp:AuthnRequest xmlns:samlp="urn:oasis:names:tc:SAML:2.0:protocol"
  xmlns:saml="urn:oasis:names:tc:SAML:2.0:assertion"
  ID="${requestId}" Version="2.0" IssueInstant="${issueInstant}"
  Destination="${provider.sso_url}"
  AssertionConsumerServiceURL="${acsUrl}">
  <saml:Issuer>spacetime-wiki</saml:Issuer>
  <samlp:NameIDPolicy Format="${provider.name_id_format}" AllowCreate="${provider.auto_register}"/>
</samlp:AuthnRequest>`;

    // Deflate + Base64 encode (SAML HTTP Redirect binding)
    // Use pako for deflate compression
    import("pako").then(pako => {
      const deflated = pako.deflate(new TextEncoder().encode(authnRequest));
      const base64 = btoa(String.fromCharCode(...deflated));
      const relayState = provider.id;
      window.location.href = `${provider.sso_url}?SAMLRequest=${encodeURIComponent(base64)}&RelayState=${relayState}`;
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
          {/* SAML SSO buttons */}
          {samlProviders.map(p => (
            <button key={p.id} onClick={() => handleSamlSignIn(p)}
              className="w-full h-9 rounded-md border border-border bg-card text-sm font-medium hover:bg-muted transition-colors flex items-center justify-center gap-2">
              <svg className="h-4 w-4 text-muted-foreground" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="2" y="4" width="20" height="16" rx="2"/><path d="M8 12h8"/><path d="M8 8h8"/><path d="M8 16h5"/></svg>
              Sign in with {p.name} (SAML)
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

// ─── Markdown helpers (duplicated from PageEditor to avoid circular imports) ──

function markdownToProseMirror(md: string): any {
  const doc: any = { type: "doc", content: [] };
  const lines = md.split("\n");
  let i = 0;
  let inCodeBlock = false;
  let codeLang = "";
  let codeLines: string[] = [];

  function addParagraph(text: string) {
    if (!text.trim()) return;
    const content: any[] = [];
    const parts = text.split(/(\*\*.*?\*\*|_.*?_|`.*?`|~~.*?~~|\[.*?\]\(.*?\))/g);
    for (const part of parts) {
      if (!part) continue;
      if (part.startsWith("**") && part.endsWith("**")) {
        content.push({ type: "text", text: part.slice(2, -2), marks: [{ type: "bold" }] });
      } else if (part.startsWith("_") && part.endsWith("_")) {
        content.push({ type: "text", text: part.slice(1, -1), marks: [{ type: "italic" }] });
      } else if (part.startsWith("`") && part.endsWith("`")) {
        content.push({ type: "text", text: part.slice(1, -1), marks: [{ type: "code" }] });
      } else if (part.startsWith("~~") && part.endsWith("~~")) {
        content.push({ type: "text", text: part.slice(2, -2), marks: [{ type: "strike" }] });
      } else if (part.startsWith("[") && part.includes("](")) {
        const match = part.match(/^\[(.*?)\]\((.*?)\)$/);
        if (match) {
          content.push({ type: "text", text: match[1], marks: [{ type: "link", attrs: { href: match[2] } }] });
        } else {
          content.push({ type: "text", text: part });
        }
      } else {
        content.push({ type: "text", text: part });
      }
    }
    if (content.length > 0) {
      doc.content.push({ type: "paragraph", content });
    }
  }

  while (i < lines.length) {
    const line = lines[i];

    if (inCodeBlock) {
      if (line.startsWith("```")) {
        doc.content.push({ type: "codeBlock", attrs: { language: codeLang }, content: [{ type: "text", text: codeLines.join("\n") }] });
        codeLines = [];
        codeLang = "";
        inCodeBlock = false;
        i++;
        continue;
      }
      codeLines.push(line);
      i++;
      continue;
    }

    if (line.startsWith("```")) {
      inCodeBlock = true;
      codeLang = line.slice(3).trim();
      i++;
      continue;
    }

    if (!line.trim()) { i++; continue; }

    // Heading
    const headingMatch = line.match(/^(#{1,6})\s+(.+)$/);
    if (headingMatch) {
      const level = headingMatch[1].length;
      const text = headingMatch[2];
      doc.content.push({ type: "heading", attrs: { level }, content: [{ type: "text", text }] });
      i++;
      continue;
    }

    // Horizontal rule
    if (/^---+$/.test(line)) {
      doc.content.push({ type: "horizontalRule" });
      i++;
      continue;
    }

    // Blockquote
    if (line.startsWith("> ")) {
      const text = line.slice(2);
      doc.content.push({ type: "blockquote", content: [{ type: "paragraph", content: [{ type: "text", text }] }] });
      i++;
      continue;
    }

    // Unordered list
    if (/^[-*+]\s+/.test(line)) {
      const items: any[] = [];
      while (i < lines.length && /^[-*+]\s+/.test(lines[i])) {
        const itemText = lines[i].replace(/^[-*+]\s+/, "");
        items.push({ type: "listItem", content: [{ type: "paragraph", content: [{ type: "text", text: itemText }] }] });
        i++;
      }
      doc.content.push({ type: "bulletList", content: items });
      continue;
    }

    // Ordered list
    if (/^\d+\.\s+/.test(line)) {
      const items: any[] = [];
      while (i < lines.length && /^\d+\.\s+/.test(lines[i])) {
        const itemText = lines[i].replace(/^\d+\.\s+/, "");
        items.push({ type: "listItem", content: [{ type: "paragraph", content: [{ type: "text", text: itemText }] }] });
        i++;
      }
      doc.content.push({ type: "orderedList", content: items });
      continue;
    }

    // Task list
    if (/^\s*[-*+]\s+[[ x]\]]\s+/i.test(line)) {
      const items: any[] = [];
      while (i < lines.length && /^\s*[-*+]\s+[[ x]\]]\s+/i.test(lines[i])) {
        const checked = lines[i].includes("[x]") || lines[i].includes("[X]");
        const text = lines[i].replace(/^\s*[-*+]\s+[[ x]\]]\s+/i, "");
        items.push({ type: "taskItem", attrs: { checked }, content: [{ type: "paragraph", content: [{ type: "text", text }] }] });
        i++;
      }
      doc.content.push({ type: "taskList", content: items });
      continue;
    }

    // Default: paragraph
    addParagraph(line);
    i++;
  }

  if (inCodeBlock && codeLines.length > 0) {
    doc.content.push({ type: "codeBlock", attrs: { language: codeLang }, content: [{ type: "text", text: codeLines.join("\n") }] });
  }

  if (doc.content.length === 0) {
    doc.content.push({ type: "paragraph", content: [] });
  }
  return doc;
}

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

// ─── Trash Settings component ─────────────────────────���───────────────────

function TrashSettings() {
  const [days, setDays] = useState<number>(0);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [trashCount, setTrashCount] = useState(0);
  const { addToast } = useToast();

  useEffect(() => {
    (async () => {
      try {
        const [retention, deleted] = await Promise.all([
          api.settings.getTrashRetentionDays(),
          api.pages.listDeleted(),
        ]);
        setDays(retention);
        setTrashCount(deleted.length);
      } catch (e) {
        console.error("Failed to load trash settings:", e);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const handleSave = async () => {
    setSaving(true);
    try {
      await api.settings.setTrashRetentionDays(days);
      addToast({ type: "success", title: "Saved", message: `Trash retention set to ${days > 0 ? `${days} days` : "immediate purge (no retention)"}`, duration: 3000 });
    } catch (e) {
      addToast({ type: "error", title: "Failed to save", message: String(e), duration: 5000 });
    } finally {
      setSaving(false);
    }
  };

  const handlePurgeNow = async () => {
    if (!confirm(`Permanently delete all trash pages older than ${days > 0 ? `${days} day(s)` : "any age"}? This cannot be undone.`)) return;
    setSaving(true);
    try {
      await api.settings.purgeExpiredTrash();
      addToast({ type: "success", title: "Purged", message: "Expired trash pages deleted permanently", duration: 3000 });
      const deleted = await api.pages.listDeleted();
      setTrashCount(deleted.length);
    } catch (e) {
      addToast({ type: "error", title: "Purge failed", message: String(e), duration: 5000 });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <div className="flex items-center justify-center py-8"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>;
  }

  return (
    <div className="space-y-4">
      <div className="p-3 rounded-md border border-border bg-muted/10">
        <p className="text-xs text-muted-foreground mb-1">
          Currently <strong className="text-foreground">{trashCount} page(s)</strong> in trash
        </p>
        <p className="text-[10px] text-muted-foreground/60">
          {days > 0
            ? `Pages stay in trash for ${days} day(s) before auto-purge.`
            : "Trash is purged immediately on \"Empty trash\" action (no retention window)."}
        </p>
      </div>

      <div>
        <label className="text-[10px] text-muted-foreground/60 font-medium mb-1 block">
          Auto-purge after N days (0 = manual only)
        </label>
        <div className="flex gap-2">
          <input
            type="number"
            value={days}
            onChange={(e) => setDays(Math.max(0, parseInt(e.target.value) || 0))}
            min={0}
            max={365}
            className="w-24 h-8 px-3 rounded-md border border-border bg-[#0a0a0a] text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary/50"
          />
          <button
            onClick={handleSave}
            disabled={saving}
            className="h-8 px-3 rounded-md text-xs font-medium bg-primary text-white hover:bg-primary/90 disabled:opacity-50 flex items-center gap-1 transition-colors"
          >
            {saving ? <Loader2 className="h-3 w-3 animate-spin" /> : null}
            Save
          </button>
        </div>
      </div>

      <div className="pt-2 border-t border-border">
        <button
          onClick={handlePurgeNow}
          disabled={saving || trashCount === 0}
          className="w-full h-8 rounded-md text-xs font-medium text-red-400 border border-red-500/20 hover:bg-red-500/10 disabled:opacity-50 flex items-center justify-center gap-1 transition-colors"
        >
          <Trash2 className="h-3 w-3" />
          Purge expired trash now
        </button>
      </div>
    </div>
  );
}

// ─── BulkExport component ────────────────────────────────────────────────


// ─── FeatureFlags component ─────────────────────────────────────────────────

function FeatureFlags() {
  const [flags, setFlags] = useState<Record<string, boolean>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const { addToast } = useToast();

  const FEATURES: { key: string; label: string; desc: string }[] = [
    { key: "callouts", label: "Callouts / Notices", desc: "Info, warning, tip, and danger callout blocks" },
    { key: "mermaid", label: "Mermaid Diagrams", desc: "Flowcharts, sequence diagrams, and Gantt charts" },
    { key: "math", label: "Math (LaTeX/KaTeX)", desc: "Inline and block mathematical equations" },
    { key: "embeds", label: "Rich Embeds", desc: "Embed content from YouTube, Figma, CodePen, Spotify, and 30+ providers" },
    { key: "video", label: "Video Embeds", desc: "YouTube, Vimeo, and Loom video embeds" },
    { key: "drawio", label: "Draw.io Diagrams", desc: "Draw.io / diagrams.net inline diagrams" },
    { key: "plantuml", label: "PlantUML Diagrams", desc: "PlantUML sequence and UML diagrams" },
    { key: "details", label: "Toggle Blocks", desc: "Collapsible details/summary toggle blocks" },
    { key: "mentions", label: "@Mentions", desc: "Mention users and pages with @ syntax" },
  ];

  useEffect(() => {
    (async () => {
      try {
        const val = await api.settings.get("feature_flags");
        if (val) {
          const parsed = JSON.parse(val);
          setFlags(parsed);
        } else {
          // Default: all enabled
          const defaults: Record<string, boolean> = {};
          for (const f of FEATURES) defaults[f.key] = true;
          setFlags(defaults);
        }
      } catch (e) {
        console.error("Failed to load feature flags:", e);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const toggleFeature = async (key: string) => {
    const updated = { ...flags, [key]: !flags[key] };
    setFlags(updated);
    setSaving(true);
    try {
      await api.settings.set("feature_flags", JSON.stringify(updated));
      addToast({ type: "success", title: "Feature updated", message: `"${FEATURES.find(f => f.key === key)?.label || key}" ${updated[key] ? "enabled" : "disabled"}`, duration: 2000 });
    } catch (e) {
      addToast({ type: "error", title: "Failed to save", message: String(e), duration: 3000 });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <div className="flex items-center justify-center py-8"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>;
  }

  const enabledCount = Object.values(flags).filter(Boolean).length;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Editor Extensions</p>
        <span className="text-[10px] text-muted-foreground/60">{enabledCount}/{FEATURES.length} enabled</span>
      </div>
      <div className="p-3 rounded-md border border-border bg-muted/10">
        <p className="text-xs text-muted-foreground">
          Toggle editor features on or off. Disabled features will be removed from the editor toolbar,
          slash commands, and keyboard shortcuts. Content created with disabled features will still render
          correctly but cannot be modified.
        </p>
      </div>
      <div className="space-y-1">
        {FEATURES.map((feature) => (
          <div key={feature.key} className="flex items-center gap-3 px-3 py-2.5 rounded-md border border-border hover:bg-muted/30 transition-colors">
            <button
              onClick={() => toggleFeature(feature.key)}
              className={`w-8 h-4 rounded-full transition-colors relative shrink-0 ${flags[feature.key] !== false ? "bg-primary" : "bg-muted"}`}
            >
              <div className={`absolute top-0.5 w-3 h-3 rounded-full bg-white shadow transition-transform ${flags[feature.key] !== false ? "translate-x-4" : "translate-x-0.5"}`} />
            </button>
            <div className="min-w-0 flex-1">
              <p className="text-xs font-medium">{feature.label}</p>
              <p className="text-[10px] text-muted-foreground/60">{feature.desc}</p>
            </div>
            <span className={`text-[10px] font-medium ${flags[feature.key] !== false ? "text-emerald-500" : "text-muted-foreground"}`}>
              {flags[feature.key] !== false ? "ON" : "OFF"}
            </span>
          </div>
        ))}
      </div>
      {saving && (
        <div className="flex items-center gap-2 text-[10px] text-muted-foreground">
          <Loader2 className="h-3 w-3 animate-spin" /> Saving...
        </div>
      )}
    </div>
  );
}


function BulkExport() {
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);
  const [allPages, setAllPages] = useState<Page[]>([]);
  const [collections, setCollections] = useState<Collection[]>([]);
  const [selectedColId, setSelectedColId] = useState<string>("__all");
  const [exportFormat, setExportFormat] = useState<"md" | "html" | "pdf">("md");

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
      if (exportFormat === "pdf") {
        // Generate a print-ready HTML document with all pages
        let pdfHtml = `<!DOCTYPE html>
<html><head><meta charset="UTF-8"><title>Wiki Export</title>
<style>
  @media print { body { margin: 0; padding: 0; } .page-break { page-break-before: always; } }
  body { font-family: system-ui, -apple-system, sans-serif; max-width: 800px; margin: 0 auto; padding: 40px; line-height: 1.6; color: #1a1a1a; }
  h1, h2, h3, h4 { color: #000; margin-top: 1.5em; margin-bottom: 0.5em; }
  h1 { font-size: 2em; border-bottom: 2px solid #e5e5e5; padding-bottom: 0.3em; }
  h2 { font-size: 1.5em; border-bottom: 1px solid #e5e5e5; padding-bottom: 0.2em; }
  h3 { font-size: 1.25em; }
  pre { background: #f5f5f5; padding: 16px; border-radius: 6px; overflow-x: auto; font-size: 13px; }
  code { background: #f0f0f0; padding: 2px 6px; border-radius: 3px; font-size: 0.9em; }
  pre code { background: none; padding: 0; }
  blockquote { border-left: 4px solid #d0d0d0; margin: 1em 0; padding: 0.5em 1em; color: #555; background: #fafafa; }
  table { border-collapse: collapse; width: 100%; margin: 1em 0; }
  th, td { border: 1px solid #d0d0d0; padding: 8px 12px; text-align: left; }
  th { background: #f0f0f0; font-weight: 600; }
  img { max-width: 100%; height: auto; }
  ul, ol { padding-left: 1.5em; }
  li { margin: 0.25em 0; }
  .page-header { border-bottom: 2px solid #333; padding-bottom: 0.5em; margin-bottom: 1em; }
  .page-footer { font-size: 0.8em; color: #888; border-top: 1px solid #e5e5e5; padding-top: 0.5em; margin-top: 1em; }
  .cover-page { text-align: center; padding-top: 30vh; }
  .cover-page h1 { font-size: 2.5em; border: none; }
  .cover-page p { color: #666; font-size: 1.1em; }
  .toc { margin: 2em 0; }
  .toc a { color: #333; text-decoration: none; display: block; padding: 0.3em 0; }
  .toc a:hover { color: #0066cc; }
</style></head><body>
  <div class="cover-page">
    <h1>Wiki Export</h1>
    <p>${filteredPages.length} pages exported on ${new Date().toLocaleDateString()}</p>
  </div>`;
        for (let i = 0; i < filteredPages.length; i++) {
          const page = filteredPages[i];
          const safeTitle = page.title || "Untitled";
          let contentHtml = "";
          try {
            const json = JSON.parse(page.content || "{}");
            contentHtml = tiptapToHTML(json);
          } catch { contentHtml = `<p>${page.content || ""}</p>`; }
          const colName = collections.find(c => c.id === page.collection_id)?.name || "";
          pdfHtml += `<div class="${i > 0 ? "page-break" : ""}">
            <div class="page-header"><h1>${safeTitle}</h1>${colName ? `<span style="color:#888;font-size:0.9em">📁 ${colName}</span>` : ""}</div>
            ${contentHtml}
            <div class="page-footer">Updated ${new Date(page.updated_at).toLocaleDateString()} | v${page.id.slice(0,8)}</div>
          </div>`;
        }
        pdfHtml += `</body></html>`;
        // Open in new window for print/PDF save
        const win = window.open("", "_blank");
        if (win) {
          win.document.write(pdfHtml);
          win.document.close();
          win.focus();
        }
        setExporting(false);
        return;
      }

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
          <button
            onClick={() => setExportFormat("pdf")}
            className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
              exportFormat === "pdf"
                ? "bg-primary/10 text-primary border border-primary/20"
                : "border border-border text-muted-foreground hover:text-foreground hover:bg-muted"
            }`}
          >
            PDF
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
      <ToastProvider>
        <AppLayout />
      </ToastProvider>
    </BrowserRouter>
  );
}
