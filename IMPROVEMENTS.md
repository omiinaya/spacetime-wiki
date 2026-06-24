# SpacetimeWiki — Improvement Backlog

Living queue managed by the continuous-improvement cron. The cron reads this file,
cleans up completed items, researches new improvement opportunities, adds them,
and works the top pending item each tick.

---

## Status: PENDING

### P3 — Video embeds (YouTube, Vimeo, Loom)
Expand the YouTube extension to support Vimeo, Loom, and other providers
with a paste-to-embed flow.
Files: web/src/extensions/YouTube.ts, web/src/components/Editor.tsx
Difficulty: Easy
Est: 1h

### P3 — Webhooks (HTTP callbacks)
Add webhook support — register URLs that receive POST notifications on page create,
update, delete events. Store webhooks in a new STDB table.
Files: server/spacetimedb/src/webhooks.rs, web/src/components/WebhookSettings.tsx
Difficulty: Hard
Est: 3h

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

---

## Recently Completed

### P3 — Math (LaTeX/KaTeX) in editor
**Done**: KaTeX integration with inline ($...$) and block ($$...$$) math nodes. Custom Tiptap extension with React node view for block math — inline KaTeX rendering in both editor and page view, inline source editor with double-click to edit, slash command (/math), and dark-themed output using KaTeX library.
Files: web/src/extensions/Math.tsx, web/src/pages/PageEditor.tsx, web/src/pages/PageView.tsx
Commit: bf6ff5c

### P3 — Mermaid diagrams in editor
**Done**: Mermaid.js integration as a custom Tiptap node. React node view with inline source editor, dark-themed rendering using mermaid library, and slash command (/diagram). Double-click to edit source. Auto-renders on update.
Files: web/src/extensions/Mermaid.tsx, web/src/pages/PageEditor.tsx
Commit: 4f4c899

### P3 — Full-width page toggle
**Done**: Toggle in page header (PageView + PageEditor) to switch between normal (max-w-4xl constrained) and full-width layout. Pref stored per-page via existing `full_width` column on page table. Uses Maximize2 icon with active state highlighting.
Files: web/src/pages/PageView.tsx, web/src/pages/PageEditor.tsx, web/src/lib/api.ts, server/spacetimedb/src/lib.rs

### P1 — Drag-and-drop block reordering within editor
**Done**: Draggable grip handles (⋮⋮) on top-level blocks. Drag to reorder using ProseMirror native drag-and-drop.
Files: web/src/extensions/DragHandle.ts
Commit: c7daa63

### P1 — Floating image toolbar (resize, align, caption)
**Done**: Custom ImageEnhanced Tiptap extension with React node view. Floating toolbar with alignment (left/center/right), resize presets (S/M/L/XL/Full), custom width input, draggable corner resize handle, and click-to-edit caption support.
Files: web/src/extensions/ImageEnhanced.tsx, web/src/pages/PageEditor.tsx
Commit: 2bcf4e2

### P2 — Groups/teams for collaborative access
**Done**: Group table + member management. Group CRUD, member assignment with admin/member roles, and collection-level group permissions. Admin panel tab with Groups UI, member management with role dropdowns and add/remove.
Files: server/spacetimedb/src/lib.rs, web/src/lib/api.ts, web/src/App.tsx
Commit: 922a2c3

### P2 — Page-level permissions (override collection defaults)
**Done**: PagePermission STDB table + CRUD reducers. Frontend PagePermissions component with user/group permission management, role assignment (viewer/editor/admin), and permission removal. Wired into PageView toolbar.
Files: server/spacetimedb/src/lib.rs, web/src/components/PagePermissions.tsx, web/src/lib/api.ts, web/src/pages/PageView.tsx
Commit: 32a593e

### P2 — Revisions diff view (visual diff between versions)
**Done**: RevisionDiff component with line-by-line diff using jsdiff. Shows added/removed lines with green/red highlighting, title change tracking, addition/removal counts. Accessible via "Diff" button on each revision in the history panel. Compares against current version. Overlay panel with full-width diff display.
Files: web/src/components/RevisionDiff.tsx, web/src/pages/PageView.tsx
Commit: dc798c0
