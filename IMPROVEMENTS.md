# SpacetimeWiki — Improvement Backlog

Living queue managed by the continuous-improvement cron. The cron reads this file,
cleans up completed items, researches new improvement opportunities, adds them,
and works the top pending item each tick.

---

## Status: PENDING

### P2 — Inline comments with thread resolution
Add inline commenting on page content — select text to create a comment thread, reply in thread, resolve/close threads. The data model (comments table) and @mentions in comments already exist; need the inline selection UI and threaded display.
Files: web/src/pages/PageView.tsx, web/src/components/, server/spacetimedb/src/lib.rs
Difficulty: Medium
Est: 2h

### P2 — Public sharing dialog UI
Build a dedicated share dialog that uses the existing `share_links` table infrastructure. Add a "Share" button in PageView action bar, dialog with copy-link, optional password protection, expiration TTL, and list of active share links with revoke.
Files: web/src/App.tsx, web/src/pages/PageView.tsx, server/spacetimedb/src/lib.rs
Difficulty: Small
Est: 45min

### P2 — Content permalinks (ID-based, survive renames)
Add stable content permalink infrastructure — a `/permalink/<id>#<anchor>` route that redirects to the canonical `/page/<id>` even if the page is renamed. Ensures links from external sources or bookmarks never break. The HeadingWithId extension already provides anchor IDs; this adds a dedicated permalink route and URL resolution.
Files: web/src/App.tsx (Routes), web/src/pages/PageView.tsx
Difficulty: Small
Est: 30min

### P2 — Wiki import (Notion/Confluence)
Add import wizards for Notion (Markdown+ZIP export) and Confluence (HTML/XML export). Parse the exported file structure and create pages preserving hierarchy, content, and metadata. Reuses the existing Markdown import pipeline for Notion exports.
Files: web/src/App.tsx, web/src/components/
Difficulty: Medium
Est: 1.5h

---

## Recently Completed

| Date | Item | Commit |
|------|------|--------|
| 2026-06-26 | P2 — Configurable trash retention period (AppSetting table, Admin panel tab, purge_expired_trash reducer) | <current> |
| 2026-06-26 | P2 — Page duplication from sidebar context menu | fb2cc15 |
| 2026-06-26 | P3 — Permanent image upload (paste/drag-and-drop to server storage with attachment:// URL scheme, size limits, and auto-resolution) | 077ecf3 |
| 2026-06-26 | P1 — Table toolbar with row/column operations (insert/delete rows/cols, merge/split cells) | 0bea2e9 |
| 2026-06-26 | P2 — Responsive sidebar swipe gestures, backdrop blur, and smooth drawer animation | e928ff8 |
| 2026-06-26 | P3 — @Mentions in comments (MentionInput component with user autocomplete) | 2b77429 |
| 2026-06-26 | P1 — Full parent-page hierarchy breadcrumbs | faac220 |
| 2026-06-26 | P3 — Auto-save drafts to localStorage with recovery banner | 8fdc2fd |
| 2026-06-26 | P3 — Auto-anchor IDs on headings with deep-link support | a469213 |
