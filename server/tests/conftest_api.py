"""Shared test fixtures for API server unit tests.

Patching strategy: all modules import ``from stdb_client import sql_query, call_reducer``
at module level. To intercept, we patch those names *on* the importing module after
importing it, or we use ``unittest.mock.patch`` before module import.
"""

from __future__ import annotations

import sys
from unittest.mock import AsyncMock, MagicMock, patch

import pytest

# ─── stdb_client mock module ───────────────────────────────────────────────────
# To prevent import errors when api-server modules try to import stdb_client,
# we provide a pre-loaded mock module.  Tests that need specific return values
# can use the stdb_mocks fixture or direct mocker.patch().


@pytest.fixture
def mock_stdb_client():
    """Return a mock module that replaces stdb_client for API server tests.

    Usage::

        def test_something(mock_stdb_client):
            mock_stdb_client.sql_query.return_value = [[1]]

    Creates AsyncMock for sql_query and call_reducer, plus synchronous
    MagicMock for the map_* functions.
    """
    mocks = {
        "sql_query": AsyncMock(return_value=[]),
        "call_reducer": AsyncMock(return_value=None),
        "map_page": MagicMock(return_value={}),
        "map_collection": MagicMock(return_value={}),
        "map_user": MagicMock(return_value={}),
        "map_revision": MagicMock(return_value={}),
        "map_comment": MagicMock(return_value={}),
        "map_tag": MagicMock(return_value={}),
        "map_attachment": MagicMock(return_value={}),
        "map_share_link": MagicMock(return_value={}),
        "map_api_key": MagicMock(return_value={
            "id": "k1", "user_id": "u1", "name": "test-key",
            "key_hash": "abc123", "key_prefix": "sw_abc",
            "last_used_at": 0, "created_at": 0,
            "expires_at": 9999999999999, "is_revoked": False,
        }),
        "_safe_quote": MagicMock(side_effect=lambda x: f"'{x}'"),
        "_safe_table": MagicMock(side_effect=lambda x: x),
        "_build_safe_sql": MagicMock(side_effect=lambda sql, *a: sql),
        "_str": MagicMock(side_effect=lambda r, i: str(r[i]) if i < len(r) and r[i] is not None else ""),
        "_int": MagicMock(side_effect=lambda r, i: int(r[i]) if i < len(r) and r[i] is not None else 0),
        "_bool": MagicMock(side_effect=lambda r, i: bool(r[i]) if i < len(r) else False),
    }
    return mocks
