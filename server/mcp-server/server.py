"""
SpacetimeWiki MCP Server — modelcontextprotocol server.

Exposes wiki pages, collections, and search as AI-accessible tools and resources
so that AI agents can read, search, and navigate the wiki knowledge base.

Transport: stdio (suitable for Hermes native MCP client integration)
"""

import asyncio
import json
import logging
import sys
import time
import uuid
from contextlib import asynccontextmanager
from contextvars import ContextVar
from typing import Any, AsyncIterator

from mcp.server import Server
from mcp.types import (
    Tool,
    TextContent,
    Resource,
    ResourceTemplate,
)
from stdb_client import (
    search_pages,
    get_page,
    get_page_by_slug,
    list_collections,
    list_pages,
    get_backlinks,
    list_page_tags,
    get_linked_pages,
    get_collection,
    get_correlation_id,
    set_correlation_id,
    STDBError,
    close_http_client,
    sql_query,
)
from config import MCP_SERVER_NAME

logger = logging.getLogger("spacetime-wiki-mcp.server")


# ─── Lifespan (startup validation + shutdown cleanup) ────────────────────────


@asynccontextmanager
async def server_lifespan(server: Server) -> AsyncIterator[dict[str, Any]]:
    """Manage server lifecycle: validate STDB on startup, clean up on shutdown.

    Yields an empty context dict for future extensibility.
    """
    # ── Startup ──────────────────────────────────────────────────────────
    logger.info("Starting SpacetimeWiki MCP server...")
    try:
        logger.info("Performing startup STDB connectivity check...")
        start = time.monotonic()
        rows = await sql_query("SELECT 1 AS ok")
        elapsed = time.monotonic() - start
        logger.info("STDB reachable (%d rows, %dms)", len(rows), int(elapsed * 1000))
    except Exception as e:
        logger.warning("STDB unreachable at startup: %s — will retry on first tool call", e, exc_info=True)

    yield {}
    logger.info("Shutting down SpacetimeWiki MCP server — closing HTTPX client...")
    await close_http_client()
    logger.info("Shutdown complete.")


app = Server(MCP_SERVER_NAME, lifespan=server_lifespan)

# ─── Correlation ID for request tracing ──────────────────────────────────────

request_id_var: ContextVar[str | None] = ContextVar("request_id", default=None)


def get_request_id() -> str:
    """Get or generate a request ID for the current request context."""
    rid = request_id_var.get()
    if rid is None:
        rid = uuid.uuid4().hex[:12]
        request_id_var.set(rid)
    return rid


def set_request_id(rid: str | None) -> None:
    """Set the request ID for the current request context."""
    request_id_var.set(rid)


# ─── Concurrency semaphore ───────────────────────────────────────────────────

# Limits concurrent STDB operations to prevent connection pool exhaustion
# when many MCP tool calls arrive simultaneously.
_CONCURRENCY_SEMAPHORE = asyncio.Semaphore(10)


async def _with_concurrency(coro):
    """Execute a coroutine under the concurrency semaphore.

    Prevents STDB connection pool exhaustion when many tool calls
    arrive simultaneously.
    """
    async with _CONCURRENCY_SEMAPHORE:
        return await coro


# ─── Argument validation helpers ─────────────────────────────────────────────


def _get_str_arg(
    args: dict[str, Any],
    key: str,
    *,
    required: bool = True,
    default: str | None = None,
    max_len: int = 2048,
) -> str | None:
    """Extract and validate a string argument from a tool call.

    Returns the validated string, *default* if not required and missing, or
    raises ``ValueError`` on invalid input.
    """
    raw = args.get(key)
    if raw is None:
        if required:
            raise ValueError(f"Missing required argument: '{key}'")
        return default
    if not isinstance(raw, str):
        raise TypeError(f"Argument '{key}' must be a string, got {type(raw).__name__}")
    stripped = raw.strip()
    if not stripped:
        raise ValueError(f"Argument '{key}' must not be empty")
    if len(stripped) > max_len:
        raise ValueError(
            f"Argument '{key}' is too long ({len(stripped)} chars, max {max_len})"
        )
    return stripped


