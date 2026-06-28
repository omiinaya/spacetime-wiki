# SpacetimeWiki — Improvement Backlog

Living queue managed by the continuous-improvement cron. The cron reads this file,
cleans up completed items, researches new improvement opportunities, adds them,
and works the top pending item each tick.

---

## PENDING

| Priority | Item | Notes |
|----------|------|-------|
| P4 | **Split App.tsx layout from routes** — extract sidebar, header, admin panels into separate files. **PROGRESS: 5/11 admin components extracted** (ApiKeySettings ✅, TrashSettings ✅, FeatureFlags ✅, BulkExport ✅, ScimSettings ✅). Remaining: PasskeySettings, MfaSettings, LdapSettings, OAuthSettings, InvitationSettings. | Code organization |
| P4 | **Replace manual SQL mappers with STDB SDK typed bindings** — api.ts has 50+ manual row mappers that duplicate module_bindings | Tech debt reduction |
| P4 | **Complete .env.example** — document all env vars used across frontend, api-server, and module publisher | Docs gap |
| P4 | **Add Rust module unit tests** — add `#[test]` functions for reducer logic | Test coverage |
| P5 | **Dependency audit** — check for major-version upgrades (Tailwind 4, TypeScript 6, ESLint 10, etc.) | Maintenance |
| P4 | **Further extract lib.rs into domain modules** — 3508 lines remain in lib.rs across ~30 sections; extract collections, pages, comments, tags, favorites, shares, API keys, templates, groups, SSO, analytics, collab, batch, AI, SCIM, passkeys, DB bases, invitations, synced blocks, MFA, notifications, access requests each into their own module | Refactor for maintainability |

---

## Recently Completed

| Date | Item | Commit |
|------|------|--------|
| 2026-06-28 | **P4 — Split lib.rs into Rust modules!** 4555-line lib.rs → tables.rs (50 structs) + helpers.rs (10 functions) + lib.rs (reducers). 0 errors, 0 warnings. | 718b231a |
| 2026-06-28 | **P4 — Split api.ts into 21 domain modules!** 1874-line api.ts → types/mappers/client/pages/collections/users/auth/groups/comments/shares/tags/attachments/webhooks/search/subscriptions/transclusions/audit/access-requests/collaboration/settings/index. Barrel re-export preserves all imports. | 862bfe2d |
| 2026-06-28 | **P5 — Fix Rust compiler warnings!** Removed dead TOTP/MFA functions + unused imports + unused params + unused `now`. Clean Rust build — 0 warnings, 0 errors. | c5897ebd |
| 2026-06-28 | **P5 — README.md with setup guide!** Full project README with architecture, features, project structure, dev commands, env vars, API reference, testing guide, and contribution guide. | Inline |
| 2026-06-28 | **P5 — Pre-commit hooks!** Husky + lint-staged runs tsc + vitest --changed on staged TS files, plus cargo check on Rust files. Fast pre-commit gate. | Inline |
| 2026-06-28 | **P5 — Dependabot config!** Tracks npm (web + api-server), Cargo, pip, Docker (3 images), GitHub Actions. Weekly schedule, grouped updates for React/Vite/Tiptap/testing. | Inline |
| 2026-06-28 | **P5 — Docker Compose for local dev!** `docker compose up` starts STDB + API server + frontend (nginx). Module publisher auto-builds/publishes on first run. Env-var config throughout. | Inline |
| 2026-06-28 | **P4 — Playwright E2E test infra!** 24 E2E tests across 4 suites (home, navigation, pages, creation). Mock STDB HTTP + WebSocket, test against built app. Fixed missing page component imports in App.tsx. | Inline |
| 2026-06-28 | **P5 — CI/CD pipeline!** GitHub Actions workflow with TypeScript check + 89 tests + Rust build. Triggered on push/PR to master. | Inline |
| 2026-06-28 | **P5 — Accessibility (a11y) pass!** Installed vitest-axe, added axe-core scanning to all 5 test suites. ImageLightbox, AdminDashboard, AccessRequestPanel, PageTags, Toast — all pass with 0 violations. | 1a333816 |
