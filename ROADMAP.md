# spacetime-wiki — Feature Parity Roadmap

> **Goal:** Outline-inspired UI/UX with feature parity across Outline, Docmost, Wiki.js, and BookStack
> **Stack:** SpacetimeDB (Rust backend) + React/Vite/Tailwind (frontend) + Tiptap editor

## Feature Parity Matrix

**Legend:** ✅ = Present in reference | 🔲 = Planned for S-Wiki | ❌ = Skipped (out of scope)
**Priority:** P0 (MVP) → P5 (Nice-to-have)

---

## 1. Core Document Model

| Feature | Outline | Docmost | Wiki.js | BookStack | S-Wiki | Priority |
|---------|:-------:|:-------:|:-------:|:---------:|:------:|:--------:|
| Rich text documents (Prosemirror/block-based) | ✅ | ✅ | ✅ | ✅ | 🔲 | P0 |
| WYSIWYG editor | ✅ | ✅ | ✅ | ✅ | 🔲 | P0 |
| Markdown editor | ✅ | ✅ | ✅ | ✅ | 🔲 | P0 |
| Page title + slug/URL ID | ✅ | ✅ | ✅ | ✅ | 🔲 | P0 |
| Page icon/emoji | ✅ | — | — | — | 🔲 | P2 |
| Page color accent | ✅ | — | — | — | 🔲 | P3 |
| Full-width toggle | ✅ | — | — | — | 🔲 | P3 |
| Draft → Published → Archived → Deleted lifecycle | ✅ | — | ✅ | ✅ | 🔲 | P0 |
| Document revisions/history | ✅ | ✅ | ✅ | ✅ | 🔲 | P1 |
| Visual diff between revisions | ✅ | — | — | ✅ | 🔲 | P3 |
| Page duplication/clone | ✅ | — | — | — | 🔲 | P2 |
| Templates | ✅ | ✅ | — | ✅ | 🔲 | P2 |
| Page includes/transclusion (`{{@page_id}}`) | — | — | — | ✅ | ✅ | P4 |
| Synced blocks (reuse across pages) | — | ✅ | — | — | 🔲 | P4 |

---

## 2. Editor (Tiptap/Prosemirror)

| Feature | Outline | Docmost | Wiki.js | BookStack | S-Wiki | Priority |
|---------|:-------:|:-------:|:-------:|:---------:|:------:|:--------:|
| Bold/Italic/Underline/Strikethrough | ✅ | ✅ | ✅ | ✅ | 🔲 | P0 |
| Inline code + code blocks w/ syntax highlighting | ✅ | ✅ | ✅ | ✅ | 🔲 | P1 |
| Headings (H1-H3) with auto-anchor IDs | ✅ | ✅ | ✅ | ✅ | 🔲 | P0 |
| Bullet lists / Ordered lists / Checklists | ✅ | ✅ | ✅ | ✅ | 🔲 | P0 |
| Blockquotes | ✅ | ✅ | ✅ | ✅ | 🔲 | P1 |
| Horizontal rules | ✅ | ✅ | ✅ | ✅ | 🔲 | P2 |
| Tables (resizable, headers, row/col ops) | ✅ | ✅ | ✅ | ✅ | 🔲 | P1 |
| Links with preview/unfurl | ✅ | ✅ | ✅ | ✅ | 🔲 | P1 |
| Images (upload, resize, caption, align) | ✅ | ✅ | ✅ | ✅ | 🔲 | P0 |
| Video embeds (YouTube, Vimeo) | ✅ | ✅ | — | — | 🔲 | P2 |
| Callouts/Notices (info, warning, tip) | ✅ | ✅ | — | ✅ | 🔲 | P1 |
| Toggle blocks (collapsible) | ✅ | ✅ | — | — | 🔲 | P2 |
| Math (LaTeX/Katex inline + block) | ✅ | ✅ | ✅ | — | 🔲 | P3 |
| Diagrams (Mermaid, Draw.io, Excalidraw) | ✅ | ✅ | ✅ | ✅ | 🔲 | P3 |
| PlantUML | ✅ | — | ✅ | — | 🔲 | P4 |
| Slash commands (`/`) | ✅ | ✅ | — | — | 🔲 | P1 |
| Markdown input rules (type MD → convert) | ✅ | ✅ | ✅ | ✅ | 🔲 | P0 |
| @Mentions (users + page links) | ✅ | ✅ | — | — | 🔲 | P2 |
| Emoji picker (`:`) | ✅ | ✅ | ✅ | — | 🔲 | P2 |
| Drag-and-drop block reordering | ✅ | ✅ | — | — | 🔲 | P1 |
| Floating formatting toolbar | ✅ | ✅ | — | — | 🔲 | P1 |
| Table of contents (auto from headings) | ✅ | — | — | — | 🔲 | P2 |
| File attachments (upload, preview) | ✅ | ✅ | ✅ | ✅ | 🔲 | P1 |
| Image paste from clipboard | ✅ | — | — | — | 🔲 | P1 |

