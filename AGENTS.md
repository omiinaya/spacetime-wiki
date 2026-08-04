---
name: SpacetimeWiki
description: 'SpacetimeDB-powered knowledge wiki — Outline-inspired UI with Tiptap editor, feature parity with Outline, Docmost, Wiki.js, BookStack'
stack: [rust, react, typescript, tiptap]
ports:
  frontend: 5184
  api: 8711
  stdb: 3001
  ws: 3000
deps: [node, npm, cargo, wasm32, spacetime]
stdb: true
---

# AGENTS.md — SpacetimeWiki Agent Onboarding

Welcome, AI agent. This file is your condensed onboarding to SpacetimeWiki. The
source files are the truth — use this as a quick-reference map, then read source
for details.

---

## 1. What Is This?

SpacetimeWiki is an Outline-inspired knowledge wiki with real-time collaborative
editing, rich content blocks, full-text search, granular permissions, and MCP
integration for AI agent access.

---

## 2. Workspace Layout

```
spacetime-wiki/
├── web/                          # React SPA (Vite :5184)
│   ├── src/
│   │   ├── App.tsx               # Router, sidebar, layout, global state
│   │   ├── main.tsx              # STDB connection init, error boundary
│   │   ├── components/           # ~27 reusable UI components
│   │   ├── pages/                # Route-level page components
│   │   ├── extensions/           # 15 custom Tiptap extensions
│   │   ├── lib/                  # API client, helpers, Y.js STDB provider
│   │   ├── i18n/                 # i18next translations
│   │   ├── module_bindings/      # Auto-generated STDB TS bindings
│   │   └── test/                 # Vitest unit + component tests
│   ├── e2e/                      # Playwright E2E tests
│   ├── Dockerfile                # Multi-stage: node build → nginx
│   ├── vite.config.ts            # Vite config (port 5184, /api proxy)
│   └── vitest.config.ts          # Vitest config (jsdom, globals)
│
├── server/
│   ├── api-server/               # FastAPI REST gateway (Python, :8711)
│   │   ├── main.py               # App, middleware, route mounting
│   │   ├── routers/              # Route modules per resource
│   │   ├── models.py             # Pydantic models
│   │   ├── stdb_client.py        # STDB HTTP client wrapper
│   │   ├── auth.py               # Bearer + API key auth
│   │   └── config.py             # Env-based config
│   ├── spacetimedb/              # Rust module — tables + reducers
│   │   ├── src/lib.rs            # 2782 lines: tables, reducers, logic
│   │   ├── src/tables.rs         # Table schemas (pages, collections, users...)
│   │   ├── src/pages.rs          # Page CRUD reducers
│   │   ├── src/users.rs          # User management reducers
│   │   ├── src/helpers.rs        # Utility functions (~41 tests)
│   │   ├── src/permissions.rs    # RBAC + per-page/collection permissions
│   │   ├── src/attachments.rs    # File attachment handling
│   │   ├── src/share_links.rs    # Public share link logic
│   │   ├── src/templates.rs      # Page templates
│   │   ├── src/tags.rs           # Tag system
│   │   ├── src/comments.rs       # Page comments
│   │   ├── src/favorites.rs      # Favorite/bookmark pages
│   │   ├── src/api_keys.rs       # API key management
│   │   ├── src/sso.rs            # SSO/OAuth/OIDC/SAML
│   │   ├── src/app_settings.rs   # App-wide settings
│   │   ├── src/collection_members.rs # Collection membership
│   │   ├── src/collaboration.rs  # Real-time Yjs collab + cursor sync
│   │   └── Cargo.toml            # Dependencies
│   └── mcp-server/               # MCP server for AI agents (stdio)
│       ├── server.py             # MCP tools + resource handlers
│       ├── stdb_client.py        # STDB HTTP client
│       └── config.py             # Server config
│
├── docker-compose.yml            # 4 services + CLI utility
├── .env.example                  # All configurable env vars
├── .github/workflows/ci.yml      # CI: tsc + tests + Rust build
├── .github/workflows/deploy.yml   # Deploy: Docker build, push, docker compose
├── .github/workflows/release.yml  # Release: Docker build + GitHub Release creation
└── .husky/pre-commit             # Pre-commit: tsc + vitest + cargo check
```

## 3. Task-to-File Mapping

### STDB Reducers (SpacetimeDB Rust module)

All `#[spacetimedb::reducer]` functions, init, table definitions — `server/spacetimedb/src/lib.rs` (2703 lines). Additional
logic is split across topic modules:

