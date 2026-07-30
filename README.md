# SpacetimeWiki

<!-- 
  This README was generated from live project inspection. 
  If you're an AI agent reading this: the source files are the truth.
-->

**Outline-inspired knowledge wiki powered by SpacetimeDB** — real-time collaborative editing, rich content blocks, full-text search, granular permissions, and AI agent integration via MCP.

| | |
|---|---|
| **Frontend** | React 19 + TypeScript + Vite 8 |
| **Editor** | Tiptap (ProseMirror) with real-time collaboration via Y.js |
| **Database** | SpacetimeDB v2.6.0 — WebSocket sync, reducers, SQL |
| **API Server** | Python (FastAPI) — REST gateway with rate limiting |
| **AI Access** | MCP Server — stdio transport, Hermes native client integration |
| **Tests** | Vitest (1,316 unit/component) + Playwright (E2E) + vitest-axe (a11y) |
| **CI** | GitHub Actions — tsc, 1,600+ tests, Rust build + clippy |
| **Docker** | `docker compose up` starts all 4 services |

---

## Quick Start

### Prerequisites

- Node.js 22+
- Rust 1.85+ (for the SpacetimeDB module)
- Docker (optional, for containerized dev)
- SpacetimeDB CLI (`cargo install spacetimedb-cli --version 2.6.0`)

### Local Development (without Docker)

```bash
# 1. Start SpacetimeDB
spacetime start --listen-addr 0.0.0.0:3001

# 2. Publish the module (in another terminal)
cd server/spacetimedb
spacetime publish --server http://localhost:3001 spacetime_wiki

# 3. Start the API server
cd server/api-server
pip install -r requirements.txt
STDB_HOST=localhost:3001 STDB_DATABASE=spacetime_wiki uvicorn main:app --port 8711 --reload

# 4. Start the frontend
cd web
npm install
npm run dev
```

Open **http://localhost:5184** (or whatever Vite assigns).

### Docker Compose (recommended)

```bash
cp .env.example .env
docker compose up
```

Starts all 4 services:
- **spacetimedb** — SpacetimeDB server on `:3000` (WS) / `:3001` (HTTP)
- **module-publisher** — one-shot: builds + publishes the Rust module (idempotent)
- **api-server** — FastAPI REST gateway on `:8711`
- **frontend** — nginx-served SPA on `:5184`, proxies `/api/` to the API server

---

## Architecture

```
┌─────────────────────────────────────────────────────────┐
│                    Browser (React SPA)                    │
│  Tiptap Editor │ Graph View │ Admin │ Login │ Shared     │
│       ┌──────────────┴───────────────┐                  │
│       │  Y.js (real-time collab)     │  REST (API calls) │
│       └──────────────┬───────────────┘ /api/*            │
└──────────────────────┼──────────────────────────────────┘
                       │ WS                     │
                       ▼                        ▼
┌──────────────────────────┐   ┌──────────────────────────┐
│     SpacetimeDB (:3001)   │   │   API Server (:8711)     │
│                          │   │   FastAPI + rate limit    │
│  Module (Rust)           │   │   REST / CRUD / Search    │
│  • Tables + Reducers     │   │   Auth (Bearer API keys)  │
│  • Y.js collab storage   │   │   Attachment proxy        │
│  • Full-text search      │   │   OAuth/OIDC/SAML/SCIM    │
│  • Permissions engine    │   └──────────┬───────────────┘
│  • Audit logging         │              │
│  • Webhook dispatch      │              │
└──────────────────────────┘              │
                                          ▼
                              ┌──────────────────────────┐
                              │   MCP Server (stdio)      │
                              │   AI agent gateway        │
                              │   wiki_search / read_page │
                              │   list_collections, etc.  │
                              └──────────────────────────┘
```

### Data Flow

1. **Page editing** uses Y.js via WebSocket to SpacetimeDB — changes are synced in real-time to all collaborators
2. **CRUD operations** (create page, manage collections, auth) go through the FastAPI REST gateway
3. **Search** runs via STDB's built-in full-text search, exposed through both REST and MCP endpoints
4. **AI agents** interact through the MCP stdio server, providing wiki_search, wiki_read_page, and other tools
5. **Attachments** are stored as STDB blob references, proxied through the API server

---

## Features

### Editor & Content