---

## 3. Real-time Collaboration

| Feature | Outline | Docmost | Wiki.js | BookStack | S-Wiki | Priority |
|---------|:-------:|:-------:|:-------:|:---------:|:------:|:--------:|
| Multi-user real-time co-editing | ✅ | ✅ | — | — | 🔲 | P5 |
| Remote cursor presence | ✅ | ✅ | — | — | 🔲 | P5 |
| Inline comments | ✅ | ✅ | ✅ | ✅ | 🔲 | P2 |
| Comment threads + resolution | ✅ | ✅ | — | — | 🔲 | P2 |
| Comment reactions (emoji) | ✅ | — | — | — | 🔲 | P3 |
| Comment @mentions | ✅ | — | — | — | 🔲 | P3 |

---

## 4. Organization & Hierarchy

| Feature | Outline | Docmost | Wiki.js | BookStack | S-Wiki | Priority |
|---------|:-------:|:-------:|:-------:|:---------:|:------:|:--------:|
| Collections/Spaces (grouping mechanism) | ✅ | ✅ | — | ✅ (Shelves) | 🔲 | P0 |
| Nested page hierarchy (parent/child) | ✅ | ✅ | — | ✅ (Books→Chapters→Pages) | 🔲 | P0 |
| Sidebar tree navigation | ✅ | ✅ | — | ✅ | 🔲 | P0 |
| Drag-and-drop reorder in sidebar | ✅ | ✅ | ✅ | ✅ | 🔲 | P1 |
| Breadcrumbs | ✅ | — | — | ✅ | 🔲 | P1 |
| Tags/labels on pages | — | ✅ | ✅ | ✅ | 🔲 | P1 |
| Backlinks between pages | ✅ | — | — | — | 🔲 | P2 |
| Favorites/Stars | ✅ | — | — | ✅ | 🔲 | P2 |
| Pinned documents | ✅ | — | — | — | 🔲 | P3 |

---

## 5. Search

| Feature | Outline | Docmost | Wiki.js | BookStack | S-Wiki | Priority |
|---------|:-------:|:-------:|:-------:|:---------:|:------:|:--------:|
| Full-text search | ✅ | ✅ | ✅ | ✅ | 🔲 | P0 |
| Search-as-you-type / instant search | ✅ | ✅ | — | ✅ | 🔲 | P1 |
| Search filters (collection, date, user) | ✅ | ✅ | — | ✅ | 🔲 | P2 |
| Advanced search syntax (tags, dates) | — | — | — | ✅ | 🔲 | P4 |
| AI/RAG question answering | ✅ | ✅ | — | — | 🔲 | P5 |
| Command palette (Cmd/Ctrl+K) | ✅ | — | — | — | 🔲 | P2 |

---

## 6. Auth & SSO

| Feature | Outline | Docmost | Wiki.js | BookStack | S-Wiki | Priority |
|---------|:-------:|:-------:|:-------:|:---------:|:------:|:--------:|
| Email/password auth | ✅ | ✅ | ✅ | ✅ | 🔲 | P0 |
| Google OAuth | ✅ | — | ✅ | ✅ | 🔲 | P2 |
| Microsoft/Azure AD (OIDC + SAML) | ✅ | ✅ | ✅ | ✅ | 🔲 | P3 |
| OIDC generic | ✅ | ✅ | ✅ | ✅ | 🔲 | P3 |
| SAML 2.0 | ✅ | ✅ | ✅ | ✅ | 🔲 | P3 |
| LDAP | — | ✅ | ✅ | ✅ | 🔲 | P4 |
| Passkeys/WebAuthn | ✅ | — | — | — | 🔲 | P4 |
| MFA (TOTP) | — | ✅ | ✅ | ✅ | 🔲 | P4 |
| SCIM provisioning | ✅ | ✅ | — | — | 🔲 | P5 |
| SSO — Slack, Discord, GitHub, GitLab, etc. | ✅ | — | ✅ | ✅ | 🔲 | P4 |

