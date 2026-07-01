# SpacetimeWiki — Improvement Backlog

Living queue managed by the continuous-improvement cron. The cron reads this file,
cleans up completed items, researches new improvement opportunities, adds them,
and works the top pending item each tick.

---

## PENDING

|| 2026-06-30 | **P5 — npm dependency updates — update outdated deps (eslint, vite, tailwindcss, i18next, etc.)** |

---

## Recently Completed

|| Date | Item | Commit |
||------|------|--------|
|| 2026-06-30 | **P4 — npm audit fix — `npm audit fix` → 0 vulnerabilities** — Verified: all packages clean, no vulnerabilities. | — |
|| 2026-06-30 | **P4 — Unit tests for ActivityView.tsx** — 16 tests: page structure, ActivityFeed integration (limit 200, events, loading/empty/error), navigation (Back to home, page click, collection click), a11y in 4 states. All 16 pass. Suite now 1147/1147. | ab46dd35 |
|| 2026-06-30 | **P4 — Unit tests for LoginView.tsx** — 20 tests: login/register forms, SSO buttons (OIDC/SAML/OAuth/LDAP/Google/Passkey), login flow, MFA code + backup codes, error handling, loading states. All 20 pass. | 13e3e6c9 |
|| 2026-06-30 | **P4 — TypeScript tests for SharedPageView** — 13 tests: loading, not found, expired, password prompt, branding, error handling, a11y. Suite now 1111/1111. | 44c79a0e |
|| 2026-06-30 | **P4 — TypeScript tests for SlugView, FavoritesView, HomeView** — 29 tests. Suite now 1098/1098. | 5b26585c |
|| 2026-06-30 | **P4 — TypeScript tests for PermalinkRedirect.tsx** — 7 tests covering loading, redirect, error, hash anchor, missing param, and a11y. Suite now 1069/1069. | e249b90d |
|| 2026-06-30 | **P5 — Rust unit tests for tables.rs** — 40 tests: 36 table struct construction/validation tests + 4 edge case assertions. Full suite 198/198 clean. | *new* |
|| 2026-06-30 | **P5 — Rust unit tests for lib.rs** — 27 tests. Full suite 198/198 clean. | *new* |
|| 2026-06-30 | **P5 — Rust unit tests for sso.rs** — 22 tests + 5 validation helpers. | c6624ae4 |
