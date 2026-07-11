import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { api, Page, Collection } from '../lib/api';
import { Star, BookOpen, FileText, ChevronRight, Loader2 } from 'lucide-react';
import { timeAgo } from '../lib/utils';

export default function FavoritesView() {
  const navigate = useNavigate();
  const [favoritePages, setFavoritePages] = useState<Page[]>([]);
  const [collections, setCollections] = useState<Collection[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      try {
        const allCols = await api.collections.list();
        if (cancelled) return;
        setCollections(allCols);

        const userId = localStorage.getItem('sw_user_id');
        if (!userId) {
          setLoading(false);
          return;
        }

        const rows = await api.favorites.list(userId);
        const favPageIds = new Set(((rows as unknown[][]) || []).map((r: unknown) => String(r[2])));
        if (cancelled) return;
        const allPages = await api.pages.list();
        if (cancelled) return;
        setFavoritePages(allPages.filter((p) => favPageIds.has(p.id) && p.status !== 'deleted'));
      } catch {
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    load();
    return () => {
      cancelled = true;
    };
  }, []);

  const byCollection: Record<string, Page[]> = {};
  for (const p of favoritePages) {
    const key = p.collection_id || '__none__';
    if (!byCollection[key]) byCollection[key] = [];
    byCollection[key].push(p);
  }
  const colNames: Record<string, string> = {};
  for (const c of collections) colNames[c.id] = c.name;

  if (loading) {
    return (
      <div className="p-8 flex items-center justify-center">
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="p-4 md:p-6 lg:p-8 max-w-4xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <Star className="h-6 w-6 text-yellow-400" /> Favorites
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Your starred pages — quick access to your most important content
          </p>
        </div>
        <button
          onClick={() => navigate('/')}
          className="inline-flex items-center gap-1 px-3 py-1.5 rounded-md text-xs font-medium text-muted-foreground hover:text-foreground border border-border hover:bg-muted/50 transition-colors"
        >
          Back to home
        </button>
      </div>

      {favoritePages.length === 0 ? (
        <div className="text-center py-16 border border-dashed border-border rounded-xl">
          <Star className="h-12 w-12 mx-auto mb-4 text-muted-foreground/40" />
          <h3 className="text-lg font-semibold text-foreground mb-2">No favorites yet</h3>
          <p className="text-sm text-muted-foreground max-w-xs mx-auto mb-6">
            Star pages you use frequently by clicking the star icon next to a page title. They'll
            appear here for quick access.
          </p>
          <button
            onClick={() => navigate('/')}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors"
          >
            <FileText className="h-4 w-4" /> Browse pages
          </button>
        </div>
      ) : (
        <div className="space-y-6">
          {Object.entries(byCollection).map(([colId, pages]) => (
            <div key={colId} className="rounded-xl border border-border bg-card overflow-hidden">
              <div className="flex items-center gap-2 px-4 py-3 border-b border-border bg-muted/20">
                <BookOpen className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm font-semibold">{colNames[colId] || 'Uncategorized'}</span>
                <span className="text-[11px] text-muted-foreground ml-auto">
                  {pages.length} page{pages.length !== 1 ? 's' : ''}
                </span>
              </div>
              <div className="divide-y divide-border/50">
                {pages.map((p) => (
                  <button
                    key={p.id}
                    onClick={() => navigate(`/page/${p.id}`)}
                    className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-muted/30 transition-colors group"
                  >
                    <span className="text-lg shrink-0">{p.icon || '📄'}</span>
                    <div className="min-w-0 flex-1">
                      <div className="text-sm font-medium truncate">{p.title}</div>
                      <div className="text-[11px] text-muted-foreground mt-0.5">
                        Updated {timeAgo(p.updated_at)}
                      </div>
                    </div>
                    <ChevronRight className="h-4 w-4 text-muted-foreground/40 group-hover:text-muted-foreground transition-colors shrink-0" />
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
