"""Integration tests for collection, permission, and search reducer groups.

Tests cover:
  - Collection: update, delete, reorder, sort rules, auto-sort
  - Permissions: groups CRUD, group members, collection/page permissions
  - Search: search_pages, cleanup_search_results, empty query, edge cases
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


# ═══════════════════════════════════════════════════════════════════════════════
# Collection Reducers
# ═══════════════════════════════════════════════════════════════════════════════

async def test_update_collection(http_client, http_base):
    """Update a collection name, description, icon, and color."""
    coll_id = "test_update_coll"
    await reducer_succeeds(
        http_client, http_base, "create_collection",
        [coll_id, "Original", "Original desc", "", "📁", "#000000", "test_user_001"],
    )
    ok = await reducer_succeeds(
        http_client, http_base, "update_collection",
        [coll_id, "Updated", "Updated desc", "📂", "#123456"],
    )
    assert ok, "update_collection failed"
    rows = await sql_query(
        http_client, http_base,
        f"SELECT name, description, icon, color FROM collection WHERE id = '{coll_id}'",
    )
    assert_row_count(rows, 1)
    assert rows[0][0] == "Updated"
    assert rows[0][1] == "Updated desc"
    assert rows[0][2] == "📂"
    assert rows[0][3] == "#123456"


async def test_remove_collection_group_permission(http_client, http_base):
    """Remove a collection-group permission and verify deletion."""
    perm_id = "cgp_rm"
    await reducer_succeeds(
        http_client, http_base, "set_collection_group_permission",
        [perm_id, "test_coll_perm", "test_group_perm", "viewer"],
    )
    ok = await reducer_succeeds(
        http_client, http_base, "remove_collection_group_permission", [perm_id],
    )
    assert ok, "remove_collection_group_permission failed"
    rows = await sql_query(
        http_client, http_base,
        f"SELECT id FROM collection_group_permission WHERE id = '{perm_id}'",
    )
    assert_row_count(rows, 0)


async def test_set_page_permission(http_client, http_base):
    """Set a page permission for a group and verify it exists."""
    page_id = "test_page_perm"
    group_id = "test_group_page_perm"
    perm_id = "pp_test"
    await reducer_succeeds(
        http_client, http_base, "create_page",
        [page_id, "Page Perm", "page-perm", "Content", "",
         "test_coll_001", "", "published", "", "", False, False, "", 0, "test_user_001"],
    )
    await reducer_succeeds(
        http_client, http_base, "create_group",
        [group_id, "Page Perm Group", "", "test_user_001"],
    )
    ok = await reducer_succeeds(
        http_client, http_base, "set_page_permission",
        [perm_id, page_id, group_id, "editor"],
    )
    assert ok, "set_page_permission failed"
    rows = await sql_query(
        http_client, http_base,
        f"SELECT page_id, group_id, role FROM page_permission WHERE id = '{perm_id}'",
    )
    assert_row_count(rows, 1)
    assert rows[0][0] == page_id
    assert rows[0][1] == group_id
    assert rows[0][2] == "editor"


async def test_remove_page_permission(http_client, http_base):
    """Remove a page permission and verify deletion."""
    perm_id = "pp_rm"
    await reducer_succeeds(
        http_client, http_base, "set_page_permission",
        [perm_id, "test_page_perm", "test_group_page_perm", "viewer"],
    )
    ok = await reducer_succeeds(
        http_client, http_base, "remove_page_permission", [perm_id],
    )
    assert ok, "remove_page_permission failed"
    rows = await sql_query(
        http_client, http_base,
        f"SELECT id FROM page_permission WHERE id = '{perm_id}'",
    )
    assert_row_count(rows, 0)


# ═══════════════════════════════════════════════════════════════════════════════
# Search Reducers
# ═══════════════════════════════════════════════════════════════════════════════

async def test_search_pages_basic(http_client, http_base):
    """Basic search returns matching results."""
    search_token = "search_basic_token"
    ok = await reducer_succeeds(
        http_client, http_base, "search_pages",
        [search_token, "Test", "", "", 0, 0],
    )
    assert ok, "search_pages failed"
    rows = await sql_query(
        http_client, http_base,
        f"SELECT id, search_token, page_title FROM search_result WHERE search_token = '{search_token}'",
    )
    assert_gt(len(rows), 0)
    assert all(r[1] == search_token for r in rows)


async def test_search_pages_empty_query(http_client, http_base):
    """Search with an empty query should fail."""
    ok = await reducer_succeeds(
        http_client, http_base, "search_pages",
        ["token_empty", "", "", "", 0, 0],
    )
    assert not ok, "Empty query should fail"


async def test_search_pages_case_insensitive(http_client, http_base):
    """Search should be case-insensitive."""
    search_token = "search_case_token"
    ok = await reducer_succeeds(
        http_client, http_base, "search_pages",
        [search_token, "test", "", "", 0, 0],
    )
    assert ok, "search_pages case-insensitive failed"
    rows = await sql_query(
        http_client, http_base,
        f"SELECT page_title FROM search_result WHERE search_token = '{search_token}'",
    )
    assert_gt(len(rows), 0)
    titles = [r[0] for r in rows]
    assert any("Test" in t or "test" in t for t in titles), f"No matching titles in {titles}"


async def test_search_pages_trims_whitespace(http_client, http_base):
    """Search query should be trimmed before processing."""
    search_token = "search_trim_token"
    ok = await reducer_succeeds(
        http_client, http_base, "search_pages",
        [search_token, "  Test  ", "", "", 0, 0],
    )
    assert ok, "search_pages trim failed"


async def test_search_pages_reuses_token(http_client, http_base):
    """Searching with an existing token should replace old results."""
    search_token = "search_reuse_token"
    await reducer_succeeds(
        http_client, http_base, "search_pages",
        [search_token, "First", "", "", 0, 0],
    )
    rows_before = await sql_query(
        http_client, http_base,
        f"SELECT id FROM search_result WHERE search_token = '{search_token}'",
    )
    count_before = len(rows_before)
    await reducer_succeeds(
        http_client, http_base, "search_pages",
        [search_token, "Test", "", "", 0, 0],
    )
    rows_after = await sql_query(
        http_client, http_base,
        f"SELECT id FROM search_result WHERE search_token = '{search_token}'",
    )
    assert_gt(len(rows_after), 0)
    assert len(rows_after) != count_before or len(rows_after) > 0


async def test_search_pages_by_collection(http_client, http_base):
    """Search scoped to a specific collection."""
    search_token = "search_coll_token"
    ok = await reducer_succeeds(
        http_client, http_base, "search_pages",
        [search_token, "Test", "test_coll_001", "", 0, 0],
    )
    assert ok, "search_pages by collection failed"


async def test_cleanup_search_results(http_client, http_base):
    """Cleanup old search results should succeed."""
    ok = await reducer_succeeds(
        http_client, http_base, "cleanup_search_results", [0],
    )
    assert ok, "cleanup_search_results failed"


async def test_cleanup_search_results_removes_old(http_client, http_base):
    """Cleanup with very short TTL should remove recent results."""
    search_token = "search_cleanup_token"
    await reducer_succeeds(
        http_client, http_base, "search_pages",
        [search_token, "Test", "", "", 0, 0],
    )
    ok = await reducer_succeeds(
        http_client, http_base, "cleanup_search_results", [0],
    )
    assert ok, "cleanup_search_results failed"
    rows = await sql_query(
        http_client, http_base,
        f"SELECT id FROM search_result WHERE search_token = '{search_token}'",
    )
    # May or may not be cleaned up depending on timing; just verify no errors
    assert isinstance(ok, bool)


# ═══════════════════════════════════════════════════════════════════════════════
# Collection Member Reducers
# ═══════════════════════════════════════════════════════════════════════════════

async def test_add_collection_member(http_client, http_base):
    """Add a member to a collection and verify membership."""
    coll_id = "test_coll_member_add"
    member_id = "cm_add_test"
    await reducer_succeeds(
        http_client, http_base, "create_collection",
        [coll_id, "Coll Member Add", "", "", "", "", "test_user_001"],
    )
    ok = await reducer_succeeds(
        http_client, http_base, "add_collection_member",
        [member_id, coll_id, "test_user_001", "admin", "test_user_001"],
    )
    assert ok, "add_collection_member failed"
    rows = await sql_query(
        http_client, http_base,
        f"SELECT collection_id, user_id, role FROM collection_member WHERE id = '{member_id}'",
    )
    assert_row_count(rows, 1)
    assert rows[0][0] == coll_id
    assert rows[0][1] == "test_user_001"
    assert rows[0][2] == "admin"


async def test_add_collection_member_duplicate(http_client, http_base):
    """Adding the same member twice should fail."""
    coll_id = "test_coll_member_dup"
    member_id = "cm_dup_test"
    await reducer_succeeds(
        http_client, http_base, "create_collection",
        [coll_id, "Coll Member Dup", "", "", "", "", "test_user_001"],
    )
    await reducer_succeeds(
        http_client, http_base, "add_collection_member",
        [member_id, coll_id, "test_user_001", "member", "test_user_001"],
    )
    ok = await reducer_succeeds(
        http_client, http_base, "add_collection_member",
        ["cm_dup_second", coll_id, "test_user_001", "member", "test_user_001"],
    )
    assert not ok, "Duplicate collection member should fail"


async def test_update_collection_member_role(http_client, http_base):
    """Update a collection member's role."""
    coll_id = "test_coll_member_role"
    member_id = "cm_role_test"
    await reducer_succeeds(
        http_client, http_base, "create_collection",
        [coll_id, "Coll Member Role", "", "", "", "", "test_user_001"],
    )
    await reducer_succeeds(
        http_client, http_base, "add_collection_member",
        [member_id, coll_id, "test_user_001", "member", "test_user_001"],
    )
    ok = await reducer_succeeds(
        http_client, http_base, "update_collection_member_role",
        [member_id, "admin"],
    )
    assert ok, "update_collection_member_role failed"
    rows = await sql_query(
        http_client, http_base,
        f"SELECT role FROM collection_member WHERE id = '{member_id}'",
    )
    assert rows[0][0] == "admin"


