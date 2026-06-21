import { useState, useEffect, useCallback } from "react";
import {
  BrowserRouter,
  Routes,
  Route,
  useNavigate,
  useParams,
  useLocation,
} from "react-router-dom";
import {
  FileText,
  Search,
  Plus,
  Hash,
  Star,
  Archive,
  Trash2,
  Settings,
  Moon,
  BookOpen,
  ChevronDown,
  ChevronRight,
  Menu,
  X,
  Library,
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
  const [expandedCollections, setExpandedCollections] = useState<Set<string>>(
    new Set(),
  );
  const [loading, setLoading] = useState(true);
  const [userId, setUserId] = useState<string | null>(
    localStorage.getItem("sw_user_id"),
  );

  // Load data
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

  useEffect(() => {
    loadData();
  }, [loadData, location.pathname]);

  // Refresh after navigation (page created/updated)
  useEffect(() => {
    loadData();
  }, [location.pathname]);

  // Toggle collection expand
  const toggleCollection = (id: string) => {
    setExpandedCollections((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  // Filter pages by search
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

  const getCollectionName = (id: string) => {
    if (id === "uncategorized") return "Uncategorized";
    return collections.find((c) => c.id === id)?.name || id;
  };

  const isActive = (pageId: string) =>
    location.pathname === `/page/${pageId}` ||
    location.pathname.startsWith(`/page/${pageId}`);

  return (
    <div className="flex h-screen bg-background">
      {/* Sidebar */}
      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-40 w-64 bg-sidebar border-r border-border flex flex-col transition-transform md:relative md:translate-x-0",
          sidebarOpen ? "translate-x-0" : "-translate-x-full",
        )}
      >
        {/* Sidebar header */}
        <div className="flex items-center gap-2 px-4 h-14 border-b border-border shrink-0">
          <div className="w-7 h-7 rounded-md bg-gradient-to-br from-primary to-purple-600 flex items-center justify-center shrink-0">
            <Library className="h-3.5 w-3.5 text-white" />
          </div>
          <span className="font-semibold text-sm">Spacetime Wiki</span>
          <button
            className="md:hidden ml-auto p-1"
            onClick={() => setSidebarOpen(false)}
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Search */}
        <div className="px-3 py-2">
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground/60" />
            <input
              type="text"
              placeholder="Search..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full h-8 pl-8 pr-7 rounded-md border border-border bg-[#0a0a0a] text-xs text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-1 focus:ring-primary/50"
            />
          </div>
        </div>

        {/* New page button */}
        <div className="px-3 pb-2">
          <button
            onClick={() => navigate("/new")}
            className="w-full flex items-center gap-2 px-3 py-1.5 rounded-md text-xs font-medium bg-primary/10 text-primary hover:bg-primary/20 transition-colors"
          >
            <Plus className="h-3.5 w-3.5" />
            New page
          </button>
        </div>

        {/* Collections + Pages tree */}
        <nav className="flex-1 overflow-y-auto px-2 py-1">
          {loading ? (
            <div className="px-3 py-4 text-xs text-muted-foreground">
              Loading...
            </div>
          ) : (
            <>
              {/* Collections */}
              {collections.map((col) => {
                const colPages = pagesByCollection[col.id] || [];
                const expanded = expandedCollections.has(col.id);
                return (
                  <div key={col.id} className="mb-0.5">
                    <button
                      onClick={() => toggleCollection(col.id)}
                      className="w-full flex items-center gap-1.5 px-2 py-1.5 rounded-md text-xs font-medium text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors"
                    >
                      {expanded ? (
                        <ChevronDown className="h-3 w-3 shrink-0" />
                      ) : (
                        <ChevronRight className="h-3 w-3 shrink-0" />
                      )}
                      {col.icon || <BookOpen className="h-3.5 w-3.5" />}
                      <span className="truncate">{col.name}</span>
                    </button>
                    {expanded &&
                      colPages.map((page) => (
                        <button
                          key={page.id}
                          onClick={() => navigate(`/page/${page.id}`)}
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
                            <span className="ml-auto text-[10px] px-1 py-0.5 rounded bg-yellow-500/10 text-yellow-500 shrink-0">
                              Draft
                            </span>
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
                    {expandedCollections.has("uncategorized") ? (
                      <ChevronDown className="h-3 w-3 shrink-0" />
                    ) : (
                      <ChevronRight className="h-3 w-3 shrink-0" />
                    )}
                    <Hash className="h-3.5 w-3.5" />
                    Uncategorized
                  </button>
                  {expandedCollections.has("uncategorized") &&
                    pagesByCollection["uncategorized"].map((page) => (
                      <button
                        key={page.id}
                        onClick={() => navigate(`/page/${page.id}`)}
                        className={cn(
                          "w-full flex items-center gap-2 pl-8 pr-2 py-1 rounded-md text-xs transition-colors text-left",
                          isActive(page.id)
                            ? "bg-primary/10 text-primary font-medium"
                            : "text-muted-foreground hover:text-foreground hover:bg-muted/50",
                        )}
                      >
                        <FileText className="h-3.5 w-3.5 shrink-0" />
                        <span className="truncate">{page.title}</span>
                      </button>
                    ))}
                </div>
              )}

              {collections.length === 0 &&
                Object.keys(pagesByCollection).length === 0 && (
                  <div className="px-3 py-4 text-xs text-muted-foreground">
                    No pages yet. Create your first page!
                  </div>
                )}
            </>
          )}
        </nav>

        {/* Sidebar footer */}
        <div className="px-3 py-2 border-t border-border">
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            {userId ? (
              <span className="truncate">Logged in</span>
            ) : (
              <button
                onClick={() => navigate("/login")}
                className="text-primary hover:underline"
              >
                Sign in
              </button>
            )}
          </div>
        </div>
      </aside>

      {/* Overlay for mobile */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-30 bg-black/50 md:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Main content */}
      <main className="flex-1 overflow-y-auto">
        {/* Mobile header */}
        <div className="md:hidden flex items-center gap-2 px-4 h-14 border-b border-border">
          <button onClick={() => setSidebarOpen(true)}>
            <Menu className="h-5 w-5" />
          </button>
          <div className="w-6 h-6 rounded-md bg-gradient-to-br from-primary to-purple-600 flex items-center justify-center">
            <Library className="h-3 w-3 text-white" />
          </div>
          <span className="font-semibold text-sm">Spacetime Wiki</span>
        </div>

        <Routes>
          <Route path="/" element={<HomeView />} />
          <Route path="/new" element={<PageEditor userId={userId} />} />
          <Route
            path="/page/:id"
            element={<PageViewWrapper userId={userId} />}
          />
          <Route
            path="/page/:id/edit"
            element={<PageEditor userId={userId} />}
          />
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
          .filter((p) => p.status === "published")
          .sort((a, b) => b.updated_at - a.updated_at)
          .slice(0, 10),
      );
    });
  }, []);

  return (
    <div className="p-4 md:p-6 lg:p-8 space-y-6 max-w-4xl mx-auto">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Home</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Welcome to Spacetime Wiki — your team's knowledge base.
        </p>
      </div>

      {recentPages.length > 0 && (
        <div className="space-y-3">
          <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
            Recently Updated
          </h2>
          <div className="grid gap-2">
            {recentPages.map((page) => (
              <button
                key={page.id}
                onClick={() => navigate(`/page/${page.id}`)}
                className="flex items-center gap-3 p-3 rounded-lg border border-border bg-card hover:bg-secondary transition-colors text-left"
              >
                <FileText className="h-4 w-4 text-muted-foreground shrink-0" />
                <div className="min-w-0 flex-1">
                  <div className="text-sm font-medium truncate">
                    {page.title}
                  </div>
                  <div className="text-[11px] text-muted-foreground">
                    Updated {timeAgo(page.updated_at)}
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
        <p className="text-xs text-muted-foreground mb-3">
          Start documenting your knowledge.
        </p>
        <button
          onClick={() => navigate("/new")}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium bg-primary text-white hover:bg-primary/90 transition-colors"
        >
          <Plus className="h-3.5 w-3.5" />
          New Page
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
      if (isRegister) {
        await api.users.register(name, email, password);
      }
      const user = await api.users.login(email, password);
      if (!user) throw new Error("Login failed");
      localStorage.setItem("sw_user_id", user.id);
      navigate("/");
    } catch (err: any) {
      setError(String(err));
    }
  };

  return (
    <div className="p-4 md:p-6 lg:p-8 max-w-md mx-auto">
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold">
            {isRegister ? "Create account" : "Sign in"}
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            {isRegister
              ? "Join your team's knowledge base."
              : "Welcome back to Spacetime Wiki."}
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {isRegister && (
            <div>
              <label className="block text-xs font-medium mb-1">Name</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full h-9 px-3 rounded-md border border-border bg-card text-sm focus:outline-none focus:ring-1 focus:ring-primary/50"
                required
              />
            </div>
          )}
          <div>
            <label className="block text-xs font-medium mb-1">Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full h-9 px-3 rounded-md border border-border bg-card text-sm focus:outline-none focus:ring-1 focus:ring-primary/50"
              required
            />
          </div>
          <div>
            <label className="block text-xs font-medium mb-1">Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full h-9 px-3 rounded-md border border-border bg-card text-sm focus:outline-none focus:ring-1 focus:ring-primary/50"
              required
            />
          </div>

          {error && (
            <div className="text-xs text-red-400 bg-red-500/10 px-3 py-2 rounded-md">
              {error}
            </div>
          )}

          <button
            type="submit"
            className="w-full h-9 rounded-md bg-primary text-white text-sm font-medium hover:bg-primary/90 transition-colors"
          >
            {isRegister ? "Create account" : "Sign in"}
          </button>
        </form>

        <p className="text-xs text-muted-foreground text-center">
          {isRegister ? "Already have an account?" : "Don't have an account?"}{" "}
          <button
            onClick={() => setIsRegister(!isRegister)}
            className="text-primary hover:underline"
          >
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
