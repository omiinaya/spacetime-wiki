# SpacetimeWiki — Improvement Backlog

Living queue managed by the continuous-improvement cron. The cron reads this file,
cleans up completed items, researches new improvement opportunities, adds them,
and works the top pending item each tick.

---

## Status: PENDING

| Priority | Item | Notes |
|----------|------|-------|
| P3 | Feature flags / modular architecture admin panel | enable/disable specific extensions: callouts, mermaid, math, embeds |
| P4 | Page includes/transclusion (`{{@page_id}}` syntax) | embed content from another page inline, BookStack-style |
| P4 | MCP (Model Context Protocol) server | expose wiki pages and search as AI-accessible tools/resources |

---

## Recently Completed

| Date | Item | Commit |
|------|------|--------|
| 2026-06-28 | P3 — Collection page sort preference (Manual/Title/Date) per collection in editor | 267e8a7 |
| 2026-06-28 | P2 — Copy page link to clipboard from sidebar context menu | 4deb760 |
| 2026-06-28 | P2 — Inline title editing on PageView (click title to rename directly) | 56bf58b |
| 2026-06-27 | P2 — Move page to collection dialog in PageView (collection picker + move action) | 3152d29 |
| 2026-06-27 | P2 — Edge-swipe-to-open sidebar gesture with drag-follow animation | b79f7e9 |
| 2026-06-27 | P3 — Dual editor mode (WYSIWYG ↔ Markdown ↔ Split) | (already implemented) |
| 2026-06-27 | P3 — Page color accent picker in PageView toolbar (12-color palette + clear) | 54f0dd5 |
| 2026-06-27 | P2 — Wiki import from ZIP (Notion/Confluence export) with parent-child hierarchy preservation | 1170918 |
| 2026-06-27 | P2 — Comment reactions UI (STDB-backed 👍❤️🎉😄😕 with toggle, counts, active state) | 6374a20 |
| 2026-06-28 | P2 — Content snippet previews in sidebar search results | e7924f9 |
| 2026-06-28 | P2 — Inline comments with threaded replies, resolve/delete, text-anchor selection UI | ebf98f9 |
| 2026-06-27 | P2 — Responsive sidebar swipe gestures, backdrop blur, and smooth drawer animation | e928ff8 |
| 2026-06-27 | P3 — Permanent image upload (paste/drag-and-drop to server storage with attachment:// URL scheme, size limits, and auto-resolution) | 077ecf3 |
