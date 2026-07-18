"""Unit tests for the SpacetimeWiki MCP server.

Tests cover:
  - Validation helpers (_get_str_arg, _get_int_arg)
  - Error response builders (_error_response, _text, _tool_error)
  - All 7 tool handlers (wiki_health, wiki_search, wiki_read_page,
    wiki_list_collections, wiki_list_pages, wiki_get_backlinks,
    wiki_get_linked_pages)
  - Resource handlers (list_resources, read_resource, list_resource_templates)
  - Tool dispatch (call_tool)
  - Tool listing (list_tools)

All STDB interactions are mocked so tests require no external database.
"""

from __future__ import annotations

import json
import sys
from typing import Any
from unittest.mock import AsyncMock, patch as _module_patch

import pytest
from mcp.types import Resource, ResourceTemplate, TextContent, Tool

sys.path.insert(0, "server/mcp-server")

with _module_patch("stdb_client.sql_query", new=AsyncMock()):
    with _module_patch("stdb_client.search_pages", new=AsyncMock()):
        with _module_patch("stdb_client.get_page", new=AsyncMock()):
            with _module_patch("stdb_client.get_page_by_slug", new=AsyncMock()):
                with _module_patch("stdb_client.list_collections", new=AsyncMock()):
                    with _module_patch("stdb_client.list_pages", new=AsyncMock()):
                        with _module_patch("stdb_client.get_backlinks", new=AsyncMock()):
                            with _module_patch("stdb_client.get_linked_pages", new=AsyncMock()):
                                with _module_patch("stdb_client.get_collection", new=AsyncMock()):
                                    import server
                                    import stdb_client
                                    from server import (
                                        MCPErrorCode,
                                        _TOOL_HANDLERS,
                                        _error_response,
                                        _get_int_arg,
                                        _get_str_arg,
                                        _handle_wiki_get_backlinks,
                                        _handle_wiki_get_linked_pages,
                                        _handle_wiki_health,
                                        _handle_wiki_list_collections,
                                        _handle_wiki_list_pages,
                                        _handle_wiki_read_page,
                                        _handle_wiki_search,
                                        _text,
                                        _tool_error,
                                        _with_concurrency,
                                        call_tool,
                                        list_resource_templates,
                                        list_resources,
                                        list_tools,
                                        read_resource,
                                        get_request_id,
                                    )
                                    from stdb_client import (
                                        STDBError,
                                        STDBErrorCode,
                                    )

pytestmark = pytest.mark.asyncio


@pytest.fixture(autouse=True)
def _reset_context_vars() -> None:
    from server import request_id_var, set_request_id
    from stdb_client import correlation_id_var, set_correlation_id
    set_request_id(None)
    set_correlation_id(None)
