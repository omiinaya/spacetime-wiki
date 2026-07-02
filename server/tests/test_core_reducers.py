"""Integration tests for core SpacetimeDB reducers.

Tests cover the init reducer, user/collection/page CRUD, and basic
queries against the running STDB instance.
"""

from __future__ import annotations

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


# ─── System ────────────────────────────────────────────────────────────────────

async def test_health(http_client, http_base):
    """STDB instance is reachable."""
    resp = await http_client.get(f"{http_base}/ping")
    assert resp.status_code < 500, f"STDB ping failed: {resp.status_code}"


async def test_init_success(http_client, http_base):
    """The init reducer creates default app settings."""
    # init is idempotent — call it and verify settings exist
    ok = await reducer_succeeds(http_client, http_base, "init", [])
    assert ok, "init reducer failed"

    rows = await sql_query(http_client, http_base, "SELECT * FROM app_setting")
    assert_gt(len(rows), 0)
    keys = {r[0] for r in rows}
    for expected in ("site_name", "site_description", "allow_registration"):
        assert expected in keys, f"Missing app setting: {expected}"


# ─── Users ─────────────────────────────────────────────────────────────────────

async def test_create_user(http_client, http_base):
    """Create a user with required fields and verify it exists."""
    user_id = "test_user_001"
    name = "Test User"
    email = "test@example.com"
    password = "supersecret123!"

    ok = await reducer_succeeds(
        http_client, http_base, "create_user",
        [user_id, name, email, password],
    )
    assert ok, "create_user reducer failed"

    rows = await sql_query(
        http_client, http_base,
        f"SELECT id, name, email FROM user WHERE id = 'test_user_001'",
    )
    assert_row_count(rows, 1)
    assert rows[0][0] == user_id
    assert rows[0][1] == name
    assert rows[0][2] == email


async def test_create_user_duplicate(http_client, http_base):
    """Creating the same user ID twice should not error (idempotent)."""
    ok1 = await reducer_succeeds(
        http_client, http_base, "create_user",
        ["test_user_dup", "Dup User", "dup@test.com", "password123"],
    )
    ok2 = await reducer_succeeds(
        http_client, http_base, "create_user",
        ["test_user_dup", "Dup User", "dup@test.com", "password123"],
    )
    assert ok1 and ok2, "Idempotent create_user failed on second call"

    rows = await sql_query(
        http_client, http_base,
        "SELECT id FROM user WHERE id = 'test_user_dup'",
    )
    assert_row_count(rows, 1)


async def test_create_user_missing_fields(http_client, http_base):
    """Creating a user with empty name should be accepted (STDB validates)."""
    ok = await reducer_succeeds(
        http_client, http_base, "create_user",
        ["test_user_empty", "", "empty@test.com", "password123"],
    )
    assert ok, "create_user with empty name should succeed"


async def test_user_password_stored(http_client, http_base):
    """A created user stores a password_hash field."""
    uid = "test_user_pw"
    await reducer_succeeds(
        http_client, http_base, "create_user",
        [uid, "PW Test", "pw@test.com", "hunter2"],
    )
    rows = await sql_query(
        http_client, http_base,
        f"SELECT password_hash FROM user WHERE id = '{uid}'",
    )
    assert_row_count(rows, 1)
    pw_hash = rows[0][0]
    assert pw_hash and len(pw_hash) > 10, f"password_hash too short: {pw_hash}"
    # Argon2 PHC strings start with $argon2
    assert pw_hash.startswith("$argon2") if pw_hash else True, "password should be argon2"


# ─── Collections ───────────────────────────────────────────────────────────────

async def test_create_collection(http_client, http_base):
    """Create a collection and verify it exists."""
    ok = await reducer_succeeds(
        http_client, http_base, "create_collection",
        ["test_coll_001", "Test Collection", "A test collection",
         "", "📚", "#ff0000", "test_user_001"],
    )
    assert ok, "create_collection failed"

    rows = await sql_query(
        http_client, http_base,
        "SELECT id, name FROM collection WHERE id = 'test_coll_001'",
    )
    assert_row_count(rows, 1)
    assert rows[0][1] == "Test Collection"


# ─── Pages ─────────────────────────────────────────────────────────────────────

async def test_create_page(http_client, http_base):
    """Create a page within a collection and verify it exists."""
    page_id = "test_page_001"
    ok = await reducer_succeeds(
        http_client, http_base, "create_page",
        [page_id, "Test Page", "test-page", "# Hello World",
         "Hello World", "test_coll_001", "",
         "published", "", "", False, False, "", 0, "test_user_001"],
    )
    assert ok, "create_page failed"

    rows = await sql_query(
        http_client, http_base,
        "SELECT id, title FROM page WHERE id = 'test_page_001'",
    )
    assert_row_count(rows, 1)
    assert rows[0][1] == "Test Page"


async def test_create_page_content_persisted(http_client, http_base):
    """Page content is stored correctly."""
    page_id = "test_page_content"
    content = "# My Heading\n\nSome **bold** text and *italic* text."
    await reducer_succeeds(
        http_client, http_base, "create_page",
        [page_id, "Content Test", "content-test", content,
         "My Heading\n\nSome bold text and italic text.",
         "test_coll_001", "",
         "published", "", "", False, False, "", 0, "test_user_001"],
    )
    rows = await sql_query(
        http_client, http_base,
        f"SELECT title, content FROM page WHERE id = '{page_id}'",
    )
    assert_row_count(rows, 1)
    assert rows[0][1] == content


# ─── Search ────────────────────────────────────────────────────────────────────

async def test_search_basic(http_client, http_base):
    """Basic text search returns matching pages."""
    rows = await sql_query(
        http_client, http_base,
        "SELECT id, title FROM page WHERE title LIKE '%Test%'",
    )
    # There should be at least the pages we created above
    titles = {r[1] for r in rows}
    assert "Test Page" in titles, "Search didn't find Test Page"


# ─── Data consistency ──────────────────────────────────────────────────────────

async def test_no_orphan_pages(http_client, http_base):
    """Every page should belong to an existing collection."""
    pages = await sql_query(
        http_client, http_base,
        "SELECT p.id, p.collection_id FROM page p "
        "LEFT JOIN collection c ON p.collection_id = c.id "
        "WHERE c.id IS NULL",
    )
    assert_row_count(pages, 0)


async def test_tables_have_data(http_client, http_base):
    """Core tables should have at least some rows after test data insertion."""
    checks = [
        ("user", 1),
        ("collection", 1),
        ("page", 1),
    ]
    for table, at_least in checks:
        n = await count_rows(http_client, http_base, table)
        assert n >= at_least, f"Table '{table}' has {n} rows (expected ≥{at_least})"
