# SpacetimeWiki — Improvement Backlog

Living queue managed by the continuous-improvement cron. The cron reads this file,
cleans up completed items, researches new improvement opportunities, adds them,
and works the top pending item each tick.

---

## PENDING

| Priority | Item |
|----------|------|
| P3 | **Make ~15 non-idempotent reducers safe on retry** — `create_page`, `add_attachment`, `add_tag`, `add_comment`, `add_reaction`, `create_collection`, `create_group`, `create_from_template`, `create_share_link`, `create_webhook`, `create_api_key`, `add_collection_member`, `add_group_member`, `invite_user`, `add_page_permission` — use `if !exists(...) { insert(...) }` pattern to avoid panicking on duplicate primary key from retries. |
| P3 | **Replace SHA-256 password hashing with Argon2** — Migrate from `sha2::Sha256` to `argon2` crate in `helpers.rs`. Requires schema migration: convert stored `password_hash` format, add version tag for forward compatibility. |
| P3 | **Playwright E2E test suite** — Add `web/e2e/` test files: page CRUD flow, sidebar navigation, search, login/register, public sharing, collection management. Use existing Playwright config. |
| P3 | **Replace read-path SQL f-strings with parameterized queries in Python API** — ~50+ `SELECT` queries across `auth.py`, `collections.py`, `pages.py`, `search.py` use f-strings. Switch to parameterized queries with `cursor.execute(sql, params)` to eliminate remaining SQL injection surface. |

---

## Recently Completed

| Date | Item | Commit |
|------|------|--------|
| 2026-07-01 | **P4 — Fix MFA backup code placeholder** — Changed `"XXXX XXXX"` to `"XXXX-XXXX"` in LoginView.tsx and 2 test references. 28/28 tests pass. | 5b6bbcb6 |
| 2026-07-01 | **P4 — Fix 3 flaky tests (SsoPanel + GroupsPanel)** — Fixed 3 pre-existing flakes: SsoPanel OIDC create, SsoPanel SAML create, and GroupsPanel create tests expected a generated `crypto.randomUUID()` ID as first API arg, but the components only use the ID locally and don't pass it to the API calls. Removed rogue `vi.unstubAllGlobals()` in OIDC delete test that was corrupting the crypto mock for subsequent tests. Full suite: 56 files, 1194 tests, 0 failures. | 9e14458c |
| 2026-07-01 | **P4 — Fix `tsc -b` build errors (18 total)** — Fixed all `tsc -b` errors: (1) `client.ts` schema param widened from `object & Record<string, unknown>` to `object` (RowBuilder from module_bindings doesn't satisfy `Record<string, unknown>`) — 7 errors. (2) `Transclusion.tsx` JSX namespace → `React.ElementType` — 3 errors. (3) `PageEditor.tsx` removed Typography.configure({...true}) — Tiptap v3.27 deprecated boolean config — 7 errors. (4) `PageView.tsx` removed unused `@ts-expect-error` — 1 error. `tsc --noEmit` and `tsc -b` both clean. All 1191 tests pass. Rust `cargo check` clean. | 35ea2855 |
