# SpacetimeWiki — Improvement Backlog

Living queue managed by the continuous-improvement cron. The cron reads this file,
cleans up completed items, researches new improvement opportunities, adds them,
and works the top pending item each tick.

---

## Status: PENDING

### P1 — Callouts/Notices (info, warning, tip, danger)
Custom Tiptap node extension for colored callout/notice blocks with icons.
Present in Outline, Docmost, Wiki.js, and BookStack.
Files: web/src/extensions/Callout.ts, web/src/components/Editor.tsx
Difficulty: Easy
Est: 1h

### P1 — Drag-and-drop block reordering within editor
Allow reordering blocks (paragraphs, headings, etc.) by dragging.
Present in Outline and Docmost.
Files: web/src/components/Editor.tsx
Difficulty: Medium
Est: 2h

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

### P0 — Rich text documents (Prosemirror/block-based editor)
**Done**: Full Tiptap editor with StarterKit, Link, Image, Table, TaskList, Highlight, CodeBlockLowlight, custom Details and Mention extensions.
Files: web/src/components/Editor.tsx, server/spacetimedb/src/lib.rs

### P0 — WYSIWYG editor
**Done**: Complete editor with top toolbar (bold, italic, heading, lists, link, image, table, code, highlight, divider, toggle) and floating selection toolbar.

### P0 — Markdown editor
**Done**: Tiptap StarterKit includes markdown input rules (type `#` → heading, `>` → blockquote, `-` → list, etc.). Markdown import and export also implemented.

### P0 — Document lifecycle
**Done**: Draft → Published → Archived → Deleted states with `set_page_status` reducer. Trash/recycle bin with restore and permanent delete.

### P0 — Collections/Spaces
**Done**: Collection table with CRUD reducers. Collection member roles (admin/editor/viewer). Context menu, edit dialog, drag-drop pages between collections.

### P0 — Nested page hierarchy
**Done**: `parent_page_id` field on Page. Sidebar displays parent/child relationships. Pages can be moved between collections and reordered.

### P0 — Sidebar tree navigation
**Done**: Expandable/collapsible tree with collections and pages. Drag-and-drop reorder. Right-click context menu. Favorites section.

### P0 — Email/password auth
**Done**: `register_user` and `login_user` reducers with SHA-256 password hashing. Login page with redirect. User role management (admin/member/viewer).

### P0 — Full-text search
**Done**: Client-side search across page titles and text_content. Search-as-you-type with 200ms debounce. Instant filtering.

### P0 — Dark mode
**Done**: Dark theme using Tailwind `prose-invert`, `bg-background`, `bg-card`, `text-muted-foreground` classes. Outline-inspired dark UI.

### P1 — Tables (full Tiptap support)
**Done**: Resizable tables with header rows, columns, and cells via `@tiptap/extension-table`.

### P1 — Code blocks with syntax highlighting
**Done**: `CodeBlockLowlight` with lowlight/highlight.js grammar support.

### P1 — Image paste from clipboard
**Done**: `handlePaste` in editor creates object URLs from pasted/dropped images.

### P1 — Slash commands (/ menu)
**Done**: `/` key triggers floating menu with 12 commands (H1-H3, lists, quote, code, table, image, divider, toggle). Keyboard-navigable.

### P1 — Selection/floating formatting toolbar
**Done**: Context toolbar appears above text selection with bold, italic, strikethrough, code, link buttons.

### P1 — Breadcrumbs
**Done**: Parent path shown at top of document pages via sidebar tree structure.

### P1 — Tags/labels on pages
**Done**: `page_tag` table with `add_tag`/`remove_tag` reducers. Tag input UI in PageEditor.

### P1 — User roles (admin, member, viewer)
**Done**: Role field on User. Admin panel with role management. Only admins can change roles.

### P1 — Collection-level permissions
**Done**: `collection_member` table with role assignments (admin/editor/viewer). Permission checks on collection operations.

### P1 — Keyboard shortcuts reference
**Done**: `?` key opens shortcuts modal. Cmd+S saves. Arrow keys navigate slash/palette menus.

### P1 — Revisions/history
**Done**: `page_revision` table with auto-save on every update. Revision panel with restore functionality.

### P1 — Links with preview
**Done**: `@tiptap/extension-link` with `openOnClick: false` and prompt-based URL entry.

### P1 — File attachments
**Done**: `attachment` table with base64 upload. File attachment management in PageView.

### P1 — Callouts/Notices
**Done**: Custom Callout node extension with color-coded types (info, warning, tip, danger), icon indicators, and slash command integration.

*(previous entries trimmed — see git log for full history)*
