# SpacetimeWiki — Improvement Backlog

Living queue managed by the continuous-improvement cron. The cron reads this file,
cleans up completed items, researches new improvement opportunities, adds them,
and works the top pending item each tick.

---

## Status: P0-P4 done. P5 in progress (4/7 complete — 3 remaining).

| Priority | Item | Notes |
|----------|------|-------|
| P5 | Bases (table/kanban database views) | ✅ DONE: STDB tables+reducers (DbBase, DbColumn, DbRow, DbCell), full API client, Tiptap extension with table+kanban views, cell editing, row/column CRUD, slash command, feature flag |
| P5 | RTL / bidirectional text support | Right-to-left language support for Arabic, Hebrew, etc. |
| P5 | SCIM provisioning | System for Cross-domain Identity Management — auto-provision users |
| P5 | Passkeys / WebAuthn | Passwordless authentication via passkeys |
| P4 | Synced blocks (reuse across pages) | Docmost-style synced blocks — edit once, update everywhere. STDB-backed block references |
| P4 | Notion import | Import pages/content from Notion HTML/Markdown export |
| P4 | Guest/invited users | Invite external users with limited access to specific pages |

---

## Recently Completed

| Date | Item | Commit |
|------|------|--------|
| 2026-06-28 | **P5 — AI Assistant sidebar integration!** Full chat UI (AiAssistant.tsx) wired into App.tsx sidebar with session management, Ollama/OpenAI/Anthropic config panel, page-context-aware Q&A. Backend (AiConfig, AiChatSession, AiChatMessage tables + reducers) already existed. | 5d58362 |
| 2026-06-26 | **P5 — i18n / multi-language UI!** i18next + react-i18next + i18next-browser-languagedetector, full en/es translation files (22 namespaced sections each), LanguageSwitcher component in admin Settings tab, localStorage persistence | 6e04779 |
| 2026-06-26 | **P5 — Real-time collaboration (Yjs/STDB)!** STDB tables+reducers, YjsStdbProvider bridge, Tiptap Collaboration+Cursor extensions, remote user presence indicators | _(this commit)_ |
| 2026-06-26 | **Fix STDB v2.4 build errors** — app_setting.key().update(), removed get_app_setting reducer (reducers cannot return values) | 9062523 |
| 2026-06-28 | **P4 — MCP server built!** 6 tools (wiki_search, wiki_read_page, wiki_list_collections, wiki_list_pages, wiki_get_backlinks, wiki_get_linked_pages) + Resources. Registered in Hermes native MCP client. | |
| 2026-06-26 | **P5 — Bases (table/kanban database views)!** STDB tables (DbBase, DbColumn, DbRow, DbCell) + reducers, full API client, Tiptap extension with table + kanban views, inline cell editing, row/column CRUD, slash command, feature flag | |
| 2026-06-28 | **P4 — Page includes/transclusion!** `{{@page_id}}` syntax in page content renders referenced page inline, with Tiptap extension, visual styling, and full attachment resolution | |
| 2026-06-28 | P2 — Enhanced command palette (8 actions, keyboard shortcut badges, theme toggle) | 810cd50 |
