"""Unit tests for the SpacetimeWiki MCP server.
All STDB interactions are mocked."""
from __future__ import annotations
import json, sys
from unittest.mock import AsyncMock, patch
import pytest
from mcp.types import Resource, ResourceTemplate, TextContent, Tool
sys.path.insert(0, "server/mcp-server")
patch("stdb_client.sql_query", return_value=[[1]]).start()
patch("stdb_client.search_pages", return_value=[]).start()
patch("stdb_client.get_page", return_value=None).start()
patch("stdb_client.get_page_by_slug", return_value=None).start()
patch("stdb_client.list_collections", return_value=[]).start()
patch("stdb_client.list_pages", return_value=[]).start()
patch("stdb_client.get_backlinks", return_value=[]).start()
patch("stdb_client.get_linked_pages", return_value=[]).start()
patch("stdb_client.get_collection", return_value=None).start()
patch("stdb_client.list_page_tags", return_value=[]).start()
import server, stdb_client
from server import (
    MCPErrorCode, _TOOL_HANDLERS,
    _error_response, _get_int_arg, _get_str_arg,
    _handle_wiki_get_backlinks, _handle_wiki_get_linked_pages,
    _handle_wiki_health, _handle_wiki_list_collections,
    _handle_wiki_list_pages, _handle_wiki_read_page,
    _handle_wiki_search, _text, _tool_error, _with_concurrency,
    call_tool, list_resource_templates, list_resources,
    list_tools, read_resource,
)
from stdb_client import STDBError, STDBErrorCode
pytestmark = pytest.mark.asyncio
@pytest.fixture(autouse=True)
def _reset_ctx():
    from server import request_id_var, set_request_id
    from stdb_client import correlation_id_var, set_correlation_id
    set_request_id(None); set_correlation_id(None)

class TestGetStrArg:
    def test_valid(self):
        assert _get_str_arg({"k":"h"},"k",max_len=100)=="h"
    def test_missing_required(self):
        with pytest.raises(ValueError,match="Missing required"):
            _get_str_arg({},"k",max_len=100)
    def test_missing_default(self):
        assert _get_str_arg({},"k",required=False,default="fb",max_len=100)=="fb"
    def test_non_string(self):
        with pytest.raises(TypeError,match="must be a string"):
            _get_str_arg({"k":42},"k",max_len=100)
    def test_whitespace(self):
        with pytest.raises(ValueError,match="must not be empty"):
            _get_str_arg({"k":"   "},"k",max_len=100)
    def test_too_long(self):
        with pytest.raises(ValueError,match="too long"):
            _get_str_arg({"k":"a"*300},"k",max_len=200)
    def test_none_required(self):
        with pytest.raises(ValueError,match="Missing required"):
            _get_str_arg({"k":None},"k",max_len=100)
    def test_none_default(self):
        assert _get_str_arg({"k":None},"k",required=False,default="fb",max_len=100)=="fb"
    def test_strips(self):
        assert _get_str_arg({"k":"  h  "},"k",max_len=100)=="h"
