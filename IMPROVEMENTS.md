# SpacetimeWiki — Improvement Backlog

Living queue managed by the continuous-improvement cron. The cron reads this file,
cleans up completed items, researches new improvement opportunities, adds them,
and works the top pending item each tick.

---

## Status: Working P4 backlog items — Graph/network visualization next.

| Priority | Item | Notes |
|----------|------|-------|
| P4 | Graph/network visualization | Interactive D3/force-graph view of page relationships (backlinks, collections) as a visual browser |
| P4 | REST API Swagger/OpenAPI docs | Generate OpenAPI 3.0 spec for the FastAPI REST API endpoints |
| P2 | Drag-and-drop sidebar reorder | Use @dnd-kit/core for reordering pages and collections in the sidebar with drop targets between items |
| P3 | Dual editor / Markdown source toggle | Add a toggle switch between WYSIWYG (Tiptap) and raw Markdown source editing with live preview |


---

## Recently Completed

| Date | Item | Commit |
|------|------|--------|
| 2026-06-26 | **P3 — Search result snippets & highlighting!** Context-based snippets with yellow `<mark>` highlighting around matched terms, case-insensitive multi-match support, increased context window (30 before/50 after), improved visibility at text-[11px] with no truncation | fa5398a |
| 2026-06-26 | **P3 — Reading time / word count!** Estimated reading time, word count, and character count in PageView footer with live ProseMirror JSON content parsing | 1e585ef |
| 2026-06-26 | **P2 — Auto-notify watchers on page changes!** STDB helper functions + wiring into create_page, update_page, add_comment — collection watchers notified on new pages, page watchers notified on updates and comments, skips the event actor | 91dc2b0 |
| 2026-06-26 | **P2 — Notification center / watch pages!** STDB `watch` + `notification` tables with toggle_watch, create_notification, mark_read, mark_all_read, clear_all reducers. NotificationBell component with bell icon, unread badge, dropdown with mark-read/delete actions. Watch/unwatch toggle in PageView actions bar. Real-time notification delivery via STDB subscriptions with toast alerts. | 8adbd6d |
| 2026-06-26 | **P2 — Admin dashboard / wiki statistics!** SQL-powered stats cards (pages, users, collections, comments, attachments + storage), page status breakdown with bar chart, top contributors leaderboard, and recent activity feed from audit_event. Dashboard tab added as first admin panel tab. | e613e67 |
| 2026-06-26 | **P2 — Activity feed / audit trail page!** Dedicated `/activity` route with sidebar link, command palette entry (G A shortcut), reusable ActivityFeed component with 200-event limit and click-to-navigate | bcaf7c2 |
| 2026-06-26 | **P4 — Advanced search syntax!** Tag filters (tag: syntax), in:, author:, by:, from:, to:, date: full support. Backend search.py rewritten to use STDB search_pages reducer with filter params. Frontend search API client + wiring. STDB build errors fixed (MFA enable_totp, add_oauth_provider) | f96752f |
