# SpacetimeWiki — Improvement Backlog

Living queue managed by the continuous-improvement cron. The cron reads this file,
cleans up completed items, researches new improvement opportunities, adds them,
and works the top pending item each tick.

---

## Status: PENDING

### P1 — REST API layer for programmatic access
Add a lightweight REST API (using a separate HTTP server or STDB HTTP endpoints) providing CRUD for pages, collections, and search. Include API key authentication middleware and rate limiting.
Files: server/api-server/, web/src/lib/api.ts
Difficulty: Hard
Est: 4h

### P1 — Virtual scroll for long page lists
When a collection has 1000+ pages, the current list rendering is slow. Implement virtual scrolling or pagination for the page list/collection view.
Files: web/src/components/
Difficulty: Medium
Est: 2h

---

## Recently Completed

| Date | Item | Commit |
|------|------|--------|
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
