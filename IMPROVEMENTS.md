# SpacetimeWiki — Improvement Backlog

Living queue managed by the continuous-improvement cron. The cron reads this file,
cleans up completed items, researches new improvement opportunities, adds them,
and works the top pending item each tick.

---

## Status: PENDING

### P2 — Responsive/mobile-friendly layout
Ensure the UI works well on tablets and mobile devices. Collapsible sidebar auto-hides on small screens, editor adapts to viewport, touch-friendly controls.
Files: web/src/App.tsx, web/src/pages/PageEditor.tsx, web/src/pages/PageView.tsx
Difficulty: Medium
Est: 2h

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

### P3 — Comment reactions (emoji)
Allow emoji reactions on comments (👍❤️🎉🚀👀). Extends Comment model with a `reactions` JSON string or separate `comment_reaction` STDB table. Click-to-react in the comment thread view.
Files: server/spacetimedb/src/lib.rs, web/src/lib/api.ts, web/src/pages/PageView.tsx
Difficulty: Medium
Est: 1h

### P3 — PDF export via window.print()
Export page as PDF using browser's window.print() with print media styles. Button already exists in PageView.tsx but handler is missing (`handleExportPDF` is referenced but undefined). Add @media print CSS for clean PDF output, or use a library like html2pdf.
Files: web/src/pages/PageView.tsx, web/src/index.css
Difficulty: Easy
Est: 0.5h

### P3 — ZIP export (pages + assets)
Export selected pages + attachments as ZIP archive using JSZip library. Downloadable bundle with markdown/HTML content and embedded assets. Admin-level bulk export option.
Files: web/src/components/ZipExport.tsx, web/src/lib/api.ts
Difficulty: Medium
Est: 2h

---

## Recently Completed

### P3 — Draw.io/diagrams.net integration
**Done**: Tiptap extension with iframe-based draw.io editor, SVG preview, postMessage communication, inline source editor, create/edit workflow. Slash command (/drawio). React node view with toolbar and diagram preview.
Files: web/src/extensions/Drawio.tsx, web/src/pages/PageEditor.tsx, web/src/pages/PageView.tsx
Commit: 73afd15

### P2 — Pinned documents
**Done**: `is_pinned` field on Page STDB table + `set_page_pinned` reducer. Pin/unpin toggle button in page view toolbar (Pin icon, highlight state). Pinned pages sort first in sidebar with pushpin indicator. Favorites section also shows pin indicator.
Files: server/spacetimedb/src/lib.rs, web/src/lib/api.ts, web/src/pages/PageView.tsx, web/src/App.tsx
Commit: 4763aeb

### P2 — Page color accent
**Done**: set_page_color reducer on the Page table (already had color field). Color picker palette in editor toolbar with 24 preset colors + clear option. Color accent bar at top of page view. Colored dot indicators in sidebar (collections, favorites, uncategorized). Stored per-page color on existing Page.color field.
Files: server/spacetimedb/src/lib.rs, web/src/lib/api.ts, web/src/pages/PageEditor.tsx, web/src/pages/PageView.tsx, web/src/App.tsx
Commit: 9a55462

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

### P2 — Search filters (collection, author, date range)
**Done**: SearchFilters component with dropdowns for collection, author, and date range. Integrated into sidebar search. Clientside filtering in AppLayout.
Files: web/src/components/SearchFilters.tsx, web/src/App.tsx, Commit: aea33b4
