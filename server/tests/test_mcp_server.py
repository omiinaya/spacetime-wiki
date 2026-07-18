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
from typing import Any
from unittest.mock import AsyncMock, patch

import pytest
from mcp.types import Resource, ResourceTemplate, TextContent, Tool

# Module-level patches for stdb_client imports
with patch("mcp_server.stdb_client.sql_query", new=AsyncMock()):
    with patch("mcp_server.stdb_client.search_pages", new=AsyncMock()):
        with patch("mcp_server.stdb_client.get_page", new=AsyncMock()):
            with patch("mcp_server.stdb_client.get_page_by_slug", new=AsyncMock()):
                with patch("mcp_server.stdb_client.list_collections", new=AsyncMock()):
                    with patch("mcp_server.stdb_client.list_pages", new=AsyncMock()):
                        with patch("mcp_server.stdb_client.get_backlinks", new=AsyncMock()):
                            with patch("mcp_server.stdb_client.get_linked_pages", new=AsyncMock()):
                                with patch("mcp_server.stdb_client.get_collection", new=AsyncMock()):
                                    from mcp_server.server import (
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
                                        app,
                                        call_tool,
                                        list_resource_templates,
                                        list_resources,
                                        list_tools,
                                        read_resource,
                                        get_request_id,
                                    )
                                    from mcp_server.stdb_client import (
                                        STDBError,
                                        STDBErrorCode,
                                        get_correlation_id,
                                    )

pytestmark = pytest.mark.asyncio


@pytest.fixture(autouse=True)
def _reset_context_vars() -> None:
    from mcp_server.server import request_id_var, set_request_id
    from mcp_server.stdb_client import correlation_id_var, set_correlation_id
    set_request_id(None)
    set_correlation_id(None)


# ═══════════════════════════════════════════════════════════════════════════════
# Helper: _get_str_arg
# ═══════════════════════════════════════════════════════════════════════════════


class TestGetStrArg:
    """Tests for the ``_get_str_arg`` validation helper."""

    def test_valid_string(self) -> None:
        assert _get_str_arg({"key": "hello"}, "key", max_len=100) == "hello"

    def test_missing_required_raises(self) -> None:
        with pytest.raises(ValueError, match="Missing required argument"):
            _get_str_arg({}, "key", max_len=100)

    def test_missing_with_default(self) -> None:
        assert _get_str_arg({}, "key", default="fallback", max_len=100) == "fallback"

    def test_non_string_raises(self) -> None:
        with pytest.raises(TypeError, match="must be a string"):
            _get_str_arg({"key": 42}, "key", max_len=100)

    def test_whitespace_only_raises(self) -> None:
        with pytest.raises(ValueError, match="cannot be empty"):
            _get_str_arg({"key": "   "}, "key", max_len=100)

    def test_exceeds_max_length_raises(self) -> None:
        with pytest.raises(ValueError, match="exceeds maximum length"):
            _get_str_arg({"key": "a" * 300}, "key", max_len=200)

    def test_none_with_required_raises(self) -> None:
        with pytest.raises(ValueError, match="Missing required argument"):
            _get_str_arg({"key": None}, "key", max_len=100)

    def test_none_with_default(self) -> None:
        result = _get_str_arg({"key": None}, "key", default="fallback", max_len=100)
        assert result == "fallback"

    def test_strips_whitespace(self) -> None:
        result = _get_str_arg({"key": "  hello world  "}, "key", max_len=100)
        assert result == "hello world"

# ═══════════════════════════════════════════════════════════════════════════════
# Helper: _get_int_arg
# ═══════════════════════════════════════════════════════════════════════════════


class TestGetIntArg:
    """Tests for the ``_get_int_arg`` validation helper."""

    def test_valid_int(self) -> None:
        result = _get_int_arg({"count": 5}, "count", default=0, min_val=0, max_val=100)
        assert result == 5

    def test_missing_returns_default(self) -> None:
        result = _get_int_arg({}, "count", default=10, min_val=0, max_val=100)
        assert result == 10

    def test_string_number_accepted(self) -> None:
        result = _get_int_arg({"count": "7"}, "count", default=0, min_val=0, max_val=100)
        assert result == 7

    def test_non_numeric_raises(self) -> None:
        with pytest.raises(TypeError, match="must be an integer"):
            _get_int_arg({"count": "abc"}, "count", default=0, min_val=0, max_val=100)

    def test_below_min_raises(self) -> None:
        with pytest.raises(ValueError, match="must be between"):
            _get_int_arg({"count": -5}, "count", default=0, min_val=0, max_val=100)

    def test_above_max_raises(self) -> None:
        with pytest.raises(ValueError, match="must be between"):
            _get_int_arg({"count": 200}, "count", default=0, min_val=0, max_val=100)

    def test_at_min_boundary(self) -> None:
        assert _get_int_arg({"count": 0}, "count", default=0, min_val=0, max_val=100) == 0

    def test_at_max_boundary(self) -> None:
        assert _get_int_arg({"count": 100}, "count", default=0, min_val=0, max_val=100) == 100


