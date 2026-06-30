# SpacetimeWiki — Improvement Backlog

Living queue managed by the continuous-improvement cron. The cron reads this file,
cleans up completed items, researches new improvement opportunities, adds them,
and works the top pending item each tick.

---

## PENDING

| 2026-06-30 | **P4 — Unit tests for PermalinkRedirect.tsx** — Very simple redirect page (22 lines). Test loading, error, and redirect scenarios. |
| 2026-06-30 | **P4 — Unit tests for SlugView.tsx** — Simple slug-to-id redirect page (21 lines). Test loading, error, and navigate scenarios. |
| 2026-06-30 | **P4 — Unit tests for FavoritesView.tsx** — Favorites listing page (111 lines). Test loading state, empty state, and populated state with grouped by collection. |
| 2026-06-30 | **P4 — Unit tests for HomeView.tsx** — Landing page (192 lines). Test empty welcome view, populated recent pages, trending, import MD flow. |
| 2026-06-30 | **P4 — Unit tests for SharedPageView.tsx** — Public share link viewer (236 lines). Test error, expiry, password prompt, page view, branding header. |
| 2026-06-30 | **P4 — Unit tests for LoginView.tsx** — Auth page with email/password, MFA, SSO buttons, OAuth/SAML callbacks. |
| 2026-06-30 | **P4 — Unit tests for ActivityView.tsx** — Activity feed page. |
| 2026-06-30 | **P4 — npm audit fix — `npm audit fix` to address reported vulnerabilities ** |
| 2026-06-30 | **P5 — npm dependency updates — update outdated deps (eslint, vite, tailwindcss, i18next, etc.)** |

---

## Recently Completed

| Date | Item | Commit |
|------|------|--------|
| 2026-06-30 | **P5 — Rust unit tests for tables.rs** — 40 tests: 36 table struct construction/validation tests + 4 edge case assertions. Uses `..default_*()` builder pattern with 36 default-instance helper functions. Covers all 36 table types (AuditEvent through OauthUser). Full suite 198/198 clean. | *new* |
| 2026-06-30 | **P5 — Rust unit tests for lib.rs** — 27 tests: slug generation (2), page status validation (5), webhook cleanup cutoff (1), search query processing (2), collection slug (1), invitation statuses (1), access request state machine (2), MFA types (1), notification event format (1), SCIM ops (1), watch targets (1), passkey purposes (1), DB view types (1), app settings keys (1), deprovision behaviors (1), OAuth types (1), AI roles (1), webhook event types (1), edge cases (2). Full suite 198/198 clean. | *new* |
| 2026-06-30 | **P5 — Rust unit tests for sso.rs** — Extracted 5 validation helpers (validate_url, validate_not_empty, validate_oauth_provider_type, default_oauth_scope, sanitize_role) and added 22 unit tests. Refactored 8 SSO reducers (SAML, OIDC, LDAP, OAuth CRUD) to use shared helpers. Rust suite now 131/131 clean. | c6624ae4 |
| 2026-06-30 | **P5 — TypeScript tests for 6 more Tiptap extensions** — Mermaid (6), MathInline (5), MathBlock (6), Transclusion (6), SyncedBlock (6), DatabaseBase (4), ImageEnhanced (7). Total 40 tests covering Node config, parseHTML, renderHTML, attributes, and custom getAttrs. Suite now 1062/1062 clean. | 8f27ff97 |
| 2026-06-30 | **P5 — TypeScript tests for lib/tiptap-helpers.ts** — 40 tests (tiptapToMarkdown complete impl, tiptapToHTML with callouts, htmlToProseMirror, markdownToProseMirror, arrayBufferToBase64Url). Suite now 1022/1022 clean. | 34381e54 |
| 2026-06-30 | **P5 — TypeScript tests for lib/ utility modules (5 files)** — helpers.ts (38), subscriptions.ts (23), yjs-stdb-provider.ts (18), useCollaboration.ts (12). Total 91 new tests. Full suite now 982/982 clean. | 668d0966 |
| 2026-06-30 | **P5 — TypeScript tests for admin components (15 files)** — 136 tests across all admin panels (AdminPanels, ApiKeySettings, UsersPanel, GroupsPanel, SettingsPanel, SsoPanel, OAuthSettings, LdapSettings, MfaSettings, PasskeySettings, ScimSettings, FeatureFlags, BulkExport, TrashSettings, InvitationSettings). All 23 test issues fixed — suite now 891/891 clean. | 89fc9502 |
| 2026-06-29 | **P4 — TypeScript tests for PageView.tsx** — 38 tests (loading, error, loaded, actions, comments, export, share, TOC, color picker, attachments, word count, revisions, a11y). Fixed 5 a11y violations (back button, emoji picker, send button, file input, editor aria-label) and heading level hierarchy. | 16ea81cb |
| 2026-06-29 | **P1 — PageView.tsx StarterKit crash** — Import StarterKit from @tiptap/starter-kit | 873614dd |
