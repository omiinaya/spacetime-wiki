# SpacetimeWiki — Improvement Backlog

Living queue managed by the continuous-improvement cron. The cron reads this file,
cleans up completed items, researches new improvement opportunities, adds them,
and works the top pending item each tick.

---

## Status: PENDING

### P1 — REST API for programmatic access (STDB-based HTTP API with API key auth)
Build a proper REST API layer on top of STDB's HTTP interface that exposes page CRUD, search, collections, tags, and attachments via authenticated API endpoints using the existing `api_key` table infrastructure. Enables external integrations, MCP support, and programmatic wiki management. Uses API key auth (Bearer token) with scoped permissions.
Files: server/spacetimedb/src/lib.rs (new reducers), web/src/components/, web/src/lib/api.ts
Difficulty: Medium
Est: 2h

### P1 — File attachments browser/media manager
Enhance the existing attachment upload UI (paste/drag-drop/image upload) with a dedicated media browser dialog. Grid view of uploaded images/files with search, preview, filename display, size, and copy-link. Drag-drop zone for uploads. Replace the current inline list in PageView with a proper component.
Files: web/src/components/ (new MediaManager component), web/src/pages/PageView.tsx
Difficulty: Medium
Est: 1.5h

### P2 — Inline comments with thread resolution
Add inline commenting on page content — select text to create a comment thread, reply in thread, resolve/close threads. The data model (comments table) and @mentions in comments already exist; need the inline selection UI and threaded display.
Files: web/src/pages/PageView.tsx, web/src/components/, server/spacetimedb/src/lib.rs
Difficulty: Medium
Est: 2h

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
| 2026-06-26 | P2 — Public sharing dialog UI (dedicated share dialog in PageView with password, TTL, copy URL, revoke) | 0dac9cd |
| 2026-06-26 | P2 — Page duplication from sidebar context menu | fb2cc15 |
| 2026-06-26 | P3 — Permanent image upload (paste/drag-and-drop to server storage with attachment:// URL scheme, size limits, and auto-resolution) | 077ecf3 |
| 2026-06-26 | P1 — Table toolbar with row/column operations (insert/delete rows/cols, merge/split cells) | 0bea2e9 |
| 2026-06-26 | P2 — Responsive sidebar swipe gestures, backdrop blur, and smooth drawer animation | e928ff8 |
| 2026-06-26 | P3 — @Mentions in comments (MentionInput component with user autocomplete) | 2b77429 |
| 2026-06-26 | P1 — Full parent-page hierarchy breadcrumbs | faac220 |
| 2026-06-26 | P3 — Auto-save drafts to localStorage with recovery banner | 8fdc2fd |
| 2026-06-26 | P3 — Auto-anchor IDs on headings with deep-link support | a469213 |
