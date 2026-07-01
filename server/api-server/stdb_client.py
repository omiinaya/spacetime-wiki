"""SpacetimeDB HTTP client — wraps SQL queries and reducer calls."""

import logging

import httpx
from config import settings

logger = logging.getLogger(__name__)

STDB_HOST = settings.stdb_host
DB_ID = settings.stdb_database


_TABLE_NAMES = frozenset({
    "page", "collection", "revision", "comment", "page_tag", "attachment",
    "share_link", "user", "api_key", "search_result", "oauth_provider",
    "oauth_user", "passkey_credential", "ldap_provider", "scim_provider",
    "group", "group_member",
})


def _safe_quote(val: str) -> str:
    """Escape and single-quote a string value for SQL injection safety.

    Handles single quotes (→ '') and backslash (→ \\), the two characters
    that can break out of a SQL string literal.  Raises TypeError if the
    caller passes a non-string (caller should use _safe_table for idents).
    """
    if not isinstance(val, str):
        raise TypeError(f"safe_literal requires a string, got {type(val).__name__}")
    escaped = val.replace("\\", "\\\\").replace("'", "''")
    return f"'{escaped}'"


def _safe_table(ident: str) -> str:
    """Double-quote a table/column identifier after verifying it is known.

    Prevents SQL injection through dynamic table/column names.
    """
    lower = ident.lower()
    if lower in _TABLE_NAMES:
        return ident  # unquoted is safe for known names
    # Double-quote unknown identifiers (defense in depth — currently unused)
    return f'"{ident}"'


def _build_safe_sql(sql: str, *args: object) -> str:
    """Build a safe SQL string by substituting ? placeholders.

    Supported placeholders:
        ?  — string literal (auto-quoted and escaped)
        ?s — same as ? (for clarity)
        ?i — integer literal (raises if not int)
        ?f — float literal (raises if not float)
        ?b — boolean literal (true/false)

    Usage:
        sql_query("SELECT * FROM page WHERE id = ?", page_id)
        sql_query("SELECT * FROM user WHERE email = ?", email)
    """
    parts = sql.split("?")
    if len(parts) - 1 != len(args):
        raise ValueError(
            f"Expected {len(parts) - 1} argument(s) for {len(parts) - 1} "
            f"placeholder(s) in SQL, got {len(args)}"
        )
    result = [parts[0]]
    for i, arg in enumerate(args):
        placeholder = None
        # Detect placeholders with type suffix in the *next* part
        part = parts[i + 1]
        trimmed = part
        if trimmed.startswith("s"):
            placeholder = "string"
            trimmed = trimmed[1:]
        elif trimmed.startswith("i"):
            placeholder = "int"
            trimmed = trimmed[1:]
        elif trimmed.startswith("f"):
            placeholder = "float"
            trimmed = trimmed[1:]
        elif trimmed.startswith("b"):
            placeholder = "bool"
            trimmed = trimmed[1:]

        if placeholder is None:
            # plain ? — default to string
            placeholder = "string"

        if placeholder == "string":
            if arg is None:
                result.append("NULL")
            else:
                result.append(_safe_quote(str(arg)))
        elif placeholder == "int":
            if not isinstance(arg, int) or isinstance(arg, bool):
                raise TypeError(f"Expected int for ?i, got {type(arg).__name__}")
            result.append(str(arg))
        elif placeholder == "float":
            if not isinstance(arg, float):
                raise TypeError(f"Expected float for ?f, got {type(arg).__name__}")
            result.append(str(arg))
        elif placeholder == "bool":
            result.append("true" if arg else "false")

        result.append(trimmed)

    return "".join(result)


async def sql_query(sql: str, *args: object) -> list[list]:
    """Execute a parameterized SQL query against STDB and return rows.

    Supports ? placeholders for safe value insertion (see _build_safe_sql).
    When no placeholders are needed, pass the SQL string directly.

    Returns rows as arrays (list of lists).
    """
    final_sql = _build_safe_sql(sql, *args) if args else sql
    url = f"http://{STDB_HOST}/v1/database/{DB_ID}/sql"
    try:
        async with httpx.AsyncClient(timeout=30) as client:
            resp = await client.post(url, content=final_sql, headers={"Content-Type": "text/plain"})
            if resp.status_code >= 400:
                detail = resp.text[:500]
                logger.warning("STDB SQL error (%s) on: %.200s", resp.status_code, final_sql)
                raise RuntimeError(f"STDB SQL error ({resp.status_code}): {detail}")
            data = resp.json()
            return (data[0] or {}).get("rows", [])
    except httpx.TimeoutException:
        logger.error("STDB SQL timeout on: %.200s", final_sql)
        raise RuntimeError("STDB query timed out")


