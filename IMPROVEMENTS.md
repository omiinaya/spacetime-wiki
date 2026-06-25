# SpacetimeWiki — Improvement Backlog

Living queue managed by the continuous-improvement cron. The cron reads this file,
cleans up completed items, researches new improvement opportunities, adds them,
and works the top pending item each tick.

---

## Status: PENDING

### P3 — JSON export for pages
Add "Export as JSON" option to the page header export dropdown. Exports the full ProseMirror doc JSON plus metadata (title, slug, icon, tags, collection). Useful for programmatic access and backups.
Files: web/src/pages/PageView.tsx, web/src/App.tsx
Difficulty: Small
Est: 0.5h

### P3 — Auto-save drafts to localStorage
Periodically auto-save unsaved editor content to localStorage. On page load, if a draft exists, show a "Recover unsaved changes" banner. Prevents data loss on accidental navigation or tab close.
Files: web/src/pages/PageEditor.tsx
Difficulty: Small
Est: 1h

### P1 — Breadcrumbs with full parent-page hierarchy
Current breadcrumbs show Collection → Page. Enhance to walk the parent_page_id chain to show the full hierarchy: Collection → Grandparent → Parent → Current page. Each segment clickable to navigate. Use recursion/map for parent lookup.
Files: web/src/pages/PageView.tsx
Difficulty: Medium
Est: 1h

### P2 — Responsive sidebar swipe gestures & drawer animation
Improve the mobile sidebar experience with smooth slide-in/out transitions, swipe-to-close gesture (touchstart/touchmove/touchend), and backdrop blur. Currently uses a basic overlay.
Files: web/src/App.tsx
Difficulty: Small
Est: 1h

---

## Recently Completed

| Date | Item | Commit |
|------|------|--------|
| 2026-06-25 | P2 — Page links autocomplete (search-as-you-type with [[ trigger) | 66e15f7 |
| 2026-06-25 | P2 — Batch page operations in sidebar (multi-select, Cmd+click, batch archive/move/delete/tag) | 4828c80 |
| 2026-06-25 | P1 — Markdown import/export (sidebar import btn + page context menu export) | f92876f |
| 2026-06-25 | P2 — Image gallery / lightbox with prev/next navigation | 17e7895 |
| 2026-06-25 | P2 — Image drag handle for reorder in editor | (this session) |
| 2026-06-25 | P2 — Page permissions UI (wired in page header) | (already implemented) |
| 2026-06-25 | P3 — Page analytics (views, trending) | d38be4a |
| 2026-06-25 | P3 — Webhook management UI | (already implemented) |
| 2026-06-25 | P1 — Virtual scroll / pagination for page lists | 2642781 |
