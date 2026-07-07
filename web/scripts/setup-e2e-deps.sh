#!/bin/bash
# Sets up E2E test dependencies using native tools (no Docker).
# Designed for Playwright webServer: stays alive until SIGTERM/SIGINT.
#   - Publishes the SpacetimeDB module to the native STDB instance
#   - Starts the API server (uvicorn, background)
#   - Cleans up (kills API server, deletes E2E DB) on exit
#
# Environment:
#   STDB_HOST     — default: localhost:3001
#   STDB_DATABASE — default: spacetime-wiki
#   API_PORT      — default: 8711
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
ROOT_DIR="$(cd "$SCRIPT_DIR/../.." && pwd)"

# ── Configuration ────────────────────────────────────────────────────────────
DB_NAME="${STDB_DATABASE:-spacetime-wiki}"
STDB_HOST="${STDB_HOST:-localhost:3001}"
API_PORT="${API_PORT:-8711}"
API_PID=""

echo "[e2e-setup] Setting up E2E deps: DB=${DB_NAME} STDB=${STDB_HOST} API=:${API_PORT}"

# ── Cleanup trap ─────────────────────────────────────────────────────────────
cleanup() {
  echo "[e2e-setup] Cleaning up..."
  if [ -n "$API_PID" ] && kill "$API_PID" 2>/dev/null; then
    echo "[e2e-setup] Killed API server (PID ${API_PID})"
  fi
  fuser -k "${API_PORT}/tcp" 2>/dev/null || true
  echo "[e2e-setup] Deleting database '${DB_NAME}'..."
  spacetimedb-cli delete -y --server "http://${STDB_HOST}" "$DB_NAME" 2>/dev/null || true
  echo "[e2e-setup] Cleanup done"
}
trap cleanup EXIT

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
  uvicorn main:app --host 0.0.0.0 --port "${API_PORT}" > /tmp/e2e-api-server.log 2>&1 &
API_PID=$!
echo "[e2e-setup] API server PID: ${API_PID}"

# Wait for API server to accept connections
for i in $(seq 1 15); do
  if curl -sf "http://localhost:${API_PORT}/health" >/dev/null 2>&1; then
    echo "[e2e-setup] API server ready after ${i}s"
    break
  fi
  if [ "$i" -eq 15 ]; then
    echo "[e2e-setup] ERROR: API server health check timed out"
    exit 1
  fi
  sleep 2
done

# ── Seed E2E test data ─────────────────────────────────────────────────────
# Seeds admin user + sample pages into the fresh STDB instance.
# global-setup.ts also seeds, but it connects to STDB directly and can race with module publishing — seeding here after API is healthy is more reliable.
echo "[e2e-setup] Seeding E2E test data..."
python3 "$SCRIPT_DIR/seed-e2e-data.py" || echo "[e2e-setup] WARNING: Seeding failed — E2E tests may have issues."

echo "[e2e-setup] All dependencies ready — E2E tests can proceed"
# Stay alive — Playwright webServer will SIGTERM this process when tests finish
sleep infinity
