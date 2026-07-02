"""SpacetimeDB HTTP client — SQL queries for the MCP server.

Uses parameterized SQL with _safe_quote for injection safety.
Includes retry logic with exponential backoff for STDB network failures.
"""

import asyncio
import logging
import httpx
from config import STDB_HOST, STDB_DATABASE

logger = logging.getLogger("spacetime-wiki-mcp.stdb_client")

TABLE_NAMES = frozenset({
    "page", "collection", "revision", "comment", "page_tag", "attachment",
    "share_link", "user", "api_key", "search_result", "oauth_provider",
    "oauth_user", "passkey_credential", "ldap_provider", "scim_provider",
    "group", "group_member",
})

# ─── Retry configuration ────────────────────────────────────────────────────

MAX_RETRIES = 3
BASE_DELAY_S = 0.5
BACKOFF_FACTOR = 2.0


# ─── Safe SQL helpers ────────────────────────────────────────────────────────

def _safe_quote(val: str) -> str:
    """Escape and single-quote a string value for SQL injection safety.

    Handles single quotes (→ '') and backslash (→ \\), the two characters
    that can break out of a SQL string literal in STDB.
    """
    if not isinstance(val, str):
        raise TypeError(f"_safe_quote requires a string, got {type(val).__name__}")
    escaped = val.replace("\\", "\\\\").replace("'", "''")
    return f"'{escaped}'"


def _build_safe_sql(sql: str, *args: object) -> str:
    """Build a safe SQL string by substituting ? placeholders.

    Supports:
        ?  — string literal (auto-quoted and escaped via _safe_quote)
        ?s — same as ? (for clarity)

    Usage:
        _build_safe_sql("SELECT * FROM page WHERE id = ?", page_id)
    """
    parts = sql.split("?")
    if len(parts) - 1 != len(args):
        raise ValueError(
            f"Expected {len(parts) - 1} argument(s) for {len(parts) - 1} "
            f"placeholder(s) in SQL, got {len(args)}"
        )
    result = [parts[0]]
    for i, arg in enumerate(args):
        # Type suffix after ? — currently only string supported
        part = parts[i + 1]

        if arg is None:
            result.append("NULL")
        else:
            result.append(_safe_quote(str(arg)))

        result.append(part)

    return "".join(result)


# ─── Retry wrapper ───────────────────────────────────────────────────────────

async def _execute_with_retry(sql: str) -> list[list]:
    """Execute a SQL query against STDB with retry and exponential backoff.

    Handles:
      - Connection refused / DNS failure (ConnectError) → retry up to 3 times
      - Timeouts (TimeoutException) → log and return empty result
      - HTTP errors (>=400) → raise RuntimeError immediately (no retry)
      - Other transport errors → retry up to 3 times

    Returns the rows as a list of arrays, or an empty list on non-fatal errors.
    """
    url = f"http://{STDB_HOST}/v1/database/{STDB_DATABASE}/sql"
    last_exception: Exception | None = None
    attempts_made = 0

    for attempt_num in range(1, MAX_RETRIES + 1):
        attempts_made = attempt_num
        try:
            async with httpx.AsyncClient(timeout=30) as client:
                resp = await client.post(
                    url,
                    content=sql,
                    headers={"Content-Type": "text/plain"},
                )
                if resp.status_code >= 400:
                    detail = resp.text[:500]
                    raise RuntimeError(f"STDB SQL error ({resp.status_code}): {detail}")
                data = resp.json()
                return (data[0] or {}).get("rows", [])

        except httpx.TimeoutException as e:
            logger.warning(
                "STDB timeout on attempt %d/%d: %s",
                attempt_num, MAX_RETRIES, str(e),
            )
            last_exception = e
            # Timeouts don't retry — log and return empty
            break

        except httpx.ConnectError as e:
            logger.warning(
                "STDB connection error on attempt %d/%d: %s",
                attempt_num, MAX_RETRIES, str(e),
            )
            last_exception = e
            if attempt_num < MAX_RETRIES:
                delay = BASE_DELAY_S * (BACKOFF_FACTOR ** (attempt_num - 1))
                logger.info("Retrying in %.1fs...", delay)
                await asyncio.sleep(delay)

        except httpx.RemoteProtocolError as e:
            logger.warning(
                "STDB protocol error on attempt %d/%d: %s",
                attempt_num, MAX_RETRIES, str(e),
            )
            last_exception = e
            if attempt_num < MAX_RETRIES:
                delay = BASE_DELAY_S * (BACKOFF_FACTOR ** (attempt_num - 1))
                logger.info("Retrying in %.1fs...", delay)
                await asyncio.sleep(delay)

        except httpx.NetworkError as e:
            logger.warning(
                "STDB network error on attempt %d/%d: %s",
                attempt_num, MAX_RETRIES, str(e),
            )
            last_exception = e
            if attempt_num < MAX_RETRIES:
                delay = BASE_DELAY_S * (BACKOFF_FACTOR ** (attempt_num - 1))
                logger.info("Retrying in %.1fs...", delay)
                await asyncio.sleep(delay)

        except httpx.HTTPStatusError as e:
            # HTTP-level error (non-2xx) that httpx raised as exception
            logger.error(
                "STDB HTTP error on attempt %d/%d: %s",
                attempt_num, MAX_RETRIES, str(e),
            )
            last_exception = e
            if attempt_num < MAX_RETRIES:
                delay = BASE_DELAY_S * (BACKOFF_FACTOR ** (attempt_num - 1))
                logger.info("Retrying in %.1fs...", delay)
                await asyncio.sleep(delay)

    # All retries exhausted, or timeout occurred
    logger.error(
        "STDB query failed after %d attempt(s): %s — returning empty result",
        attempts_made,
        last_exception,
    )
    return []


