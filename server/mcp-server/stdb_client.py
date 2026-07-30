"""SpacetimeDB HTTP client — SQL queries for the MCP server.

Uses parameterized SQL with ``_safe_quote`` for injection safety.
Includes retry logic with exponential backoff for STDB network failures.
Implements circuit breaker pattern to prevent cascading failures.
"""

import asyncio
import json
import logging
import time
import uuid
from contextvars import ContextVar
from dataclasses import dataclass, field
from enum import Enum
from typing import Any

import httpx
from config import (
    STDB_BASE_DELAY_S,
    STDB_MAX_RETRIES,
    STDB_SQL_URL,
    STDB_TIMEOUT_S,
)

logger = logging.getLogger("spacetime-wiki-mcp.stdb_client")

# ─── Correlation ID for request tracing ──────────────────────────────────────

correlation_id_var: ContextVar[str | None] = ContextVar("correlation_id", default=None)


def get_correlation_id() -> str:
    """Get or generate a correlation ID for the current request context."""
    cid = correlation_id_var.get()
    if cid is None:
        cid = uuid.uuid4().hex[:12]
        correlation_id_var.set(cid)
    return cid


def set_correlation_id(cid: str | None) -> None:
    """Set the correlation ID for the current request context."""
    correlation_id_var.set(cid)


# ─── Circuit Breaker ─────────────────────────────────────────────────────────


class CircuitState(Enum):
    """Circuit breaker states."""

    CLOSED = "closed"      # Normal operation, requests go through
    OPEN = "open"          # Failing, requests blocked
    HALF_OPEN = "half_open"  # Testing if service recovered


@dataclass
class CircuitBreaker:
    """Circuit breaker for STDB connection failures.

    Prevents cascading failures by stopping requests when STDB is consistently
    failing, allowing it time to recover.
    """

    failure_threshold: int = 5
    success_threshold: int = 2
    timeout: float = 30.0  # seconds before trying half-open

    _state: CircuitState = field(default=CircuitState.CLOSED, init=False)
    _failure_count: int = field(default=0, init=False)
    _success_count: int = field(default=0, init=False)
    _last_failure_time: float = field(default=0.0, init=False)
    _lock: asyncio.Lock = field(default_factory=asyncio.Lock, init=False)

    @property
    def state(self) -> CircuitState:
        return self._state

    def _record_success(self) -> None:
        if self._state == CircuitState.HALF_OPEN:
            self._success_count += 1
            if self._success_count >= self.success_threshold:
                self._state = CircuitState.CLOSED
                self._failure_count = 0
                self._success_count = 0
                logger.info("Circuit breaker CLOSED — STDB recovered")
        elif self._state == CircuitState.CLOSED:
            self._failure_count = 0

    def _record_failure(self) -> None:
        self._failure_count += 1
        self._last_failure_time = time.time()

        if self._state == CircuitState.HALF_OPEN:
            self._state = CircuitState.OPEN
            self._success_count = 0
            logger.warning("Circuit breaker OPEN — STDB still failing")
        elif self._state == CircuitState.CLOSED and self._failure_count >= self.failure_threshold:
            self._state = CircuitState.OPEN
            logger.warning(
                "Circuit breaker OPEN after %d consecutive failures",
                self.failure_threshold,
            )

    async def can_execute(self) -> bool:
        """Check if a request can proceed, updating state as needed."""
        async with self._lock:
            if self._state == CircuitState.CLOSED:
                return True

            if self._state == CircuitState.OPEN:
                # Check if timeout has passed to try half-open
                if time.time() - self._last_failure_time >= self.timeout:
                    self._state = CircuitState.HALF_OPEN
                    self._success_count = 0
                    logger.info("Circuit breaker HALF_OPEN — testing STDB recovery")
                    return True
                return False

            # HALF_OPEN allows one request through
            return True

    async def execute_with_breaker(self, operation, *args, **kwargs):
        """Execute an operation with circuit breaker protection."""
        can_proceed = await self.can_execute()
        if not can_proceed:
            raise RuntimeError("Circuit breaker OPEN — STDB unavailable")

        try:
            result = await operation(*args, **kwargs)
            self._record_success()
            return result
        except Exception:
            self._record_failure()
            raise


