# SpacetimeWiki — Improvement Backlog

Living queue managed by the continuous-improvement cron. The cron reads this file,
cleans up completed items, researches new improvement opportunities, adds them,
and works the top pending item each tick.

---

## PENDING

| Priority | Item | Notes |
|----------|------|-------|
| P4 | **Extract remaining lib.rs sections into domain modules** | Next targets: Templates (40L), API Keys (55L), App Settings (50L), Collection Members (50L), Share Links (108L). 26 sections remain in 3053-line lib.rs. |
| P5 | **Add Rust tests for extracted modules** | 0 tests in comments/tags/favorites/attachments/pages/users modules. Only helpers.rs has 12 tests. Add basic unit tests for each module's reducer logic. |
| P5 | **Add TypeScript tests for frontend components** | Only 7 test files exist in web/src/test/. Could add tests for PageEditor, Sidebar, Search, Auth components. |

---

## Recently Completed

| Date | Item | Commit |
|------|------|--------|
| 2026-06-28 | **P4 — Extract Comments, Tags, Favorites, Attachments from lib.rs into domain modules** — 4 new modules (comments.rs 84L, tags.rs 24L, favorites.rs 24L, attachments.rs 29L). lib.rs 3195→3053 lines. 21/31 sections now extracted. | 23aa41d8 |
| 2026-06-28 | **P4 — Extract Pages+RTL from lib.rs into `pages.rs`** — moved 17 page reducers. Removed 315 lines from lib.rs (3508→3193). | ab180024 |
| 2026-06-28 | **P4 — Auto-generated schema-based row mappers!** `fromStdbRow()` + `typedQuery`/`typedQueryOne`. | _(current)_ |
| 2026-06-28 | **P5 — Add Rust unit tests!** 12 tests in helpers.rs | efd60f8a |
| 2026-06-28 | **P5 — Complete .env.example!** 88 lines documenting all env vars. | fe2ed807 |
| 2026-06-28 | **P4 — Split App.tsx layout from routes!** 6232→3268 lines (48% reduction). | 1e360f28 |
| 2026-06-28 | **P4 — Split api.ts into 21 domain modules!** 1874-line api.ts → domain modules. | 862bfe2d |