| File                    | Responsibility                                                                        |
| ----------------------- | ------------------------------------------------------------------------------------- |
| `lib.rs`                | All `#[spacetimedb::reducer]` functions, init, table definitions                      |
| `tables.rs`             | Table schemas & struct definitions                                                    |
| `pages.rs`              | Page creation, update, delete, restore, duplicate, move, status                       |
| `users.rs`              | User create, update, avatar, roles                                                    |
| `helpers.rs`            | Auth hashing, slug generation, IDs, validation (~41 tests)                            |
| `permissions.rs`        | RBAC, per-page ACL, collection-level permissions                                      |
| `attachments.rs`        | File refs, blob storage, URL generation                                               |
| `share_links.rs`        | Public share links with password + expiration                                         |
| `templates.rs`          | Page template CRUD                                                                    |
| `tags.rs`               | Tag add/remove, batch operations                                                      |
| `comments.rs`           | Comment CRUD on pages                                                                 |
| `favorites.rs`          | Favorite/unfavorite toggle                                                            |
| `api_keys.rs`           | API key generate, revoke, hash validation                                             |
| `sso.rs`                | SSO/OAuth/OIDC/SAML/LDAP identity linking                                             |
| `app_settings.rs`       | Global app configuration                                                              |
| `read_bridge.rs`        | Private-table read bridge: `bridge_read` reducer + safe-column whitelist              |
| `collection_members.rs` | Collection user/group membership                                                      |
| `collaboration.rs`      | Real-time Yjs collab: broadcast/join/leave/cursor, stale session & old update cleanup |

### Tiptap Editor (Frontend)

| File                                  | Responsibility                         |
| ------------------------------------- | -------------------------------------- |
| `web/src/pages/PageEditor.tsx`        | Main editor wrapper component          |
| `web/src/extensions/*.tsx`            | Custom Tiptap extensions (15 files)    |
| `web/src/extensions/Mermaid.tsx`      | Mermaid diagram rendering              |
| `web/src/extensions/Math.tsx`         | KaTeX math rendering                   |
| `web/src/extensions/Callout.ts`       | Info/warning/success/error admonitions |
| `web/src/extensions/DatabaseBase.tsx` | Inline editable spreadsheets           |

### Wiki Pages & Collections

| File                                       | Responsibility                  |
| ------------------------------------------ | ------------------------------- |
| `web/src/pages/PageView.tsx`               | Published page view component   |
| `web/src/pages/HomeView.tsx`               | Home/landing page               |
| `web/src/components/GraphView.tsx`         | Force-directed collection graph |
| `web/src/components/PageTags.tsx`          | Tag management UI               |
| `server/api-server/routers/pages.py`       | Page REST routes                |
| `server/api-server/routers/collections.py` | Collection REST routes          |

### Authentication

| File                                    | Responsibility                    |
| --------------------------------------- | --------------------------------- |
| `server/spacetimedb/src/users.rs`       | User reducers (create, auth)      |
| `server/spacetimedb/src/sso.rs`         | SSO/OAuth/OIDC/SAML/LDAP          |
| `server/spacetimedb/src/api_keys.rs`    | API key management                |
| `server/spacetimedb/src/permissions.rs` | RBAC + ACL                        |
| `server/api-server/auth.py`             | Bearer token + API key middleware |
| `web/src/pages/LoginView.tsx`           | Login/register UI                 |
| `web/src/components/AdminDashboard.tsx` | User/role admin UI                |

### Search

| File                                   | Responsibility                 |
| -------------------------------------- | ------------------------------ |
| `server/spacetimedb/src/lib.rs`        | STDB full-text search reducers |
| `server/api-server/routers/search.py`  | Search REST endpoint           |
| `server/mcp-server/server.py`          | `wiki_search` MCP tool         |
| `web/src/components/SearchFilters.tsx` | Search UI with filters         |

### API Routes (FastAPI)

| File                                       | Route Prefix                                                                   |
| ------------------------------------------ | ------------------------------------------------------------------------------ |
| `server/api-server/routers/pages.py`       | `/api/v1/pages` (includes comments, tags, attachments, share-links, revisions) |
| `server/api-server/routers/collections.py` | `/api/v1/collections`                                                          |
| `server/api-server/routers/search.py`      | `/api/v1/search`                                                               |
| `server/api-server/routers/auth.py`        | `/api/v1/auth`                                                                 |
| `server/api-server/routers/oauth.py`       | `/api/v1/oauth`                                                                |
| `server/api-server/routers/webauthn.py`    | `/api/v1/webauthn`                                                             |
| `server/api-server/routers/ldap_auth.py`   | `/api/v1/auth/ldap`                                                            |
| `server/api-server/routers/scim.py`        | `/api/v1/scim`                                                                 |
| `server/api-server/routers/imports.py`     | `/api/v1/imports`                                                              |

