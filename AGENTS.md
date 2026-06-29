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

1|# AGENTS.md — SpacetimeWiki Agent Onboarding
2|
3|Welcome, AI agent. This file is your condensed onboarding to SpacetimeWiki. The
4|source files are the truth — use this as a quick-reference map, then read source
5|for details.
6|
7|---
8|
9|## 1. What Is This?
10|
11|SpacetimeWiki is an Outline-inspired knowledge wiki with real-time collaborative
12|editing, rich content blocks, full-text search, granular permissions, and MCP
13|integration for AI agent access.
14|
15|---
16|
17|## 2. Workspace Layout
18|
19|```
20|spacetime-wiki/
21|├── web/                          # React SPA (Vite :5184)
22|│   ├── src/
23|│   │   ├── App.tsx               # Router, sidebar, layout, global state
24|│   │   ├── main.tsx              # STDB connection init, error boundary
25|│   │   ├── components/           # ~20 reusable UI components
26|│   │   ├── pages/                # Route-level page components
27|│   │   ├── extensions/           # 14 custom Tiptap extensions
28|│   │   ├── lib/                  # API client, helpers, Y.js STDB provider
29|│   │   ├── i18n/                 # i18next translations
30|│   │   ├── module_bindings/      # Auto-generated STDB TS bindings
31|│   │   └── test/                 # Vitest unit + component tests
32|│   ├── e2e/                      # Playwright E2E tests
33|│   ├── Dockerfile                # Multi-stage: node build → nginx
34|│   ├── vite.config.ts            # Vite config (port 5184, /api proxy)
35|│   └── vitest.config.ts          # Vitest config (jsdom, globals)
36|│
37|├── server/
38|│   ├── api-server/               # FastAPI REST gateway (Python, :8711)
39|│   │   ├── main.py               # App, middleware, route mounting
40|│   │   ├── routers/              # Route modules per resource
41|│   │   ├── models.py             # Pydantic models
42|│   │   ├── stdb_client.py        # STDB HTTP client wrapper
43|│   │   ├── auth.py               # Bearer + API key auth
44|│   │   └── config.py             # Env-based config
45|│   ├── spacetimedb/              # Rust module — tables + reducers
46|│   │   ├── src/lib.rs            # ~4500 lines: all tables, reducers, logic
47|│   │   ├── src/tables.rs         # Table schemas (pages, collections, users...)
48|│   │   ├── src/pages.rs          # Page CRUD reducers
49|│   │   ├── src/users.rs          # User management reducers
50|│   │   ├── src/helpers.rs        # Utility functions (~200 tests)
51|│   │   ├── src/permissions.rs    # RBAC + per-page/collection permissions
52|│   │   ├── src/attachments.rs    # File attachment handling
53|│   │   ├── src/share_links.rs    # Public share link logic
54|│   │   ├── src/templates.rs      # Page templates
55|│   │   ├── src/tags.rs           # Tag system
56|│   │   ├── src/comments.rs       # Page comments
57|│   │   ├── src/favorites.rs      # Favorite/bookmark pages
58|│   │   ├── src/api_keys.rs       # API key management
59|│   │   ├── src/sso.rs            # SSO/OAuth/OIDC/SAML
60|│   │   ├── src/app_settings.rs   # App-wide settings
61|│   │   ├── src/collection_members.rs # Collection membership
62|│   │   └── Cargo.toml            # Dependencies
63|│   └── mcp-server/               # MCP server for AI agents (stdio)
64|│       ├── server.py             # MCP tools + resource handlers
65|│       ├── stdb_client.py        # STDB HTTP client
66|│       └── config.py             # Server config
67|│
68|├── docker-compose.yml            # 4 services + CLI utility
69|├── .env.example                  # All configurable env vars
70|├── .github/workflows/ci.yml      # CI: tsc + tests + Rust build
71|└── .husky/pre-commit             # Pre-commit: tsc + vitest + cargo check
72|```
73|
74|---
75|
76|## 3. Task-to-File Mapping
77|
78|### STDB Reducers (SpacetimeDB Rust module)
79|All reducers live in `server/spacetimedb/src/lib.rs` (~4500 lines). Additional
80|logic is split across topic modules:
81|
82|| File | Responsibility |
83||------|---------------|
84|| `lib.rs` | All `#[spacetimedb::reducer]` functions, init, table definitions |
85|| `tables.rs` | Table schemas & struct definitions |
86|| `pages.rs` | Page creation, update, delete, restore, duplicate, move, status |
87|| `users.rs` | User create, update, avatar, roles |
88|| `helpers.rs` | Auth hashing, slug generation, IDs, validation (~200 tests) |
89|| `permissions.rs` | RBAC, per-page ACL, collection-level permissions |
90|| `attachments.rs` | File refs, blob storage, URL generation |
91|| `share_links.rs` | Public share links with password + expiration |
92|| `templates.rs` | Page template CRUD |
93|| `tags.rs` | Tag add/remove, batch operations |
94|| `comments.rs` | Comment CRUD on pages |
95|| `favorites.rs` | Favorite/unfavorite toggle |
96|| `api_keys.rs` | API key generate, revoke, hash validation |
97|| `sso.rs` | OAuth/OIDC/SAML/LDAP identity linking |
98|| `app_settings.rs` | Global app configuration |
99|| `collection_members.rs` | Collection user/group membership |
100|
101|### Tiptap Editor (Frontend)
102|| File | Responsibility |
103||------|---------------|
104|| `web/src/pages/PageEditor.tsx` | Main editor wrapper component |
105|| `web/src/extensions/*.tsx` | Custom Tiptap extensions (14 files) |
106|| `web/src/extensions/Mermaid.tsx` | Mermaid diagram rendering |
107|| `web/src/extensions/Math.tsx` | KaTeX math rendering |
108|| `web/src/extensions/Callout.ts` | Info/warning/success/error admonitions |
109|| `web/src/extensions/DatabaseBase.tsx` | Inline editable spreadsheets |
110|
111|### Wiki Pages & Collections
112|| File | Responsibility |
113||------|---------------|
114|| `web/src/pages/PageView.tsx` | Published page view component |
115|| `web/src/pages/HomeView.tsx` | Home/landing page |
116|| `web/src/components/GraphView.tsx` | Force-directed collection graph |
117|| `web/src/components/PageTags.tsx` | Tag management UI |
118|| `server/api-server/routers/pages.py` | Page REST routes |
119|| `server/api-server/routers/collections.py` | Collection REST routes |
120|
121|### Authentication
122|| File | Responsibility |
123||------|---------------|
124|| `server/spacetimedb/src/users.rs` | User reducers (create, auth) |
125|| `server/spacetimedb/src/sso.rs` | SSO/OAuth/OIDC/SAML/LDAP |
126|| `server/spacetimedb/src/api_keys.rs` | API key management |
127|| `server/spacetimedb/src/permissions.rs` | RBAC + ACL |
128|| `server/api-server/auth.py` | Bearer token + API key middleware |
129|| `web/src/pages/LoginView.tsx` | Login/register UI |
130|| `web/src/components/AdminDashboard.tsx` | User/role admin UI |
131|
132|### Search
133|| File | Responsibility |
134||------|---------------|
135|| `server/spacetimedb/src/lib.rs` | STDB full-text search reducers |
136|| `server/api-server/routers/search.py` | Search REST endpoint |
137|| `server/mcp-server/server.py` | `wiki_search` MCP tool |
138|| `web/src/components/SearchFilters.tsx` | Search UI with filters |
139|
140|### API Routes (FastAPI)
141|| File | Route Prefix |
142||------|-------------|
143|| `server/api-server/routers/pages.py` | `/api/v1/pages` |
144|| `server/api-server/routers/collections.py` | `/api/v1/collections` |
145|| `server/api-server/routers/search.py` | `/api/v1/search` |
146|| `server/api-server/routers/auth.py` | `/api/v1/auth` |
147|| `server/api-server/routers/users.py` | `/api/v1/users` |
148|| `server/api-server/routers/tags.py` | `/api/v1/tags` |
149|| `server/api-server/routers/attachments.py` | `/api/v1/attachments` |
150|| `server/api-server/routers/webhooks.py` | `/api/v1/webhooks` |
151|| `server/api-server/routers/admin.py` | `/api/v1/admin` |
152|
153|### MCP Server (AI Agent Access)
154|| File | Responsibility |
155||------|---------------|
156|| `server/mcp-server/server.py` | MCP tools + resource handlers |
157|| `server/mcp-server/stdb_client.py` | STDB HTTP client for MCP |
158|| `server/mcp-server/config.py` | Configuration |
159|
160|MCP tools exposed: `wiki_search`, `wiki_read_page`, `wiki_list_collections`,
161|`wiki_list_pages`, `wiki_get_backlinks`, `wiki_get_linked_pages`.
162|
163|---
164|
165|## 4. Ports Table
166|
167|| Service | Port(s) | Protocol | Notes |
168||---------|---------|----------|-------|
169|| Vite dev server | 5184 | HTTP/HMR | `npm run dev` |
170|| nginx (Docker frontend) | 5184 | HTTP | Production SPA |
171|| SpacetimeDB WS | 3000 | WebSocket | Real-time sync |
172|| SpacetimeDB HTTP | 3001 | HTTP | REST/queries |
173|| FastAPI API server | 8711 | HTTP | REST gateway |
174|| MCP server | stdio | — | Stdio transport |
175|
176|---
177|
178|## 5. Quick Reference — Data Flow
179|
180|1. **Page editing**: Browser → Y.js WebSocket → SpacetimeDB (:3000) → syncs to
181|   all collaborators in real time
182|2. **CRUD operations**: Browser → REST → FastAPI (:8711) → STDB HTTP (:3001)
183|3. **Search**: Browser/MCP → STDB full-text query → results via REST/MCP
184|4. **AI access**: AI Agent → MCP stdio server → STDB client → STDB HTTP (:3001)
185|5. **Auth tokens**: FastAPI validates Bearer tokens/API keys → STDB user lookup
186|
187|---
188|
189|## 6. Conventions
190|
191|### TypeScript
192|- Strict mode, no `any` without justification
193|- Functional components with hooks
194|- Tailwind utility classes only (no raw CSS)
195|- i18n via `react-i18next`
196|
197|### Rust
198|- `clippy`-clean, no `#[allow(dead_code)]` on unused items
199|- Reducers in `lib.rs` with `#[spacetimedb::reducer]`
200|- Tests via `#[cfg(test)] mod tests { ... }`
201|
202|### Python
203|- Type hints everywhere
204|- FastAPI patterns (Pydantic models, router modules)
205|- Async-first where possible
206|
207|### Testing
208|- New components: include `vitest-axe` a11y assertions
209|- Run: `make test` (Vitest), `make module-test` (Rust), `make test-e2e` (Playwright)
210|- Pre-commit: `tsc --noEmit + vitest + cargo check`
211|
212|---
213|
214|## 7. Pitfalls
215|
216|- **STDB token auth**: If `STDB_TOKEN` is set, all module communications require
217|  it. `VITE_STDB_TOKEN` must match for the frontend.
218|- **Docker VITE vars**: `VITE_*` vars are build-time args in Docker. Changing
219|  them requires `docker compose build frontend` to take effect.
220|- **STDB host**: Default `spacetimedb:3001` only works inside Docker network.
221|  For local dev, set `STDB_HOST=localhost:3001`.
222|- **Module publish idempotency**: `module-publisher` skips if DB exists — force
223|  republish via `docker compose run module-publisher` or `spacetime publish`.
224|- **E2E tests**: Require a built app (`npm run build`) and running preview
225|  server before `npx playwright test`.
226|- **Rust tests**: `cargo test` may not work outside the `spacetime` context for
227|  integration-style tests; use `spacetime test` if available.
228|
229|---
230|
231|## 8. Doc Index
232|
233|| Document | What It Covers |
234||----------|---------------|
235|| [README.md](README.md) | Full project docs, quick start, features, API |
236|| [ROADMAP.md](ROADMAP.md) | Feature parity matrix with Outline/Docmost/Wiki.js/BookStack |
237|| [CONTRIBUTING.md](CONTRIBUTING.md) | Human + AI contribution guide |
238|| [CLAUDE.md](CLAUDE.md) | Short signpost for AI coding assistants |
239|| `.env.example` | All environment variables documented |
240|| `docker-compose.yml` | Service definitions and ports |
241|| `.github/workflows/ci.yml` | CI pipeline (tsc + tests + Rust build) |
242|| `server/api-server/openapi.json` | Full OpenAPI spec (when generated) |
243|