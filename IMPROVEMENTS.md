# SpacetimeWiki — Improvement Backlog

Living queue managed by the continuous-improvement cron. The cron reads this file,
cleans up completed items, researches new improvement opportunities, adds them,
and works the top pending item each tick.

---

## Status: DONE — All P0-P4 features implemented. P5 items researched.

| Priority | Item | Notes |
|----------|------|-------|
| P5 | Real-time collaboration (Yjs/STDB subscriptions) | Multi-user co-editing with CRDT, cursor presence |
| P5 | AI assistant / RAG question answering | In-editor AI assistant that searches wiki content |
| P5 | Bases (table/kanban database views) | Docmost-style database views inside wiki pages |
| P5 | i18n / multi-language UI | Internationalization with locale switching |

---

## Recently Completed

| Date | Item | Commit |
|------|------|--------|
| 2026-06-28 | **P4 — MCP server built!** 6 tools (wiki_search, wiki_read_page, wiki_list_collections, wiki_list_pages, wiki_get_backlinks, wiki_get_linked_pages) + Resources. Registered in Hermes native MCP client. | |
| 2026-06-28 | **P4 — Page includes/transclusion!** `{{@page_id}}` syntax in page content renders referenced page inline, with Tiptap extension, visual styling, and full attachment resolution | |
| 2026-06-28 | P2 — Enhanced command palette (8 actions, keyboard shortcut badges, theme toggle) | 810cd50 |
| 2026-06-28 | P3 — PDF export (print-optimized HTML opens in new window for Save as PDF) with cover page, page breaks, styled headers | 928d953 |
| 2026-06-28 | P3 — Mermaid diagrams and ImageEnhanced rendering in PageView read-only editor mode | 928d953 |
| 2026-06-28 | Fix TS build: 36+ errors fixed (BubbleMenu/Tiptap v3 compat, Fragment wrapping, type casts) | 966ebc9 |
| 2026-06-28 | P3 — Nested collection hierarchies with recursive tree rendering | 5189a1c |
| 2026-06-28 | P3 — Feature flags / modular architecture admin panel with toggleable extensions | ff8a73a |
| 2026-06-28 | P3 — Collection page sort preference (Manual/Title/Date) per collection in editor | 267e8a7 |
| 2026-06-28 | P2 — Copy page link to clipboard from sidebar context menu | 4deb760 |
