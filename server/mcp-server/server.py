"""
SpacetimeWiki MCP Server — modelcontextprotocol server.

Exposes wiki pages, collections, and search as AI-accessible tools and resources
so that AI agents can read, search, and navigate the wiki knowledge base.

Transport: stdio (suitable for Hermes native MCP client integration)
"""

import asyncio
import json
import logging
import signal
import sys
import time
import uuid
from contextvars import ContextVar
from typing import Any

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
    CircuitBreaker,
    CircuitState,
    STDBError,
)
from config import MCP_SERVER_NAME

logger = logging.getLogger("spacetime-wiki-mcp.server")

app = Server(MCP_SERVER_NAME)

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


# ─── Rate limiting ───────────────────────────────────────────────────────────

_rate_limit_buckets: dict[str, list[float]] = {}
RATE_LIMIT_REQUESTS = 60  # requests per minute
RATE_LIMIT_WINDOW = 60.0  # seconds

# ─── Concurrency semaphore ───────────────────────────────────────────────────

# Limits concurrent STDB operations to prevent connection pool exhaustion
# when many MCP tool calls arrive simultaneously.
_CONCURRENCY_SEMAPHORE = asyncio.Semaphore(10)


def _check_rate_limit(client_id: str = "default") -> bool:
    """Check and update rate limit bucket for a client.

    Returns True if request is allowed, False if rate limited.
    """
    now = time.monotonic()
    bucket = _rate_limit_buckets.setdefault(client_id, [])
    # Remove expired entries
    while bucket and now - bucket[0] > RATE_LIMIT_WINDOW:
        bucket.pop(0)
    if len(bucket) >= RATE_LIMIT_REQUESTS:
        return False
    bucket.append(now)
    return True


def _get_client_id(arguments: dict[str, Any]) -> str:
    """Extract client identifier from arguments for rate limiting."""
    return arguments.get("_client_id", "default")


# ─── Structured error responses ──────────────────────────────────────────────


class MCPErrorCode:
    """Standardized error codes for MCP tool responses."""

    VALIDATION_ERROR = "VALIDATION_ERROR"
    NOT_FOUND = "NOT_FOUND"
    STDB_UNAVAILABLE = "STDB_UNAVAILABLE"
    INTERNAL_ERROR = "INTERNAL_ERROR"
    RATE_LIMITED = "RATE_LIMITED"
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
    """Build a user-facing error response for a tool failure."""
    ctx = f" ({context})" if context else ""
    logger.error(
        "Error in %s%s: %s (correlation_id=%s)",
        tool_name, ctx, error, get_correlation_id(), exc_info=True
    )

    # Map exception types to error codes
    if isinstance(error, (ValueError, TypeError)):
        return _error_response(
            MCPErrorCode.VALIDATION_ERROR,
            str(error),
            {"tool": tool_name, "context": context},
        )
    elif "STDB" in str(error) or "connection" in str(error).lower():
        return _error_response(
            MCPErrorCode.STDB_UNAVAILABLE,
            f"Database unavailable: {error}",
            {"tool": tool_name, "context": context},
        )
    else:
        return _error_response(
            MCPErrorCode.INTERNAL_ERROR,
            f"Internal error: {error}",
            {"tool": tool_name, "context": context},
        )


# ─── Request timeout wrapper ─────────────────────────────────────────────────

DEFAULT_TOOL_TIMEOUT = 30.0  # seconds


async def _with_timeout(coro, timeout: float = DEFAULT_TOOL_TIMEOUT):
    """Execute a coroutine with a timeout."""
    try:
        return await asyncio.wait_for(coro, timeout=timeout)
    except asyncio.TimeoutError:
        raise TimeoutError(f"Operation timed out after {timeout}s")


async def _with_concurrency(coro):
    """Execute a coroutine under the concurrency semaphore.

    Prevents STDB connection pool exhaustion when many tool calls
    arrive simultaneously.
    """
    async with _CONCURRENCY_SEMAPHORE:
        return await coro