def _get_int_arg(
    args: dict[str, Any],
    key: str,
    *,
    default: int,
    min_val: int,
    max_val: int,
) -> int:
    """Extract, clamp, and validate an integer argument from a tool call."""
    raw = args.get(key)
    if raw is None:
        return default
    try:
        v = int(raw)
    except (ValueError, TypeError):
        raise TypeError(
            f"Argument '{key}' must be an integer, got {type(raw).__name__}"
        )
    if v < min_val or v > max_val:
        raise ValueError(
            f"Argument '{key}' must be between {min_val} and {max_val}, got {v}"
        )
    return v


# ─── Structured error responses ──────────────────────────────────────────────


class MCPErrorCode:
    """Standardized error codes for MCP tool responses."""

    VALIDATION_ERROR = "VALIDATION_ERROR"
    NOT_FOUND = "NOT_FOUND"
    STDB_UNAVAILABLE = "STDB_UNAVAILABLE"
    INTERNAL_ERROR = "INTERNAL_ERROR"
    TIMEOUT = "TIMEOUT"
    CIRCUIT_OPEN = "CIRCUIT_OPEN"


def _error_response(
    code: str,
    message: str,
    details: dict[str, Any] | None = None,
) -> list[TextContent]:
    """Build a structured error response with error code and correlation ID."""
    corr_id = get_correlation_id()
    error_obj = {
        "error": {
            "code": code,
            "message": message,
            "correlation_id": corr_id,
        }
    }
    if details:
        error_obj["error"]["details"] = details
    return [TextContent(type="text", text=json.dumps(error_obj, indent=2))]


def _text(msg: str) -> list[TextContent]:
    """Shortcut for a single-text-content MCP response."""
    return [TextContent(type="text", text=msg)]


def _tool_error(
    tool_name: str,
    error: Exception,
    context: str = "",
) -> list[TextContent]:
    """Build a user-facing error response for a tool failure.

    Maps exception types to structured error codes and includes
    correlation IDs for debugging.
    """
    ctx = f" ({context})" if context else ""
    logger.error(
        "Error in %s%s: %s (correlation_id=%s)",
        tool_name, ctx, error, get_correlation_id(), exc_info=True,
    )

    if isinstance(error, (ValueError, TypeError)):
        return _error_response(
            MCPErrorCode.VALIDATION_ERROR,
            str(error),
            {"tool": tool_name, "context": context},
        )

    if isinstance(error, TimeoutError):
        return _error_response(
            MCPErrorCode.TIMEOUT,
            f"Operation timed out: {error}",
            {"tool": tool_name, "context": context},
        )

    if isinstance(error, STDBError):
        code_map = {
            "STDB_CONNECTION_FAILED": MCPErrorCode.STDB_UNAVAILABLE,
            "STDB_TIMEOUT": MCPErrorCode.TIMEOUT,
            "STDB_CIRCUIT_OPEN": MCPErrorCode.CIRCUIT_OPEN,
        }
        mapped_code = code_map.get(error.code.value, MCPErrorCode.STDB_UNAVAILABLE)
        return _error_response(
            mapped_code,
            f"Database error: {error}",
            {"tool": tool_name, "context": context, "correlation_id": error.correlation_id},
        )

    return _error_response(
        MCPErrorCode.INTERNAL_ERROR,
        f"Internal error: {error}",
        {"tool": tool_name, "context": context},
    )


# ─── Resources ─────────────────────────────────────────────────────────────────


@app.list_resources()
async def list_resources() -> list[Resource]:
    """List all wiki pages as resources."""
    set_request_id(uuid.uuid4().hex[:12])
    corr_id = get_request_id()
    logger.info("list_resources called (request_id=%s)", corr_id)

    try:
        pages = await _with_concurrency(list_pages(limit=100))
    except Exception as e:
        logger.error(
            "Failed to list resources from STDB: %s (request_id=%s)", e, corr_id, exc_info=True,
        )
        return []

    return [
        Resource(
            uri=f"wiki://pages/{p['id']}",  # type: ignore[arg-type]
            name=p["title"],
            description=f"Wiki page: {p['title']} ({p['status']})",
            mimeType="application/json",
        )
        for p in pages
    ]