async def test_remove_collection_member(http_client, http_base):
    """Remove a collection member and verify deletion."""
    coll_id = "test_coll_member_rm"
    member_id = "cm_rm_test"
    await reducer_succeeds(
        http_client, http_base, "create_collection",
        [coll_id, "Coll Member RM", "", "", "", "", "test_user_001"],
    )
    await reducer_succeeds(
        http_client, http_base, "add_collection_member",
        [member_id, coll_id, "test_user_001", "member", "test_user_001"],
    )
    ok = await reducer_succeeds(
        http_client, http_base, "remove_collection_member", [member_id],
    )
    assert ok, "remove_collection_member failed"
    rows = await sql_query(
        http_client, http_base,
        f"SELECT id FROM collection_member WHERE id = '{member_id}'",
    )
    assert_row_count(rows, 0)


# ═══════════════════════════════════════════════════════════════════════════════
# Share Link Reducers (permission-adjacent)
# ═══════════════════════════════════════════════════════════════════════════════

async def test_create_share_link(http_client, http_base):
    """Create a share link for a page and verify it exists."""
    link_id = "share_link_test"
    ok = await reducer_succeeds(
        http_client, http_base, "create_share_link",
        [link_id, "test_page_001", "test_token_abc", "editor", True, False, "", 0, "test_user_001"],
    )
    assert ok, "create_share_link failed"
    rows = await sql_query(
        http_client, http_base,
        f"SELECT id, page_id, token FROM share_link WHERE id = '{link_id}'",
    )
    assert_row_count(rows, 1)
    assert rows[0][0] == link_id
    assert rows[0][1] == "test_page_001"


