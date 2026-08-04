"""Integration tests for core SpacetimeDB reducers.

Tests cover the init reducer, user/collection/page CRUD, and basic
queries against the running STDB instance.

NOTE: these are integration tests — they require a live STDB instance with the
spacetime-wiki module published (see docker-compose.yml tests profile). They
call reducers directly via the STDB HTTP API and assert on the resulting rows.
"""

from __future__ import annotations

import time

import pytest

from .conftest import (
    call_reducer,
    count_rows,
    http_client,
    http_base,
    reducer_succeeds,
    sql_query,
    assert_row_count,
    assert_gt,
)

pytestmark = pytest.mark.asyncio

# Unique per-run suffix so these integration tests are idempotent against a
# persistent STDB (re-running without --delete-data must not collide with rows
# from a previous run).
_RUN = f"{int(time.time() * 1000):x}"


# ─── System ────────────────────────────────────────────────────────────────────

async def test_health(http_client, http_base):
    """STDB instance is reachable."""
    resp = await http_client.get(f"{http_base}/ping")
    assert resp.status_code < 500, f"STDB ping failed: {resp.status_code}"


async def test_init_success(http_client, http_base):
    """The init reducer creates default app settings."""
    # init is a #[reducer(init)] — it runs automatically on publish, it is NOT
    # callable via /call (that returns 400). Verify its EFFECT: app settings
    # exist after publish.
    rows = await sql_query(http_client, http_base, "SELECT * FROM app_setting")
    assert_gt(len(rows), 0)
    keys = {r[0] for r in rows}
    for expected in ("site_name", "site_description", "allow_registration"):
        assert expected in keys, f"Missing app setting: {expected}"


# ─── Users ─────────────────────────────────────────────────────────────────────

async def test_create_user(http_client, http_base):
    """Register a user with required fields and verify it exists."""
    user_id = f"tuser_{_RUN}"
    name = "Test User"
    email = f"test_{_RUN}@example.com"
    password = "supersecret123!"

    ok = await reducer_succeeds(
        http_client, http_base, "register_user",
        [user_id, name, email, password, "member"],
    )
    assert ok, "register_user reducer failed"

    rows = await sql_query(
        http_client, http_base,
        f"SELECT id, name, email FROM \"user\" WHERE id = '{user_id}'",
    )
    assert_row_count(rows, 1)
    assert rows[0][0] == user_id
    assert rows[0][1] == name
    assert rows[0][2] == email


async def test_create_user_duplicate(http_client, http_base):
    """Registering the same email twice should error (email uniqueness)."""
    ok1 = await reducer_succeeds(
        http_client, http_base, "register_user",
        [f"dup1_{_RUN}", "Dup User", f"dup_{_RUN}@test.com", "password123", "member"],
    )
    ok2 = await reducer_succeeds(
        http_client, http_base, "register_user",
        [f"dup2_{_RUN}", "Dup User", f"dup_{_RUN}@test.com", "password123", "member"],
    )
    assert ok1, "First register_user should succeed"
    assert not ok2, "Duplicate email register_user should fail"

    rows = await sql_query(
        http_client, http_base,
        f"SELECT id FROM \"user\" WHERE email = 'dup_{_RUN}@test.com'",
    )
    assert_row_count(rows, 1)


async def test_create_user_missing_fields(http_client, http_base):
    """Registering a user with empty name should be accepted (STDB validates)."""
    ok = await reducer_succeeds(
        http_client, http_base, "register_user",
        [f"tempty_{_RUN}", "", f"empty_{_RUN}@test.com", "password123", "member"],
    )
    assert ok, "register_user with empty name should succeed"


async def test_user_password_stored(http_client, http_base):
    """A registered user stores a password hash in the private credential table."""
    uid = f"tpw_{_RUN}"
    email = f"pw_{_RUN}@test.com"
    await reducer_succeeds(
        http_client, http_base, "register_user",
        [uid, "PW Test", email, "hunter2", "member"],
    )
    rows = await sql_query(
        http_client, http_base,
        f"SELECT id FROM \"user\" WHERE id = '{uid}'",
    )
    assert_row_count(rows, 1)
    # login should succeed with the right password (proves the hash roundtrip)
    ok = await reducer_succeeds(
        http_client, http_base, "login_user",
        [email, "hunter2"],
    )
    assert ok, "login with correct password should succeed"
    bad = await reducer_succeeds(
        http_client, http_base, "login_user",
        [email, "wrong"],
    )
    assert not bad, "login with wrong password should fail"


# ─── Collections ───────────────────────────────────────────────────────────────

