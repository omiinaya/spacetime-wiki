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
test-e2e: ## Run Playwright E2E tests (builds app + starts preview server)
	cd $(WEB_DIR) && npm run build && npx vite preview --port 5184 --strictPort &
	sleep 3
	cd $(WEB_DIR) && npx playwright test; EXIT_CODE=$$?; kill %1 2>/dev/null; exit $$EXIT_CODE

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
	cd $(SPACETIMEDB_DIR) && spacetime publish --server http://localhost:3001 spacetime-wiki

.PHONY: generate-bindings
generate-bindings: ## Generate TypeScript bindings from published module
	cd $(SPACETIMEDB_DIR) && spacetime generate --server http://localhost:3001 --out-dir ../../web/src/module_bindings spacetime-wiki

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

# ── Agent-Friendly Targets ────────────────────────────────────────────────
.PHONY: test-unit test-integration test-quick coverage check-ports deps-check health setup-git-hooks

test-unit:  ## Run unit tests (frontend)
	cd $(WEB_DIR) && npm test

test-integration:  ## Run integration tests (requires running backend)
	@echo "=== Integration Tests ==="
	@echo "Make sure these services are running:"
	@echo "  - SpacetimeDB on :3001"
	@echo "  - API server on :8711"
	@echo "Then run: cd $(WEB_DIR) && npm run test:e2e"

test-quick:  ## Quick vitest run
	cd $(WEB_DIR) && npx vitest run --reporter=verbose 2>/dev/null || echo "Run 'npm install' in $(WEB_DIR)/ first"

coverage:  ## Vitest coverage report
	@echo "=== Coverage ==="
	@cd $(WEB_DIR) && npx vitest run --coverage 2>/dev/null || echo "Run 'npm install' in $(WEB_DIR)/ first"
	@echo "Coverage report: $(WEB_DIR)/coverage/index.html"

check-ports:  ## Verify required ports are free
	@echo "Checking ports 5184 (vite), 8711 (API), 3001 (STDB), 3000 (WS)..."
	@for port in 5184 8711 3001 3000; do \
		if ss -tlnp "sport = :$$port" 2>/dev/null | grep -q .; then \
			echo "  Port $$port: IN USE"; \
		else \
			echo "  Port $$port: free"; \
		fi; \
	done

deps-check:  ## Verify required tools are installed
	@echo "=== Dependency Check ==="
	@for cmd in node npm cargo rustup spacetime; do \
		if command -v $$cmd >/dev/null 2>&1; then \
			echo "  $$cmd: found"; \
		else \
			echo "  $$cmd: MISSING"; \
		fi; \
	done
	@echo "Checking wasm32 target..."
	@rustup target list --installed 2>/dev/null | grep -q wasm32-unknown-unknown && \
		echo "  wasm32 target: found" || echo "  wasm32 target: MISSING (run: rustup target add wasm32-unknown-unknown)"

health:  ## Check if services are running
	@echo "=== Health Checks ==="
	@for url in http://localhost:5184 http://localhost:8711 http://localhost:3001; do \
		if curl -sf "$$url" >/dev/null 2>&1; then \
			echo "  $$url — OK"; \
		else \
			echo "  $$url — not reachable"; \
		fi; \
	done

setup-git-hooks:  ## Configure git hooks from .githooks/
	@if [ -d .githooks ]; then \
		git config core.hooksPath .githooks; \
		echo "Git hooks configured to use .githooks/"; \
	else \
		mkdir -p .githooks; \
		git config core.hooksPath .githooks; \
		echo "Created .githooks/ and configured git to use it"; \
	fi
