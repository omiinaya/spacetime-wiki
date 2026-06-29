# SpacetimeWiki — Improvement Backlog

Living queue managed by the continuous-improvement cron. The cron reads this file,
cleans up completed items, researches new improvement opportunities, adds them,
and works the top pending item each tick.

---

## PENDING

| Priority | Item | Notes |
|----------|------|-------|
| P5 | **Add Rust unit tests for permissions reducers** | create_group, update_group, set_collection_group_permission, set_page_permission all have business logic (role validation, duplicate checks) that should be tested. |
| P4 | **Extract App.tsx sidebar tree into SidebarTree.tsx** | The recursive collection tree renderer + drag/drop + context menu + batch selection logic occupies ~500+ lines in App.tsx. Extract to separate component. |
| P4 | **Extract collaboration from lib.rs into collaboration.rs** | broadcast_yjs_update, join_collab_session, leave_collab_session, update_cursor_position, cleanup_stale_collab_sessions, cleanup_old_collab_updates. ~80 lines. |

---

## Recently Completed

| Date | Item | Commit |
|------|------|--------|
| 2026-06-28 | **P4 — Remove 507 lines of dead admin code from App.tsx** — Deleted orphaned inline admin panel (365 lines), dead OIDC/SAML dialogs (142 lines), and dead group dialog (42 lines) that were left behind after AdminPanels extraction. App.tsx: 2824→2275 lines. Fixes Vite build failure, zero JS errors. | $(cd /home/user/spacetime-wiki && git rev-parse --short HEAD 2>/dev/null || echo "pending") |
| 2026-06-29 | **P4 — Complete admin panels extraction from App.tsx into AdminPanels.tsx** — 5 sub-components (UsersPanel, GroupsPanel, SettingsPanel, SsoPanel). App.tsx 2941→2317 lines (624 removed). 0 TS errors. | 20e6775c |
| 2026-06-28 | **P4 — Extract SSO providers from lib.rs into sso.rs** — 15 reducers (SAML/OIDC/LDAP/OAuth) extracted. lib.rs: 2556→2079 lines. 0 cargo errors, 0 TS errors. | e4a401f6 |
| 2026-06-28 | **P4 — Extract LoginView + SSO handlers from App.tsx into LoginView.tsx** — Removed 327 lines of inline login form + SSO handlers (OIDC/SAML/Google/OAuth/Passkey/LDAP). App.tsx 3268→2941 lines. 0 TS errors. | 6da0679b |
| 2026-06-28 | **P4 — Extract groups/permissions from lib.rs into permissions.rs** — 10 reducers (create_group → remove_page_permission) extracted. lib.rs: 2755→2556 lines. Added 7 Rust unit tests. 0 cargo errors. | 13d4ac83 |
| 2026-06-28 | **P5 — Add TypeScript tests — NotificationBell component** — 35 tests covering rendering, dropdown, actions, navigation, and accessibility. | f0b63577 |
| 2026-06-28 | **P5 — Add TypeScript tests — TemplatePicker component** — 27 tests covering rendering, template list, creation flow, modal interaction, and accessibility. | 6f390e7b |
| 2026-06-28 | **P5 — Add STDB btree indexes for query performance** — 50+ `#[index(btree)]` annotations across all 30+ tables on hot path fields (page_id, user_id, collection_id, email, slug, token, session_id). | 1e33b435 |
| 2026-06-28 | **P5 — Audit unused frontend CSS + bundle size** — 2.8MB bundle (good for Tailwind+purge). Removed 8 unused npm deps (tippy.js, y-prosemirror, @playwright/test, @testing-library/user-event, @tiptap/extension-bubble-menu, @tiptap/extension-mention, @tiptap/extension-underline, @tiptap/suggestion, @tiptap/y-tiptap). | 5de7a82c |
