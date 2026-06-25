# SpacetimeWiki — Improvement Backlog

Living queue managed by the continuous-improvement cron. The cron reads this file,
cleans up completed items, researches new improvement opportunities, adds them,
and works the top pending item each tick.

---

## Status: PENDING

### P2 — Page links autocomplete (search-as-you-type for internal links)
When typing `[[` or using the link toolbar, show a searchable popup of existing wiki pages to link to. Currently links must be pasted as full URLs. Leverage the `api.pages.search()` endpoint for instant results.
Files: web/src/extensions/, web/src/pages/PageEditor.tsx
Difficulty: Medium
Est: 1.5h

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

---

## Recently Completed

| Date | Item | Commit |
|------|------|--------|
| 2026-06-25 | P2 — Batch page operations in sidebar (multi-select, Cmd+click, batch archive/move/delete/tag) | 4828c80 |
| 2026-06-25 | P1 — Markdown import/export (sidebar import btn + page context menu export) | f92876f |
| 2026-06-25 | P2 — Image gallery / lightbox with prev/next navigation | 17e7895 |
| 2026-06-25 | P2 — Image drag handle for reorder in editor | (this session) |
| 2026-06-25 | P2 — Page permissions UI (wired in page header) | (already implemented) |
| 2026-06-25 | P3 — Page analytics (views, trending) | d38be4a |
| 2026-06-25 | P3 — Webhook management UI | (already implemented) |
| 2026-06-25 | P1 — Virtual scroll / pagination for page lists | 2642781 |
| 2026-06-25 | P2 — Drag-and-drop sidebar reorder (pages between collections) | (already implemented) |
| 2026-06-25 | P3 — Page print stylesheet (@media print CSS + print button) | (already implemented) |
| 2026-06-25 | P3 — Page export as standalone HTML (context menu + export dropdown) | (already implemented) |
| 2026-06-25 | P3 — Empty state / onboarding UI for new wikis (hero + quick actions + feature tour) | (this session) |
