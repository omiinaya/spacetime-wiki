# SpacetimeWiki — Improvement Backlog

Living queue managed by the continuous-improvement cron. The cron reads this file,
cleans up completed items, researches new improvement opportunities, adds them,
and works the top pending item each tick.

---

## Status: P4 image paste error handling done. 9 new tests added (27 total). Added 4 new research items to backlog.

| Priority | Item | Notes |
|----------|------|-------|
| P5 | Comprehensive test coverage | 3 suites (27 tests). Still need tests for: admin dashboard, share dialog, access requests, lightbox comments, page view, collections. |
| P5 | Fix Rust compiler warnings | 7 warnings in `server/spacetimedb/src/lib.rs`: unused params (`external_id`, `provider_id`, `now`), dead functions (`totp`, `random_base32`, `now_ms_ts`). |
| P5 | Accessibility (a11y) pass | Add aria labels, keyboard nav improvements, focus management, screen reader support across all components. |
| P5 | GitHub Actions CI/CD | Automated test run, TypeScript check, Rust build on push/PR. |
| P4 | E2E test infra (Playwright) | Integration tests for critical paths: auth flow, page CRUD, search, sharing. |

---

## Recently Completed

| Date | Item | Commit |
|------|------|--------|
| 2026-06-28 | **P4 — Image paste error handling!** Toast notifications with categorized errors (size/type/network/server), retry action for upload failures, success confirmation. | 3187a3bb |
| 2026-06-28 | **P5 — Admin avatar management!** `update_user_avatar` reducer, TypeScript binding, API call, admin panel UI with avatar preview and URL input per user. | 20c96f4e |
| 2026-06-27 | **P4 — Per-share branding!** Custom title override and logo URL per share link. | fbe7441e |
| 2026-06-27 | **P4 — Shared page viewer route!** `/shared/:token` route with full SharedPageView component. | 7156ce9d |
| 2026-06-27 | **P4 — Comments in image lightbox!** imageId attribute, comment sidebar in ImageLightbox. | 6f2417be |
| 2026-06-27 | **P4 — Request access to documents!** access_request table, approve/deny reducers. | a124ddd9 |
| 2026-06-27 | **P4 — Consolidate to spacetimedb SDK!** Installed `spacetimedb` npm package v2.6.0. | 31727812 |
| 2026-06-27 | **P3 — STDB Rust crate upgrade!** `spacetimedb =2.4.0` → `=2.6.0`. | 5b1a4279 |
| 2026-06-27 | **P3 — Unit test infrastructure!** Vitest + React Testing Library + jsdom. 18 tests. | 0caf22dd |
