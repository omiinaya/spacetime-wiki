import { useState, useEffect, useCallback } from "react";
import {
  BrowserRouter, Routes, Route, useNavigate, useParams, useLocation,
} from "react-router-dom";
import {
  FileText, Search, Plus, Hash, BookOpen, ChevronDown, ChevronRight, Menu, X, Library,
  MoreHorizontal, Pencil, FolderPlus, Trash2,
} from "lucide-react";
import { api, Page, Collection } from "./lib/api";
import { cn, timeAgo } from "./lib/utils";
import { PageEditor } from "./pages/PageEditor";
import { PageView } from "./pages/PageView";

// ─── Layout ──────────────────────────────────────────────────────────────────

function AppLayout() {
  const navigate = useNavigate();
  const location = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [collections, setCollections] = useState<Collection[]>([]);
  const [pages, setPages] = useState<Page[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
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

  const toggleCollection = (id: string) => {
    setExpandedCollections((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  // Search — query STDB when user types
  useEffect(() => {
    if (!searchQuery.trim()) {
      loadData();
      return;
    }
    const timer = setTimeout(async () => {
      try {
        // Search titles only for speed
        const results = await api.pages.list();
        setPages(results);
      } catch { /* keep existing */ }
    }, 200);
    return () => clearTimeout(timer);
  }, [searchQuery, loadData]);

  // Filter pages client-side for instant feel
  const filteredPages = searchQuery
    ? pages.filter(
        (p) =>
          p.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
          p.text_content.toLowerCase().includes(searchQuery.toLowerCase()),
      )
    : pages;

  // Group pages by collection
  const pagesByCollection: Record<string, Page[]> = {};
  for (const page of filteredPages.filter((p) => p.status !== "deleted")) {
    const cid = page.collection_id || "uncategorized";
    if (!pagesByCollection[cid]) pagesByCollection[cid] = [];
    pagesByCollection[cid].push(page);
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

  // ─── Drag-and-drop ─────────────────────────────────────────────────────

  const [dragPageId, setDragPageId] = useState<string | null>(null);

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

  return (
    <div className="flex h-screen bg-background" onClick={() => setContextMenu(null)}>
      {/* Sidebar */}
      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-40 w-64 bg-sidebar border-r border-border flex flex-col transition-transform md:relative md:translate-x-0",
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

        <div className="px-3 py-2 border-t border-border">
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
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
          style={{ left: contextMenu.x, top: contextMenu.y }}
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

      {/* Collection dialog */}
      {colDialogOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60" onClick={() => setColDialogOpen(false)}>
          <div className="w-full max-w-sm p-5 rounded-xl border border-border bg-card shadow-2xl" onClick={(e) => e.stopPropagation()}>
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
          <Route path="/login" element={<LoginView />} />
        </Routes>
      </main>
    </div>
  );
}

// ─── Home View ───────────────────────────────────────────────────────────────

function HomeView() {
  const navigate = useNavigate();
  const [recentPages, setRecentPages] = useState<Page[]>([]);

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

function LoginView() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [isRegister, setIsRegister] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    try {
      if (isRegister) await api.users.register(name, email, password);
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

export default function App() {
  return (
    <BrowserRouter>
      <AppLayout />
    </BrowserRouter>
  );
}
