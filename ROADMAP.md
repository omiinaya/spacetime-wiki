# SpacetimeWiki — Comprehensive ROADMAP

> Generated 2026-07-01 by codebase audit. Every item verified against actual source.

**Repository:** https://github.com/omiinaya/spacetime-wiki
**Tech Stack:** React 19 + TypeScript 5.9 / Vite 8 / Tailwind 4 / FastAPI / SpacetimeDB 2.6 (Rust WASM)
**Stats:** 140 reducers, 50 tables, 201 Rust tests, 56 frontend test files (1,194 tests), 14 E2E specs (79 cases), 51 API endpoints, 6 MCP tools

---

## 🔴 Critical (P0-P1) — Security, stability, blockers

### P0 — 50/50 tables are PUBLIC — secrets exposed via STDB SQL
- **File:** `server/spacetimedb/src/tables.rs` (all 50 tables)
- **Issue:** Every table is declared `#[table(public)]`, including tables that store cryptographic secrets. Anyone who can connect to STDB port 3001 (no auth required) can `SELECT *` read:
  - `mfa_method.totp_secret` — raw TOTP seeds (complete 2FA bypass)
  - `oauth_user.access_token` + `refresh_token` — live OAuth tokens for Slack/Discord/GitHub
  - `ldap_provider.bind_password` — LDAP admin password plaintext
  - `user.password_hash` — Argon2 password hashes (offline cracking)
  - `oidc_provider.client_secret`, `oauth_provider.client_secret` — OAuth client secrets
  - `webhook.secret` — webhook signing secrets
  - Full wiki page content (`page`, `page_revision`) — defeats entire permission system
