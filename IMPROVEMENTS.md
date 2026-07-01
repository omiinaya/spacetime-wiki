# SpacetimeWiki — Improvement Backlog

Living queue managed by the continuous-improvement cron. The cron reads this file,
cleans up completed items, researches new improvement opportunities, adds them,
and works the top pending item each tick.

---

## PENDING

| Priority | Item |
|----------|------|
| P4 | **Fix `tsc -b` build errors (138 total)** — Exclude `src/test/` from `tsconfig.app.json` to resolve 81 vitest-axe `toHaveNoViolations` errors + `afterEach`/`beforeAll` globals. Then fix remaining ~35 real type errors in production code: `GraphView.tsx` (useEffect return type), `SidebarTree.tsx` (JSX namespace), `AdminPanels.tsx` (toast callback), `Page.tsx` (revision `created_by`), `Collection` (missing `children`), STDB `RowBuilder` insert args, mock assignments in tests, etc. |
| P4 | **Backup code placeholder "XXXX XXXX" → proper MFA backup code label** — Replace placeholder text in `LoginView.tsx` (line 194) and test files with appropriate label (e.g. "Backup code" or "XXXX-XXXX"). |

---

## Recently Completed

| Date | Item | Commit |
|------|------|--------|
| 2026-06-30 | **P5 — npm dependency updates — eslint@10, vite@8.1.2, autoprefixer@10.5.2, i18next@26.3.4, i18next-browser-languagedetector@8.2.1, globals@17, react-refresh-plugin@0.5.3** — Upgraded eslint 9→10 (compatible config), react-hooks 5→7, @eslint/js 9→10, vite 8.1.0→8.1.2, autoprefixer 10.5.0→10.5.2, i18next 26.3.2→26.3.4, i18next-browser-languagedetector 8.0.4→8.2.1, globals 15→17, eslint-plugin-react-refresh 0.4.26→0.5.3. --fix cleanup. All 1175 tests pass, tsc clean, 0 vulns. | 47dfb957 |
| 2026-06-30 | **P4 — npm audit fix — `npm audit fix` → 0 vulnerabilities** — Verified: all packages clean, no vulnerabilities. | — |
| 2026-06-30 | **P4 — Unit tests for ActivityView.tsx** — 16 tests: page structure, ActivityFeed integration (limit 200, events, loading/empty/error), navigation (Back to home, page click, collection click), a11y in 4 states. All 16 pass. Suite now 1147/1147. | ab46dd35 |
| 2026-06-30 | **P4 — Unit tests for LoginView.tsx** — 20 tests: login/register forms, SSO buttons (OIDC/SAML/OAuth/LDAP/Google/Passkey), login flow, MFA code + backup codes, error handling, loading states. All 20 pass. | 13e3e6c9 |
| 2026-06-30 | **P4 — TypeScript tests for SharedPageView** — 13 tests: loading, not found, expired, password prompt, branding, error handling, a11y. Suite now 1111/1111. | 44c79a0e |
| 2026-06-30 | **P4 — TypeScript tests for SlugView, FavoritesView, HomeView** — 29 tests. Suite now 1098/1098. | 5b26585c |
| 2026-06-30 | **P4 — TypeScript tests for PermalinkRedirect.tsx** — 7 tests covering loading, redirect, error, hash anchor, missing param, and a11y. Suite now 1069/1069. | e249b90d |
| 2026-06-30 | **P5 — Rust unit tests for tables.rs** — 40 tests: 36 table struct construction/validation tests + 4 edge case assertions. Full suite 198/198 clean. | *new* |
| 2026-06-30 | **P5 — Rust unit tests for lib.rs** — 27 tests. Full suite 198/198 clean. | *new* |
| 2026-06-30 | **P5 — Rust unit tests for sso.rs** — 22 tests + 5 validation helpers. | c6624ae4 |
