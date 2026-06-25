# SpacetimeWiki — Improvement Backlog

Living queue managed by the continuous-improvement cron. The cron reads this file,
cleans up completed items, researches new improvement opportunities, adds them,
and works the top pending item each tick.

---

## Status: PENDING

### P3 — ZIP export (pages + assets)
Export selected pages + attachments as ZIP archive using JSZip library. Downloadable bundle with markdown/HTML content and embedded assets. Admin-level bulk export option.
Files: web/src/components/ZipExport.tsx, web/src/lib/api.ts
Difficulty: Medium
Est: 2h

### P3 — SAML 2.0 SSO
Add SAML 2.0 identity provider support alongside existing OIDC. Requires SAML library for handling SAML assertions, metadata XML, and callback endpoints. Admin panel SSO tab to include SAML provider configuration.
Files: server/spacetimedb/src/lib.rs, web/src/lib/api.ts, web/src/App.tsx
Difficulty: Hard
Est: 3h

### P3 — Multiple editor modes (Markdown ↔ WYSIWYG toggle)
Add tab-based editor mode switcher allowing users to toggle between WYSIWYG (current), Markdown source, and split-pane preview modes. Similar to Wiki.js dual-editor approach.
Files: web/src/pages/PageEditor.tsx, web/src/styles/editor-modes.css
Difficulty: Medium
Est: 2h

---

## Recently Completed

### P3 — Comment @mentions
**Done**: Added @mention detection in comment input with user suggestion dropdown (appears when typing @ after whitespace, filters by name). Dropdown shows avatar initials + username (up to 8 results). Selecting inserts @username into the text. @mentions rendered as highlighted spans (text-primary font-medium). All users loaded on mount via api.users.list().
Files: web/src/pages/PageView.tsx, web/src/lib/api.ts

### P3 — PlantUML diagrams
**Done**: Tiptap extension with inline source editor, plantuml.com rendering via plantuml-encoder library, slash command (/plantuml), React node view with edit workflow, loading state, and error handling. Server URL is configurable via extension options.
Files: web/src/extensions/PlantUML.tsx, web/src/pages/PageEditor.tsx, web/src/pages/PageView.tsx
Commit: b84a9df

### P3 — Comment reactions (emoji)
**Done**: Added `CommentReaction` STDB table with `add_comment_reaction` reducer (toggle on/off per user+emoji). Frontend reactions via localStorage (`sw_reactions` key) with emoji pill buttons showing counts, quick reaction bar (👍❤️🎉🚀👀), click-to-toggle toggle. STDB module ready for future publish.
Files: server/spacetimedb/src/lib.rs, web/src/lib/api.ts, web/src/pages/PageView.tsx
Commit: 98ef06d

### P3 — PDF export via window.print()
**Done**: Added `handleExportPDF` handler to PageView.tsx (was referenced but undefined). Enhanced `@media print` CSS with proper typography (12pt font, heading sizes, page-break rules), hiding sidebar/toolbar/comments/attachments during print.
Files: web/src/pages/PageView.tsx, web/src/index.css
Commit: f7fa047

### P2 — Responsive/mobile-friendly layout
**Done**: Full-screen dialogs on small screens (dialog-container/dialog-overlay CSS classes), scrollable formatting toolbar on mobile (editor-toolbar), page-actions horizontal scroll in PageView, side panels (TOC, revisions) go full-width on mobile, sidebar width increased to w-72 max-w-[85vw], viewport-bound context menu, safe-area padding support for notched phones, touch-friendly min-height targets, print media query stubs.
Files: web/src/App.tsx, web/src/pages/PageEditor.tsx, web/src/pages/PageView.tsx, web/src/index.css
Commit: 5330ead

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
