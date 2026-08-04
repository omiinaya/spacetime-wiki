#!/usr/bin/env python3
"""
Seeds E2E test data into a fresh STDB instance for Playwright tests.

Called by start-e2e-deps.sh after all services are up, OR run standalone
for local dev setup. Operates on STDB directly via HTTP API (not the REST API).

Environment variables:
  STDB_HOST      — default: localhost:3001
  STDB_DATABASE  — default: spacetime-wiki
  STDB_DB        — alias for STDB_DATABASE (legacy)
"""

import json
import os
import sys
import time
import urllib.request
import urllib.error

STDB_HOST = os.environ.get("STDB_HOST", "localhost:3001")
DB_NAME = os.environ.get("STDB_DATABASE") or os.environ.get("STDB_DB") or "spacetime-wiki"
BASE_URL = f"http://{STDB_HOST}/v1/database/{DB_NAME}"


def gen_id(prefix: str) -> str:
    ts = time.time_ns()
    return f"{prefix}_e2e_{ts}"


def call_reducer(reducer: str, args: list) -> bool:
    """Call an STDB reducer via HTTP API. Returns True on success."""
    url = f"{BASE_URL}/call/{reducer}"
    data = json.dumps(args).encode("utf-8")
    req = urllib.request.Request(url, data=data, method="POST")
    req.add_header("Content-Type", "application/json")
    try:
        with urllib.request.urlopen(req, timeout=15) as resp:
            if resp.status == 200:
                return True
            print(f"  [seed]  {reducer}: HTTP {resp.status}", file=sys.stderr)
            return False
    except urllib.error.HTTPError as e:
        body = e.read().decode("utf-8", errors="replace")[:200]
        print(f"  [seed]  {reducer}: HTTP {e.code} — {body}", file=sys.stderr)
        return False
    except (urllib.error.URLError, OSError) as e:
        print(f"  [seed]  {reducer}: {e}", file=sys.stderr)
        return False


def sql_exists(sql: str) -> bool:
    """Check if a SQL query returns any rows."""
    url = f"{BASE_URL}/sql"
    req = urllib.request.Request(url, data=sql.encode("utf-8"), method="POST")
    req.add_header("Content-Type", "text/plain")
    try:
        with urllib.request.urlopen(req, timeout=10) as resp:
            data = json.loads(resp.read().decode("utf-8"))
            rows = data[0].get("rows", []) if data else []
            return len(rows) > 0
    except (urllib.error.URLError, urllib.error.HTTPError, json.JSONDecodeError, OSError) as e:
        print(f"  [seed]  SQL check failed: {e}", file=sys.stderr)
        return False


def wait_for_stdb(max_attempts: int = 15, delay: int = 2) -> bool:
    """Wait until STDB is reachable and the database/module exists.

    NOTE: Uses ``SELECT COUNT(*) FROM "user"`` as the liveness probe rather
    than ``SELECT 1`` — the latter is rejected by STDB v2.6.x with
    ``Unsupported projection expression: 1`` (bare constants are not valid
    projection expressions). The ``user`` table always exists after publish,
    so this is a robust readiness check.
    """
    print(f"[seed] Waiting for STDB at {STDB_HOST} (db: {DB_NAME})...")
    for attempt in range(1, max_attempts + 1):
        try:
            url = f"http://{STDB_HOST}/v1/database/{DB_NAME}/sql"
            req = urllib.request.Request(
                url,
                data='SELECT COUNT(*) AS c FROM "user"'.encode("utf-8"),
                method="POST",
            )
            req.add_header("Content-Type", "text/plain")
            with urllib.request.urlopen(req, timeout=5):
                print(f"[seed] STDB ready after {attempt * delay}s")
                return True
        except urllib.error.URLError as e:
            if attempt == max_attempts:
                print(f"[seed] ERROR: STDB not reachable after {max_attempts * delay}s ({e})", file=sys.stderr)
                return False
            time.sleep(delay)
        except OSError as e:
            if attempt == max_attempts:
                print(f"[seed] ERROR: STDB not reachable after {max_attempts * delay}s ({e})", file=sys.stderr)
                return False
            time.sleep(delay)
    return False


def main():
    # ── Wait for STDB ─────────────────────────────────────────────────────
    if not wait_for_stdb():
        sys.exit(1)

    # ── Check if seed data already exists ─────────────────────────────────
    if sql_exists("SELECT id FROM \"user\" WHERE email = 'admin@spacetimewiki.local'"):
        print("[seed] Seed data already exists, skipping.")
        return

    print("[seed] Seeding E2E test data...")

    # ── 1. Create admin user ──────────────────────────────────────────────
    admin_id = gen_id("user")
    if not call_reducer("register_user", [admin_id, "Admin", "admin@spacetimewiki.local", "admin123", "admin"]):
        # If admin already exists (race condition), continue
        print("[seed] Admin user may already exist, continuing...")

    # ── 2. Create Uncategorized collection ────────────────────────────────
    coll_id = gen_id("col")
    if not call_reducer("create_collection", [
        coll_id, "Uncategorized",
        "Default collection for uncategorized pages",
        "", "📄", "#808080", admin_id,
    ]):
        print("[seed] Collection may already exist, continuing...")

    # ── 3. Create sample pages ────────────────────────────────────────────
    page1_id = gen_id("page")
    page1_content = json.dumps({
        "type": "doc",
        "content": [{
            "type": "paragraph",
            "content": [{"type": "text", "text": "Welcome to SpacetimeWiki — a collaborative wiki powered by SpacetimeDB."}],
        }],
    })
    if call_reducer("create_page", [page1_id, "Welcome to SpacetimeWiki", page1_content, coll_id, "", admin_id]):
        call_reducer("set_page_status", [page1_id, "published"])
        print(f"[seed] Published page created: {page1_id}")
    else:
        print("[seed] Welcome page may already exist")

    page2_id = gen_id("page")
    page2_content = json.dumps({
        "type": "doc",
        "content": [{
            "type": "paragraph",
            "content": [{"type": "text", "text": "This is a draft page for E2E testing."}],
        }],
    })
    if call_reducer("create_page", [page2_id, "Draft Page Example", page2_content, coll_id, "", admin_id]):
        print(f"[seed] Draft page created: {page2_id}")
    else:
        print("[seed] Draft page may already exist")

    page3_id = gen_id("page")
    page3_content = json.dumps({
        "type": "doc",
        "content": [{
            "type": "paragraph",
            "content": [{"type": "text", "text": "This guide helps you get started with SpacetimeWiki."}],
        }],
    })
    if call_reducer("create_page", [page3_id, "Getting Started Guide", page3_content, coll_id, "", admin_id]):
        call_reducer("set_page_status", [page3_id, "published"])
        print(f"[seed] Guide page created: {page3_id}")
    else:
        print("[seed] Guide page may already exist")

    print("[seed] E2E test data created successfully.")


if __name__ == "__main__":
    main()
