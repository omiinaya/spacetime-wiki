"""
Unit tests for the SpacetimeWiki MCP server.

All STDB interactions are mocked.
"""
from __future__ import annotations
import json
import sys
from unittest.mock import AsyncMock, patch

import pytest
from mcp.types import Resource, ResourceTemplate, TextContent, Tool

sys.path.insert(0, "server/mcp-server")

# Apply patches BEFORE importing server module
patch("stdb_client.sql_query", return_value=[[1]]).start()
patch("stdb_client.search_pages", return_value=[]).start()
# get_page and get_page_by_slug are patched per-test via mocker
patch("stdb_client.list_collections", return_value=[]).start()
patch("stdb_client.list_pages", return_value=[]).start()
patch("stdb_client.get_backlinks", return_value=[]).start()
patch("stdb_client.get_linked_pages", return_value=[]).start()
patch("stdb_client.get_collection", return_value=None).start()
patch("stdb_client.list_page_tags", return_value=[]).start()
patch("stdb_client.get_page", return_value=None).start()
patch("stdb_client.get_page_by_slug", return_value=None).start()

import server
import stdb_client
from server import (MCPErrorCode, _TOOL_HANDLERS, _error_response,
    _get_int_arg, _get_str_arg,
    _handle_wiki_get_backlinks, _handle_wiki_get_linked_pages,
    _handle_wiki_health, _handle_wiki_list_collections,
    _handle_wiki_list_pages, _handle_wiki_read_page,
    _handle_wiki_search, _text, _tool_error,
    call_tool, list_resource_templates, list_resources,
    list_tools, read_resource)
from stdb_client import STDBError, STDBErrorCode

pytestmark = pytest.mark.asyncio

@pytest.fixture(autouse=True)
def _reset_ctx():
    from server import request_id_var, set_request_id
    from stdb_client import correlation_id_var, set_correlation_id
    set_request_id(None)
    set_correlation_id(None)

class TestGetStrArg:
    def test_valid(self):
        assert _get_str_arg({'k':'h'},'k',max_len=100)=='h'
    def test_missing_required(self):
        with pytest.raises(ValueError,match='Missing required'):
            _get_str_arg({},'k',max_len=100)
    def test_missing_default(self):
        assert _get_str_arg({},'k',required=False,default='fb',max_len=100)=='fb'
    def test_non_string(self):
        with pytest.raises(TypeError,match='must be a string'):
            _get_str_arg({'k':42},'k',max_len=100)
    def test_whitespace(self):
        with pytest.raises(ValueError,match='must not be empty'):
            _get_str_arg({'k':'   '},'k',max_len=100)
    def test_too_long(self):
        with pytest.raises(ValueError,match='too long'):
            _get_str_arg({'k':'a'*300},'k',max_len=200)
    def test_none_required(self):
        with pytest.raises(ValueError,match='Missing required'):
            _get_str_arg({'k':None},'k',max_len=100)
    def test_none_default(self):
        assert _get_str_arg({'k':None},'k',required=False,default='fb',max_len=100)=='fb'
    def test_strips(self):
        assert _get_str_arg({'k':'  h  '},'k',max_len=100)=='h'

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

class TestGetIntArg:
    def test_valid(self):
        assert _get_int_arg({"c":5},"c",default=0,min_val=0,max_val=100)==5
    def test_missing_default(self):
        assert _get_int_arg({},"c",default=10,min_val=0,max_val=100)==10
    def test_string_accepted(self):
        assert _get_int_arg({"c":"7"},"c",default=0,min_val=0,max_val=100)==7
    def test_non_numeric(self):
        with pytest.raises(TypeError,match="must be an integer"):
            _get_int_arg({"c":"abc"},"c",default=0,min_val=0,max_val=100)
    def test_below_min(self):
        with pytest.raises(ValueError,match="must be between"):
            _get_int_arg({"c":-5},"c",default=0,min_val=0,max_val=100)
    def test_above_max(self):
        with pytest.raises(ValueError,match="must be between"):
            _get_int_arg({"c":200},"c",default=0,min_val=0,max_val=100)
    def test_at_min(self):
        assert _get_int_arg({"c":0},"c",default=0,min_val=0,max_val=100)==0
    def test_at_max(self):
        assert _get_int_arg({"c":100},"c",default=0,min_val=0,max_val=100)==100

