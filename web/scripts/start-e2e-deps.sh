#!/bin/bash
# Starts Docker dependencies for Playwright E2E tests
# Used by Playwright webServer config in CI.
# Starts: STDB → publish module → API server
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
ROOT_DIR="$(cd "$SCRIPT_DIR/../.." && pwd)"
COMPOSE="docker compose -f $ROOT_DIR/docker-compose.yml"

cleanup() {
  echo "[e2e-deps] Cleaning up Docker services..."
  $COMPOSE down --remove-orphans 2>/dev/null || true
}
trap cleanup EXIT

echo "[e2e-deps] Building module-publisher & api-server images..."
$COMPOSE build module-publisher api-server

echo "[e2e-deps] Starting STDB..."
$COMPOSE up -d spacetimedb

echo "[e2e-deps] Waiting for STDB (port 3001)..."
for i in $(seq 1 30); do
  if curl -sf http://localhost:3001/v1/health >/dev/null 2>&1; then
    echo "[e2e-deps] STDB ready after ${i}s"
    break
  fi
  if [ "$i" -eq 30 ]; then
    echo "[e2e-deps] ERROR: STDB failed to start"
    $COMPOSE logs spacetimedb
    exit 1
  fi
  sleep 2
done

echo "[e2e-deps] Publishing SpacetimeDB module..."
$COMPOSE up --abort-on-container-exit module-publisher

echo "[e2e-deps] Starting API server..."
$COMPOSE up -d api-server

# Brief wait for API server to accept connections
for i in $(seq 1 10); do
  if curl -sf http://localhost:8711/health >/dev/null 2>&1; then
    echo "[e2e-deps] API server ready after ${i}s"
    break
  fi
  if [ "$i" -eq 10 ]; then
    echo "[e2e-deps] WARNING: API server health check timed out, continuing"
  fi
  sleep 2
done

# ── Seed E2E test data ─────────────────────────────────────────────────────
# Seeds admin user + sample pages into the fresh STDB instance.
# The global-setup.ts can't do this because it runs before webServer starts.
echo "[e2e-deps] Seeding E2E test data..."
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
python3 "$SCRIPT_DIR/seed-e2e-data.py" || echo "[e2e-deps] WARNING: Seeding failed — E2E tests may have issues."

echo "[e2e-deps] All dependencies ready — E2E tests can proceed"
# Keep running — Playwright webServer will SIGTERM this process when done
sleep infinity
