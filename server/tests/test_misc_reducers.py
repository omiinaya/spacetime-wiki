"""Integration tests for misc SpacetimeDB reducers (comments, shares, tags, favorites).

NOTE: these are integration tests — they require a live STDB instance with the
spacetime-wiki module published (see docker-compose.yml tests profile). They
call reducers directly via the STDB HTTP API and assert on the resulting rows.

Every object id is derived from a per-test `run` suffix so the suite is
idempotent against a persistent STDB (no --delete-data needed between runs).
"""

from __future__ import annotations

import uuid

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


# ─── Setup: shared test data ──────────────────────────────────────────────────

@pytest.fixture(scope="function")
async def shared_data(http_client, http_base):
    """Create reusable test users, collection, and page for misc reducer tests.

    Function-scoped with a unique suffix PER CALL so each test gets fresh
    rows (module-scope would collide on the second test since register_user
    rejects duplicate emails).
    """
    run = uuid.uuid4().hex[:10]
    owner = f"misc_owner_{run}"
    other = f"misc_other_{run}"
    coll = f"misc_coll_{run}"
    page = f"misc_page_{run}"
    # Create users
    assert await reducer_succeeds(
        http_client, http_base, "register_user",
        [owner, "Misc Owner", f"{owner}@test.com", "password123", "member"],
    ), f"register_user {owner} failed"
    assert await reducer_succeeds(
        http_client, http_base, "register_user",
        [other, "Misc Other", f"{other}@test.com", "password456", "member"],
    ), f"register_user {other} failed"
    # Create collection
    assert await reducer_succeeds(
        http_client, http_base, "create_collection",
        [coll, "Misc Collection", "For misc tests", "", "🧪", "#00ff00", owner],
    ), f"create_collection {coll} failed"
    # Create a page to attach comments/shares/tags/favorites to
    assert await reducer_succeeds(
        http_client, http_base, "create_page",
        [page, "Misc Page", "# Misc Page Content", coll, "", owner],
    ), f"create_page {page} failed"
    return {
        "run": run,
        "owner_id": owner,
        "other_id": other,
        "collection_id": coll,
        "page_id": page,
    }


# ─── Comments ─────────────────────────────────────────────────────────────────

async def test_create_comment(http_client, http_base, shared_data):
    """Create a comment on a page and verify it exists."""
    page_id = shared_data["page_id"]
    cid = f"misc_comment_001_{shared_data['run']}"
    ok = await reducer_succeeds(
        http_client, http_base, "add_comment",
        [cid, page_id, "", shared_data["owner_id"], "This is a test comment.", ""],
    )
    assert ok, "add_comment failed"

    rows = await sql_query(
        http_client, http_base,
        f"SELECT id, body FROM comment WHERE id = '{cid}'",
    )
    assert_row_count(rows, 1)
    assert rows[0][1] == "This is a test comment."


async def test_create_comment_empty(http_client, http_base, shared_data):
    """Creating a comment with empty content should succeed (STDB may or may not validate)."""
    cid = f"misc_comment_empty_{shared_data['run']}"
    ok = await reducer_succeeds(
        http_client, http_base, "add_comment",
        [cid, shared_data["page_id"], "", shared_data["owner_id"], "", ""],
    )
    assert ok, "add_comment with empty content failed"


async def test_add_reaction(http_client, http_base, shared_data):
    """Add a reaction emoji to a comment."""
    cid = f"misc_comment_rxn_{shared_data['run']}"
    await reducer_succeeds(
        http_client, http_base, "add_comment",
        [cid, shared_data["page_id"], "", shared_data["owner_id"], "React to me!", ""],
    )
    ok = await reducer_succeeds(
        http_client, http_base, "add_comment_reaction",
        [f"misc_rxn_001_{shared_data['run']}", cid, shared_data["owner_id"], "👍"],
    )
    assert ok, "add_comment_reaction failed"

    rows = await sql_query(
        http_client, http_base,
        f"SELECT emoji FROM comment_reaction WHERE comment_id = '{cid}'",
    )
    emojis = {r[0] for r in rows}
    assert "👍" in emojis, "Reaction not found"


async def test_remove_reaction(http_client, http_base, shared_data):
    """Remove a reaction from a comment (add_comment_reaction is a toggle)."""
    run = shared_data["run"]
    comment_id = f"misc_comment_rm_rxn_{run}"
    await reducer_succeeds(
        http_client, http_base, "add_comment",
        [comment_id, shared_data["page_id"], "", shared_data["owner_id"], "Remove reaction", ""],
    )
    # Toggle ON
    await reducer_succeeds(
        http_client, http_base, "add_comment_reaction",
        [f"misc_rxn_rm_{run}", comment_id, shared_data["owner_id"], "❤️"],
    )
    # Toggle OFF (same user + emoji removes it)
    ok = await reducer_succeeds(
        http_client, http_base, "add_comment_reaction",
        [f"misc_rxn_rm_{run}", comment_id, shared_data["owner_id"], "❤️"],
    )
    assert ok, "reaction toggle-off failed"

    rows = await sql_query(
        http_client, http_base,
        f"SELECT emoji FROM comment_reaction WHERE comment_id = '{comment_id}'",
    )
    assert_row_count(rows, 0)


