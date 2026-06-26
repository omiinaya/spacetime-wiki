# SpacetimeWiki — Improvement Backlog

Living queue managed by the continuous-improvement cron. The cron reads this file,
cleans up completed items, researches new improvement opportunities, adds them,
and works the top pending item each tick.

---

## Status: P0-P4 done. P5 in progress (3/6 complete).

| Priority | Item | Notes |
|----------|------|-------|
| P5 | AI assistant / RAG question answering | ✅ DONE: In-editor AI assistant with chat UI, session management, config panel (Ollama/OpenAI/Anthropic), wired into sidebar |
| P5 | Bases (table/kanban database views) | Docmost-style database views inside wiki pages |
| P5 | RTL / bidirectional text support | Right-to-left language support for Arabic, Hebrew, etc. |
| P5 | SCIM provisioning | System for Cross-domain Identity Management — auto-provision users |
| P5 | Passkeys / WebAuthn | Passwordless authentication via passkeys |
| P5 | ~~i18n / multi-language UI~~ | ✅ DONE: i18next + react-i18next infra, en+es translations, LanguageSwitcher in admin settings |

---

## Recently Completed

| Date | Item | Commit |
|------|------|--------|
| 2026-06-28 | **P5 — AI Assistant sidebar integration!** Full chat UI (AiAssistant.tsx) wired into App.tsx sidebar with session management, Ollama/OpenAI/Anthropic config panel, page-context-aware Q&A. Backend (AiConfig, AiChatSession, AiChatMessage tables + reducers) already existed. | _(this tick)_ |
| 2026-06-26 | **P5 — i18n / multi-language UI!** i18next + react-i18next + i18next-browser-languagedetector, full en/es translation files (22 namespaced sections each), LanguageSwitcher component in admin Settings tab, localStorage persistence | 6e04779 |
| 2026-06-26 | **P5 — Real-time collaboration (Yjs/STDB)!** STDB tables+reducers, YjsStdbProvider bridge, Tiptap Collaboration+Cursor extensions, remote user presence indicators | _(this commit)_ |
| 2026-06-26 | **Fix STDB v2.4 build errors** — app_setting.key().update(), removed get_app_setting reducer (reducers cannot return values) | 9062523 |
| 2026-06-28 | **P4 — MCP server built!** 6 tools (wiki_search, wiki_read_page, wiki_list_collections, wiki_list_pages, wiki_get_backlinks, wiki_get_linked_pages) + Resources. Registered in Hermes native MCP client. | |
| 2026-06-28 | **P4 — Page includes/transclusion!** `{{@page_id}}` syntax in page content renders referenced page inline, with Tiptap extension, visual styling, and full attachment resolution | |
| 2026-06-28 | P2 — Enhanced command palette (8 actions, keyboard shortcut badges, theme toggle) | 810cd50 |
| 2026-06-28 | P3 — PDF export (print-optimized HTML opens in new window for Save as PDF) with cover page, page breaks, styled headers | 928d953 |
| 2026-06-28 | P3 — Mermaid diagrams and ImageEnhanced rendering in PageView read-only editor mode | 928d953 |
| 2026-06-28 | Fix TS build: 36+ errors fixed (BubbleMenu/Tiptap v3 compat, Fragment wrapping, type casts) | 966ebc9 |