class TestErrorResponse:
    def test_minimal(self):
        p=json.loads(_error_response("C","m")[0].text)
        assert p["error"]["code"]=="C" and p["error"]["message"]=="m"
    def test_with_details(self):
        p=json.loads(_error_response("C","m",details={"f":"id"})[0].text)
        assert p["error"]["details"]["f"]=="id"
    def test_text(self):
        r=_text("Hi")
        assert len(r)==1 and isinstance(r[0],TextContent) and r[0].text=="Hi"
    def test_tool_error_value(self):
        r=_tool_error("t",ValueError("bad"),"validation")
        assert json.loads(r[0].text)["error"]["code"]=="VALIDATION_ERROR"
    def test_tool_error_type(self):
        r=_tool_error("t",TypeError("bad"),"validation")
        assert json.loads(r[0].text)["error"]["code"]=="VALIDATION_ERROR"
    def test_tool_error_stdb(self):
        r=_tool_error("t",STDBError("d",code=STDBErrorCode.QUERY_FAILED),"stdb")
        assert json.loads(r[0].text)["error"]["code"]=="STDB_UNAVAILABLE"
    def test_tool_error_timeout(self):
        r=_tool_error("t",STDBError("t",code=STDBErrorCode.TIMEOUT),"stdb")
        assert json.loads(r[0].text)["error"]["code"]=="TIMEOUT"
    def test_tool_error_circuit(self):
        r=_tool_error("t",STDBError("c",code=STDBErrorCode.CIRCUIT_OPEN),"stdb")
        assert json.loads(r[0].text)["error"]["code"]=="CIRCUIT_OPEN"
    def test_tool_error_internal(self):
        r=_tool_error("t",RuntimeError("x"),"internal")
        assert json.loads(r[0].text)["error"]["code"]=="INTERNAL_ERROR"

class TestHealth:
    async def test_ok(self):
        t=(await _handle_wiki_health({}))[0].text
        assert "Server: running" in t
        assert "STDB:" in t
    async def test_extra_args(self):
        t=(await _handle_wiki_health({"x":1}))[0].text
        assert "Server: running" in t

class TestSearch:
    async def test_valid(self,mocker):
        mocker.patch("server.search_pages",return_value=[{"id":"p1","title":"A","slug":"a","text_content":"","collection_id":"","status":"published","updated_at":"2024-01-01","created_at":"2024-01-01T00:00:00Z"}])
        t=(await _handle_wiki_search({"query":"t","limit":10,"offset":0}))[0].text
        assert "A" in t
    async def test_missing_query(self):
        with pytest.raises(ValueError,match="Missing required"):
            await _handle_wiki_search({})
    async def test_empty(self,mocker):
        mocker.patch("server.search_pages",return_value=[])
        t=(await _handle_wiki_search({"query":"x"}))[0].text
        assert "No pages found" in t
    async def test_stdb_error(self,mocker):
        mocker.patch("server.search_pages",side_effect=STDBError("e",code=STDBErrorCode.QUERY_FAILED))
        t=(await _handle_wiki_search({"query":"x"}))[0].text
        assert "Database error" in t

class TestReadPage:
    async def test_by_id(self,mocker):
        mocker.patch("server.get_page",return_value={"id":"p1","title":"R","slug":"r","text_content":"H","collection_id":"","status":"published","icon":"","updated_at":"2024-01-01","created_at":"2024-01-01T00:00:00Z"})
        mocker.patch("server.list_page_tags",return_value=[])
        t=(await _handle_wiki_read_page({"id":"p1"}))[0].text
        assert "R" in t and "H" in t
    async def test_by_slug(self,mocker):
        mocker.patch("server.get_page",return_value=None)
        mocker.patch("server.get_page_by_slug",return_value={"id":"p1","title":"R","slug":"r","text_content":"","collection_id":"","status":"published","icon":"","updated_at":"2024-01-01","created_at":"2024-01-01T00:00:00Z"})
        mocker.patch("server.list_page_tags",return_value=[])
        t=(await _handle_wiki_read_page({"id":"slug"}))[0].text
        assert "R" in t
    async def test_not_found(self,mocker):
        mocker.patch("server.get_page",return_value=None)
        mocker.patch("server.get_page_by_slug",return_value=None)
        t=(await _handle_wiki_read_page({"id":"x"}))[0].text
        assert "not found" in t.lower()
    async def test_missing_id(self):
        with pytest.raises(ValueError,match="Missing required"):
            await _handle_wiki_read_page({})
    async def test_stdb_error(self,mocker):
        mocker.patch("server.get_page",side_effect=STDBError("e",code=STDBErrorCode.QUERY_FAILED))
        t=(await _handle_wiki_read_page({"id":"p1"}))[0].text
        assert "Database error" in t

class TestListCols:
    async def test_list(self,mocker):
        mocker.patch("server.list_collections",return_value=[{"id":"c1","name":"Docs","slug":"d","description":"Documents","parent_id":"","icon":"","color":"","sort_order":0,"created_by":"","created_at":0,"updated_at":0}])
        t=(await _handle_wiki_list_collections({}))[0].text
        assert "Docs" in t
    async def test_empty(self,mocker):
        mocker.patch("server.list_collections",return_value=[])
        t=(await _handle_wiki_list_collections({}))[0].text
        assert "No collections" in t
    async def test_stdb_error(self,mocker):
        mocker.patch("server.list_collections",side_effect=STDBError("e",code=STDBErrorCode.QUERY_FAILED))
        t=(await _handle_wiki_list_collections({}))[0].text
        assert "Database error" in t