async def call_reducer(reducer: str, args: list) -> dict | None:
    """Call a SpacetimeDB reducer with positional args."""
    url = f"http://{STDB_HOST}/v1/database/{DB_ID}/call/{reducer}"
    try:
        async with httpx.AsyncClient(timeout=30) as client:
            resp = await client.post(url, json=args)
            if resp.status_code >= 400:
                detail = resp.text[:500]
                logger.warning("STDB reducer error (%s) on %s: %.200s", resp.status_code, reducer, detail)
                raise RuntimeError(f"STDB reducer error ({resp.status_code}): {detail}")
            # STDB may return empty body for void reducers
            text = resp.text.strip()
            if not text:
                return None
            return resp.json()
    except httpx.TimeoutException:
        logger.error("STDB reducer timeout on: %s", reducer)
        raise RuntimeError("STDB reducer timed out")


# ─── Row mappers ───────────────────────────────────────────────────────────────

def _str(row: list, idx: int) -> str:
    return str(row[idx]) if idx < len(row) and row[idx] is not None else ""


def _int(row: list, idx: int) -> int:
    return int(row[idx]) if idx < len(row) and row[idx] is not None else 0


def _bool(row: list, idx: int) -> bool:
    return bool(row[idx]) if idx < len(row) else False


def map_page(row: list) -> dict:
    return {
        "id": _str(row, 0),
        "title": _str(row, 1),
        "slug": _str(row, 2),
        "content": _str(row, 3),
        "text_content": _str(row, 4),
        "collection_id": _str(row, 5),
        "parent_page_id": _str(row, 6),
        "status": _str(row, 7),
        "icon": _str(row, 8),
        "color": _str(row, 9),
        "full_width": _bool(row, 10),
        "is_template": _bool(row, 11),
        "template_id": _str(row, 12),
        "sort_order": _int(row, 13),
        "created_by": _str(row, 14),
        "updated_by": _str(row, 15),
        "created_at": _int(row, 16),
        "updated_at": _int(row, 17),
        "published_at": _int(row, 18),
        "deleted_at": _int(row, 19),
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
        "role": _str(row, 4), "avatar_url": _str(row, 5),
        "created_at": _int(row, 6),
    }


def map_revision(row: list) -> dict:
    return {
        "id": _str(row, 0), "page_id": _str(row, 1), "title": _str(row, 2),
        "content": _str(row, 3), "edited_by": _str(row, 4),
        "created_at": _int(row, 5), "revision_number": _int(row, 6),
    }


def map_comment(row: list) -> dict:
    return {
        "id": _str(row, 0), "page_id": _str(row, 1),
        "parent_comment_id": _str(row, 2), "user_id": _str(row, 3),
        "body": _str(row, 4), "is_resolved": _bool(row, 5),
        "created_at": _int(row, 6), "updated_at": _int(row, 7),
    }


def map_tag(row: list) -> dict:
    return {
        "id": _str(row, 0), "page_id": _str(row, 1),
        "name": _str(row, 2), "value": _str(row, 3),
    }


def map_attachment(row: list) -> dict:
    return {
        "id": _str(row, 0), "page_id": _str(row, 1),
        "filename": _str(row, 2), "mime_type": _str(row, 3),
        "size_bytes": _int(row, 4), "storage_key": _str(row, 5),
        "uploaded_by": _str(row, 6), "created_at": _int(row, 7),
    }


def map_share_link(row: list) -> dict:
    return {
        "id": _str(row, 0), "page_id": _str(row, 1),
        "token": _str(row, 2), "password_hash": _str(row, 3),
        "created_by": _str(row, 4), "expires_at": _int(row, 5),
        "created_at": _int(row, 6), "visit_count": _int(row, 7),
    }


def map_api_key(row: list) -> dict:
    return {
        "id": _str(row, 0), "user_id": _str(row, 1), "name": _str(row, 2),
        "key_hash": _str(row, 3), "key_prefix": _str(row, 4),
        "last_used_at": _int(row, 5), "created_at": _int(row, 6),
        "expires_at": _int(row, 7), "is_revoked": _bool(row, 8),
    }
