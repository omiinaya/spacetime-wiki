---
name: SpacetimeWiki
description: "SpacetimeDB-powered knowledge wiki — Outline-inspired UI with Tiptap editor, feature parity with Outline, Docmost, Wiki.js, BookStack"
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
│   │   ├── components/           # ~20 reusable UI components
│   │   ├── pages/                # Route-level page components
│   │   ├── extensions/           # 14 custom Tiptap extensions
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
│   │   ├── src/lib.rs            # ~2525 lines: tables, reducers, logic
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
All `#[spacetimedb::reducer]` functions, init, table definitions — `server/spacetimedb/src/lib.rs` (2541 lines). Additional
logic is split across topic modules:

| File | Responsibility |
|------|---------------|
| `lib.rs` | All `#[spacetimedb::reducer]` functions, init, table definitions |
| `tables.rs` | Table schemas & struct definitions |
| `pages.rs` | Page creation, update, delete, restore, duplicate, move, status |
| `users.rs` | User create, update, avatar, roles |
| `helpers.rs` | Auth hashing, slug generation, IDs, validation (~41 tests) |
| `permissions.rs` | RBAC, per-page ACL, collection-level permissions |
| `attachments.rs` | File refs, blob storage, URL generation |
| `share_links.rs` | Public share links with password + expiration |
| `templates.rs` | Page template CRUD |
| `tags.rs` | Tag add/remove, batch operations |
| `comments.rs` | Comment CRUD on pages |
| `favorites.rs` | Favorite/unfavorite toggle |
| `api_keys.rs` | API key generate, revoke, hash validation |
| `sso.rs` | SSO/OAuth/OIDC/SAML/LDAP identity linking |
| `app_settings.rs` | Global app configuration |
| `collection_members.rs` | Collection user/group membership |
| `collaboration.rs` | Real-time Yjs collab: broadcast/join/leave/cursor, stale session & old update cleanup |

### Tiptap Editor (Frontend)
| File | Responsibility |
|------|---------------|
| `web/src/pages/PageEditor.tsx` | Main editor wrapper component |
| `web/src/extensions/*.tsx` | Custom Tiptap extensions (14 files) |
| `web/src/extensions/Mermaid.tsx` | Mermaid diagram rendering |
| `web/src/extensions/Math.tsx` | KaTeX math rendering |
| `web/src/extensions/Callout.ts` | Info/warning/success/error admonitions |
| `web/src/extensions/DatabaseBase.tsx` | Inline editable spreadsheets |

### Wiki Pages & Collections
| File | Responsibility |
|------|---------------|
| `web/src/pages/PageView.tsx` | Published page view component |
| `web/src/pages/HomeView.tsx` | Home/landing page |
| `web/src/components/GraphView.tsx` | Force-directed collection graph |
| `web/src/components/PageTags.tsx` | Tag management UI |
| `server/api-server/routers/pages.py` | Page REST routes |
| `server/api-server/routers/collections.py` | Collection REST routes |

### Authentication
| File | Responsibility |
|------|---------------|
| `server/spacetimedb/src/users.rs` | User reducers (create, auth) |
| `server/spacetimedb/src/sso.rs` | SSO/OAuth/OIDC/SAML/LDAP |
| `server/spacetimedb/src/api_keys.rs` | API key management |
| `server/spacetimedb/src/permissions.rs` | RBAC + ACL |
| `server/api-server/auth.py` | Bearer token + API key middleware |
| `web/src/pages/LoginView.tsx` | Login/register UI |
| `web/src/components/AdminDashboard.tsx` | User/role admin UI |

### Search
| File | Responsibility |
|------|---------------|
| `server/spacetimedb/src/lib.rs` | STDB full-text search reducers |
| `server/api-server/routers/search.py` | Search REST endpoint |
| `server/mcp-server/server.py` | `wiki_search` MCP tool |
| `web/src/components/SearchFilters.tsx` | Search UI with filters |