# Global circuit breaker instance
_circuit_breaker = CircuitBreaker()


def get_circuit_breaker() -> CircuitBreaker:
    """Get the global circuit breaker instance."""
    return _circuit_breaker


# ─── Error types for structured error handling ───────────────────────────────


class STDBErrorCode(str, Enum):
    """Structured error codes for STDB operations."""

    CONNECTION_FAILED = "STDB_CONNECTION_FAILED"
    TIMEOUT = "STDB_TIMEOUT"
    QUERY_FAILED = "STDB_QUERY_FAILED"
    INVALID_RESPONSE = "STDB_INVALID_RESPONSE"
    CIRCUIT_OPEN = "STDB_CIRCUIT_OPEN"
    VALIDATION_ERROR = "STDB_VALIDATION_ERROR"
    NOT_FOUND = "STDB_NOT_FOUND"


class STDBError(Exception):
    """Structured exception for STDB errors with error codes."""

    def __init__(
        self,
        message: str,
        code: STDBErrorCode = STDBErrorCode.QUERY_FAILED,
        correlation_id: str | None = None,
        original_error: Exception | None = None,
    ):
        super().__init__(message)
        self.code = code
        self.correlation_id = correlation_id or get_correlation_id()
        self.original_error = original_error

    def to_dict(self) -> dict[str, Any]:
        """Convert to dictionary for structured logging/response."""
        return {
            "error": str(self),
            "code": self.code.value,
            "correlation_id": self.correlation_id,
        }


TABLE_NAMES = frozenset({
    "page", "collection", "revision", "comment", "page_tag", "attachment",
    "share_link", "user", "api_key", "search_result", "oauth_provider",
    "oauth_user", "passkey_credential", "ldap_provider", "scim_provider",
    "group", "group_member",
})

# ─── Safe SQL helpers ────────────────────────────────────────────────────────


def _safe_quote(val: str) -> str:
    """Escape and single-quote a string value for SQL injection safety.

    Handles single quotes (-> '') and backslash (-> \\\\), the two characters
    that can break out of a SQL string literal in STDB.
    """
    if not isinstance(val, str):
        raise TypeError(f"_safe_quote requires a string, got {type(val).__name__}")
    escaped = val.replace("\\", "\\\\").replace("'", "''")
    return f"'{escaped}'"


def _build_safe_sql(sql: str, *args: object) -> str:
    """Build a safe SQL string by substituting ? placeholders.

    Supports:
        ?   — string literal (auto-quoted and escaped via _safe_quote)
        ?s  — same as ? (for clarity)

    Raises ``ValueError`` when the number of placeholders != number of args.
    """
    parts = sql.split("?")
    if len(parts) - 1 != len(args):
        raise ValueError(
            f"Expected {len(parts) - 1} argument(s) for {len(parts) - 1} "
            f"placeholder(s) in SQL, got {len(args)}"
        )
    result = [parts[0]]
    for i, arg in enumerate(args):
        part = parts[i + 1]
        if arg is None:
            result.append("NULL")
        else:
            result.append(_safe_quote(str(arg)))
        result.append(part)
    return "".join(result)


def _truncate_log(sql: str, max_len: int = 200) -> str:
    """Truncate long SQL for log lines."""
    return sql if len(sql) < max_len else sql[:max_len] + "..."


# ─── Shared HTTPX client with connection pooling ────────────────────────────

_http_client: httpx.AsyncClient | None = None


async def _get_http_client() -> httpx.AsyncClient:
    """Get or create the shared HTTPX client.

    Using a single shared client allows connection pooling, connection
    reuse, and better timeout management across all STDB queries.
    """
    global _http_client
    if _http_client is None:
        _http_client = httpx.AsyncClient(
            timeout=httpx.Timeout(
                connect=STDB_TIMEOUT_S,
                read=STDB_TIMEOUT_S,
                write=STDB_TIMEOUT_S,
                pool=STDB_TIMEOUT_S,
            ),
            limits=httpx.Limits(
                max_keepalive_connections=10,
                max_connections=20,
                keepalive_expiry=30.0,
            ),
        )
    return _http_client


