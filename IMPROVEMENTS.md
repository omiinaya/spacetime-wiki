# SpacetimeWiki — Improvement Backlog

Living queue managed by the continuous-improvement cron. The cron reads this file,
cleans up completed items, researches new improvement opportunities, adds them,
and works the top pending item each tick.

---

## Status: All P0-P3 items complete, all P2 research items implemented. P4 SDK consolidation done. P4 access requests implemented. Entering maintenance/optimization phase.

| Priority | Item | Notes |
|----------|------|-------|
| P4 | Comments in image lightbox | Outline v1.8.0: allow commenting on images in the lightbox viewer for discussing visuals in context. |
| P4 | Per-share branding | Outline v1.7.1: override title/logo on individual public shares. |
| P5 | Admin avatar management | Outline v1.8.1: allow admins to change user avatars from admin panel. |

---

## Recently Completed

| Date | Item | Commit |
|------|------|--------|
| 2026-06-27 | **P4 — Request access to documents!** Users can request access to pages they can't view; page owners/admins notified and can approve/deny in admin panel. Adds `access_request` STDB table with `create_access_request`, `approve_access_request`, `deny_access_request` reducers. Admin "Access Requests" tab. Frontend "Request Access" button on restricted page view. | (current) |
| 2026-06-27 | **P4 — Consolidate to spacetimedb SDK!** Installed `spacetimedb` npm package v2.6.0, generated TypeScript module bindings (48 tables, 140+ reducers), set up SpacetimeDBProvider in `main.tsx` with config for typed `DbConnection`. Vite build 3.35s, all 18 tests pass. | 6e1bb122+ |
| 2026-06-27 | **P3 — STDB Rust crate upgrade!** `spacetimedb =2.4.0` → `=2.6.0`. Clean compile, no breaking changes. | 5b1a4279 |
| 2026-06-27 | **P3 — Unit test infrastructure!** Vitest + React Testing Library + jsdom. 18 tests across 2 suites (utils + Toast component). Added `npm run test`/`test:watch` scripts. | 0caf22dd |
| 2026-06-27 | **P3 — Code splitting / lazy loading** | d2107a3f |
| 2026-06-27 | **P2 — Markdown import (.md files)!** Frontend import button in sidebar that reads `.md` files, converts to ProseMirror, and creates page. Server-side `/api/v1/import/markdown` endpoint also exists. | inline in App.tsx |
| 2026-06-27 | **P2 — Recycle bin with configurable retention!** Full trash dialog with restore/permanent-delete/empty-trash, `trash_retention_days` setting in admin, auto-purge reducer. | inline in lib.rs + App.tsx |
| 2026-06-27 | **P2 — Public share dialog polish!** Password protection, TTL/expiry, copy-to-clipboard, revoke, existing shares listing. | inline in PageView.tsx |
| 2026-06-27 | **P2 — Content permalinks (ID-based)!** Routes use `/page/:id`, `/permalink/:id`, and `/p/:slug`. IDs survive renames. | inline in App.tsx |
