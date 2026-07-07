#!/bin/bash
# Cleans up E2E test dependencies (undoes setup-e2e-deps.sh).
# Run this AFTER `npx playwright test` in CI (always() step).
# Safety net — setup-e2e-deps.sh self-cleans via SIGTERM trap, but this
# ensures nothing is left behind if the webServer cleanup is interrupted.
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
ROOT_DIR="$(cd "$SCRIPT_DIR/../.." && pwd)"
export PATH="$HOME/.cargo/bin:$HOME/.local/share/spacetime/bin/2.6.1:$PATH"

DB_NAME="${STDB_DATABASE:-spacetime-wiki}"
STDB_HOST="${STDB_HOST:-localhost:3001}"

echo "[e2e-cleanup] Cleaning up E2E test dependencies..."

# Kill the API server if PID file exists
if [ -f /tmp/e2e-api-server.pid ]; then
  API_PID=$(cat /tmp/e2e-api-server.pid)
  if kill "$API_PID" 2>/dev/null; then
    echo "[e2e-cleanup] Killed API server (PID ${API_PID})"
  fi
  rm -f /tmp/e2e-api-server.pid
fi

# Make sure nothing's left on port 8711
fuser -k 8711/tcp 2>/dev/null || true

# Delete the E2E database
echo "[e2e-cleanup] Deleting database '${DB_NAME}'..."
spacetimedb-cli delete -y --server "http://${STDB_HOST}" "$DB_NAME" 2>/dev/null || true

echo "[e2e-cleanup] Done"