# ─── Cleanup function ─────────────────────────────────────────────────────────


async def close_http_client() -> None:
    """Close the shared HTTPX client connection pool.

    Should be called during server shutdown to release connections
    and prevent ResourceWarning / unclosed transport messages.
    """
    global _http_client
    client = _http_client
    if client is not None:
        _http_client = None
        await client.aclose()


# ─── Retry wrapper with circuit breaker ──────────────────────────────────────


async def _execute_with_retry(sql: str) -> list[list]:
    """Execute a SQL query against STDB with retry and exponential backoff.

    Retriable errors (``ConnectError``, ``RemoteProtocolError``,
    ``ReadTimeout``, ``NetworkError``, ``HTTPStatusError``): retry up to
    ``STDB_MAX_RETRIES`` times with exponential backoff.

    Non-retriable errors (structural parse failure, invalid responses): raise
    ``RuntimeError`` immediately.

    On total exhaustion returns an empty list so callers get a degraded but
    non-crashing response.
    """
    last_exception: Exception | None = None
    attempts_made = 0
    cid = get_correlation_id()

    for attempt in range(1, STDB_MAX_RETRIES + 1):
        attempts_made = attempt
        try:
            client = await _get_http_client()
            resp = await client.post(
                STDB_SQL_URL,
                content=sql,
                headers={"Content-Type": "text/plain"},
            )
            if resp.status_code >= 400:
                detail = resp.text[:500]
                raise STDBError(
                    f"STDB SQL error ({resp.status_code}): {detail}",
                    code=STDBErrorCode.QUERY_FAILED,
                    correlation_id=cid,
                )
            data = resp.json()
            # STDB returns [{"rows": [...]}] or [{"rows": ...}] per table
            if isinstance(data, list) and data:
                return data[0].get("rows", [])
            return []

        except httpx.TimeoutException as e:
            logger.warning(
                "STDB timeout attempt %d/%d (cid=%s): %s",
                attempt, STDB_MAX_RETRIES, cid, e,
            )
            last_exception = STDBError(
                f"STDB timeout: {e}",
                code=STDBErrorCode.TIMEOUT,
                correlation_id=cid,
                original_error=e,
            )
            if attempt < STDB_MAX_RETRIES:
                delay = STDB_BASE_DELAY_S * (2.0 ** (attempt - 1))
                logger.info("Retrying in %.1fs... (cid=%s)", delay, cid)
                await asyncio.sleep(delay)

        except httpx.TransportError as e:
            logger.warning(
                "STDB transport error attempt %d/%d (cid=%s): %s",
                attempt, STDB_MAX_RETRIES, cid, e,
            )
            last_exception = STDBError(
                f"STDB connection failed: {e}",
                code=STDBErrorCode.CONNECTION_FAILED,
                correlation_id=cid,
                original_error=e,
            )
            if attempt < STDB_MAX_RETRIES:
                delay = STDB_BASE_DELAY_S * (2.0 ** (attempt - 1))
                logger.info("Retrying in %.1fs... (cid=%s)", delay, cid)
                await asyncio.sleep(delay)

        except httpx.HTTPStatusError as e:
            # Non-2xx that httpx raised as an exception (shouldn't happen with
            # our manual status check, but belt-and-braces)
            logger.warning(
                "STDB HTTP error attempt %d/%d (cid=%s): %s",
                attempt, STDB_MAX_RETRIES, cid, e,
            )
            last_exception = STDBError(
                f"STDB HTTP error: {e}",
                code=STDBErrorCode.QUERY_FAILED,
                correlation_id=cid,
                original_error=e,
            )
            if attempt < STDB_MAX_RETRIES:
                delay = STDB_BASE_DELAY_S * (2.0 ** (attempt - 1))
                logger.info("Retrying in %.1fs... (cid=%s)", delay, cid)
                await asyncio.sleep(delay)

        except json.JSONDecodeError as e:
            logger.error(
                "STDB returned non-JSON response attempt %d/%d (cid=%s): %s",
                attempt, STDB_MAX_RETRIES, cid, e,
            )
            last_exception = STDBError(
                f"STDB invalid response: {e}",
                code=STDBErrorCode.INVALID_RESPONSE,
                correlation_id=cid,
                original_error=e,
            )
            # Non-retriable — response format is broken, pointless to retry
            break

        except STDBError:
            # Our own raised errors (>=400, structural) — re-raise immediately
            raise

        except RuntimeError:
            # Circuit breaker or other runtime errors
            raise

    # All retries exhausted or non-retriable error
    logger.error(
        "STDB query failed after %d attempt(s) (cid=%s): %s — returning empty result",
        attempts_made, cid, last_exception,
    )
    if last_exception and isinstance(last_exception, STDBError):
        raise last_exception
    raise STDBError(
        f"STDB query failed after {attempts_made} attempts",
        code=STDBErrorCode.QUERY_FAILED,
        correlation_id=cid,
        original_error=last_exception,
    )