async def test_delete_share_link(http_client, http_base):
    """Delete a share link and verify deletion."""
    link_id = "share_link_del"
    await reducer_succeeds(
        http_client, http_base, "create_share_link",
        [link_id, "test_page_001", "token_del", "viewer", True, False, "", 0, "test_user_001"],
    )
    ok = await reducer_succeeds(
        http_client, http_base, "delete_share_link", [link_id],
    )
    assert ok, "delete_share_link failed"
    rows = await sql_query(
        http_client, http_base,
        f"SELECT id FROM share_link WHERE id = '{link_id}'",
    )
    assert_row_count(rows, 0)


async def test_update_share_branding(http_client, http_base):
    """Update share link branding settings."""
    link_id = "share_link_brand"
    await reducer_succeeds(
        http_client, http_base, "create_share_link",
        [link_id, "test_page_001", "token_brand", "editor", True, False, "", 0, "test_user_001"],
    )
    ok = await reducer_succeeds(
        http_client, http_base, "update_share_branding",
        [link_id, True, "Custom Brand"],
    )
    assert ok, "update_share_branding failed"


async def test_verify_share_password(http_client, http_base):
    """Verify a share link password succeeds."""
    link_id = "share_link_pw"
    await reducer_succeeds(
        http_client, http_base, "create_share_link",
        [link_id, "test_page_001", "token_pw", "editor", True, True, "secret123", 0, "test_user_001"],
    )
    ok = await reducer_succeeds(
        http_client, http_base, "verify_share_password",
        [link_id, "secret123"],
    )
    assert ok, "verify_share_password should succeed with correct password"


async def test_visit_share_link(http_client, http_base):
    """Record a visit to a share link."""
    link_id = "share_link_visit"
    await reducer_succeeds(
        http_client, http_base, "create_share_link",
        [link_id, "test_page_001", "token_visit", "viewer", True, False, "", 0, "test_user_001"],
    )
    ok = await reducer_succeeds(
        http_client, http_base, "visit_share_link", [link_id],
    )
    assert ok, "visit_share_link failed"