# ─── Resources ─────────────────────────────────────────────────────────────────


@app.list_resources()
async def list_resources() -> list[Resource]:
    """List all wiki pages as resources."""
    set_request_id(uuid.uuid4().hex[:12])
    corr_id = get_correlation_id()
    logger.info("list_resources called (correlation_id=%s)", corr_id)

    try:
        pages = await list_pages(limit=100)
    except Exception as e:
        logger.error(
            "Failed to list resources from STDB: %s (correlation_id=%s)", e, corr_id
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
    corr_id = get_correlation_id()
    logger.info("read_resource called for %s (correlation_id=%s)", uri, corr_id)

    if not uri or not isinstance(uri, str):
        return json.dumps({"error": "URI must be a non-empty string", "correlation_id": corr_id})

    if uri.startswith("wiki://pages/"):
        page_id = uri.removeprefix("wiki://pages/").split("?")[0]
        if not page_id:
            return json.dumps({"error": "Missing page ID in resource URI", "correlation_id": corr_id})

        try:
            page = await _with_concurrency(get_page(page_id))
        except ValueError as e:
            logger.warning(
                "Invalid page ID in URI %s: %s (correlation_id=%s)", uri, e, corr_id,
            )
            return json.dumps({"error": f"Invalid page ID: {e}", "correlation_id": corr_id})
        except Exception as e:
            logger.error(
                "Failed to read page %s from STDB: %s (correlation_id=%s)",
                page_id, e, corr_id, exc_info=True,
            )
            return json.dumps({"error": f"STDB unavailable: {e}", "correlation_id": corr_id})

        if not page:
            return json.dumps({"error": f"Page not found: {page_id}", "correlation_id": corr_id})

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
            return json.dumps({"error": "Missing collection ID in resource URI", "correlation_id": corr_id})

        try:
            collection = await _with_concurrency(get_collection(collection_id))
        except ValueError as e:
            logger.warning(
                "Invalid collection ID in URI %s: %s (correlation_id=%s)", uri, e, corr_id,
            )
            return json.dumps({"error": f"Invalid collection ID: {e}", "correlation_id": corr_id})
        except Exception as e:
            logger.error(
                "Failed to read collection %s from STDB: %s (correlation_id=%s)",
                collection_id, e, corr_id, exc_info=True,
            )
            return json.dumps({"error": f"STDB unavailable: {e}", "correlation_id": corr_id})

        if not collection:
            return json.dumps({"error": f"Collection not found: {collection_id}", "correlation_id": corr_id})

        return json.dumps(collection, indent=2)

    return json.dumps({"error": f"Unknown resource URI: {uri}", "correlation_id": corr_id})


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
                        "description": "Pagination offset (default 0)",
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
                "properties": {},
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
                        "description": "Maximum results (default 50)",
                        "default": 50,
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
                        "description": "Maximum results (default 20)",
                        "default": 20,
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
                        "description": "Maximum results (default 20)",
                        "default": 20,
                    },
                },
                "required": ["page_id"],
            },
        ),
        Tool(
            name="wiki_health_check",
            description=(
                "Check the health of the MCP server and its STDB connection. "
                "Returns circuit breaker status and basic connectivity info."
            ),
            inputSchema={
                "type": "object",
                "properties": {},
            },
        ),
    ]


# ─── Tool handlers ────────────────────────────────────────────────────────────


