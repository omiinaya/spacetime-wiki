# SpacetimeWiki — Improvement Backlog

Living queue managed by the continuous-improvement cron. The cron reads this file,
cleans up completed items, researches new improvement opportunities, adds them,
and works the top pending item each tick.

---

## Status: Working P4 backlog items.

| Priority | Item | Notes |
|----------|------|-------|
| P4 | LDAP authentication | Enterprise LDAP/AD integration for login & user sync |
| P4 | Slack/Discord/GitHub OAuth SSO | Additional OAuth providers beyond Google/Microsoft |
| P4 | Advanced search syntax | Tag filters, date ranges, `author:user` search syntax |
| P2 | Activity feed / audit trail page | Dedicated "Recent activity" page showing page creates, updates, deletes, restores with user info |
| P2 | Admin dashboard / wiki statistics | Wiki stats view (page count, users, collections, storage, top contributors) |


---

## Recently Completed

| Date | Item | Commit |
|------|------|--------|
| 2026-06-26 | **P3 — Multiple editor modes (WYSIWYG/Markdown/Split)!** Full wysiwyg/markdown/split toggling in PageEditor toolbar, with ProseMirror↔Markdown conversion via tiptap-markdown | _(this commit)_ |
| 2026-06-26 | **P3 — Typography extension!** Smart quotes, em-dashes, ellipsis, arrows, trademark/copyright symbols via `@tiptap/extension-typography` | _(this commit)_ |
| 2026-06-26 | **P4 — Auto-sort rules for content!** STDB `collection_sort_rule` table with set/delete/apply reducers, frontend sort rule config in collection dialog with auto-apply checkbox, server-side sort rule persistence | _(this commit)_ |
| 2026-06-29 | **P4 — Confluence import!** Server-side endpoint (`POST /api/v1/import/confluence`) with Confluence HTML→ProseMirror converter, pages.xml/entities.xml hierarchy parsing, ZIP upload support. Frontend sidebar "Import Confluence" button with status feedback | _(this commit)_ |
| 2026-06-29 | **P4 — Guest/invited users!** STDB tables+reducers (Invitation), API client with create/accept/revoke, admin Invitations tab in settings panel with create dialog and revoke controls | 95c854d |
| 2026-06-29 | **P4 — MFA/TOTP authentication!** STDB tables (mfa_method, mfa_backup_code) + reducers (enable_totp, disable_mfa, verify_totp, verify_mfa_backup_code), admin panel MFA tab with QR code setup and backup codes, TOTP verification during login flow | _(this commit)_ |
| 2026-06-28 | **P4 — Synced blocks (reuse across pages)!** STDB tables+reducers, Tiptap extension with React node view, slash command, feature flag, API client | 5904d58 |
| 2026-06-28 | **P5 — SCIM 2.0 provisioning!** STDB tables+reducers (ScimProvider, ScimEvent), SCIM 2.0 REST API endpoints, admin panel | e6c5720 |
| 2026-06-28 | **P5 — RTL/bidirectional text support!** direction field on Page struct, toggle in editor toolbar | 0af60ce |