@app.read_resource()
async def read_resource(uri: str) -> str | bytes:  # type: ignore[override, arg-type]
    """Read a wiki page or collection resource by URI."""
    set_request_id(uuid.uuid4().hex[:12])
    corr_id = get_request_id()
    logger.info("read_resource called for %s (request_id=%s)", uri, corr_id)

    if not uri or not isinstance(uri, str):
        return json.dumps({
            "error": "URI must be a non-empty string",
            "correlation_id": corr_id,
        })

    if uri.startswith("wiki://pages/"):
        page_id = uri.removeprefix("wiki://pages/").split("?")[0]
        if not page_id:
            return json.dumps({
                "error": "Missing page ID in resource URI",
                "correlation_id": corr_id,
            })

        try:
            page = await _with_concurrency(get_page(page_id))
        except ValueError as e:
            logger.warning(
                "Invalid page ID in URI %s: %s (request_id=%s)", uri, e, corr_id,
            )
            return json.dumps({
                "error": f"Invalid page ID: {e}",
                "correlation_id": corr_id,
            })
        except STDBError as e:
            logger.error(
                "STDB error reading page %s: %s (request_id=%s)",
                page_id, e, corr_id, exc_info=True,
            )
            return json.dumps({
                "error": f"Database error: {e}",
                "code": e.code.value,
                "correlation_id": corr_id,
            })
        except Exception as e:
            logger.error(
                "Failed to read page %s from STDB: %s (request_id=%s)",
                page_id, e, corr_id, exc_info=True,
            )
            return json.dumps({
                "error": f"STDB unavailable: {e}",
                "correlation_id": corr_id,
            })

        if not page:
            return json.dumps({
                "error": f"Page not found: {page_id}",
                "correlation_id": corr_id,
            })

        # Fetch associated tags (non-fatal — degrade gracefully)
        try:
            tags = await _with_concurrency(list_page_tags(page_id))
            page["tags"] = tags
        except (STDBError, ValueError) as e:
            logger.error("Failed to fetch tags for page %s: %s", page_id, e)
            page["tags"] = []

        return json.dumps(page, indent=2)

    if uri.startswith("wiki://collections/"):
        collection_id = uri.removeprefix("wiki://collections/").split("?")[0]
        if not collection_id:
            return json.dumps({
                "error": "Missing collection ID in resource URI",
                "correlation_id": corr_id,
            })

        try:
            collection = await _with_concurrency(get_collection(collection_id))
        except ValueError as e:
            logger.warning(
                "Invalid collection ID in URI %s: %s (request_id=%s)", uri, e, corr_id,
            )
            return json.dumps({
                "error": f"Invalid collection ID: {e}",
                "correlation_id": corr_id,
            })
        except STDBError as e:
            logger.error(
                "STDB error reading collection %s: %s (request_id=%s)",
                collection_id, e, corr_id, exc_info=True,
            )
            return json.dumps({
                "error": f"Database error: {e}",
                "code": e.code.value,
                "correlation_id": corr_id,
            })
        except Exception as e:
            logger.error(
                "Failed to read collection %s from STDB: %s (request_id=%s)",
                collection_id, e, corr_id, exc_info=True,
            )
            return json.dumps({
                "error": f"STDB unavailable: {e}",
                "correlation_id": corr_id,
            })

        if not collection:
            return json.dumps({
                "error": f"Collection not found: {collection_id}",
                "correlation_id": corr_id,
            })

        return json.dumps(collection, indent=2)

    return json.dumps({
        "error": f"Unknown resource URI: {uri}",
        "correlation_id": corr_id,
    })


