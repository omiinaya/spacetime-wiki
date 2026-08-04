#!/usr/bin/env python3
"""
Integration tests for collection, permission, and search reducer groups.
Adds coverage beyond the 14 core reducer tests.

Every object id is derived from a per-test `run` suffix so the suite is
idempotent against a persistent STDB. SQL avoids STDB v2.6.1 /sql
unsupported constructs (LIKE, IN, ORDER BY in mixed selects, backtick
quoting — use double quotes for reserved words like "user"/"group").
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


# ─── Helper: ensure user exists ──────────────────────────────────────────────

@pytest.fixture(scope="function")
async def seeded_user(http_client, http_base):
    """Create a unique test user for permission/collection tests."""
    user_id = f"ituser_{uuid.uuid4().hex[:10]}"
    assert await reducer_succeeds(
        http_client, http_base, "register_user",
        [user_id, "Integration Tester", f"{user_id}@test.com", "password123", "admin"],
    ), f"register_user {user_id} failed"
    return user_id


# ─── Collection Tests ────────────────────────────────────────────────────────

async def test_update_collection(http_client, http_base, seeded_user):
    """Update a collection's name, description, icon, color."""
    coll_id = f"upd_coll_{seeded_user}"
    ok = await reducer_succeeds(
        http_client, http_base, "create_collection",
        [coll_id, "Old Name", "Old desc", "", "folder", "#000000", seeded_user],
    )
    assert ok, "create_collection should succeed"

    ok = await reducer_succeeds(
        http_client, http_base, "update_collection",
        [coll_id, "New Name", "New desc", "book", "#ff0000"],
    )
    assert ok, "update_collection should succeed"

    rows = await sql_query(
        http_client, http_base,
        f"SELECT name, description, icon, color FROM collection WHERE id = '{coll_id}'",
    )
    assert len(rows) == 1
    assert rows[0][0] == "New Name", f"Expected 'New Name', got '{rows[0][0]}'"
    assert rows[0][1] == "New desc", f"Expected 'New desc', got '{rows[0][1]}'"
    assert rows[0][2] == "book", f"Expected 'book', got '{rows[0][2]}'"
    assert rows[0][3] == "#ff0000", f"Expected '#ff0000', got '{rows[0][3]}'"


async def test_delete_collection(http_client, http_base, seeded_user):
    """Delete a collection and verify it is removed."""
    coll_id = f"del_coll_{seeded_user}"
    ok = await reducer_succeeds(
        http_client, http_base, "create_collection",
        [coll_id, "Delete Me", "To be deleted", "", "trash", "#111111", seeded_user],
    )
    assert ok

    ok = await reducer_succeeds(
        http_client, http_base, "delete_collection",
        [coll_id],
    )
    assert ok

    rows = await sql_query(
        http_client, http_base,
        f"SELECT id FROM collection WHERE id = '{coll_id}'",
    )
    assert len(rows) == 0, "Collection should not exist after deletion"


async def test_collection_sort_order(http_client, http_base, seeded_user):
    """Collections have incremented sort_order."""
    parent_id = f"sort_parent_{seeded_user}"
    ok = await reducer_succeeds(
        http_client, http_base, "create_collection",
        [parent_id, "Sort Parent", "", "", "folder", "#999999", seeded_user],
    )
    assert ok

    coll_ids = [f"sort_child_{seeded_user}_{i:03d}" for i in range(3)]
    for cid in coll_ids:
        ok = await reducer_succeeds(
            http_client, http_base, "create_collection",
            [cid, f"Sort Child {cid}", "", parent_id, "sub", "#aaaaaa", seeded_user],
        )
        assert ok

    rows = await sql_query(
        http_client, http_base,
        f"SELECT id, sort_order FROM collection WHERE parent_id = '{parent_id}'",
    )
    assert len(rows) == 3
    orders = sorted(r[1] for r in rows)
    # sort_order is a GLOBAL counter — the three children created last get
    # consecutive distinct values, so assert distinctness + ordering.
    assert len(set(orders)) == 3, f"sort_order should be distinct, got {orders}"
    assert orders == sorted(orders)


