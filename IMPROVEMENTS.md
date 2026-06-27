# SpacetimeWiki — Improvement Backlog

Living queue managed by the continuous-improvement cron. The cron reads this file,
cleans up completed items, researches new improvement opportunities, adds them,
and works the top pending item each tick.

---

## Status: All P0-P3 items complete, all P2 research items implemented. P4 SDK consolidation done. P4 access requests done. P4 image lightbox comments done. P4 shared page viewer route done. Entering maintenance/optimization phase.

| Priority | Item | Notes |
|----------|------|-------|
| P4 | Per-share branding | Outline v1.7.1: override title/logo on individual public shares. `/shared/:token` route now exists — ready to build. |
| P5 | Admin avatar management | Outline v1.8.1: allow admins to change user avatars from admin panel. User table already has `avatar_url` field; needs admin UI + reducer. |
| P5 | Comprehensive test coverage | Only 2 test suites (18 tests). Add tests for: admin dashboard, share dialog, access requests, lightbox comments, page view, collections. |
| P4 | Image paste error handling | Graceful recovery when pasting images from clipboard fails (network/format errors). |

---

## Recently Completed

| Date | Item | Commit |
|------|------|--------|
| 2026-06-27 | **P4 — Shared page viewer route!** `/shared/:token` route with full SharedPageView component: token-based lookup, expiry check, password prompt, visit tracking. Lazy-loaded. | 7156ce9d |
| 2026-06-27 | **P4 — Comments in image lightbox!** ImageEnhanced extension generates unique `imageId` per image. ImageLightbox comment sidebar filters by `text_anchor = 'image:<imageId>'`. | 6f2417be |
| 2026-06-27 | **P4 — Request access to documents!** `access_request` STDB table with approve/deny reducers, admin "Access Requests" tab, frontend "Request Access" button. | a124ddd9 |
| 2026-06-27 | **P4 — Consolidate to spacetimedb SDK!** Installed `spacetimedb` npm package v2.6.0, generated TypeScript module bindings (48 tables, 140+ reducers). | 31727812 |
| 2026-06-27 | **P3 — STDB Rust crate upgrade!** `spacetimedb =2.4.0` → `=2.6.0`. Clean compile, no breaking changes. | 5b1a4279 |
| 2026-06-27 | **P3 — Unit test infrastructure!** Vitest + React Testing Library + jsdom. 18 tests across 2 suites. | 0caf22dd |
| 2026-06-27 | **P3 — Code splitting / lazy loading** | d2107a3f |
| 2026-06-27 | **P2 — Markdown import (.md files)!** Frontend import button in sidebar, server-side `/api/v1/import/markdown` endpoint. | inline |
| 2026-06-27 | **P2 — Recycle bin + retention!** Trash dialog, restore/permanent-delete/empty-trash, `trash_retention_days` setting. | inline |
| 2026-06-27 | **P2 — Public share dialog polish!** Password, TTL, copy, revoke, listing. | inline |
