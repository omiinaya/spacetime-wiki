# Contributing to SpacetimeWiki

Thanks for your interest in contributing! This project is an Outline-inspired knowledge wiki built on SpacetimeDB, React/Vite/Tailwind, and Tiptap.

---

## Table of Contents

- [Getting Started](#getting-started)
- [Development Workflow](#development-workflow)
- [Coding Conventions](#coding-conventions)
- [Testing](#testing)
- [Pull Request Process](#pull-request-process)
- [AI Agent Contributors](#ai-agent-contributors)

---

## Getting Started

1. **Prerequisites**: Node.js 22+, Rust 1.85+, Docker (optional), SpacetimeDB CLI 2.6.0
2. **Fork & clone** this repository
3. **Branch off `dev`**: `git checkout -b feat/my-feature dev`
4. **Install dependencies**: `cd web && npm install`
5. **Start development** (see [README.md](README.md#quick-start) for full instructions)

New to the project? Check [ROADMAP.md](./ROADMAP.md) for improvement items and good first issues (P4-P5 items are ideal starting points).

---

## Development Workflow

```bash
# Frontend (Vite dev server with HMR on :5184)
make dev          # alias: cd web && npm run dev

# Run tests (84+ Vitest tests across 7 suites)
make test         # alias: cd web && npm test

# Lint + format
make lint         # ESLint
make fmt          # Prettier + cargo fmt
make fix          # Auto-fix lint + format

# Rust module
make module-check        # cargo check + clippy
make publish-module      # publish to STDB at localhost:3001

# Docker Compose (all 4 services)
make dev-up       # docker compose up --build -d
make dev-down     # docker compose down
```

### Pre-commit Hooks

The repo uses **Husky + lint-staged**. On `git commit`, staged `.ts/.tsx` files are typechecked and tested, and Rust sources are `cargo check`-ed:

```bash
# Bypass hooks on an emergency commit
git commit --no-verify -m "msg"
```

You can also run the same checks manually:
```bash
make pre-commit
```

---

## Coding Conventions

### TypeScript / React

- **Strict mode** — `no any` without a justified `// eslint-disable-next-line` comment
- **Functional components** with hooks (no class components)
- **Tailwind CSS** — utility classes only, no raw CSS files
- **i18n** — all user-facing strings go through `react-i18next` / `i18next`
- **Accessibility** — new components must include `vitest-axe` assertions

### Rust (SpacetimeDB module)

- **clippy-clean** — `cargo clippy` with no warnings; `#[allow(...)]` only with justification
- **No `#[allow(dead_code)]`** on unused items — remove instead
- **Reducers** follow the `#[spacetimedb::reducer]` pattern in `lib.rs`
- **Tests** use `#[cfg(test)] mod tests { ... }` with `#[test]` functions

### Python (FastAPI / MCP server)

- **Type hints** everywhere — all function signatures annotated
- **FastAPI patterns** — Pydantic models for request/response, router modules
- **Async**-first where possible

### Git Commit Messages

- Use present tense ("Add feature" not "Added feature")
- Prefix with relevant scope: `web:`, `server:`, `docs:`, `ci:`, etc.
- Reference issues/PRs when relevant

---

## Testing

| Layer | Framework | When to Run |
|-------|-----------|-------------|
| Unit | Vitest | `make test` |
| Component | Vitest + testing-library + vitest-axe | `make test` |
| E2E | Playwright | `make test-e2e` (requires built app) |
| Rust unit | `cargo test` | `make module-test` |

All commits must pass `tsc --noEmit` + Vitest + `cargo check` before CI will greenlight.

---

## Pull Request Process

1. **Branch off `master`** — use `feat/`, `fix/`, `docs/`, `chore/` prefixes
2. **Keep PRs focused** — one feature/fix per PR (see [ROADMAP.md](ROADMAP.md) for feature breakdown)
3. **Pre-commit hooks must pass** — `tsc + vitest + cargo check`
4. **CI runs automatically** on push/PR — check the GitHub Actions results
5. **Dependabot** handles weekly dependency updates — don't change lockfiles unless needed
6. **Review** — at least one maintainer review required before merge
7. **Squash-merge** preferred to keep history clean

---

## AI Agent Contributors

### For AI Agents

If you are an AI agent (Claude, Codex, Hermes, etc.) reading this, here is how to contribute effectively:

1. **Read `AGENTS.md` first** — it contains the agent-optimized onboarding with task-to-file mappings for every subsystem (STDB reducers, Tiptap editor, wiki pages/collections, auth, search, API routes, MCP server).

2. **Source of truth** — as noted in the README: "the source files are the truth." Prefer reading source files over generated docs when they conflict.

3. **Use the MCP server** — if the wiki instance is running, use `wiki_search`, `wiki_read_page`, `wiki_list_collections`, `wiki_list_pages`, `wiki_get_backlinks`, and `wiki_get_linked_pages` to explore the running system.

4. **Understand the data flow**:
   - Page editing → Y.js WebSocket → SpacetimeDB (real-time sync)
   - CRUD operations → FastAPI REST → SpacetimeDB HTTP API
   - Search → STDB full-text → REST/MCP endpoints
   - AI access → MCP stdio server → STDB client

5. **Follow the same PR process** as human contributors (branch off `master`, pre-commit hooks, CI passing).

6. **Be explicit about AI-generated changes** in PR descriptions — note which parts were generated and which were manually reviewed.

7. **Check for overlapping work** — use `mcp_graphify_list_prs` if available to see if a PR already exists for the area you plan to modify.

### Documentation Table

| Document | Purpose |
|----------|---------|
| [README.md](README.md) | Full project overview, quick start, architecture, features, API reference |
| [AGENTS.md](AGENTS.md) | Agent-optimized onboarding — task-to-file mappings, workspace layout, conventions |
| [CLAUDE.md](CLAUDE.md) | Short signpost with key commands and architecture summary |
| [ROADMAP.md](ROADMAP.md) | Feature parity roadmap across Outline, Docmost, Wiki.js, BookStack |
| [IMPROVEMENTS.md](./IMPROVEMENTS.md) | Improvement backlog (if present) |
| `.env.example` | All configurable environment variables with documentation |
| `docker-compose.yml` | Docker Compose services configuration |

---

## License

ISC — see [package.json](package.json).