@app.list_resource_templates()
async def list_resource_templates() -> list[ResourceTemplate]:
    return [
        ResourceTemplate(
            uriTemplate="wiki://pages/{id}",
            name="Wiki Page",
            description="A wiki page by ID",
            mimeType="application/json",
        ),
        ResourceTemplate(
            uriTemplate="wiki://collections/{id}",
            name="Wiki Collection",
            description="A collection by ID",
            mimeType="application/json",
        ),
    ]


# ─── Tools ─────────────────────────────────────────────────────────────────────


@app.list_tools()
async def list_tools() -> list[Tool]:
    return [
        Tool(
            name="wiki_health",
            description=(
                "Check the health of the MCP server and STDB connectivity. "
                "Useful for diagnosing connectivity issues."
            ),
            inputSchema={
                "type": "object",
                "properties": {},
            },
        ),
        Tool(
            name="wiki_search",
            description=(
                "Full-text search across all wiki pages. "
                "Searches both title and body content."
            ),
            inputSchema={
                "type": "object",
                "properties": {
                    "query": {
                        "type": "string",
                        "description": "Search query (case-insensitive)",
                    },
                    "limit": {
                        "type": "integer",
                        "description": "Maximum results (default 20, max 50)",
                        "default": 20,
                    },
                    "offset": {
                        "type": "integer",
                        "description": "Zero-based offset (default 0)",
                        "default": 0,
                    },
                },
                "required": ["query"],
            },
        ),
        Tool(
            name="wiki_read_page",
            description=(
                "Get the full content of a wiki page by ID or slug. "
                "Returns title, content, tags, and metadata."
            ),
            inputSchema={
                "type": "object",
                "properties": {
                    "id": {
                        "type": "string",
                        "description": "Page ID (or slug to look up by slug)",
                    },
                },
                "required": ["id"],
            },
        ),
        Tool(
            name="wiki_list_collections",
            description=(
                "List all collections (folders/categories). "
                "Returns name, icon, description, and hierarchy."
            ),
            inputSchema={
                "type": "object",
                "properties": {
                    "limit": {
                        "type": "integer",
                        "description": "Maximum results (default 50, max 100)",
                        "default": 50,
                    },
                    "offset": {
                        "type": "integer",
                        "description": "Zero-based offset (default 0)",
                        "default": 0,
                    },
                },
            },
        ),
        Tool(
            name="wiki_list_pages",
            description="List wiki pages, optionally filtered by collection.",
            inputSchema={
                "type": "object",
                "properties": {
                    "collection_id": {
                        "type": "string",
                        "description": "Optional: filter by collection ID",
                    },
                    "limit": {
                        "type": "integer",
                        "description": "Maximum results (default 50, max 100)",
                        "default": 50,
                    },
                    "offset": {
                        "type": "integer",
                        "description": "Zero-based offset (default 0)",
                        "default": 0,
                    },
                },
            },
        ),
        Tool(
            name="wiki_get_backlinks",
            description=(
                "Find pages that link (refer) to a specific page. "
                "Useful for understanding cross-references."
            ),
            inputSchema={
                "type": "object",
                "properties": {
                    "page_id": {
                        "type": "string",
                        "description": "Page ID to find backlinks for",
                    },
                    "limit": {
                        "type": "integer",
                        "description": "Maximum results (default 20, max 50)",
                        "default": 20,
                    },
                    "offset": {
                        "type": "integer",
                        "description": "Zero-based offset (default 0)",
                        "default": 0,
                    },
                },
                "required": ["page_id"],
            },
        ),
        Tool(
            name="wiki_get_linked_pages",
            description=(
                "Find pages linked from a given page via internal wiki links."
            ),
            inputSchema={
                "type": "object",
                "properties": {
                    "page_id": {
                        "type": "string",
                        "description": "Page ID to find linked pages from",
                    },
                    "limit": {
                        "type": "integer",
                        "description": "Maximum results (default 20, max 50)",
                        "default": 20,
                    },
                    "offset": {
                        "type": "integer",
                        "description": "Zero-based offset (default 0)",
                        "default": 0,
                    },
                },
                "required": ["page_id"],
            },
        ),
    ]


