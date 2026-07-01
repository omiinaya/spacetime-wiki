# SpacetimeWiki — Improvement Backlog

Living queue managed by the continuous-improvement cron. The cron reads this file,
cleans up completed items, researches new improvement opportunities, adds them,
and works the top pending item each tick.

---

## PENDING

| Priority | Item |
|----------|------|
| P3 | **Playwright E2E test suite** — Add `web/e2e/` test files: page CRUD flow, sidebar navigation, search, login/register, public sharing, collection management. Use existing Playwright config. |
| P3 | **Replace read-path SQL f-strings with parameterized queries in Python API** — ~50+ `SELECT` queries across `auth.py`, `collections.py`, `pages.py`, `search.py` use f-strings. Switch to parameterized queries with `cursor.execute(sql, params)` to eliminate remaining SQL injection surface. |
| P4 | **Tailwind v4 migration** — Update PostCSS config, CSS, and class references for Tailwind v4.x breaking changes (e.g., `@apply` rules, `@config`, new theme API). Check `npx @tailwindcss/upgrade` for automatic migration. |
| P4 | **Fix 44 Rust `dead_code` warnings** — The `tables.rs` file has 44 `default_*()` functions used only in tests. Add `#[cfg(test)]` guard or `#[allow(dead_code)]` annotation to silence these and maintain clean `cargo check` output. |

---

## Recently Completed

| Date | Item | Commit |
|------|------|--------|
| 2026-07-01 | **P3 — Make ~15 non-idempotent reducers safe on retry** — Added `if ctx.db.X().id().find(&id).is_none() { insert(...) }` guards on 8 reducers that had unconditional inserts: `create_collection` (CollectionMember insert), `create_group` (GroupMember insert), `create_invitation`, `create_notification`, `create_synced_block`, `create_db_base`, `create_db_column`, `create_db_row`, `add_synced_block_ref`. The remaining 7 listed in the original backlog (`create_page`, `add_attachment`, `add_tag`, `add_comment`, `create_share_link`, `create_webhook`, `create_api_key`, `add_collection_member`, `add_group_member`, `add_comment_reaction`) already had idempotency guards. `invite_user` and `add_page_permission` don't exist as reducers. All 201 Rust + 1194 frontend tests pass. | ed3bfcb0 |
| 2026-07-01 | **P3 — Replace SHA-256 password hashing with Argon2** — Migrated from `sha2::Sha256` to `argon2` crate in `helpers.rs`. Uses Argon2id PHC string format with random salt per call. `verify_password()` supports both new Argon2 and legacy SHA-256 hashes for backward compatibility. Updated `login_user`, `verify_mfa_backup_code`, and `verify_share_password`. 7 new Rust tests added. All 201 Rust + 1194 frontend tests pass. | 1176880c |
| 2026-07-01 | **P4 — Fix MFA backup code placeholder** — Changed `"XXXX XXXX"` to `"XXXX-XXXX"` in LoginView.tsx and 2 test references. 28/28 tests pass. | 5b6bbcb6 |
| 2026-07-01 | **P4 — Fix 3 flaky tests (SsoPanel + GroupsPanel)** — Fixed 3 pre-existing flakes: SsoPanel OIDC create, SsoPanel SAML create, and GroupsPanel create tests expected a generated `crypto.randomUUID()` ID as first API arg, but the components only use the ID locally and don't pass it to the API calls. Removed rogue `vi.unstubAllGlobals()` in OIDC delete test that was corrupting the crypto mock for subsequent tests. Full suite: 56 files, 1194 tests, 0 failures. | 9e14458c |
| 2026-07-01 | **P4 — Fix `tsc -b` build errors (18 total)** — Fixed all `tsc -b` errors. `tsc --noEmit` and `tsc -b` both clean. All 1191 tests pass. Rust `cargo check` clean. | 35ea2855 |