---

## 7. Permissions & RBAC

| Feature | Outline | Docmost | Wiki.js | BookStack | S-Wiki | Priority |
|---------|:-------:|:-------:|:-------:|:---------:|:------:|:--------:|
| User roles (admin, member, viewer) | ✅ | ✅ | ✅ | ✅ | 🔲 | P1 |
| Groups/teams | ✅ | ✅ | ✅ | ✅ | 🔲 | P2 |
| Collection/space-level permissions | ✅ | ✅ | — | ✅ | 🔲 | P1 |
| Page-level permissions | — | ✅ | ✅ | ✅ | 🔲 | P2 |
| Public sharing (link with optional password) | ✅ | ✅ | ✅ | ✅ | 🔲 | P2 |
| Guest/invited users | ✅ | — | — | — | 🔲 | P4 |
| API keys (scoped) | ✅ | ✅ | ✅ | ✅ | 🔲 | P2 |

---

## 8. Import & Export

| Feature | Outline | Docmost | Wiki.js | BookStack | S-Wiki | Priority |
|---------|:-------:|:-------:|:-------:|:---------:|:------:|:--------:|
| Markdown import/export | ✅ | ✅ | ✅ | ✅ | 🔲 | P1 |
| HTML export | ✅ | ✅ | — | ✅ | 🔲 | P2 |
| JSON export | ✅ | — | — | — | 🔲 | P3 |
| PDF export | — | — | — | ✅ | 🔲 | P2 |
| ZIP export (pages + assets) | ✅ | — | — | ✅ | 🔲 | P3 |
| Notion import | ✅ | ✅ | — | — | 🔲 | P4 |
| Confluence import | — | ✅ | — | — | 🔲 | P4 |

---

## 9. Integrations

| Feature | Outline | Docmost | Wiki.js | BookStack | S-Wiki | Priority |
|---------|:-------:|:-------:|:-------:|:---------:|:------:|:--------:|
| Embed providers (YouTube, Figma, etc.) | ✅ (30+) | ✅ (12+) | — | — | 🔲 | P3 |
| Slack integration | ✅ | — | — | — | 🔲 | P4 |
| Webhooks | ✅ | — | — | ✅ | 🔲 | P3 |
| REST API | ✅ | ✅ | ✅ | ✅ | 🔲 | P1 |
| MCP support | ✅ | ✅ | — | — | 🔲 | P4 |
| Diagrams (Draw.io, Mermaid) | ✅ | ✅ | ✅ | ✅ | 🔲 | P3 |

---

## 10. UI/UX (Outline-Inspired)

| Feature | Outline | Docmost | Wiki.js | BookStack | S-Wiki | Priority |
|---------|:-------:|:-------:|:-------:|:---------:|:------:|:--------:|
| Dark mode (with light toggle) | ✅ | ✅ | ✅ | ✅ | 🔲 | P0 |
| Command palette (kbar-style) | ✅ | — | — | — | 🔲 | P2 |
| Collapsible sidebar | ✅ | ✅ | ✅ | ✅ | 🔲 | P0 |
| Breadcrumbs | ✅ | — | — | ✅ | 🔲 | P1 |
| Responsive / mobile-friendly | ✅ | ✅ | ✅ | ✅ | 🔲 | P2 |
| Keyboard shortcuts | ✅ | ✅ | ✅ | ✅ | 🔲 | P1 |
| RTL support | ✅ | — | ✅ | — | 🔲 | P5 |
| i18n / multi-language UI | ✅ (28 lang) | ✅ (12+) | ✅ (40+) | ✅ (40+) | 🔲 | P4 |

---

## 11. Unique Differentiators (from each project to incorporate)

