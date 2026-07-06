"""SpacetimeDB HTTP client — SQL queries for the MCP server.

Uses parameterized SQL with ``_safe_quote`` for injection safety.
Includes retry logic with exponential backoff for STDB network failures.
"""

import asyncio
import json
import logging
from typing import Any

import httpx

from config import (
    STDB_BASE_URL,
    STDB_DATABASE,
    STDB_SQL_URL,
    STDB_TIMEOUT_S,
    STDB_MAX_RETRIES,
    STDB_BASE_DELAY_S,
)

logger = logging.getLogger("spacetime-wiki-mcp.stdb_client")

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


# ─── Retry wrapper ───────────────────────────────────────────────────────────


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

    for attempt in range(1, STDB_MAX_RETRIES + 1):
        attempts_made = attempt
        try:
            async with httpx.AsyncClient(timeout=STDB_TIMEOUT_S) as client:
                resp = await client.post(
                    STDB_SQL_URL,
                    content=sql,
                    headers={"Content-Type": "text/plain"},
                )
                if resp.status_code >= 400:
                    detail = resp.text[:500]
                    raise RuntimeError(
                        f"STDB SQL error ({resp.status_code}): {detail}"
                    )
                data = resp.json()
                # STDB returns [{"rows": [...]}] or [{"rows": ...}] per table
                if isinstance(data, list) and data:
                    return data[0].get("rows", [])
                return []

        except httpx.TimeoutException as e:
            logger.warning(
                "STDB timeout attempt %d/%d: %s",
                attempt, STDB_MAX_RETRIES, e,
            )
            last_exception = e
            if attempt < STDB_MAX_RETRIES:
                delay = STDB_BASE_DELAY_S * (2.0 ** (attempt - 1))
                logger.info("Retrying in %.1fs...", delay)
                await asyncio.sleep(delay)

        except httpx.TransportError as e:
            logger.warning(
                "STDB transport error attempt %d/%d: %s",
                attempt, STDB_MAX_RETRIES, e,
            )
            last_exception = e
            if attempt < STDB_MAX_RETRIES:
                delay = STDB_BASE_DELAY_S * (2.0 ** (attempt - 1))
                logger.info("Retrying in %.1fs...", delay)
                await asyncio.sleep(delay)

        except httpx.HTTPStatusError as e:
            # Non-2xx that httpx raised as an exception (shouldn't happen with
            # our manual status check, but belt-and-braces)
            logger.warning(
                "STDB HTTP error attempt %d/%d: %s",
                attempt, STDB_MAX_RETRIES, e,
            )
            last_exception = e
            if attempt < STDB_MAX_RETRIES:
                delay = STDB_BASE_DELAY_S * (2.0 ** (attempt - 1))
                logger.info("Retrying in %.1fs...", delay)
                await asyncio.sleep(delay)

        except json.JSONDecodeError as e:
            logger.error(
                "STDB returned non-JSON response attempt %d/%d: %s",
                attempt, STDB_MAX_RETRIES, e,
            )
            last_exception = e
            # Non-retriable — response format is broken, pointless to retry
            break

        except RuntimeError:
            # Our own raised errors (>=400, structural) — re-raise immediately
            raise

    # All retries exhausted or non-retriable error
    logger.error(
        "STDB query failed after %d attempt(s): %s — returning empty result",
        attempts_made, last_exception,
    )
    return []


# ─── Public query helper ─────────────────────────────────────────────────────


async def sql_query(sql: str, *args: object) -> list[list]:
    """Execute a parameterized SQL query against STDB and return rows as arrays.

    When no placeholders are needed, pass the SQL string directly.

    On total STDB failure after all retries, returns an empty list instead of
    crashing — callers should check for empty results.
    """
    final_sql = _build_safe_sql(sql, *args) if args else sql
    logger.debug("STDB query: %s", _truncate_log(final_sql))
    return await _execute_with_retry(final_sql)


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


async def search_pages(query: str, limit: int = 20) -> list[dict]:
    """Full-text search across page titles and content.

    Raises ``ValueError`` for invalid input.
    """
    q = _validate_non_empty_string(query, "query")
    limit = _clamp_int(limit, "limit", 20, 1, 50)
    rows = await sql_query("SELECT * FROM page WHERE status != 'deleted'")
    q_lower = q.lower()
    filtered = []
    for r in rows:
        page = map_page(r)
        if q_lower in page["title"].lower() or q_lower in page["text_content"].lower():
            filtered.append(page)
    return filtered[:limit]


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


async def list_collections() -> list[dict]:
    """List all collections."""
    rows = await sql_query("SELECT * FROM collection")
    return [map_collection(r) for r in rows]


async def list_pages(collection_id: str | None = None, limit: int = 50) -> list[dict]:
    """List pages, optionally filtered by collection.

    Raises ``ValueError`` for invalid *collection_id*.
    """
    limit = _clamp_int(limit, "limit", 50, 1, 100)
    if collection_id:
        _validate_id(collection_id, "collection_id")
        rows = await sql_query(
            "SELECT * FROM page WHERE collection_id = ? AND status != 'deleted'",
            collection_id,
        )
    else:
        rows = await sql_query(
            "SELECT * FROM page WHERE status != 'deleted'"
        )
    return [map_page(r) for r in rows[:limit]]


async def get_backlinks(page_id: str, limit: int = 20) -> list[dict]:
    """Find pages that link to the given page by searching for its ID in text_content.

    Raises ``ValueError`` for invalid *page_id*.
    """
    _validate_id(page_id, "page_id")
    limit = _clamp_int(limit, "limit", 20, 1, 50)
    rows = await sql_query(
        "SELECT * FROM page WHERE status != 'deleted' AND id != ? AND text_content LIKE ?",
        page_id,
        f"%{page_id}%",
    )
    return [map_page(r) for r in rows[:limit]]


async def list_page_tags(page_id: str) -> list[dict]:
    """List tags for a specific page.

    Raises ``ValueError`` for invalid *page_id*.
    """
    _validate_id(page_id, "page_id")
    rows = await sql_query("SELECT * FROM page_tag WHERE page_id = ?", page_id)
    return [map_tag(r) for r in rows]


async def get_linked_pages(page_id: str, limit: int = 20) -> list[dict]:
    """Find pages referenced via internal links in other pages' text_content.

    Raises ``ValueError`` for invalid *page_id*.
    """
    _validate_id(page_id, "page_id")
    limit = _clamp_int(limit, "limit", 20, 1, 50)
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
    )
    rows = await sql_query(sql, page_id, *args)
    return [map_page(r) for r in rows[:limit]]
