import { useState, useEffect, useCallback } from "react";
import { Loader2, ChevronRight, FileText, Users, BookOpen, MessageSquare, Paperclip, Clock, BarChart3, TrendingUp, Activity } from "lucide-react";
import { sqlQuery } from "../lib/api";
import { cn, timeAgo } from "../lib/utils";

// ─── Types ──────────────────────────────────────────────────────────────────

interface WikiStats {
  totalPages: number;
  totalUsers: number;
  totalCollections: number;
  totalComments: number;
  totalAttachments: number;
  totalStorageBytes: number;
  pagesPublished: number;
  pagesDraft: number;
  pagesArchived: number;
  pagesDeleted: number;
}

interface TopContributor {
  user_id: string;
  user_name: string;
  page_count: number;
}

interface RecentActivity {
  id: string;
  event_type: string;
  actor_id: string;
  target_name: string;
  created_at: number;
}

// ─── Helpers ────────────────────────────────────────────────────────────────

function formatBytes(bytes: number): string {
  if (bytes === 0) return "0 B";
  const units = ["B", "KB", "MB", "GB"];
  const i = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1);
  return (bytes / Math.pow(1024, i)).toFixed(i > 0 ? 1 : 0) + " " + units[i];
}

const eventIcons: Record<string, string> = {
  "page.create": "📝",
  "page.update": "✏️",
  "page.delete": "🗑️",
  "page.restore": "♻️",
  "page.publish": "🚀",
  "page.archive": "📦",
  "collection.create": "📁",
  "collection.delete": "❌",
  "comment.create": "💬",
  "comment.delete": "🗑️",
  "user.create": "👤",
  "user.role_change": "🔑",
};

function getEventLabel(eventType: string): string {
  const labels: Record<string, string> = {
    "page.create": "created page",
    "page.update": "updated page",
    "page.delete": "deleted page",
    "page.restore": "restored page",
    "page.publish": "published page",
    "page.archive": "archived page",
    "collection.create": "created collection",
    "collection.delete": "deleted collection",
    "comment.create": "commented on",
    "comment.delete": "deleted comment",
    "user.create": "joined",
    "user.role_change": "changed role",
  };
  return labels[eventType] || eventType;
}

// ─── StatCard ───────────────────────────────────────────────────────────────

