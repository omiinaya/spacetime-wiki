import { useState, useCallback, useRef, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { api, Page, Collection, Notification as NotifType } from '../lib/api';
import {
  connectSubscriptions,
  disconnectSubscriptions,
  defaultSubscriptionManager,
} from '../lib/subscriptions';
import {
  usePagesSubscription,
  useCollectionsSubscription,
  useNotificationsSubscription,
} from '../lib/api';
import { useToast, initGlobalToast, showToast } from '../components/Toast';
import { useSearch } from './useSearch';
import { useImportExport } from './useImportExport';
import { useDragDrop } from './useDragDrop';
import { useBatchSelect } from './useBatchSelect';
import {
  FileText as FileTextIcon,
  BookOpen as BookOpenIcon,
  Plus as PlusIcon,
  FolderPlus as FolderPlusIcon,
  LayoutTemplate as LayoutTemplateIcon,
  Shield as ShieldIcon,
  Trash2 as Trash2Icon,
  Star as StarIcon,
  History as HistoryIcon,
  Share2 as Share2Icon,
  Code as CodeIcon,
  Keyboard as KeyboardIcon,
  Sun as SunIcon,
  Moon as MoonIcon,
} from 'lucide-react';

export function useAppLayout() {
  const navigate = useNavigate();
  const location = useLocation();
  const { addToast } = useToast();

  // ─── Core state ──────────────────────────────────────────────────────────
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [collections, setCollections] = useState<Collection[]>([]);
  const [pages, setPages] = useState<Page[]>([]);
  const [allPageTags, setAllPageTags] = useState<Map<string, Set<string>>>(new Map());
  const [allUsers, setAllUsers] = useState<
    { id: string; name: string; email: string; role: string; avatar_url: string }[]
  >([]);
  const [loading, setLoading] = useState(true);
  const [userId, setUserId] = useState<string | null>(null);
  const [shortcutsOpen, setShortcutsOpen] = useState(false);
  const [aiAssistantOpen, setAiAssistantOpen] = useState(false);
  const [favoritePages, setFavoritePages] = useState<Page[]>([]);
  const PAGE_LIMIT = 50;

  // Theme
  const [theme, setTheme] = useState<'dark' | 'light'>(() => {
    return (localStorage.getItem('sw_theme') as 'dark' | 'light') || 'dark';
  });

  // Sidebar drag/swipe
  const touchStartRef = useRef(0);
  const sidebarDragRef = useRef(false);
  const sidebarElRef = useRef<HTMLDivElement>(null);
  const sidebarTouchDelta = useRef(0);
  const SIDEBAR_W = 288;
  const sidebarOverlayRef = useRef<HTMLDivElement>(null);
  const [sidebarOverlayVisible, setSidebarOverlayVisible] = useState(false);
  const sidebarNavRef = useRef<HTMLDivElement>(null);

  // Collection sort
  const COLLECTION_SORT_KEY = 'sw_collection_sort';
  const [collectionSortModes, setCollectionSortModes] = useState<Record<string, string>>(() => {
    try {
      return JSON.parse(localStorage.getItem(COLLECTION_SORT_KEY) || '{}');
    } catch {
      return {};
    }
  });
  const [colSortMode, setColSortMode] = useState('manual');
  const [colAutoApply, setColAutoApply] = useState(false);

  // Expanded collections
  const [expandedCollections, setExpandedCollections] = useState<Set<string>>(new Set());
  const [pageLimits, setPageLimits] = useState<Record<string, number>>({});

  // Dialog state
  const [colDialogOpen, setColDialogOpen] = useState(false);
  const [editingCol, setEditingCol] = useState<Collection | null>(null);
  const [colName, setColName] = useState('');
  const [colDesc, setColDesc] = useState('');
  const [colIcon, setColIcon] = useState('');
  const [colColor, setColColor] = useState('');

  // Context menu
  const [contextMenu, setContextMenu] = useState<{
    x: number;
    y: number;
    colId?: string;
    pageId?: string;
  } | null>(null);

  // Trash state
  const [trashPages, setTrashPages] = useState<Page[]>([]);
  const [trashLoading, setTrashLoading] = useState(false);

  // Share state
  const [shareDialog, setShareDialog] = useState<{
    pageId: string;
    pageTitle: string;
  } | null>(null);
  const [sharePassword, setSharePassword] = useState('');
  const [shareDays, setShareDays] = useState(0);
  const [shareUrl, setShareUrl] = useState('');
  const [shareLinks, setShareLinks] = useState<
    {
      id: string;
      token: string;
      expires_at: number;
      visit_count: number;
      password_hash: string;
      brand_title: string | null;
      brand_logo_url: string | null;
    }[]
  >([]);
  const [editBrandShareId, setEditBrandShareId] = useState<string | null>(null);
  const [editBrandTitle, setEditBrandTitle] = useState('');
  const [editBrandLogoUrl, setEditBrandLogoUrl] = useState('');

  // Template state
  const [templatePickerOpen, setTemplatePickerOpen] = useState(false);
  const [templateModalOpen, setTemplateModalOpen] = useState(false);
  const [templates, setTemplates] = useState<Page[]>([]);
  const [newPageTitle, setNewPageTitle] = useState('');
  const [selectedTemplate, setSelectedTemplate] = useState('');

  // Command palette
  const [paletteOpen, setPaletteOpen] = useState(false);
  const [paletteQuery, setPaletteQuery] = useState('');
  const [paletteIndex, setPaletteIndex] = useState(0);

  // ─── Effects ─────────────────────────────────────────────────────────────
  useEffect(() => {
    initGlobalToast(addToast);
  }, [addToast]);

  useEffect(() => {
    document.documentElement.classList.toggle('light-theme', theme === 'light');
    document.documentElement.classList.toggle('dark', theme === 'dark');
    localStorage.setItem('sw_theme', theme);
  }, [theme]);

  useEffect(() => {
    setUserId(localStorage.getItem('sw_user_id'));
  }, [location.pathname]);

  // ─── Subscriptions ──────────────────────────────────────────────────────
  useEffect(() => {
    connectSubscriptions();
    return () => {
      disconnectSubscriptions();
    };
  }, []);

  const { rows: subPages, connected: pagesConnected } = usePagesSubscription();
  const { rows: subCollections, connected: colsConnected } = useCollectionsSubscription();
  const { rows: subNotifications } = useNotificationsSubscription(userId || undefined);

  useEffect(() => {
    setPages(subPages);
  }, [subPages]);
  useEffect(() => {
    setCollections(subCollections);
  }, [subCollections]);

  // ─── Notifications ─────────────────────────────────────────────────────
  const [notificationList, setNotificationList] = useState<NotifType[]>([]);
  const prevNotifLenRef = useRef(0);

  useEffect(() => {
    setNotificationList(subNotifications);
    if (subNotifications.length > prevNotifLenRef.current && prevNotifLenRef.current > 0) {
      const latest = subNotifications[0];
      if (latest && !latest.is_read) {
        showToast({
          type: 'info',
          title: latest.title,
          message: latest.message,
          duration: 5000,
          action: latest.target_id
            ? { label: 'View', onClick: () => window.location.assign(`/page/${latest.target_id}`) }
            : undefined,
        });
      }
    }
    prevNotifLenRef.current = subNotifications.length;
  }, [subNotifications]);

  const refreshNotifications = useCallback(() => {
    if (userId) {
      api.notifications
        .list(userId, 100)
        .then(setNotificationList)
        .catch((err) => console.error('API error:', err));
    }
  }, [userId]);

  // ─── STDB connection state toasts ────────────────────────────────────────
  const [prevConnected, setPrevConnected] = useState(false);
  useEffect(() => {
    const unsub = defaultSubscriptionManager.onStateChange((state) => {
      if (state === 'connected' && !prevConnected) {
        showToast({
          type: 'success',
          title: 'Connected',
          message: 'Real-time updates active',
          duration: 3000,
        });
      }
      if (state === 'connected') setPrevConnected(true);
      if (state === 'reconnecting') {
        showToast({
          type: 'warning',
          title: 'Reconnecting...',
          message: 'Trying to restore real-time connection',
          duration: 3000,
        });
      }
    });
    return () => unsub();
  }, [prevConnected]);

  // ─── Toast: page updates from other users ────────────────────────────────
  const prevPagesRef = useRef<Page[]>([]);
  useEffect(() => {
    if (!pagesConnected) return;
    const prev = prevPagesRef.current;
    if (prev.length > 0 && subPages.length > 0) {
      const myId = localStorage.getItem('sw_user_id') || '';
      for (const page of subPages) {
        const was = prev.find((p) => p.id === page.id);
        if (!was && page.created_by !== myId) {
          showToast({
            type: 'info',
            title: 'New page created',
            message: `"${page.title}" was added`,
            duration: 5000,
            action: { label: 'Open', onClick: () => window.location.assign(`/page/${page.id}`) },
          });
        } else if (
          was &&
          was.updated_at !== page.updated_at &&
          page.updated_by !== myId &&
          page.status !== 'deleted'
        ) {
          showToast({
            type: 'info',
            title: 'Page updated',
            message: `"${page.title}" was modified`,
            duration: 4000,
            action: { label: 'Open', onClick: () => window.location.assign(`/page/${page.id}`) },
          });
        }
      }
    }
    prevPagesRef.current = subPages;
  }, [subPages, pagesConnected]);

  // ─── Fallback loading ────────────────────────────────────────────────────
  useEffect(() => {
    if ((pagesConnected || colsConnected) && (subPages.length > 0 || subCollections.length > 0)) {
      setLoading(false);
    }
  }, [pagesConnected, colsConnected, subPages.length, subCollections.length]);

  useEffect(() => {
    if (subPages.length > 0 || subCollections.length > 0) setLoading(false);
  }, [subPages.length, subCollections.length]);

  useEffect(() => {
    const timer = setTimeout(async () => {
      if (loading) {
        try {
          const [cols, allPages] = await Promise.all([api.collections.list(), api.pages.list()]);
          setCollections(cols);
          setPages(allPages);
        } catch (e) {
          console.error('Failed to load data:', e);
        } finally {
          setLoading(false);
        }
      }
    }, 5000);
    return () => clearTimeout(timer);
  }, [loading]);

  // ─── Refresh data (manual fallback) ──────────────────────────────────────
  const refreshData = useCallback(async () => {
    try {
      const [cols, allPages] = await Promise.all([api.collections.list(), api.pages.list()]);
      setCollections(cols);
      setPages(allPages);
    } catch (e) {
      console.error('Failed to refresh data:', e);
    }
  }, []);

  // ─── Load all tags ───────────────────────────────────────────────────────
  useEffect(() => {
    api.tags
      .listAll()
      .then((tagRows) => {
        const map = new Map<string, Set<string>>();
        for (const tag of tagRows) {
          if (!map.has(tag.page_id)) map.set(tag.page_id, new Set());
          map.get(tag.page_id)!.add(tag.name);
        }
        setAllPageTags(map);
      })
      .catch((err) => console.error('API error:', err));
  }, []);

  // ─── Load favorites ─────────────────────────────────────────────────────
  useEffect(() => {
    if (!userId) {
      setFavoritePages([]);
      return;
    }
    api.favorites
      .list(userId)
      .then((rows: unknown) => {
        const favPageIds = new Set(((rows as unknown[][]) || []).map((r: unknown) => String(r[2])));
        api.pages.list().then((allPages) => {
          setFavoritePages(allPages.filter((p) => favPageIds.has(p.id)));
        });
      })
      .catch((err) => console.error('API error:', err));
  }, [userId, location.pathname]);

  // ─── Keyboard: ? = shortcuts, Escape to close ────────────────────────────
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === '?' && !e.metaKey && !e.ctrlKey && !e.altKey) {
        if (
          document.activeElement?.tagName !== 'INPUT' &&
          document.activeElement?.tagName !== 'TEXTAREA'
        ) {
          e.preventDefault();
          setShortcutsOpen(true);
        }
      }
      if (e.key === 'Escape') setShortcutsOpen(false);
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);

  // ─── Compose smaller hooks ───────────────────────────────────────────────
  const search = useSearch(pages, collections, allUsers, allPageTags);
  const impExp = useImportExport(userId, refreshData);
  const dragDrop = useDragDrop(collections, pages, refreshData);
  const batch = useBatchSelect(refreshData);

  // ─── Computed values ────────────────────────────────────────────────────
  const pagesByCollection: Record<string, Page[]> = (() => {
    const byCol: Record<string, Page[]> = {};
    for (const page of pages.filter(
      (p) => p.status !== 'deleted' && search.filteredPages.includes(p),
    )) {
      const cid = page.collection_id || 'uncategorized';
      if (!byCol[cid]) byCol[cid] = [];
      byCol[cid].push(page);
    }
    for (const cid of Object.keys(byCol)) {
      const sortMode = collectionSortModes[cid] || 'manual';
      byCol[cid].sort((a, b) => {
        if (a.is_pinned && !b.is_pinned) return -1;
        if (!a.is_pinned && b.is_pinned) return 1;
        if (sortMode === 'title-asc') return a.title.localeCompare(b.title);
        if (sortMode === 'title-desc') return b.title.localeCompare(a.title);
        if (sortMode === 'created-asc') return a.created_at - b.created_at;
        if (sortMode === 'created-desc') return b.created_at - a.created_at;
        if (sortMode === 'updated-asc') return a.updated_at - b.updated_at;
        if (sortMode === 'updated-desc') return b.updated_at - a.updated_at;
        return a.sort_order - b.sort_order;
      });
    }
    return byCol;
  })();

  const collectionTree = (() => {
    const colChildren = new Map<string, Collection[]>();
    for (const col of collections) {
      const parentId = col.parent_id || '';
      if (!colChildren.has(parentId)) colChildren.set(parentId, []);
      colChildren.get(parentId)!.push(col);
    }
    const getTree = (parentId: string): (Collection & { children: Collection[] })[] => {
      return (colChildren.get(parentId) || [])
        .sort((a, b) => a.sort_order - b.sort_order)
        .map((col) => ({ ...col, children: getTree(col.id) }));
    };
    return getTree('');
  })();

  const isActive = (pageId: string) =>
    location.pathname === `/page/${pageId}` || location.pathname.startsWith(`/page/${pageId}`);

  const currentPageId = location.pathname.match(/^\/page\/([^\/]+)(?:\/edit)?$/)?.[1] || '';
  const currentPageTitle = currentPageId
    ? pages.find((p) => p.id === currentPageId)?.title || ''
    : '';

  const toggleCollection = (id: string) => {
    setExpandedCollections((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  // ─── Collection sort mode ────────────────────────────────────────────────
  const saveCollectionSortMode = (colId: string, mode: string, autoApply = false) => {
    const updated = { ...collectionSortModes, [colId]: mode };
    setCollectionSortModes(updated);
    try {
      localStorage.setItem(COLLECTION_SORT_KEY, JSON.stringify(updated));
    } catch {}
    const field = mode === 'manual' ? 'manual' : mode.replace('-asc', '').replace('-desc', '');
    const dir = mode.endsWith('-desc') ? 'desc' : 'asc';
    if (mode !== 'manual') {
      api.collections.sortRules
        .set(colId, field, dir, autoApply, userId || 'anonymous')
        .catch((err) => console.error('API error:', err));
    } else {
      api.collections.sortRules
        .set(colId, 'manual', 'asc', false, userId || 'anonymous')
        .catch((err) => console.error('API error:', err));
    }
  };

  // ─── Collection CRUD ──────────────────────────────────────────────────────
  const openCreateCol = () => {
    setEditingCol(null);
    setColName('');
    setColDesc('');
    setColIcon('📁');
    setColColor('');
    setColDialogOpen(true);
  };

  const openEditCol = async (col: Collection) => {
    setEditingCol(col);
    setColName(col.name);
    setColDesc(col.description);
    setColIcon(col.icon || '📁');
    setColColor(col.color);
    setColSortMode(collectionSortModes[col.id] || 'manual');
    setColAutoApply(false);
    try {
      const rule = await api.collections.sortRules.get(col.id);
      if (rule) {
        const mode =
          rule.sort_field === 'manual' ? 'manual' : rule.sort_field + '-' + rule.sort_direction;
        setColSortMode(mode);
        setColAutoApply(rule.auto_apply);
        const updated = { ...collectionSortModes, [col.id]: mode };
        setCollectionSortModes(updated);
        try {
          localStorage.setItem(COLLECTION_SORT_KEY, JSON.stringify(updated));
        } catch {}
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
  };

  const deleteCollection = async (id: string) => {
    if (!confirm('Archive this collection and all its pages?')) return;
    setContextMenu(null);
    await api.collections.delete(id);
    await refreshData();
    addToast({ type: 'success', title: 'Collection archived', duration: 3000 });
  };

  // ─── Trash handlers ─────────────────────────────────────────────────────
  const loadTrashPage = async () => {
    setTrashLoading(true);
    try {
      setTrashPages(await api.pages.listDeleted());
    } catch (e) {
      console.error(e);
    } finally {
      setTrashLoading(false);
    }
    navigate('/trash');
  };

  const restorePage = async (id: string) => {
    await api.pages.restore(id);
    setTrashPages((prev) => prev.filter((p) => p.id !== id));
    await refreshData();
    const page = trashPages.find((p) => p.id === id);
    addToast({ type: 'success', title: 'Page restored', message: page?.title, duration: 3000 });
  };

  const permanentDelete = async (id: string) => {
    if (!confirm('Permanently delete this page? This cannot be undone.')) return;
    await api.pages.delete(id);
    setTrashPages((prev) => prev.filter((p) => p.id !== id));
    await refreshData();
    addToast({ type: 'success', title: 'Page permanently deleted', duration: 3000 });
  };

  const emptyTrash = async () => {
    if (!confirm('Permanently delete ALL pages in trash? This cannot be undone.')) return;
    await api.pages.emptyTrash();
    setTrashPages([]);
    await refreshData();
    addToast({ type: 'success', title: 'Trash emptied', duration: 3000 });
  };

  // ─── Share handlers ──────────────────────────────────────────────────────
  const openShareDialog = async (pageId: string, pageTitle: string) => {
    try {
      setShareLinks(await api.shareLinks.list(pageId));
    } catch {}
    setShareDialog({ pageId, pageTitle });
    setSharePassword('');
    setShareDays(0);
    setShareUrl('');
  };

  const createShare = async () => {
    if (!shareDialog) return;
    try {
      const result = await api.shareLinks.create(
        shareDialog.pageId,
        sharePassword,
        userId || 'anon',
        shareDays,
      );
      setShareUrl(`http://${window.location.host}/shared/${result.token}`);
      setShareLinks(await api.shareLinks.list(shareDialog.pageId));
    } catch (e) {
      alert(String(e));
    }
  };

  const deleteShare = async (linkId: string) => {
    await api.shareLinks.delete(linkId);
    if (shareDialog) setShareLinks(await api.shareLinks.list(shareDialog.pageId));
  };

  const updateShareBranding = async (shareId: string) => {
    try {
      await api.shareLinks.updateBranding(
        shareId,
        editBrandTitle || null,
        editBrandLogoUrl || null,
      );
      setEditBrandShareId(null);
      if (shareDialog) setShareLinks(await api.shareLinks.list(shareDialog.pageId));
    } catch (e) {
      alert(String(e));
    }
  };

  const openBrandingEditor = (share: {
    id: string;
    brand_title: string | null;
    brand_logo_url: string | null;
  }) => {
    setEditBrandShareId(share.id);
    setEditBrandTitle(share.brand_title || '');
    setEditBrandLogoUrl(share.brand_logo_url || '');
  };

  // ─── Template handlers ─────────────────────────────────────────────────
  const openTemplates = async () => {
    try {
      setTemplates(await api.pages.listTemplates());
    } catch (e) {
      console.error(e);
    }
    setTemplateModalOpen(true);
  };

  const createFromTemplate = async () => {
    if (!selectedTemplate || !newPageTitle.trim()) return;
    try {
      const newId = await api.pages.createFromTemplate(
        selectedTemplate,
        newPageTitle,
        '',
        userId || 'anon',
      );
      setTemplateModalOpen(false);
      setNewPageTitle('');
      setSelectedTemplate('');
      await refreshData();
      navigate(`/page/${newId}`);
    } catch (e) {
      alert(String(e));
    }
  };

  // ─── Export handlers ──────────────────────────────────────────────────────
  const handleExportPageMD = async (pageId: string) => {
    try {
      const page = pages.find((p) => p.id === pageId);
      if (!page) return;
      const { tiptapToMarkdown } = await import('../lib/helpers');
      const json = JSON.parse(page.content || '{}');
      const md = tiptapToMarkdown(json);
      const blob = new Blob([md], { type: 'text/markdown' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${page.title || 'Untitled'}.md`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error(err);
    }
  };

  const handleExportPageHTML = async (pageId: string) => {
    try {
      const page = pages.find((p) => p.id === pageId);
      if (!page) return;
      const { tiptapToMarkdown } = await import('../lib/helpers');
      const json = JSON.parse(page.content || '{}');
      const md = tiptapToMarkdown(json);
      const styledMd = md
        .split('\n')
        .map((l) => {
          if (l.startsWith('#'))
            return `<h${l.match(/^#+/)?.[0]?.length || 1}>${l.replace(/^#+\s*/, '')}</h${l.match(/^#+/)?.[0]?.length || 1}>`;
          if (l.startsWith('- ')) return `<li>${l.slice(2)}</li>`;
          if (l.startsWith('> ')) return `<blockquote>${l.slice(2)}</blockquote>`;
          if (l.startsWith('```')) return l === '```' ? '</code></pre>' : '<pre><code>';
          return l ? `<p>${l}</p>` : '<br>';
        })
        .join('\n');
      const html = `<!DOCTYPE html>\n<html>\n<head><meta charset="UTF-8"><title>${page.title || 'Untitled'}</title><style>body{font-family:system-ui,sans-serif;max-width:800px;margin:40px auto;padding:0 20px;line-height:1.6}pre{background:#f5f5f5;padding:16px;border-radius:4px}code{background:#f0f0f0;padding:2px 4px}blockquote{border-left:3px solid #ddd;padding-left:16px}table{border-collapse:collapse;width:100%}td,th{border:1px solid #ddd;padding:8px}</style></head>\n<body>\n${styledMd}\n</body>\n</html>`;
      const blob = new Blob([html], { type: 'text/html' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${page.title || 'Untitled'}.html`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error(err);
    }
  };

  const handleDuplicatePage = async (pageId: string) => {
    try {
      const newId = await api.pages.duplicate(pageId, userId || 'anonymous');
      addToast({ type: 'success', title: 'Page duplicated', duration: 3000 });
      navigate(`/page/${newId}/edit`);
    } catch (err) {
      addToast({
        type: 'error',
        title: 'Failed to duplicate page',
        message: String(err),
        duration: 5000,
      });
    }
  };

  // ─── Search effect (debounced) ────────────────────────────────────────────
  useEffect(() => {
    const timer = setTimeout(async () => {
      try {
        const hasFilters =
          search.searchFilters.collectionId ||
          search.searchFilters.authorId ||
          search.searchFilters.dateFrom ||
          search.searchFilters.dateTo ||
          search.searchFilters.tags;
        if (search.searchQuery || hasFilters) {
          const result = await api.pages.search({
            q: search.searchQuery || '',
            ...(search.searchFilters.collectionId
              ? { collection_id: search.searchFilters.collectionId }
              : {}),
            ...(search.searchFilters.authorId ? { author_id: search.searchFilters.authorId } : {}),
            ...(search.searchFilters.dateFrom ? { from: search.searchFilters.dateFrom } : {}),
            ...(search.searchFilters.dateTo ? { to: search.searchFilters.dateTo } : {}),
            ...(search.searchFilters.tags ? { tags: search.searchFilters.tags } : {}),
            limit: 100,
          });
          if (result.data && result.data.length > 0) {
            const pageIds = result.data.map((r: unknown) => r.page_id);
            const allPages = await api.pages.list();
            setPages(allPages.filter((p: Page) => pageIds.includes(p.id)));
          } else {
            setPages([]);
          }
        } else {
          setPages(await api.pages.list());
        }
      } catch {
        try {
          setPages(await api.pages.list());
        } catch {
          /* keep existing */
        }
      }
    }, 200);
    return () => clearTimeout(timer);
  }, [search.searchQuery, search.searchFilters]);

  // ─── Command palette ────────────────────────────────────────────────────
  const collectionLabel = (colId: string) => collections.find((c) => c.id === colId)?.name || '';

  const closePalette = () => {
    setPaletteOpen(false);
    setPaletteQuery('');
    setPaletteIndex(0);
  };

  const paletteItems = (() => {
    const q = paletteQuery.toLowerCase();
    const items: {
      type: 'page' | 'collection' | 'action';
      id?: string;
      label: string;
      subtitle: string;
      icon: React.ReactNode;
      action: () => void;
      shortcut?: string;
    }[] = [];

    for (const p of pages.filter(
      (x) => x.status !== 'deleted' && (x.title.toLowerCase().includes(q) || q === ''),
    )) {
      items.push({
        type: 'page',
        id: p.id,
        label: p.title,
        subtitle:
          `${p.status === 'draft' ? 'Draft' : p.status === 'archived' ? 'Archived' : ''} ${collectionLabel(p.collection_id)}`.trim(),
        icon: <FileTextIcon />,
        action: () => navigate(`/page/${p.id}`),
      });
    }
    for (const c of collections.filter((x) => x.name.toLowerCase().includes(q))) {
      items.push({
        type: 'collection',
        id: c.id,
        label: c.name,
        subtitle: `${c.icon || '📁'} Collection`,
        icon: <BookOpenIcon />,
        action: () => {
          navigate('/');
          toggleCollection(c.id);
        },
      });
    }
    const actions = [
      {
        label: 'New page',
        subtitle: 'Create a new document',
        icon: <PlusIcon />,
        action: () => {
          closePalette();
          navigate('/new');
        },
      },
      {
        label: 'New collection',
        subtitle: 'Create a new collection',
        icon: <FolderPlusIcon />,
        action: () => {
          closePalette();
          openCreateCol();
        },
      },
      {
        label: 'New template',
        subtitle: 'Save current page as a template',
        icon: <LayoutTemplateIcon />,
        action: () => {
          closePalette();
          setTemplatePickerOpen(true);
        },
      },
      {
        label: 'Admin panel',
        subtitle: 'Manage users, groups, settings',
        icon: <ShieldIcon />,
        action: () => {
          closePalette();
          navigate('/admin');
        },
      },
      {
        label: 'Trash',
        subtitle: 'View deleted pages',
        icon: <Trash2Icon />,
        action: () => {
          closePalette();
          navigate('/trash');
        },
      },
      {
        label: 'Favorites',
        subtitle: 'Show starred pages',
        icon: <StarIcon />,
        action: () => {
          closePalette();
          navigate('/favorites');
        },
      },
      {
        label: 'Activity',
        subtitle: 'View recent wiki activity',
        icon: <HistoryIcon />,
        action: () => {
          closePalette();
          navigate('/activity');
        },
      },
      {
        label: 'Graph view',
        subtitle: 'Visualize page relationships',
        icon: <Share2Icon />,
        action: () => {
          closePalette();
          navigate('/graph');
        },
      },
      {
        label: 'API Docs',
        subtitle: 'Open API documentation',
        icon: <CodeIcon />,
        action: () => {
          closePalette();
          window.open('/docs', '_blank');
        },
      },
      {
        label: 'Keyboard shortcuts',
        subtitle: 'View all keyboard shortcuts',
        icon: <KeyboardIcon />,
        action: () => {
          closePalette();
          setShortcutsOpen(true);
        },
      },
      {
        label: 'Toggle dark mode',
        subtitle: `Switch to ${theme === 'dark' ? 'light' : 'dark'} theme`,
        icon: theme === 'dark' ? <SunIcon /> : <MoonIcon />,
        action: () => {
          closePalette();
          setTheme(theme === 'dark' ? 'light' : 'dark');
        },
      },
    ];
    for (const a of actions) {
      if (a.label.toLowerCase().includes(q) || q === '')
        items.push({
          type: 'action',
          label: a.label,
          subtitle: a.subtitle,
          icon: a.icon,
          action: a.action,
        });
    }
    return items.slice(0, 15);
  })();

  const executePalette = (idx: number) => {
    const item = paletteItems[idx];
    if (item) {
      closePalette();
      item.action();
    }
  };

  // ─── Cmd+K keyboard handler ─────────────────────────────────────────────
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setPaletteOpen(true);
        return;
      }
      if (paletteOpen) {
        if (e.key === 'ArrowDown') {
          e.preventDefault();
          setPaletteIndex((i) => Math.min(i + 1, paletteItems.length - 1));
        } else if (e.key === 'ArrowUp') {
          e.preventDefault();
          setPaletteIndex((i) => Math.max(i - 1, 0));
        } else if (e.key === 'Enter') {
          e.preventDefault();
          executePalette(paletteIndex);
        } else if (e.key === 'Escape') {
          e.preventDefault();
          closePalette();
        }
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [paletteOpen, paletteIndex, paletteItems.length]);

  return {
    // Core state
    navigate,
    location,
    sidebarOpen,
    setSidebarOpen,
    collections,
    setCollections,
    pages,
    pagesByCollection,
    collectionTree,
    allUsers,
    setAllUsers,
    loading,
    userId,
    theme,
    setTheme,
    shortcutsOpen,
    setShortcutsOpen,
    aiAssistantOpen,
    setAiAssistantOpen,
    favoritePages,
    expandedCollections,
    pageLimits,
    setExpandedCollections,
    setPageLimits,
    PAGE_LIMIT,

    // Sidebar refs and state
    sidebarNavRef,
    sidebarElRef,
    touchStartRef,
    sidebarDragRef,
    sidebarTouchDelta,
    SIDEBAR_W,
    sidebarOverlayRef,
    sidebarOverlayVisible,
    setSidebarOverlayVisible,
    ...impExp,

    // Search
    ...search,

    // Notifications
    notificationList,
    refreshNotifications,

    // Collection
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
    collectionSortModes,
    openCreateCol,
    openEditCol,
    saveCollection,
    deleteCollection,

    // Trash
    trashPages,
    trashLoading,
    loadTrashPage,
    restorePage,
    permanentDelete,
    emptyTrash,

    // Share
    shareDialog,
    setShareDialog,
    sharePassword,
    setSharePassword,
    shareDays,
    setShareDays,
    shareUrl,
    shareLinks,
    editBrandShareId,
    setEditBrandShareId,
    editBrandTitle,
    setEditBrandTitle,
    editBrandLogoUrl,
    setEditBrandLogoUrl,
    openShareDialog,
    createShare,
    deleteShare,
    updateShareBranding,
    openBrandingEditor,

    // Templates
    templatePickerOpen,
    setTemplatePickerOpen,
    templateModalOpen,
    setTemplateModalOpen,
    templates,
    newPageTitle,
    setNewPageTitle,
    selectedTemplate,
    setSelectedTemplate,
    openTemplates,
    createFromTemplate,

    // Context menu
    contextMenu,
    setContextMenu,

    // Drag & drop
    ...dragDrop,

    // Batch select
    ...batch,

    // Command palette
    paletteOpen,
    setPaletteOpen,
    paletteQuery,
    setPaletteQuery,
    paletteIndex,
    setPaletteIndex,
    paletteItems,
    executePalette,
    closePalette,

    // Computed
    isActive,
    currentPageId,
    currentPageTitle,
    toggleCollection,
    collectionLabel,

    // Export
    handleExportPageMD,
    handleExportPageHTML,
    handleDuplicatePage,
    refreshData,
  };
}
