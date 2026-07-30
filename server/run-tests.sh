#!/usr/bin/env bash
# Run all Python unit tests for spacetime-wiki
# API server and MCP server tests run separately due to conftest namespace isolation.
set -euo pipefail

VENV="${VENV:-$(dirname "$0")/api-server/.venv}"
PYTHON="${VENV}/bin/python"

echo ":: Running Python unit tests — spacetime-wiki"
echo ""

# ─── API server tests ────────────────────────────────────────────────────────
echo "==> API server unit tests …"
cd "$(dirname "$0")"

$PYTHON -m pytest tests/ \
  --tb=short \
  -q \
  --ignore=tests/test_page_metadata_and_settings.py \
  --ignore=tests/test_core_reducers.py \
  --ignore=tests/test_collection_permission_search.py \
  --ignore=tests/test_collection_permission_action.py \
  --ignore=tests/test_collection_permission_operations.py \
  --ignore=tests/test_collection_permission_propagation.py \
  -o "filterwarnings=ignore::pytest.PytestReturnNotReturnWarning" 2>&1 | tail -3

echo ""

# ─── MCP server tests ────────────────────────────────────────────────────────
echo "==> MCP server unit tests …"
$PYTHON -m pytest mcp-server/tests/ --tb=short -q 2>&1 | tail -3

echo ""
echo "── Summary ──"
# Report just the pass/fail lines
echo "See above for full details."