function StatCard({ icon, label, value, sub, color }: {
  icon: React.ReactNode;
  label: string;
  value: number | string;
  sub?: string;
  color: string;
}) {
  return (
    <div className="flex items-center gap-3 p-4 rounded-xl border border-border bg-card hover:bg-secondary transition-colors">
      <div className={`w-10 h-10 rounded-lg flex items-center justify-center shrink-0 ${color}`}>
        {icon}
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-lg font-bold tabular-nums">{typeof value === "number" ? value.toLocaleString() : value}</p>
        <p className="text-[11px] text-muted-foreground truncate">{label}</p>
        {sub && <p className="text-[10px] text-muted-foreground/60 mt-0.5">{sub}</p>}
      </div>
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────���─────────

export default function AdminDashboard({ userId }: { userId: string | null }) {
  const [stats, setStats] = useState<WikiStats | null>(null);
  const [topContributors, setTopContributors] = useState<TopContributor[]>([]);
  const [recentActivity, setRecentActivity] = useState<RecentActivity[]>([]);
  const [loading, setLoading] = useState(true);
  const [activityLoading, setActivityLoading] = useState(true);
  const [error, setError] = useState("");

  // ── Load stats ──────────────────────────────────────────────────────────
  const loadStats = useCallback(async () => {
    try {
      const [
        pageRows, userRows, colRows, comRows, attRows,
        pubRows, draftRows, archRows, delRows,
        storageRows, contribRows,
      ] = await Promise.all([
        sqlQuery("SELECT COUNT(*) as c FROM page WHERE status != 'deleted'"),
        sqlQuery("SELECT COUNT(*) as c FROM `user`"),
        sqlQuery("SELECT COUNT(*) as c FROM collection"),
        sqlQuery("SELECT COUNT(*) as c FROM comment"),
        sqlQuery("SELECT COUNT(*) as c FROM attachment"),
        sqlQuery("SELECT COUNT(*) as c FROM page WHERE status = 'published'"),
        sqlQuery("SELECT COUNT(*) as c FROM page WHERE status = 'draft' OR status = 'private' OR status = ''"),
        sqlQuery("SELECT COUNT(*) as c FROM page WHERE status = 'archived'"),
        sqlQuery("SELECT COUNT(*) as c FROM page WHERE status = 'deleted'"),
        sqlQuery("SELECT COALESCE(SUM(size_bytes), 0) as total FROM attachment"),
        sqlQuery(`
          SELECT p.created_by as user_id, COALESCE(u.name, p.created_by) as user_name, COUNT(*) as page_count
          FROM page p LEFT JOIN \`user\` u ON p.created_by = u.id
          WHERE p.status != 'deleted'
          GROUP BY p.created_by
          
        `),
      ]);

      const toNum = (rows: unknown) => Number((rows[0] as unknown)?.c || 0);
      const toNum2 = (rows: unknown, key: string) => Number((rows[0] as unknown)?.[key] || 0);

      setStats({
        totalPages: toNum(pageRows),
        totalUsers: toNum(userRows),
        totalCollections: toNum(colRows),
        totalComments: toNum(comRows),
        totalAttachments: toNum(attRows),
        pagesPublished: toNum(pubRows),
        pagesDraft: toNum(draftRows),
        pagesArchived: toNum(archRows),
        pagesDeleted: toNum(delRows),
        totalStorageBytes: toNum2(storageRows, "total"),
      });

      setTopContributors(
        (contribRows as unknown[]).map((r: unknown) => ({
          user_id: String(r.user_id || ""),
          user_name: String(r.user_name || "Unknown"),
          page_count: Number(r.page_count || 0),
        }))
      );
    } catch (e: unknown) {
      console.error("Failed to load stats:", e);
      setError("Failed to load wiki statistics. Make sure the database is connected.");
    } finally {
      setLoading(false);
    }
  }, []);

  // ── Load recent activity ────────────────────────────────────────────────
  const loadActivity = useCallback(async () => {
    setActivityLoading(true);
    try {
      const rows = await sqlQuery(
        "SELECT id, event_type, actor_id, target_name, created_at FROM audit_event "
      );
      setRecentActivity(
        (rows as unknown[]).map((r: unknown) => ({
          id: String(r.id || ""),
          event_type: String(r.event_type || ""),
          actor_id: String(r.actor_id || ""),
          target_name: String(r.target_name || ""),
          created_at: Number(r.created_at || 0),
        }))
      );
    } catch (e) {
      console.error("Failed to load activity:", e);
    } finally {
      setActivityLoading(false);
    }
  }, []);

  useEffect(() => { loadStats(); loadActivity(); }, [loadStats, loadActivity]);

  // ── Render ──────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="px-4 py-8 text-center">
        <p className="text-sm text-red-400">{error}</p>
        <button
          onClick={() => { setLoading(true); loadStats(); }}
          className="mt-3 h-8 px-3 rounded-md text-xs font-medium bg-primary/10 text-primary hover:bg-primary/20 transition-colors"
        >
          Retry
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Stats cards row */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
        <StatCard
          icon={<FileText className="h-5 w-5 text-blue-400" />}
          label="Total Pages"
          value={stats?.totalPages || 0}
          sub={stats ? `${stats.pagesPublished} published` : undefined}
          color="bg-blue-500/10"
        />
        <StatCard
          icon={<Users className="h-5 w-5 text-emerald-400" />}
          label="Users"
          value={stats?.totalUsers || 0}
          color="bg-emerald-500/10"
        />
        <StatCard
          icon={<BookOpen className="h-5 w-5 text-purple-400" />}
          label="Collections"
          value={stats?.totalCollections || 0}
          color="bg-purple-500/10"
        />
        <StatCard
          icon={<MessageSquare className="h-5 w-5 text-amber-400" />}
          label="Comments"
          value={stats?.totalComments || 0}
          color="bg-amber-500/10"
        />
        <StatCard
          icon={<Paperclip className="h-5 w-5 text-rose-400" />}
          label="Attachments"
          value={stats?.totalAttachments || 0}
          sub={stats ? formatBytes(stats.totalStorageBytes) : undefined}
          color="bg-rose-500/10"
        />
      </div>

      {/* Second row: Page status breakdown + storage */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Page status breakdown */}
        <div className="p-4 rounded-xl border border-border bg-card">
          <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3 flex items-center gap-2">
            <BarChart3 className="h-3.5 w-3.5" />
            Page Status Breakdown
          </h3>
          {stats && (
            <div className="space-y-2">
              {[
                { label: "Published", count: stats.pagesPublished, color: "bg-emerald-500", barColor: "bg-emerald-500/20" },
                { label: "Draft / Private", count: stats.pagesDraft, color: "bg-blue-500", barColor: "bg-blue-500/20" },
                { label: "Archived", count: stats.pagesArchived, color: "bg-amber-500", barColor: "bg-amber-500/20" },
                { label: "Deleted (trash)", count: stats.pagesDeleted, color: "bg-red-500", barColor: "bg-red-500/20" },
              ].map((item) => {
                const total = stats.totalPages + stats.pagesDeleted;
                const pct = total > 0 ? Math.round((item.count / total) * 100) : 0;
                return (
                  <div key={item.label} className="flex items-center gap-3">
                    <div className={`w-2 h-2 rounded-full ${item.color} shrink-0`} />
                    <span className="text-xs text-muted-foreground flex-1">{item.label}</span>
                    <div className="flex items-center gap-2">
                      <div className="w-24 h-1.5 rounded-full bg-muted overflow-hidden">
                        <div className={`h-full rounded-full ${item.barColor}`} style={{ width: `${pct}%` }} />
                      </div>
                      <span className="text-xs font-medium tabular-nums w-12 text-right">{item.count}</span>
                      <span className="text-[10px] text-muted-foreground/60 w-10 text-right">{pct}%</span>
                    </div>
                  </div>
                );
              })}
              <div className="pt-2 mt-2 border-t border-border/50 flex justify-between text-[10px] text-muted-foreground/60">
                <span>Total (active): {stats.totalPages}</span>
                <span>Storage: {formatBytes(stats.totalStorageBytes)}</span>
              </div>
            </div>
          )}
        </div>

        {/* Top Contributors */}
        <div className="p-4 rounded-xl border border-border bg-card">
          <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3 flex items-center gap-2">
            <TrendingUp className="h-3.5 w-3.5" />
            Top Contributors
          </h3>
          {topContributors.length === 0 ? (
            <p className="text-xs text-muted-foreground/60 py-4 text-center">No pages created yet.</p>
          ) : (
            <div className="space-y-1.5">
              {topContributors.map((contrib, i) => (
                <div key={contrib.user_id} className="flex items-center gap-3 px-2 py-1.5 rounded-md hover:bg-muted/30 transition-colors">
                  <span className={`w-5 text-center text-xs font-bold ${i < 3 ? "text-primary" : "text-muted-foreground/60"}`}>
                    {i === 0 ? "🥇" : i === 1 ? "🥈" : i === 2 ? "🥉" : `#${i + 1}`}
                  </span>
                  <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center text-[10px] font-bold text-primary shrink-0">
                    {(contrib.user_name || "?").charAt(0).toUpperCase()}
                  </div>
                  <span className="text-xs flex-1 truncate">{contrib.user_name}</span>
                  <span className="text-xs font-medium tabular-nums">{contrib.page_count}</span>
                  <span className="text-[10px] text-muted-foreground/60">pages</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Recent Activity */}
      <div className="p-4 rounded-xl border border-border bg-card">
        <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3 flex items-center gap-2">
          <Activity className="h-3.5 w-3.5" />
          Recent Activity
        </h3>
        {activityLoading ? (
          <div className="flex items-center justify-center py-6">
            <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
          </div>
        ) : recentActivity.length === 0 ? (
          <p className="text-xs text-muted-foreground/60 py-4 text-center">No activity recorded yet.</p>
        ) : (
          <div className="space-y-0.5 max-h-[360px] overflow-y-auto">
            {recentActivity.map((event) => (
              <div key={event.id} className="flex items-start gap-3 px-2 py-2 rounded-md hover:bg-muted/30 transition-colors">
                <span className="text-base shrink-0 pt-0.5">{eventIcons[event.event_type] || "📌"}</span>
                <div className="flex-1 min-w-0">
                  <p className="text-xs">
                    <span className="font-medium text-foreground">{event.target_name}</span>
                    <span className="text-muted-foreground/60 ml-1">
                      {getEventLabel(event.event_type)}
                    </span>
                  </p>
                  <p className="text-[10px] text-muted-foreground/40 mt-0.5">
                    <Clock className="h-3 w-3 inline mr-0.5" />
                    {timeAgo(event.created_at / 1000)}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
