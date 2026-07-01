"""SpacetimeDB HTTP client — wraps SQL queries and reducer calls."""

import logging

import httpx
from config import settings

logger = logging.getLogger(__name__)

STDB_HOST = settings.stdb_host
DB_ID = settings.stdb_database


async def sql_query(sql: str) -> list[list]:
    """Execute a raw SQL query against STDB and return rows as arrays."""
    url = f"http://{STDB_HOST}/v1/database/{DB_ID}/sql"
    try:
        async with httpx.AsyncClient(timeout=30) as client:
            resp = await client.post(url, content=sql, headers={"Content-Type": "text/plain"})
            if resp.status_code >= 400:
                detail = resp.text[:500]
                logger.warning("STDB SQL error (%s) on: %.200s", resp.status_code, sql)
                raise RuntimeError(f"STDB SQL error ({resp.status_code}): {detail}")
            data = resp.json()
            return (data[0] or {}).get("rows", [])
    except httpx.TimeoutException:
        logger.error("STDB SQL timeout on: %.200s", sql)
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