async def _handle_wiki_search(arguments: dict[str, Any]) -> list[TextContent]:
    """Execute wiki_search with validated args."""
    query = _get_str_arg(arguments, "query", max_len=256)
    limit = _get_int_arg(arguments, "limit", default=20, min_val=1, max_val=50)
    offset = _get_int_arg(arguments, "offset", default=0, min_val=0, max_val=9999)

    try:
        results = await _with_concurrency(search_pages(query, limit, offset))
    except ValueError as e:
        return _error_response(
            MCPErrorCode.VALIDATION_ERROR,
            f"Invalid search query: {e}",
        )
    except Exception as e:
        logger.error(
            "wiki_search failed (query=%r): %s (correlation_id=%s)",
            query, e, get_correlation_id(), exc_info=True,
        )
        return _error_response(
            MCPErrorCode.STDB_UNAVAILABLE,
            f"Database error during search: {e}",
            {"query": query},
        )

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

    # Try as ID first
    try:
        page = await _with_concurrency(get_page(page_id_or_slug))
    except ValueError as e:
        return _error_response(
            MCPErrorCode.VALIDATION_ERROR,
            f"Invalid page ID: {e}",
        )
    except Exception as e:
        logger.error(
            "wiki_read_page failed (id=%r): %s (correlation_id=%s)",
            page_id_or_slug, e, get_correlation_id(), exc_info=True,
        )
        return _error_response(
            MCPErrorCode.STDB_UNAVAILABLE,
            f"Database error reading page: {e}",
            {"id": page_id_or_slug},
        )

    if not page:
        # Fall back to slug lookup
        try:
            page = await _with_concurrency(get_page_by_slug(page_id_or_slug))
        except ValueError as e:
            return _error_response(
                MCPErrorCode.VALIDATION_ERROR,
                f"Invalid slug: {e}",
            )
        except Exception as e:
            logger.error(
                "wiki_read_page slug lookup failed (slug=%r): %s (correlation_id=%s)",
                page_id_or_slug, e, get_correlation_id(), exc_info=True,
            )
            return _error_response(
                MCPErrorCode.STDB_UNAVAILABLE,
                f"Database error during slug lookup: {e}",
                {"slug": page_id_or_slug},
            )

    if not page:
        return _error_response(
            MCPErrorCode.NOT_FOUND,
            f"Page not found: {page_id_or_slug}",
            {"query": page_id_or_slug},
        )

    # Enrich with tags (non-fatal — degrade gracefully)
    try:
        tags = await list_page_tags(page["id"])
        page["tags"] = tags
    except Exception:
        page["tags"] = []

    # Enrich with backlink count (non-fatal)
    try:
        backlinks = await get_backlinks(page["id"], limit=5)
        page["backlink_count"] = len(backlinks)
        page["backlinks_preview"] = [b["title"] for b in backlinks]
    except Exception:
        pass

    return _text(json.dumps(page, indent=2))


async def _handle_wiki_list_collections(
    arguments: dict[str, Any],  # noqa: ARG001
) -> list[TextContent]:
    """Execute wiki_list_collections with validated args."""
    try:
        cols = await _with_concurrency(list_collections())
    except Exception as e:
        return _error_response(
            MCPErrorCode.STDB_UNAVAILABLE,
            f"Database unavailable: {e}",
        )

    if not cols:
        return _text("No collections found")

    lines = [f"# Collections ({len(cols)})\n"]
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

    try:
        results = await _with_concurrency(list_pages(collection_id, limit))
    except ValueError as e:
        return _error_response(
            MCPErrorCode.VALIDATION_ERROR,
            f"Invalid argument: {e}",
        )
    except Exception as e:
        return _error_response(
            MCPErrorCode.STDB_UNAVAILABLE,
            f"Database unavailable: {e}",
        )

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

    try:
        results = await _with_concurrency(get_backlinks(page_id, limit))
    except ValueError as e:
        return _error_response(
            MCPErrorCode.VALIDATION_ERROR,
            f"Invalid page ID: {e}",
        )
    except Exception as e:
        return _error_response(
            MCPErrorCode.STDB_UNAVAILABLE,
            f"Database unavailable: {e}",
        )

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

    try:
        results = await _with_concurrency(get_linked_pages(page_id, limit))
    except ValueError as e:
        return _error_response(
            MCPErrorCode.VALIDATION_ERROR,
            f"Invalid page ID: {e}",
        )
    except Exception as e:
        return _error_response(
            MCPErrorCode.STDB_UNAVAILABLE,
            f"Database unavailable: {e}",
        )

    if not results:
        return _text(f"No linked pages found from {page_id}")

    lines = [f"# Pages linked from {page_id} ({len(results)})\n"]
    for p in results:
        lines.append(f"- **{p['title']}**")
        lines.append(f"  ID: {p['id']} | Updated: {p['updated_at']}")
        lines.append("")
    return _text("\n".join(lines))


