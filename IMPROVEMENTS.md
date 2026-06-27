# SpacetimeWiki — Improvement Backlog

Living queue managed by the continuous-improvement cron. The cron reads this file,
cleans up completed items, researches new improvement opportunities, adds them,
and works the top pending item each tick.

---

## Status: No PENDING items — all verified done. Running deep research for new improvements.

---

## Recently Completed

| Date | Item | Commit |
|------|------|--------|
| 2026-06-27 | **P2 — Drag-and-drop sidebar reorder!** HTML5 native drag-and-drop for reordering pages and collections in sidebar with drop targets, cross-collection moves, and drag-to-trash | inline in App.tsx |
| 2026-06-27 | **P1 — Breadcrumbs component!** Auto-generated breadcrumb trail from page parent hierarchy showing collection → parent pages → current page with clickable navigation | inline in PageView.tsx |
| 2026-06-27 | **P1 — Callouts/notices in editor!** Info, warning, tip, danger callout blocks via custom Tiptap extension | Callout.ts extension |
| 2026-06-27 | **P1 — Page tags/labels!** UI for add/remove tags with autocomplete, color-coded tag badges, tag filtering in sidebar search | PageTags.tsx |
| 2026-06-27 | **P4 — Graph/network visualization!** Interactive D3 force-directed graph of wiki pages and collections | a6321d4 |
| 2026-06-27 | **P3 — Dual editor / Markdown source toggle!** WYSIWYG/Markdown/Split mode tabs with conversion | 67fb0da |
| 2026-06-26 | **P2 — Notification center / watch pages!** STDB tables + reducers, NotificationBell component | 8adbd6d |
| 2026-06-26 | **P2 — Admin dashboard / wiki statistics!** SQL-powered stats cards and breakdowns | e613e67 |
| 2026-06-26 | **P2 — Activity feed / audit trail page!** Dedicated `/activity` route | bcaf7c2 |
| 2026-06-27 | **P4 — REST API OpenAPI docs!** 30+ Pydantic models + generated OpenAPI 3.0 spec | 5d1e74f |
