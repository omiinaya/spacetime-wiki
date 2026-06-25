# SpacetimeWiki — Improvement Backlog

Living queue managed by the continuous-improvement cron. The cron reads this file,
cleans up completed items, researches new improvement opportunities, adds them,
and works the top pending item each tick.

---

## Status: PENDING

### P3 — OIDC generic SSO support
Generic OpenID Connect provider integration alongside Google OAuth.
Files: server/spacetimedb/src/auth.rs, web/src/components/SSOSettings.tsx
Difficulty: Hard
Est: 4-5h

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

### P3 — Webhooks UI (HTTP callbacks)
**Done**: WebhookSettings React component with create/edit/delete webhooks, event type selection (page.create, page.update, page.delete, page.publish, page.archive, comment.create), test event firing, webhook events viewer with status tracking (pending/sent/failed), and response body inspection. Integrated as a "Webhooks" tab in the admin panel. Backend (STDB tables + reducers) and frontend API were already implemented in prior work.
Files: web/src/components/WebhookSettings.tsx, web/src/App.tsx
Commit: b921743

### P2 — Revisions diff view (visual diff between versions)
**Done**: RevisionDiff component with line-by-line diff using jsdiff. Shows added/removed lines with green/red highlighting, title change tracking, addition/removal counts.
Files: web/src/components/RevisionDiff.tsx, web/src/pages/PageView.tsx
Commit: dc798c0

### P2 — Page-level permissions (override collection defaults)
**Done**: PagePermission STDB table + CRUD reducers. Frontend PagePermissions component with user/group permission management.
Files: server/spacetimedb/src/lib.rs, web/src/components/PagePermissions.tsx, web/src/lib/api.ts, web/src/pages/PageView.tsx
Commit: 32a593e

### P2 — Groups/teams for collaborative access
**Done**: Group table + member management. Group CRUD, member assignment with admin/member roles, collection-level group permissions.
Files: server/spacetimedb/src/lib.rs, web/src/lib/api.ts, web/src/App.tsx
Commit: 922a2c3

### P1 — Floating image toolbar (resize, align, caption)
**Done**: Custom ImageEnhanced Tiptap extension with React node view. Floating toolbar with alignment presets, resize presets, custom width input.
Files: web/src/extensions/ImageEnhanced.tsx, web/src/pages/PageEditor.tsx
Commit: 2bcf4e2

### P1 — Drag-and-drop block reordering within editor
**Done**: Draggable grip handles (⋮⋮) on top-level blocks. Drag to reorder using ProseMirror native drag-and-drop.
Files: web/src/extensions/DragHandle.ts
Commit: c7daa63
