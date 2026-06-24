# SpacetimeWiki — Improvement Backlog

Living queue managed by the continuous-improvement cron. The cron reads this file,
cleans up completed items, researches new improvement opportunities, adds them,
and works the top pending item each tick.

---

## Status: PENDING

### P2 — Search filters (collection, date, user)
Add filter controls to the search interface — filter by collection, date range, and author.
Leverages existing STDB page table columns (collection_id, updated_at, created_by).
Files: web/src/components/SearchFilters.tsx, web/src/pages/SearchResults.tsx
Difficulty: Medium
Est: 2h

### P3 — Image lightbox viewer
Click on an image in the editor/page view to open a fullscreen lightbox.
Should support zoom, pan, and keyboard navigation (Escape to close).
Files: web/src/components/ImageLightbox.tsx, web/src/components/EditorContent.tsx
Difficulty: Easy
Est: 1h

### P3 — Full-width page toggle
Add a toggle in the page header to switch between normal (constrained) and full-width layout.
Store preference per-page via the `full_width` column already on the page table.
Files: web/src/pages/PageView.tsx, web/src/pages/PageEditor.tsx
Difficulty: Easy
Est: 0.5h

### P3 — Mermaid diagrams in editor
Mermaid.js integration as a custom Tiptap node. Add/edit diagrams.
Files: web/src/extensions/Mermaid.ts, web/src/components/Editor.tsx
Difficulty: Medium
Est: 2-3h

### P3 — Math (LaTeX/KaTeX) in editor
KaTeX integration as custom inline and block nodes.
Files: web/src/extensions/Math.ts, web/src/components/Editor.tsx
Difficulty: Medium
Est: 2h

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

---

## Recently Completed

### P2 — Revisions diff view (visual diff between versions)
**Done**: RevisionDiff component with line-by-line diff using jsdiff. Shows added/removed lines with green/red highlighting, title change tracking, addition/removal counts. Accessible via "Diff" button on each revision in the history panel. Compares against current version. Overlay panel with full-width diff display.
Files: web/src/components/RevisionDiff.tsx, web/src/pages/PageView.tsx
Commit: dc798c0

### P2 — Page-level permissions (override collection defaults)
**Done**: PagePermission STDB table + CRUD reducers. Frontend PagePermissions component with user/group permission management, role assignment (viewer/editor/admin), and permission removal. Wired into PageView toolbar.
Files: server/spacetimedb/src/lib.rs, web/src/components/PagePermissions.tsx, web/src/lib/api.ts, web/src/pages/PageView.tsx
Commit: 32a593e

### P2 — Groups/teams for collaborative access
**Done**: Group table + member management. Group CRUD, member assignment with admin/member roles, and collection-level group permissions. Admin panel tab with Groups UI, member management with role dropdowns and add/remove.
Files: server/spacetimedb/src/lib.rs, web/src/lib/api.ts, web/src/App.tsx
Commit: 922a2c3

### P1 — Floating image toolbar (resize, align, caption)
**Done**: Custom ImageEnhanced Tiptap extension with React node view. Floating toolbar with alignment (left/center/right), resize presets (S/M/L/XL/Full), custom width input, draggable corner resize handle, and click-to-edit caption support.
Files: web/src/extensions/ImageEnhanced.tsx, web/src/pages/PageEditor.tsx
Commit: 2bcf4e2

### P1 — Drag-and-drop block reordering within editor
**Done**: Draggable grip handles (⋮⋮) on top-level blocks. Drag to reorder using ProseMirror native drag-and-drop.
Files: web/src/extensions/DragHandle.ts
Commit: c7daa63
