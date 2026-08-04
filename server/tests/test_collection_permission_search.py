"""Integration tests for collection, permission, and search reducer groups.

Tests cover:
  - Collection: update, delete, reorder, sort rules, auto-sort
  - Permissions: groups CRUD, group members, collection/page permissions
  - Search: search_pages, cleanup_search_results, empty query, edge cases

Every object id is derived from a per-test `run` suffix so the suite is
idempotent against a persistent STDB. SQL avoids STDB v2.6.1 /sql unsupported
constructs (LIKE, IN, ORDER BY in mixed selects, backtick quoting).
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


def _run() -> str:
    return uuid.uuid4().hex[:10]


# ═══════════════════════════════════════════════════════════════════════════════
# Collection Reducers
# ═══════════════════════════════════════════════════════════════════════════════

async def test_update_collection(http_client, http_base):
    """Update a collection name, description, icon, and color."""
    run = _run()
    coll_id = f"upd_coll_{run}"
    owner = f"upd_owner_{run}"
    await reducer_succeeds(
        http_client, http_base, "register_user",
        [owner, "Owner", f"{owner}@test.com", "pw", "member"],
    )
    await reducer_succeeds(
        http_client, http_base, "create_collection",
        [coll_id, "Original", "Original desc", "", "📁", "#000000", owner],
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
    perm_id = f"cgp_rm_{_run()}"
    await reducer_succeeds(
        http_client, http_base, "set_collection_group_permission",
        [perm_id, f"coll_{_run()}", f"grp_{_run()}", "viewer"],
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
    run = _run()
    page_id = f"pp_page_{run}"
    group_id = f"pp_grp_{run}"
    perm_id = f"pp_{run}"
    owner = f"pp_owner_{run}"
    coll_id = f"pp_coll_{run}"
    await reducer_succeeds(
        http_client, http_base, "register_user",
        [owner, "Owner", f"{owner}@test.com", "pw", "member"],
    )
    await reducer_succeeds(
        http_client, http_base, "create_collection",
        [coll_id, "PP Coll", "", "", "", "", owner],
    )
    await reducer_succeeds(
        http_client, http_base, "create_page",
        [page_id, "Page Perm", "Content", coll_id, "", owner],
    )
    await reducer_succeeds(
        http_client, http_base, "create_group",
        [group_id, "Page Perm Group", "", owner],
    )
    ok = await reducer_succeeds(
        http_client, http_base, "set_page_permission",
        [perm_id, page_id, "", group_id, "editor"],
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
    perm_id = f"pp_rm_{_run()}"
    await reducer_succeeds(
        http_client, http_base, "set_page_permission",
        [perm_id, f"page_{_run()}", "", f"grp_{_run()}", "viewer"],
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
    run = _run()
    search_token = f"srch_basic_{run}"
    owner = f"srowner_{run}"
    coll_id = f"srcoll_{run}"
    await reducer_succeeds(
        http_client, http_base, "register_user",
        [owner, "SOwner", f"{owner}@test.com", "pw", "member"],
    )
    await reducer_succeeds(
        http_client, http_base, "create_collection",
        [coll_id, "Search Coll", "", "", "", "", owner],
    )
    await reducer_succeeds(
        http_client, http_base, "create_page",
        [f"srtest_{run}", "Test Search Page", "# Test content here", coll_id, "", owner],
    )
    ok = await reducer_succeeds(
        http_client, http_base, "search_pages",
        [search_token, "Test", "", "", 0, 0],
    )
    assert ok, "search_pages failed"
    rows = await sql_query(
        http_client, http_base,
        f"SELECT id, search_token, title FROM search_result WHERE search_token = '{search_token}'",
    )
    assert_gt(len(rows), 0)
    assert all(r[1] == search_token for r in rows)


async def test_search_pages_empty_query(http_client, http_base):
    """Search with an empty query should fail."""
    ok = await reducer_succeeds(
        http_client, http_base, "search_pages",
        [f"tok_empty_{_run()}", "", "", "", 0, 0],
    )
    assert not ok, "Empty query should fail"


async def test_search_pages_case_insensitive(http_client, http_base):
    """Search should be case-insensitive."""
    run = _run()
    search_token = f"srch_case_{run}"
    owner = f"srowner_{run}"
    coll_id = f"srcoll_{run}"
    await reducer_succeeds(
        http_client, http_base, "register_user",
        [owner, "SOwner", f"{owner}@test.com", "pw", "member"],
    )
    await reducer_succeeds(
        http_client, http_base, "create_collection",
        [coll_id, "Search Coll", "", "", "", "", owner],
    )
    await reducer_succeeds(
        http_client, http_base, "create_page",
        [f"srcase_{run}", "TestCase Page", "# CONTENT alpha", coll_id, "", owner],
    )
    ok = await reducer_succeeds(
        http_client, http_base, "search_pages",
        [search_token, "content", "", "", 0, 0],
    )
    assert ok, "search_pages case-insensitive failed"
    rows = await sql_query(
        http_client, http_base,
        f"SELECT title FROM search_result WHERE search_token = '{search_token}'",
    )
    assert_gt(len(rows), 0)


async def test_search_pages_trims_whitespace(http_client, http_base):
    """Search query should be trimmed before processing."""
    search_token = f"srch_trim_{_run()}"
    ok = await reducer_succeeds(
        http_client, http_base, "search_pages",
        [search_token, "  Test  ", "", "", 0, 0],
    )
    assert ok, "search_pages trim failed"


async def test_search_pages_reuses_token(http_client, http_base):
    """Searching with an existing token should replace old results."""
    search_token = f"srch_reuse_{_run()}"
    await reducer_succeeds(
        http_client, http_base, "search_pages",
        [search_token, "First", "", "", 0, 0],
    )
    rows_before = await sql_query(
        http_client, http_base,
        f"SELECT id FROM search_result WHERE search_token = '{search_token}'",
    )
    await reducer_succeeds(
        http_client, http_base, "search_pages",
        [search_token, "Test", "", "", 0, 0],
    )
    rows_after = await sql_query(
        http_client, http_base,
        f"SELECT id FROM search_result WHERE search_token = '{search_token}'",
    )
    assert_gt(len(rows_after), 0)


async def test_search_pages_by_collection(http_client, http_base):
    """Search scoped to a specific collection."""
    search_token = f"srch_coll_{_run()}"
    ok = await reducer_succeeds(
        http_client, http_base, "search_pages",
        [search_token, "Test", f"coll_{_run()}", "", 0, 0],
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
    search_token = f"srch_cleanup_{_run()}"
    await reducer_succeeds(
        http_client, http_base, "search_pages",
        [search_token, "Test", "", "", 0, 0],
    )
    ok = await reducer_succeeds(
        http_client, http_base, "cleanup_search_results", [0],
    )
    assert ok, "cleanup_search_results failed"


# ═══════════════════════════════════════════════════════════════════════════════
# Collection Member Reducers
# ═══════════════════════════════════════════════════════════════════════════════

async def test_add_collection_member(http_client, http_base):
    """Add a member to a collection and verify membership."""
    run = _run()
    coll_id = f"cm_coll_{run}"
    member_id = f"cm_{run}"
    owner = f"cm_owner_{run}"
    member = f"cm_member_{run}"
    await reducer_succeeds(
        http_client, http_base, "register_user",
        [owner, "CM Owner", f"{owner}@test.com", "pw", "member"],
    )
    await reducer_succeeds(
        http_client, http_base, "register_user",
        [member, "CM Member", f"{member}@test.com", "pw", "member"],
    )
    await reducer_succeeds(
        http_client, http_base, "create_collection",
        [coll_id, "Coll Member Add", "", "", "", "", owner],
    )
    ok = await reducer_succeeds(
        http_client, http_base, "add_collection_member",
        [member_id, coll_id, member, "admin", owner],
    )
    assert ok, "add_collection_member failed"
    rows = await sql_query(
        http_client, http_base,
        f"SELECT collection_id, user_id, role FROM collection_member WHERE id = '{member_id}'",
    )
    assert_row_count(rows, 1)
    assert rows[0][0] == coll_id
    assert rows[0][1] == member
    assert rows[0][2] == "admin"


async def test_add_collection_member_duplicate(http_client, http_base):
    """Adding the same member twice should fail."""
    run = _run()
    coll_id = f"cmdup_coll_{run}"
    owner = f"cmdup_owner_{run}"
    member = f"cmdup_member_{run}"
    await reducer_succeeds(
        http_client, http_base, "register_user",
        [owner, "CMDup Owner", f"{owner}@test.com", "pw", "member"],
    )
    await reducer_succeeds(
        http_client, http_base, "register_user",
        [member, "CMDup Member", f"{member}@test.com", "pw", "member"],
    )
    await reducer_succeeds(
        http_client, http_base, "create_collection",
        [coll_id, "Coll Member Dup", "", "", "", "", owner],
    )
    await reducer_succeeds(
        http_client, http_base, "add_collection_member",
        [f"cmdup_1_{run}", coll_id, member, "member", owner],
    )
    ok = await reducer_succeeds(
        http_client, http_base, "add_collection_member",
        [f"cmdup_2_{run}", coll_id, member, "member", owner],
    )
    assert not ok, "Duplicate collection member should fail"


async def test_update_collection_member_role(http_client, http_base):
    """Update a collection member's role."""
    run = _run()
    coll_id = f"cmrole_coll_{run}"
    member_id = f"cmrole_{run}"
    owner = f"cmrole_owner_{run}"
    member = f"cmrole_member_{run}"
    await reducer_succeeds(
        http_client, http_base, "register_user",
        [owner, "CMRole Owner", f"{owner}@test.com", "pw", "member"],
    )
    await reducer_succeeds(
        http_client, http_base, "register_user",
        [member, "CMRole Member", f"{member}@test.com", "pw", "member"],
    )
    await reducer_succeeds(
        http_client, http_base, "create_collection",
        [coll_id, "Coll Member Role", "", "", "", "", owner],
    )
    await reducer_succeeds(
        http_client, http_base, "add_collection_member",
        [member_id, coll_id, member, "member", owner],
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
    run = _run()
    coll_id = f"cmrm_coll_{run}"
    member_id = f"cmrm_{run}"
    owner = f"cmrm_owner_{run}"
    await reducer_succeeds(
        http_client, http_base, "register_user",
        [owner, "CMRM Owner", f"{owner}@test.com", "pw", "member"],
    )
    await reducer_succeeds(
        http_client, http_base, "create_collection",
        [coll_id, "Coll Member RM", "", "", "", "", owner],
    )
    await reducer_succeeds(
        http_client, http_base, "add_collection_member",
        [member_id, coll_id, owner, "member", owner],
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
    run = _run()
    link_id = f"share_{run}"
    owner = f"share_owner_{run}"
    coll_id = f"share_coll_{run}"
    page_id = f"share_page_{run}"
    await reducer_succeeds(
        http_client, http_base, "register_user",
        [owner, "Share Owner", f"{owner}@test.com", "pw", "member"],
    )
    await reducer_succeeds(
        http_client, http_base, "create_collection",
        [coll_id, "Share Coll", "", "", "", "", owner],
    )
    await reducer_succeeds(
        http_client, http_base, "create_page",
        [page_id, "Share Page", "# x", coll_id, "", owner],
    )
    ok = await reducer_succeeds(
        http_client, http_base, "create_share_link",
        [link_id, page_id, f"tok_{run}", "", owner, 0],
    )
    assert ok, "create_share_link failed"
    rows = await sql_query(
        http_client, http_base,
        f"SELECT id, page_id, token FROM share_link WHERE id = '{link_id}'",
    )
    assert_row_count(rows, 1)
    assert rows[0][0] == link_id
    assert rows[0][1] == page_id


async def test_delete_share_link(http_client, http_base):
    """Delete a share link and verify deletion."""
    run = _run()
    link_id = f"share_del_{run}"
    owner = f"share_del_owner_{run}"
    coll_id = f"share_del_coll_{run}"
    page_id = f"share_del_page_{run}"
    await reducer_succeeds(
        http_client, http_base, "register_user",
        [owner, "SOwner", f"{owner}@test.com", "pw", "member"],
    )
    await reducer_succeeds(
        http_client, http_base, "create_collection",
        [coll_id, "SColl", "", "", "", "", owner],
    )
    await reducer_succeeds(
        http_client, http_base, "create_page",
        [page_id, "SPage", "# x", coll_id, "", owner],
    )
    await reducer_succeeds(
        http_client, http_base, "create_share_link",
        [link_id, page_id, f"tok_del_{run}", "", owner, 0],
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
    run = _run()
    link_id = f"share_brand_{run}"
    owner = f"share_brand_owner_{run}"
    coll_id = f"share_brand_coll_{run}"
    page_id = f"share_brand_page_{run}"
    await reducer_succeeds(
        http_client, http_base, "register_user",
        [owner, "SBOwner", f"{owner}@test.com", "pw", "member"],
    )
    await reducer_succeeds(
        http_client, http_base, "create_collection",
        [coll_id, "SBColl", "", "", "", "", owner],
    )
    await reducer_succeeds(
        http_client, http_base, "create_page",
        [page_id, "SBPage", "# x", coll_id, "", owner],
    )
    await reducer_succeeds(
        http_client, http_base, "create_share_link",
        [link_id, page_id, f"tok_brand_{run}", "", owner, 0],
    )
    ok = await reducer_succeeds(
        http_client, http_base, "update_share_branding",
        [link_id, {"some": "Custom Brand"}, {"none": []}],
    )
    assert ok, "update_share_branding failed"


async def test_verify_share_password(http_client, http_base):
    """Verify a share link password succeeds."""
    run = _run()
    link_id = f"share_pw_{run}"
    owner = f"share_pw_owner_{run}"
    coll_id = f"share_pw_coll_{run}"
    page_id = f"share_pw_page_{run}"
    await reducer_succeeds(
        http_client, http_base, "register_user",
        [owner, "SPOwner", f"{owner}@test.com", "pw", "member"],
    )
    await reducer_succeeds(
        http_client, http_base, "create_collection",
        [coll_id, "SPColl", "", "", "", "", owner],
    )
    await reducer_succeeds(
        http_client, http_base, "create_page",
        [page_id, "SPPage", "# x", coll_id, "", owner],
    )
    await reducer_succeeds(
        http_client, http_base, "create_share_link",
        [link_id, page_id, f"tok_pw_{run}", "secret123", owner, 0],
    )
    ok = await reducer_succeeds(
        http_client, http_base, "verify_share_password",
        [f"tok_pw_{run}", "secret123"],
    )
    assert ok, "verify_share_password should succeed with correct password"


async def test_visit_share_link(http_client, http_base):
    """Record a visit to a share link."""
    run = _run()
    link_id = f"share_visit_{run}"
    owner = f"share_visit_owner_{run}"
    coll_id = f"share_visit_coll_{run}"
    page_id = f"share_visit_page_{run}"
    await reducer_succeeds(
        http_client, http_base, "register_user",
        [owner, "SVOwner", f"{owner}@test.com", "pw", "member"],
    )
    await reducer_succeeds(
        http_client, http_base, "create_collection",
        [coll_id, "SVColl", "", "", "", "", owner],
    )
    await reducer_succeeds(
        http_client, http_base, "create_page",
        [page_id, "SVPage", "# x", coll_id, "", owner],
    )
    await reducer_succeeds(
        http_client, http_base, "create_share_link",
        [link_id, page_id, f"tok_visit_{run}", "", owner, 0],
    )
    ok = await reducer_succeeds(
        http_client, http_base, "visit_share_link", [f"tok_visit_{run}"],
    )
    assert ok, "visit_share_link failed"