# ─── SpacetimeWiki ────────────────────────────────────────────────────────────

#

# SpacetimeDB-powered knowledge wiki with real-time collaborative editing.

# Outline-inspired UI, Tiptap editor, full-text search, granular permissions,

# SSO/OAuth/LDAP/SCIM, WebAuthn passkeys, MCP integration, and more.

#

# ═══════════════════════════════════════════════════════════════════════════════

# Version History

# ═══════════════════════════════════════════════════════════════════════════════

## [Unreleased] — 2026-08-04

### Fixed

- **Hermetic Python test environment** — `mcp-server/requirements.txt` was
  missing (CI's `pip install -r mcp-server/requirements.txt` failed on fresh
  runners); `pytest-asyncio` was undeclared although both Python suites use
  `@pytest.mark.asyncio` (without it: 46 failures/errors). Added
  `server/requirements-dev.txt` (runtime + test deps) and wired CI to it.
- **MCP server mcp version pin** — server.py uses the mcp 1.x decorator API
  (`list_resources()`/`read_resource()`/`list_resource_templates()`/
  `list_tools()`); mcp 2.x removed those decorators and broke the server.
  Pinned `mcp>=1.12,<2.0` in mcp-server/requirements.txt.
- **Integration-test DB name** — `conftest.py` defaulted to `spacetime_wiki`
  (underscore), which SpacetimeDB rejects; now `spacetime-wiki` to match
  docker-compose, so bare `pytest` on the integration suites works.

### Changed

- **Frontend SQL injection hardening** — all 68 string values interpolated
  into STDB SQL queries across `src/lib/api/*.ts` (19 files) now go through
  the new `sqlLit()` escaper (doubles `'` and `\`, mirroring the API
  server's `_safe_quote`); all 7 numeric `LIMIT`/`OFFSET` slots use
  `sqlInt()`, which rejects non-finite input. Previously user-controlled
  input (page slugs from URLs, reaction emoji, settings keys, search
  terms) was concatenated raw into SQL strings — a SQL injection surface
  the Python backend had already closed with parameterized queries. New
  `src/test/sql-safety.test.ts` (12 tests) locks in the escaping.
- **Consolidated ~1,700 lines of repetitive Rust struct-construction tests**
  — deleted 39 `default_*()` helpers (pure `X::default()` wrappers) and 40
  per-struct construction tests that only re-asserted literals just written
  (zero behavioral coverage). Replaced with one parameterized
  default-constructibility smoke test over all 59 table structs.
  `tables.rs`: 1,745 → ~1,108 lines. Rust unit tests: 246 → 210 (all pass,
  clippy clean).

### Test status (verified 2026-08-04)

- Rust unit: 210 ✅ · clippy: 0 warnings ✅
- Python: 217 API unit + 118 MCP unit + 86 live-STDB integration ✅
- Frontend Vitest: 1,365 ✅ · Playwright E2E: 44 (webkit) ✅

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
  Vitest unit tests (1,365), Rust unit tests (210), Python tests (329).
- Agent onboarding: `AGENTS.md`, CI/CD workflows, GitHub templates, dependabot.

### Security

- Argon2id password hashing with legacy SHA-256 fallback verification.
- Secrets never stored in the public database tables (hash-only in private
  tables); API keys and share-link passwords are hash-compared in reducers.
- Private table columns are never bridged to the public read table.
- Optional hermes-id agent authentication (env-gated, disabled by default).
