#!/usr/bin/env bash
# Run all Python unit tests for spacetime-wiki
# API server and MCP server tests run separately due to conftest namespace isolation.
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
VENV="${VENV:-${ROOT}/server/api-server/.venv}"
PYTHON="${VENV}/bin/python"

echo ":: Running Python unit tests — spacetime-wiki"
echo ""

# ─── API server tests ────────────────────────────────────────────────────────
echo "==> API server unit tests …"

cd "${ROOT}/server"

$PYTHON -m pytest tests/ \
  --tb=short \
  -q \
  --ignore=tests/test_page_metadata_and_settings.py \
  --ignore=tests/test_core_reducers.py \
  --ignore=tests/test_collection_permission_search.py \
  --ignore=tests/test_collection_permission_action.py \
  --ignore=tests/test_collection_permission_operations.py \
  --ignore=tests/test_collection_permission_propagation.py \
  --ignore=tests/test_collection_permission_reducers.py

echo ""

# ─── MCP server tests ────────────────────────────────────────────────────────
echo "==> MCP server unit tests …"
$PYTHON -m pytest mcp-server/tests/ --tb=short -q

echo ""
echo "── Summary ──"
echo "See above for full details."
