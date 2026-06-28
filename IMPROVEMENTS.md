# SpacetimeWiki — Improvement Backlog

Living queue managed by the continuous-improvement cron. The cron reads this file,
cleans up completed items, researches new improvement opportunities, adds them,
and works the top pending item each tick.

---

## PENDING

| Priority | Item | Notes |
|----------|------|-------|
| P4 | **Extract remaining lib.rs sections into domain modules** | ✅ API Keys done (3 reducers → api_keys.rs). Next targets: App Settings (50L), Collection Members (50L), Share Links (108L). 8 modules extracted, 2960 lines remain in lib.rs. |
| P5 | **Add Rust tests for extracted modules** | 0 tests in comments/tags/favorites/attachments/pages/users/templates modules. Only helpers.rs has 12 tests. Add basic unit tests for each module's reducer logic. |
| P5 | **Add TypeScript tests for frontend components** | Only 7 test files exist in web/src/test/. Could add tests for PageEditor, Sidebar, Search, Auth components. |

---

## Recently Completed

| Date | Item | Commit |
|------|------|--------|
| 2026-06-28 | **P4 — Extract Templates from lib.rs into `templates.rs`** — moved mark_as_template and create_from_template. lib.rs 3053→3014 lines. 7 modules extracted. | d6f350d5 |
| 2026-06-28 | **P4 — Extract Comments, Tags, Favorites, Attachments from lib.rs** — 4 new modules, lib.rs 3195→3053 lines. | 23aa41d8 |
| 2026-06-28 | **P4 — Extract Pages+RTL from lib.rs into `pages.rs`** — 17 page reducers. lib.rs 3508→3193. | ab180024 |
| 2026-06-28 | **P4 — Auto-generated schema-based row mappers** — `fromStdbRow()` + `typedQuery`/`typedQueryOne`. | _(current)_ |
| 2026-06-28 | **P5 — Add Rust unit tests** — 12 tests in helpers.rs | efd60f8a |
| 2026-06-28 | **P5 — Complete .env.example** — 88 lines documenting all env vars. | fe2ed807 |
| 2026-06-28 | **P4 — Split App.tsx layout from routes** — 6232→3268 lines (48% reduction). | 1e360f28 |
