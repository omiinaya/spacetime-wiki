"""Unit tests for MCP server tool definitions and handlers."""

import json

import pytest

# Realistic page dict matching stdb_client.map_page() output
SAMPLE_PAGE = {
    "id": "p1",
    "title": "Test Page",
    "slug": "test-page",
    "text_content": "Hello world",
    "collection_id": None,
    "parent_page_id": None,
    "status": "published",
    "icon": "📄",
    "color": "gray",
    "full_width": False,
    "is_pinned": False,
    "is_template": False,
    "template_id": None,
    "sort_order": 0,
    "created_by": "user1",
    "updated_by": "user1",
    "created_at": 1700000000,
    "updated_at": 1700000001,
    "published_at": 1700000000,
    "deleted_at": None,
}

SAMPLE_COLLECTION = {
    "id": "c1",
    "name": "Docs",
    "slug": "docs",
    "description": "Documentation collection",
    "parent_id": None,
    "icon": "📚",
    "color": "blue",
    "sort_order": 0,
    "created_by": "user1",
    "created_at": 1700000000,
    "updated_at": 1700000001,
}


class TestListTools:
    """Verify the 7 tool definitions."""

    @pytest.mark.asyncio
    async def test_returns_seven_tools(self, server_module):
        import server as srv
        tools = await srv.list_tools()
        assert len(tools) == 7

    @pytest.mark.asyncio
    async def test_tool_names(self, server_module):
        import server as srv
        tools = await srv.list_tools()
        names = [t.name for t in tools]
        assert names == [
            "wiki_health",
            "wiki_search",
            "wiki_read_page",
            "wiki_list_collections",
            "wiki_list_pages",
            "wiki_get_backlinks",
            "wiki_get_linked_pages",
        ]

    @pytest.mark.asyncio
    async def test_health_has_no_required_params(self, server_module):
        import server as srv
        tools = await srv.list_tools()
        health = next(t for t in tools if t.name == "wiki_health")
        assert health.inputSchema.get("required", []) == []

    @pytest.mark.asyncio
    async def test_read_page_requires_id(self, server_module):
        import server as srv
        tools = await srv.list_tools()
        rp = next(t for t in tools if t.name == "wiki_read_page")
        assert "id" in rp.inputSchema.get("required", [])

    @pytest.mark.asyncio
    async def test_search_requires_query(self, server_module):
        import server as srv
        tools = await srv.list_tools()
        s = next(t for t in tools if t.name == "wiki_search")
        assert "query" in s.inputSchema.get("required", [])


