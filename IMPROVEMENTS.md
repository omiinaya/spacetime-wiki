# SpacetimeWiki — Improvement Backlog

Living queue managed by the continuous-improvement cron. The cron reads this file,
cleans up completed items, researches new improvement opportunities, adds them,
and works the top pending item each tick.

---

## Status: PENDING

### P1 — Floating image toolbar (resize, align, caption)
Context toolbar when selecting images in the editor.
Files: web/src/components/Editor.tsx
Difficulty: Medium
Est: 1-2h

### P2 — Groups/teams for collaborative access
Group table + member management. Assign groups to collections/permissions.
Files: server/spacetimedb/src/group.rs, web/src/components/GroupManager.tsx
Difficulty: Hard
Est: 4h

### P2 — Page-level permissions (override collection defaults)
Per-page role assignments on top of collection-level permissions.
Files: server/spacetimedb/src/permission.rs, web/src/components/PagePermissions.tsx
Difficulty: Medium
Est: 3h

### P2 — Revisions diff view (visual diff between versions)
Show added/removed lines when comparing page revisions.
Files: web/src/components/RevisionDiff.tsx
Difficulty: Medium
Est: 2h

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

### P3 — OIDC generic SSO support
Generic OpenID Connect provider integration alongside Google OAuth.
Files: server/spacetimedb/src/auth.rs, web/src/components/SSOSettings.tsx
Difficulty: Hard
Est: 4-5h

---

## Recently Completed

### P1 — Drag-and-drop block reordering within editor
**Done**: Draggable grip handles (⋮⋮) on top-level blocks. Drag to reorder using ProseMirror native drag-and-drop.
Files: web/src/extensions/DragHandle.ts
Commit: c7daa63

### P1 — Callouts/Notices
**Done**: Custom Callout node extension with color-coded types (info, warning, tip, danger), icon indicators, and slash command integration.

### P1 — Keyboard shortcuts reference
**Done**: `?` key opens shortcuts modal. Cmd+S saves. Arrow keys navigate slash/palette menus.

### P1 — Revisions/history
**Done**: `page_revision` table with auto-save on every update. Revision panel with restore functionality.

### P1 — Links with preview
**Done**: `@tiptap/extension-link` with `openOnClick: false` and prompt-based URL entry.

### P1 — File attachments
**Done**: `attachment` table with base64 upload. File attachment management in PageView.

### P0 — Rich text documents (Prosemirror/block-based editor)
**Done**: Full Tiptap editor with StarterKit, Link, Image, Table, TaskList, Highlight, CodeBlockLowlight, custom Details and Mention extensions.

### P0 — WYSIWYG editor
**Done**: Complete editor with top toolbar (bold, italic, heading, lists, link, image, table, code, highlight, divider, toggle) and floating selection toolbar.

### P0 — Markdown editor
**Done**: Tiptap StarterKit includes markdown input rules (type `#` → heading, `>` → blockquote, `-` → list, etc.).

### P0 — Document lifecycle
**Done**: Draft → Published → Archived → Deleted states with `set_page_status` reducer.

*(older entries trimmed — see git log for full history)*