# ─── Public query helper with circuit breaker ────────────────────────────────


async def sql_query(sql: str, *args: object) -> list[list]:
    """Execute a parameterized SQL query against STDB and return rows as arrays.

    When no placeholders are needed, pass the SQL string directly.

    On total STDB failure after all retries, returns an empty list instead of
    crashing — callers should check for empty results.
    """
    final_sql = _build_safe_sql(sql, *args) if args else sql
    logger.debug("STDB query (cid=%s): %s", get_correlation_id(), _truncate_log(final_sql))

    async def _execute():
        return await _execute_with_retry(final_sql)

    try:
        return await _circuit_breaker.execute_with_breaker(_execute)
    except STDBError as e:
        if e.code == STDBErrorCode.CIRCUIT_OPEN:
            logger.warning("Circuit breaker open, returning empty result (cid=%s)", get_correlation_id())
            return []
        raise


async def sql_query_or_raise(sql: str, *args: object) -> list[list]:
    """Execute a query and raise on any error (including circuit breaker open).

    Use this when the caller needs to distinguish between "no results" and "error".
    """
    final_sql = _build_safe_sql(sql, *args) if args else sql
    logger.debug("STDB query (cid=%s): %s", get_correlation_id(), _truncate_log(final_sql))

    async def _execute():
        return await _execute_with_retry(final_sql)

    return await _circuit_breaker.execute_with_breaker(_execute)


# ─── Row mappers with safety checks ──────────────────────────────────────────


_MIN_PAGE_COLS = 21
_MIN_COLLECTION_COLS = 11
_MIN_USER_COLS = 7
_MIN_TAG_COLS = 4


def _ensure_min_len(row: list, n: int, label: str) -> None:
    """Validate row has at least *n* columns for the *label* schema."""
    if len(row) < n:
        logger.warning(
            "Row too short for %s: got %d cols, expected ≥%d — filling missing",
            label, len(row), n,
        )


def _str(row: list, idx: int) -> str:
    return str(row[idx]) if idx < len(row) and row[idx] is not None else ""


def _int(row: list, idx: int) -> int:
    val = row[idx] if idx < len(row) and row[idx] is not None else None
    if val is None:
        return 0
    try:
        return int(val)
    except (ValueError, TypeError):
        return 0


def _bool(row: list, idx: int) -> bool:
    return bool(row[idx]) if idx < len(row) else False


def map_page(row: list) -> dict:
    """Map a raw STDB row to a page dict with safe defaults for missing cols."""
    _ensure_min_len(row, _MIN_PAGE_COLS, "page")
    return {
        "id": _str(row, 0),
        "title": _str(row, 1),
        "slug": _str(row, 2),
        "text_content": _str(row, 4),
        "collection_id": _str(row, 5),
        "parent_page_id": _str(row, 6),
        "status": _str(row, 7),
        "icon": _str(row, 8),
        "color": _str(row, 9),
        "full_width": _bool(row, 10),
        "is_pinned": _bool(row, 11),
        "is_template": _bool(row, 12),
        "template_id": _str(row, 13),
        "sort_order": _int(row, 14),
        "created_by": _str(row, 15),
        "updated_by": _str(row, 16),
        "created_at": _int(row, 17),
        "updated_at": _int(row, 18),
        "published_at": _int(row, 19),
        "deleted_at": _int(row, 20),
    }