- **See:** `PRIVACY-AUDIT.md` in `server/spacetimedb/` for full table-by-table analysis
- **Fix:** Split sensitive fields into private tables, add read-access reducers, or firewall STDB port 3001 from direct external access. At minimum: make `mfa_method`, `oauth_user`, `ldap_provider`, `user` (sensitive fields), `oidc_provider`, `oauth_provider`, `webhook` tables private.
- **Effort:** 8-16 hours (architectural change — existing API server uses `SELECT *` SQL queries that don't work with private STDB tables; needs reducer-based read access)

### P0 — CORS config is spec-invalid
- **File:** `server/api-server/main.py:70`
- **Issue:** `allow_origins=["*"]` + `allow_credentials=True` — browsers reject this per CORS spec
- **Fix:** Replace with explicit origins list (e.g., `["http://localhost:5184", "https://wiki.example.com"]`)
- **Effort:** 30 min

### P1 — MCP server has zero error handling
- **File:** `server/mcp-server/server.py`
- **Issue:** No `try/except` anywhere in the MCP server. Network calls to STDB (`sql_query`, `list_collections`, etc.) can raise exceptions that crash the MCP stdio session.
- **Fix:** Wrap all tool handlers in try/except, return `TextContent(f"Error: {e}")` instead of crashing
- **Effort:** 1 hour

### P1 — No pagination on API list endpoints
- **Files:** `routers/collections.py`, `routers/pages.py`, `routers/search.py`
- **Issue:** All list endpoints return ALL results with no `page`/`limit`/`offset`/`cursor` parameters. As wiki grows, this will become unusable.
- **Fix:** Add `limit` (default 50) and `offset` (default 0) query params to all GET list endpoints
- **Effort:** 2-3 hours

### P1 — No Content Security Policy headers
- **File:** `web/Dockerfile` (nginx config), `server/api-server/main.py`
- **Issue:** No CSP headers set. Mermaid, KaTeX, PlantUML all render dynamic content — potential XSS vector.
- **Fix:** Add `Content-Security-Policy` header in nginx/FastAPI middleware with proper allowlist for Mermaid/KaTeX CDNs
- **Effort:** 1-2 hours

### P1 — No CSRF protection on API
- **File:** `server/api-server/main.py`
- **Issue:** API accepts all POST/PUT/DELETE requests without CSRF token validation
- **Fix:** Add CSRF token middleware for cookie-based auth flows; already protected for API-key flows
- **Effort:** 2 hours

---

## 🟡 High Priority (P2) — Feature gaps, quality, testing

### P2 — E2E tests not in CI
- **Files:** `.github/workflows/ci.yml`, `web/playwright.config.ts`
- **Issues:**
  - No E2E test run in CI pipeline
  - No `webServer` config in Playwright — requires manually running dev server
  - No API mocking — E2E tests require full STDB + API server stack
  - Workers limited to 1 (slow — 102 tests × ~8s each)
  - Chromium only (no Firefox/WebKit)
  - No retries configured
- **Fix:** Add E2E job to CI with docker-compose services, add `webServer` to Playwright config, add retries (2 in CI, 1 locally)
- **Effort:** 4-6 hours

### P2 — Rust CI doesn't run tests or clippy
- **File:** `.github/workflows/ci.yml` (Rust job)
- **Issue:** Rust job runs `cargo build` + `cargo check` only — no `cargo test` (201 tests skipped), no `cargo clippy` (4 warnings missed)
- **Fix:** Add `cargo test --lib` and `cargo clippy -- -D warnings` steps
- **Effort:** 1 hour

### P2 — 5 bare `except Exception:` blocks
- **Files:**
  - `routers/imports.py:178,263`
  - `routers/scim.py:46`
  - `routers/oauth.py:226`
  - `routers/ldap_auth.py:211`
- **Issue:** Five bare `except Exception:` blocks silently swallow errors with no logging
- **Fix:** Add proper logging with `logger.exception()`, or narrow to specific exception types
- **Effort:** 1 hour

### P2 — No deploy/release workflow
- **File:** `.github/workflows/`
- **Issue:** Only CI workflow exists. No Docker image build, no push to registry, no deploy step.
- **Fix:** Create a `deploy.yml` workflow that builds Docker images and deploys them
- **Effort:** 3 hours

### P2 — API server Dockerfile has no multi-stage build
- **File:** `server/api-server/Dockerfile`
- **Issue:** Installs `gcc` as build dependency but doesn't use multi-stage — adds ~150MB
- **Fix:** Switch to multi-stage: builder stage for pip compile, final slim image
- **Effort:** 1 hour

### P2 — Auto-star on startup is unusual — ✅ DONE
- **File:** `server/api-server/main.py`, `server/api-server/config.py`
- **Fix:** Moved behind `AUTO_STAR_REPO` config flag (default: `false`). Disabled by default.
- **Effort:** 30 min

### P2 — E2E tests failing on fresh DB
- **Files:** All `web/e2e/*.spec.ts`
- **Issue:** 14 E2E spec files (102 test cases) fail on a fresh database because they expect pre-existing data (users, pages, collections). No seed/test fixtures.
- **Fix:** Either (a) add Playwright API mocking, (b) add a seed-data setup step via `page.evaluate()` calling STDB reducers, or (c) create test data through the API before running tests
- **Effort:** 4-6 hours

---

## 🟡 Medium Priority (P3) — Code quality, UX, i18n, DX

### P3 — 273 `any` type usages
- **Scope:** 273 `any` occurrences across ~170 hand-written files (excl. tests and `module_bindings/`)
- **Hotspots:** `lib/` (API client), Tiptap extensions (ProseMirror nodes), several components
- **Fix:** Systematic `any` → `unknown` + proper type definitions per module
- **Effort:** 6-10 hours (largest individual effort item)

### P3 — App.tsx refactoring (~2,000 lines)
- **File:** `web/src/App.tsx` (1,983 lines)
- **Issue:** Single file houses router config, sidebar layout, global state management, data fetching, keyboard shortcuts, authentication flow, notifications
- **Fix:** Split into:
  - `routing.tsx` — route definitions
  - `Layout.tsx` — sidebar + main content shell
  - `AppProviders.tsx` — data/STDB providers
  - `hooks/useAuth.ts` — auth state
  - `hooks/useNotifications.ts` — notification state
- **Effort:** 4-6 hours

### P3 — Add pagination to MCP server list tools
- **Files:** `server/mcp-server/server.py`, `server/mcp-server/stdb_client.py`
- **Issue:** `wiki_list_pages` and `wiki_search` have no `limit`/`offset` params
- **Fix:** Add `limit` (default 50) and `offset` (default 0) to list/search MCP tools
- **Effort:** 1 hour

### P3 — i18n missing `ja.json` and `zh.json`
- **File:** `web/src/i18n/locales/`
- **Issue:** Japanese and Chinese languages are listed in the English locale but no translation files exist. When selected, the app falls back to English silently.
- **Fix:** Either add the locale files (large effort) or remove the options from the language switcher
- **Effort:** 30 min (remove options) or 8+ hours (add translations via LLM batch)

### P3 — Dead dependency: `@vitejs/plugin-react-swc`
- **File:** `web/package.json` (devDependencies)
- **Issue:** SWC plugin is installed but `vite.config.ts` uses `@vitejs/plugin-react` instead — SWC is unused waste (~2MB)
- **Fix:** `npm uninstall @vitejs/plugin-react-swc`
- **Effort:** 5 min

### P3 — KaTeX chunk duplication in build
- **File:** `web/vite.config.ts`
- **Issue:** Build produces two 129KB KaTeX chunks instead of one shared chunk
- **Fix:** Add manual chunks config in `rollupOptions.output.manualChunks` for katex
- **Effort:** 30 min

### P3 — Optimize `vite.config.ts` config
- **File:** `web/vite.config.ts`
- **Issue:** `optimizeDeps.include` references `highlight.js`/`lowlight` — unnecessary on Vite 8 (auto pre-bundling)
- **Fix:** Remove the stale entries
- **Effort:** 5 min

### P3 — 4 unused test glob imports (`use super::*`)
- **Files:** 12 files (all test modules use `use super::*` unnecessarily)
- **Issue:** Unused warnings in `cargo test` output — 12 occurrences
- **Fix:** Remove the unused `use super::*` lines from test modules
- **Effort:** 20 min

### P3 — 2 unused variable assignments
- **Files:** `src/comments.rs:74`, `src/api_keys.rs:64`
- **Issue:** `let mut resolved = false` then `resolved = true` without reading the initial value
- **Fix:** Remove the initial declaration or restructure
- **Effort:** 10 min

### P3 — 5 dead-code `default_*()` functions
- **File:** `src/tables.rs` (lines 1777, 1818, 1886, 1942, 1966)
- **Issue:** `default_*()` test helpers under `#[cfg(test)]` that are never called
- **Fix:** Remove the 5 unused `default_*()` functions
- **Effort:** 5 min

### P3 — `.expect()` panic in production code
- **File:** `src/helpers.rs:26`
- **Issue:** `hash_password()` uses `.expect("Argon2 hashing should not fail")` — if Argon2 ever fails, the reducer panics instead of returning an error
- **Fix:** Convert `.expect()` to `?` operator and return `Result<(), String>` error
- **Effort:** 15 min

### P3 — 4 clippy warnings
- **Files:** `src/users.rs:55,78`, `src/lib.rs:1296,1415`
- **Issue:** `map_or(false, |u| ...)` patterns that can be simplified to `.is_some_and(|u| ...)`
- **Fix:** Apply clippy auto-fix
- **Effort:** 10 min

### P3 — 3 `act()` warnings in frontend tests
- **File:** `web/src/test/PageView.test.tsx`
- **Issue:** React `act()` warnings in PageView component tests — state updates happen outside `act()` wrappers
- **Fix:** Wrap state-changing assertions in `act()` or use `waitFor()`
- **Effort:** 30 min

---

## 🟢 Low Priority (P4-P5) — Nice-to-haves, DX polish

### P4 — Add `cargo doc` generation to CI
- **File:** `.github/workflows/ci.yml`
- **Issue:** No documentation generation for the Rust module
- **Fix:** Add `cargo doc --no-deps` step to CI
- **Effort:** 1 hour

### P4 — Add WebKit and Firefox to E2E tests
- **File:** `web/playwright.config.ts`
- **Issue:** Only Chromium tested in E2E
- **Fix:** Add `projects` for Firefox and WebKit
- **Effort:** 2 hours (may need browser-specific fixes)

### P4 — Add E2E test retries for CI
- **File:** `web/playwright.config.ts`
- **Issue:** No retries configured — flaky tests fail the pipeline
- **Fix:** Set `retries: 2` in CI, `retries: 1` locally
- **Effort:** 10 min

### P4 — Rust integration tests (live STDB)
- **Scope:** New `tests/` directory
- **Issue:** All 201 Rust tests are unit tests — none test reducers against a live SpacetimeDB instance
- **Fix:** Create `tests/integration/` with tests that spin up STDB in-process, call reducers via API
- **Effort:** 8-12 hours (large feature)

### P4 — E2E test for comment/create flow
- **File:** `web/e2e/comments.spec.ts`
- **Issue:** Comments spec file exists but needs to be verified (may be empty or failing)
- **Fix:** Verify and fix the comments E2E test
- **Effort:** 2 hours

### P4 — E2E test for image upload flow
- **File:** `web/e2e/image-upload.spec.ts`
- **Issue:** Image upload spec exists but likely fails without running attachment service
- **Fix:** Mock the upload endpoint or ensure service is running
- **Effort:** 2 hours

### P4 — E2E test for trash/restore flow
- **File:** `web/e2e/trash.spec.ts`
- **Issue:** Trash spec exists but likely requires seeded data
- **Fix:** Add seed data step before trash tests
- **Effort:** 1 hour

### P4 — E2E test for public sharing flow
- **File:** `web/e2e/public-sharing.spec.ts`
- **Issue:** Public sharing spec exists but likely requires authenticated state
- **Fix:** Add auth cookie setup before tests
- **Effort:** 1 hour

### P4 — E2E test for template operations
- **File:** `web/e2e/templates.spec.ts`
- **Issue:** Templates spec exists but requires pre-existing template data
- **Fix:** Seed template data via API before tests
- **Effort:** 1 hour

### P4 — E2E test for login/register flow
- **File:** `web/e2e/login.spec.ts`
- **Issue:** Login spec exists
- **Fix:** Verify and ensure auth cookies persist between tests
- **Effort:** 1 hour

### P4 — Add `X-Content-Type-Options: nosniff` header
- **File:** `server/api-server/main.py` or nginx config
- **Issue:** MIME-sniffing not prevented
- **Fix:** Add security headers middleware
- **Effort:** 15 min

### P4 — Add `X-Frame-Options: DENY` header
- **File:** `server/api-server/main.py` or nginx config
- **Issue:** Clickjacking not prevented
- **Fix:** Add to security headers middleware
- **Effort:** 5 min

### P4 — Review nginx config completeness
- **File:** `web/Dockerfile`
- **Issue:** Inline nginx config may be missing cache headers, gzip, security headers
- **Fix:** Extract to a dedicated `nginx.conf` file, add proper configuration
- **Effort:** 1 hour

### P4 — Remove `optimizeDeps.include` for highlight.js/lowlight
- **File:** `web/vite.config.ts`
- **Issue:** Vite 8 auto-optimizes these — stale config
- **Effort:** 5 min

### P4 — Reduce App.tsx 3 `act()` warnings
- **File:** `web/src/test/PageView.test.tsx`
- **Issue:** React testing warning noise
- **Effort:** 30 min

### P5 — Add Docker build/push to CI
- **File:** `.github/workflows/ci.yml` (new job)
- **Issue:** No Docker image publishing flow
- **Fix:** Add `docker buildx` + push step
- **Effort:** 2 hours

### P5 — Add `cargo test` to pre-commit hook
- **File:** `.husky/pre-commit`
- **Issue:** Pre-commit only runs `cargo check`, not `cargo test` — 201 Rust tests skipped
- **Fix:** Add `cd server/spacetimedb && cargo test 2>&1 | tail -5` to pre-commit
- **Effort:** 10 min

### P5 — WASM `__getrandom_custom` is a deterministic stub
- **File:** `src/lib.rs:8-18`
- **Issue:** The WASM `__getrandom_custom` function uses a trivial deterministic RNG (`i * 0x9e + 0x37`). While only used for build-time linking (not runtime), a CSPRNG fallback would be more correct.
- **Fix:** Use a proper RNG seeded from WASM `Date.now()`, or document that this is build-only
- **Effort:** 1 hour (low priority since build-only)

### P5 — Remove stale `Cargo.lock` comment references
- **File:** `server/spacetimedb/Cargo.lock` (auto-generated, but check `.gitignore`)
- **Issue:** Verify `Cargo.lock` is tracked in git (should be for reproducible builds)
- **Effort:** 5 min

### P5 — Monorepo structure evaluation
- **Issue:** The project mixes Rust WASM, Python FastAPI, TypeScript React in one repo. As it grows, consider separate workspaces or a true monorepo config (turborepo/nx).
- **Effort:** Research (informational)

---

## 📊 Summary by Layer

| Layer | Files | LOC | Tests | Issues |
|-------|-------|-----|-------|--------|
| **Rust module** | 17 `.rs` | 7,290 | 201 (unit) | 4 clippy, 5 dead code, 1 unsafe, 1 expect panic, 12 unused imports |
| **API server** | 9 routes + 5 core `.py` | 3,360 | 0 | 5 bare excepts, no pagination, CORS broken, no CSP |
| **MCP server** | 3 `.py` | 561 | 0 | Zero error handling, no pagination |
| **Frontend** | ~170 hand-written `.ts/.tsx` | — | 56 files / 1,194 tests | 273 `any`, App.tsx 2k lines, KaTeX duplication, stale deps |
| **E2E** | 14 `.ts` | — | 102 test cases | Not in CI, 0 API mocking, fails on fresh DB |
| **Infra** | 4 Dockerfiles + compose | — | — | No deploy workflow, no multi-stage API build |

## 📊 Overall Stats

| Metric | Value | Status |
|--------|-------|--------|
| **Rust tests** | 201/201 ✅ | Passing |
| **Frontend tests** | 1,194/1,194 ✅ | Passing |
| **E2E test files** | 14 (102 tests) | ⚠️ Failing on fresh DB |
| **TypeScript errors** | 0 ✅ | Clean |
| **Security vulns** | 0 ✅ | Clean |
| **Clippy warnings** | 4 | 🟡 Need fix |
| **`any` usages** | 273 | 🔴 Systematic migration needed |
| **`console.log` in production** | 22 (all structured logging) | ✅ Acceptable |
| **TODO/FIXME markers** | 0 | ✅ Clean |
| **API endpoints** | 112 | Not paginated |
| **MCP tools** | 6 | No error handling |
| **i18n locales** | 4 (en, es, fr, de) | 2 more referenced but missing |
| **CI jobs** | 2 (Frontend + Rust partial) | Missing: E2E, Docker, deploy |

---

## 🎯 Recommended Sprint Plan

### Sprint 1 — Security & Stability (4-6 hours)
1. Fix CORS (`allow_origins`)
2. Add error handling to MCP server
3. Add CSP headers
4. Fix 5 bare `except Exception:` blocks
5. Add CSRF protection

### Sprint 2 — CI & Testing (6-8 hours)
1. Add E2E to CI with Playwright `webServer`
2. Add Rust test/clippy to CI
3. Fix E2E tests to work with fresh DB (seed data fixture)
4. Add retries to Playwright config

### Sprint 3 — API Quality (4-6 hours)
1. Add pagination to all list endpoints
2. Add pagination to MCP list tools
3. Move auto-star to config flag — ✅ DONE (behind `AUTO_STAR_REPO` env var, default `false`)
4. Fix API server Dockerfile multi-stage

### Sprint 4 — TypeScript Quality (8-10 hours)
1. Systematic `any` → `unknown` migration
2. Refactor App.tsx (~2,000 lines)
3. Remove stale deps (SWC plugin, optimizeDeps entries)
4. Fix KaTeX chunk duplication

### Sprint 5 — Rust Polish (2-3 hours)
1. Fix 4 clippy warnings
2. Fix 12 unused imports
3. Remove 5 dead-code `default_*()` functions
4. Fix `.expect()` panic
5. Fix 2 unused variable assignments

### Sprint 6 — Deployment & i18n (4 hours)
1. Add deploy/release GitHub workflow
2. Add/remove missing i18n locales
3. Extract nginx config to dedicated file
4. Add security headers middleware

---

*ROADMAP generated by comprehensive codebase audit on 2026-07-01. All items verified against actual source files.*