### MCP Server (AI Agent Access)

| File                               | Responsibility                |
| ---------------------------------- | ----------------------------- |
| `server/mcp-server/server.py`      | MCP tools + resource handlers |
| `server/mcp-server/stdb_client.py` | STDB HTTP client for MCP      |
| `server/mcp-server/config.py`      | Configuration                 |

MCP tools exposed: `wiki_search`, `wiki_read_page`, `wiki_list_collections`,
`wiki_list_pages`, `wiki_get_backlinks`, `wiki_get_linked_pages`.

---

## 4. Ports Table

| Service                 | Port(s) | Protocol  | Notes           |
| ----------------------- | ------- | --------- | --------------- |
| Vite dev server         | 5184    | HTTP/HMR  | `npm run dev`   |
| nginx (Docker frontend) | 5184    | HTTP      | Production SPA  |
| SpacetimeDB WS          | 3000    | WebSocket | Real-time sync  |
| SpacetimeDB HTTP        | 3001    | HTTP      | REST/queries    |
| FastAPI API server      | 8711    | HTTP      | REST gateway    |
| MCP server              | stdio   | —         | Stdio transport |

---

## 5. Quick Reference — Data Flow

1. **Page editing**: Browser → Y.js WebSocket → SpacetimeDB (:3000) → syncs to
   all collaborators in real time
2. **CRUD operations**: Browser → REST → FastAPI (:8711) → STDB HTTP (:3001)
3. **Search**: Browser/MCP → STDB full-text query → results via REST/MCP
4. **AI access**: AI Agent → MCP stdio server → STDB client → STDB HTTP (:3001)
5. **Auth tokens**: FastAPI validates Bearer tokens/API keys → STDB user lookup

---

## 6. Conventions

### TypeScript

- Strict mode, no `any` without justification
- Functional components with hooks
- Tailwind utility classes only (no raw CSS)
- i18n via `react-i18next`

### Rust

- `clippy`-clean, no `#[allow(dead_code)]` on unused items
- Reducers in `lib.rs` with `#[spacetimedb::reducer]`
- Tests via `#[cfg(test)] mod tests { ... }`

### Python

- Type hints everywhere
- FastAPI patterns (Pydantic models, router modules)
- Async-first where possible

### Testing

- New components: include `vitest-axe` a11y assertions
- Run: `make test` (Vitest), `make module-test` (Rust), `make test-e2e` (Playwright)
- Pre-commit: `tsc --noEmit + vitest + cargo check`

---

## 7. Pitfalls

- **STDB token auth**: If `STDB_TOKEN` is set, all module communications require
  it. `VITE_STDB_TOKEN` must match for the frontend.
- **Docker VITE vars**: `VITE_*` vars are build-time args in Docker. Changing
  them requires `docker compose build frontend` to take effect.
- **STDB host**: Default `spacetimedb:3001` only works inside Docker network.
  For local dev, set `STDB_HOST=localhost:3001`.
- **Module publish idempotency**: `module-publisher` skips if DB exists — force
  republish via `docker compose run module-publisher` or `spacetime publish`.
- **E2E tests**: Require a built app (`npm run build`) and running preview
  server before `npx playwright test`.
- **Rust tests**: `cargo test` may not work outside the `spacetime` context for
  integration-style tests; use `spacetime test` if available.

---

## 8. Doc Index

| Document                           | What It Covers                                               |
| ---------------------------------- | ------------------------------------------------------------ |
| [README.md](README.md)             | Full project docs, quick start, features, API                |
| [ROADMAP.md](ROADMAP.md)           | Feature parity matrix with Outline/Docmost/Wiki.js/BookStack |
| [CONTRIBUTING.md](CONTRIBUTING.md) | Human + AI contribution guide                                |
| [CLAUDE.md](CLAUDE.md)             | Short signpost for AI coding assistants                      |
| `.env.example`                     | All environment variables documented                         |
| `docker-compose.yml`               | Service definitions and ports                                |
| `.github/workflows/ci.yml`         | CI pipeline (tsc + tests + Rust build)                       |
| `server/api-server/openapi.json`   | Full OpenAPI spec (when generated)                           |

