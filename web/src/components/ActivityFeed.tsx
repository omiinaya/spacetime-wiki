import { useState, useEffect, useCallback, useRef } from "react";
import {
  Activity, Clock, FileText, Trash2, Archive, RotateCcw, Plus,
  FolderPlus, MessageSquare, Edit3, UserPlus, Shield, Users,
} from "lucide-react";
import { auditApi, type AuditEvent } from "../lib/api";
import { cn, timeAgo } from "../lib/utils";

// ─── Helpers ─────────────────────────────────────────────────────────────────

const EVENT_ICONS: Record<string, React.ElementType> = {
  "page.create": Plus,
  "page.update": Edit3,
  "page.delete": Trash2,
  "page.restore": RotateCcw,
  "page.publish": FileText,
  "page.archive": Archive,
  "page.status_change": FileText,
  "collection.create": FolderPlus,
  "collection.delete": Trash2,
  "comment.create": MessageSquare,
  "comment.delete": Trash2,
  "group.create": Users,
  "group.delete": Trash2,
  "user.create": UserPlus,
  "user.role_change": Shield,
};

const EVENT_LABELS: Record<string, string> = {
  "page.create": "created page",
  "page.update": "updated page",
  "page.delete": "deleted page",
  "page.restore": "restored page",
  "page.publish": "published page",
  "page.archive": "archived page",
  "page.status_change": "changed page status",
  "collection.create": "created collection",
  "collection.delete": "deleted collection",
  "comment.create": "commented on",
  "comment.delete": "deleted comment on",
  "group.create": "created group",
  "group.delete": "deleted group",
  "user.create": "registered user",
  "user.role_change": "changed user role",
};

export function getEventIcon(eventType: string): React.ElementType {
  return EVENT_ICONS[eventType] || Activity;
}

export function getEventLabel(eventType: string): string {
  return EVENT_LABELS[eventType] || eventType;
}

export function getEventColor(eventType: string): string {
  if (eventType.includes("delete")) return "text-red-500";
  if (eventType.includes("create") || eventType.includes("restore")) return "text-green-500";
  if (eventType.includes("update") || eventType.includes("publish")) return "text-blue-500";
  if (eventType.includes("archive") || eventType.includes("status_change")) return "text-yellow-500";
  return "text-gray-400";
}

export function getActorName(usernameMap: Record<string, string>, actorId: string): string {
  return usernameMap[actorId] || actorId.slice(0, 12) + "...";
}

// ─── Props ────────────────────────────────────────────────────────────────────

interface ActivityFeedProps {
  compact?: boolean;
  limit?: number;
  onNavigate?: (targetId: string, eventType: string) => void;
}

// ─── Component ────────────────────────────────────────────────────────────────