async def _handle_wiki_health_check(
    arguments: dict[str, Any],  # noqa: ARG001
) -> list[TextContent]:
    """Execute wiki_health_check."""
    from stdb_client import sql_query, get_circuit_breaker
    from config import STDB_SQL_URL, STDB_TIMEOUT_S, STDB_MAX_RETRIES

    cb = get_circuit_breaker()
    corr_id = get_correlation_id()

    # Try a simple query to test connectivity under the concurrency semaphore
    db_status = "unknown"
    query_time_ms = 0
    try:
        start = time.monotonic()
        await _with_concurrency(sql_query("SELECT 1 as test"))
        query_time_ms = int((time.monotonic() - start) * 1000)
        db_status = "healthy"
    except Exception as e:
        db_status = f"unhealthy: {e}"
        logger.warning(
            "Health check DB query failed: %s (correlation_id=%s)",
            e, corr_id,
        )

    health = {
        "status": "healthy" if db_status == "healthy" else "degraded",
        "timestamp": int(time.time()),
        "correlation_id": get_correlation_id(),
        "database": {
            "status": db_status,
            "query_time_ms": query_time_ms,
            "sql_url": STDB_SQL_URL,
            "timeout_s": STDB_TIMEOUT_S,
            "max_retries": STDB_MAX_RETRIES,
        },
        "circuit_breaker": {
            "state": cb.state.value,
            "failure_count": cb._failure_count,
            "last_failure_time": cb._last_failure_time,
        },
        "rate_limit": {
            "requests_per_minute": RATE_LIMIT_REQUESTS,
            "window_seconds": RATE_LIMIT_WINDOW,
        },
    }

    return _text(json.dumps(health, indent=2))


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


# ─── Tool registry ────────────────────────────────────────────────────────────


_TOOL_HANDLERS: dict[str, Any] = {
    "wiki_search": _handle_wiki_search,
    "wiki_read_page": _handle_wiki_read_page,
    "wiki_list_collections": _handle_wiki_list_collections,
    "wiki_list_pages": _handle_wiki_list_pages,
    "wiki_get_backlinks": _handle_wiki_get_backlinks,
    "wiki_get_linked_pages": _handle_wiki_get_linked_pages,
    "wiki_health_check": _handle_wiki_health_check,
}


@app.call_tool()
async def call_tool(name: str, arguments: dict) -> list[TextContent]:
    """Dispatch tool calls to per-handler functions with uniform error handling.

    Every tool handler is wrapped in a top-level try/except so that unexpected
    exceptions (serialization errors, logic bugs) always produce a user-facing
    error instead of a cryptic MCP protocol failure.
    """
    set_request_id(uuid.uuid4().hex[:12])
    corr_id = get_correlation_id()

    logger.info(
        "Tool call: %s (correlation_id=%s)", name, corr_id
    )

    if not isinstance(arguments, dict):
        return _error_response(
            MCPErrorCode.VALIDATION_ERROR,
            f"Arguments must be a dict, got {type(arguments).__name__}",
        )

    # Rate limiting
    client_id = _get_client_id(arguments)
    if not _check_rate_limit(client_id):
        logger.warning(
            "Rate limit exceeded for client %s (correlation_id=%s)",
            client_id, corr_id
        )
        return _error_response(
            MCPErrorCode.RATE_LIMITED,
            f"Rate limit exceeded ({RATE_LIMIT_REQUESTS} requests/minute)",
            {"client_id": client_id},
        )

    handler = _TOOL_HANDLERS.get(name)
    if not handler:
        return _error_response(
            MCPErrorCode.VALIDATION_ERROR,
            f"Unknown tool: {name}",
            {"available_tools": list(_TOOL_HANDLERS.keys())},
        )

    try:
        # Apply timeout to tool execution
        return await _with_timeout(handler(arguments))
    except TimeoutError as e:
        logger.error(
            "Tool %s timed out (correlation_id=%s): %s", name, corr_id, e
        )
        return _error_response(
            MCPErrorCode.TIMEOUT,
            str(e),
            {"tool": name},
        )
    except (ValueError, TypeError) as e:
        # User-facing validation errors
        return _tool_error(name, e, context="validation")
    except Exception as e:
        # Internal / unexpected errors
        return _tool_error(name, e, context="internal")