---

## 9. Project Stats

| Metric                | Count                                                                                                                                         |
| --------------------- | --------------------------------------------------------------------------------------------------------------------------------------------- |
| **STDB Reducers**     | 152 (72 in `lib.rs`, 80 across 17 module files)                                                                                               |
| **STDB Tables**       | 59 (credential split: 14 private tables + secret bridges; public read-bridge pattern)                                                         |
| **Rust Tests**        | 210 unit ✅                                                                                                                                   |
| **Python Unit Tests** | 329 (211 API server + 118 MCP server) ✅                                                                                                      |
|                       | **Frontend Test Files**                                                                                                                       | **71** (65 component + 6 Tiptap extension test files)                                              |
|                       | **Frontend Tests**                                                                                                                            | **1,365** ✅ (1,296 component + 69 extension/helper tests) — 0 flaky, 0 skipped, 0 soft assertions |     |
| **E2E Spec Files**    | 14                                                                                                                                            |
| **E2E Test Cases**    | 79                                                                                                                                            |
| **API Endpoints**     | 52 (FastAPI REST gateway)                                                                                                                     |
| **MCP Tools**         | 7 (`wiki_health`, `wiki_search`, `wiki_read_page`, `wiki_list_collections`, `wiki_list_pages`, `wiki_get_backlinks`, `wiki_get_linked_pages`) |

### Python / MCP Server Quality

| Component                     | Status                                                                              |
| ----------------------------- | ----------------------------------------------------------------------------------- |
| **MCP server error handling** | ✅ DONE — full try/except + logging on all tools/resources + STDB client with retry |
| **MCP server pagination**     | ✅ DONE — `limit` (default 50) and `offset` (default 0) on list/search tools        |
| **API pagination**            | ✅ DONE — pages.py has `limit`/`offset` params                                      |
| **Python test coverage**      | ✅ DONE — 329 unit tests across all 19 Python source modules                        |
| **Python code quality**       | ✅ Error handling done, pagination done, no broad except, no SQL injection          |

## Codebase Stats (last updated: 2026-08-04)

| File                    | Lines | Purpose                                                                      |
| ----------------------- | ----- | ---------------------------------------------------------------------------- |
| `lib.rs`                | 2782  | Crate root, reducer functions, init, table definitions                       |
| `tables.rs`             | 1108  | Table schemas & struct definitions                                           |
| `sso.rs`                | 890   | SSO/OAuth/OIDC/SAML/LDAP identity linking                                    |
| `helpers.rs`            | 610   | Auth hashing (argon2, sha2 0.11, hmac 0.13, sha1 0.11), slug generation, IDs |
| `read_bridge.rs`        | 477   | Private-table read bridge: `bridge_read` reducer + safe-column whitelist     |
| `pages.rs`              | 448   | Page CRUD, restore, duplicate, move, status                                  |
| `permissions.rs`        | 441   | RBAC, per-page ACL, collection-level permissions                             |
| `collaboration.rs`      | 316   | Real-time Yjs collab: broadcast/join/leave/cursor, stale session cleanup     |
| `share_links.rs`        | 209   | Public share links with password + expiration                                |
| `comments.rs`           | 205   | Comment CRUD on pages                                                        |
| `users.rs`              | 176   | User create, update, avatar, roles                                           |
| `api_keys.rs`           | 158   | API key generate, revoke, hash validation                                    |
| `app_settings.rs`       | 140   | Global app configuration                                                     |
| `collection_members.rs` | 138   | Collection user/group membership                                             |
| `attachments.rs`        | 109   | File refs, blob storage, URL generation                                      |
| `templates.rs`          | 101   | Page template CRUD                                                           |
| `favorites.rs`          | 85    | Favorite/unfavorite toggle                                                   |
| `tags.rs`               | 72    | Tag add/remove, batch operations                                             |

**Total lines of Rust:** 8,498

## Module Map

server/spacetimedb/src/
├── lib.rs
├── api_keys.rs
├── app_settings.rs
├── attachments.rs
├── collection_members.rs
├── collaboration.rs
├── comments.rs
├── favorites.rs
├── helpers.rs
├── pages.rs
├── permissions.rs
├── read_bridge.rs
├── share_links.rs
├── sso.rs
├── tables.rs
├── tags.rs
├── templates.rs
└── users.rs
