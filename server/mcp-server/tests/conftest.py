"""Test fixtures for MCP server unit tests.

Patching strategy: server.py does ``from stdb_client import ...`` which
binds names in the **server** module namespace.  To intercept, we patch
those names *on* the server module after importing it.
"""

import os
import sys
from unittest.mock import AsyncMock, MagicMock

import pytest

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))


def _make_mocks():
    """Build the standard dict of mocks used by all tests."""
    return {
        "search_pages": AsyncMock(return_value=[]),
        "get_page": AsyncMock(return_value=None),
        "get_page_by_slug": AsyncMock(return_value=None),
        "list_collections": AsyncMock(return_value=[]),
        "list_pages": AsyncMock(return_value=[]),
        "get_backlinks": AsyncMock(return_value=[]),
        "list_page_tags": AsyncMock(return_value=[]),
        "get_linked_pages": AsyncMock(return_value=[]),
        "get_collection": AsyncMock(return_value=None),
        "sql_query": AsyncMock(return_value=[]),
        "get_correlation_id": MagicMock(return_value="test-corr-id"),
        "set_correlation_id": MagicMock(),
        "close_http_client": AsyncMock(),
        # STDBError is imported as a class ref — we keep the original
        # so that isinstance(x, STDBError) still works.  To simulate
        # STDBError in tests, import from server module.
    }


@pytest.fixture
def stdb_mocks():
    """Return a fresh set of mocks applied to the server module.

    These mocks replace the names that server.py imported from stdb_client.
    """
    import importlib

    import server as server_mod
    importlib.reload(server_mod)

    mocks = _make_mocks()
    for name, obj in mocks.items():
        setattr(server_mod, name, obj)

    yield mocks

    # Restore by re-importing
    importlib.reload(server_mod)


@pytest.fixture
def server_module(stdb_mocks):
    """Return the patched server module."""
    import server as srv
    return srv