### API Routes (FastAPI)
| File | Route Prefix |
|------|-------------|
| `server/api-server/routers/pages.py` | `/api/v1/pages` |
| `server/api-server/routers/collections.py` | `/api/v1/collections` |
| `server/api-server/routers/search.py` | `/api/v1/search` |
| `server/api-server/routers/auth.py` | `/api/v1/auth` |
| `server/api-server/routers/users.py` | `/api/v1/users` |
| `server/api-server/routers/tags.py` | `/api/v1/tags` |
| `server/api-server/routers/attachments.py` | `/api/v1/attachments` |
| `server/api-server/routers/webhooks.py` | `/api/v1/webhooks` |
| `server/api-server/routers/admin.py` | `/api/v1/admin` |

### MCP Server (AI Agent Access)
| File | Responsibility |
|------|---------------|
| `server/mcp-server/server.py` | MCP tools + resource handlers |
| `server/mcp-server/stdb_client.py` | STDB HTTP client for MCP |
| `server/mcp-server/config.py` | Configuration |

MCP tools exposed: `wiki_search`, `wiki_read_page`, `wiki_list_collections`,
`wiki_list_pages`, `wiki_get_backlinks`, `wiki_get_linked_pages`.

---

## 4. Ports Table

| Service | Port(s) | Protocol | Notes |
|---------|---------|----------|-------|
| Vite dev server | 5184 | HTTP/HMR | `npm run dev` |
| nginx (Docker frontend) | 5184 | HTTP | Production SPA |
| SpacetimeDB WS | 3000 | WebSocket | Real-time sync |
| SpacetimeDB HTTP | 3001 | HTTP | REST/queries |
| FastAPI API server | 8711 | HTTP | REST gateway |
| MCP server | stdio | — | Stdio transport |

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

| Document | What It Covers |
|----------|---------------|
| [README.md](README.md) | Full project docs, quick start, features, API |
| [ROADMAP.md](ROADMAP.md) | Feature parity matrix with Outline/Docmost/Wiki.js/BookStack |
| [CONTRIBUTING.md](CONTRIBUTING.md) | Human + AI contribution guide |
| [CLAUDE.md](CLAUDE.md) | Short signpost for AI coding assistants |
| `.env.example` | All environment variables documented |
| `docker-compose.yml` | Service definitions and ports |
| `.github/workflows/ci.yml` | CI pipeline (tsc + tests + Rust build) |
| `server/api-server/openapi.json` | Full OpenAPI spec (when generated) |

---

## 9. Project Stats

| Metric | Count |
|--------|-------|
| **STDB Reducers** | 141 (68 in `lib.rs`, 73 across 14 module files) |
| **STDB Tables** | 50 (35 private, 15 remain public for SQL queries) |
| **Rust Tests** | 201 unit (Rust) + 12 integration (Python) |
| **Frontend Test Files** | 57 |
| **Frontend Tests** | 1,207 (Vitest) |
| **E2E Spec Files** | 14 |
| **E2E Test Cases** | 79 |
| **API Endpoints** | 52 (FastAPI REST gateway) |
| **MCP Tools** | 7 (`wiki_health`, `wiki_search`, `wiki_read_page`, `wiki_list_collections`, `wiki_list_pages`, `wiki_get_backlinks`, `wiki_get_linked_pages`) |

### Python / MCP Server Quality

| Component | Status |
|-----------|--------|
| **MCP server error handling** | ✅ DONE — full try/except + logging on all tools/resources + STDB client with retry |
| **MCP server pagination** | ✅ DONE — `limit` (default 50) and `offset` (default 0) on list/search tools |
| **API pagination** | ✅ DONE — pages.py has `limit`/`offset` params |
| **Python code quality** | ✅ Error handling done, pagination done — score: **85%** (ROADMAP) |



## Codebase Stats (test)

Write works
