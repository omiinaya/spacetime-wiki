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

- **Remaining raw-SQL interpolation outside lib/api closed** — the sqlLit
  sweep covered `src/lib/api/*.ts` but missed direct SQL builders in
  `AccessRequestPanel.tsx` (unescaped page_id/requester_id) and
  `SharedPageView.tsx` (manual `.replace` escaping). Both now use `sqlLit()`;
  a repo-wide scan confirms zero raw `${identifier}` SQL interpolations
  remain in `web/src`. Test mocks updated to provide `sqlLit`.
- **Frontend double-brace sqlInt leak** — the sqlInt hardening sweep emitted
  `{{sqlInt(limit)}}` (double braces) in audit.ts (4 sites) and settings.ts
  (2 sites). In a template literal `{{` renders literally, so the built SQL
  was `LIMIT {{100}}` — invalid on STDB. The type checker silently accepted
  it. Fixed to `${sqlInt(limit)}` and added `sql-template-hygiene.test.ts`
  which mocks fetch and asserts the actual SQL bytes sent (single-brace,
  no `{{`). Verified the emitted statement against live STDB.
- **STDB v2.6.1 SQL-compat + pagination repairs (API server + MCP server)** —
  exercising the MCP server against a _live_ STDB (its unit tests mock the
  HTTP client) surfaced four systemic bugs: ① MCP `_build_safe_sql` lacked the
  typed `?i/?f/?b` placeholders used by every paginated query (numeric LIMIT
  became a string literal → malformed SQL); ② STDB rejects OFFSET, and both
  servers' strip-then-slice handling returned **empty pages for any offset > 0** —
  new shared `resolve_statement_offset()` rewrites `LIMIT n OFFSET m` →
  `LIMIT n+m` then slices `[m:]`, fixing page 2/3/… everywhere; ③ MCP
  `get_backlinks`/`get_linked_pages` used rejected `text_content LIKE ?` →
  now filter in Python; ④ MCP `_validate_id` rejected `_` but every real genId
  is `prefix_<hex>` — ID-based tools were dead on real data. Also fixed MCP
  `wiki_health` (`SELECT 1` projection) and API search tag-filter
  (`SELECT 1 FROM page_tag`). Verified live: pagination returns distinct pages
  with no overlap; 129 MCP + 308 API tests pass.
- **Pre-commit Python gate silently skipped** — `.husky/pre-commit` called
  `python -m pytest`, but only `python3` exists on Debian hosts (PEP-668).
  The `PYTHON_CHANGED` branch never actually ran. Now uses `python3`,
  matching CI. Also fixed the lint-staged vitest invocation: it used the
  stale ROOT vitest hoist (`node ../node_modules/.bin/vitest`) which boots
  but cannot load jest-dom matchers (`Invalid Chai property:
toBeInTheDocument`) — every commit touching `web/src` failed the hook.
  Now points at web's own local binary.
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
- Python: 217 API unit + 118 MCP unit + 303 API-server router/unit tests + 86 live-STDB integration ✅
- Frontend Vitest: 1,377 ✅ (72 files) · tsc clean ✅
- Playwright E2E: runs chromium/firefox/webkit with an error-capturing
  fixture — chromium full suite green, cross-browser verified on the
  previously-flaky specs ✅

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