# ─── Graceful shutdown event ────────────────────────────────────────────────

_shutdown_event = asyncio.Event()


def _handle_signal() -> None:
    """Trigger graceful shutdown on SIGTERM/SIGINT."""
    logger.warning("Received shutdown signal — stopping server...")
    _shutdown_event.set()


async def _wait_for_shutdown() -> None:
    """Wait for the shutdown event, then exit.

    This task runs alongside the MCP server and triggers an orderly
    stop when the process receives SIGTERM or SIGINT. The MCP server's
    stdio transport will be closed by the server when it detects the
    cancellation via TaskGroup cancellation propagation.
    """
    await _shutdown_event.wait()
    logger.info("Shutting down gracefully...")
    # Raising a CancelledError or just returning will propagate through
    # the TaskGroup and cause the MCP server task to be cancelled too.
    # We sleep briefly to allow the MCP server to finish its current
    # request before cancellation.
    await asyncio.sleep(0.5)


# ─── Entry point ────────────────────────────────────────────────────────────────


def main() -> None:
    """Run the MCP server on stdio transport."""
    from mcp.server.stdio import stdio_server

    # Configure logging — output goes to stderr so it doesn't interfere
    # with stdio MCP transport
    logging.basicConfig(
        level=logging.INFO,
        format=(
            "%(asctime)s [%(levelname)s] %(name)s "
            "[correlation_id=%(correlation_id)s]: %(message)s"
        ),
        stream=sys.stderr,
    )
    logger.info("Starting SpacetimeWiki MCP server...")

    # Add correlation ID filter to logging
    class CorrelationIdFilter(logging.Filter):
        def filter(self, record):
            record.correlation_id = get_correlation_id() or "N/A"
            return True

    logging.getLogger().addFilter(CorrelationIdFilter())

    async def _startup_check() -> None:
        """Verify STDB connectivity at startup, logging result."""
        from stdb_client import sql_query

        logger.info("Performing startup STDB connectivity check...")
        try:
            start = time.monotonic()
            result = await sql_query("SELECT 1 as test")
            elapsed = int((time.monotonic() - start) * 1000)
            if result:
                logger.info(
                    "Startup STDB check PASSED (%d rows, %dms)",
                    len(result), elapsed,
                )
            else:
                logger.warning(
                    "Startup STDB check returned empty (likely unreachable)"
                )
        except Exception as e:
            logger.warning(
                "Startup STDB check FAILED: %s — "
                "circuit breaker will manage retries", e,
            )

    async def run() -> None:
        await _startup_check()

        # Register signal handlers for graceful shutdown
        loop = asyncio.get_running_loop()
        for sig in (signal.SIGTERM, signal.SIGINT):
            loop.add_signal_handler(sig, _handle_signal)

        async with stdio_server() as (read_stream, write_stream):
            # Use a task group so we can run both the MCP server and
            # the shutdown monitor concurrently
            async with asyncio.TaskGroup() as tg:
                tg.create_task(
                    app.run(
                        read_stream,
                        write_stream,
                        app.create_initialization_options(),
                    )
                )
                tg.create_task(_wait_for_shutdown())

    asyncio.run(run())


if __name__ == "__main__":
    main()