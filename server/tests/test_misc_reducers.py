"""Integration tests for miscellaneous SpacetimeDB reducers.

Covers comments, share links, tags, and favorites — features commonly
used in regression testing that were previously untested at integration level.
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


# ─── Setup: shared test data ──────────────────────────────────────────────────

@pytest.fixture(scope="module")
async def shared_data(http_client, http_base):
    """Create reusable test users, collection, and page for misc reducer tests."""
    # Create users
    await reducer_succeeds(
        http_client, http_base, "create_user",
        ["misc_owner", "Misc Owner", "misc_owner@test.com", "password123"],
    )
    await reducer_succeeds(
        http_client, http_base, "create_user",
        ["misc_other", "Misc Other", "misc_other@test.com", "password456"],
    )
    # Create collection
    await reducer_succeeds(
        http_client, http_base, "create_collection",
        ["misc_coll", "Misc Collection", "For misc tests", "", "🧪", "#00ff00", "misc_owner"],
    )
    # Create a page to attach comments/shares/tags/favorites to
    await reducer_succeeds(
        http_client, http_base, "create_page",
        ["misc_page", "Misc Page", "misc-page", "# Misc Page Content",
         "Misc Page Content", "misc_coll", "",
         "published", "", "", False, False, "", 0, "misc_owner"],
    )
    return {
        "owner_id": "misc_owner",
        "other_id": "misc_other",
        "collection_id": "misc_coll",
        "page_id": "misc_page",
    }


# ─── Comments ─────────────────────────────────────────────────────────────────

async def test_create_comment(http_client, http_base, shared_data):
    """Create a comment on a page and verify it exists."""
    page_id = shared_data["page_id"]
    ok = await reducer_succeeds(
        http_client, http_base, "create_comment",
        ["misc_comment_001", page_id, shared_data["owner_id"], "This is a test comment."],
    )
    assert ok, "create_comment failed"

    rows = await sql_query(
        http_client, http_base,
        f"SELECT id, content FROM page_comment WHERE id = 'misc_comment_001'",
    )
    assert_row_count(rows, 1)
    assert rows[0][1] == "This is a test comment."


async def test_create_comment_empty(http_client, http_base, shared_data):
    """Creating a comment with empty content should succeed (STDB may or may not validate)."""
    ok = await reducer_succeeds(
        http_client, http_base, "create_comment",
        ["misc_comment_empty", shared_data["page_id"], shared_data["owner_id"], ""],
    )
    assert ok, "create_comment with empty content failed"


async def test_add_reaction(http_client, http_base, shared_data):
    """Add a reaction emoji to a comment."""
    await reducer_succeeds(
        http_client, http_base, "create_comment",
        ["misc_comment_rxn", shared_data["page_id"], shared_data["owner_id"], "React to me!"],
    )
    ok = await reducer_succeeds(
        http_client, http_base, "add_reaction",
        ["misc_comment_rxn", shared_data["owner_id"], "👍"],
    )
    assert ok, "add_reaction failed"

    rows = await sql_query(
        http_client, http_base,
        "SELECT emoji FROM comment_reaction WHERE comment_id = 'misc_comment_rxn'",
    )
    emojis = {r[0] for r in rows}
    assert "👍" in emojis, "Reaction not found"


async def test_remove_reaction(http_client, http_base, shared_data):
    """Remove a reaction from a comment."""
    comment_id = "misc_comment_rm_rxn"
    await reducer_succeeds(
        http_client, http_base, "create_comment",
        [comment_id, shared_data["page_id"], shared_data["owner_id"], "Remove reaction"],
    )
    await reducer_succeeds(
        http_client, http_base, "add_reaction",
        [comment_id, shared_data["owner_id"], "❤️"],
    )
    ok = await reducer_succeeds(
        http_client, http_base, "remove_reaction",
        [comment_id, shared_data["owner_id"], "❤️"],
    )
    assert ok, "remove_reaction failed"

    rows = await sql_query(
        http_client, http_base,
        f"SELECT emoji FROM comment_reaction WHERE comment_id = '{comment_id}'",
    )
    assert_row_count(rows, 0)


async def test_resolve_comment(http_client, http_base, shared_data):
    """Resolve a comment."""
    await reducer_succeeds(
        http_client, http_base, "create_comment",
        ["misc_comment_resolve", shared_data["page_id"], shared_data["owner_id"], "Resolve me"],
    )
    ok = await reducer_succeeds(
        http_client, http_base, "resolve_comment",
        ["misc_comment_resolve", shared_data["owner_id"]],
    )
    assert ok, "resolve_comment failed"

    rows = await sql_query(
        http_client, http_base,
        "SELECT resolved FROM page_comment WHERE id = 'misc_comment_resolve'",
    )
    assert_row_count(rows, 1)
    assert rows[0][0] is True, "Comment should be resolved"


async def test_delete_comment(http_client, http_base, shared_data):
    """Delete a comment from a page."""
    await reducer_succeeds(
        http_client, http_base, "create_comment",
        ["misc_comment_delete", shared_data["page_id"], shared_data["owner_id"], "Delete me"],
    )
    ok = await reducer_succeeds(
        http_client, http_base, "delete_comment",
        ["misc_comment_delete"],
    )
    assert ok, "delete_comment failed"

    rows = await sql_query(
        http_client, http_base,
        "SELECT id FROM page_comment WHERE id = 'misc_comment_delete'",
    )
    assert_row_count(rows, 0)


# ─── Share Links ──────────────────────────────────────────────────────────────

async def test_create_share_link(http_client, http_base, shared_data):
    """Create a public share link for a page."""
    ok = await reducer_succeeds(
        http_client, http_base, "create_share_link",
        ["misc_share_001", shared_data["page_id"], shared_data["owner_id"],
         "", "", False, 0],
    )
    assert ok, "create_share_link failed"

    rows = await sql_query(
        http_client, http_base,
        "SELECT id, page_id FROM share_link WHERE id = 'misc_share_001'",
    )
    assert_row_count(rows, 1)
    assert rows[0][1] == shared_data["page_id"]


async def test_create_share_link_with_password(http_client, http_base, shared_data):
    """Create a password-protected share link."""
    ok = await reducer_succeeds(
        http_client, http_base, "create_share_link",
        ["misc_share_pw", shared_data["page_id"], shared_data["owner_id"],
         "hunter2", "", False, 0],
    )
    assert ok, "create_share_link with password failed"

    rows = await sql_query(
        http_client, http_base,
        "SELECT id, password_hash FROM share_link WHERE id = 'misc_share_pw'",
    )
    assert_row_count(rows, 1)
    assert rows[0][1] is not None, "Password hash should be set"


async def test_create_share_link_with_expiry(http_client, http_base, shared_data):
    """Create a share link with an expiration timestamp."""
    future_ts = 9999999999  # Far future
    ok = await reducer_succeeds(
        http_client, http_base, "create_share_link",
        ["misc_share_exp", shared_data["page_id"], shared_data["owner_id"],
         "", "", False, future_ts],
    )
    assert ok, "create_share_link with expiry failed"

    rows = await sql_query(
        http_client, http_base,
        "SELECT id, expires_at FROM share_link WHERE id = 'misc_share_exp'",
    )
    assert_row_count(rows, 1)
    assert rows[0][1] == future_ts


async def test_delete_share_link(http_client, http_base, shared_data):
    """Delete a share link."""
    await reducer_succeeds(
        http_client, http_base, "create_share_link",
        ["misc_share_del", shared_data["page_id"], shared_data["owner_id"],
         "", "", False, 0],
    )
    ok = await reducer_succeeds(
        http_client, http_base, "delete_share_link",
        ["misc_share_del"],
    )
    assert ok, "delete_share_link failed"

    rows = await sql_query(
        http_client, http_base,
        "SELECT id FROM share_link WHERE id = 'misc_share_del'",
    )
    assert_row_count(rows, 0)


# ─── Tags ─────────────────────────────────────────────────────────────────────

async def test_add_tag(http_client, http_base, shared_data):
    """Add a tag to a page."""
    ok = await reducer_succeeds(
        http_client, http_base, "add_tag",
        [shared_data["page_id"], "integration-test"],
    )
    assert ok, "add_tag failed"

    rows = await sql_query(
        http_client, http_base,
        f"SELECT tag FROM page_tag WHERE page_id = '{shared_data['page_id']}' AND tag = 'integration-test'",
    )
    assert_row_count(rows, 1)


async def test_add_tag_multiple(http_client, http_base, shared_data):
    """Add multiple tags to a page."""
    for tag in ["alpha", "beta", "gamma"]:
        await reducer_succeeds(
            http_client, http_base, "add_tag",
            [shared_data["page_id"], tag],
        )

    rows = await sql_query(
        http_client, http_base,
        f"SELECT tag FROM page_tag WHERE page_id = '{shared_data['page_id']}'",
    )
    tags = {r[0] for r in rows}
    for tag in ("alpha", "beta", "gamma"):
        assert tag in tags, f"Tag '{tag}' not found"


async def test_remove_tag(http_client, http_base, shared_data):
    """Remove a tag from a page."""
    await reducer_succeeds(
        http_client, http_base, "add_tag",
        [shared_data["page_id"], "to-remove"],
    )
    ok = await reducer_succeeds(
        http_client, http_base, "remove_tag",
        [shared_data["page_id"], "to-remove"],
    )
    assert ok, "remove_tag failed"

    rows = await sql_query(
        http_client, http_base,
        f"SELECT tag FROM page_tag WHERE page_id = '{shared_data['page_id']}' AND tag = 'to-remove'",
    )
    assert_row_count(rows, 0)


# ─── Favorites ────────────────────────────────────────────────────────────────

async def test_add_favorite(http_client, http_base, shared_data):
    """Add a page to favorites for a user."""
    ok = await reducer_succeeds(
        http_client, http_base, "add_favorite",
        [shared_data["owner_id"], shared_data["page_id"]],
    )
    assert ok, "add_favorite failed"

    rows = await sql_query(
        http_client, http_base,
        f"SELECT user_id FROM favorite WHERE user_id = '{shared_data['owner_id']}' AND page_id = '{shared_data['page_id']}'",
    )
    assert_row_count(rows, 1)


async def test_add_favorite_idempotent(http_client, http_base, shared_data):
    """Adding the same favorite twice should not error (idempotent)."""
    await reducer_succeeds(
        http_client, http_base, "add_favorite",
        ["misc_owner", shared_data["page_id"]],
    )
    ok = await reducer_succeeds(
        http_client, http_base, "add_favorite",
        ["misc_owner", shared_data["page_id"]],
    )
    assert ok, "Idempotent add_favorite failed"


async def test_remove_favorite(http_client, http_base, shared_data):
    """Remove a page from favorites."""
    await reducer_succeeds(
        http_client, http_base, "add_favorite",
        ["misc_owner", shared_data["page_id"]],
    )
    ok = await reducer_succeeds(
        http_client, http_base, "remove_favorite",
        ["misc_owner", shared_data["page_id"]],
    )
    assert ok, "remove_favorite failed"

    rows = await sql_query(
        http_client, http_base,
        f"SELECT user_id FROM favorite WHERE user_id = 'misc_owner' AND page_id = '{shared_data['page_id']}'",
    )
    assert_row_count(rows, 0)


# ─── Data consistency ─────────────────────────────────────────────────────────

async def test_comment_belongs_to_page(http_client, http_base, shared_data):
    """Every comment should reference an existing page."""
    orphans = await sql_query(
        http_client, http_base,
        "SELECT c.id FROM page_comment c "
        "LEFT JOIN page p ON c.page_id = p.id "
        "WHERE p.id IS NULL",
    )
    assert_row_count(orphans, 0)


async def test_favorite_belongs_to_user(http_client, http_base, shared_data):
    """Every favorite should reference an existing user."""
    orphans = await sql_query(
        http_client, http_base,
        "SELECT f.user_id FROM favorite f "
        "LEFT JOIN user u ON f.user_id = u.id "
        "WHERE u.id IS NULL",
    )
    assert_row_count(orphans, 0)
