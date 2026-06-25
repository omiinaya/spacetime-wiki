# SpacetimeWiki — Improvement Backlog

Living queue managed by the continuous-improvement cron. The cron reads this file,
cleans up completed items, researches new improvement opportunities, adds them,
and works the top pending item each tick.

---

## Status: PENDING

### P3 — SAML 2.0 SSO
Add SAML 2.0 identity provider support alongside existing OIDC. Requires SAML library for handling SAML assertions, metadata XML, and callback endpoints. Admin panel SSO tab to include SAML provider configuration.
Files: server/spacetimedb/src/lib.rs, web/src/lib/api.ts, web/src/App.tsx
Difficulty: Hard
Est: 3h
> **Note**: Deferred — needs a backend server for ACS endpoint + XML signature verification. Current STDB-only SPA architecture can't handle SAML HTTP POST binding.

### P2 — Emoji picker (`:` colon syntax in editor)
Add colon-triggered emoji picker inside the Tiptap editor (type `:` followed by text to search emoji). Uses the existing `@tiptap/suggestion` plugin pattern.
Files: web/src/extensions/EmojiPicker.ts, web/src/pages/PageEditor.tsx
Difficulty: Medium
Est: 2h

### P2 — Link preview/unfurl on hover
When hovering over a link, show a tooltip with the page title (for internal wiki links) or a metadata preview card (for external URLs).
Files: web/src/pages/PageView.tsx
Difficulty: Medium
Est: 1.5h

### P0 — Dark mode toggle (light ↔ dark theme switch)
Add light/dark theme toggle with CSS variable switching. Currently only dark theme is implemented (OKLCH color variables). Need a theme toggle button, localStorage persistence, and a complementary light color palette.
Files: web/src/index.css, web/src/App.tsx
Difficulty: Medium
Est: 1h

### P1 — Keyboard shortcuts reference/guide
Add a keyboard shortcuts dialog (triggered by `?` or via help menu) showing available shortcuts (Cmd+S save, Cmd+Shift+P command palette, Cmd+B bold, etc.). Include editor shortcuts and global app shortcuts.
Files: web/src/App.tsx, web/src/components/KeyboardShortcuts.tsx
Difficulty: Easy
Est: 1h

### P3 — Rich embeds for 30+ providers
Expand beyond the current YouTube/Vimeo/Loom/Twitch video embed to support 30+ embed providers like Outline (Figma, CodePen, Google Docs, Notion, etc.). Use oEmbed protocol or iframe-based embeds with a registry of known providers.
Files: web/src/extensions/VideoEmbed.ts, web/src/extensions/Embed.tsx
Difficulty: Medium
Est: 2h

### P1 — Full-text search STDB reducer
Add a dedicated `search_pages` STDB reducer that performs server-side full-text search across page titles and text_content, returning ranked results. Currently search is client-side only (loads all pages and filters).
Files: server/spacetimedb/src/lib.rs, web/src/lib/api.ts
Difficulty: Medium
Est: 2h

### P1 — REST API layer for programmatic access
Add a lightweight REST API (using a separate HTTP server or STDB HTTP endpoints) providing CRUD for pages, collections, and search. Include API key authentication middleware and rate limiting.
Files: server/api-server/, web/src/lib/api.ts
Difficulty: Hard
Est: 4h

---

## Recently Completed

| Date | Item | Commit | 
|------|------|--------|
| 2026-06-25 | P3 — Multiple editor modes (Markdown ↔ WYSIWYG toggle) | 67fb0da |
| 2026-06-25 | P2 — Page templates (template picker dialog) | bde9d16 |
| 2026-06-24 | P3 — Comment @mentions | — |
| 2026-06-24 | P3 — PlantUML diagrams | b84a9df |
| 2026-06-24 | P3 — ZIP export (pages + assets) | — |
| 2026-06-24 | P3 — Comment reactions (emoji) | 98ef06d |
| 2026-06-24 | P3 — PDF export via window.print() | f7fa047 |
| 2026-06-24 | P2 — Responsive/mobile-friendly layout | 5330ead |
| 2026-06-24 | P3 — Draw.io/diagrams.net integration | 73afd15 |
| 2026-06-24 | P2 — Pinned documents | 4763aeb |
| 2026-06-24 | P2 — Page color accent | 9a55462 |
