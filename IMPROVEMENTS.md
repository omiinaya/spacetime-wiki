# SpacetimeWiki — Improvement Backlog

Living queue managed by the continuous-improvement cron. The cron reads this file,
cleans up completed items, researches new improvement opportunities, adds them,
and works the top pending item each tick.

---

## Status: PENDING

### P3 — Webhook management UI
Add a panel in the admin settings to create, edit, test, and delete webhooks. Currently webhooks can only be managed via STDB SQL.
Files: web/src/components/WebhookManager.tsx
Difficulty: Medium
Est: 2h

### P3 — Page analytics (views, edits, trending)
Track and display page view counts, edit frequency, and trending pages. Store view events via a lightweight reducer.
Files: server/spacetimedb/src/lib.rs, web/src/components/
Difficulty: Medium
Est: 3h

---

## Recently Completed

| Date | Item | Commit |
|------|------|--------|
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