async def test_resolve_comment(http_client, http_base, shared_data):
    """Resolve a comment."""
    cid = f"misc_comment_resolve_{shared_data['run']}"
    await reducer_succeeds(
        http_client, http_base, "add_comment",
        [cid, shared_data["page_id"], "", shared_data["owner_id"], "Resolve me", ""],
    )
    ok = await reducer_succeeds(
        http_client, http_base, "resolve_comment",
        [cid],
    )
    assert ok, "resolve_comment failed"

    rows = await sql_query(
        http_client, http_base,
        f"SELECT is_resolved FROM comment WHERE id = '{cid}'",
    )
    assert_row_count(rows, 1)
    assert rows[0][0] is True, "Comment should be resolved"


async def test_delete_comment(http_client, http_base, shared_data):
    """Delete a comment from a page."""
    cid = f"misc_comment_delete_{shared_data['run']}"
    await reducer_succeeds(
        http_client, http_base, "add_comment",
        [cid, shared_data["page_id"], "", shared_data["owner_id"], "Delete me", ""],
    )
    ok = await reducer_succeeds(
        http_client, http_base, "delete_comment",
        [cid],
    )
    assert ok, "delete_comment failed"

    rows = await sql_query(
        http_client, http_base,
        f"SELECT id FROM comment WHERE id = '{cid}'",
    )
    assert_row_count(rows, 0)


# ─── Share Links ──────────────────────────────────────────────────────────────

async def test_create_share_link(http_client, http_base, shared_data):
    """Create a public share link for a page."""
    run = shared_data["run"]
    sid = f"misc_share_001_{run}"
    ok = await reducer_succeeds(
        http_client, http_base, "create_share_link",
        [sid, shared_data["page_id"], f"tok_misc001_{run}", "", shared_data["owner_id"], 0],
    )
    assert ok, "create_share_link failed"

    rows = await sql_query(
        http_client, http_base,
        f"SELECT id, page_id FROM share_link WHERE id = '{sid}'",
    )
    assert_row_count(rows, 1)
    assert rows[0][1] == shared_data["page_id"]


async def test_create_share_link_with_password(http_client, http_base, shared_data):
    """Create a password-protected share link."""
    run = shared_data["run"]
    sid = f"misc_share_pw_{run}"
    ok = await reducer_succeeds(
        http_client, http_base, "create_share_link",
        [sid, shared_data["page_id"], f"tok_miscpw_{run}", "hunter2", shared_data["owner_id"], 0],
    )
    assert ok, "create_share_link with password failed"

    rows = await sql_query(
        http_client, http_base,
        f"SELECT id, has_password FROM share_link WHERE id = '{sid}'",
    )
    assert_row_count(rows, 1)
    assert rows[0][1] is True, "has_password should be set for protected links"


async def test_create_share_link_with_expiry(http_client, http_base, shared_data):
    """Create a share link with an expiration timestamp."""
    run = shared_data["run"]
    sid = f"misc_share_exp_{run}"
    ok = await reducer_succeeds(
        http_client, http_base, "create_share_link",
        [sid, shared_data["page_id"], f"tok_miscexp_{run}", "", shared_data["owner_id"], 7],
    )
    assert ok, "create_share_link with expiry failed"

    rows = await sql_query(
        http_client, http_base,
        f"SELECT id, expires_at FROM share_link WHERE id = '{sid}'",
    )
    assert_row_count(rows, 1)
    assert rows[0][1] > 0, "expires_at should be set for 7-day expiry"


async def test_delete_share_link(http_client, http_base, shared_data):
    """Delete a share link."""
    run = shared_data["run"]
    sid = f"misc_share_del_{run}"
    await reducer_succeeds(
        http_client, http_base, "create_share_link",
        [sid, shared_data["page_id"], f"tok_miscdel_{run}", "", shared_data["owner_id"], 0],
    )
    ok = await reducer_succeeds(
        http_client, http_base, "delete_share_link",
        [sid],
    )
    assert ok, "delete_share_link failed"

    rows = await sql_query(
        http_client, http_base,
        f"SELECT id FROM share_link WHERE id = '{sid}'",
    )
    assert_row_count(rows, 0)


# ─── Tags ─────────────────────────────────────────────────────────────────────

async def test_add_tag(http_client, http_base, shared_data):
    """Add a tag to a page."""
    run = shared_data["run"]
    tid = f"misc_tag_001_{run}"
    ok = await reducer_succeeds(
        http_client, http_base, "add_tag",
        [tid, shared_data["page_id"], "integration-test", ""],
    )
    assert ok, "add_tag failed"

    rows = await sql_query(
        http_client, http_base,
        f"SELECT name FROM page_tag WHERE page_id = '{shared_data['page_id']}' AND name = 'integration-test'",
    )
    assert_row_count(rows, 1)


