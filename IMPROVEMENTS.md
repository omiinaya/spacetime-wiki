# SpacetimeWiki — Improvement Backlog

Living queue managed by the continuous-improvement cron. The cron reads this file,
cleans up completed items, researches new improvement opportunities, adds them,
and works the top pending item each tick.

---

## Status: Working P4 backlog items.

| Priority | Item | Notes |
|----------|------|-------|
| P4 | Confluence import | Import pages from Confluence space export (HTML/XML) |
| P4 | MFA/TOTP authentication | Time-based one-time password for 2FA |
| P4 | Auto-sort rules for content | Automatic sort ordering rules for collections/nested pages |

---

## Recently Completed

| Date | Item | Commit |
|------|------|--------|
| 2026-06-29 | **P4 — Guest/invited users!** STDB tables+reducers (Invitation), API client with create/accept/revoke, admin Invitations tab in settings panel with create dialog and revoke controls | 95c854d |
| 2026-06-28 | **P4 — Synced blocks (reuse across pages)!** STDB tables+reducers, Tiptap extension with React node view, slash command, feature flag, API client | 5904d58 |
| 2026-06-28 | **P5 — SCIM 2.0 provisioning!** STDB tables+reducers (ScimProvider, ScimEvent), SCIM 2.0 REST API endpoints (Users, Groups, Schemas, ServiceProviderConfig) with Bearer token auth, admin panel provider CRUD + event log | e6c5720 |
| 2026-06-28 | **P5 — RTL/bidirectional text support!** direction field on Page struct, set_page_direction reducer, LTR/RTL toggle in editor toolbar, dir attribute on content/view containers | 0af60ce |
| 2026-06-28 | **P5 — AI Assistant sidebar integration!** Full chat UI (AiAssistant.tsx) wired into App.tsx sidebar with session management, Ollama/OpenAI/Anthropic config panel, page-context-aware Q&A. Backend (AiConfig, AiChatSession, AiChatMessage tables + reducers) already existed. | 5d58362 |
| 2026-06-26 | **P5 — i18n / multi-language UI!** i18next + react-i18next + i18next-browser-languagedetector, full en/es translation files (22 namespaced sections each), LanguageSwitcher component in admin Settings tab, localStorage persistence | 6e04779 |
| 2026-06-26 | **P5 — Real-time collaboration (Yjs/STDB)!** STDB tables+reducers, YjsStdbProvider bridge, Tiptap Collaboration+Cursor extensions, remote user presence indicators | _(this commit)_ |
| 2026-06-28 | **P4 — MCP server built!** 6 tools (wiki_search, wiki_read_page, wiki_list_collections, wiki_list_pages, wiki_get_backlinks, wiki_get_linked_pages) + Resources. Registered in Hermes native MCP client. | |
| 2026-06-28 | **P4 — Passkeys/WebAuthn passwordless auth!** STDB tables+reducers (passkey_credential, passkey_challenge), API server endpoints for registration + authentication, PasskeySettings admin panel with credential management, "Sign in with Passkey" button on login page, full WebAuthn browser API integration | |
| 2026-06-28 | **P4 — Page includes/transclusion!** `{{@page_id}}` syntax in page content renders referenced page inline, with Tiptap extension, visual styling, and full attachment resolution | |
| 2026-06-26 | **P4 — Notion import completed!** Full Notion export support: Markdown ZIP, HTML files, and ZIP with mixed .md/.html. Added `htmlToProseMirror` converter, updated `handleImportNotion` to handle all formats. Backend API: `POST /api/v1/import/notion`, `POST /api/v1/import/markdown` with server-side MD/HTML parsing. Sidebar accept updated for .html/.htm. | _(this commit)_ |
