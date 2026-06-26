# SpacetimeWiki — Improvement Backlog

Living queue managed by the continuous-improvement cron. The cron reads this file,
cleans up completed items, researches new improvement opportunities, adds them,
and works the top pending item each tick.

---

## Status: Working P4 backlog items.

| Priority | Item | Notes |
|----------|------|-------|
| P4 | MFA/TOTP authentication | Time-based one-time password for 2FA |
| P4 | Auto-sort rules for content | Automatic sort ordering rules for collections/nested pages |
| P4 | LDAP authentication | Enterprise LDAP/AD integration for login & user sync |
| P4 | Slack/Discord/GitHub OAuth SSO | Additional OAuth providers beyond Google/Microsoft |
| P4 | Advanced search syntax | Tag filters, date ranges, `author:user` search syntax |
| P3 | Typography extension | Smart quotes, em-dashes, ellipsis via Tiptap typography extension |
| P3 | Multiple editor modes | WYSIWYG ↔ Markdown live toggle (like BookStack dual editor) |

---

## Recently Completed

| Date | Item | Commit |
|------|------|--------|
| 2026-06-29 | **P4 — Confluence import!** Server-side endpoint (`POST /api/v1/import/confluence`) with Confluence HTML→ProseMirror converter, pages.xml/entities.xml hierarchy parsing, ZIP upload support. Frontend sidebar "Import Confluence" button with status feedback | _(this commit)_ |
| 2026-06-29 | **P4 — Guest/invited users!** STDB tables+reducers (Invitation), API client with create/accept/revoke, admin Invitations tab in settings panel with create dialog and revoke controls | 95c854d |
| 2026-06-28 | **P4 — Synced blocks (reuse across pages)!** STDB tables+reducers, Tiptap extension with React node view, slash command, feature flag, API client | 5904d58 |
| 2026-06-28 | **P5 — SCIM 2.0 provisioning!** STDB tables+reducers (ScimProvider, ScimEvent), SCIM 2.0 REST API endpoints, admin panel | e6c5720 |
| 2026-06-28 | **P5 — RTL/bidirectional text support!** direction field on Page struct, toggle in editor toolbar | 0af60ce |
| 2026-06-28 | **P5 — AI Assistant sidebar integration!** Full chat UI wired into sidebar with session management | 5d58362 |
| 2026-06-28 | **P4 — Passkeys/WebAuthn passwordless auth!** STDB tables+reducers, API endpoints, admin panel, "Sign in with Passkey" on login | |
| 2026-06-28 | **P4 — Page includes/transclusion!** `{{@page_id}}` syntax renders referenced page inline | |
