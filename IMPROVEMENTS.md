# SpacetimeWiki — Improvement Backlog

Living queue managed by the continuous-improvement cron. The cron reads this file,
cleans up completed items, researches new improvement opportunities, adds them,
and works the top pending item each tick.

---

## Status: Working P3 backlog items — Reading time / word count next.

| Priority | Item | Notes |
|----------|------|-------|
| P2 | Auto-notify watchers on page changes | Auto-create notification records when watched pages are created/updated/commented on by other users — call create_notification reducer from page create/update/delete and comment create reducers |
| P3 | Reading time / word count | Show estimated reading time and word count in PageView footer with live ProseMirror content calculation |
| P3 | Search result snippets & highlighting | Show matching term context in search results with highlight markers |
| P4 | Graph/network visualization | Interactive D3/force-graph view of page relationships (backlinks, collections) as a visual browser |
| P4 | REST API Swagger/OpenAPI docs | Generate OpenAPI 3.0 spec for the FastAPI REST API endpoints |


---

## Recently Completed

| Date | Item | Commit |
|------|------|--------|
| 2026-06-26 | **P2 — Notification center / watch pages!** STDB `watch` + `notification` tables with toggle_watch, create_notification, mark_read, mark_all_read, clear_all reducers. NotificationBell component with bell icon, unread badge, dropdown with mark-read/delete actions. Watch/unwatch toggle in PageView actions bar. Real-time notification delivery via STDB subscriptions with toast alerts. | 8adbd6d |
| 2026-06-26 | **P2 — Admin dashboard / wiki statistics!** SQL-powered stats cards (pages, users, collections, comments, attachments + storage), page status breakdown with bar chart, top contributors leaderboard, and recent activity feed from audit_event. Dashboard tab added as first admin panel tab. | e613e67 |
| 2026-06-26 | **P2 — Activity feed / audit trail page!** Dedicated `/activity` route with sidebar link, command palette entry (G A shortcut), reusable ActivityFeed component with 200-event limit and click-to-navigate | bcaf7c2 |
| 2026-06-26 | **P4 — Advanced search syntax!** Tag filters (tag: syntax), in:, author:, by:, from:, to:, date: full support. Backend search.py rewritten to use STDB search_pages reducer with filter params. Frontend search API client + wiring. STDB build errors fixed (MFA enable_totp, add_oauth_provider) | f96752f |
| 2026-06-29 | **P4 — Slack/Discord/GitHub/GitLab OAuth SSO!** Frontend login buttons with PKCE, OAuthCallback component, admin CRUD UI for OAuth providers, FastAPI callback endpoint for code exchange + auto-registration | c5b81ed |
| 2026-06-29 | **P4 — Confluence import!** Server-side endpoint (POST /api/v1/import/confluence) with Confluence HTML to ProseMirror converter, pages.xml/entities.xml hierarchy parsing, ZIP upload support. Frontend sidebar Import Confluence button with status feedback | 6f9ab6b |
| 2026-06-29 | **P4 — Guest/invited users!** STDB tables+reducers (Invitation), API client with create/accept/revoke, admin Invitations tab in settings panel with create dialog and revoke controls | 95c854d |
| 2026-06-29 | **P4 — MFA/TOTP authentication!** STDB tables (mfa_method, mfa_backup_code) + reducers (enable_totp, disable_mfa, verify_totp, verify_mfa_backup_code), admin panel MFA tab with QR code setup and backup codes, TOTP verification during login flow | 2fc008f |
| 2026-06-28 | **P4 — Synced blocks (reuse across pages)!** STDB tables+reducers, Tiptap extension with React node view, slash command, feature flag, API client | 5904d58 |