class TestListPages:
    async def test_list(self,mocker):
        mocker.patch("server.list_pages",return_value=[{"id":"p1","title":"P","slug":"p","text_content":"","collection_id":"","status":"published","icon":"","updated_at":"2024-01-01","created_at":"2024-01-01T00:00:00Z"}])
        t=(await _handle_wiki_list_pages({"limit":10,"offset":0}))[0].text
        assert "P" in t
    async def test_defaults(self,mocker):
        mocker.patch("server.list_pages",return_value=[])
        t=(await _handle_wiki_list_pages({}))[0].text
        assert "No pages found" in t
    async def test_stdb_error(self,mocker):
        mocker.patch("server.list_pages",side_effect=STDBError("e",code=STDBErrorCode.QUERY_FAILED))
        t=(await _handle_wiki_list_pages({}))[0].text
        assert "Database error" in t

class TestBacklinks:
    async def test_get(self,mocker):
        mocker.patch("server.get_backlinks",return_value=[{"id":"p2","title":"R","slug":"r","text_content":"","updated_at":"2024-01-01","created_at":"2024-01-01T00:00:00Z","status":"published"}])
        t=(await _handle_wiki_get_backlinks({"page_id":"p1","limit":10,"offset":0}))[0].text
        assert "R" in t
    async def test_empty(self,mocker):
        mocker.patch("server.get_backlinks",return_value=[])
        t=(await _handle_wiki_get_backlinks({"page_id":"p1"}))[0].text
        assert "No pages link" in t
    async def test_missing_id(self):
        with pytest.raises(ValueError,match="Missing required"):
            await _handle_wiki_get_backlinks({})
    async def test_stdb_error(self,mocker):
        mocker.patch("server.get_backlinks",side_effect=STDBError("e",code=STDBErrorCode.QUERY_FAILED))
        t=(await _handle_wiki_get_backlinks({"page_id":"p1"}))[0].text
        assert "Database error" in t

class TestLinkedPages:
    async def test_get(self,mocker):
        mocker.patch("server.get_linked_pages",return_value=[{"id":"p2","title":"L","slug":"l","text_content":"","updated_at":"2024-01-01","created_at":"2024-01-01T00:00:00Z","status":"published"}])
        t=(await _handle_wiki_get_linked_pages({"page_id":"p1","limit":10,"offset":0}))[0].text
        assert "L" in t
    async def test_empty(self,mocker):
        mocker.patch("server.get_linked_pages",return_value=[])
        t=(await _handle_wiki_get_linked_pages({"page_id":"p1"}))[0].text
        assert "No linked pages" in t
    async def test_missing_id(self):
        with pytest.raises(ValueError,match="Missing required"):
            await _handle_wiki_get_linked_pages({})
    async def test_stdb_error(self,mocker):
        mocker.patch("server.get_linked_pages",side_effect=STDBError("e",code=STDBErrorCode.QUERY_FAILED))
        t=(await _handle_wiki_get_linked_pages({"page_id":"p1"}))[0].text
        assert "Database error" in t

class TestToolRegistry:
    def test_all_tools(self):
        expected={"wiki_health","wiki_search","wiki_read_page","wiki_list_collections","wiki_list_pages","wiki_get_backlinks","wiki_get_linked_pages"}
        assert set(_TOOL_HANDLERS.keys())==expected
    def test_callable(self):
        for n,h in _TOOL_HANDLERS.items():
            assert callable(h), n

class TestCallTool:
    async def test_known(self,mocker):
        mocker.patch("server.search_pages",return_value=[])
        r=await call_tool("wiki_search",{"query":"t"})
        assert len(r)==1 and isinstance(r[0],TextContent)
    async def test_unknown(self):
        r=await call_tool("nonexistent",{})
        assert json.loads(r[0].text)["error"]["code"]=="VALIDATION_ERROR"
    async def test_non_dict(self):
        r=await call_tool("wiki_health","bad")
        assert json.loads(r[0].text)["error"]["code"]=="VALIDATION_ERROR"
    async def test_value_error(self,mocker):
        async def f(a): raise ValueError("bad")
        mocker.patch.dict("server._TOOL_HANDLERS",{"f":f})
        r=await call_tool("f",{})
        assert json.loads(r[0].text)["error"]["code"]=="VALIDATION_ERROR"
    async def test_stdb_error(self,mocker):
        async def f(a): raise STDBError("e",code=STDBErrorCode.QUERY_FAILED)
        mocker.patch.dict("server._TOOL_HANDLERS",{"f":f})
        r=await call_tool("f",{})
        assert json.loads(r[0].text)["error"]["code"]=="STDB_UNAVAILABLE"
    async def test_internal_error(self,mocker):
        async def f(a): raise RuntimeError("x")
        mocker.patch.dict("server._TOOL_HANDLERS",{"f":f})
        r=await call_tool("f",{})
        assert json.loads(r[0].text)["error"]["code"]=="INTERNAL_ERROR"

