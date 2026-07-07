#!/bin/bash
# Sets up E2E test dependencies using native tools (no Docker).
# Run this BEFORE `npx playwright test` in CI.
#   - Publishes the SpacetimeDB module
#   - Starts the API server (background, on port 8711)
#   - Exits once the API server is ready
#
# Environment:
#   STDB_HOST     — default: localhost:3001
#   STDB_DATABASE — default: spacetime-wiki
#   API_PORT      — default: 8711
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
ROOT_DIR="$(cd "$SCRIPT_DIR/../.." && pwd)"

# ── Paths to native tooling ─────────────────────────────────────────────────
export PATH="$HOME/.cargo/bin:$HOME/.local/share/spacetime/bin/2.6.1:$PATH"

# ── Configuration ────────────────────────────────────────────────────────────
DB_NAME="${STDB_DATABASE:-spacetime-wiki}"
STDB_HOST="${STDB_HOST:-localhost:3001}"
API_PORT="${API_PORT:-8711}"

echo "[e2e-setup] Setting up E2E deps: DB=${DB_NAME} STDB=${STDB_HOST} API=:${API_PORT}"

# ── Ensure STDB is reachable ─────────────────────────────────────────────────
echo "[e2e-setup] Checking STDB at ${STDB_HOST}..."
for i in $(seq 1 30); do
  if curl -sf "http://${STDB_HOST}/v1/health" >/dev/null 2>&1; then
    echo "[e2e-setup] STDB ready after ${i}s"
    break
  fi
  if [ "$i" -eq 30 ]; then
    echo "[e2e-setup] ERROR: STDB not reachable at ${STDB_HOST}"
    echo "[e2e-setup] (The self-hosted runner requires STDB running natively)"
    exit 1
  fi
  sleep 2
done

# ── Clean slate + publish module ─────────────────────────────────────────────
echo "[e2e-setup] Ensuring clean database..."
spacetimedb-cli delete -y --server "http://${STDB_HOST}" "$DB_NAME" 2>/dev/null || true

echo "[e2e-setup] Building and publishing SpacetimeDB module to '${DB_NAME}'..."
cd "$ROOT_DIR/server/spacetimedb"
spacetimedb-cli publish --server "http://${STDB_HOST}" "$DB_NAME"

# ── Start API server (background) ────────────────────────────────────────────
echo "[e2e-setup] Starting API server on port ${API_PORT}..."
cd "$ROOT_DIR/server/api-server"
STDB_HOST="${STDB_HOST}" \
STDB_DATABASE="${DB_NAME}" \
  nohup uvicorn main:app --host 0.0.0.0 --port "${API_PORT}" > /tmp/e2e-api-server.log 2>&1 &
API_PID=$!
echo "[e2e-setup] API server PID: ${API_PID}"

# Save PID so cleanup can find it
echo "$API_PID" > /tmp/e2e-api-server.pid

# Wait for API server to accept connections
for i in $(seq 1 15); do
  if curl -sf "http://localhost:${API_PORT}/health" >/dev/null 2>&1; then
    echo "[e2e-setup] API server ready after ${i}s"
    exit 0
  fi
  sleep 2
done

echo "[e2e-setup] ERROR: API server health check timed out"
exit 1
