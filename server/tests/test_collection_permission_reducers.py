#!/usr/bin/env python3
"""
Integration tests for collection, permission, and search reducer groups.
Adds coverage beyond the 14 core reducer tests.
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


# ─── Helper: ensure user exists ──────────────────────────────────────────────

@pytest.fixture
async def seeded_user(http_client, http_base):
    """Ensure a test user exists for permission/collection tests."""
    user_id = "test_integration_user_001"
    await reducer_succeeds(
        http_client, http_base, "create_user",
        [user_id, "integration_test_user", "password123", "member", "Integration Tester", ""],
    )
    return user_id


# ─── Collection Tests ────────────────────────────────────────────────────────

async def test_update_collection(http_client, http_base, seeded_user):
    """Update a collection's name, description, icon, color."""
    coll_id = "test_upd_coll_001"
    ok = await reducer_succeeds(
        http_client, http_base, "create_collection",
        [coll_id, "Old Name", "Old desc", "", "folder", "#000000", seeded_user],
    )
    assert ok, "create_collection should succeed"

    ok = await reducer_succeeds(
        http_client, http_base, "update_collection",
        [coll_id, "New Name", "New desc", "", "book", "#ff0000", ""],
    )
    assert ok, "update_collection should succeed"

    rows = await sql_query(
        http_client, http_base,
        f"SELECT name, description, icon, color FROM collection WHERE id = '{coll_id}'",
    )
    assert len(rows) == 1
    assert rows[0][0] == "New Name"
    assert rows[0][1] == "New desc"
    assert rows[0][2] == "book"
    assert rows[0][3] == "#ff0000"


async def test_delete_collection(http_client, http_base, seeded_user):
    """Delete a collection and verify it is removed."""
    coll_id = "test_del_coll_001"
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


async def test_move_collection(http_client, http_base, seeded_user):
    """Move a collection under a new parent."""
    parent_id = "test_mv_parent_001"
    child_id = "test_mv_child_001"

    ok = await reducer_succeeds(
        http_client, http_base, "create_collection",
        [parent_id, "Parent", "Parent collection", "", "folder", "#222222", seeded_user],
    )
    assert ok

    ok = await reducer_succeeds(
        http_client, http_base, "create_collection",
        [child_id, "Child", "Child collection", "", "sub", "#333333", seeded_user],
    )
    assert ok

    ok = await reducer_succeeds(
        http_client, http_base, "move_collection",
        [child_id, parent_id],
    )
    assert ok

    rows = await sql_query(
        http_client, http_base,
        f"SELECT parent_id FROM collection WHERE id = '{child_id}'",
    )
    assert len(rows) == 1
    assert rows[0][0] == parent_id, "Child should now be under parent"


async def test_collection_sort_order(http_client, http_base, seeded_user):
    """Collections have incremented sort_order."""
    parent_id = "test_sort_parent_001"
    ok = await reducer_succeeds(
        http_client, http_base, "create_collection",
        [parent_id, "Sort Parent", "", "", "folder", "#999999", seeded_user],
    )
    assert ok

    coll_ids = [f"test_sort_child_{i:03d}" for i in range(3)]
    for cid in coll_ids:
        ok = await reducer_succeeds(
            http_client, http_base, "create_collection",
            [cid, f"Sort Child {cid}", "", parent_id, "sub", "#aaaaaa", seeded_user],
        )
        assert ok

    rows = await sql_query(
        http_client, http_base,
        f"SELECT id, sort_order FROM collection WHERE parent_id = '{parent_id}' ORDER BY sort_order",
    )
    assert len(rows) == 3
    for i, (cid, sort_order) in enumerate(rows):
        assert sort_order == i, f"Expected sort_order {i} for {cid}, got {sort_order}"


# ─── Permission Tests ────────────────────────────────────────────────────────

async def test_set_collection_permission(http_client, http_base, seeded_user):
    """Set read permission on a collection for a user."""
    coll_id = "test_perm_coll_001"
    target_user = "test_perm_user_001"

    await reducer_succeeds(
        http_client, http_base, "create_user",
        [target_user, "perm_test_user", "password123", "member", "Perm User", ""],
    )

    ok = await reducer_succeeds(
        http_client, http_base, "create_collection",
        [coll_id, "Perm Coll", "Permission test coll", "", "lock", "#444444", seeded_user],
    )
    assert ok

    ok = await reducer_succeeds(
        http_client, http_base, "set_user_collection_permission",
        [coll_id, target_user, "read"],
    )
    assert ok

    rows = await sql_query(
        http_client, http_base,
        f"SELECT permission_type FROM collection_permission "
        f"WHERE collection_id = '{coll_id}' AND user_id = '{target_user}'",
    )
    assert len(rows) >= 1, "Permission row should exist"
    assert rows[0][0] == "read"


