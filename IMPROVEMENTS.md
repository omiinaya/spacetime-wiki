# SpacetimeWiki — Improvement Backlog

Living queue managed by the continuous-improvement cron. The cron reads this file,
cleans up completed items, researches new improvement opportunities, adds them,
and works the top pending item each tick.

---

## PENDING

| Priority | Item | Notes |
|----------|------|-------|
| P5 | Rust unit tests for tables.rs — table validation tests | |
| P5 | Rust unit tests for lib.rs — reducer-level integration tests | |

---

## Recently Completed

| Date | Item | Commit |
|------|------|--------|
| 2026-06-30 | **P5 — Rust unit tests for sso.rs** — Extracted 5 validation helpers (validate_url, validate_not_empty, validate_oauth_provider_type, default_oauth_scope, sanitize_role) and added 22 unit tests. Refactored 8 SSO reducers (SAML, OIDC, LDAP, OAuth CRUD) to use shared helpers. Rust suite now 131/131 clean. | c6624ae4 |
| 2026-06-30 | **P5 — TypeScript tests for 6 more Tiptap extensions** — Mermaid (6), MathInline (5), MathBlock (6), Transclusion (6), SyncedBlock (6), DatabaseBase (4), ImageEnhanced (7). Total 40 tests covering Node config, parseHTML, renderHTML, attributes, and custom getAttrs. Suite now 1062/1062 clean. | 8f27ff97 |
| 2026-06-30 | **P5 — TypeScript tests for lib/tiptap-helpers.ts** — 40 tests (tiptapToMarkdown complete impl, tiptapToHTML with callouts, htmlToProseMirror, markdownToProseMirror, arrayBufferToBase64Url). Suite now 1022/1022 clean. | 34381e54 |
| 2026-06-30 | **P5 — TypeScript tests for lib/ utility modules (5 files)** — helpers.ts (38), subscriptions.ts (23), yjs-stdb-provider.ts (18), useCollaboration.ts (12). Total 91 new tests. Full suite now 982/982 clean. | 668d0966 |
| 2026-06-30 | **P5 — TypeScript tests for admin components (15 files)** — 136 tests across all admin panels (AdminPanels, ApiKeySettings, UsersPanel, GroupsPanel, SettingsPanel, SsoPanel, OAuthSettings, LdapSettings, MfaSettings, PasskeySettings, ScimSettings, FeatureFlags, BulkExport, TrashSettings, InvitationSettings). All 23 test issues fixed — suite now 891/891 clean. | 89fc9502 |
| 2026-06-29 | **P4 — TypeScript tests for PageView.tsx** — 38 tests (loading, error, loaded, actions, comments, export, share, TOC, color picker, attachments, word count, revisions, a11y). Fixed 5 a11y violations (back button, emoji picker, send button, file input, editor aria-label) and heading level hierarchy. | 16ea81cb |
| 2026-06-29 | **P1 — PageView.tsx StarterKit crash** — Import StarterKit from @tiptap/starter-kit | 873614dd |