| Feature | Details |
|---------|---------|
| **Rich text editor** | Tiptap v3 (ProseMirror) — headings, bold/italic, lists, code blocks, blockquotes |
| **Real-time collaboration** | Y.js + SpacetimeDB — multiple users edit simultaneously, cursor presence |
| **Mermaid diagrams** | Render graphs, timelines, Gantt charts inline |
| **KaTeX math** | LaTeX math rendering in documents |
| **PlantUML** | UML diagrams from text descriptions |
| **Database bases** | Inline editable spreadsheets (like Notion databases) |
| **Image paste/upload** | Drag-and-drop, clipboard paste, file dialog, error toasts |
| **File attachments** | Upload and link files within pages |
| **Code syntax highlighting** | lowlight-based, supports 100+ languages |
| **Task lists** | Checkbox items with toggle state |
| **Tables** | Rich table editing with header/body/row support |
| **Callouts / Admonitions** | Info, warning, success, error block styles |
| **Details / Toggle blocks** | Collapsible sections |
| **Synced blocks** | Content blocks that appear (and stay in sync) across pages |
| **Video embeds** | Embed YouTube/Vimeo/etc. via URL |
| **Rich embeds** | Auto-expand links to preview cards |
| **Transclusion** | Include content from other pages inline |
| **Heading anchors** | Auto-generated IDs for deep linking |
| **Drag handle** | Reorder blocks by dragging |

### Wiki Features

| Feature | Details |
|---------|---------|
| **Collections** | Nested folder/category organization with icons |
| **Page templates** | Create pages from reusable templates |
| **Page revisions** | Full history with diffs, restore to any version |
| **Trash** | Soft-delete with restore and permanent delete |
| **Page icons + colors** | Emoji icons and accent colors per page |
| **Full-text search** | Title + body, filterable by collection, author, date, tags |
| **Watching** | Watch pages for changes with notification bell |
| **Favorites** | Bookmark pages for quick access |
| **Tags** | Multi-tag system per page with batch operations |
| **Backlinks** | See which pages link to the current one |
| **Collections graph** | Force-directed graph visualization of page connections |
| **Import / Export** | ZIP export (markdown + attachments), markdown import |
| **Activity feed** | Audit log of all page/collection/user activity |
| **AI Assistant** | Built-in AI chat per page for content assistance |
| **Keyboard shortcuts** | `⌘K` palette, `⌘S` save, `⌘P` publish, etc. |

### Authentication & Administration

| Feature | Details |
|---------|---------|
| **User registration & login** | Email + password, auto-seeded admin account |
| **Role-based access** | Admin / Editor / Viewer roles, global + per-collection |
| **API keys** | Generate scoped keys with SHA-256 hashing |
| **OAuth 2.0** | Google, GitHub, Discord, etc. (configurable provider) |
| **OIDC** | OpenID Connect single sign-on |
| **SAML** | Enterprise SAML 2.0 SSO |
| **SCIM** | User/group provisioning (Azure AD, Okta) |
| **LDAP** | Directory authentication |
| **WebAuthn / Passkeys** | Passwordless login (FIDO2) |
| **TOTP / MFA** | Time-based one-time passwords, backup codes |
| **Page permissions** | Per-page user/group access control |
| **Collection permissions** | Per-collection group-level read/write/manage |
| **Share links** | Public links with optional password + expiration |
| **Invitations** | Email-based invite flow with role selection |
| **Webhooks** | Event-driven HTTP callbacks (page create/update/delete) |
| **Admin dashboard** | User management, role assignments, avatar management, system settings |
| **Access requests** | Users can request access to restricted pages |
| **Audit log** | Full event history with actor, target, and metadata |

### AI Agent Integration (MCP)

The included MCP server exposes wiki tools over stdio transport:

- **wiki_search** — full-text search across all pages
- **wiki_read_page** — get page content by ID or slug
- **wiki_list_collections** — list all collections with hierarchy
- **wiki_list_pages** — list pages, filterable by collection
- **wiki_get_backlinks** — find pages linking to a given page
- **wiki_get_linked_pages** — find pages linked from a given page

Configure in Hermes Agent's `config.yaml`:

```yaml
tools:
  native_mcp:
    servers:
      spacetime-wiki:
        command: python
        args: ["/path/to/spacetime-wiki/server/mcp-server/server.py"]
```

---

## Project Structure