async def test_create_collection(http_client, http_base):
    """Create a collection and verify it exists."""
    coll_id = f"tcoll_{_RUN}"
    ok = await reducer_succeeds(
        http_client, http_base, "create_collection",
        [coll_id, "Test Collection", "A test collection",
         "", "📚", "#ff0000", f"tuser_{_RUN}"],
    )
    assert ok, "create_collection failed"

    rows = await sql_query(
        http_client, http_base,
        f"SELECT id, name FROM collection WHERE id = '{coll_id}'",
    )
    assert_row_count(rows, 1)
    assert rows[0][1] == "Test Collection"


# ─── Pages ─────────────────────────────────────────────────────────────────────

async def test_create_page(http_client, http_base):
    """Create a page within a collection and verify it exists."""
    page_id = f"tpage_{_RUN}"
    ok = await reducer_succeeds(
        http_client, http_base, "create_page",
        [page_id, "Test Page", "# Hello World", f"tcoll_{_RUN}", "", f"tuser_{_RUN}"],
    )
    assert ok, "create_page failed"

    rows = await sql_query(
        http_client, http_base,
        f"SELECT id, title FROM page WHERE id = '{page_id}'",
    )
    assert_row_count(rows, 1)
    assert rows[0][1] == "Test Page"


async def test_create_page_content_persisted(http_client, http_base):
    """Page content is stored correctly."""
    page_id = f"tpagec_{_RUN}"
    content = "# My Heading\n\nSome **bold** text and *italic* text."
    await reducer_succeeds(
        http_client, http_base, "create_page",
        [page_id, "Content Test", content, f"tcoll_{_RUN}", "", f"tuser_{_RUN}"],
    )
    rows = await sql_query(
        http_client, http_base,
        f"SELECT id, text_content FROM page WHERE id = '{page_id}'",
    )
    assert_row_count(rows, 1)
    assert content in rows[0][1], "Page text_content should contain the content"


# ─── Search ────────────────────────────────────────────────────────────────────

async def test_search_basic(http_client, http_base):
    """Basic text search returns matching pages (via the search_pages reducer)."""
    # Self-contained: create a page, then search for it.
    owner = f"srchuser_{_RUN}"
    coll = f"srchcoll_{_RUN}"
    page = f"srchpage_{_RUN}"
    await reducer_succeeds(
        http_client, http_base, "register_user",
        [owner, "Search User", f"{owner}@test.com", "password123", "member"],
    )
    await reducer_succeeds(
        http_client, http_base, "create_collection",
        [coll, "Search Coll", "", "", "", "", owner],
    )
    await reducer_succeeds(
        http_client, http_base, "create_page",
        [page, "Test Page", "# Hello World", coll, "", owner],
    )
    token = f"srch_{_RUN}"
    ok = await reducer_succeeds(
        http_client, http_base, "search_pages",
        [token, "Hello", "", "", 0, 0],
    )
    assert ok, "search_pages failed"
    rows = await sql_query(
        http_client, http_base,
        f"SELECT title FROM search_result WHERE search_token = '{token}'",
    )
    titles = {r[0] for r in rows}
    assert "Test Page" in titles, f"Search didn't find Test Page in {titles}"


# ─── Data consistency ──────────────────────────────────────────────────────────

async def test_no_orphan_pages(http_client, http_base):
    """Every page should belong to an existing collection."""
    # STDB v2.6.1 /sql rejects non-inner joins — two queries instead.
    # Only check pages created by THIS run (self-contained, no stale data).
    owner = f"orphuser_{_RUN}"
    coll = f"orphcoll_{_RUN}"
    page = f"orphpage_{_RUN}"
    await reducer_succeeds(
        http_client, http_base, "register_user",
        [owner, "Orphan User", f"{owner}@test.com", "password123", "member"],
    )
    await reducer_succeeds(
        http_client, http_base, "create_collection",
        [coll, "Orphan Coll", "", "", "", "", owner],
    )
    await reducer_succeeds(
        http_client, http_base, "create_page",
        [page, "Orphan Page", "# x", coll, "", owner],
    )
    pages = await sql_query(
        http_client, http_base,
        f"SELECT collection_id FROM page WHERE id = '{page}'",
    )
    assert_row_count(pages, 1)
    coll_ids = [r[0] for r in pages]
    colls = await sql_query(
        http_client, http_base,
        f"SELECT id FROM collection WHERE id = '{coll}'",
    )
    existing = {r[0] for r in colls}
    orphans = [cid for cid in coll_ids if cid and cid not in existing]
    assert not orphans, f"Pages reference missing collections: {orphans}"


async def test_tables_have_data(http_client, http_base):
    """Core tables should have at least some rows after test data insertion."""
    checks = [
        ("\"user\"", 1),
        ("collection", 1),
        ("page", 1),
    ]
    for table, at_least in checks:
        n = await count_rows(http_client, http_base, table)
        assert n >= at_least, f"Table '{table}' has {n} rows (expected ≥{at_least})"
