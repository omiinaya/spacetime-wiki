# SpacetimeWiki — Improvement Backlog

Living queue managed by the continuous-improvement cron. The cron reads this file,
cleans up completed items, researches new improvement opportunities, adds them,
and works the top pending item each tick.

---

## PENDING

| Priority | Item | Notes |
|----------|------|-------|
| P5 | **Add TypeScript tests for SidebarTree component** | The new SidebarTree component (331 lines) has 0 tests. Covers tree rendering, favorites, drag/drop, batch ops, uncategorized section, empty state. |
| P5 | **Add TypeScript tests for ActivityFeed component** | ActivityFeed.tsx renders activity log entries. Required: rendering, pagination, empty state. |
| P5 | **Add TypeScript tests for GraphView component** | GraphView.tsx renders force-directed collection graph. Required: rendering, interaction, empty state. |
| P5 | **Add TypeScript tests for AiAssistant component** | AiAssistant.tsx renders AI chat widget. Required: rendering, send message, loading state, error state. |

---

## Recently Completed

| Date | Item | Commit |
|------|------|--------|
| 2026-06-29 | **P5 — Add Rust unit tests for collaboration.rs** — 21 tests covering session_id format, empty update validation, stale session TTL (5min), old update TTL (1hr), and integration flow patterns. 4 pure helpers extracted for testability. 0 cargo errors. | (pending commit) |
| 2026-06-29 | **P4 — Extract collaboration from lib.rs into collaboration.rs** — 6 collaboration reducers (broadcast_yjs_update, join/leave_collab_session, update_cursor_position, cleanup_stale_collab_sessions, cleanup_old_collab_updates) extracted. lib.rs: 2081→1959 lines (-122). 0 cargo errors. | a5263be9 |
| 2026-06-29 | **P4 — Extract App.tsx sidebar tree into SidebarTree.tsx** — SidebarTree component (331 lines) extracted from App.tsx's renderColTree, favorites, batch ops, uncategorized, and empty state. App.tsx ~2340→1973 lines (net -28 lines including component). 0 TS errors. | 84c4f472 |
| 2026-06-29 | **P4 — Remove 507 lines of dead admin code from App.tsx** — Deleted orphaned inline admin panel (365 lines), dead OIDC/SAML dialogs (142 lines), and dead group dialog (42 lines) that were left behind after AdminPanels extraction. App.tsx: 2824→2275 lines. Fixes Vite build failure, zero JS errors. | a4510c47 |
| 2026-06-29 | **P4 — Complete admin panels extraction from App.tsx into AdminPanels.tsx** — 5 sub-components (UsersPanel, GroupsPanel, SettingsPanel, SsoPanel). App.tsx 2941→2317 lines (624 removed). 0 TS errors. | 20e6775c |
| 2026-06-28 | **P4 — Extract SSO providers from lib.rs into sso.rs** — 15 reducers (SAML/OIDC/LDAP/OAuth) extracted. lib.rs: 2556→2079 lines. 0 cargo errors, 0 TS errors. | e4a401f6 |
| 2026-06-28 | **P4 — Extract LoginView + SSO handlers from App.tsx into LoginView.tsx** — Removed 327 lines of inline login form + SSO handlers (OIDC/SAML/Google/OAuth/Passkey/LDAP). App.tsx 3268→2941 lines. 0 TS errors. | 6da0679b |
| 2026-06-28 | **P4 — Extract groups/permissions from lib.rs into permissions.rs** — 10 reducers (create_group → remove_page_permission) extracted. lib.rs: 2755→2556 lines. Added 7 Rust unit tests. 0 cargo errors. | 13d4ac83 |
