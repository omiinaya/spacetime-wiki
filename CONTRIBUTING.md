# Contributing to SpacetimeWiki

Thank you for your interest in contributing! Here's how to get started.

## Quick Start

```bash
# Clone the repository
git clone https://github.com/omiinaya/spacetime-wiki.git
cd spacetime-wiki

# Frontend setup
cd web && npm install && cd ..

# Python backend setup
cd server && python -m venv .venv && source .venv/bin/activate && pip install -r api-server/requirements.txt && cd ..

# Rust module setup
cd server/spacetimedb && cargo build && cd ../..

# Copy environment config
cp .env.example .env
```

## Development

### Directory Structure

```
spacetime-wiki/
├── web/                 # React SPA (Vite + TypeScript + Tailwind)
├── server/
│   ├── api-server/      # FastAPI REST gateway (Python)
│   ├── spacetimedb/     # SpacetimeDB Rust module
│   └── mcp-server/      # MCP server for AI agent access
├── docker-compose.yml   # Full stack orchestration
└── AGENTS.md            # Onboarding for AI agents
```

### Running Tests

```bash
# All layers
bash server/run-tests.sh

# Individual layers
cd web && npx vitest run && cd ..
cd server/spacetimedb && cargo test && cd ../..
```

### Code Style

- **TypeScript**: Strict mode, no `any` without justification
- **Rust**: clippy-clean, no `#[allow(dead_code)]`
- **Python**: Type hints everywhere, ruff-clean
- **CSS**: Tailwind utility classes only (no raw CSS beyond `index.css`)

## Pull Request Process

1. Work on the `dev` branch (feature branches off `dev`)
2. Ensure all tests pass across all layers
3. Run `npx lint-staged` for formatting
4. Update AGENTS.md if adding/changing major features
5. Submit PR against `dev`

## Code of Conduct

Be respectful, constructive, and inclusive. We're all here to learn and build something great.