async def test_add_tag_multiple(http_client, http_base, shared_data):
    """Add multiple tags to a page."""
    run = shared_data["run"]
    for i, tag in enumerate(["alpha", "beta", "gamma"]):
        assert await reducer_succeeds(
            http_client, http_base, "add_tag",
            [f"misc_tag_m{i}_{run}", shared_data["page_id"], tag, ""],
        ), f"add_tag {tag} failed"

    rows = await sql_query(
        http_client, http_base,
        f"SELECT name FROM page_tag WHERE page_id = '{shared_data['page_id']}'",
    )
    tags = {r[0] for r in rows}
    for tag in ("alpha", "beta", "gamma"):
        assert tag in tags, f"Tag '{tag}' not found"


async def test_remove_tag(http_client, http_base, shared_data):
    """Remove a tag from a page."""
    run = shared_data["run"]
    tid = f"misc_tag_rm_{run}"
    await reducer_succeeds(
        http_client, http_base, "add_tag",
        [tid, shared_data["page_id"], "to-remove", ""],
    )
    ok = await reducer_succeeds(
        http_client, http_base, "remove_tag",
        [tid],
    )
    assert ok, "remove_tag failed"

    rows = await sql_query(
        http_client, http_base,
        f"SELECT name FROM page_tag WHERE page_id = '{shared_data['page_id']}' AND name = 'to-remove'",
    )
    assert_row_count(rows, 0)


# ─── Favorites ────────────────────────────────────────────────────────────────

async def test_add_favorite(http_client, http_base, shared_data):
    """Add a page to favorites for a user."""
    run = shared_data["run"]
    fav_id = f"misc_fav_001_{run}"
    ok = await reducer_succeeds(
        http_client, http_base, "toggle_favorite",
        [fav_id, shared_data["owner_id"], shared_data["page_id"]],
    )
    assert ok, "toggle_favorite failed"

    rows = await sql_query(
        http_client, http_base,
        f"SELECT user_id FROM favorite WHERE user_id = '{shared_data['owner_id']}' AND page_id = '{shared_data['page_id']}'",
    )
    assert_row_count(rows, 1)


async def test_add_favorite_idempotent(http_client, http_base, shared_data):
    """Toggling the same favorite twice should remove it (toggle semantics)."""
    run = shared_data["run"]
    fav_id = f"misc_fav_idem_{run}"
    await reducer_succeeds(
        http_client, http_base, "toggle_favorite",
        [fav_id, shared_data["owner_id"], shared_data["page_id"]],
    )
    ok = await reducer_succeeds(
        http_client, http_base, "toggle_favorite",
        [fav_id, shared_data["owner_id"], shared_data["page_id"]],
    )
    assert ok, "second toggle_favorite failed"

    rows = await sql_query(
        http_client, http_base,
        f"SELECT user_id FROM favorite WHERE user_id = '{shared_data['owner_id']}' AND page_id = '{shared_data['page_id']}'",
    )
    # Toggled off — should be gone
    assert_row_count(rows, 0)


async def test_remove_favorite(http_client, http_base, shared_data):
    """Remove a page from favorites (toggle off)."""
    run = shared_data["run"]
    fav_id = f"misc_fav_rm_{run}"
    await reducer_succeeds(
        http_client, http_base, "toggle_favorite",
        [fav_id, shared_data["owner_id"], shared_data["page_id"]],
    )
    ok = await reducer_succeeds(
        http_client, http_base, "toggle_favorite",
        [fav_id, shared_data["owner_id"], shared_data["page_id"]],
    )
    assert ok, "toggle_favorite (remove) failed"

    rows = await sql_query(
        http_client, http_base,
        f"SELECT user_id FROM favorite WHERE user_id = '{shared_data['owner_id']}' AND page_id = '{shared_data['page_id']}'",
    )
    assert_row_count(rows, 0)


# ─── Data consistency ─────────────────────────────────────────────────────────

async def test_comment_belongs_to_page(http_client, http_base, shared_data):
    """Every comment should reference an existing page."""
    # STDB v2.6.1 /sql rejects non-inner joins — do two queries instead.
    comments = await sql_query(
        http_client, http_base,
        "SELECT page_id FROM comment",
    )
    if not comments:
        return
    page_ids = list({r[0] for r in comments})
    pages = await sql_query(
        http_client, http_base,
        "SELECT id FROM page",
    )
    existing = {r[0] for r in pages}
    orphans = [pid for pid in page_ids if pid not in existing]
    assert not orphans, f"Comments reference missing pages: {orphans}"


async def test_favorite_belongs_to_user(http_client, http_base, shared_data):
    """Every favorite should reference an existing user."""
    # STDB v2.6.1 /sql rejects non-inner joins — do two queries instead.
    favorites = await sql_query(
        http_client, http_base,
        "SELECT user_id FROM favorite",
    )
    if not favorites:
        return
    user_ids = list({r[0] for r in favorites})
    users = await sql_query(
        http_client, http_base,
        "SELECT id FROM \"user\"",
    )
    existing = {r[0] for r in users}
    orphans = [uid for uid in user_ids if uid not in existing]
    assert not orphans, f"Favorites reference missing users: {orphans}"
