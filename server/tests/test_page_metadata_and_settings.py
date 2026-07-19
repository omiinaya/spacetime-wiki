"""Integration tests for page metadata, settings, tags, favorites, etc.

Tests cover:
  - Page metadata: icon, color, status, pinned, full-width, direction
  - Tags: add_tag, remove_tag
  - Favorites: toggle_favorite
  - App settings: set_app_setting
  - API keys: create_api_key, revoke_api_key
  - Page operations: update_page, duplicate_page, restore_page
  - Collection: delete_collection, set_collection_sort_rule, reorder_collections
  - Notifications: create_notification, delete_notification, mark_notification_read
  - Templates: mark_as_template
  - Recording: record_page_view
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


# --- Fixtures ---

@pytest.fixture(scope="module")
async def test_user(http_client, http_base):
    uid = "meta_test_user"
    await reducer_succeeds(
        http_client, http_base, "create_user",
        [uid, "MetaTest User", "meta@test.com", "password123", "admin"],
    )
    return uid


@pytest.fixture(scope="module")
async def test_collection(http_client, http_base, test_user):
    coll_id = "meta_test_coll"
    await reducer_succeeds(
        http_client, http_base, "create_collection",
        [coll_id, "Meta Test Collection", "meta-test", "", "", "", "", "", test_user],
    )
    return coll_id


@pytest.fixture(scope="module")
async def test_page(http_client, http_base, test_collection, test_user):
    page_id = "meta_test_page"
    await reducer_succeeds(
        http_client, http_base, "create_page",
        [page_id, "Meta Test Page", "meta-test-page", "# Meta",
         "Meta", test_collection, "", "published", "", "", False, False, "", 0, test_user],
    )
    return page_id


# --- Page Metadata ---

async def test_set_page_icon(http_client, http_base, test_page):
    ok = await reducer_succeeds(
        http_client, http_base, "set_page_icon",
        [test_page, "\U0001f680"],
    )
    assert ok
    rows = await sql_query(
        http_client, http_base,
        f"SELECT icon FROM page WHERE id = '{test_page}'",
    )
    assert_row_count(rows, 1)
    assert rows[0][0] == "\U0001f680"


async def test_set_page_color(http_client, http_base, test_page):
    ok = await reducer_succeeds(
        http_client, http_base, "set_page_color",
        [test_page, "#ff6600"],
    )
    assert ok
    rows = await sql_query(
        http_client, http_base,
        f"SELECT color FROM page WHERE id = '{test_page}'",
    )
    assert_row_count(rows, 1)
    assert rows[0][0] == "#ff6600"


async def test_set_page_status(http_client, http_base, test_page):
    ok = await reducer_succeeds(
        http_client, http_base, "set_page_status",
        [test_page, "archived"],
    )
    assert ok
    rows = await sql_query(
        http_client, http_base,
        f"SELECT status FROM page WHERE id = '{test_page}'",
    )
    assert_row_count(rows, 1)
    assert rows[0][0] == "archived"
    await reducer_succeeds(
        http_client, http_base, "set_page_status",
        [test_page, "published"],
    )


async def test_set_page_pinned(http_client, http_base, test_page):
    ok = await reducer_succeeds(
        http_client, http_base, "set_page_pinned",
        [test_page, True],
    )
    assert ok
    rows = await sql_query(
        http_client, http_base,
        f"SELECT is_pinned FROM page WHERE id = '{test_page}'",
    )
    assert_row_count(rows, 1)
    assert rows[0][0] == 1


async def test_set_page_full_width(http_client, http_base, test_page):
    ok = await reducer_succeeds(
        http_client, http_base, "set_page_full_width",
        [test_page, True],
    )
    assert ok
    rows = await sql_query(
        http_client, http_base,
        f"SELECT full_width FROM page WHERE id = '{test_page}'",
    )
    assert_row_count(rows, 1)
    assert rows[0][0] == 1


async def test_set_page_direction(http_client, http_base, test_page):
    ok = await reducer_succeeds(
        http_client, http_base, "set_page_direction",
        [test_page, "rtl"],
    )
    assert ok
    rows = await sql_query(
        http_client, http_base,
        f"SELECT direction FROM page WHERE id = '{test_page}'",
    )
    assert_row_count(rows, 1)
    assert rows[0][0] == "rtl"


# --- Tags ---

async def test_add_tag(http_client, http_base, test_page):
    tag_id = "meta_tag_1"
    ok = await reducer_succeeds(
        http_client, http_base, "add_tag",
        [tag_id, test_page, "priority", "high"],
    )
    assert ok
    rows = await sql_query(
        http_client, http_base,
        f"SELECT name, value FROM tag WHERE id = '{tag_id}'",
    )
    assert_row_count(rows, 1)
    assert rows[0][0] == "priority"
    assert rows[0][1] == "high"


async def test_remove_tag(http_client, http_base, test_page):
    tag_id = "meta_tag_to_remove"
    await reducer_succeeds(
        http_client, http_base, "add_tag",
        [tag_id, test_page, "status", "done"],
    )
    ok = await reducer_succeeds(
        http_client, http_base, "remove_tag", [tag_id],
    )
    assert ok
    rows = await sql_query(
        http_client, http_base,
        f"SELECT id FROM tag WHERE id = '{tag_id}'",
    )
    assert_row_count(rows, 0)


# --- Favorites ---

async def test_toggle_favorite(http_client, http_base, test_page, test_user):
    fav_id = "meta_fav_1"
    ok = await reducer_succeeds(
        http_client, http_base, "toggle_favorite",
        [fav_id, test_user, test_page],
    )
    assert ok
    rows = await sql_query(
        http_client, http_base,
        f"SELECT user_id, page_id FROM favorite WHERE id = '{fav_id}'",
    )
    assert_row_count(rows, 1)
    assert rows[0][0] == test_user


# --- App Settings ---

async def test_set_app_setting(http_client, http_base):
    ok = await reducer_succeeds(
        http_client, http_base, "set_app_setting",
        ["wiki_title", "My Wiki"],
    )
    assert ok
    rows = await sql_query(
        http_client, http_base,
        "SELECT value FROM app_setting WHERE key = 'wiki_title'",
    )
    assert_row_count(rows, 1)
    assert rows[0][0] == "My Wiki"


# --- API Keys ---

async def test_create_api_key(http_client, http_base, test_user):
    key_id = "meta_api_key_1"
    ok = await reducer_succeeds(
        http_client, http_base, "create_api_key",
        [key_id, test_user, "Test Key", "hash123", "sk_test", 30],
    )
    assert ok
    rows = await sql_query(
        http_client, http_base,
        f"SELECT name, key_prefix FROM api_key WHERE id = '{key_id}'",
    )
    assert_row_count(rows, 1)
    assert rows[0][0] == "Test Key"
    assert rows[0][1] == "sk_test"


async def test_revoke_api_key(http_client, http_base, test_user):
    key_id = "meta_api_key_revoke"
    await reducer_succeeds(
        http_client, http_base, "create_api_key",
        [key_id, test_user, "Revoke Key", "hash456", "sk_revoke", 30],
    )
    ok = await reducer_succeeds(
        http_client, http_base, "revoke_api_key", [key_id],
    )
    assert ok
    rows = await sql_query(
        http_client, http_base,
        f"SELECT is_revoked FROM api_key WHERE id = '{key_id}'",
    )
    assert_row_count(rows, 1)
    assert rows[0][0] == 1


# --- Page Operations ---

async def test_update_page(http_client, http_base, test_page, test_user):
    ok = await reducer_succeeds(
        http_client, http_base, "update_page",
        [test_page, "Updated Meta Page", "# Updated", test_user],
    )
    assert ok
    rows = await sql_query(
        http_client, http_base,
        f"SELECT title FROM page WHERE id = '{test_page}'",
    )
    assert_row_count(rows, 1)
    assert rows[0][0] == "Updated Meta Page"


async def test_record_page_view(http_client, http_base, test_page, test_user):
    ok = await reducer_succeeds(
        http_client, http_base, "record_page_view",
        [test_page, test_user],
    )
    assert ok


async def test_duplicate_page(http_client, http_base, test_collection, test_user):
    source_id = "meta_dup_source"
    await reducer_succeeds(
        http_client, http_base, "create_page",
        [source_id, "Duplicate Source", "dup-source", "# Orig",
         "Orig", test_collection, "", "published", "", "", False, False, "", 0, test_user],
    )
    new_id = "meta_dup_target"
    ok = await reducer_succeeds(
        http_client, http_base, "duplicate_page",
        [new_id, source_id, test_user],
    )
    assert ok
    rows = await sql_query(
        http_client, http_base,
        f"SELECT id, title FROM page WHERE id IN ('{source_id}', '{new_id}')",
    )
    assert len(rows) == 2


async def test_restore_page(http_client, http_base, test_collection, test_user):
    page_id = "meta_restore_test"
    await reducer_succeeds(
        http_client, http_base, "create_page",
        [page_id, "Restore Test", "restore-test", "# Restore",
         "Restore", test_collection, "", "published", "", "", False, False, "", 0, test_user],
    )
    ok = await reducer_succeeds(
        http_client, http_base, "restore_page", [page_id],
    )
    assert ok


# --- Collection Operations ---

async def test_delete_collection(http_client, http_base, test_user):
    coll_id = "meta_del_coll"
    await reducer_succeeds(
        http_client, http_base, "create_collection",
        [coll_id, "To Delete", "to-delete", "", "", "", "", "", test_user],
    )
    ok = await reducer_succeeds(
        http_client, http_base, "delete_collection", [coll_id],
    )
    assert ok
    rows = await sql_query(
        http_client, http_base,
        f"SELECT id FROM collection WHERE id = '{coll_id}'",
    )
    assert_row_count(rows, 0)


async def test_set_collection_sort_rule(http_client, http_base, test_collection, test_user):
    ok = await reducer_succeeds(
        http_client, http_base, "set_collection_sort_rule",
        [test_collection, "title", "asc", True, test_user],
    )
    assert ok
    rows = await sql_query(
        http_client, http_base,
        f"SELECT sort_field, sort_direction FROM collection_sort_rule WHERE collection_id = '{test_collection}'",
    )
    assert_row_count(rows, 1)
    assert rows[0][0] == "title"
    assert rows[0][1] == "asc"


async def test_reorder_collections(http_client, http_base, test_user):
    coll_a = "meta_reorder_a"
    coll_b = "meta_reorder_b"
    await reducer_succeeds(
        http_client, http_base, "create_collection",
        [coll_a, "Reorder A", "reorder-a", "", "", "", "", "", test_user],
    )
    await reducer_succeeds(
        http_client, http_base, "create_collection",
        [coll_b, "Reorder B", "reorder-b", "", "", "", "", "", test_user],
    )
    ok = await reducer_succeeds(
        http_client, http_base, "reorder_collections",
        [[coll_b, coll_a]],
    )
    assert ok


# --- Notifications ---

async def test_create_notification(http_client, http_base, test_user):
    notif_id = "meta_notif_1"
    ok = await reducer_succeeds(
        http_client, http_base, "create_notification",
        [notif_id, test_user, "mention", "page_123", "You were mentioned",
         "Someone mentioned you in a page", "user_abc", "bell"],
    )
    assert ok
    rows = await sql_query(
        http_client, http_base,
        f"SELECT event_type, title FROM notification WHERE id = '{notif_id}'",
    )
    assert_row_count(rows, 1)
    assert rows[0][0] == "mention"


async def test_mark_notification_read(http_client, http_base, test_user):
    notif_id = "meta_notif_read"
    await reducer_succeeds(
        http_client, http_base, "create_notification",
        [notif_id, test_user, "mention", "page_123", "Read Test",
         "Test message", "user_abc", "bell"],
    )
    ok = await reducer_succeeds(
        http_client, http_base, "mark_notification_read", [notif_id],
    )
    assert ok
    rows = await sql_query(
        http_client, http_base,
        f"SELECT is_read FROM notification WHERE id = '{notif_id}'",
    )
    assert_row_count(rows, 1)
    assert rows[0][0] == 1


async def test_delete_notification(http_client, http_base, test_user):
    notif_id = "meta_notif_del"
    await reducer_succeeds(
        http_client, http_base, "create_notification",
        [notif_id, test_user, "mention", "page_123", "Delete Test",
         "Test message", "user_abc", "bell"],
    )
    ok = await reducer_succeeds(
        http_client, http_base, "delete_notification", [notif_id],
    )
    assert ok
    rows = await sql_query(
        http_client, http_base,
        f"SELECT id FROM notification WHERE id = '{notif_id}'",
    )
    assert_row_count(rows, 0)


# --- Templates ---

async def test_mark_as_template(http_client, http_base, test_page):
    ok = await reducer_succeeds(
        http_client, http_base, "mark_as_template",
        [test_page, True],
    )
    assert ok
    rows = await sql_query(
        http_client, http_base,
        f"SELECT is_template FROM page WHERE id = '{test_page}'",
    )
    assert_row_count(rows, 1)
    assert rows[0][0] == 1
