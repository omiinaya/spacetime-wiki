# SpacetimeWiki — Improvement Backlog

Living queue managed by the continuous-improvement cron. The cron reads this file,
cleans up completed items, researches new improvement opportunities, adds them,
and works the top pending item each tick.

---

## PENDING

| Priority | Item | Notes |
|----------|------|-------|
| P4 | **Further extract lib.rs into domain modules** — 3195 lines remain in lib.rs (was 3508) across ~31 sections | **Extracted Pages + RTL section** (315 lines → `pages.rs`). 17 sections moved (pages, users). Next targets: Comments, Tags, Favorites, Attachments (each 20-80 lines). |

---

## Recently Completed

| Date | Item | Commit |
|------|------|--------|
| 2026-06-28 | **P4 — Extract Pages+RTL from lib.rs into `pages.rs`** — moved 17 page reducers (create/update/delete/duplicate/move/reorder/set_icon/color/width/pinned/direction, empty_trash, restore) + RTL direction into dedicated module. Removed 315 lines from lib.rs (3508→3193). Build clean. | _(current)_ |
| 2026-06-28 | **P4 — Auto-generated schema-based row mappers!** Built `fromStdbRow()` utility that introspects STDB module_bindings schemas at runtime to auto-map positional rows to typed objects. Added `typedQuery`/`typedQueryOne` helpers. Converted `pages.ts` (8 query calls) to eliminate manual `mapPage`/`mapRevision`. 0 TS errors, 89 tests pass. | _(current)_ |
| 2026-06-28 | **P5 — Add Rust unit tests!** 12 tests: hash_password, base32_decode, verify_totp_code, and more added to helpers.rs | efd60f8a |
| 2026-06-28 | **P5 — Complete .env.example!** 88 lines documenting all env vars across all 4 services (STDB, API server, frontend, module publisher) | fe2ed807 |
| 2026-06-28 | **P4 — Split App.tsx layout from routes!** 6232→3268 lines (48% reduction). 10 admin panels + tiptap helpers extracted. Duplicate login page components removed. | 1e360f28 |
| 2026-06-28 | **P4 — Split lib.rs into Rust modules!** 4555-line lib.rs → tables.rs (50 structs) + helpers.rs (10 functions) + lib.rs (reducers). 0 errors, 0 warnings. | 718b231a |
| 2026-06-28 | **P4 — Split api.ts into 21 domain modules!** 1874-line api.ts → types/mappers/client/pages/collections/users/auth/groups/comments/shares/tags/attachments/webhooks/search/subscriptions/transclusions/audit/access-requests/collaboration/settings/index. Barrel re-export preserves all imports. | 862bfe2d |
