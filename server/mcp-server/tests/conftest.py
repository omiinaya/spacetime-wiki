"""Test fixtures for MCP server unit tests."""

import sys
import os
import pytest
from unittest.mock import AsyncMock, MagicMock, patch

# Ensure the server package is importable
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

import stdb_client


@pytest.fixture(autouse=True)
def mock_stdb_client():
    """Mock every stdb_client function used by server.py.

    Returns dict of mock objects for per-test customization.
    """
    mocks = {
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

    patchers = []
    for name, obj in mocks.items():
        p = patch.object(stdb_client, name, obj)
        p.start()
        patchers.append(p)

    yield mocks

    for p in patchers:
        p.stop()


@pytest.fixture
def stdb_mocks(mock_stdb_client):
    """Alias for mock_stdb_client."""
    return mock_stdb_client