# ─── Tool dispatch ────────────────────────────────────────────────────────────


async def _handle_wiki_health(arguments: dict[str, Any]) -> list[TextContent]:
    """Execute wiki_health — check server and STDB status."""
    set_request_id(uuid.uuid4().hex[:12])
    start = time.monotonic()
    stdb_status = "unknown"
    try:
        rows = await sql_query("SELECT 1 AS ok")
        elapsed = time.monotonic() - start
        stdb_status = f"reachable ({len(rows)} rows, {int(elapsed * 1000)}ms)"
    except Exception as e:
        elapsed = time.monotonic() - start
        logger.warning("STDB health check failed: %s (%dms)", e, int(elapsed * 1000), exc_info=True)
        stdb_status = f"unreachable: {e} ({int(elapsed * 1000)}ms)"

    lines = [
        "# SpacetimeWiki MCP Server Health\n",
        f"- Server: running (request_id={get_request_id()})",
        f"- STDB: {stdb_status}",
        f"- Concurrency semaphore: {_CONCURRENCY_SEMAPHORE}",
    ]
    return _text("\n".join(lines))


async def _handle_wiki_search(arguments: dict[str, Any]) -> list[TextContent]:
    """Execute wiki_search with validated args."""
    query = _get_str_arg(arguments, "query", max_len=256)
    limit = _get_int_arg(arguments, "limit", default=20, min_val=1, max_val=50)
    offset = _get_int_arg(arguments, "offset", default=0, min_val=0, max_val=9999)

    # Always returns a string thanks to required=True and _get_str_arg raising
    assert query is not None

    try:
        results = await _with_concurrency(search_pages(query, limit, offset))
    except STDBError as e:
        return _tool_error("wiki_search", e, context="stdb")
    except Exception as e:
        return _tool_error("wiki_search", e, context="internal")

    if not results:
        return _text(f"No pages found matching '{query}'")

    pagination = f" (showing {len(results)}, offset={offset})" if offset else ""
    lines = [f"# Search results for '{query}'{pagination}\n"]
    for p in results:
        status_tag = f"[{p['status']}]" if p['status'] != 'published' else ""
        col = f" in {p['collection_id']}" if p['collection_id'] else ""
        lines.append(f"## {p['title']} {status_tag}")
        lines.append(f"  ID: {p['id']}")
        lines.append(f"  Slug: {p['slug']}")
        lines.append(f"  Updated: {p['updated_at']}{col}")
        snippet = p.get('text_content', '')[:200].strip()
        if snippet:
            lines.append(f"  Preview: {snippet}...")
        lines.append("")
    return _text("\n".join(lines))


async def _handle_wiki_read_page(arguments: dict[str, Any]) -> list[TextContent]:
    """Execute wiki_read_page with validated args."""
    page_id_or_slug = _get_str_arg(arguments, "id", max_len=256)
    assert page_id_or_slug is not None

    # Try as ID first
    try:
        page = await _with_concurrency(get_page(page_id_or_slug))
    except STDBError as e:
        return _tool_error("wiki_read_page", e, context="stdb")
    except ValueError as e:
        return _text(f"Invalid page ID: {e}")

    if not page:
        # Fall back to slug lookup
        try:
            page = await _with_concurrency(get_page_by_slug(page_id_or_slug))
        except STDBError as e:
            return _tool_error("wiki_read_page", e, context="stdb")
        except ValueError as e:
            return _text(f"Invalid slug: {e}")

    if not page:
        return _text(f"Page not found: {page_id_or_slug}")

    # Enrich with tags (non-fatal — degrade gracefully)
    try:
        tags = await _with_concurrency(list_page_tags(page["id"]))
        page["tags"] = tags
    except (STDBError, ValueError) as e:
        logger.error("Failed to fetch tags for page %s: %s", page["id"], e)
        page["tags"] = []

    # Enrich with backlink count (non-fatal)
    try:
        backlinks = await _with_concurrency(get_backlinks(page["id"], limit=5))
        page["backlink_count"] = len(backlinks)
        page["backlinks_preview"] = [b["title"] for b in backlinks]
    except STDBError as e:
        logger.error("Failed to fetch backlinks for page %s: %s", page["id"], e)

    return _text(json.dumps(page, indent=2))


