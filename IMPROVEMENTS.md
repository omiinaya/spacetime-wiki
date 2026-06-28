# SpacetimeWiki — Improvement Backlog

Living queue managed by the continuous-improvement cron. The cron reads this file,
cleans up completed items, researches new improvement opportunities, adds them,
and works the top pending item each tick.

---

## PENDING

| Priority | Item | Notes |
|----------|------|-------|
| P5 | **Add TypeScript tests for frontend components** | Only 7 test files exist in web/src/test/. Could add tests for PageEditor, Sidebar, Search, Auth components. |
| P5 | **Add STDB table indexes for query performance** | Hot paths query by collection_id, page_id, user_id, page_tag.name — linear scan currently. Use `#[index(name, fields = [...])]` on CollectionMember, Page, PageTag, Watch, Notification tables for sub-ms lookups. |
| P5 | **Audit unused frontend CSS + bundle size** | Tailwind generates all utilities. Could add `content: [...]` purge paths and run `tailwindcss -o output.css --minify` to measure. Also audit unused npm deps. |

---

## Recently Completed

| Date | Item | Commit |
|------|------|--------|
| 2026-06-28 | **P5 — Add Rust tests for extracted modules** — 70 total tests (58 new). All 11 extracted modules now have unit test coverage: helpers (31), users (4), pages (4), comments (3), tags (2), favorites (2), attachments (2), templates (2), api_keys (3), app_settings (2), collection_members (4), share_links (4). Extracted 6 pure helper functions. | _(current)_ |
| 2026-06-28 | **P4 — Extract Collection Members + Share Links from lib.rs** — 2 new modules (collection_members.rs 3 reducers, share_links.rs 5 reducers). lib.rs 2911→2755 lines. 11 modules extracted. | 8e1e99e8 |
| 2026-06-28 | **P4 — Extract Templates from lib.rs into `templates.rs`** — moved mark_as_template and create_from_template. lib.rs 3053→3014 lines. 7 modules extracted. | d6f350d5 |
| 2026-06-28 | **P4 — Extract Comments, Tags, Favorites, Attachments from lib.rs** — 4 new modules, lib.rs 3195→3053 lines. | 23aa41d8 |
| 2026-06-28 | **P4 — Extract Pages+RTL from lib.rs into `pages.rs`** — 17 page reducers. lib.rs 3508→3193. | ab180024 |
| 2026-06-28 | **P4 — Auto-generated schema-based row mappers** — `fromStdbRow()` + `typedQuery`/`typedQueryOne`. | _(current)_ |
| 2026-06-28 | **P5 — Add Rust unit tests** — 12 tests in helpers.rs | efd60f8a |
| 2026-06-28 | **P5 — Complete .env.example** — 88 lines documenting all env vars. | fe2ed807 |
| 2026-06-28 | **P4 — Split App.tsx layout from routes** — 6232→3268 lines (48% reduction). | 1e360f28 |
