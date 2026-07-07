#!/bin/bash
# Seeds E2E test data into STDB for Playwright tests.
# Called by start-e2e-deps.sh after all services are up.
# Also callable standalone for local dev.
set -euo pipefail

STDB_HOST="${STDB_HOST:-localhost:3001}"
DB_NAME="${STDB_DATABASE:-spacetime-wiki}"
BASE_URL="http://${STDB_HOST}/v1/database/${DB_NAME}"

echo "[seed] Seeding E2E test data via STDB HTTP API at ${STDB_HOST}..."

# ── Check if admin already exists ──────────────────────────────────────────────
ADMIN_EXISTS=$(curl -sf -X POST "${BASE_URL}/sql" \
  -H "Content-Type: text/plain" \
  -d "SELECT id FROM \"user\" WHERE email = 'admin@spacetimewiki.local'" \
  2>/dev/null | python3 -c "import sys,json; d=json.load(sys.stdin); print('yes' if d and d[0].get('rows') else 'no')" 2>/dev/null || echo "no")

if [ "$ADMIN_EXISTS" = "yes" ]; then
  echo "[seed] Seed data already exists, skipping."
  exit 0
fi

# ── Generate unique IDs ────────────────────────────────────────────────────────
TS=$(date +%s%N)
ADMIN_ID="user_e2e_${TS}"
COLL_ID="col_e2e_${TS}"
PAGE1_ID="page_e2e_1_${TS}"
PAGE2_ID="page_e2e_2_${TS}"
PAGE3_ID="page_e2e_3_${TS}"
CONTENT=$(cat <<'JSONEOF'
{"type":"doc","content":[{"type":"paragraph","content":[{"type":"text","text":"Welcome to SpacetimeWiki — a collaborative wiki powered by SpacetimeDB."}]}]}
JSONEOF
)

# ── 1. Create admin user ──────────────────────────────────────────────────────
echo "[seed] Creating admin user..."
curl -sf -X POST "${BASE_URL}/call/register_user" \
  -H "Content-Type: application/json" \
  -d "[\"${ADMIN_ID}\",\"Admin\",\"admin@spacetimewiki.local\",\"admin123\",\"admin\""] || {
    echo "[seed] WARN: Failed to create admin user (may already exist)"
  }

# ── 2. Create Uncategorized collection ─────────────────────────────────────────
echo "[seed] Creating collection..."
curl -sf -X POST "${BASE_URL}/call/create_collection" \
  -H "Content-Type: application/json" \
  -d "[\"${COLL_ID}\",\"Uncategorized\",\"Default collection for uncategorized pages\",\"\",\"📄\",\"#808080\",\"${ADMIN_ID}\""] || {
    echo "[seed] WARN: Failed to create collection (may already exist)"
  }

# ── 3. Create sample pages ─────────────────────────────────────────────────────
echo "[seed] Creating published page (Welcome)..."
curl -sf -X POST "${BASE_URL}/call/create_page" \
  -H "Content-Type: application/json" \
  -d "[\"${PAGE1_ID}\",\"Welcome to SpacetimeWiki\",\"${CONTENT}\",\"${COLL_ID}\",\"\",\"${ADMIN_ID}\""] || {
    echo "[seed] WARN: Failed to create page Welcome"
  }
curl -sf -X POST "${BASE_URL}/call/set_page_status" \
  -H "Content-Type: application/json" \
  -d "[\"${PAGE1_ID}\",\"published\""] || {
    echo "[seed] WARN: Failed to publish page Welcome"
  }

echo "[seed] Creating draft page..."
DRAFT_CONTENT=$(cat <<'JSONEOF'
{"type":"doc","content":[{"type":"paragraph","content":[{"type":"text","text":"This is a draft page for E2E testing."}]}]}
JSONEOF
)
curl -sf -X POST "${BASE_URL}/call/create_page" \
  -H "Content-Type: application/json" \
  -d "[\"${PAGE2_ID}\",\"Draft Page Example\",\"${DRAFT_CONTENT}\",\"${COLL_ID}\",\"\",\"${ADMIN_ID}\""] || {
    echo "[seed] WARN: Failed to create draft page"
  }

echo "[seed] Creating published page (Getting Started)..."
GUIDE_CONTENT=$(cat <<'JSONEOF'
{"type":"doc","content":[{"type":"paragraph","content":[{"type":"text","text":"This guide helps you get started with SpacetimeWiki."}]}]}
JSONEOF
)
curl -sf -X POST "${BASE_URL}/call/create_page" \
  -H "Content-Type: application/json" \
  -d "[\"${PAGE3_ID}\",\"Getting Started Guide\",\"${GUIDE_CONTENT}\",\"${COLL_ID}\",\"\",\"${ADMIN_ID}\""] || {
    echo "[seed] WARN: Failed to create guide page"
  }
curl -sf -X POST "${BASE_URL}/call/set_page_status" \
  -H "Content-Type: application/json" \
  -d "[\"${PAGE3_ID}\",\"published\""] || {
    echo "[seed] WARN: Failed to publish guide page"
  }

echo "[seed] E2E test data seeded successfully."