```
spacetime-wiki/
├── web/                          # React frontend (Vite)
│   ├── src/
│   │   ├── App.tsx               # Main SPA (router, sidebar, layout, state)
│   │   ├── main.tsx              # STDB connection, error boundary
│   │   ├── components/           # 20+ reusable UI components
│   │   │   ├── AdminDashboard.tsx
│   │   │   ├── GraphView.tsx
│   │   │   ├── ImageLightbox.tsx
│   │   │   ├── PageTags.tsx
│   │   │   ├── Toast.tsx
│   │   │   ├── WebhookSettings.tsx
│   │   │   ├── AccessRequestPanel.tsx
│   │   │   ├── AiAssistant.tsx
│   │   │   └── ...more
│   │   ├── pages/                # Route-level page components
│   │   │   ├── PageEditor.tsx    # Tiptap editor wrapper
│   │   │   ├── PageView.tsx      # Published page view
│   │   │   ├── HomeView.tsx
│   │   │   ├── LoginView.tsx
│   │   │   ├── SharedPageView.tsx
│   │   │   └── ...
│   │   ├── extensions/           # Tiptap custom extensions
│   │   │   ├── Mermaid.tsx       # Diagram rendering
│   │   │   ├── Math.tsx          # KaTeX math
│   │   │   ├── Callout.ts        # Admonition blocks
│   │   │   ├── DatabaseBase.tsx  # Inline spreadsheet
│   │   │   └── ... (14 total)
│   │   ├── lib/                  # API client, helpers, Y.js STDB provider
│   │   ├── i18n/                 # Internationalization (i18next)
│   │   ├── module_bindings/      # Auto-generated STDB TypeScript bindings
│   │   └── test/                 # Vitest unit + component tests
│   ├── e2e/                      # Playwright end-to-end tests
│   ├── Dockerfile                # Multi-stage: node build → nginx serve
│   ├── vite.config.ts
│   └── vitest.config.ts
│
├── server/
│   ├── api-server/               # FastAPI REST gateway (Python)
│   │   ├── main.py               # FastAPI app, middleware, routes
│   │   ├── routers/              # Route modules (pages, collections, auth, ...)
│   │   ├── models.py             # Pydantic models
│   │   ├── stdb_client.py        # STDB HTTP client wrapper
│   │   ├── auth.py               # Bearer token + API key auth
│   │   ├── config.py             # Environment-based config
│   │   ├── Dockerfile
│   │   └── requirements.txt
│   ├── spacetimedb/              # Rust module — tables, reducers, search
│   │   ├── src/lib.rs            # ~4500 lines: all tables, reducers, logic
│   │   ├── Cargo.toml
│   │   └── Dockerfile            # Build + publish via spacetime CLI
│   └── mcp-server/               # MCP server for AI agent integration
│       ├── server.py             # MCP tools + resources
│       ├── stdb_client.py
│       └── config.py
│
├── docker-compose.yml            # 4 services: STDB + publisher + API + frontend
├── .env.example                  # All configurable environment variables
├── .github/
│   ├── dependabot.yml            # Auto-update PRs for npm/Cargo/pip/Docker/Actions
│   └── workflows/ci.yml          # tsc + 84+ tests + Rust build
└── .husky/pre-commit             # Pre-commit hook: tsc + vitest + cargo check
```

---

## Development

### Project commands

```bash
# Frontend
cd web
npm run dev          # Start Vite dev server (HMR)
npm run build        # TypeScript check + production build
npm run test         # Run all Vitest tests (84+)
npm run test:watch   # Watch mode
npm run lint         # ESLint
npm run preview      # Serve built app (for E2E testing)

# API server (Python)
cd server/api-server
pip install -r requirements.txt
uvicorn main:app --port 8711 --reload

# Rust module
cd server/spacetimedb
spacetime build                           # Compile
spacetime publish --server http://...     # Publish to STDB

# MCP server (standalone)
python server/mcp-server/server.py

# E2E tests (requires built app)
cd web
npm run build
npx playwright install chromium
npx playwright test

# Docker
docker compose up                         # Start all services
docker compose run --rm spacetime-cli help # STDB CLI in container
```

### Pre-commit hooks

The repo uses Husky + lint-staged. On `git commit`, staged `.ts/.tsx` files are typechecked and tested, and Rust sources are `cargo check`-ed:

```bash
# Bypass hooks on an emergency commit
git commit --no-verify -m "msg"
```

### Environment variables

| Variable | Default | Description |
|----------|---------|-------------|
| `STDB_HOST` | `localhost:3001` | SpacetimeDB server address |
| `STDB_DATABASE` | `spacetime_wiki` | STDB database name |
| `API_PORT` | `8711` | FastAPI server port |
| `RATE_LIMIT` | `100/minute` | API rate limit |
| `VITE_STDB_HOST` | — | Frontend: STDB WS address (build arg) |
| `VITE_STDB_DB` | — | Frontend: STDB database name (build arg) |
| `VITE_API_BASE` | — | Frontend: API server URL (build arg) |
| `STDB_TOKEN` | — | Optional STDB auth token |

---

## Testing

| Layer | Framework | What's covered |
|-------|-----------|----------------|
| **Unit** | Vitest | Utility functions, helpers |
| **Component** | Vitest + testing-library + vitest-axe | UI components with accessibility assertions |
| **E2E** | Playwright | Full app flows against built SPA |

### Test suites (84+ tests, 7 suites)

