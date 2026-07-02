// ─── Notification Bell Component ──────────────────────────────────────────────
// Displays a bell icon in the sidebar header with an unread count badge.
// Clicking opens a dropdown showing recent notifications with the ability to
// mark them as read or navigate to the target page.

import React, { useState, useRef, useEffect, useCallback } from "react";
import { Bell, CheckCheck, Trash2, X, ExternalLink, Clock } from "lucide-react";
import { cn, timeAgo } from "../lib/utils";
import { api, type Notification } from "../lib/api";

interface NotificationBellProps {
  userId: string | null;
  notifications: Notification[];
  onRefresh?: () => void;
}

export function NotificationBell({ userId, notifications, onRefresh }: NotificationBellProps) {
  const [open, setOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);

  const unreadCount = notifications.filter((n) => !n.is_read).length;

  // Close dropdown when clicking outside
  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(e.target as Node) &&
        buttonRef.current &&
        !buttonRef.current.contains(e.target as Node)
      ) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  // Close on Escape
  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [open]);

  const handleMarkAllRead = useCallback(async () => {
    if (!userId) return;
    try {
      await api.notifications.markAllRead(userId);
      onRefresh?.();
    } catch (err) {
      console.error("Failed to mark all read:", err);
    }
  }, [userId, onRefresh]);

  const handleClearAll = useCallback(async () => {
    if (!userId) return;
    try {
      await api.notifications.clearAll(userId);
      onRefresh?.();
    } catch (err) {
      console.error("Failed to clear all:", err);
    }
  }, [userId, onRefresh]);

  const handleMarkRead = useCallback(async (id: string) => {
    try {
      await api.notifications.markRead(id);
      onRefresh?.();
    } catch (err) {
      console.error("Failed to mark notification read:", err);
    }
  }, [onRefresh]);

  const handleDelete = useCallback(async (id: string) => {
    try {
      await api.notifications.delete(id);
      onRefresh?.();
    } catch (err) {
      console.error("Failed to delete notification:", err);
    }
  }, [onRefresh]);

  const navigateToTarget = useCallback((notif: Notification) => {
    if (notif.target_id) {
      window.location.assign(`/page/${notif.target_id}`);
    }
    setOpen(false);
  }, []);

  // Icon for notification type
  const getEventIcon = (eventType: string): string => {
    switch (eventType) {
      case "page.create": return "📄";
      case "page.update": return "✏️";
      case "page.delete": return "🗑️";
      case "page.publish": return "🚀";
      case "page.archive": return "📦";
      case "comment.create": return "💬";
      case "collection.create": return "📁";
      case "collection.update": return "📂";
      case "collection.delete": return "❌";
      default: return "🔔";
    }
  };

  const sorted = [...notifications].sort((a, b) => b.created_at - a.created_at);

  return (
    <div className="relative">
      <button
        ref={buttonRef}
        onClick={() => setOpen(!open)}
        className={cn(
          "relative p-1.5 rounded-md transition-colors",
          "text-muted-foreground hover:text-foreground hover:bg-muted",
          open && "bg-muted text-foreground",
        )}
        aria-label={`Notifications${unreadCount > 0 ? ` (${unreadCount} unread)` : ""}`}
        title="Notifications"
      >
        <Bell className="h-4 w-4" />
        {unreadCount > 0 && (
          <span className="absolute -top-0.5 -right-0.5 flex items-center justify-center min-w-[14px] h-3.5 px-1 text-[9px] font-bold leading-none text-white bg-red-500 rounded-full">
            {unreadCount > 99 ? "99+" : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div
          ref={dropdownRef}
          className={cn(
            "absolute right-0 mt-1 w-80 max-h-[70vh] overflow-hidden",
            "rounded-lg border border-border bg-card shadow-xl backdrop-blur-xs",
            "z-9999 flex flex-col",
          )}
        >
          {/* Header */}
          <div className="flex items-center justify-between px-3 py-2 border-b border-border">
            <h3 className="text-xs font-semibold text-foreground">
              Notifications
              {unreadCount > 0 && (
                <span className="ml-1.5 text-[10px] text-muted-foreground">
                  ({unreadCount} unread)
                </span>
              )}
            </h3>
            <div className="flex items-center gap-1">
              {unreadCount > 0 && (
                <button
                  onClick={handleMarkAllRead}
                  className="p-1 rounded text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                  title="Mark all as read"
                >
                  <CheckCheck className="h-3.5 w-3.5" />
                </button>
              )}
              {notifications.length > 0 && (
                <button
                  onClick={handleClearAll}
                  className="p-1 rounded text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                  title="Clear all notifications"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              )}
              <button
                onClick={() => setOpen(false)}
                className="p-1 rounded text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                title="Close"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>

          {/* List */}
          <div className="flex-1 overflow-y-auto">
            {sorted.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
                <Bell className="h-8 w-8 mb-2 opacity-30" />
                <p className="text-xs">No notifications yet</p>
                <p className="text-[10px] mt-1">
                  Watch pages and collections to get notified of changes
                </p>
              </div>
            ) : (
              sorted.map((notif) => (
                <div
                  key={notif.id}
                  className={cn(
                    "group flex items-start gap-2.5 px-3 py-2.5 border-b border-border/50 last:border-0",
                    "hover:bg-muted/50 cursor-pointer transition-colors",
                    !notif.is_read && "bg-primary/5",
                  )}
                  onClick={() => navigateToTarget(notif)}
                >
                  {/* Icon */}
                  <span className="text-base leading-none mt-0.5 shrink-0">
                    {notif.icon || getEventIcon(notif.event_type)}
                  </span>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <p className={cn(
                      "text-[11px] leading-tight",
                      !notif.is_read ? "text-foreground font-medium" : "text-muted-foreground",
                    )}>
                      {notif.title}
                    </p>
                    {notif.message && (
                      <p className="text-[10px] text-muted-foreground mt-0.5 line-clamp-2">
                        {notif.message}
                      </p>
                    )}
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-[9px] text-muted-foreground/60">
                        {timeAgo(notif.created_at)}
                      </span>
                      {!notif.is_read && (
                        <span className="text-[9px] text-primary font-medium">New</span>
                      )}
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="shrink-0 flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                    {!notif.is_read && (
                      <button
                        onClick={(e) => { e.stopPropagation(); handleMarkRead(notif.id); }}
                        className="p-1 rounded text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                        title="Mark as read"
                      >
                        <CheckCheck className="h-3 w-3" />
                      </button>
                    )}
                    <button
                      onClick={(e) => { e.stopPropagation(); handleDelete(notif.id); }}
                      className="p-1 rounded text-muted-foreground hover:text-red-400 hover:bg-red-500/10 transition-colors"
                      title="Delete notification"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