class TestListTools:
    async def test_all_tools(self):
        tools=await list_tools()
        names={t.name for t in tools}
        expected={"wiki_health","wiki_search","wiki_read_page","wiki_list_collections","wiki_list_pages","wiki_get_backlinks","wiki_get_linked_pages"}
        assert names==expected
    async def test_each_has_schema(self):
        for t in await list_tools():
            assert t.inputSchema is not None
            assert "properties" in t.inputSchema
            assert t.description

class TestListResources:
    async def test_success(self,mocker):
        mocker.patch("server.list_pages",return_value=[{"id":"p1","title":"Test","slug":"test","text_content":"","collection_id":"","status":"published","icon":"","updated_at":"2024-01-01","created_at":"2024-01-01T00:00:00Z"}])
        resources=await list_resources()
        assert len(resources)==1
        assert str(resources[0].uri)=="wiki://pages/p1"
        assert resources[0].name=="Test"
    async def test_empty(self,mocker):
        mocker.patch("server.list_pages",return_value=[])
        assert await list_resources()==[]
    async def test_stdb_error(self,mocker):
        mocker.patch("server.list_pages",side_effect=STDBError("e",code=STDBErrorCode.QUERY_FAILED))
        assert await list_resources()==[]

class TestListResourceTemplates:
    async def test_templates(self):
        templates=await list_resource_templates()
        uris={t.uriTemplate for t in templates}
        assert "wiki://pages/{id}" in uris
        assert "wiki://collections/{id}" in uris

    async def test_page_not_found_slug(self,mocker):
        mocker.patch("server.get_page",return_value=None)
        r=await read_resource("wiki://pages/my-slug")
        p=json.loads(r) if isinstance(r,str) else json.loads(r.decode())
        assert "not found" in p.get("error","").lower()

class TestReadResource:
    async def test_page(self,mocker):
        mocker.patch("server.get_page",return_value={"id":"p1","title":"Test","slug":"test","text_content":"H","collection_id":"","status":"published","icon":"","updated_at":"2024-01-01","created_at":"2024-01-01T00:00:00Z"})
        r=await read_resource("wiki://pages/p1")
        p=json.loads(r) if isinstance(r,str) else json.loads(r.decode())
        assert p["title"]=="Test"
    async def test_page_not_found(self,mocker):
        mocker.patch("server.get_page",return_value=None)
        mocker.patch("server.get_page_by_slug",return_value=None)
        r=await read_resource("wiki://pages/x")
        p=json.loads(r) if isinstance(r,str) else json.loads(r.decode())
        assert "not found" in p.get("error","").lower()
    async def test_collection(self,mocker):
        mocker.patch("server.get_collection",return_value={"id":"c1","name":"Docs","slug":"d","description":"","icon":"","color":"","page_count":3,"updated_at":"2024-01-01"})
        r=await read_resource("wiki://collections/c1")
        p=json.loads(r) if isinstance(r,str) else json.loads(r.decode())
        assert p["name"]=="Docs"
    async def test_collection_not_found(self,mocker):
        mocker.patch("server.get_collection",return_value=None)
        r=await read_resource("wiki://collections/x")
        p=json.loads(r) if isinstance(r,str) else json.loads(r.decode())
        assert "not found" in p.get("error","").lower()
    async def test_invalid_uri(self):
        r=await read_resource("invalid")
        p=json.loads(r) if isinstance(r,str) else json.loads(r.decode())
        assert "error" in p
    async def test_empty_uri(self):
        r=await read_resource("")
        p=json.loads(r) if isinstance(r,str) else json.loads(r.decode())
        assert "error" in p
    async def test_stdb_error_page(self,mocker):
        mocker.patch("server.get_page",side_effect=STDBError("e",code=STDBErrorCode.QUERY_FAILED))
        r=await read_resource("wiki://pages/p1")
        p=json.loads(r) if isinstance(r,str) else json.loads(r.decode())
        assert "error" in p
    async def test_stdb_error_collection(self,mocker):
        mocker.patch("server.get_collection",side_effect=STDBError("e",code=STDBErrorCode.QUERY_FAILED))
        r=await read_resource("wiki://collections/c1")
        p=json.loads(r) if isinstance(r,str) else json.loads(r.decode())
        assert "error" in p

