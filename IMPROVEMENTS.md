# SpacetimeWiki — Improvement Backlog

Living queue managed by the continuous-improvement cron. The cron reads this file,
cleans up completed items, researches new improvement opportunities, adds them,
and works the top pending item each tick.

---

## PENDING

| 2026-06-30 | **P4 — Unit tests for SlugView.tsx** — Simple slug-to-id redirect page (21 lines). Test loading, error, and navigate scenarios. |
| 2026-06-30 | **P4 — Unit tests for FavoritesView.tsx** — Favorites listing page (111 lines). Test loading state, empty state, and populated state with grouped by collection. |
| 2026-06-30 | **P4 — Unit tests for HomeView.tsx** — Landing page (192 lines). Test empty welcome view, populated recent pages, trending, import MD flow. |
| 2026-06-30 | **P4 — Unit tests for SharedPageView.tsx** — Public share link viewer (236 lines). Test error, expiry, password prompt, page view, branding header. |
| 2026-06-30 | **P4 — Unit tests for LoginView.tsx** — Auth page with email/password, MFA, SSO buttons, OAuth/SAML callbacks. |
| 2026-06-30 | **P4 — Unit tests for ActivityView.tsx** — Activity feed page. |
| 2026-06-30 | **P4 — npm audit fix — `npm audit fix` to address reported vulnerabilities** |
| 2026-06-30 | **P5 — npm dependency updates — update outdated deps (eslint, vite, tailwindcss, i18next, etc.)** |

---

## Recently Completed

| Date | Item | Commit |
|------|------|--------|
| 2026-06-30 | **P4 — TypeScript tests for PermalinkRedirect.tsx** — 7 tests covering loading, redirect, error, hash anchor, missing param, and a11y. Suite now 1069/1069. | e249b90d |
| 2026-06-30 | **P5 — Rust unit tests for tables.rs** — 40 tests: 36 table struct construction/validation tests + 4 edge case assertions. Full suite 198/198 clean. | *new* |
| 2026-06-30 | **P5 — Rust unit tests for lib.rs** — 27 tests. Full suite 198/198 clean. | *new* |
| 2026-06-30 | **P5 — Rust unit tests for sso.rs** — 22 tests + 5 validation helpers. | c6624ae4 |
| 2026-06-30 | **P5 — TypeScript tests for 6 more Tiptap extensions** — 40 tests. | 8f27ff97 |
| 2026-06-30 | **P5 — TypeScript tests for lib/tiptap-helpers.ts** — 40 tests. | 34381e54 |
| 2026-06-30 | **P5 — TypeScript tests for lib/ utility modules (5 files)** — 91 tests. | 668d0966 |
| 2026-06-30 | **P5 — TypeScript tests for admin components (15 files)** — 136 tests. | 89fc9502 |
| 2026-06-29 | **P4 — TypeScript tests for PageView.tsx** — 38 tests, 5 a11y fixes. | 16ea81cb |
| 2026-06-29 | **P1 — PageView.tsx StarterKit crash** — Import StarterKit. | 873614dd |