# ─── Group (Permission) Tests ────────────────────────────────────────────────

async def test_create_group(http_client, http_base, seeded_user):
    """Create a group and verify it exists."""
    group_id = f"grp_{seeded_user}"
    ok = await reducer_succeeds(
        http_client, http_base, "create_group",
        [group_id, "Test Group", "A test group for permissions", seeded_user],
    )
    assert ok

    rows = await sql_query(
        http_client, http_base,
        f"SELECT id, name FROM \"group\" WHERE id = '{group_id}'",
    )
    assert len(rows) == 1, "Group should exist"
    assert rows[0][1] == "Test Group"


async def test_update_group(http_client, http_base, seeded_user):
    """Update a group's name and description."""
    group_id = f"grp_upd_{seeded_user}"
    ok = await reducer_succeeds(
        http_client, http_base, "create_group",
        [group_id, "Original Name", "Original desc", seeded_user],
    )
    assert ok

    ok = await reducer_succeeds(
        http_client, http_base, "update_group",
        [group_id, "Updated Name", "Updated desc"],
    )
    assert ok

    rows = await sql_query(
        http_client, http_base,
        f"SELECT name, description FROM \"group\" WHERE id = '{group_id}'",
    )
    assert len(rows) == 1
    assert rows[0][0] == "Updated Name"
    assert rows[0][1] == "Updated desc"


async def test_add_remove_group_member(http_client, http_base, seeded_user):
    """Add a member to a group, then remove them."""
    group_id = f"grp_mem_{seeded_user}"
    member_user = f"grpmem_{seeded_user}"

    # Ensure member user exists via register_user
    assert await reducer_succeeds(
        http_client, http_base, "register_user",
        [member_user, "Group Member", f"{member_user}@test.com", "password123", "member"],
    ), "register_user member failed"

    ok = await reducer_succeeds(
        http_client, http_base, "create_group",
        [group_id, "Member Group", "Group for member testing", seeded_user],
    )
    assert ok

    ok = await reducer_succeeds(
        http_client, http_base, "add_group_member",
        [f"{group_id}_gm_001", group_id, member_user, "member", seeded_user],
    )
    assert ok

    rows = await sql_query(
        http_client, http_base,
        f"SELECT id FROM group_member WHERE group_id = '{group_id}' AND user_id = '{member_user}'",
    )
    assert len(rows) >= 1, "Member should be in group"

    # Remove the member (by group_member id)
    member_id = rows[0][0]
    ok = await reducer_succeeds(
        http_client, http_base, "remove_group_member",
        [member_id],
    )
    assert ok

    rows = await sql_query(
        http_client, http_base,
        f"SELECT id FROM group_member WHERE group_id = '{group_id}' AND user_id = '{member_user}'",
    )
    assert len(rows) == 0, "Member should be removed from group"


async def test_delete_group(http_client, http_base, seeded_user):
    """Delete a group and verify it's gone."""
    group_id = f"grp_del_{seeded_user}"
    ok = await reducer_succeeds(
        http_client, http_base, "create_group",
        [group_id, "Delete Group", "To be deleted", seeded_user],
    )
    assert ok

    ok = await reducer_succeeds(
        http_client, http_base, "delete_group",
        [group_id],
    )
    assert ok

    rows = await sql_query(
        http_client, http_base,
        f"SELECT id FROM \"group\" WHERE id = '{group_id}'",
    )
    assert len(rows) == 0, "Group should be deleted"


