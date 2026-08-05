#!/bin/bash
# Sets up E2E test dependencies using native tools (no Docker).
# Designed for Playwright webServer: stays alive until SIGTERM/SIGINT.
#   - Publishes the SpacetimeDB module to the native STDB instance
#   - Starts the API server (uvicorn, background)
#   - Cleans up (kills API server, deletes E2E DB) on exit
#
# Environment:
#   STDB_HOST     — default: localhost:3001
#   STDB_DATABASE — default: spacetime-wiki-e2e
#   API_PORT      — default: 8711
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
ROOT_DIR="$(cd "$SCRIPT_DIR/../.." && pwd)"
export PATH="$HOME/.cargo/bin:$HOME/.local/share/spacetime/bin/2.6.1:$PATH"

# ── Configuration ────────────────────────────────────────────────────────────
DB_NAME="${STDB_DATABASE:-spacetime-wiki-e2e}"
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

# ── Ensure the Rust toolchain is usable ───────────────────────────────────────
# ~/.cargo/bin/{cargo,rustc,...} are SYMLINKS to `rustup`; if the rustup binary
# is missing (observed twice on this host — a cleanup job removes it), cargo
# resolves to a dangling symlink and `spacetimedb-cli publish` fails with
# "wasm32 target is not installed". Detect and restore rustup via rustup-init.
echo "[e2e-setup] Checking Rust toolchain (cargo + wasm32)..."
# Locate a rustup-init installer (preferred stable copy, then /tmp cache).
RUSTUP_INIT=""
for cand in "$HOME/.hermes/scripts/bin/rustup-init.sh" /tmp/rustup-init.sh; do
  [ -f "$cand" ] && RUSTUP_INIT="$cand" && break
done
if [ ! -x "$HOME/.cargo/bin/rustup" ] && [ -n "$RUSTUP_INIT" ]; then
  echo "[e2e-setup] rustup missing — restoring via $RUSTUP_INIT"
  RUSTUP_HOME="$HOME/.rustup" CARGO_HOME="$HOME/.cargo" \
    sh "$RUSTUP_INIT" -y --no-modify-path --default-toolchain stable >/dev/null 2>&1 \
    || echo "[e2e-setup] WARNING: rustup restore failed"
fi
export RUSTUP_HOME="$HOME/.rustup" CARGO_HOME="$HOME/.cargo"
if ! command -v cargo >/dev/null 2>&1 || ! cargo --version >/dev/null 2>&1; then
  echo "[e2e-setup] ERROR: cargo unavailable — cannot publish module"
  exit 1
fi
if ! rustup target list --installed 2>/dev/null | grep -q wasm32-unknown-unknown; then
  echo "[e2e-setup] Installing wasm32-unknown-unknown target..."
  rustup target add wasm32-unknown-unknown || echo "[e2e-setup] WARNING: wasm32 add failed"
fi

# ── Clean slate + publish module ─────────────────────────────────────────────
echo "[e2e-setup] Ensuring clean database..."
spacetimedb-cli delete -y --server "http://${STDB_HOST}" "$DB_NAME" 2>/dev/null || true

echo "[e2e-setup] Building and publishing SpacetimeDB module to '${DB_NAME}'..."
cd "$ROOT_DIR/server/spacetimedb"
spacetimedb-cli publish --server "http://${STDB_HOST}" "$DB_NAME"

# ── Start API server (background, in a venv) ────────────────────────────────
# The runner's system Python is PEP-668 externally-managed and its PATH may
# lack the API server's deps — create a dedicated venv to make the API server
# hermetic.
echo "[e2e-setup] Installing API server deps into venv..."
API_VENV=/tmp/e2e-api-venv
# Reuse an existing working venv (recreating it can fail on ensurepip when the
# system python is externally managed); recreate only if the binary is missing.
if [ ! -x "$API_VENV/bin/uvicorn" ]; then
  echo "[e2e-setup] Creating API venv..."
  python3 -m venv --without-pip "$API_VENV" 2>/dev/null || python3 -m venv "$API_VENV"
  # bootstrap pip without ensurepip
  if [ ! -x "$API_VENV/bin/pip" ]; then
    curl -sS https://bootstrap.pypa.io/get-pip.py -o /tmp/get-pip.py 2>/dev/null \
      && "$API_VENV/bin/python" /tmp/get-pip.py -q || true
  fi
fi
"$API_VENV/bin/pip" install --upgrade pip -q 2>/dev/null || true
"$API_VENV/bin/pip" install -q -r "$ROOT_DIR/server/api-server/requirements.txt"

echo "[e2e-setup] Starting API server on port ${API_PORT}..."
cd "$ROOT_DIR/server/api-server"
STDB_HOST="${STDB_HOST}" \
STDB_DATABASE="${DB_NAME}" \
  "$API_VENV/bin/uvicorn" main:app --host 0.0.0.0 --port "$API_PORT" > /tmp/e2e-api-server.log 2>&1 &
API_PID=$!
echo "[e2e-setup] API server PID: ${API_PID}"
echo "$API_PID" > /tmp/e2e-api-server.pid

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
# global-setup.ts can't do this because it runs before webServer starts;
# seeding here after module publish + API server is more reliable.
echo "[e2e-setup] Seeding E2E test data..."
STDB_HOST="${STDB_HOST}" STDB_DATABASE="${DB_NAME}" \
  python3 "$SCRIPT_DIR/seed-e2e-data.py" || echo "[e2e-setup] WARNING: Seeding failed — E2E tests may have issues."

echo "[e2e-setup] All dependencies ready — E2E tests can proceed"
# Stay alive — Playwright webServer will SIGTERM this process when tests finish
sleep infinity