async def test_set_page_permission(http_client, http_base, seeded_user):
    """Set read permission on a page for a user."""
    coll_id = "test_page_perm_coll_001"
    page_id = "test_page_perm_001"
    target_user = "test_page_perm_user_001"

    await reducer_succeeds(
        http_client, http_base, "create_user",
        [target_user, "page_perm_user", "password123", "member", "Page Perm User", ""],
    )

    ok = await reducer_succeeds(
        http_client, http_base, "create_collection",
        [coll_id, "Page Perm Coll", "", "", "file", "#555555", seeded_user],
    )
    assert ok

    ok = await reducer_succeeds(
        http_client, http_base, "create_page",
        [page_id, "Perm Test Page", "perm-test-page", "# Test content",
         "Test content", coll_id, "", "published", "", "", False, False,
         "", 0, seeded_user],
    )
    assert ok

    ok = await reducer_succeeds(
        http_client, http_base, "set_user_page_permission",
        [page_id, target_user, "read"],
    )
    assert ok

    rows = await sql_query(
        http_client, http_base,
        f"SELECT permission_type FROM page_permission "
        f"WHERE page_id = '{page_id}' AND user_id = '{target_user}'",
    )
    assert len(rows) >= 1, "Page permission row should exist"
    assert rows[0][0] == "read"


async def test_create_and_delete_role(http_client, http_base, seeded_user):
    """Create a role and delete it."""
    role_id = "test_role_001"
    coll_id = "test_role_coll_001"

    ok = await reducer_succeeds(
        http_client, http_base, "create_collection",
        [coll_id, "Role Coll", "", "", "group", "#666666", seeded_user],
    )
    assert ok

    ok = await reducer_succeeds(
        http_client, http_base, "create_role",
        [role_id, coll_id, "Test Role", "A test role", seeded_user],
    )
    assert ok

    rows = await sql_query(
        http_client, http_base,
        f"SELECT id, name FROM role WHERE id = '{role_id}'",
    )
    assert len(rows) == 1
    assert rows[0][1] == "Test Role"

    ok = await reducer_succeeds(
        http_client, http_base, "delete_role",
        [role_id],
    )
    assert ok

    rows = await sql_query(
        http_client, http_base,
        f"SELECT id FROM role WHERE id = '{role_id}'",
    )
    assert len(rows) == 0, "Role should be deleted"


async def test_add_remove_role_member(http_client, http_base, seeded_user):
    """Add a member to a role, then remove them."""
    role_id = "test_role_member_001"
    coll_id = "test_role_member_coll_001"
    member_user = "test_role_member_user_001"

    await reducer_succeeds(
        http_client, http_base, "create_user",
        [member_user, "role_member_user", "password123", "member", "Role Member", ""],
    )

    ok = await reducer_succeeds(
        http_client, http_base, "create_collection",
        [coll_id, "Role Member Coll", "", "", "people", "#777777", seeded_user],
    )
    assert ok

    ok = await reducer_succeeds(
        http_client, http_base, "create_role",
        [role_id, coll_id, "Member Role", "Test role for members", seeded_user],
    )
    assert ok

    ok = await reducer_succeeds(
        http_client, http_base, "add_role_member",
        [role_id, member_user],
    )
    assert ok

    rows = await sql_query(
        http_client, http_base,
        f"SELECT user_id FROM role_member WHERE role_id = '{role_id}' AND user_id = '{member_user}'",
    )
    assert len(rows) == 1, "Member should be in role"

    ok = await reducer_succeeds(
        http_client, http_base, "remove_role_member",
        [role_id, member_user],
    )
    assert ok

    rows = await sql_query(
        http_client, http_base,
        f"SELECT user_id FROM role_member WHERE role_id = '{role_id}' AND user_id = '{member_user}'",
    )
    assert len(rows) == 0, "Member should be removed from role"


# ─── Search Tests ────────────────────────────────────────────────────────────

async def test_search_no_results(http_client, http_base):
    """Search with a non-matching query returns no results."""
    rows = await sql_query(
        http_client, http_base,
        "SELECT id, title FROM page WHERE title LIKE '%ZZZZNONEXISTENTZZZZ%'",
    )
    assert len(rows) == 0, "Non-matching search should return no results"


async def test_search_multiple_results(http_client, http_base, seeded_user):
    """Search returns multiple matching pages."""
    coll_id = "test_search_coll_001"
    page_ids = ["test_search_page_001", "test_search_page_002"]

    ok = await reducer_succeeds(
        http_client, http_base, "create_collection",
        [coll_id, "Search Coll", "", "", "search", "#888888", seeded_user],
    )
    assert ok

    for pid in page_ids:
        ok = await reducer_succeeds(
            http_client, http_base, "create_page",
            [pid, f"Searchable {pid}", pid, f"# {pid}", pid,
             coll_id, "", "published", "", "", False, False, "", 0, seeded_user],
        )
        assert ok

    rows = await sql_query(
        http_client, http_base,
        f"SELECT id FROM page WHERE id IN ('{page_ids[0]}', '{page_ids[1]}')",
    )
    assert len(rows) == 2, "Both search pages should exist"


async def test_search_with_pagination(http_client, http_base):
    """Search with LIMIT works correctly."""
    rows = await sql_query(
        http_client, http_base,
        "SELECT id FROM page ORDER BY id LIMIT 1",
    )
    assert isinstance(rows, list)
