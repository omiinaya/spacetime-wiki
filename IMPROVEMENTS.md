# SpacetimeWiki — Improvement Backlog

Living queue managed by the continuous-improvement cron. The cron reads this file,
cleans up completed items, researches new improvement opportunities, adds them,
and works the top pending item each tick.

---

## Status: PENDING

### P3 — @Mentions in comments
Extend the existing Mention extension (used for page links in editor) to also support user @mentions in the comments section. When typing @ in a comment, show a popup with user names/emails for autocomplete.
Files: web/src/pages/PageView.tsx, web/src/lib/api.ts
Difficulty: Small
Est: 1h

### P2 — Responsive sidebar swipe gestures & drawer animation
Improve the mobile sidebar experience with smooth slide-in/out transitions, swipe-to-close gesture (touchstart/touchmove/touchend), and backdrop blur. Currently uses a basic overlay.
Files: web/src/App.tsx
Difficulty: Small
Est: 1h

### P2 — Notification system (toast for real-time events)
Add a toast notification system for real-time events: page updates by other users, new comments, @mentions, and system notifications. Integrate with existing STDB subscriptions to show non-intrusive toasts when data changes.
Files: web/src/components/Toast.tsx (new), web/src/App.tsx
Difficulty: Medium
Est: 1.5h

### P3 — Permanent image upload (paste/drag-and-drop to server storage)
Currently pasted and dropped images create blob:// URLs that only work for the current session and break on page reload. Replace with actual upload to server storage, returning a permanent URL stored in the attachment table. Add image URL validation and size limits.
Files: web/src/pages/PageEditor.tsx, server/spacetimedb/src/lib.rs
Difficulty: Medium
Est: 2h

---

## Recently Completed

| Date | Item | Commit |
|------|------|--------|
| 2026-06-26 | P1 — Full parent-page hierarchy breadcrumbs | faac220 |
| 2026-06-26 | P3 — Auto-save drafts to localStorage with recovery banner | 8fdc2fd |
| 2026-06-25 | P1 — Floating formatting toolbar (Tiptap BubbleMenu with Underline) | 2aa081c |
| 2026-06-25 | P2 — Page links autocomplete (search-as-you-type with [[ trigger) | 66e15f7 |
| 2026-06-25 | P2 — Batch page operations in sidebar (multi-select, Cmd+click, batch archive/move/delete/tag) | 4828c80 |
| 2026-06-25 | P1 — Markdown import/export (sidebar import btn + page context menu export) | f92876f |
| 2026-06-25 | P2 — Image gallery / lightbox with prev/next navigation | 17e7895 |
| 2026-06-24 | P2 — Command palette (Cmd+K) | 29ae863 |
| 2026-06-24 | P2 — Page color accent UI | 9a55462 |
| 2026-06-26 | P3 — Auto-anchor IDs on headings with deep-link support | a469213 |
