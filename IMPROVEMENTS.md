# SpacetimeWiki — Improvement Backlog

Living queue managed by the continuous-improvement cron. The cron reads this file,
cleans up completed items, researches new improvement opportunities, adds them,
and works the top pending item each tick.

---

## Status: Working P4 backlog — REST API Swagger/OpenAPI docs next.
|## Status: Implementing P4 — REST API OpenAPI docs (response models + generated spec).

|| Priority | Item | Notes |
||----------|------|-------|
|| P4 | REST API Swagger/OpenAPI docs | Add Pydantic response models + generate OpenAPI 3.0 spec |
|| P2 | Drag-and-drop sidebar reorder | Use @dnd-kit/core for reordering pages and collections in the sidebar with drop targets between items |
|| P1 | Breadcrumbs component | Auto-generated breadcrumb trail from page parent hierarchy |
|| P1 | Callouts/notices in editor | Info, warning, tip, danger callout blocks via Tiptap |
|| P1 | Page tags/labels | UI for adding/removing tags on pages with filterable sidebar |

|---

|## Recently Completed

|| Date | Item | Commit |
||------|------|--------|
|| 2026-06-27 | **P4 — Graph/network visualization!** Interactive D3 force-directed graph of wiki pages and collections. Pages as colored nodes (by collection), parent-child and backlink edges, collection cluster nodes, toggleable layers (collection/parent-child/backlinks), zoom controls, click-to-select with info panel, double-click to navigate, legend overlay | a6321d4 |
|| 2026-06-27 | **P3 — Dual editor / Markdown source toggle!** WYSIWYG/Markdown/Split mode tabs with tiptapToMarkdown and markdownToProseMirror conversion, monospace textarea editor, side-by-side split view | 67fb0da |
|| 2026-06-26 | **P2 — Notification center / watch pages!** STDB `watch` + `notification` tables with toggle_watch, create_notification, mark_read, mark_all_read, clear_all reducers. NotificationBell component with bell icon, unread badge, dropdown with mark-read/delete actions. Watch/unwatch toggle in PageView actions bar. | 8adbd6d |
|| 2026-06-26 | **P2 — Admin dashboard / wiki statistics!** SQL-powered stats cards (pages, users, collections, comments, attachments + storage), page status breakdown with bar chart, top contributors leaderboard, and recent activity feed from audit_event. | e613e67 |
|| 2026-06-26 | **P2 — Activity feed / audit trail page!** Dedicated `/activity` route with sidebar link, command palette entry (G A shortcut), reusable ActivityFeed component with 200-event limit and click-to-navigate | bcaf7c2 |
