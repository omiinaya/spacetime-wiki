# SpacetimeWiki — Improvement Backlog

Living queue managed by the continuous-improvement cron. The cron reads this file,
cleans up completed items, researches new improvement opportunities, adds them,
and works the top pending item each tick.

---

## Status: All P0-P3 items complete! See P2 research items below.

| Priority | Item | Notes |
|----------|------|-------|
| P2 | Table of contents (auto-generated) | Auto-generate TOC from heading anchor IDs using HeadingWithId extension. Floating TOC sidebar or inline collapsible. |
| P2 | Page icon/emoji picker | Set/change page icon from the editor/page header. Page model has `icon` field; emoji picker exists in editor but no dedicated page-level icon setter. |
| P2 | Public share dialog polish | ShareLink table + reducers exist, share dialog in PageView is partially wired. Needs password-protected links, expiry, copy button, and revoke. |
| P2 | Recycle bin with configurable retention | Trash page exists. Add retention days setting + auto-purge via STDB reducer. |
| P2 | Markdown import (.md files) | Import `.md` files to create new pages. Export exists but import doesn't. |
| P2 | Content permalinks (ID-based) | ID-based URLs that survive renames. Already partially using page IDs in routes. |

---

## Recently Completed

| Date | Item | Commit |
|------|------|--------|
| 2026-06-27 | **P3 — Page relationship map in sidebar!** Slide-out panel showing collection, parent chain, child pages, and backlinks for the current page. Triggered via Share2 icon in toolbar. | b2ba4d17 |
| 2026-06-27 | **P3 — Copy as markdown link!** New context menu item that copies `[title](url)` formatted markdown link to clipboard using page title and slug | e8abba0c |
| 2026-06-27 | **P2 — Collection-level page count badge!** Already present in sidebar — shows page count and child collection count next to collection name | inline in App.tsx |
| 2026-06-27 | **P2 — Revision diff preview on hover!** Hover tooltip showing title change, +/- counts, and sample diff lines in the revision history panel | 5f8c7370 |
| 2026-06-27 | **P1 — Dedicated /favorites page!** Fully featured favorites page at `/favorites` route with collection-grouped star listing, empty state with onboarding guidance, loading spinner, and quick navigation | 12e650b0 |
| 2026-06-27 | **P2 — Drag-and-drop sidebar reorder!** HTML5 native drag-and-drop for reordering pages and collections in sidebar | inline in App.tsx |
| 2026-06-27 | **P1 — Breadcrumbs component!** Auto-generated breadcrumb trail from page parent hierarchy | inline in PageView.tsx |
| 2026-06-27 | **P4 — Graph/network visualization!** Interactive D3 force-directed graph | a6321d4 |
| 2026-06-27 | **P3 — Dual editor / Markdown source toggle!** WYSIWYG/Markdown/Split mode tabs | 67fb0da |
