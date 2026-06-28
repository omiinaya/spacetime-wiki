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
  Mail, Share2, Code,
} from "lucide-react";
import { api, Page, Collection, ApiKey, OidcProvider, SamlProvider, LdapProvider, OauthProvider, ScimProvider, ScimEvent, PasskeyCredential, usePagesSubscription, useCollectionsSubscription, useNotificationsSubscription, useWatchSubscription, Notification as NotifType } from "./lib/api";
import { cn, timeAgo } from "./lib/utils";
import { connectSubscriptions, disconnectSubscriptions, defaultSubscriptionManager } from "./lib/subscriptions";
import { SearchFilters, EMPTY_FILTERS, type SearchFilterState } from "./components/SearchFilters";
import { WebhookSettings } from "./components/WebhookSettings";
import { TemplatePicker } from "./components/TemplatePicker";
import { KeyboardShortcuts } from "./components/KeyboardShortcuts";
import { ToastProvider, useToast, initGlobalToast, showToast } from "./components/Toast";
import { LanguageSwitcher } from "./components/LanguageSwitcher";
import { AiAssistant } from "./components/AiAssistant";
import { ActivityFeed } from "./components/ActivityFeed";
import { NotificationBell } from "./components/NotificationBell";
import AccessRequestPanel from "./components/AccessRequestPanel";
import { htmlToProseMirror, extractInlineContent, markdownToProseMirror, tiptapToMarkdown, tiptapToHTML, arrayBufferToBase64Url } from "./lib/tiptap-helpers";
import React from "react";

// Route-level page components
import HomeView from "./pages/HomeView";
import ActivityView from "./pages/ActivityView";
import FavoritesView from "./pages/FavoritesView";
import PageViewWrapper from "./pages/PageViewWrapper";
import SlugView from "./pages/SlugView";
import PermalinkRedirect from "./pages/PermalinkRedirect";
import LoginView from "./pages/LoginView";
import GoogleCallback from "./pages/GoogleCallback";
import OAuthCallback from "./pages/OAuthCallback";
import OidcCallback from "./pages/OidcCallback";
import SamlCallback from "./pages/SamlCallback";

// Lazy-loaded route-level components
const PageEditor = React.lazy(() => import("./pages/PageEditor").then(m => ({ default: m.PageEditor })));
const AdminDashboard = React.lazy(() => import("./components/AdminDashboard"));
const GraphView = React.lazy(() => import("./components/GraphView"));

const RouteFallback = () => <div className="flex items-center justify-center h-full"><div className="h-5 w-5 animate-spin rounded-full border-2 border-primary border-t-transparent" /></div>;

// ─── Layout ──────────────────────────────────────────────────────────────────