# ═══════════════════════════════════════════════════════════════════════════════
# Error response builders
# ═══════════════════════════════════════════════════════════════════════════════


class TestErrorResponse:
    """Tests for ``_error_response``, ``_text``, and ``_tool_error``."""

    def test_error_response_minimal(self) -> None:
        result = _error_response("SOME_CODE", "Something went wrong")
        payload = json.loads(result[0].text)
        assert payload["error"]["code"] == "SOME_CODE"
        assert payload["error"]["message"] == "Something went wrong"
        assert "correlation_id" in payload["error"]

    def test_error_response_with_details(self) -> None:
        result = _error_response("VALIDATION_ERROR", "Bad input",
                                 details={"field": "id", "reason": "too long"})
        payload = json.loads(result[0].text)
        assert payload["error"]["details"]["field"] == "id"
        assert payload["error"]["details"]["reason"] == "too long"

    def test_text_returns_text_content(self) -> None:
        result = _text("Hello, world!")
        assert len(result) == 1
        assert isinstance(result[0], TextContent)
        assert result[0].text == "Hello, world!"

    def test_tool_error_value_error(self) -> None:
        exc = ValueError("bad value")
        result = _tool_error("t", exc, context="validation")
        payload = json.loads(result[0].text)
        assert payload["error"]["code"] == "VALIDATION_ERROR"
        assert "bad value" in payload["error"]["message"]

    def test_tool_error_type_error(self) -> None:
        exc = TypeError("wrong type")
        result = _tool_error("t", exc, context="validation")
        payload = json.loads(result[0].text)
        assert payload["error"]["code"] == "VALIDATION_ERROR"

    def test_tool_error_stdb_query_failed(self) -> None:
        exc = STDBError("db down", code=STDBErrorCode.QUERY_FAILED)
        result = _tool_error("t", exc, context="stdb")
        payload = json.loads(result[0].text)
        assert payload["error"]["code"] == "STDB_UNAVAILABLE"
        assert "db down" in payload["error"]["message"]

    def test_tool_error_stdb_timeout(self) -> None:
        exc = STDBError("timed out", code=STDBErrorCode.TIMEOUT)
        result = _tool_error("t", exc, context="stdb")
        payload = json.loads(result[0].text)
        assert payload["error"]["code"] == "TIMEOUT"

    def test_tool_error_stdb_circuit_open(self) -> None:
        exc = STDBError("circuit open", code=STDBErrorCode.CIRCUIT_OPEN)
        result = _tool_error("t", exc, context="stdb")
        payload = json.loads(result[0].text)
        assert payload["error"]["code"] == "CIRCUIT_OPEN"

    def test_tool_error_unknown_exception(self) -> None:
        exc = RuntimeError("unexpected crash")
        result = _tool_error("t", exc, context="internal")
        payload = json.loads(result[0].text)
        assert payload["error"]["code"] == "INTERNAL_ERROR"


# ═══════════════════════════════════════════════════════════════════════════════
# Tool: wiki_health
# ═══════════════════════════════════════════════════════════════════════════════


class TestHandleWikiHealth:
    async def test_health_returns_ok(self) -> None:
        result = await _handle_wiki_health({})
        payload = json.loads(result[0].text)
        assert payload["status"] == "ok"
        assert "server" in payload
        assert "timestamp" in payload

    async def test_health_ignores_extra_args(self) -> None:
        result = await _handle_wiki_health({"extra": "value"})
        assert json.loads(result[0].text)["status"] == "ok"


# ═══════════════════════════════════════════════════════════════════════════════
# Tool: wiki_search
# ═══════════════════════════════════════════════════════════════════════════════


