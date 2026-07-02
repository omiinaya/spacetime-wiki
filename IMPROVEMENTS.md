# SpacetimeWiki — Improvement Backlog

Living queue managed by the continuous-improvement cron. The cron reads this file,
cleans up completed items, researches new improvement opportunities, adds them,
and works the top pending item each tick.

---

## PENDING

| Priority | Item |
|----------|------|
| P3 | **Playwright E2E test suite — expand coverage** — 7 spec files exist (home, navigation, collections, search, pages, page-editor, page-view). Add missing flows: login/register, public sharing, collection management CRUD, template operations, image upload, comment/create, move-to-trash. |
| P4 | **Tailwind v4 migration** — Update PostCSS config, CSS, and class references for Tailwind v4.x breaking changes (e.g., `@apply` rules, `@config`, new theme API). Currently on Tailwind v3.4.19 with `tailwind.config.js`. Check `npx @tailwindcss/upgrade` for automatic migration. |
| P5 | **New: MCP server tests** — Add unit tests for the MCP server's 6 tools and resource handlers. Currently untested. |
| P5 | **New: CI pipeline — add Rust test step** — CI currently runs tsc + vitest + cargo check but doesn't run Rust unit tests (201 tests). Add `cargo test` to `.github/workflows/ci.yml`. |
| P4 | **Frontend: reduce `any` types in Tiptap code** — 150+ `any` type usages remain in `helpers.ts`, `PageEditor.tsx`, `PageView.tsx`, `Transclusion.tsx` for ProseMirror document nodes. Add proper type definitions for the editor schema. |
| P4 | **Rust reducer integration tests** — Only ~20% of reducer logic is covered by unit tests. Add tests that exercise reducers against a live STDB instance. |
| P5 | **Rust: reduce repetitive struct-construction tests** — ~2,000 lines of test code are repetitive `default_*()` tests. Consolidate into parameterized tests. |

---

## Recently Completed

| Date | Item | Commit |
|------|------|--------|
| 2026-07-01 | **P3-SEC — SQL injection surface audit — MCP server had 8 f-string SQL queries** — Found and fixed 8 SQL injection vectors in the MCP server's `stdb_client.py` that used only `replace("'", "''")` escaping (bypassable). Converted all to parameterized `?` placeholders with `_safe_quote()` that escapes both `'` and `\`. API server was already clean (0 f-string SQL queries). All SQL injection surfaces now eliminated across both servers. | e3e4895b |
| 2026-07-01 | **P4 — Fix 44 Rust `dead_code` warnings** — Added `#[cfg(test)]` guard to all 44 `default_*()` functions used only in tests. `cargo check` now clean (0 warnings, 0 errors). All 201 Rust + 1194 frontend tests pass. | 0f716e40 |
| 2026-07-01 | **P3 — Fix remaining SQL f-string in `auth.py`** — Replaced `f\"SELECT ... key_prefix = '{prefix}'\"` with parameterized `\"SELECT ... key_prefix = ?\"` query. Also cleaned up cosmetic f-string in `pages.py`. All SQL queries now use `?` placeholders through `_build_safe_sql()`. | 0f716e40 |
| 2026-07-01 | **P3 — Make ~15 non-idempotent reducers safe on retry** — Added `if ctx.db.X().id().find(&id).is_none() { insert(...) }` guards on 8 reducers that had unconditional inserts. All 201 Rust + 1194 frontend tests pass. | ed3bfcb0 |
| 2026-07-01 | **P3 — Replace SHA-256 password hashing with Argon2** — Migrated from `sha2::Sha256` to `argon2` crate in `helpers.rs`. Uses Argon2id PHC string format. 7 new Rust tests added. All 201 Rust + 1194 frontend tests pass. | 1176880c |
| 2026-07-01 | **P4 — Fix MFA backup code placeholder** — Changed `"XXXX XXXX"` to `"XXXX-XXXX"` in LoginView.tsx and 2 test references. 28/28 tests pass. | 5b6bbcb6 |
