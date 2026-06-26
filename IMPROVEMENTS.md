# SpacetimeWiki — Improvement Backlog

Living queue managed by the continuous-improvement cron. The cron reads this file,
cleans up completed items, researches new improvement opportunities, adds them,
and works the top pending item each tick.

---

## Status: PENDING

| Priority | Item | Notes |
|----------|------|-------|
| P2 | Inline title editing on PageView | Click page title → inline edit → Enter to save |

---

## Recently Completed

| Date | Item | Commit |
|------|------|--------|
| 2026-06-26 | P1 — File attachments browser/media manager (MediaManager grid dialog, drag-drop upload, search, preview, copy-link, integrated into PageView) | 9a0c7b1 |
| 2026-06-26 | P2 — Content permalinks (ID-based, survive renames) | 62b887f |
| 2026-06-26 | P1 — REST API for programmatic access (STDB-based HTTP API with API key auth) | 0d0ab36 |
| 2026-06-26 | P2 — Configurable trash retention period (AppSetting table, Admin panel tab, purge_expired_trash reducer) | 7350c7a |
| 2026-06-26 | P2 — Public sharing dialog UI (dedicated share dialog in PageView with password, TTL, copy URL, revoke) | 0dac9cd |
| 2026-06-26 | P2 — Page duplication from sidebar context menu | fb2cc15 |
| 2026-06-26 | P3 — Permanent image upload (paste/drag-and-drop to server storage with attachment:// URL scheme, size limits, and auto-resolution) | 077ecf3 |
| 2026-06-26 | P1 — Table toolbar with row/column operations (insert/delete rows/cols, merge/split cells) | 0bea2e9 |
| 2026-06-26 | P2 — Responsive sidebar swipe gestures, backdrop blur, and smooth drawer animation | e928ff8 |
| 2026-06-26 | **P2 — Comment reactions UI (STDB-backed 👍❤️🎉😄😕 with toggle, counts, active state)** | 6374a20 |
| 2026-06-27 | P2 — Wiki import from ZIP (Notion/Confluence export) with parent-child hierarchy preservation | 1170918 |
| 2026-06-27 | P2 — Edge-swipe-to-open sidebar gesture with drag-follow animation | b79f7e9 |
| 2026-06-27 | P3 — Page color accent picker in PageView toolbar (12-color palette + clear) | 54f0dd5 |
| 2026-06-27 | P3 — Dual editor mode (WYSIWYG ↔ Markdown ↔ Split) | (already implemented) |
| 2026-06-27 | P2 — Move page to collection dialog in PageView (collection picker + move action) | 3152d29 |