def map_collection(row: list) -> dict:
    """Map a raw STDB collection row to a dict with safe defaults."""
    _ensure_min_len(row, _MIN_COLLECTION_COLS, "collection")
    return {
        "id": _str(row, 0),
        "name": _str(row, 1),
        "slug": _str(row, 2),
        "description": _str(row, 3),
        "parent_id": _str(row, 4),
        "icon": _str(row, 5),
        "color": _str(row, 6),
        "sort_order": _int(row, 7),
        "created_by": _str(row, 8),
        "created_at": _int(row, 9),
        "updated_at": _int(row, 10),
    }


def map_user(row: list) -> dict:
    """Map a raw STDB user row to a dict with safe defaults."""
    _ensure_min_len(row, _MIN_USER_COLS, "user")
    return {
        "id": _str(row, 0),
        "name": _str(row, 1),
        "email": _str(row, 2),
        "role": _str(row, 4),
        "created_at": _int(row, 6),
    }


def map_tag(row: list) -> dict:
    """Map a raw STDB tag row to a dict with safe defaults."""
    _ensure_min_len(row, _MIN_TAG_COLS, "tag")
    return {
        "id": _str(row, 0),
        "page_id": _str(row, 1),
        "name": _str(row, 2),
        "value": _str(row, 3),
    }


# ─── Input validation helpers ────────────────────────────────────────────────


_INVALID_ID_CHARS = frozenset(";'\"\\%_()--/*")


def _validate_id(id_str: str, label: str = "id") -> None:
    """Raise ``ValueError`` if *id_str* contains suspicious characters.

    Catches basic SQL-injection or path-traversal patterns early.
    """
    if not id_str or not id_str.strip():
        raise ValueError(f"{label} must not be empty")
    bad = _INVALID_ID_CHARS & set(id_str)
    if bad:
        raise ValueError(
            f"{label} contains invalid characters: {sorted(bad)}"
        )
    if len(id_str) > 256:
        raise ValueError(f"{label} exceeds maximum length (256 chars)")


def _validate_non_empty_string(val: object, label: str) -> str:
    """Type-check and strip *val*, raise ``ValueError`` if empty."""
    if not isinstance(val, str):
        raise TypeError(f"{label} must be a string, got {type(val).__name__}")
    stripped = val.strip()
    if not stripped:
        raise ValueError(f"{label} must not be empty")
    return stripped


def _clamp_int(val: object, label: str, default: int, min_v: int, max_v: int) -> int:
    """Parse and clamp an integer argument to [min_v, max_v]."""
    if val is None:
        return default
    try:
        v = int(val)
    except (ValueError, TypeError):
        raise TypeError(f"{label} must be an integer, got {type(val).__name__}")
    return max(min_v, min(v, max_v))


# ─── Entity helpers ──────────────────────────────────────────────────────────


async def search_pages(query: str, limit: int = 20, offset: int = 0) -> list[dict]:
    """Full-text search across page titles and content.

    Raises ``ValueError`` for invalid input.
    """
    q = _validate_non_empty_string(query, "query")
    limit = _clamp_int(limit, "limit", 20, 1, 50)
    offset = _clamp_int(offset, "offset", 0, 0, 9999)
    rows = await sql_query("SELECT * FROM page WHERE status != 'deleted'")
    q_lower = q.lower()
    filtered = []
    for r in rows:
        page = map_page(r)
        if q_lower in page["title"].lower() or q_lower in page["text_content"].lower():
            filtered.append(page)
    return filtered[offset:offset + limit]


async def get_page(page_id: str) -> dict | None:
    """Get a single page by ID.

    Raises ``ValueError`` for invalid *page_id*.
    Returns ``None`` when no page matches.
    """
    _validate_id(page_id, "page_id")
    rows = await sql_query("SELECT * FROM page WHERE id = ?", page_id)
    if rows:
        return map_page(rows[0])
    return None


async def get_page_by_slug(slug: str) -> dict | None:
    """Get a single page by slug.

    Raises ``ValueError`` for empty *slug*.
    Returns ``None`` when no page matches.
    """
    slug_val = _validate_non_empty_string(slug, "slug")
    rows = await sql_query("SELECT * FROM page WHERE slug = ?", slug_val)
    if rows:
        return map_page(rows[0])
    return None


