# CLAUDE.md

SpacetimeWiki — Outline-inspired knowledge wiki powered by SpacetimeDB.

## Quick Reference

- **Stack**: SpacetimeDB (Rust module) + React/Vite/Tailwind (frontend) + Tiptap editor + FastAPI (REST) + MCP server (AI access)
- **README**: See [README.md](README.md) for full documentation
- **Agent onboarding**: See [AGENTS.md](AGENTS.md) for task-to-file mappings, workspace layout, and conventions
- **Roadmap**: See [ROADMAP.md](ROADMAP.md) for feature parity status
- **Contributing**: See [CONTRIBUTING.md](CONTRIBUTING.md)

## Key Commands

| Command | Description |
|---------|-------------|
| `make dev-up` | Start all services via Docker Compose |
| `make dev-down` | Stop services |
| `make build` | TypeScript check + Vite build |
| `make test` | Run Vitest frontend tests |
| `make lint` | ESLint check |
| `make fmt` | Format code (Prettier/cargo fmt) |
| `make fix` | Auto-fix lint + format |
| `make publish-module` | Publish SpacetimeDB Rust module |
| `make clean` | Clean build artifacts |

## Architecture Overview

- `web/` — React SPA (Vite on :5184)
- `server/spacetimedb/` — Rust module (tables + reducers)
- `server/api-server/` — FastAPI REST gateway (:8711)
- `server/mcp-server/` — MCP stdio server for AI agents
- `docker-compose.yml` — 4 services (STDB :3000/:3001 + publisher + API + frontend)