class TestHandleWikiSearch:
    async def test_valid_search(self, mocker) -> None:
        fake = [
            {"id": "p1", "title": "Alpha", "slug": "alpha",
             "text_content": "Content", "updated_at": "2024-01-01",
             "created_at": "2024-01-01T00:00:00Z", "status": "published"},
            {"id": "p2", "title": "Beta", "slug": "beta",
             "text_content": "Content", "updated_at": "2024-01-02",
             "created_at": "2024-01-02T00:00:00Z", "status": "published"},
        ]
        mocker.patch("mcp_server.server.search_pages", return_value=fake)
        result = await _handle_wiki_search({"query": "test", "limit": 10, "offset": 0})
        text = result[0].text
        assert "Alpha" in text
        assert "Beta" in text

    async def test_search_missing_query_returns_error(self) -> None:
        result = await _handle_wiki_search({})
        assert "Missing required argument" in result[0].text

    async def test_search_empty_results(self, mocker) -> None:
        mocker.patch("mcp_server.server.search_pages", return_value=[])
        result = await _handle_wiki_search({"query": "nothing"})
        assert "No pages found" in result[0].text

    async def test_search_stdb_error_returns_error_text(self, mocker) -> None:
        mocker.patch("mcp_server.server.search_pages",
                     side_effect=STDBError("db error", code=STDBErrorCode.QUERY_FAILED))
        result = await _handle_wiki_search({"query": "test"})
        assert "Database error" in result[0].text


# ═══════════════════════════════════════════════════════════════════════════════
# Tool: wiki_read_page
# ═══════════════════════════════════════════════════════════════════════════════


class TestHandleWikiReadPage:
    async def test_read_by_id(self, mocker) -> None:
        fake = {"id": "p1", "title": "Readme", "slug": "readme",
                "text_content": "Hello world", "updated_at": "2024-01-01",
                "created_at": "2024-01-01T00:00:00Z", "status": "published",
                "tags": []}
        mocker.patch("mcp_server.server.get_page", return_value=fake)
        result = await _handle_wiki_read_page({"id": "p1"})
        text = result[0].text
        assert "Readme" in text
        assert "Hello world" in text

    async def test_read_by_slug(self, mocker) -> None:
        fake = {"id": "p1", "title": "Readme", "slug": "readme",
                "text_content": "Hello", "updated_at": "2024-01-01",
                "created_at": "2024-01-01T00:00:00Z", "status": "published",
                "tags": []}
        mocker.patch("mcp_server.server.get_page", return_value=None)
        mocker.patch("mcp_server.server.get_page_by_slug", return_value=fake)
        result = await _handle_wiki_read_page({"id": "readme"})
        text = result[0].text
        assert "Readme" in text

    async def test_read_not_found(self, mocker) -> None:
        mocker.patch("mcp_server.server.get_page", return_value=None)
        mocker.patch("mcp_server.server.get_page_by_slug", return_value=None)
        result = await _handle_wiki_read_page({"id": "nonexistent"})
        assert "not found" in result[0].text.lower()

    async def test_read_missing_id(self) -> None:
        result = await _handle_wiki_read_page({})
        assert "Missing required argument" in result[0].text

    async def test_read_stdb_error(self, mocker) -> None:
        mocker.patch("mcp_server.server.get_page",
                     side_effect=STDBError("db down", code=STDBErrorCode.QUERY_FAILED))
        result = await _handle_wiki_read_page({"id": "p1"})
        assert "Database error" in result[0].text


# ═══════════════════════════════════════════════════════════════════════════════
# Tool: wiki_list_collections
# ═══════════════════════════════════════════════════════════════════════════════


class TestHandleWikiListCollections:
    async def test_list_collections(self, mocker) -> None:
        fake = [
            {"id": "c1", "name": "Docs", "slug": "docs", "description": "Doc collections",
             "icon": "📚", "color": "#000", "page_count": 5, "updated_at": "2024-01-01"},
        ]
        mocker.patch("mcp_server.server.list_collections", return_value=fake)
        result = await _handle_wiki_list_collections({})
        text = result[0].text
        assert "Docs" in text
        assert "📚" in text

    async def test_list_collections_empty(self, mocker) -> None:
        mocker.patch("mcp_server.server.list_collections", return_value=[])
        result = await _handle_wiki_list_collections({})
        assert "No collections" in result[0].text

    async def test_list_collections_stdb_error(self, mocker) -> None:
        mocker.patch("mcp_server.server.list_collections",
                     side_effect=STDBError("db err", code=STDBErrorCode.QUERY_FAILED))
        result = await _handle_wiki_list_collections({})
        assert "Database error" in result[0].text