async def _handle_wiki_list_collections(
    arguments: dict[str, Any],
) -> list[TextContent]:
    """Execute wiki_list_collections with validated args."""
    limit = _get_int_arg(arguments, "limit", default=50, min_val=1, max_val=100)
    offset = _get_int_arg(arguments, "offset", default=0, min_val=0, max_val=9999)

    try:
        cols = await _with_concurrency(list_collections(limit=limit, offset=offset))
    except STDBError as e:
        return _tool_error("wiki_list_collections", e, context="stdb")
    except Exception as e:
        logger.error("Failed to list collections from STDB: %s", e, exc_info=True)
        return _text(f"STDB unavailable: {e}")

    if not cols:
        return _text("No collections found")

    pagination = f" (showing {len(cols)}, offset={offset})" if offset else ""
    lines = [f"# Collections ({limit}+ total, showing {len(cols)}){pagination}\n"]
    for c in cols:
        parent = f" (child of {c['parent_id']})" if c['parent_id'] else ""
        icon = c.get('icon', '📁')
        lines.append(f"- {icon} **{c['name']}**{parent}")
        lines.append(f"  ID: {c['id']} | Slug: {c['slug']}")
        if c.get('description'):
            lines.append(f"  {c['description']}")
        lines.append("")
    return _text("\n".join(lines))


async def _handle_wiki_list_pages(arguments: dict[str, Any]) -> list[TextContent]:
    """Execute wiki_list_pages with validated args."""
    collection_id = _get_str_arg(
        arguments, "collection_id", required=False, default=None,
    )
    limit = _get_int_arg(arguments, "limit", default=50, min_val=1, max_val=100)
    offset = _get_int_arg(arguments, "offset", default=0, min_val=0, max_val=9999)

    try:
        results = await _with_concurrency(list_pages(collection_id, limit, offset))
    except ValueError as e:
        return _text(f"Invalid argument: {e}")
    except STDBError as e:
        return _tool_error("wiki_list_pages", e, context="stdb")
    except Exception as e:
        logger.error("Failed to list pages from STDB: %s", e, exc_info=True)
        return _text(f"STDB unavailable: {e}")

    if not results:
        return _text("No pages found")

    title = f" in collection {collection_id}" if collection_id else ""
    lines = [f"# Pages{title} ({len(results)})\n"]
    for p in results:
        col = f" [{p['collection_id']}]" if p['collection_id'] else ""
        tpl = " [TEMPLATE]" if p.get('is_template') else ""
        lines.append(f"- {p['icon'] or '📄'} **{p['title']}**{tpl}{col}")
        lines.append(
            f"  ID: {p['id']} | Status: {p['status']} | Updated: {p['updated_at']}"
        )
        lines.append("")
    return _text("\n".join(lines))


async def _handle_wiki_get_backlinks(arguments: dict[str, Any]) -> list[TextContent]:
    """Execute wiki_get_backlinks with validated args."""
    page_id = _get_str_arg(arguments, "page_id", max_len=256)
    limit = _get_int_arg(arguments, "limit", default=20, min_val=1, max_val=50)
    offset = _get_int_arg(arguments, "offset", default=0, min_val=0, max_val=9999)
    assert page_id is not None

    try:
        results = await _with_concurrency(get_backlinks(page_id, limit, offset))
    except ValueError as e:
        return _text(f"Invalid page ID: {e}")
    except STDBError as e:
        return _tool_error("wiki_get_backlinks", e, context="stdb")
    except Exception as e:
        logger.error("Failed to get backlinks for %s from STDB: %s", page_id, e, exc_info=True)
        return _text(f"STDB unavailable: {e}")

    if not results:
        return _text(f"No pages link to {page_id}")

    lines = [f"# Pages linking to {page_id} ({len(results)})\n"]
    for p in results:
        lines.append(f"- **{p['title']}**")
        lines.append(f"  ID: {p['id']} | Updated: {p['updated_at']}")
        lines.append("")
    return _text("\n".join(lines))


