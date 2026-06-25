# SpacetimeWiki — Improvement Backlog

Living queue managed by the continuous-improvement cron. The cron reads this file,
cleans up completed items, researches new improvement opportunities, adds them,
and works the top pending item each tick.

---

## Status: PENDING

### P3 — Permanent image upload (paste/drag-and-drop to server storage)
Currently pasted and dropped images create blob:// URLs that only work for the current session and break on page reload. Replace with actual upload to server storage, returning a permanent URL stored in the attachment table. Add image URL validation and size limits.
Files: web/src/pages/PageEditor.tsx, server/spacetimedb/src/lib.rs
Difficulty: Medium
Est: 2h

### P1 — Table toolbar with row/column operations (insert/delete rows/cols, merge/split cells)
The Tiptap table extension is imported but there's no floating toolbar UI for table operations (addRowBefore, addRowAfter, deleteRow, addColumnBefore, addColumnAfter, deleteColumn, mergeCells, splitCell). Users currently have no way to modify tables after insertion.
Files: web/src/pages/PageEditor.tsx
Difficulty: Medium
Est: 1h

### P2 — Page duplication from sidebar context menu and editor
The `api.pages.duplicate` reducer and API method exist but there's no UI to trigger duplication. Add a "Duplicate" option to the page context menu in the sidebar and a "Duplicate page" button in the editor toolbar/cog menu.
Files: web/src/App.tsx (context menu), web/src/pages/PageView.tsx (action bar)
Difficulty: Small
Est: 45min

### P2 — Configurable trash retention period
Add a trash retention setting (in Admin panel) that auto-purges deleted pages older than N days. Currently empty trash deletes everything at once with no configurable window. This adds a safety net for accidental deletions.
Files: server/spacetimedb/src/lib.rs, web/src/App.tsx, web/src/lib/api.ts
Difficulty: Medium
Est: 1h

---

## Recently Completed

| Date | Item | Commit |
|------|------|--------|
| 2026-06-26 | P2 — Responsive sidebar swipe gestures, backdrop blur, and smooth drawer animation | e928ff8 |
| 2026-06-26 | P3 — @Mentions in comments (MentionInput component with user autocomplete) | 2b77429 |
| 2026-06-26 | P1 — Full parent-page hierarchy breadcrumbs | faac220 |
| 2026-06-26 | P3 — Auto-save drafts to localStorage with recovery banner | 8fdc2fd |
| 2026-06-26 | P3 — Auto-anchor IDs on headings with deep-link support | a469213 |
| 2026-06-25 | P1 — Floating formatting toolbar (Tiptap BubbleMenu with Underline) | 2aa081c |
| 2026-06-25 | P2 — Page links autocomplete (search-as-you-type with [[ trigger) | 66e15f7 |
| 2026-06-25 | P2 — Batch page operations in sidebar (multi-select, Cmd+click, batch archive/move/delete/tag) | 4828c80 |
| 2026-06-25 | P2 — Notification system (toast for real-time events: page updates, connection state, import/export, batch ops, CRUD) | 9fffe1d |
