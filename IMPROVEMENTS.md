# SpacetimeWiki — Improvement Backlog

Living queue managed by the continuous-improvement cron. The cron reads this file,
cleans up completed items, researches new improvement opportunities, adds them,
and works the top pending item each tick.

---

## Status: Working P4 backlog items — implementing Slack/Discord/GitHub OAuth SSO.

| Priority | Item | Notes |
|----------|------|-------|
| P4 | Slack/Discord/GitHub OAuth SSO | Additional OAuth providers beyond Google/Microsoft — STDB table + reducers + FastAPI router + frontend login buttons and callback |
| P4 | Advanced search syntax | Tag filters, date ranges, `author:user` search syntax — frontend parsing exists (App.tsx), backend search.py needs filter params |
| P2 | Activity feed / audit trail page | Dedicated "Recent activity" page showing page creates, updates, deletes, restores with user info |
| P2 | Admin dashboard / wiki statistics | Wiki stats view (page count, users, collections, storage, top contributors) |
| P3 | Reading time / word count | Show estimated reading time and word count in PageView footer with live ProseMirror content calculation |
| P2 | Notification center / watch pages | Allow users to watch pages/collections and receive in-app notifications on changes (STDB tables + reducers + frontend bell icon + dropdown) |
| P4 | Graph/network visualization | Interactive D3/force-graph view of page relationships (backlinks, collections) as a visual browser |


---

## Recently Completed

| Date | Item | Commit |
|------|------|--------|
| 2026-06-29 | **P4 — Confluence import!** Server-side endpoint (`POST /api/v1/import/confluence`) with Confluence HTML→ProseMirror converter, pages.xml/entities.xml hierarchy parsing, ZIP upload support. Frontend sidebar "Import Confluence" button with status feedback | _(this commit)_ |
| 2026-06-29 | **P4 — Guest/invited users!** STDB tables+reducers (Invitation), API client with create/accept/revoke, admin Invitations tab in settings panel with create dialog and revoke controls | 95c854d |
| 2026-06-29 | **P4 — MFA/TOTP authentication!** STDB tables (mfa_method, mfa_backup_code) + reducers (enable_totp, disable_mfa, verify_totp, verify_mfa_backup_code), admin panel MFA tab with QR code setup and backup codes, TOTP verification during login flow | _(this commit)_ |
| 2026-06-28 | **P4 — Synced blocks (reuse across pages)!** STDB tables+reducers, Tiptap extension with React node view, slash command, feature flag, API client | 5904d58 |
| 2026-06-28 | **P5 — SCIM 2.0 provisioning!** STDB tables+reducers (ScimProvider, ScimEvent), SCIM 2.0 REST API endpoints, admin panel | e6c5720 |
| 2026-06-28 | **P5 — RTL/bidirectional text support!** direction field on Page struct, toggle in editor toolbar | 0af60ce |
| 2026-06-26 | **P4 — LDAP authentication!** STDB tables+reducers (ldap_provider, ldap_user), Admin panel LDAP tab with full provider CRUD and attribute mapping, LDAP login in LoginView, Python FastAPI LDAP auth backend | 5fd0cba |