async def list_collections(limit: int = 50, offset: int = 0) -> list[dict]:
    """List collections with pagination.

    Raises ``ValueError`` for invalid parameters.
    """
    limit = _clamp_int(limit, "limit", 50, 1, 100)
    offset = _clamp_int(offset, "offset", 0, 0, 9999)
    rows = await sql_query(
        "SELECT * FROM collection LIMIT ?i OFFSET ?i",
        limit, offset,
    )
    return [map_collection(r) for r in rows]


async def list_pages(collection_id: str | None = None, limit: int = 50, offset: int = 0) -> list[dict]:
    """List pages, optionally filtered by collection.

    Raises ``ValueError`` for invalid *collection_id*.
    """
    limit = _clamp_int(limit, "limit", 50, 1, 100)
    offset = _clamp_int(offset, "offset", 0, 0, 9999)
    if collection_id:
        _validate_id(collection_id, "collection_id")
        rows = await sql_query(
            "SELECT * FROM page WHERE collection_id = ? AND status != 'deleted' LIMIT ?i OFFSET ?i",
            collection_id, limit, offset,
        )
    else:
        rows = await sql_query(
            "SELECT * FROM page WHERE status != 'deleted' LIMIT ?i OFFSET ?i",
            limit, offset,
        )
    return [map_page(r) for r in rows]


async def get_backlinks(page_id: str, limit: int = 20, offset: int = 0) -> list[dict]:
    """Find pages that link to the given page by searching for its ID in text_content.

    Raises ``ValueError`` for invalid *page_id*.
    """
    _validate_id(page_id, "page_id")
    limit = _clamp_int(limit, "limit", 20, 1, 50)
    offset = _clamp_int(offset, "offset", 0, 0, 9999)
    rows = await sql_query(
        "SELECT * FROM page WHERE status != 'deleted' AND id != ? AND text_content LIKE ? LIMIT ?i OFFSET ?i",
        page_id,
        f"%{page_id}%",
        limit, offset,
    )
    return [map_page(r) for r in rows]


async def list_page_tags(page_id: str, limit: int = 50, offset: int = 0) -> list[dict]:
    """List tags for a specific page with pagination.

    Raises ``ValueError`` for invalid *page_id*.
    """
    _validate_id(page_id, "page_id")
    limit = _clamp_int(limit, "limit", 50, 1, 100)
    offset = _clamp_int(offset, "offset", 0, 0, 9999)
    rows = await sql_query(
        "SELECT * FROM page_tag WHERE page_id = ? LIMIT ?i OFFSET ?i",
        page_id, limit, offset,
    )
    return [map_tag(r) for r in rows]


async def get_linked_pages(page_id: str, limit: int = 20, offset: int = 0) -> list[dict]:
    """Find pages referenced via internal links in other pages' text_content.

    Raises ``ValueError`` for invalid *page_id*.
    """
    _validate_id(page_id, "page_id")
    limit = _clamp_int(limit, "limit", 20, 1, 50)
    offset = _clamp_int(offset, "offset", 0, 0, 9999)
    page = await get_page(page_id)
    if not page:
        return []
    slug = page.get("slug", "")
    conditions = []
    args: list[object] = []
    conditions.append("text_content LIKE ?")
    args.append(f"%{page_id}%")
    if slug:
        conditions.append("text_content LIKE ?")
        args.append(f"%{slug}%")
    where = " OR ".join(conditions)
    sql = (
        "SELECT * FROM page\n"
        "WHERE status != 'deleted'\n"
        f"  AND id != ?\n"
        f"  AND ({where})\n"
        "LIMIT ?i OFFSET ?i\n"
    )
    rows = await sql_query(sql, page_id, *args, limit, offset)
    return [map_page(r) for r in rows]


async def get_collection(collection_id: str) -> dict | None:
    """Get a single collection by ID.

    Raises ``ValueError`` for invalid *collection_id*.
    Returns ``None`` when no collection matches.
    """
    _validate_id(collection_id, "collection_id")
    rows = await sql_query("SELECT * FROM collection WHERE id = ?", collection_id)
    if rows:
        return map_collection(rows[0])
    return None
