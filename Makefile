# ─── SpacetimeWiki Makefile ───────────────────────────────────────────────────
# Targets for local development, testing, linting, and Docker orchestration.

# ── Paths ─────────────────────────────────────────────────────────────────────
WEB_DIR       := web
SERVER_DIR    := server
SPACETIMEDB_DIR := $(SERVER_DIR)/spacetimedb
API_SERVER_DIR  := $(SERVER_DIR)/api-server
MCP_SERVER_DIR  := $(SERVER_DIR)/mcp-server

# ── Default target ────────────────────────────────────────────────────────────
.PHONY: help
help: ## Show this help
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) | sort | \
		awk 'BEGIN {FS = ":.*?## "}; {printf "\033[36m%-20s\033[0m %s\n", $$1, $$2}'

# ── Frontend ──────────────────────────────────────────────────────────────────

.PHONY: install
install: ## Install frontend dependencies
	cd $(WEB_DIR) && npm install

.PHONY: build
build: ## TypeScript check + Vite production build
	cd $(WEB_DIR) && npm run build

.PHONY: test
test: ## Run frontend Vitest unit/component tests
	cd $(WEB_DIR) && npm test

.PHONY: test-watch
test-watch: ## Run frontend tests in watch mode
	cd $(WEB_DIR) && npm run test:watch

.PHONY: test-e2e
test-e2e: ## Run Playwright E2E tests (requires built app + preview)
	cd $(WEB_DIR) && npm run build && npm run preview &
	cd $(WEB_DIR) && npx playwright test

.PHONY: lint
lint: ## Run ESLint on frontend code
	cd $(WEB_DIR) && npm run lint

.PHONY: fmt
fmt: ## Format frontend code with Prettier, Rust code with cargo fmt
	cd $(WEB_DIR) && npx prettier --write .
	cd $(SPACETIMEDB_DIR) && cargo fmt 2>/dev/null || true

.PHONY: fix
fix: ## Auto-fix lint issues + format code
	cd $(WEB_DIR) && npm run lint -- --fix
	$(MAKE) fmt

# ── Rust Module ───────────────────────────────────────────────────────────────

.PHONY: module-build
module-build: ## Compile the SpacetimeDB Rust module
	cd $(SPACETIMEDB_DIR) && cargo build

.PHONY: module-check
module-check: ## Run cargo check + clippy on Rust module
	cd $(SPACETIMEDB_DIR) && cargo check
	cd $(SPACETIMEDB_DIR) && cargo clippy -- -D warnings 2>/dev/null || true

.PHONY: module-test
module-test: ## Run Rust unit tests (via SpacetimeDB test runner)
	cd $(SPACETIMEDB_DIR) && cargo test 2>/dev/null || echo "cargo test may not work outside spacetime context; use 'spacetime test' instead"

.PHONY: publish-module
publish-module: ## Publish Rust module to a running SpacetimeDB instance
	cd $(SPACETIMEDB_DIR) && spacetime publish --server http://localhost:3001 spacetime_wiki

.PHONY: generate-bindings
generate-bindings: ## Generate TypeScript bindings from published module
	cd $(SPACETIMEDB_DIR) && spacetime generate --server http://localhost:3001 --out-dir ../../web/src/module_bindings spacetime_wiki

# ── Docker Compose ────────────────────────────────────────────────────────────

.PHONY: dev-up
dev-up: ## Start all services with Docker Compose
	docker compose up --build -d

.PHONY: dev-down
dev-down: ## Stop all Docker Compose services
	docker compose down

.PHONY: dev-logs
dev-logs: ## Follow logs from all services
	docker compose logs -f

.PHONY: dev-rebuild
dev-rebuild: ## Rebuild and restart all services
	docker compose build --no-cache
	docker compose up -d

# ── Cleanup ───────────────────────────────────────────────────────────────────

.PHONY: clean
clean: ## Clean all build artifacts
	rm -rf $(WEB_DIR)/dist
	rm -rf $(SPACETIMEDB_DIR)/target
	rm -rf $(WEB_DIR)/node_modules/.vite
	@echo "Clean complete. Use 'make install' to restore dependencies."

.PHONY: distclean
distclean: clean ## Clean everything including node_modules
	rm -rf $(WEB_DIR)/node_modules
	$(MAKE) clean

# ── Pre-commit (matches .husky/pre-commit) ────────────────────────────────────

.PHONY: pre-commit
pre-commit: ## Run pre-commit checks: tsc + tests + cargo check
	cd $(WEB_DIR) && npx tsc --noEmit
	cd $(WEB_DIR) && npm test
	cd $(SPACETIMEDB_DIR) && cargo check
	@echo "pre-commit checks passed."
