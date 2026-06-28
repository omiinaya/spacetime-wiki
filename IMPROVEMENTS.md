# SpacetimeWiki — Improvement Backlog

Living queue managed by the continuous-improvement cron. The cron reads this file,
cleans up completed items, researches new improvement opportunities, adds them,
and works the top pending item each tick.

---

## PENDING

| Priority | Item | Notes |
|----------|------|-------|
| P5 | **Add TypeScript tests — NotificationBell component** | NotificationBell.tsx renders bell icon + unread count. Test: shows count, empty state, refresh click. |
| P5 | **Add TypeScript tests — TemplatePicker component** | TemplatePicker.tsx lists templates from props. Test: renders templates, selects one, cancel. |
| P5 | **Add STDB table indexes for query performance** | Hot paths query by collection_id, page_id, user_id, page_tag.name — linear scan currently. Add `#[index(btree)]` on applicable fields in tables.rs for sub-ms lookups. |
| P5 | **Audit unused frontend CSS + bundle size** | Tailwind generates all utilities. Could add `content: [...]` purge paths and run `tailwindcss -o output.css --minify` to measure. Also audit unused npm deps. |
| P5 | **Add French (fr) and German (de) i18n locale files** | Currently only en.json and es.json exist with 315 keys each. Translate for fr and de to expand language coverage. |
| P5 | **Add Rust doc comments to public types and reducers** | tables.rs has 50+ table structs without doc comments. Adding `///` would improve DX for module maintainers. |

---

## Recently Completed

| Date | Item | Commit |
|------|------|--------|
| 2026-06-28 | **P5 — Add TypeScript tests — NotificationBell component** — 35 tests covering rendering, dropdown, actions, navigation, and accessibility. | f0b63577 |
| 2026-06-28 | **P5 — Add TypeScript tests — TemplatePicker component** — 27 tests covering rendering, template list, creation flow, modal interaction, and accessibility. | 6f390e7b |
| 2026-06-28 | **P5 — Add STDB btree indexes for query performance** — 50+ `#[index(btree)]` annotations across all 30+ tables on hot path fields (page_id, user_id, collection_id, email, slug, token, session_id). | 1e33b435 |
| 2026-06-28 | **P5 — Audit unused frontend CSS + bundle size** — 2.8MB bundle (good for Tailwind+purge). Removed 8 unused npm deps (tippy.js, y-prosemirror, @playwright/test, @testing-library/user-event, @tiptap/extension-bubble-menu, @tiptap/extension-mention, @tiptap/extension-underline, @tiptap/suggestion, @tiptap/y-tiptap). | 5de7a82c |
| 2026-06-28 | **P5 — Add French (fr) and German (de) i18n locale files** — 283 keys each across all 11 sections. Updated config.ts to register both. | 4a7ee8ec |
| 2026-06-28 | **P5 — Add Rust doc comments to public types and reducers** — All 50+ table structs now have `///` doc comments describing purpose and usage. | f605e09d |
