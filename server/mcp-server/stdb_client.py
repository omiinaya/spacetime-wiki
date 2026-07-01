"""SpacetimeDB HTTP client — SQL queries for the MCP server."""

import httpx
from config import STDB_HOST, STDB_DATABASE


async def sql_query(sql: str) -> list[list]:
    """Execute a raw SQL query against STDB and return rows as arrays."""
    url = f"http://{STDB_HOST}/v1/database/{STDB_DATABASE}/sql"
    async with httpx.AsyncClient(timeout=30) as client:
        resp = await client.post(url, content=sql, headers={"Content-Type": "text/plain"})
        if resp.status_code >= 400:
            detail = resp.text[:500]
            raise RuntimeError(f"STDB SQL error ({resp.status_code}): {detail}")
        data = resp.json()
        return (data[0] or {}).get("rows", [])


# ─── Row mappers ───────────────────────────────────────────────────────────────

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


# ─── Entity helpers ────────────────────────────────────────────────────────────

async def search_pages(query: str, limit: int = 20) -> list[dict]:
    """Full-text search across page titles and content. STDB doesn't support LIKE,
    so we fetch all non-deleted pages and filter in Python."""
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
    safe = page_id.replace("'", "''")
    rows = await sql_query(f"SELECT * FROM page WHERE id = '{safe}'")
    if rows:
        return map_page(rows[0])
    return None


async def get_page_by_slug(slug: str) -> dict | None:
    """Get a single page by slug."""
    safe = slug.replace("'", "''")
    rows = await sql_query(f"SELECT * FROM page WHERE slug = '{safe}'")
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
        safe = collection_id.replace("'", "''")
        sql = f"SELECT * FROM page WHERE collection_id = '{safe}' AND status != 'deleted'"
    else:
        sql = f"SELECT * FROM page WHERE status != 'deleted'"
    rows = await sql_query(sql)
    # STDB doesn't support LIMIT in SQL, cap client-side
    return [map_page(r) for r in rows[:limit]]


async def get_backlinks(page_id: str, limit: int = 20) -> list[dict]:
    """Find pages that link to the given page by searching for its ID in text_content."""
    safe = page_id.replace("'", "''")
    sql = f"""SELECT * FROM page
WHERE status != 'deleted'
  AND id != '{safe}'
  AND text_content LIKE '%{safe}%'
"""
    rows = await sql_query(sql)
    return [map_page(r) for r in rows[:limit]]


async def list_page_tags(page_id: str) -> list[dict]:
    """List tags for a specific page."""
    safe = page_id.replace("'", "''")
    rows = await sql_query(f"SELECT * FROM page_tag WHERE page_id = '{safe}'")
    return [map_tag(r) for r in rows]


async def get_linked_pages(page_id: str, limit: int = 20) -> list[dict]:
    """Find pages referenced via internal links ([[page_id]] or @page_id patterns)."""
    page = await get_page(page_id)
    if not page:
        return []
    # Search for page ID or slug references in other pages' text_content
    safe_id = page_id.replace("'", "''")
    safe_slug = page.get("slug", "").replace("'", "''")
    conditions = [f"text_content LIKE '%{safe_id}%'"]
    if safe_slug:
        conditions.append(f"text_content LIKE '%{safe_slug}%'")
    where = " OR ".join(conditions)
    sql = f"""SELECT * FROM page
WHERE status != 'deleted'
  AND id != '{safe_id}'
  AND ({where})
"""
    rows = await sql_query(sql)
    return [map_page(r) for r in rows[:limit]]