async def sql_query(sql: str, *args: object) -> list[list]:
    """Execute a parameterized SQL query against STDB and return rows as arrays.

    When no placeholders are needed, pass the SQL string directly.

    On STDB network failure, returns an empty list instead of crashing.
    """
    final_sql = _build_safe_sql(sql, *args) if args else sql

    # Truncate the SQL for logging to avoid enormous log lines
    log_sql = final_sql if len(final_sql) < 200 else final_sql[:200] + "..."
    logger.debug("STDB query: %s", log_sql)

    return await _execute_with_retry(final_sql)


# ─── Row mappers ─────────────────────────────────────────────────────────────

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
    return {
        "id": _str(row, 0), "name": _str(row, 1), "slug": _str(row, 2),
        "description": _str(row, 3), "parent_id": _str(row, 4),
        "icon": _str(row, 5), "color": _str(row, 6),
        "sort_order": _int(row, 7), "created_by": _str(row, 8),
        "created_at": _int(row, 9), "updated_at": _int(row, 10),
    }


def map_user(row: list) -> dict:
    return {
        "id": _str(row, 0), "name": _str(row, 1), "email": _str(row, 2),
        "role": _str(row, 4), "created_at": _int(row, 6),
    }


def map_tag(row: list) -> dict:
    return {
        "id": _str(row, 0), "page_id": _str(row, 1),
        "name": _str(row, 2), "value": _str(row, 3),
    }


# ─── Entity helpers ──────────────────────────────────────────────────────────

async def search_pages(query: str, limit: int = 20) -> list[dict]:
    """Full-text search across page titles and content."""
    rows = await sql_query("SELECT * FROM page WHERE status != 'deleted'")
    q = query.lower()
    filtered = []
    for r in rows:
        page = map_page(r)
        if q in page["title"].lower() or q in page["text_content"].lower():
            filtered.append(page)
    return filtered[:limit]


async def get_page(page_id: str) -> dict | None:
    """Get a single page by ID."""
    rows = await sql_query("SELECT * FROM page WHERE id = ?", page_id)
    if rows:
        return map_page(rows[0])
    return None


async def get_page_by_slug(slug: str) -> dict | None:
    """Get a single page by slug."""
    rows = await sql_query("SELECT * FROM page WHERE slug = ?", slug)
    if rows:
        return map_page(rows[0])
    return None


async def list_collections() -> list[dict]:
    """List all collections."""
    rows = await sql_query("SELECT * FROM collection")
    return [map_collection(r) for r in rows]


async def list_pages(collection_id: str | None = None, limit: int = 50) -> list[dict]:
    """List pages, optionally filtered by collection."""
    if collection_id:
        sql = "SELECT * FROM page WHERE collection_id = ? AND status != 'deleted'"
        rows = await sql_query(sql, collection_id)
    else:
        rows = await sql_query("SELECT * FROM page WHERE status != 'deleted'")
    return [map_page(r) for r in rows[:limit]]


async def get_backlinks(page_id: str, limit: int = 20) -> list[dict]:
    """Find pages that link to the given page by searching for its ID in text_content."""
    rows = await sql_query(
        "SELECT * FROM page WHERE status != 'deleted' AND id != ? AND text_content LIKE ?",
        page_id,
        f"%{page_id}%",
    )
    return [map_page(r) for r in rows[:limit]]


async def list_page_tags(page_id: str) -> list[dict]:
    """List tags for a specific page."""
    rows = await sql_query("SELECT * FROM page_tag WHERE page_id = ?", page_id)
    return [map_tag(r) for r in rows]


async def get_linked_pages(page_id: str, limit: int = 20) -> list[dict]:
    """Find pages referenced via internal links in other pages' text_content."""
    page = await get_page(page_id)
    if not page:
        return []
    slug = page.get("slug", "")
    # Search for page ID or slug references in other pages' text_content
    conditions = []
    args: list[object] = []
    conditions.append("text_content LIKE ?")
    args.append(f"%{page_id}%")
    if slug:
        conditions.append("text_content LIKE ?")
        args.append(f"%{slug}%")
    where = " OR ".join(conditions)
    sql = f"""SELECT * FROM page
WHERE status != 'deleted'
  AND id != ?
  AND ({where})
"""
    rows = await sql_query(sql, page_id, *args)
    return [map_page(r) for r in rows[:limit]]