function AppLayout() {
  const navigate = useNavigate();
  const location = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [collections, setCollections] = useState<Collection[]>([]);
  const [pages, setPages] = useState<Page[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchFilters, setSearchFilters] = useState<SearchFilterState>(EMPTY_FILTERS);
  const [allPageTags, setAllPageTags] = useState<Map<string, Set<string>>>(new Map());

  // Admin state (declared early for search syntax handler that references allUsers)
  const [adminOpen, setAdminOpen] = useState(false);
  const [allUsers, setAllUsers] = useState<{ id: string; name: string; email: string; role: string; avatar_url: string }[]>([]);
  const [adminTab, setAdminTab] = useState<"dashboard" | "users" | "groups" | "webhooks" | "sso" | "settings" | "features" | "export" | "scim" | "passkeys" | "invitations" | "access_requests" | "mfa" | "ldap" | "oauth">("dashboard");
  // Parse advanced search syntax from search input: in:Name, author:Name, from:Date, to:Date, date:Date, tag:key:value
  const handleSearchInput = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value;
    // Extract syntax tokens from the raw query
    let clean = raw;
    let collId = searchFilters.collectionId;
    let authId = searchFilters.authorId;
    let dateFrom = searchFilters.dateFrom;
    let dateTo = searchFilters.dateTo;
    let tagFilters = searchFilters.tags || "";

    // Match patterns like "in:CollectionName" or "author:UserName" or "from:2026-01-01" etc.
    const patterns = [
      { regex: /\bin:("[^"]+"|\S+)/gi, apply: (match: string) => {
        const name = match.replace(/^in:/i, "").replace(/"/g, "").trim();
        const found = collections.find(c => c.name.toLowerCase() === name.toLowerCase());
        if (found) collId = found.id;
        return "";
      }},
      { regex: /\bauthor:("[^"]+"|\S+)/gi, apply: (match: string) => {
        const name = match.replace(/^author:/i, "").replace(/"/g, "").trim();
        const found = allUsers.find(u => (u.name || u.email).toLowerCase() === name.toLowerCase());
        if (found) authId = found.id;
        return "";
      }},
      { regex: /\bby:("[^"]+"|\S+)/gi, apply: (match: string) => {
        const name = match.replace(/^by:/i, "").replace(/"/g, "").trim();
        const found = allUsers.find(u => (u.name || u.email).toLowerCase() === name.toLowerCase());
        if (found) authId = found.id;
        return "";
      }},
      { regex: /\bfrom:(\d{4}-\d{2}(?:-\d{2})?)/gi, apply: (match: string) => {
        const d = match.replace(/^from:/i, "").trim();
        dateFrom = d;
        return "";
      }},
      { regex: /\bto:(\d{4}-\d{2}(?:-\d{2})?)/gi, apply: (match: string) => {
        const d = match.replace(/^to:/i, "").trim();
        dateTo = d;
        return "";
      }},
      { regex: /\bdate:(\d{4}-\d{2}(?:-\d{2})?)/gi, apply: (match: string) => {
        const d = match.replace(/^date:/i, "").trim();
        dateFrom = d;
        dateTo = d;
        return "";
      }},
      // tag:name or tag:name=value syntax
      { regex: /\btag:("[^"]+"|\S+)/gi, apply: (match: string) => {
        const spec = match.replace(/^tag:/i, "").replace(/"/g, "").trim();
        if (spec) {
          const existing = tagFilters ? tagFilters.split(",") : [];
          // Check if already present
          if (!existing.some(s => s.trim().toLowerCase() === spec.toLowerCase())) {
            existing.push(spec);
          }
          tagFilters = existing.join(",");
        }
        return "";
      }},
    ];

    for (const p of patterns) {
      clean = clean.replace(p.regex, p.apply as any);
    }

    // Trim and deduplicate spaces
    clean = clean.replace(/\s+/g, " ").trim();

    setSearchQuery(clean);

    // Update filters if any changed
    const filtersChanged = collId !== searchFilters.collectionId ||
      authId !== searchFilters.authorId ||
      dateFrom !== searchFilters.dateFrom ||
      dateTo !== searchFilters.dateTo ||
      tagFilters !== searchFilters.tags;
    if (filtersChanged) {
      setSearchFilters({
        collectionId: collId,
        authorId: authId,
        dateFrom,
        dateTo,
        tags: tagFilters,
      });
    }
  }, [searchFilters, collections, setSearchQuery, setSearchFilters, allUsers]);
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

  // Collection page sort modes — merge server-side rules with localStorage fallback
  const COLLECTION_SORT_KEY = "sw_collection_sort";
  const [collectionSortModes, setCollectionSortModes] = useState<Record<string, string>>(() => {
    try { return JSON.parse(localStorage.getItem(COLLECTION_SORT_KEY) || "{}"); }
    catch { return {}; }
  });
  const [colSortMode, setColSortMode] = useState("manual");
  const [colAutoApply, setColAutoApply] = useState(false);
  const [sortRulesLoaded, setSortRulesLoaded] = useState(false);

  const sidebarNavRef = useRef<HTMLDivElement>(null);

  const saveCollectionSortMode = (colId: string, mode: string, autoApply = false) => {
    const updated = { ...collectionSortModes, [colId]: mode };
    setCollectionSortModes(updated);
    try { localStorage.setItem(COLLECTION_SORT_KEY, JSON.stringify(updated)); } catch {}
    // Also sync to server
    const field = mode === "manual" ? "manual" : mode.replace("-asc", "").replace("-desc", "");
    const dir = mode.endsWith("-desc") ? "desc" : "asc";
    if (mode !== "manual") {
      api.collections.sortRules.set(colId, field, dir, autoApply, userId || "anonymous").catch(() => {});
    } else {
      api.collections.sortRules.set(colId, "manual", "asc", false, userId || "anonymous").catch(() => {});
    }
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
  const [shareLinks, setShareLinks] = useState<{ id: string; token: string; expires_at: number; visit_count: number; password_hash: string; brand_title: string | null; brand_logo_url: string | null }[]>([]);
  const [editBrandShareId, setEditBrandShareId] = useState<string | null>(null);
  const [editBrandTitle, setEditBrandTitle] = useState("");
  const [editBrandLogoUrl, setEditBrandLogoUrl] = useState("");
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
  const confluenceImportRef = useRef<HTMLInputElement>(null);
  const [importingConfluence, setImportingConfluence] = useState(false);

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
  // Subscribe to notifications (real-time)
  const { rows: subNotifications } = useNotificationsSubscription(userId || undefined);

  // Sync subscription data to local state
  useEffect(() => {
    setPages(subPages);
  }, [subPages]);

  useEffect(() => {
    setCollections(subCollections);
  }, [subCollections]);

  // ─── Notification state ───────────────────────────────────────────────────
  const [notificationList, setNotificationList] = useState<NotifType[]>([]);
  const prevNotifLenRef = useRef(0);

  // Sync subscription notifications to local state
  useEffect(() => {
    setNotificationList(subNotifications);
    // Show toast when new notification arrives
    if (subNotifications.length > prevNotifLenRef.current && prevNotifLenRef.current > 0) {
      const latest = subNotifications[0];
      if (latest && !latest.is_read) {
        showToast({
          type: "info",
          title: latest.title,
          message: latest.message,
          duration: 5000,
          action: latest.target_id ? {
            label: "View",
            onClick: () => window.location.assign(`/page/${latest.target_id}`),
          } : undefined,
        });
      }
    }
    prevNotifLenRef.current = subNotifications.length;
  }, [subNotifications]);

  const refreshNotifications = useCallback(() => {
    // Notifications are already updated via subscriptions, but trigger a re-fetch
    if (userId) {
      api.notifications.list(userId, 100).then(setNotificationList).catch(() => {});
    }
  }, [userId]);

  // ─── AI Assistant state ────────────────────────────────────────────────────
  const [aiAssistantOpen, setAiAssistantOpen] = useState(false);

  // Get current page ID and title from URL + pages list for AI context
  const currentPageId = location.pathname.match(/^\/page\/([^\/]+)(?:\/edit)?$/)?.[1] || "";
  const currentPageTitle = currentPageId
    ? pages.find(p => p.id === currentPageId)?.title || ""
    : "";

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

  // Stop loading once we have data from either source
  useEffect(() => {
    if ((pagesConnected || colsConnected) && (subPages.length > 0 || subCollections.length > 0)) {
      setLoading(false);
    }
  }, [pagesConnected, colsConnected, subPages.length, subCollections.length]);

  // Load all tags for sidebar filtering
  useEffect(() => {
    api.tags.listAll().then((tagRows) => {
      const map = new Map<string, Set<string>>();
      for (const tag of tagRows) {
        if (!map.has(tag.page_id)) map.set(tag.page_id, new Set());
        map.get(tag.page_id)!.add(tag.name);
      }
      setAllPageTags(map);
    }).catch(() => {});
  }, []);

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
        // Use the REST API search when there are active filters or a query
        const hasFilters = searchFilters.collectionId || searchFilters.authorId ||
          searchFilters.dateFrom || searchFilters.dateTo || searchFilters.tags;
        if (searchQuery || hasFilters) {
          const result = await api.pages.search({
            q: searchQuery || "",
            ...(searchFilters.collectionId ? { collection_id: searchFilters.collectionId } : {}),
            ...(searchFilters.authorId ? { author_id: searchFilters.authorId } : {}),
            ...(searchFilters.dateFrom ? { from: searchFilters.dateFrom } : {}),
            ...(searchFilters.dateTo ? { to: searchFilters.dateTo } : {}),
            ...(searchFilters.tags ? { tags: searchFilters.tags } : {}),
            limit: 100,
          });
          // Map search results back to Page objects (fetch full pages for matching IDs)
          if (result.data && result.data.length > 0) {
            const pageIds = result.data.map(r => r.page_id);
            const allPages = await api.pages.list();
            const filtered = allPages.filter(p => pageIds.includes(p.id));
            setPages(filtered);
          } else {
            setPages([]);
          }
        } else {
          // No filters — fetch all pages for sidebar display
          const results = await api.pages.list();
          setPages(results);
        }
      } catch {
        // Fall back to client-side approach if API fails
        try {
          const results = await api.pages.list();
          setPages(results);
        } catch { /* keep existing */ }
      }
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
    // Tag filter
    if (searchFilters.tags) {
      const pageTags = allPageTags.get(p.id);
      if (!pageTags || pageTags.size === 0) return false;
      const filterTags = searchFilters.tags.split(",").map((t) => t.trim().toLowerCase()).filter(Boolean);
      const matchesTag = filterTags.some((t) => [...pageTags].some((pt) => pt.toLowerCase() === t));
      if (!matchesTag) return false;
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
    return (colChildren.get(parentId) || [])
      .sort((a, b) => a.sort_order - b.sort_order)
      .map(col => ({
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
      // Handle single HTML file import (Notion HTML export single page)
      if (file.name.endsWith(".html") || file.name.endsWith(".htm")) {
        const html = await file.text();
        const doc = htmlToProseMirror(html);
        const title = file.name.replace(/\.html?$/i, "");
        const id = await api.pages.create(title, JSON.stringify(doc), "", "", userId || "anonymous");
        addToast({ type: "success", title: "Imported", message: `"${title}" imported from HTML`, duration: 4000 });
        navigate(`/page/${id}`);
        return;
      }

      // ZIP-based import (Notion Markdown or HTML export)
      const zip = await JSZip.loadAsync(file);
      // Collect all .md and .html entries with their paths
      const contentEntries: { path: string; name: string; dir: string; ext: string }[] = [];
      zip.forEach((path, entry) => {
        if (!entry.dir) {
          const parts = path.split("/");
          const filename = parts.pop() || "";
          if (filename.endsWith(".md")) {
            contentEntries.push({
              path,
              name: filename.replace(/\.md$/i, ""),
              dir: parts.join("/"),
              ext: ".md",
            });
          } else if (filename.endsWith(".html") || filename.endsWith(".htm")) {
            contentEntries.push({
              path,
              name: filename.replace(/\.html?$/i, ""),
              dir: parts.join("/"),
              ext: ".html",
            });
          }
        }
      });
      if (contentEntries.length === 0) {
        addToast({ type: "error", title: "No pages found", message: "No Markdown or HTML files found in the ZIP archive", duration: 5000 });
        return;
      }
      // Sort by path depth (shallow first = parents created before children)
      contentEntries.sort((a, b) => a.path.split("/").length - b.path.split("/").length);
      // Track created page IDs by their directory prefix
      const pageIdsByDir: Record<string, string> = {};
      let created = 0;
      for (const entry of contentEntries) {
        const raw = await zip.file(entry.path)?.async("string") || "";
        const doc = entry.ext === ".html" ? htmlToProseMirror(raw) : markdownToProseMirror(raw);
        const parentId = pageIdsByDir[entry.dir] || "";
        const id = await api.pages.create(entry.name, JSON.stringify(doc), "", parentId, userId || "anonymous");
        // Map this entry's path prefix (without extension) so children can find it
        const childKey = entry.path.replace(/\.\w+$/, "");
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

  const handleImportConfluence = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setImportingConfluence(true);
    try {
      // Use the server-side Confluence import endpoint
      const formData = new FormData();
      formData.append("file", file);
      formData.append("collection_id", "");
      formData.append("created_by", userId || "anonymous");

      // Determine API base URL
      const apiBase = (window as any).__API_BASE__ || "/api/v1";
      const res = await fetch(`${apiBase}/import/confluence`, {
        method: "POST",
        headers: { "X-API-Key": (window as any).__API_KEY__ || "" },
        body: formData,
      });
      if (!res.ok) {
        const text = await res.text();
        throw new Error(text || `Server error: ${res.status}`);
      }
      const result = await res.json();
      const created = result.pages_created || 0;
      addToast({
        type: "success",
        title: "Confluence import complete",
        message: `Created ${created} pages from "${file.name}"`,
        duration: 4000,
      });
      // Reload pages
      api.pages.list().then(setPages).catch(() => {});
    } catch (err) {
      addToast({ type: "error", title: "Confluence import failed", message: String(err), duration: 5000 });
    } finally {
      setImportingConfluence(false);
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

  const openEditCol = async (col: Collection) => {
    setEditingCol(col);
    setColName(col.name);
    setColDesc(col.description);
    setColIcon(col.icon || "📁");
    setColColor(col.color);
    setColSortMode(collectionSortModes[col.id] || "manual");
    setColAutoApply(false);
    // Load server-side sort rule if available
    try {
      const rule = await api.collections.sortRules.get(col.id);
      if (rule) {
        const mode = rule.sort_field === "manual" ? "manual"
          : rule.sort_field + "-" + rule.sort_direction;
        setColSortMode(mode);
        setColAutoApply(rule.auto_apply);
        // Also update localStorage cache
        const updated = { ...collectionSortModes, [col.id]: mode };
        setCollectionSortModes(updated);
        try { localStorage.setItem(COLLECTION_SORT_KEY, JSON.stringify(updated)); } catch {}
      }
    } catch {}
    setColDialogOpen(true);
    setContextMenu(null);
  };

  const saveCollection = async () => {
    if (!colName.trim()) return;
    try {
      if (editingCol) {
        await api.collections.update(editingCol.id, colName, colDesc, colIcon, colColor);
        saveCollectionSortMode(editingCol.id, colSortMode, colAutoApply);
        addToast({ type: "success", title: "Collection updated", duration: 3000 });
      } else {
        await api.collections.create(colName, colDesc, "", colIcon, colColor, userId || "anonymous");
        addToast({ type: "success", title: "Collection created", duration: 3000 });
      }
      setColDialogOpen(false);
      await refreshData();
    } catch (err) {
      addToast({ type: "error", title: "Failed to save collection", message: String(err), duration: 5000 });
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

  const updateUserAvatar = async (userId: string, avatarUrl: string) => {
    const currentUser = localStorage.getItem("sw_user_id") || "";
    try {
      await api.users.updateAvatar(userId, avatarUrl, currentUser);
      setAllUsers(prev => prev.map(u => u.id === userId ? { ...u, avatar_url: avatarUrl } : u));
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

  const updateShareBranding = async (shareId: string) => {
    try {
      await api.shareLinks.updateBranding(shareId, editBrandTitle || null, editBrandLogoUrl || null);
      setEditBrandShareId(null);
      if (shareDialog) {
        const links = await api.shareLinks.list(shareDialog.pageId);
        setShareLinks(links);
      }
    } catch (e) { alert(String(e)); }
  };

  const openBrandingEditor = (share: { id: string; brand_title: string | null; brand_logo_url: string | null }) => {
    setEditBrandShareId(share.id);
    setEditBrandTitle(share.brand_title || "");
    setEditBrandLogoUrl(share.brand_logo_url || "");
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
  const [dragColId, setDragColId] = useState<string | null>(null);

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

  const handleColDragStart = (e: React.DragEvent, colId: string) => {
    setDragColId(colId);
    e.dataTransfer.effectAllowed = "move";
    e.dataTransfer.setData("text/plain", colId);
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
    setDragColId(null);
    setDragOverTarget(null);
  };

  const handleDropOnCollection = async (e: React.DragEvent, colId: string) => {
    e.preventDefault();
    const droppedId = e.dataTransfer.getData("text/plain") || dragPageId || dragColId;
    if (!droppedId || droppedId === colId) { setDragColId(null); return; }
    // Collection being dropped — reorder within the same parent level
    if (droppedId.startsWith("col_")) {
      setDragColId(null);
      // Find this collection to get its parent_id
      const droppedCol = collections.find(c => c.id === droppedId);
      const targetCol = collections.find(c => c.id === colId);
      if (!droppedCol || !targetCol) return;
      // Get all siblings at the same parent level, sorted by sort_order
      const parentId = droppedCol.parent_id || "";
      const siblings = collections
        .filter(c => (c.parent_id || "") === parentId)
        .sort((a, b) => a.sort_order - b.sort_order);
      // Build new order: remove dropped collection from current position,
      // insert after the target collection
      const newOrder = siblings.filter(c => c.id !== droppedId);
      const targetIdx = newOrder.findIndex(c => c.id === colId);
      newOrder.splice(targetIdx + 1, 0, droppedCol);
      await api.collections.reorder(newOrder.map(c => c.id));
      await refreshData();
      return;
    }
    // Page being dropped — move to collection
    await api.pages.move(droppedId, colId, "");
    setDragPageId(null);
    await refreshData();
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
      { label: "Activity", subtitle: "View recent wiki activity", icon: <History className="h-4 w-4" />, shortcut: "G A", action: () => { closePalette(); navigate("/activity"); } },
      { label: "Graph view", subtitle: "Visualize page relationships", icon: <Share2 className="h-4 w-4" />, shortcut: "G G", action: () => { closePalette(); navigate("/graph"); } },
      { label: "API Docs", subtitle: "Open API documentation (Swagger UI)", icon: <Code className="h-4 w-4" />, action: () => { closePalette(); window.open(`${window.location.protocol}//${window.location.hostname}:8711/docs`, '_blank'); } },
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
              draggable
              onDragStart={(e) => handleColDragStart(e, col.id)}
              onDragOver={(e) => { e.preventDefault(); setDragOverTarget(col.id); }}
              onDrop={(e) => handleDropOnCollection(e, col.id)}
              onDragEnd={handleDragEnd}
              className="flex-1 flex items-center gap-1.5 px-2 py-1.5 rounded-md text-xs font-medium text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors text-left cursor-grab active:cursor-grabbing"
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
                    {searchQuery && page.text_content && (
                      <span className="block text-[11px] text-muted-foreground/60 mt-0.5 max-w-full leading-relaxed">
                        {(() => {
                          const q = searchQuery.toLowerCase();
                          const text = page.text_content.replace(/\n/g, " ");
                          const idx = text.toLowerCase().indexOf(q);
                          if (idx < 0) return text.slice(0, 80);
                          const start = Math.max(0, idx - 30);
                          const end = Math.min(text.length, idx + q.length + 50);
                          const snippet = text.slice(start, end);
                          const parts: JSX.Element[] = [];
                          // Split by the query (case-insensitive), preserving match cases
                          const lowerSnippet = snippet.toLowerCase();
                          let cursor = 0;
                          let matchIdx = lowerSnippet.indexOf(q, cursor);
                          if (start > 0) parts.push(<span key="lead" className="opacity-50">…</span>);
                          while (matchIdx >= 0) {
                            if (matchIdx > cursor) {
                              parts.push(<span key={`t-${cursor}`}>{snippet.slice(cursor, matchIdx)}</span>);
                            }
                            parts.push(
                              <mark key={`m-${matchIdx}`} className="bg-yellow-500/30 text-foreground rounded-sm px-0.5">
                                {snippet.slice(matchIdx, matchIdx + q.length)}
                              </mark>
                            );
                            cursor = matchIdx + q.length;
                            matchIdx = lowerSnippet.indexOf(q, cursor);
                          }
                          if (cursor < snippet.length) {
                            parts.push(<span key={`t-${cursor}`}>{snippet.slice(cursor)}</span>);
                          }
                          if (end < text.length) parts.push(<span key="trail" className="opacity-50">…</span>);
                          return parts;
                        })()}
                      </span>
                    )}
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
          <div className="ml-auto flex items-center gap-1">
            <NotificationBell
              userId={userId}
              notifications={notificationList}
              onRefresh={refreshNotifications}
            />
            <button className="md:hidden p-1" onClick={() => setSidebarOpen(false)}>
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Search */}
        <div className="px-3 py-2">
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground/60" />
            <input
              type="text" placeholder="Search..."
              value={searchQuery}
              onChange={handleSearchInput}
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
          <button onClick={() => navigate('/activity')} className="w-full flex items-center gap-2 px-2 py-1.5 rounded-md text-xs text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors">
            <History className="h-3 w-3" /> Activity
          </button>
          <button onClick={() => navigate('/graph')} className="w-full flex items-center gap-2 px-2 py-1.5 rounded-md text-xs text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors">
            <Share2 className="h-3 w-3" /> Graph
          </button>
          <button onClick={() => window.open(`${window.location.protocol}//${window.location.hostname}:8711/docs`, '_blank')} className="w-full flex items-center gap-2 px-2 py-1.5 rounded-md text-xs text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors">
            <Code className="h-3 w-3" /> API Docs
          </button>
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
          <button onClick={() => setAiAssistantOpen(true)} className="w-full flex items-center gap-2 px-2 py-1.5 rounded-md text-xs text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors">
            <MessageSquare className="h-3 w-3" /> AI Assistant
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
          <input ref={notionImportRef} type="file" accept=".zip,.html,.htm" onChange={handleImportNotion} className="hidden" />
          <button
            onClick={() => notionImportRef.current?.click()}
            disabled={importingNotion}
            className="w-full flex items-center gap-2 px-2 py-1.5 rounded-md text-xs text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors disabled:opacity-50"
          >
            {importingNotion ? <Loader2 className="h-3 w-3 animate-spin" /> : <Package className="h-3 w-3" />}
            {importingNotion ? "Importing..." : "Import Wiki"}
          </button>
          <input ref={confluenceImportRef} type="file" accept=".zip" onChange={handleImportConfluence} className="hidden" />
          <button
            onClick={() => confluenceImportRef.current?.click()}
            disabled={importingConfluence}
            className="w-full flex items-center gap-2 px-2 py-1.5 rounded-md text-xs text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors disabled:opacity-50"
          >
            {importingConfluence ? <Loader2 className="h-3 w-3 animate-spin" /> : <Download className="h-3 w-3" />}
            {importingConfluence ? "Importing..." : "Import Confluence"}
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
              <button
                onClick={() => {
                  const page = pages.find(p => p.id === contextMenu.pageId);
                  if (page) {
                    const mdLink = `[${page.title}](${window.location.origin}/page/${page.slug || page.id})`;
                    navigator.clipboard.writeText(mdLink).catch(() => {});
                    showToast({ type: "success", title: "Markdown link copied", duration: 2000 });
                  }
                  setContextMenu(null);
                }}
                className="w-full flex items-center gap-2 px-3 py-1.5 text-xs hover:bg-muted transition-colors text-left"
              >
                <Code className="h-3 w-3" /> Copy as markdown link
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
              <button onClick={() => setAdminTab("dashboard")}
                className={`px-3 py-1.5 text-xs font-medium rounded-t-md transition-colors ${adminTab === "dashboard" ? "bg-primary/10 text-primary border-b-2 border-primary" : "text-muted-foreground hover:text-foreground"}`}>
                <svg className="h-3 w-3 inline mr-1" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/></svg>
                Dashboard
              </button>
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
              <button onClick={() => setAdminTab("scim")}
                className={`px-3 py-1.5 text-xs font-medium rounded-t-md transition-colors ${adminTab === "scim" ? "bg-primary/10 text-primary border-b-2 border-primary" : "text-muted-foreground hover:text-foreground"}`}>
                <Shield className="h-3 w-3 inline mr-1" />SCIM
              </button>
              <button onClick={() => setAdminTab("passkeys")}
                className={`px-3 py-1.5 text-xs font-medium rounded-t-md transition-colors ${adminTab === "passkeys" ? "bg-primary/10 text-primary border-b-2 border-primary" : "text-muted-foreground hover:text-foreground"}`}>
                <svg className="h-3 w-3 inline mr-1" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/><circle cx="12" cy="16" r="1"/></svg>
                Passkeys
              </button>
              <button onClick={() => setAdminTab("invitations")}
                className={`px-3 py-1.5 text-xs font-medium rounded-t-md transition-colors ${adminTab === "invitations" ? "bg-primary/10 text-primary border-b-2 border-primary" : "text-muted-foreground hover:text-foreground"}`}>
                <Mail className="h-3 w-3 inline mr-1" />Invitations
              </button>
              <button onClick={() => setAdminTab("access_requests")}
                className={`px-3 py-1.5 text-xs font-medium rounded-t-md transition-colors ${adminTab === "access_requests" ? "bg-primary/10 text-primary border-b-2 border-primary" : "text-muted-foreground hover:text-foreground"}`}>
                <svg className="h-3 w-3 inline mr-1" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/><path d="M9 12l2 2 4-4"/></svg>
                Access Requests
              </button>
              <button onClick={() => setAdminTab("mfa")}
                className={`px-3 py-1.5 text-xs font-medium rounded-t-md transition-colors ${adminTab === "mfa" ? "bg-primary/10 text-primary border-b-2 border-primary" : "text-muted-foreground hover:text-foreground"}`}>
                <svg className="h-3 w-3 inline mr-1" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
                MFA
              </button>
              <button onClick={() => setAdminTab("oauth")}
                className={`px-3 py-1.5 text-xs font-medium rounded-t-md transition-colors ${adminTab === "oauth" ? "bg-primary/10 text-primary border-b-2 border-primary" : "text-muted-foreground hover:text-foreground"}`}>
                <svg className="h-3 w-3 inline mr-1" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M22 12c0 5.523-4.477 10-10 10S2 17.523 2 12 6.477 2 12 2s10 4.477 10 10z"/><path d="M12 6v12M6 12h12"/></svg>
                OAuth
              </button>
              <button onClick={() => setAdminTab("ldap")}
                className={`px-3 py-1.5 text-xs font-medium rounded-t-md transition-colors ${adminTab === "ldap" ? "bg-primary/10 text-primary border-b-2 border-primary" : "text-muted-foreground hover:text-foreground"}`}>
                <svg className="h-3 w-3 inline mr-1" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
                LDAP
              </button>
            </div>

            {adminTab === "dashboard" && <React.Suspense fallback={<div className="flex items-center justify-center p-12"><div className="h-5 w-5 animate-spin rounded-full border-2 border-primary border-t-transparent" /></div>}><AdminDashboard userId={userId} /></React.Suspense>}
            {adminTab === "users" && (
              <>
                <div className="space-y-1 mb-4">
                  {allUsers.map(u => (
                    <div key={u.id} className="flex flex-col gap-2 px-3 py-2 rounded-md border border-border hover:bg-muted/30 transition-colors">
                      <div className="flex items-center gap-3">
                        <div className="relative w-6 h-6 shrink-0">
                          {u.avatar_url ? (
                            <img src={u.avatar_url} alt="" className="w-full h-full rounded-full object-cover" onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }} />
                          ) : null}
                          <div className={`w-full h-full rounded-full bg-primary/10 flex items-center justify-center text-[10px] font-bold text-primary ${u.avatar_url ? 'hidden' : ''}`}>
                            {(u.name || "?").charAt(0).toUpperCase()}
                          </div>
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-medium truncate">{u.name}</p>
                          <p className="text-[10px] text-muted-foreground/60 truncate">{u.email}</p>
                        </div>
                        <div className="flex items-center gap-1">
                          <input
                            type="text"
                            defaultValue={u.avatar_url}
                            placeholder="Avatar URL"
                            id={`avatar-input-${u.id}`}
                            className="w-32 h-7 px-2 rounded-md border border-border bg-[#0a0a0a] text-[10px] text-foreground focus:outline-none focus:ring-1 focus:ring-primary/50"
                          />
                          <button
                            onClick={() => {
                              const input = document.getElementById(`avatar-input-${u.id}`) as HTMLInputElement;
                              const url = input?.value?.trim() ?? "";
                              updateUserAvatar(u.id, url);
                            }}
                            className="h-7 px-2 rounded-md text-[10px] font-medium bg-primary/10 text-primary hover:bg-primary/20 transition-colors"
                            title="Save avatar URL"
                          >
                            Save
                          </button>
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
            {adminTab === "scim" && <ScimSettings userId={userId} />}
            {adminTab === "passkeys" && <PasskeySettings userId={userId} />}
            {adminTab === "invitations" && <InvitationSettings userId={userId} />}
            {adminTab === "access_requests" && <AccessRequestPanel userId={userId} />}
            {adminTab === "mfa" && <MfaSettings userId={userId} />}
            {adminTab === "ldap" && <LdapSettings userId={userId} />}
            {adminTab === "oauth" && <OAuthSettings userId={userId} />}
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
                    <div key={s.id}>
                      <div className="flex items-center gap-2 text-xs">
                        <span className="text-muted-foreground font-mono truncate flex-1">{s.token.slice(0, 12)}...</span>
                        <span className="text-[10px] text-muted-foreground/60">{s.visit_count} views</span>
                        {s.password_hash && <span className="text-[10px]">🔒</span>}
                        {s.brand_title && <span className="text-[10px] text-purple-400" title="Custom branding">🎨</span>}
                        <button onClick={() => openBrandingEditor(s)} className="text-[10px] text-purple-400 hover:text-purple-300" title="Customize branding">🎨</button>
                        <button onClick={() => deleteShare(s.id)} className="text-red-400 hover:text-red-300 text-[10px]">×</button>
                      </div>
                      {editBrandShareId === s.id && (
                        <div className="ml-4 mt-1 p-2 rounded-md bg-muted/30 border border-border space-y-1.5">
                          <input
                            type="text" value={editBrandTitle}
                            onChange={(e) => setEditBrandTitle(e.target.value)}
                            placeholder="Custom page title (leave empty for page default)"
                            className="w-full h-7 px-2 rounded border border-border bg-[#0a0a0a] text-[10px] text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-1 focus:ring-primary/50"
                          />
                          <input
                            type="text" value={editBrandLogoUrl}
                            onChange={(e) => setEditBrandLogoUrl(e.target.value)}
                            placeholder="Logo URL (leave empty for no logo)"
                            className="w-full h-7 px-2 rounded border border-border bg-[#0a0a0a] text-[10px] text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-1 focus:ring-primary/50"
                          />
                          <div className="flex gap-1.5">
                            <button onClick={() => updateShareBranding(s.id)}
                              className="flex-1 h-6 rounded text-[10px] font-medium bg-purple-600 text-white hover:bg-purple-500 transition-colors">
                              Save branding
                            </button>
                            <button onClick={() => setEditBrandShareId(null)}
                              className="h-6 px-2 rounded text-[10px] text-muted-foreground hover:text-foreground transition-colors">
                              Cancel
                            </button>
                          </div>
                        </div>
                      )}
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
                  {colSortMode !== "manual" && (
                    <label className="flex items-center gap-2 mt-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={colAutoApply}
                        onChange={(e) => setColAutoApply(e.target.checked)}
                        className="rounded border-border"
                      />
                      <span className="text-[10px] text-muted-foreground/80">Auto-apply sort on page create/update</span>
                    </label>
                  )}
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
          <Route path="/" element={<React.Suspense fallback={<RouteFallback />}><HomeView /></React.Suspense>} />
          <Route path="/new" element={<React.Suspense fallback={<RouteFallback />}><PageEditor userId={userId} /></React.Suspense>} />
          <Route path="/page/:id" element={<React.Suspense fallback={<RouteFallback />}><PageViewWrapper userId={userId} /></React.Suspense>} />
          <Route path="/page/:id/edit" element={<React.Suspense fallback={<RouteFallback />}><PageEditor userId={userId} /></React.Suspense>} />
          <Route path="/p/:slug" element={<React.Suspense fallback={<RouteFallback />}><SlugView /></React.Suspense>} />
          <Route path="/activity" element={<React.Suspense fallback={<RouteFallback />}><ActivityView /></React.Suspense>} />
          <Route path="/favorites" element={<React.Suspense fallback={<RouteFallback />}><FavoritesView /></React.Suspense>} />
          <Route path="/graph" element={<React.Suspense fallback={<RouteFallback />}><GraphView /></React.Suspense>} />
          <Route path="/permalink/:id" element={<React.Suspense fallback={<RouteFallback />}><PermalinkRedirect /></React.Suspense>} />
          <Route path="/oauth/google/callback" element={<React.Suspense fallback={<RouteFallback />}><GoogleCallback /></React.Suspense>} />
          <Route path="/oauth/callback" element={<React.Suspense fallback={<RouteFallback />}><OAuthCallback /></React.Suspense>} />
          <Route path="/oauth/oidc/callback" element={<React.Suspense fallback={<RouteFallback />}><OidcCallback /></React.Suspense>} />
          <Route path="/auth/saml/callback" element={<React.Suspense fallback={<RouteFallback />}><SamlCallback /></React.Suspense>} />
          <Route path="/login" element={<React.Suspense fallback={<RouteFallback />}><LoginView /></React.Suspense>} />
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
      {aiAssistantOpen && userId && (
        <AiAssistant
          userId={userId}
          currentPageId={currentPageId}
          currentPageTitle={currentPageTitle}
          onClose={() => setAiAssistantOpen(false)}
        />
      )}
    </div>
  );
}

// LoginView is imported from ./pages/LoginView at the top of the file
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

  // LDAP sign-in
  const handleLdapSignIn = async (providerId: string) => {
    setError("");
    if (!ldapUsername.trim() || !ldapPassword.trim()) {
      setError("LDAP username and password are required");
      return;
    }
    setLdapLoading(true);
    try {
      // Call the API server LDAP login endpoint
      const origin = window.location.origin;
      const resp = await fetch(`${origin}/api/v1/auth/ldap/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          provider_id: providerId,
          username: ldapUsername.trim(),
          password: ldapPassword,
        }),
      });
      if (!resp.ok) {
        const detail = await resp.text();
        throw new Error(detail || "LDAP authentication failed");
      }
      const result = await resp.json();
      if (result.user) {
        localStorage.setItem("sw_user_id", result.user.id);
        localStorage.setItem("sw_user_email", result.user.email || "");
        navigate("/");
      } else {
        throw new Error("No user returned from LDAP authentication");
      }
    } catch (err: any) {
      setError(`LDAP sign-in failed: ${err.message || err}`);
    } finally {
      setLdapLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    try {
      if (isRegister) await api.users.register(name, email, password, "member");
      const user = await api.users.login(email, password);
      if (!user) throw new Error("Login failed");
      // Check if MFA is required
      const mfaEnabled = await api.mfa.isEnabled(user.id);
      if (mfaEnabled) {
        setPendingUserId(user.id);
        setMfaRequired(true);
        return;
      }
      localStorage.setItem("sw_user_id", user.id);
      localStorage.setItem("sw_user_email", user.email || email);
      navigate("/");
    } catch (err: any) { setError(String(err)); }
  };

  const [mfaRequired, setMfaRequired] = useState(false);
  const [pendingUserId, setPendingUserId] = useState("");
  const [mfaCode, setMfaCode] = useState("");
  const [mfaError, setMfaError] = useState("");
  const [mfaBackupMode, setMfaBackupMode] = useState(false);
  const [mfaBackupCode, setMfaBackupCode] = useState("");

  const handleMfaVerify = async () => {
    if (!pendingUserId) return;
    setMfaError("");
    try {
      if (mfaBackupMode) {
        await api.mfa.verifyBackupCode(pendingUserId, mfaBackupCode);
      } else {
        const code = parseInt(mfaCode, 10);
        if (isNaN(code) || code < 100000 || code > 999999) {
          setMfaError("Enter a valid 6-digit code from your authenticator app");
          return;
        }
        await api.mfa.verifyTotp(pendingUserId, code);
      }
      // MFA verified — complete login
      localStorage.setItem("sw_user_id", pendingUserId);
      navigate("/");
    } catch (err: any) {
      setMfaError(err.message || "Verification failed");
    }
  };

  const handlePasskeySignIn = async () => {
    setError("");
    try {
      // 1. Request authentication challenge from the API server
      const origin = window.location.origin;
      const resp = await fetch(`${origin}/api/v1/webauthn/auth/begin?email=${encodeURIComponent(email || "")}`);
      if (!resp.ok) {
        const detail = await resp.text();
        throw new Error(detail || "Failed to get challenge");
      }
      const options = await resp.json();

      // 2. Convert options to the format expected by the WebAuthn API
      const publicKey: CredentialRequestOptions["publicKey"] = {
        challenge: Uint8Array.from(atob(options.challenge.replace(/-/g, "+").replace(/_/g, "/")), c => c.charCodeAt(0)),
        timeout: options.timeout,
        rpId: options.rpId,
        userVerification: options.userVerification,
      };

      if (options.allowCredentials && options.allowCredentials.length > 0) {
        publicKey.allowCredentials = options.allowCredentials.map((cred: any) => ({
          id: Uint8Array.from(atob(cred.id.replace(/-/g, "+").replace(/_/g, "/")), c => c.charCodeAt(0)),
          type: "public-key" as PublicKeyCredentialType,
          transports: cred.transports as AuthenticatorTransport[],
        }));
      }

      // 3. Call navigator.credentials.get()
      const credential = await navigator.credentials.get({ publicKey });
      if (!credential) throw new Error("No credential returned");

      const pkCred = credential as PublicKeyCredential;
      const response = pkCred.response as AuthenticatorAssertionResponse;

      // 4. Send assertion response to the API server for verification
      const assertionPayload = {
        id: pkCred.id,
        rawId: arrayBufferToBase64Url(pkCred.rawId),
        type: pkCred.type,
        response: {
          clientDataJSON: arrayBufferToBase64Url(response.clientDataJSON),
          authenticatorData: arrayBufferToBase64Url(response.authenticatorData),
          signature: arrayBufferToBase64Url(response.signature),
          userHandle: response.userHandle ? arrayBufferToBase64Url(response.userHandle) : "",
        },
      };

      const verifyResp = await fetch(`${origin}/api/v1/webauthn/auth/complete`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(assertionPayload),
      });

      if (!verifyResp.ok) {
        const detail = await verifyResp.text();
        throw new Error(detail || "Authentication failed");
      }

      const result = await verifyResp.json();
      if (result.user) {
        localStorage.setItem("sw_user_id", result.user.id);
        navigate("/");
      } else {
        throw new Error("No user returned from authentication");
      }
    } catch (err: any) {
      setError(`Passkey sign-in failed: ${err.message || err}`);
    }
  };

  return (
    <div className="p-4 md:p-6 lg:p-8 max-w-md mx-auto">
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold">
            {mfaRequired ? "Two-Factor Authentication" : (isRegister ? "Create account" : "Sign in")}
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            {mfaRequired
              ? "Enter the verification code from your authenticator app."
              : (isRegister ? "Join your team's knowledge base." : "Welcome back to Spacetime Wiki.")}
          </p>
        </div>

        {mfaRequired ? (
          <div className="space-y-4">
            <div>
              <label className="block text-xs font-medium mb-1">
                {mfaBackupMode ? "Backup Code" : "Authenticator Code"}
              </label>
              {mfaBackupMode ? (
                <input type="text" value={mfaBackupCode} onChange={e => setMfaBackupCode(e.target.value.toUpperCase().slice(0, 8))}
                  placeholder="XXXX XXXX"
                  className="w-full h-9 px-3 rounded-md border border-border bg-card text-sm text-center tracking-widest font-mono focus:outline-none focus:ring-1 focus:ring-primary/50" />
              ) : (
                <input type="text" value={mfaCode} onChange={e => setMfaCode(e.target.value.replace(/[^0-9]/g, "").slice(0, 6))}
                  placeholder="000000"
                  maxLength={6}
                  className="w-full h-9 px-3 rounded-md border border-border bg-card text-sm text-center tracking-widest font-mono focus:outline-none focus:ring-1 focus:ring-primary/50" />
              )}
            </div>
            {mfaError && <div className="text-xs text-red-400 bg-red-500/10 px-3 py-2 rounded-md">{mfaError}</div>}
            <button onClick={handleMfaVerify} disabled={mfaBackupMode ? mfaBackupCode.length < 4 : mfaCode.length !== 6}
              className="w-full h-9 rounded-md bg-primary text-white text-sm font-medium hover:bg-primary/90 disabled:opacity-50 transition-colors">
              Verify
            </button>
            <button onClick={() => { setMfaBackupMode(!mfaBackupMode); setMfaError(""); }}
              className="w-full text-xs text-primary hover:underline text-center">
              {mfaBackupMode ? "Use authenticator app instead" : "Use a backup code instead"}
            </button>
          </div>
        ) : (
          <>
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
          {/* Generic OAuth provider buttons (Slack, Discord, GitHub, GitLab) */}
          {oauthProviders.map(p => (
            <button key={p.id} onClick={() => handleOAuthSignIn(p)}
              className="w-full h-9 rounded-md border border-border bg-card text-sm font-medium hover:bg-muted transition-colors flex items-center justify-center gap-2">
              <svg className="h-4 w-4 text-muted-foreground" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/></svg>
              Sign in with {p.name}
            </button>
          ))}
          {/* Passkey / WebAuthn sign-in */}
          <button onClick={handlePasskeySignIn} className="w-full h-9 rounded-md border border-border bg-card text-sm font-medium hover:bg-muted transition-colors flex items-center justify-center gap-2">
            <svg className="h-4 w-4 text-muted-foreground" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/><circle cx="12" cy="16" r="1"/></svg>
            Sign in with Passkey
          </button>
          {/* LDAP sign-in */}
          {ldapProviders.map(p => (
            <div key={p.id} className="space-y-2 pt-2 border-t border-border">
              <p className="text-xs font-medium text-muted-foreground">Sign in with LDAP ({p.name})</p>
              <input type="text" value={ldapUsername} onChange={e => setLdapUsername(e.target.value)}
                placeholder="LDAP username"
                className="w-full h-9 px-3 rounded-md border border-border bg-card text-sm focus:outline-none focus:ring-1 focus:ring-primary/50" />
              <input type="password" value={ldapPassword} onChange={e => setLdapPassword(e.target.value)}
                placeholder="LDAP password"
                className="w-full h-9 px-3 rounded-md border border-border bg-card text-sm focus:outline-none focus:ring-1 focus:ring-primary/50" />
              <button onClick={() => handleLdapSignIn(p.id)} disabled={ldapLoading}
                className="w-full h-9 rounded-md border border-primary/30 bg-primary/5 text-sm font-medium hover:bg-primary/10 transition-colors flex items-center justify-center gap-2 disabled:opacity-50">
                {ldapLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>}
                Sign in with LDAP
              </button>
            </div>
          ))}
        </form>
        <p className="text-xs text-muted-foreground text-center">
          {isRegister ? "Already have an account?" : "Don't have an account?"}{" "}
          <button onClick={() => setIsRegister(!isRegister)} className="text-primary hover:underline">
            {isRegister ? "Sign in" : "Register"}
          </button>
        </p>
          </>
        )}
      </div>
    </div>
  );
}

// ─── App ─────────────────────────────────────────────────────────────────────

import { ApiKeySection } from "./components/admin/ApiKeySettings";
import { TrashSettings } from "./components/admin/TrashSettings";
import { FeatureFlags } from "./components/admin/FeatureFlags";
import { BulkExport } from "./components/admin/BulkExport";
import { ScimSettings } from "./components/admin/ScimSettings";
import { PasskeySettings } from "./components/admin/PasskeySettings";
import { MfaSettings } from "./components/admin/MfaSettings";
import { LdapSettings } from "./components/admin/LdapSettings";
import { OAuthSettings } from "./components/admin/OAuthSettings";
import { InvitationSettings } from "./components/admin/InvitationSettings";
// (Add other admin component imports as they are created)






