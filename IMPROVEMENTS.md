# SpacetimeWiki — Improvement Backlog

Living queue managed by the continuous-improvement cron. The cron reads this file,
cleans up completed items, researches new improvement opportunities, adds them,
and works the top pending item each tick.

---

## Status: PENDING

### P1 — Real-time STDB subscriptions for live page updates
Replace periodic SQL polling with SpacetimeDB's built-in `db.subscribe()` mechanism for true real-time updates across browser tabs and users. Pages, collections, comments, and sidebar data update instantly when any user makes a change, without manual refresh.
🟡 In progress: SubscriptionManager + useSubscription hook + WebSocket connection manager with auto-reconnect created (web/src/lib/subscriptions.ts). Remaining: integrate into App.tsx to replace polling-based loadData(), add subscription for per-table updates (pages, collections, comments).
Files: web/src/lib/api.ts → add subscribe helpers, web/src/App.tsx → integrate subscriptions
Difficulty: Medium
Est: 3h (2h remaining)

### P2 — Batch page operations in sidebar
Allow selecting multiple pages in the sidebar via checkbox or Cmd+click for bulk operations: move to collection, delete, archive, add tag. Currently each page must be handled individually.
Files: web/src/App.tsx, web/src/pages/PageView.tsx
Difficulty: Medium
Est: 2h

### P3 — Empty state / onboarding UI for new wikis
Show a helpful getting-started welcome screen when the wiki has no pages. Include quick-action buttons (Create first page, Import from Markdown, Browse keyboard shortcuts) and a brief feature tour. Similar to Outline's empty state.
Files: web/src/App.tsx
Difficulty: Small
Est: 1h

### P3 — Page print stylesheet
Add a print CSS stylesheet and a print button in the page header. Clean, readable printed output with proper page breaks, font sizing, and hidden UI chrome (sidebar, toolbar, comments).
Files: web/src/index.css, web/src/pages/PageView.tsx
Difficulty: Small
Est: 1h

### P3 — Page export as standalone HTML
Add an "Export as HTML" action to the page context menu. Generates a self-contained HTML file with inline CSS that preserves the page content, formatting, and images. Useful for sharing and archiving.
Files: web/src/App.tsx, web/src/pages/PageView.tsx
Difficulty: Small
Est: 1h

---

## Recently Completed

| Date | Item | Commit |
|------|------|--------|
| 2026-06-25 | P2 — Image gallery / lightbox with prev/next navigation | 17e7895 |
| 2026-06-25 | P2 — Image drag handle for reorder in editor | (this session) |
| 2026-06-25 | P2 — Page permissions UI (wired in page header) | (already implemented) |
| 2026-06-25 | P3 — Page analytics (views, trending) | d38be4a |
| 2026-06-25 | P3 — Webhook management UI | (already implemented) |
| 2026-06-25 | P1 — Virtual scroll / pagination for page lists | 2642781 |
| 2026-06-25 | P1 — REST API layer for programmatic access | 2bac0e8 |
| 2026-06-25 | P1 — Full-text search STDB reducer | 524ab77 |
| 2026-06-25 | P3 — Rich embeds for 30+ providers | 524ab77 |
| 2026-06-25 | P1 — Keyboard shortcuts reference/guide | 759f5e5 |
| 2026-06-25 | P0 — Dark mode toggle (light ↔ dark theme) | 3856a17 |
| 2026-06-25 | P2 — Link preview/unfurl on hover | 8061723 |
| 2026-06-25 | P2 — Emoji picker (`:` colon syntax in editor) | f078ee0 (partial) |
| 2026-06-25 | P3 — SAML 2.0 SSO | f078ee0 |
| 2026-06-25 | P2 — Page templates (template picker dialog) | bde9d16 |
| 2026-06-25 | P3 — Multiple editor modes (Markdown ↔ WYSIWYG toggle) | 67fb0da |
| 2026-06-24 | P3 — PlantUML diagrams | b84a9df |
| 2026-06-24 | P3 — ZIP export (pages + assets) | dca4696 |