class TestToolDispatch:
    """Exercise call_tool() with mocked stdb_client responses."""

    @pytest.mark.asyncio
    async def test_unknown_tool(self, server_module):
        import server as srv
        result = await srv.call_tool("nonexistent", {})
        data = json.loads(result[0].text)
        assert data["error"]["code"] == "VALIDATION_ERROR"
        assert "Unknown tool" in data["error"]["message"]

    @pytest.mark.asyncio
    async def test_health_returns_ok(self, server_module):
        import server as srv
        srv.sql_query.return_value = [["1"]]
        result = await srv.call_tool("wiki_health", {})
        text = result[0].text
        assert "reachable" in text.lower() or "ok" in text.lower()

    @pytest.mark.asyncio
    async def test_health_stdb_failure(self, server_module):
        import server as srv
        # Server catches STDBError specifically
        srv.sql_query.side_effect = srv.STDBError("STDB down")
        result = await srv.call_tool("wiki_health", {})
        text = result[0].text
        assert "unreachable" in text.lower()

    @pytest.mark.asyncio
    async def test_search_returns_results(self, server_module):
        import server as srv
        srv.search_pages.return_value = [SAMPLE_PAGE]
        result = await srv.call_tool("wiki_search", {"query": "test"})
        text = result[0].text
        assert "Test Page" in text

    @pytest.mark.asyncio
    async def test_search_empty_results(self, server_module):
        import server as srv
        result = await srv.call_tool("wiki_search", {"query": "nothing"})
        text = result[0].text
        assert "No pages found" in text

    @pytest.mark.asyncio
    async def test_read_page_by_id(self, server_module):
        import server as srv
        srv.get_page.return_value = dict(SAMPLE_PAGE)
        srv.list_page_tags.return_value = []
        srv.get_backlinks.return_value = []
        result = await srv.call_tool("wiki_read_page", {"id": "p1"})
        data = json.loads(result[0].text)
        assert data["title"] == "Test Page"

    @pytest.mark.asyncio
    async def test_read_page_by_slug(self, server_module):
        import server as srv
        srv.get_page.return_value = None
        srv.get_page_by_slug.return_value = dict(SAMPLE_PAGE)
        srv.list_page_tags.return_value = []
        srv.get_backlinks.return_value = []
        result = await srv.call_tool("wiki_read_page", {"id": "sluggy"})
        data = json.loads(result[0].text)
        assert data["title"] == "Test Page"

    @pytest.mark.asyncio
    async def test_read_page_not_found(self, server_module):
        import server as srv
        srv.get_page.return_value = None
        srv.get_page_by_slug.return_value = None
        result = await srv.call_tool("wiki_read_page", {"id": "nonexistent"})
        text = result[0].text
        assert "not found" in text.lower()

    @pytest.mark.asyncio
    async def test_list_collections(self, server_module):
        import server as srv
        srv.list_collections.return_value = [SAMPLE_COLLECTION]
        result = await srv.call_tool("wiki_list_collections", {})
        text = result[0].text
        assert "Docs" in text

    @pytest.mark.asyncio
    async def test_list_collections_empty(self, server_module):
        import server as srv
        result = await srv.call_tool("wiki_list_collections", {})
        text = result[0].text
        assert "No collections" in text

    @pytest.mark.asyncio
    async def test_list_pages(self, server_module):
        import server as srv
        srv.list_pages.return_value = [dict(SAMPLE_PAGE)]
        result = await srv.call_tool("wiki_list_pages", {})
        text = result[0].text
        assert "Test Page" in text

    @pytest.mark.asyncio
    async def test_list_pages_empty(self, server_module):
        import server as srv
        result = await srv.call_tool("wiki_list_pages", {})
        text = result[0].text
        assert "No pages found" in text

    @pytest.mark.asyncio
    async def test_list_pages_filtered_by_collection(self, server_module):
        import server as srv
        srv.list_pages.return_value = [dict(SAMPLE_PAGE)]
        result = await srv.call_tool("wiki_list_pages", {"collection_id": "c1"})
        text = result[0].text
        assert "Test Page" in text

    @pytest.mark.asyncio
    async def test_get_backlinks(self, server_module):
        import server as srv
        backlink = dict(SAMPLE_PAGE, id="p2", title="Referrer")
        srv.get_backlinks.return_value = [backlink]
        result = await srv.call_tool("wiki_get_backlinks", {"page_id": "p1"})
        text = result[0].text
        assert "Referrer" in text

    @pytest.mark.asyncio
    async def test_get_backlinks_empty(self, server_module):
        import server as srv
        result = await srv.call_tool("wiki_get_backlinks", {"page_id": "p1"})
        text = result[0].text
        assert "No pages link to p1" in text

    @pytest.mark.asyncio
    async def test_get_linked_pages(self, server_module):
        import server as srv
        linked = dict(SAMPLE_PAGE, id="p3", title="Linked Page")
        srv.get_linked_pages.return_value = [linked]
        result = await srv.call_tool("wiki_get_linked_pages", {"page_id": "p1"})
        text = result[0].text
        assert "Linked Page" in text

    @pytest.mark.asyncio
    async def test_get_linked_pages_empty(self, server_module):
        import server as srv
        result = await srv.call_tool("wiki_get_linked_pages", {"page_id": "p1"})
        text = result[0].text
        assert "No linked pages" in text

    @pytest.mark.asyncio
    async def test_validation_error_empty_id(self, server_module):
        import server as srv
        result = await srv.call_tool("wiki_read_page", {"id": ""})
        data = json.loads(result[0].text)
        assert data["error"]["code"] == "VALIDATION_ERROR"

    @pytest.mark.asyncio
    async def test_missing_required_arg(self, server_module):
        import server as srv
        result = await srv.call_tool("wiki_read_page", {})
        data = json.loads(result[0].text)
        assert data["error"]["code"] == "VALIDATION_ERROR"


