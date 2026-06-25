# SpacetimeWiki — Improvement Backlog

Living queue managed by the continuous-improvement cron. The cron reads this file,
cleans up completed items, researches new improvement opportunities, adds them,
and works the top pending item each tick.

---

## Status: PENDING

### P3 — Draw.io/diagrams.net integration
Embedded diagrams.net (draw.io) editor alongside Mermaid for visual diagram editing. Uses iframe-based draw.io embedding with export to SVG/PNG stored in doc content.
Files: web/src/extensions/Drawio.tsx, web/src/pages/PageEditor.tsx
Difficulty: Medium
Est: 2-3h

### P2 — Responsive/mobile-friendly layout
Ensure the UI works well on tablets and mobile devices. Collapsible sidebar auto-hides on small screens, editor adapts to viewport, touch-friendly controls.
Files: web/src/App.tsx, web/src/pages/PageEditor.tsx, web/src/pages/PageView.tsx
Difficulty: Medium
Est: 2h

### P2 — Page color accent
Set a per-page color accent (shown in page header, sidebar, and as a subtle border). Extends existing Page.color field on the STDB table. Color picker in page toolbar.
Files: web/src/pages/PageEditor.tsx, web/src/pages/PageView.tsx
Difficulty: Easy
Est: 30min

### P3 — PlantUML diagrams
PlantUML rendering alongside Mermaid for text-based diagramming. Server-side rendering via plantuml.com proxy or local renderer. Custom Tiptap node similar to Mermaid extension.
Files: web/src/extensions/PlantUML.tsx, web/src/pages/PageEditor.tsx
Difficulty: Medium
Est: 2h

### P3 — Comment @mentions
Notify users when they are mentioned in comments (via @username syntax). Extends existing Mention extension to work in comment fields. Shows user suggestions dropdown.
Files: web/src/pages/PageView.tsx, web/src/lib/api.ts
Difficulty: Medium
Est: 1.5h

---

## Recently Completed

### P3 — OIDC generic SSO support
**Done**: OidcProvider STDB table + add/update/delete reducers. Admin panel SSO tab with OIDC provider CRUD. Login view shows configured OIDC providers as sign-in buttons. Generic OIDC callback handler performs PKCE flow, token exchange, userinfo retrieval, and auto-registration.
Files: server/spacetimedb/src/lib.rs, web/src/lib/api.ts, web/src/App.tsx
Commit: dd8b292

### P3 — Webhooks UI (HTTP callbacks)
**Done**: WebhookSettings React component with create/edit/delete webhooks, event type selection (page.create, page.update, page.delete, page.publish, page.archive, comment.create), test event firing, webhook events viewer with status tracking (pending/sent/failed), and response body inspection. Integrated as a "Webhooks" tab in the admin panel. Backend (STDB tables + reducers) and frontend API were already implemented in prior work.
Files: web/src/components/WebhookSettings.tsx, web/src/App.tsx
Commit: b921743

### P3 — Multi-provider video embed extension
**Done**: Video embed Tiptap extension supporting YouTube, Vimeo, Loom, and Twitch. Paste-to-embed URL detection, slash command (/video), React node view with provider icon and link.
Files: web/src/extensions/VideoEmbed.ts, Commit: 4db980e

### P3 — KaTeX math extension
**Done**: Inline and block LaTeX math nodes for the Tiptap editor. React node view for editing and rendering. Slash command (/math). Supports both inline ($...$) and block ($$...$$) math.
Files: web/src/extensions/Math.tsx, Commit: bf6ff5c

### P3 — Mermaid diagram extension
**Done**: Mermaid Tiptap extension with custom node view. Inline source editor, dark theme support, slash command (/mermaid). Renders diagrams as SVG via Mermaid library.
Files: web/src/extensions/Mermaid.tsx, Commit: 4f4c899

### P3 — Full-width page toggle
**Done**: Toggle button in page view to switch between constrained and full-width layout. Uses Page.full_width field. Stored per-page preference.
Files: (in-page), Commit: 1eb05b7

### P3 — Image lightbox viewer
**Done**: Click-to-expand image viewer with zoom, pan, and keyboard navigation (arrow keys, Esc to close). Used in PageView for clicking embedded images.
Files: web/src/components/ImageLightbox.tsx, Commit: 6a359a2

### P2 — Search filters (collection, author, date range)
**Done**: SearchFilters component with dropdowns for collection, author, and date range. Integrated into sidebar search. Clientside filtering in AppLayout.
Files: web/src/components/SearchFilters.tsx, web/src/App.tsx, Commit: aea33b4

### P2 — Revisions diff view (visual diff between versions)
**Done**: RevisionDiff component with line-by-line diff using jsdiff. Shows added/removed lines with green/red highlighting, title change tracking, addition/removal counts.
Files: web/src/components/RevisionDiff.tsx, web/src/pages/PageView.tsx
Commit: dc798c0

### P2 — Page-level permissions (override collection defaults)
**Done**: PagePermission STDB table + CRUD reducers. Frontend PagePermissions component with user/group permission management.
Files: server/spacetimedb/src/lib.rs, web/src/components/PagePermissions.tsx, web/src/lib/api.ts, web/src/pages/PageView.tsx
Commit: 32a593e
