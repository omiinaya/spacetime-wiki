"""Search endpoints."""

from fastapi import APIRouter, Query

from stdb_client import sql_query, map_page

router = APIRouter(prefix="/api/v1/search", tags=["search"])


@router.get("")
async def search(q: str = Query(..., min_length=1), limit: int = Query(20, le=50)):
    """Full-text search across page titles and content."""
    rows = await sql_query("SELECT * FROM page WHERE status != 'deleted'")
    query = q.lower()
    results = []
    for r in rows:
        page = map_page(r)
        if query in page["title"].lower() or query in page.get("text_content", "").lower():
            results.append(page)
    return results[:limit]


@router.get("/autocomplete")
async def autocomplete(q: str = Query(..., min_length=1), limit: int = Query(10, le=25)):
    """Quick title-only autocomplete search."""
    rows = await sql_query("SELECT * FROM page WHERE status != 'deleted'")
    query = q.lower()
    results = []
    for r in rows:
        page = map_page(r)
        if query in page["title"].lower():
            results.append({"id": page["id"], "title": page["title"], "slug": page.get("slug", "")})
    return results[:limit]
