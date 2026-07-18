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
