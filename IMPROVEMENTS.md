# SpacetimeWiki — Improvement Backlog

Living queue managed by the continuous-improvement cron. The cron reads this file,
cleans up completed items, researches new improvement opportunities, adds them,
and works the top pending item each tick.

---

## Status: P5 Rust compiler warnings fixed (4 errors + 1 warning eliminated). Build clean. Next: P5 Accessibility (a11y) pass.

| Priority | Item | Notes |
|----------|------|-------|
| P5 | Accessibility (a11y) pass | Add aria labels, keyboard nav improvements, focus management, screen reader support across all components. |
| P5 | GitHub Actions CI/CD | Automated test run, TypeScript check, Rust build on push/PR. |
| P4 | E2E test infra (Playwright) | Integration tests for critical paths: auth flow, page CRUD, search, sharing. |

---

## Recently Completed

| Date | Item | Commit |
|------|------|--------|
| 2026-06-28 | **P5 — Fix Rust compiler warnings!** Removed duplicate `now_ms`/`make_id`/`hash_password` helpers, implemented `verify_totp_code` (HMAC-SHA1 TOTP per RFC 6238), fixed unused `now` variable. Build now compiles cleanly with 0 errors and 0 warnings. | (working tree) |
| 2026-06-28 | **P5 — Comprehensive test coverage!** 4 new suites: ImageLightbox (25), AdminDashboard (8), AccessRequestPanel (12), PageTags (12). Total: 84 tests across 7 suites. | 3187a3bb |
| 2026-06-28 | **P5 — Admin avatar management!** `update_user_avatar` reducer, TypeScript binding, API call, admin panel UI with avatar preview and URL input per user. | 20c96f4e |
| 2026-06-27 | **P4 — Per-share branding!** Custom title override and logo URL per share link. | fbe7441e |
| 2026-06-27 | **P4 — Shared page viewer route!** `/shared/:token` route with full SharedPageView component. | 7156ce9d |
| 2026-06-27 | **P4 — Comments in image lightbox!** imageId attribute, comment sidebar in ImageLightbox. | 6f2417be |
| 2026-06-27 | **P4 — Request access to documents!** access_request table, approve/deny reducers. | a124ddd9 |
| 2026-06-27 | **P4 — Consolidate to spacetimedb SDK!** Installed `spacetimedb` npm package v2.6.0. | 31727812 |
| 2026-06-27 | **P3 — STDB Rust crate upgrade!** `spacetimedb =2.4.0` → `=2.6.0`. | 5b1a4279 |
