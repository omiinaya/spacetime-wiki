# SpacetimeWiki — Improvement Backlog

Living queue managed by the continuous-improvement cron. The cron reads this file,
cleans up completed items, researches new improvement opportunities, adds them,
and works the top pending item each tick.

---

## Status: All ROADMAP features implemented. 3 P5 items pending (Docker Compose done).

| Priority | Item | Notes |
|----------|------|-------|
| P5 | Dependabot config | Automated dependency update PRs for npm + Cargo. |
| P5 | Pre-commit hooks (Husky + lint-staged) | Run tsc check, lint, and tests before every commit. |
| P5 | README.md with setup guide | Currently empty — missing getting-started docs, architecture overview, contribution guide. |

---

## Recently Completed

| Date | Item | Commit |
|------|------|--------|
|| 2026-06-28 | **P5 — Docker Compose for local dev!** `docker compose up` starts STDB + API server + frontend (nginx). Module publisher auto-builds/publishes on first run. Env-var config throughout. | Inline |
|| 2026-06-28 | **P4 — Playwright E2E test infra!** 24 E2E tests across 4 suites (home, navigation, pages, creation). Mock STDB HTTP + WebSocket, test against built app. Fixed missing page component imports in App.tsx (build-blocker). | Inline |
| 2026-06-28 | **P5 — CI/CD pipeline!** GitHub Actions workflow with TypeScript check + 89 tests + Rust build. Triggered on push/PR to master. | Inline |
| 2026-06-28 | **P5 — Accessibility (a11y) pass!** Installed vitest-axe, added axe-core scanning to all 5 test suites. ImageLightbox, AdminDashboard, AccessRequestPanel, PageTags, Toast — all pass with 0 violations. | 1a333816 |
| 2026-06-28 | **P5 — Fix Rust compiler warnings!** Removed dead TOTP/MFA functions + unused imports + unused params + unused `now`. Clean Rust build — 0 warnings, 0 errors. | c5897ebd |
| 2026-06-28 | **P5 — Comprehensive test coverage!** 4 new suites: ImageLightbox (25), AdminDashboard (8), AccessRequestPanel (12), PageTags (12). Total: 84 tests across 7 suites. | 3187a3bb |
| 2026-06-28 | **P5 — Admin avatar management!** `update_user_avatar` reducer, TypeScript binding, API call, admin panel UI with avatar preview and URL input per user. | 20c96f4e |
| 2026-06-27 | **P4 — Per-share branding!** Custom title override and logo URL per share link. | fbe7441e |
| 2026-06-27 | **P4 — Shared page viewer route!** `/shared/:token` route with full SharedPageView component. | 7156ce9d |
| 2026-06-27 | **P4 — Comments in image lightbox!** imageId attribute, comment sidebar in ImageLightbox. | 6f2417be |
| 2026-06-27 | **P4 — Request access to documents!** access_request table, approve/deny reducers. | a124ddd9 |
