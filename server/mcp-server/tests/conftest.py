"""Test fixtures for MCP server unit tests.

Patching strategy: server.py does ``from stdb_client import ...`` which
binds names in the **server** module namespace.  To intercept, we patch
those names *on* the server module after importing it.
"""

import sys
import os
import pytest
from unittest.mock import AsyncMock, MagicMock, patch

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
    }


@pytest.fixture
def stdb_mocks():
    """Return a fresh set of mocks *after* importing + patching the server.

    These mocks are applied to the server module so that its local references
    (e.g. ``server.search_pages``) are replaced with AsyncMock objects.
    """
    import importlib
    import server as server_mod
    importlib.reload(server_mod)

    mocks = _make_mocks()
    # Patch every name on the server module that was imported from stdb_client
    for name, obj in mocks.items():
        setattr(server_mod, name, obj)

    yield mocks

    # Restore by re-importing (the module is cached, so next reload will reset)
    importlib.reload(server_mod)


@pytest.fixture
def server_module(stdb_mocks):
    """Return the patched server module (same as importing ``server``)."""
    import server as srv
    return srv
