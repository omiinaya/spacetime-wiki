"""Global conftest: patch stdb_client functions for the entire test session."""

from unittest.mock import AsyncMock, patch

import pytest


@pytest.fixture(autouse=True, scope="session")
def _patch_stdb_client():
    """Apply all stdb_client patches before any test runs.

    This runs once per session and ensures every import of ``stdb_client``
    (and by extension ``server``) sees mocked versions of all database
    functions.
    """
    patchers = [
        patch("stdb_client.sql_query", new=AsyncMock()),
        patch("stdb_client.search_pages", new=AsyncMock()),
        patch("stdb_client.get_page", new=AsyncMock()),
        patch("stdb_client.get_page_by_slug", new=AsyncMock()),
        patch("stdb_client.list_collections", new=AsyncMock()),
        patch("stdb_client.list_pages", new=AsyncMock()),
        patch("stdb_client.get_backlinks", new=AsyncMock()),
        patch("stdb_client.get_linked_pages", new=AsyncMock()),
        patch("stdb_client.get_collection", new=AsyncMock()),
        patch("stdb_client.list_page_tags", new=AsyncMock(return_value=[])),
    ]
    for p in patchers:
        p.start()
    yield
    for p in patchers:
        p.stop()