async def _handle_wiki_get_linked_pages(
    arguments: dict[str, Any],
) -> list[TextContent]:
    """Execute wiki_get_linked_pages with validated args."""
    page_id = _get_str_arg(arguments, "page_id", max_len=256)
    limit = _get_int_arg(arguments, "limit", default=20, min_val=1, max_val=50)
    offset = _get_int_arg(arguments, "offset", default=0, min_val=0, max_val=9999)
    assert page_id is not None

    try:
        results = await _with_concurrency(get_linked_pages(page_id, limit, offset))
    except ValueError as e:
        return _text(f"Invalid page ID: {e}")
    except STDBError as e:
        return _tool_error("wiki_get_linked_pages", e, context="stdb")
    except Exception as e:
        logger.error("Failed to get linked pages for %s from STDB: %s", page_id, e, exc_info=True)
        return _text(f"STDB unavailable: {e}")

    if not results:
        return _text(f"No linked pages found from {page_id}")

    lines = [f"# Pages linked from {page_id} ({len(results)})\n"]
    for p in results:
        lines.append(f"- **{p['title']}**")
        lines.append(f"  ID: {p['id']} | Updated: {p['updated_at']}")
        lines.append("")
    return _text("\n".join(lines))


# ─── Tool registry ────────────────────────────────────────────────────────────


_TOOL_HANDLERS: dict[str, Any] = {
    "wiki_health": _handle_wiki_health,
    "wiki_search": _handle_wiki_search,
    "wiki_read_page": _handle_wiki_read_page,
    "wiki_list_collections": _handle_wiki_list_collections,
    "wiki_list_pages": _handle_wiki_list_pages,
    "wiki_get_backlinks": _handle_wiki_get_backlinks,
    "wiki_get_linked_pages": _handle_wiki_get_linked_pages,
}


@app.call_tool()
async def call_tool(name: str, arguments: dict) -> list[TextContent]:
    """Dispatch tool calls to per-handler functions with uniform error handling.

    Every tool handler is wrapped in a top-level try/except so that unexpected
    exceptions (serialization errors, logic bugs) always produce a user-facing
    error instead of a cryptic MCP protocol failure.
    """
    set_request_id(uuid.uuid4().hex[:12])

    if not isinstance(arguments, dict):
        return _error_response(
            MCPErrorCode.VALIDATION_ERROR,
            f"Internal error: arguments must be a dict, got {type(arguments).__name__}",
        )

    handler = _TOOL_HANDLERS.get(name)
    if not handler:
        return _error_response(
            MCPErrorCode.VALIDATION_ERROR,
            f"Unknown tool: {name}",
        )

    try:
        return await handler(arguments)
    except (ValueError, TypeError) as e:
        # User-facing validation errors
        return _tool_error(name, e, context="validation")
    except STDBError as e:
        return _tool_error(name, e, context="stdb")
    except Exception as e:
        # Internal / unexpected errors
        return _tool_error(name, e, context="internal")


# ─── Entry point ────────────────────────────────────────────────────────────────


def main() -> None:
    """Run the MCP server on stdio transport."""
    from mcp.server.stdio import stdio_server

    # Configure logging — output goes to stderr so it doesn't interfere
    # with stdio MCP transport
    logging.basicConfig(
        level=logging.INFO,
        format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
        stream=sys.stderr,
        force=True,
    )

    async def run() -> None:
        async with stdio_server() as (read_stream, write_stream):
            await app.run(
                read_stream,
                write_stream,
                app.create_initialization_options(),
            )

    import asyncio
    asyncio.run(run())


if __name__ == "__main__":
    main()