class TestResources:
    """Exercise resource listing and reading."""

    @pytest.mark.asyncio
    async def test_list_resources(self, server_module):
        import server as srv
        srv.list_pages.return_value = [dict(SAMPLE_PAGE)]
        resources = await srv.list_resources()
        assert len(resources) >= 1
        assert str(resources[0].uri) == "wiki://pages/p1"
        assert "Test Page" in resources[0].name

    @pytest.mark.asyncio
    async def test_list_resources_empty(self, server_module):
        import server as srv
        resources = await srv.list_resources()
        assert len(resources) == 0

    @pytest.mark.asyncio
    async def test_list_resource_templates(self, server_module):
        import server as srv
        templates = await srv.list_resource_templates()
        assert len(templates) == 2
        uris = [t.uriTemplate for t in templates]
        assert "wiki://pages/{id}" in uris
        assert "wiki://collections/{id}" in uris

    @pytest.mark.asyncio
    async def test_read_resource_page(self, server_module):
        import server as srv
        srv.get_page.return_value = dict(SAMPLE_PAGE)
        srv.list_page_tags.return_value = []
        result = await srv.read_resource("wiki://pages/p1")
        data = json.loads(result)
        assert data.get("title") == "Test Page"

    @pytest.mark.asyncio
    async def test_read_resource_page_not_found(self, server_module):
        import server as srv
        srv.get_page.return_value = None
        result = await srv.read_resource("wiki://pages/nonexistent")
        data = json.loads(result)
        assert "error" in data

    @pytest.mark.asyncio
    async def test_read_resource_collection(self, server_module):
        import server as srv
        srv.get_collection.return_value = dict(SAMPLE_COLLECTION)
        result = await srv.read_resource("wiki://collections/c1")
        data = json.loads(result)
        assert data.get("name") == "Docs"

    @pytest.mark.asyncio
    async def test_read_resource_collection_not_found(self, server_module):
        import server as srv
        srv.get_collection.return_value = None
        result = await srv.read_resource("wiki://collections/nonexistent")
        data = json.loads(result)
        assert "error" in data

    @pytest.mark.asyncio
    async def test_read_resource_unknown_uri(self, server_module):
        import server as srv
        result = await srv.read_resource("wiki://unknown/foo")
        data = json.loads(result)
        assert "error" in data
        assert "Unknown resource URI" in data["error"]

    @pytest.mark.asyncio
    async def test_read_resource_empty_uri(self, server_module):
        import server as srv
        result = await srv.read_resource("")
        data = json.loads(result)
        assert "error" in data

    @pytest.mark.asyncio
    async def test_read_resource_invalid_page_id(self, server_module):
        import server as srv
        srv.get_page.side_effect = ValueError("Invalid ID")
        result = await srv.read_resource("wiki://pages/invalid")
        data = json.loads(result)
        assert "error" in data

    @pytest.mark.asyncio
    async def test_read_resource_stdb_error(self, server_module):
        import server as srv
        srv.get_page.side_effect = RuntimeError("STDB error")
        result = await srv.read_resource("wiki://pages/p1")
        data = json.loads(result)
        assert "error" in data


class TestErrorHandling:
    """Test error handling utilities (all sync functions)."""

    def test_error_response_format(self, server_module):
        import server as srv
        result = srv._error_response(srv.MCPErrorCode.VALIDATION_ERROR, "test error")
        text = result[0].text
        data = json.loads(text)
        assert data["error"]["code"] == "VALIDATION_ERROR"
        assert "test error" in data["error"]["message"]

    def test_text_helper(self, server_module):
        import server as srv
        result = srv._text("hello")
        assert result[0].text == "hello"

    def test_tool_error_validation(self, server_module):
        import server as srv
        result = srv._tool_error("test_tool", ValueError("bad value"), "validation")
        text = result[0].text
        data = json.loads(text)
        assert data["error"]["code"] == "VALIDATION_ERROR"
