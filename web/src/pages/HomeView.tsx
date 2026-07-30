import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { api, Page, Collection } from '../lib/api';
import {
  Loader2,
  FileText,
  Eye,
  Plus,
  Upload,
  Library,
  Keyboard,
  Edit3,
  Search,
  BookOpen,
  MessageSquare,
  Shield,
  Download,
  Star,
  LayoutTemplate,
} from 'lucide-react';
import { timeAgo } from '../lib/utils';
import { markdownToProseMirror } from '../lib/helpers';

export default function HomeView() {
  const navigate = useNavigate();
  const [recentPages, setRecentPages] = useState<Page[]>([]);
  const [importing, setImporting] = useState(false);
  const importRef = useRef<HTMLInputElement>(null);
  const [trendingPages, setTrendingPages] = useState<
    { page_id: string; views: number; title: string; icon: string }[]
  >([]);

  useEffect(() => {
    api.pages.list().then((pages) => {
      setRecentPages(
        pages
          .filter((p: unknown) => p.status === 'published' || p.status === 'draft')
          .sort((a: unknown, b: unknown) => b.updated_at - a.updated_at)
          .slice(0, 10),
      );
    });
    api.analytics
      .getTrending(5)
      .then(async (trending) => {
        const enriched = await Promise.all(
          trending.map(async (t: unknown) => {
            try {
              const p = await api.pages.get(t.page_id);
              return { ...t, title: p?.title || 'Unknown', icon: p?.icon || '' };
            } catch {
              return { ...t, title: 'Unknown', icon: '' };
            }
          }),
        );
        setTrendingPages(enriched.filter((t: unknown) => t.title !== 'Unknown'));
      })
      .catch((err) => console.error('Failed to load trending pages:', err));
  }, []);

  const handleImportMD = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setImporting(true);
    try {
      const text = await file.text();
      const title = file.name.replace(/\.md$/i, '');
      const doc = markdownToProseMirror(text);
      const id = await api.pages.create(title, JSON.stringify(doc), '', '', 'anonymous');
      navigate(`/page/${id}`);
    } catch (err) {
      console.error(err);
    } finally {
      setImporting(false);
      e.target.value = '';
    }
  };

  const hasPages = recentPages.length > 0;

  if (!hasPages) {
    return (
      <div className="p-4 md:p-6 lg:p-8 max-w-3xl mx-auto">
        <div className="text-center py-8 md:py-12">
          <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-linear-to-br from-primary to-purple-600 flex items-center justify-center shadow-lg">
            <Library className="h-8 w-8 text-white" />
          </div>
          <h1 className="text-3xl font-bold text-foreground mb-2">Welcome to Spacetime Wiki</h1>
          <p className="text-sm text-muted-foreground max-w-md mx-auto">
            Your team's knowledge base, powered by SpacetimeDB for real-time collaboration. Start by
            creating your first page or importing existing content.
          </p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-8">
          <button
            onClick={() => navigate('/new')}
            className="flex flex-col items-center gap-2 p-6 rounded-xl border border-border bg-card hover:bg-secondary hover:border-primary/30 transition-all group"
          >
            <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center group-hover:bg-primary/20 transition-colors">
              <Plus className="h-6 w-6 text-primary" />
            </div>
            <span className="text-sm font-semibold">Create a page</span>
            <span className="text-xs text-muted-foreground text-center">
              Start writing in our rich WYSIWYG editor with markdown support
            </span>
          </button>
          <button
            onClick={() => importRef.current?.click()}
            disabled={importing}
            className="flex flex-col items-center gap-2 p-6 rounded-xl border border-border bg-card hover:bg-secondary hover:border-primary/30 transition-all group disabled:opacity-50"
          >
            <div className="w-12 h-12 rounded-lg bg-emerald-500/10 flex items-center justify-center group-hover:bg-emerald-500/20 transition-colors">
              {importing ? (
                <Loader2 className="h-6 w-6 animate-spin text-emerald-500" />
              ) : (
                <Upload className="h-6 w-6 text-emerald-500" />
              )}
            </div>
            <span className="text-sm font-semibold">Import Markdown</span>
            <span className="text-xs text-muted-foreground text-center">
              Drag or select .md files to instantly create wiki pages
            </span>
            <input
              ref={importRef}
              type="file"
              accept=".md,.txt"
              onChange={handleImportMD}
              className="hidden"
            />
          </button>
          <button
            onClick={() => document.dispatchEvent(new KeyboardEvent('keydown', { key: '?' }))}
            className="flex flex-col items-center gap-2 p-6 rounded-xl border border-border bg-card hover:bg-secondary hover:border-primary/30 transition-all group"
          >
            <div className="w-12 h-12 rounded-lg bg-purple-500/10 flex items-center justify-center group-hover:bg-purple-500/20 transition-colors">
              <Keyboard className="h-6 w-6 text-purple-400" />
            </div>
            <span className="text-sm font-semibold">Keyboard shortcuts</span>
            <span className="text-xs text-muted-foreground text-center">
              Press <kbd className="px-1 py-0.5 rounded bg-muted font-mono text-[10px]">?</kbd> to
              see all shortcuts
            </span>
          </button>
        </div>
        <div className="mb-8">
          <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3">
            What you can do
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
            {[
              {
                icon: <Edit3 className="h-4 w-4" />,
                title: 'Rich editing',
                desc: 'WYSIWYG, Markdown, or split view with / commands, emoji picker, and drag-and-drop blocks',
              },
              {
                icon: <Search className="h-4 w-4" />,
                title: 'Full-text search',
                desc: 'Instant search across all pages with collection, author, and date filters',
              },
              {
                icon: <BookOpen className="h-4 w-4" />,
                title: 'Collections & tags',
                desc: 'Organize pages into collections with custom icons, colors, and labels/tags',
              },
              {
                icon: <MessageSquare className="h-4 w-4" />,
                title: 'Comments & history',
                desc: 'Leave comments, restore previous revisions, and compare visual diffs',
              },
              {
                icon: <Shield className="h-4 w-4" />,
                title: 'Permissions & sharing',
                desc: 'Role-based access control, public share links with passwords, and SSO (OIDC/SAML)',
              },
              {
                icon: <Download className="h-4 w-4" />,
                title: 'Import/export',
                desc: 'Import from Markdown, export as MD, HTML, JSON, PDF, or ZIP with attachments',
              },
              {
                icon: <Star className="h-4 w-4" />,
                title: 'Favorites & pinning',
                desc: 'Star your frequently-accessed pages and pin important ones to the top',
              },
              {
                icon: <LayoutTemplate className="h-4 w-4" />,
                title: 'Templates & embeds',
                desc: 'Create pages from templates, embed YouTube/Figma/30+ providers, and diagrams',
              },
            ].map((feature, i) => (
              <div
                key={i}
                className="flex items-start gap-3 p-3 rounded-lg border border-border bg-card hover:bg-secondary transition-colors"
              >
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
                  <div className="text-sm font-medium truncate">{page.title}</div>
                  <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
                    <span>Updated {timeAgo(page.updated_at)}</span>
                    {page.status === 'draft' && <span className="text-yellow-500">· Draft</span>}
                    {page.status === 'archived' && (
                      <span className="text-muted-foreground">· Archived</span>
                    )}
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
                {item.icon ? (
                  <span className="text-base">{item.icon}</span>
                ) : (
                  <FileText className="h-4 w-4 text-muted-foreground shrink-0" />
                )}
                <div className="min-w-0 flex-1">
                  <div className="text-sm font-medium truncate">{item.title}</div>
                  <div className="flex items-center gap-1 text-[11px] text-muted-foreground">
                    <Eye className="h-3 w-3" />
                    <span>
                      {item.views} view{item.views !== 1 ? 's' : ''}
                    </span>
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
          onClick={() => navigate('/new')}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium bg-primary text-white hover:bg-primary/90 transition-colors"
        >
          <Plus className="h-3.5 w-3.5" /> New Page
        </button>
        <input
          ref={importRef}
          type="file"
          accept=".md,.txt"
          onChange={handleImportMD}
          className="hidden"
        />
        <button
          onClick={() => importRef.current?.click()}
          disabled={importing}
          className="ml-2 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium border border-border text-muted-foreground hover:text-foreground hover:bg-muted transition-colors disabled:opacity-50"
        >
          {importing ? (
            <Loader2 className="h-3 w-3 animate-spin" />
          ) : (
            <Upload className="h-3 w-3" />
          )}
          Import MD
        </button>
      </div>
    </div>
  );
}
