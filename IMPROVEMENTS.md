# SpacetimeWiki — Improvement Backlog

Living queue managed by the continuous-improvement cron. The cron reads this file,
cleans up completed items, researches new improvement opportunities, adds them,
and works the top pending item each tick.

---

## Status: PENDING

### P2 — Inline comments with thread resolution
Add inline commenting on page content — select text to create a comment thread, reply in thread, resolve/close threads. The data model (comments table) and @mentions in comments already exist; need the inline selection UI and threaded display.
Files: web/src/pages/PageView.tsx, web/src/components/, server/spacetimedb/src/lib.rs
Difficulty: Medium
Est: 2h

### P2 — Wiki import (Notion/Confluence)
Add import wizards for Notion (Markdown+ZIP export) and Confluence (HTML/XML export). Parse the exported file structure and create pages preserving hierarchy, content, and metadata. Reuses the existing Markdown import pipeline for Notion exports.
Files: web/src/App.tsx, web/src/components/
Difficulty: Medium
Est: 1.5h

### P2 — Comment reactions UI
Add emoji reaction buttons beneath each comment (👍, ❤️, 🎉, 😄, 😕). The STDB backend already has the `comment_reaction` table and `add_comment_reaction` reducer. Need to display existing reactions, allow toggling, and show reaction counts per comment.
Files: web/src/pages/PageView.tsx, web/src/lib/api.ts
Difficulty: Small
Est: 30min

### P3 — Page color accent picker
The Page model already has a `color` field and `set_page_color` reducer, but there's no UI for it. Add a color picker in the PageView toolbar (or page properties) that sets the accent color strip. Should show a small color palette (6-8 presets) + custom hex input.
Files: web/src/pages/PageView.tsx
Difficulty: Small
Est: 20min

### P3 — Dual editor mode (WYSIWYG ↔ Markdown)
Add a toggle in the PageEditor to switch between WYSIWYG (Tiptap) and raw Markdown editing modes. The export-to-markdown and import-from-markdown functions already exist in PageEditor; wire them into a live toggle with a Codemirror or textarea for the Markdown side.
Files: web/src/pages/PageEditor.tsx
Difficulty: Medium
Est: 1h

---

## Recently Completed

| Date | Item | Commit |
|------|------|--------|
| 2026-06-26 | P1 — File attachments browser/media manager (MediaManager grid dialog, drag-drop upload, search, preview, copy-link, integrated into PageView) | <current> |
| 2026-06-26 | P2 — Content permalinks (ID-based, survive renames) | 62b887f |
| 2026-06-26 | P1 — REST API for programmatic access (STDB-based HTTP API with API key auth) | 0d0ab36 |
| 2026-06-26 | P2 — Configurable trash retention period (AppSetting table, Admin panel tab, purge_expired_trash reducer) | <current> |
| 2026-06-26 | P2 — Public sharing dialog UI (dedicated share dialog in PageView with password, TTL, copy URL, revoke) | 0dac9cd |
| 2026-06-26 | P2 — Page duplication from sidebar context menu | fb2cc15 |
| 2026-06-26 | P3 — Permanent image upload (paste/drag-and-drop to server storage with attachment:// URL scheme, size limits, and auto-resolution) | 077ecf3 |
| 2026-06-26 | P1 — Table toolbar with row/column operations (insert/delete rows/cols, merge/split cells) | 0bea2e9 |
| 2026-06-26 | P2 — Responsive sidebar swipe gestures, backdrop blur, and smooth drawer animation | e928ff8 |
| 2026-06-26 | P3 — @Mentions in comments (MentionInput component with user autocomplete) | 2b77429 |