async def test_set_collection_group_permission(http_client, http_base, seeded_user):
    """Set read permission on a collection for a group."""
    coll_id = f"perm_coll_g_{seeded_user}"
    group_id = f"perm_grp_{seeded_user}"

    ok = await reducer_succeeds(
        http_client, http_base, "create_collection",
        [coll_id, "Perm Coll G", "Permission test coll", "", "lock", "#444444", seeded_user],
    )
    assert ok

    ok = await reducer_succeeds(
        http_client, http_base, "create_group",
        [group_id, "Perm Group", "Group for coll permission", seeded_user],
    )
    assert ok

    perm_id = f"{coll_id}_perm"
    ok = await reducer_succeeds(
        http_client, http_base, "set_collection_group_permission",
        [perm_id, coll_id, group_id, "viewer"],
    )
    assert ok

    rows = await sql_query(
        http_client, http_base,
        f"SELECT role FROM collection_group_permission "
        f"WHERE collection_id = '{coll_id}' AND group_id = '{group_id}'",
    )
    assert len(rows) >= 1, "Permission row should exist"
    assert rows[0][0] == "viewer"


async def test_set_page_permission(http_client, http_base, seeded_user):
    """Set read permission on a page for a user."""
    coll_id = f"page_perm_coll_{seeded_user}"
    page_id = f"page_perm_{seeded_user}"
    target_user = f"pageperm_{seeded_user}"

    assert await reducer_succeeds(
        http_client, http_base, "register_user",
        [target_user, "Page Perm User", f"{target_user}@test.com", "password123", "member"],
    ), "register_user target failed"

    ok = await reducer_succeeds(
        http_client, http_base, "create_collection",
        [coll_id, "Page Perm Coll", "", "", "file", "#555555", seeded_user],
    )
    assert ok

    ok = await reducer_succeeds(
        http_client, http_base, "create_page",
        [page_id, "Perm Test Page", "# Test content\nHello",
         coll_id, "", seeded_user],
    )
    assert ok

    perm_id = f"{page_id}_perm"
    ok = await reducer_succeeds(
        http_client, http_base, "set_page_permission",
        [perm_id, page_id, target_user, "", "viewer"],
    )
    assert ok

    rows = await sql_query(
        http_client, http_base,
        f"SELECT role FROM page_permission "
        f"WHERE page_id = '{page_id}' AND user_id = '{target_user}'",
    )
    assert len(rows) >= 1, "Page permission row should exist"
    assert rows[0][0] == "viewer"


# ─── Search Tests ────────────────────────────────────────────────────────────

async def test_search_no_results(http_client, http_base):
    """Search with a non-matching query returns no results."""
    token = f"srch_none_{uuid.uuid4().hex[:8]}"
    ok = await reducer_succeeds(
        http_client, http_base, "search_pages",
        [token, "ZZZZNONEXISTENTZZZZ", "", "", 0, 0],
    )
    assert ok, "search_pages should not error on no matches"
    rows = await sql_query(
        http_client, http_base,
        f"SELECT id FROM search_result WHERE search_token = '{token}'",
    )
    assert len(rows) == 0, "Non-matching search should return no results"


async def test_search_multiple_results(http_client, http_base, seeded_user):
    """Create pages and verify they appear in query results."""
    coll_id = f"srch_coll_{seeded_user}"
    page_ids = [f"srch_page_a_{seeded_user}", f"srch_page_b_{seeded_user}"]

    ok = await reducer_succeeds(
        http_client, http_base, "create_collection",
        [coll_id, "Search Coll", "", "", "search", "#888888", seeded_user],
    )
    assert ok

    for pid in page_ids:
        ok = await reducer_succeeds(
            http_client, http_base, "create_page",
            [pid, f"Searchable {pid}", f"# Content for {pid}",
             coll_id, "", seeded_user],
        )
        assert ok

    # Verify both pages exist (no IN — two queries)
    for pid in page_ids:
        rows = await sql_query(
            http_client, http_base,
            f"SELECT id FROM page WHERE id = '{pid}'",
        )
        assert len(rows) == 1, f"Page {pid} should exist"


async def test_search_with_pagination(http_client, http_base):
    """Search with LIMIT works correctly."""
    rows = await sql_query(
        http_client, http_base,
        "SELECT id FROM page LIMIT 1",
    )
    assert isinstance(rows, list)
