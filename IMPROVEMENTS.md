# SpacetimeWiki — Improvement Backlog

Living queue managed by the continuous-improvement cron. The cron reads this file,
cleans up completed items, researches new improvement opportunities, adds them,
and works the top pending item each tick.

---

## Status: All P0-P3 items complete, all P2 research items implemented. No remaining backlog. Entering maintenance/optimization phase.

| Priority | Item | Notes |
|----------|------|-------|
| P3 | Code splitting / lazy loading | App.tsx is 113KB, PageView.tsx is 37KB, PageEditor.tsx is 33KB. Split into lazy-loaded route-based chunks. |
| P3 | Add unit test infrastructure | Project has zero test files. Add Vitest + React Testing Library for component testing. |
| P4 | STDB SDK v2 upgrade | `@clockworklabs/spacetimedb-sdk` ^1.3.3 → ^2.0.0. Research breaking changes and compatibility. |
| P4 | Rust spacetimedb crate upgrade | Cargo.toml pins `spacetimedb = "=2.4.0"`. Check changelog and upgrade. |
| P4 | React 19 + Vite 6 upgrade | Major framework upgrade path. Coordinate with other dependency updates. |

---

## Recently Completed

| Date | Item | Commit |
|------|------|--------|
| 2026-06-27 | **P2 — Markdown import (.md files)!** Frontend import button in sidebar that reads `.md` files, converts to ProseMirror, and creates page. Server-side `/api/v1/import/markdown` endpoint also exists. | inline in App.tsx |
| 2026-06-27 | **P2 — Recycle bin with configurable retention!** Full trash dialog with restore/permanent-delete/empty-trash, `trash_retention_days` setting in admin, auto-purge reducer. | inline in lib.rs + App.tsx |
| 2026-06-27 | **P2 — Public share dialog polish!** Password protection, TTL/expiry, copy-to-clipboard, revoke, existing shares listing. | inline in PageView.tsx |
| 2026-06-27 | **P2 — Content permalinks (ID-based)!** Routes use `/page/:id`, `/permalink/:id`, and `/p/:slug`. IDs survive renames. | inline in App.tsx |
| 2026-06-27 | **P2 — Page icon/emoji picker!** Click page icon to show emoji grid, select to set page icon. | inline in PageView.tsx |
| 2026-06-27 | **P2 — Table of contents (auto-generated)!** Side panel from heading IDs with scroll-spy, active heading highlight, smooth scroll. | inline in PageView.tsx |
| 2026-06-27 | **P3 — Page relationship map in sidebar!** Slide-out panel showing collection, parent chain, child pages, and backlinks. | b2ba4d17 |
| 2026-06-27 | **P3 — Copy as markdown link!** Context menu item that copies `[title](url)` formatted markdown link. | e8abba0c |
| 2026-06-27 | **P2 — Collection-level page count badge!** Already present in sidebar. | inline in App.tsx |
| 2026-06-27 | **P2 — Revision diff preview on hover!** Hover tooltip in revision history panel. | 5f8c7370 |