| Source | Feature | S-Wiki | Priority |
|--------|---------|:------:|:--------:|
| **Outline** | Clean minimal UI, collections tree sidebar, command palette | 🔲 | P0 |
| **Outline** | Document lifecycle (draft→published→archived) | 🔲 | P0 |
| **Outline** | Rich embeds (30+ providers) | 🔲 | P3 |
| **Docmost** | Bases (table + kanban database views) | 🔲 | P5 |
| **Docmost** | AI assistant in-editor | 🔲 | P5 |
| **Docmost** | Page labels/tags | 🔲 | P1 |
| **Wiki.js** | Multiple editors (Markdown/WYSIWYG/Code/HTML/AsciiDoc) | 🔲 | P3 |
| **Wiki.js** | 21 auth strategies | 🔲 | P3 |
| **Wiki.js** | 12 storage backends | 🔲 | P4 |
| **Wiki.js** | Modular architecture (on/off features) | 🔲 | P3 |
| **BookStack** | Shelves→Books→Chapters→Pages hierarchy | 🔲 | P2 |
| **BookStack** | Page includes/transclusion (`{{@page_id}}`) | ✅ | P4 |
| **BookStack** | Built-in diagrams.net (draw.io) | 🔲 | P3 |
| **BookStack** | Advanced search syntax (tags, date filters) | 🔲 | P4 |
| **BookStack** | Recycle bin with configurable retention | 🔲 | P2 |
| **BookStack** | Content permalinks (ID-based, survive renames) | 🔲 | P2 |
| **BookStack** | Dual editor with live switch (WYSIWYG ↔ Markdown) | 🔲 | P3 |
| **BookStack** | Auto-sort rules for content | 🔲 | P4 |

---

## 12. SpacetimeDB Architecture (Unique to S-Wiki)

| Feature | S-Wiki | Priority |
|---------|:------:|:--------:|
| Real-time updates via STDB subscriptions (no WebSocket server needed) | 🔲 | P1 |
| Single-binary deployment (SpacetimeDB module) | 🔲 | P1 |
| SQL HTTP API for all reads (no REST API layer needed for data) | 🔲 | P1 |
| Rust reducer functions for all writes (atomic, server-authoritative) | 🔲 | P1 |
| Built-in row-level auth via identity tokens | 🔲 | P2 |
| WAL-based event sourcing (audit trail free with STDB) | 🔲 | P2 |

---

## Implementation Plan (Phase Order)

### Phase 1 — MVP (P0 items)
- [ ] SpacetimeDB module: pages, collections tables + CRUD reducers
- [ ] Frontend: Vite + React + Tailwind (Outline dark theme)
- [ ] Sidebar with collections tree
- [ ] Tiptap editor with basic blocks (headings, lists, bold/italic, links, images)
- [ ] Markdown input rules (type `#` → heading, etc.)
- [ ] Page lifecycle (create, publish, archive, delete)
- [ ] Full-text search via STDB text columns or Typesense
- [ ] Email/password auth (basic)

### Phase 2 — Organization & Navigation (P1 items)
- [ ] Drag-and-drop sidebar reorder
- [ ] Tables (full support)
- [ ] Code blocks with syntax highlighting
- [ ] Callouts/notices
- [ ] File attachments (upload + preview)
- [ ] Image paste from clipboard
- [ ] REST API for programmatic access
- [ ] Slash commands
- [ ] Page tags/labels
- [ ] Breadcrumbs
- [ ] Keyboard shortcuts reference
- [ ] User roles (admin, member, viewer)
- [ ] Collection-level permissions
- [ ] Markdown import/export
- [ ] Revisions/history

### Phase 3 — Power Features (P2 items)
- [ ] Favorites/stars
- [ ] Templates
- [ ] Page duplication
- [ ] Backlinks
- [ ] Command palette (Cmd+K)
- [ ] Public sharing (link + optional password)
- [ ] Inline comments + threads
- [ ] @Mentions
- [ ] Groups/teams
- [ ] Page-level permissions
- [ ] Google OAuth
- [ ] API keys
- [ ] Recycle bin with retention
- [ ] Content permalinks
- [ ] Table of contents (auto-generated)
- [ ] Toggle blocks
- [ ] Emoji picker

### Phase 4 — Advanced Features (P3 items)
- [ ] Diagrams (Mermaid + draw.io)
- [ ] Math (LaTeX/KaTeX)
- [ ] PDF export
- [ ] ZIP export
- [ ] Rich embeds (YouTube, Figma, etc.)
- [ ] Webhooks
- [ ] Multiple editor modes (Markdown/WYSIWYG/Code)
- [ ] Modal architecture (enable/disable features)
- [ ] OIDC + SAML SSO
- [ ] Import from Notion/Confluence

### Phase 5 — Future (P4-P5)
- [ ] Real-time collaboration (YJS or STDB subscriptions)
- [ ] AI assistant + RAG search
- [ ] Bases (table/kanban database views like Docmost)
- [x] Page includes/transclusion
- [ ] i18n multi-language
- [ ] Passkeys/WebAuthn
- [ ] MFA (TOTP)
- [ ] SCIM provisioning
- [ ] LDAP
