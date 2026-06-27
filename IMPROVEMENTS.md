# SpacetimeWiki — Improvement Backlog

Living queue managed by the continuous-improvement cron. The cron reads this file,
cleans up completed items, researches new improvement opportunities, adds them,
and works the top pending item each tick.

---

## Status: P5 admin avatar management done. 2 P4-P5 items remaining.

| Priority | Item | Notes |
|----------|------|-------|
| P5 | Comprehensive test coverage | Only 2 test suites (18 tests). Add tests for: admin dashboard, share dialog, access requests, lightbox comments, page view, collections. |
| P4 | Image paste error handling | Graceful recovery when pasting images from clipboard fails (network/format errors). |

---

## Recently Completed

| Date | Item | Commit |
|------|------|--------|
| 2026-06-28 | **P5 — Admin avatar management!** `update_user_avatar` reducer, TypeScript binding, API call, admin panel UI with avatar preview and URL input per user. | 20c96f4e |
| 2026-06-27 | **P4 — Per-share branding!** Custom title override and logo URL per share link. | fbe7441e |
| 2026-06-27 | **P4 — Shared page viewer route!** `/shared/:token` route with full SharedPageView component. | 7156ce9d |
| 2026-06-27 | **P4 — Comments in image lightbox!** imageId attribute, comment sidebar in ImageLightbox. | 6f2417be |
| 2026-06-27 | **P4 — Request access to documents!** access_request table, approve/deny reducers. | a124ddd9 |
| 2026-06-27 | **P4 — Consolidate to spacetimedb SDK!** Installed `spacetimedb` npm package v2.6.0. | 31727812 |
| 2026-06-27 | **P3 — STDB Rust crate upgrade!** `spacetimedb =2.4.0` → `=2.6.0`. | 5b1a4279 |
| 2026-06-27 | **P3 — Unit test infrastructure!** Vitest + React Testing Library + jsdom. 18 tests. | 0caf22dd |
| 2026-06-27 | **P3 — Code splitting / lazy loading** | d2107a3f |
| 2026-06-27 | **P2 — Markdown import (.md files)!** Frontend import button, sidebar server endpoint. | inline |
