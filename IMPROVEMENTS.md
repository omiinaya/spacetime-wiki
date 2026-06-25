# SpacetimeWiki — Improvement Backlog

Living queue managed by the continuous-improvement cron. The cron reads this file,
cleans up completed items, researches new improvement opportunities, adds them,
and works the top pending item each tick.

---

## Status: PENDING

### P2 — Page permissions UI
Add a dialog to set per-page user/group permissions (view/edit/admin). Currently page permissions can be managed via the PagePermissions component but it's not accessible from the page header.
Files: web/src/components/PagePermissions.tsx, web/src/pages/PageView.tsx
Difficulty: Medium
Est: 2h

---

## Recently Completed

| Date | Item | Commit |
|------|------|--------|
|| 2026-06-25 | P2 — Image gallery / lightbox with prev/next navigation | 17e7895 |
|| 2026-06-25 | P3 — Page analytics (views, trending) | d38be4a |
|| 2026-06-25 | P3 — Webhook management UI | (already implemented) |
|| 2026-06-25 | P1 — Virtual scroll / pagination for page lists | 2642781 |
|| 2026-06-25 | P1 — REST API layer for programmatic access | 2bac0e8 |
|| 2026-06-25 | P1 — Full-text search STDB reducer | 524ab77 |
|| 2026-06-25 | P3 — Rich embeds for 30+ providers | 524ab77 |
|| 2026-06-25 | P1 — Keyboard shortcuts reference/guide | 759f5e5 |
