# SpacetimeWiki — Improvement Backlog

Living queue managed by the continuous-improvement cron. The cron reads this file,
cleans up completed items, researches new improvement opportunities, adds them,
and works the top pending item each tick.

---

## Status: Next up — P3 "Copy as markdown link" in context menu

| Priority | Item | Notes |
|----------|------|-------|
| P3 | "Copy as markdown link" in context menu | Copy `[title](slug)` formatted markdown link for a page |
| P3 | Page relationship map in sidebar | Show parent/child/backlink relationships for the current page in a slide-out panel |

---

## Recently Completed

| Date | Item | Commit |
|------|------|--------|
| 2026-06-27 | **P2 — Collection-level page count badge!** Already present in sidebar — shows page count and child collection count next to collection name | inline in App.tsx |
| 2026-06-27 | **P2 — Revision diff preview on hover!** Hover tooltip showing title change, +/- counts, and sample diff lines in the revision history panel | 5f8c7370 |
| 2026-06-27 | **P1 — Dedicated /favorites page!** Fully featured favorites page at `/favorites` route with collection-grouped star listing, empty state with onboarding guidance, loading spinner, and quick navigation. Command palette "G F" shortcut now works. | 12e650b0 |
| 2026-06-27 | **P2 — Drag-and-drop sidebar reorder!** HTML5 native drag-and-drop for reordering pages and collections in sidebar with drop targets, cross-collection moves, and drag-to-trash | inline in App.tsx |
| 2026-06-27 | **P1 — Breadcrumbs component!** Auto-generated breadcrumb trail from page parent hierarchy showing collection → parent pages → current page with clickable navigation | inline in PageView.tsx |
| 2026-06-27 | **P1 — Callouts/notices in editor!** Info, warning, tip, danger callout blocks via custom Tiptap extension | Callout.ts extension |
| 2026-06-27 | **P4 — Graph/network visualization!** Interactive D3 force-directed graph of wiki pages and collections | a6321d4 |
| 2026-06-27 | **P3 — Dual editor / Markdown source toggle!** WYSIWYG/Markdown/Split mode tabs with conversion | 67fb0da |
| 2026-06-27 | **P4 — REST API OpenAPI docs!** 30+ Pydantic models + generated OpenAPI 3.0 spec | 5d1e74f |