export function ActivityFeed({ compact = false, limit = 50, onNavigate }: ActivityFeedProps) {
  const [events, setEvents] = useState<AuditEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [usernameMap, setUsernameMap] = useState<Record<string, string>>({});
  const [autoRefresh, setAutoRefresh] = useState(true);
  const refreshIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Load usernames for event display
  useEffect(() => {
    const loadUsernames = async () => {
      try {
        const { sqlQuery } = await import("../lib/api");
        const rows = await sqlQuery("SELECT id, name FROM user") as unknown[][];
        const map: Record<string, string> = {};
        for (const row of rows) {
          map[String(row[0])] = String(row[1] ?? "");
        }
        setUsernameMap(map);
      } catch {
        // Silently fail — we'll show truncated IDs
      }
    };
    loadUsernames();
  }, []);

  // Load events
  const loadEvents = useCallback(async () => {
    try {
      const data = await auditApi.list(limit > 200 ? 200 : limit);
      setEvents(data);
      setError(null);
    } catch (err) {
      setError("Failed to load activity feed");
      console.error("ActivityFeed error:", err);
    } finally {
      setLoading(false);
    }
  }, [limit]);

  useEffect(() => {
    loadEvents();
  }, [loadEvents]);

  // Auto-refresh every 15 seconds
  useEffect(() => {
    if (!autoRefresh) {
      if (refreshIntervalRef.current) {
        clearInterval(refreshIntervalRef.current);
        refreshIntervalRef.current = null;
      }
      return;
    }
    refreshIntervalRef.current = setInterval(loadEvents, 15_000);
    return () => {
      if (refreshIntervalRef.current) {
        clearInterval(refreshIntervalRef.current);
        refreshIntervalRef.current = null;
      }
    };
  }, [autoRefresh, loadEvents]);

  // Handle click on an event target
  const handleEventClick = (event: AuditEvent) => {
    if (onNavigate && event.target_id) {
      onNavigate(event.target_id, event.event_type);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8 text-gray-400">
        <Clock className="w-5 h-5 animate-pulse mr-2" />
        <span>Loading activity...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-4 text-red-400">
        <p>{error}</p>
        <button
          onClick={loadEvents}
          className="mt-2 text-sm text-blue-400 hover:underline"
        >
          Try again
        </button>
      </div>
    );
  }

  if (events.length === 0) {
    return (
      <div className="text-center py-8 text-gray-400">
        <Activity className="w-8 h-8 mx-auto mb-2 opacity-50" />
        <p>No recent activity</p>
        <p className="text-xs text-gray-500 mt-1">
          Activity will appear here as pages are created, updated, or deleted
        </p>
      </div>
    );
  }

  return (
    <div className={cn("space-y-0", compact ? "max-h-[60vh] overflow-y-auto" : "")}>
      {/* Auto-refresh toggle */}
      <div className="flex items-center justify-between px-3 py-1.5 border-b border-gray-700/50">
        <span className="text-xs text-gray-500">
          {events.length} event{events.length !== 1 ? "s" : ""}
        </span>
        <button
          onClick={() => setAutoRefresh(!autoRefresh)}
          className={cn(
            "text-xs px-2 py-0.5 rounded transition-colors",
            autoRefresh
              ? "text-green-400 bg-green-900/30 hover:bg-green-900/50"
              : "text-gray-500 bg-gray-800/50 hover:bg-gray-700/50",
          )}
        >
          {autoRefresh ? "Auto-refresh ON" : "Auto-refresh OFF"}
        </button>
      </div>

      {/* Event list */}
      {events.map((event) => {
        const Icon = getEventIcon(event.event_type);
        const color = getEventColor(event.event_type);
        const actorName = getActorName(usernameMap, event.actor_id);
        const isClickable = !!onNavigate && !!event.target_id;

        return (
          <div
            key={event.id}
            onClick={() => isClickable && handleEventClick(event)}
            className={cn(
              "flex items-start gap-3 px-3 py-2.5 border-b border-gray-800/50 hover:bg-gray-800/30 transition-colors",
              isClickable ? "cursor-pointer" : "",
            )}
          >
            {/* Icon */}
            <div className={cn("mt-0.5 shrink-0", color)}>
              <Icon className="w-4 h-4" />
            </div>

            {/* Content */}
            <div className="flex-1 min-w-0">
              <div className="text-sm">
                {event.actor_id && (
                  <span className="font-medium text-gray-200">{actorName}</span>
                )}{" "}
                <span className="text-gray-400">{getEventLabel(event.event_type)}</span>{" "}
                {event.target_name && (
                  <span className="font-medium text-gray-200 truncate">
                    "{event.target_name}"
                  </span>
                )}
              </div>
              <div className="text-xs text-gray-500 mt-0.5">
                {timeAgo(event.created_at)}
              </div>
            </div>

            {/* Event type badge */}
            <div className="shrink-0">
              <span className="text-[10px] uppercase tracking-wider text-gray-600 bg-gray-800/50 px-1.5 py-0.5 rounded">
                {event.event_type.replace("page.", "").replace("collection.", "").replace("comment.", "").replace("user.", "").replace("group.", "")}
              </span>
            </div>
          </div>
        );
      })}
    </div>
  );
}
