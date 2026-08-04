# ─── SpacetimeWiki ────────────────────────────────────────────────────────────
#
# SpacetimeDB-powered knowledge wiki with real-time collaborative editing.
# Outline-inspired UI, Tiptap editor, full-text search, granular permissions,
# SSO/OAuth/LDAP/SCIM, WebAuthn passkeys, MCP integration, and more.
#
# ═══════════════════════════════════════════════════════════════════════════════
# Version History
# ═══════════════════════════════════════════════════════════════════════════════

## [1.0.0] — 2026-08-03 — Initial public release

### Added
- Full wiki platform: pages, collections, tags, comments, favorites, templates,
  trash/restore, page history/revisions, attachments, and public share links
  (password + expiry + branding).
- Real-time collaborative editing via Yjs + SpacetimeDB WebSocket provider,
  presence cursors, and live subscriptions.
- Rich Tiptap editor: 14 custom extensions incl. Mermaid diagrams, KaTeX math,
  callouts, inline databases, image enhancement, and slash commands.
- Granular RBAC: global roles, collection-level permissions, per-page ACLs,
  and public/private table separation with a safe read bridge.
- Authentication & identity: email/password (Argon2id), WebAuthn passkeys,
  OAuth/OIDC, LDAP, SAML/SSO, SCIM provisioning, API keys (hashed at rest).
- Full-text search with token-based ranking and filters.
- FastAPI REST gateway (`/api/v1`) with rate limiting and API-key middleware.
- MCP server for AI-agent access (stdio): wiki_search, wiki_read,
  wiki_create/update/delete pages, and more.
- Docker Compose deployment (STDB + module publisher + API + frontend).
- i18n (react-i18next), accessibility (axe-tested), Playwright E2E suite,
  Vitest unit tests (1,365), Rust unit tests (246), Python tests (329).
- Agent onboarding: `AGENTS.md`, CI/CD workflows, GitHub templates, dependabot.

### Security
- Argon2id password hashing with legacy SHA-256 fallback verification.
- Secrets never stored in the public database tables (hash-only in private
  tables); API keys and share-link passwords are hash-compared in reducers.
- Private table columns are never bridged to the public read table.
- Optional hermes-id agent authentication (env-gated, disabled by default).