| Suite | Tests | What it validates |
|-------|-------|-------------------|
| `ImageLightbox` | 25 | Open/close, keyboard nav, zoom/pan, comments, focus trap, a11y |
| `AdminDashboard` | 8 | Role display, user list, avatar mgmt, a11y |
| `AccessRequestPanel` | 12 | Request flow, access info display, a11y |
| `PageTags` | 12 | Tag adding/removal, batch operations, a11y |
| `Toast` | 8 | Timeout, stacking, types, progress bar, a11y |
| `attachments` | 3 | File URL generation |
| `utils` | — | General utility logic |
| **Playwright E2E** | 24 | Home page, navigation, page creation, mock mode |

```bash
# Run all unit/component tests
cd web && npm test

# Run E2E tests (requires built app + vite preview)
cd web
npm run build
npm run preview &  # starts on :4173
npx playwright test
```

### Accessibility

All components pass `vitest-axe` assertions with 0 violations. Run a11y tests:

```bash
cd web && npx vitest --reporter=verbose
```

---

## API Reference

The FastAPI REST gateway is documented at `/docs` (Swagger UI) when the API server is running. Key endpoints:

### Pages
| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/v1/pages` | List pages (filters: `collection_id`, `status`, `parent_page_id`) |
| GET | `/api/v1/pages/:id` | Get a single page |
| POST | `/api/v1/pages` | Create a page |
| PUT | `/api/v1/pages/:id` | Update a page |
| DELETE | `/api/v1/pages/:id` | Delete (or `?permanent=true` for hard delete) |
| POST | `/api/v1/pages/:id/restore` | Restore from trash |
| POST | `/api/v1/pages/:id/duplicate` | Duplicate |
| POST | `/api/v1/pages/:id/move` | Move to another collection |
| POST | `/api/v1/pages/:id/status` | Set status (draft/published/archived/deleted) |

### Collections, Search, Tags, Attachments, Users, Auth
Full OpenAPI spec at `server/api-server/openapi.json`.

---

## Configuration

### Docker Compose

Edit `.env` to customize ports, STDB address, or rate limits:

```bash
cp .env.example .env
# Edit .env with your values
docker compose up
```

### CI/CD

- **GitHub Actions** — runs on push/PR to `master`
- **Dependabot** — weekly auto-update PRs for npm, Cargo, pip, Docker, Actions

### Spacetime CLI

```bash
# Run spacetime CLI inside the Docker network
docker compose run --rm spacetime-cli help

# Publish module manually
cd server/spacetimedb
spacetime publish --server http://localhost:3001 spacetime_wiki

# Generate TypeScript bindings
spacetime generate --server http://localhost:3001 --out-dir web/src/module_bindings spacetime_wiki
```

---

## Contributing

1. Pick an item from `IMPROVEMENTS.md` (P5 items are good starting points)
2. Branch off `master`
3. Ensure pre-commit hooks pass (`tsc + vitest + cargo check`)
4. Open a PR — CI runs automatically

### Coding conventions

- **TypeScript**: Strict mode, no `any` without justification
- **Rust**: `clippy` clean, no `#[allow(dead_code)]` on unused items
- **Python**: Type hints everywhere, FastAPI patterns
- **CSS**: Tailwind utility classes, no raw CSS files
- **Tests**: New components should include vitest-axe a11y assertions

---

## Documentation Index

452|| Document | Purpose |
453||----------|---------|
454|| [README.md](README.md) | Full project overview, quick start, architecture, features, API reference |
455|| [AGENTS.md](AGENTS.md) | Agent-optimized onboarding — task-to-file mappings, workspace layout, conventions, pitfalls |
456|| [CLAUDE.md](CLAUDE.md) | Short signpost for AI coding assistants — key commands and architecture summary |
457|| [CONTRIBUTING.md](CONTRIBUTING.md) | Human and AI contributor guide — workflow, conventions, PR process |
458|| [ROADMAP.md](ROADMAP.md) | Feature parity matrix across Outline, Docmost, Wiki.js, BookStack |
459|| [IMPROVEMENTS.md](./IMPROVEMENTS.md) | Improvement backlog and good first issues |
460|| `.env.example` | All configurable environment variables with documentation |
461|| `docker-compose.yml` | Docker Compose services configuration and ports |
462|| `server/api-server/openapi.json` | Full OpenAPI spec (auto-generated by FastAPI) |
463|
464|---
465|
466|## License
467|
468|ISC — see [package.json](package.json).
469|
470|---
471|
472|## Related
473|
474|- [SpacetimeDB](https://spacetimedb.com) — the database that makes this possible
475|- [Outline](https://www.getoutline.com) — design inspiration
476|- [Hermes Agent](https://hermes-agent.nousresearch.com) — AI agent with native MCP support
477|

| [SETUP.md](./SETUP.md) | AI agents | Zero-to-running setup guide |