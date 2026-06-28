# SpacetimeWiki — Improvement Backlog

Living queue managed by the continuous-improvement cron. The cron reads this file,
cleans up completed items, researches new improvement opportunities, adds them,
and works the top pending item each tick.

---

## PENDING

| Priority | Item | Notes |
|----------|------|-------|
| P4 | **Split lib.rs into Rust modules** — 142KB single file, extract tables/reducers/auth/media into separate `*.rs` files | Refactor for maintainability |
| P4 | **Split api.ts into domain modules** — 86KB file with all SQL mappers, extract by entity (page, collection, auth, etc.) | Refactor for maintainability |
| P4 | **Split App.tsx layout from routes** — 318KB/6232-line file, extract sidebar, header, admin panels into separate files | Code organization |
| P4 | **Replace manual SQL mappers with STDB SDK typed bindings** — api.ts has 50+ manual row mappers that duplicate module_bindings | Tech debt reduction |
| P4 | **Complete .env.example** — document all env vars used across frontend, api-server, and module publisher | Docs gap |
| P4 | **Add Rust module unit tests** — add `#[test]` functions for reducer logic | Test coverage |
| P5 | **Dependency audit** — check for major-version upgrades (Tailwind 4, TypeScript 6, ESLint 10, etc.) | Maintenance |

---

## Recently Completed

| Date | Item | Commit |
|------|------|--------|
| 2026-06-27 | **P5 — Fix hardcoded STDB config in subscriptions.ts** — replaced hardcoded `192.168.1.10:3001` and hex DB_ID with `import.meta.env.VITE_STDB_HOST`/`VITE_STDB_DB` | cd7a17d1 |
| 2026-06-27 | **P5 — Fix pre-commit hook ENOENT** — lint-staged commands use `./node_modules/.bin/{tsc,vitest}` instead of `npx` which wasn't available in hook environment | f68b5a4f |
| 2026-06-28 | **P5 — README.md with setup guide!** Full project README with architecture, features, project structure, dev commands, env vars, API reference, testing guide, and contribution guide. | Inline |
| 2026-06-28 | **P5 — Pre-commit hooks!** Husky + lint-staged runs tsc + vitest --changed on staged TS files, plus cargo check on Rust files. Fast pre-commit gate. | Inline |
| 2026-06-28 | **P5 — Dependabot config!** Tracks npm (web + api-server), Cargo, pip, Docker (3 images), GitHub Actions. Weekly schedule, grouped updates for React/Vite/Tiptap/testing. | Inline |
| 2026-06-28 | **P5 — Docker Compose for local dev!** `docker compose up` starts STDB + API server + frontend (nginx). Module publisher auto-builds/publishes on first run. Env-var config throughout. | Inline |
| 2026-06-28 | **P4 — Playwright E2E test infra!** 24 E2E tests across 4 suites (home, navigation, pages, creation). Mock STDB HTTP + WebSocket, test against built app. Fixed missing page component imports in App.tsx. | Inline |
| 2026-06-28 | **P5 — CI/CD pipeline!** GitHub Actions workflow with TypeScript check + 89 tests + Rust build. Triggered on push/PR to master. | Inline |
| 2026-06-28 | **P5 — Accessibility (a11y) pass!** Installed vitest-axe, added axe-core scanning to all 5 test suites. ImageLightbox, AdminDashboard, AccessRequestPanel, PageTags, Toast — all pass with 0 violations. | 1a333816 |
| 2026-06-28 | **P5 — Fix Rust compiler warnings!** Removed dead TOTP/MFA functions + unused imports + unused params + unused `now`. Clean Rust build — 0 warnings, 0 errors. | c5897ebd |
