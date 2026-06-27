# SpacetimeWiki — Improvement Backlog

Living queue managed by the continuous-improvement cron. The cron reads this file,
cleans up completed items, researches new improvement opportunities, adds them,
and works the top pending item each tick.

---

## Status: All P0-P3 items complete, all P2 research items implemented. Entering maintenance/optimization phase.

| Priority | Item | Notes |
|----------|------|-------|
| P4 | Consolidate to spacetimedb SDK | `spacetimedb` npm package v2.6.0 has React hooks (SpacetimeDBProvider, useReducer, useProcedure). Project currently uses custom HTTP SQL client (stdb_client.py) in api-server + mcp-server. Evaluate migration to official SDK for type safety and real-time subscriptions. |
| P4 | Request access to documents | Outline v1.8.0 feature: allow users to request access to pages they don't have permission to view. |
| P4 | Comments in image lightbox | Outline v1.8.0: allow commenting on images in the lightbox viewer for discussing visuals in context. |
| P4 | Per-share branding | Outline v1.7.1: override title/logo on individual public shares. |
| P5 | Admin avatar management | Outline v1.8.1: allow admins to change user avatars from admin panel. |

---

## Recently Completed

| Date | Item | Commit |
|------|------|--------|
| 2026-06-27 | **P4 — React 19 + Vite 8 upgrade!** React ^18.3.1 → ^19.2.7, Vite ^5.4.10 → ^8.1.0, @vitejs/plugin-react → v6.0.3. Fixed rolldown duplicate declaration errors. Build passes in 3.5s, all 18 tests pass. | 18fac8d9 |
| 2026-06-27 | **P3 — STDB Rust crate upgrade!** `spacetimedb =2.4.0` → `=2.6.0`. Clean compile, no breaking changes. | 5b1a4279 |
| 2026-06-27 | **P3 — Unit test infrastructure!** Vitest + React Testing Library + jsdom. 18 tests across 2 suites (utils + Toast component). Added `npm run test`/`test:watch` scripts. | 0caf22dd |
| 2026-06-27 | **P3 — Code splitting / lazy loading** | d2107a3f |
| 2026-06-27 | **P2 — Markdown import (.md files)!** Frontend import button in sidebar that reads `.md` files, converts to ProseMirror, and creates page. Server-side `/api/v1/import/markdown` endpoint also exists. | inline in App.tsx |
| 2026-06-27 | **P2 — Recycle bin with configurable retention!** Full trash dialog with restore/permanent-delete/empty-trash, `trash_retention_days` setting in admin, auto-purge reducer. | inline in lib.rs + App.tsx |
| 2026-06-27 | **P2 — Public share dialog polish!** Password protection, TTL/expiry, copy-to-clipboard, revoke, existing shares listing. | inline in PageView.tsx |
| 2026-06-27 | **P2 — Content permalinks (ID-based)!** Routes use `/page/:id`, `/permalink/:id`, and `/p/:slug`. IDs survive renames. | inline in App.tsx |
| 2026-06-27 | **P2 — Page icon/emoji picker!** Click page icon to show emoji grid, select to set page icon. | inline in PageView.tsx |
| 2026-06-27 | **P2 — Table of contents (auto-generated)!** Side panel from heading IDs with scroll-spy, active heading highlight, smooth scroll. | inline in PageView.tsx |
| 2026-06-27 | **P3 — Page relationship map in sidebar!** Slide-out panel showing collection, parent chain, child pages, and backlinks. | b2ba4d17 |
