# SpacetimeWiki — Improvement Backlog

Living queue managed by the continuous-improvement cron. The cron reads this file,
cleans up completed items, researches new improvement opportunities, adds them,
and works the top pending item each tick.

---

## PENDING

| Priority | Item |
|----------|------|
| P3-SEC | **SQL injection surface audit — verify no f-string SQL queries remain** — Fixed the last f-string SQL query in `auth.py` (key_prefix lookup). Now all SQL queries use `?` placeholders via `_build_safe_sql()`. Verify no other injection vectors remain in the Python API server. |
| P3 | **Playwright E2E test suite — expand coverage** — 7 spec files exist (home, navigation, collections, search, pages, page-editor, page-view). Add missing flows: login/register, public sharing, collection management CRUD, template operations, image upload, comment/create, move-to-trash. |
| P4 | **Tailwind v4 migration** — Update PostCSS config, CSS, and class references for Tailwind v4.x breaking changes (e.g., `@apply` rules, `@config`, new theme API). Currently on Tailwind v3.4.19 with `tailwind.config.js`. Check `npx @tailwindcss/upgrade` for automatic migration. |
| P5 | **New: MCP server tests** — Add unit tests for the MCP server's 6 tools and resource handlers. Currently untested. |
| P5 | **New: CI pipeline — add Rust test step** — CI currently runs tsc + vitest + cargo check but doesn't run Rust unit tests (201 tests). Add `cargo test` to `.github/workflows/ci.yml`. |

---

## Recently Completed

| Date | Item | Commit |
|------|------|--------|
| 2026-07-01 | **P4 — Fix 44 Rust `dead_code` warnings** — Added `#[cfg(test)]` guard to all 44 `default_*()` functions used only in tests. `cargo check` now clean (0 warnings, 0 errors). All 201 Rust + 1194 frontend tests pass. | 0f716e40 |
| 2026-07-01 | **P3 — Fix remaining SQL f-string in `auth.py`** — Replaced `f"SELECT ... key_prefix = '{prefix}'"` with parameterized `"SELECT ... key_prefix = ?"` query. Also cleaned up cosmetic f-string in `pages.py`. All SQL queries now use `?` placeholders through `_build_safe_sql()`. | 0f716e40 |
| 2026-07-01 | **P3 — Make ~15 non-idempotent reducers safe on retry** — Added `if ctx.db.X().id().find(&id).is_none() { insert(...) }` guards on 8 reducers that had unconditional inserts: `create_collection` (CollectionMember insert), `create_group` (GroupMember insert), `create_invitation`, `create_notification`, `create_synced_block`, `create_db_base`, `create_db_column`, `create_db_row`, `add_synced_block_ref`. The remaining 7 listed in the original backlog (`create_page`, `add_attachment`, `add_tag`, `add_comment`, `create_share_link`, `create_webhook`, `create_api_key`, `add_collection_member`, `add_group_member`, `add_comment_reaction`) already had idempotency guards. `invite_user` and `add_page_permission` don't exist as reducers. All 201 Rust + 1194 frontend tests pass. | ed3bfcb0 |
| 2026-07-01 | **P3 — Replace SHA-256 password hashing with Argon2** — Migrated from `sha2::Sha256` to `argon2` crate in `helpers.rs`. Uses Argon2id PHC string format with random salt per call. `verify_password()` supports both new Argon2 and legacy SHA-256 hashes for backward compatibility. Updated `login_user`, `verify_mfa_backup_code`, and `verify_share_password`. 7 new Rust tests added. All 201 Rust + 1194 frontend tests pass. | 1176880c |
| 2026-07-01 | **P4 — Fix MFA backup code placeholder** — Changed `"XXXX XXXX"` to `"XXXX-XXXX"` in LoginView.tsx and 2 test references. 28/28 tests pass. | 5b6bbcb6 |
