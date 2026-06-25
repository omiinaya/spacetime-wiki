"""Search REST endpoints."""

from fastapi import APIRouter, Query

from stdb_client import sql_query, map_page

router = APIRouter(prefix="/api/v1/search", tags=["search"])


@router.get("")
async def search_pages(
    q: str = Query("", description="Search query"),
    limit: int = Query(50, ge=1, le=200),
):
    """Full-text search across page titles and text_content.

    STDB SQL doesn't support LIKE with wildcards or ORDER BY,
    so we fetch all non-deleted pages and filter/sort in Python.
    """
    if not q.strip():
        return []

    safe_q = q.lower()

    rows = await sql_query(
        "SELECT * FROM page WHERE status != 'deleted'"
    )

    pages = [map_page(r) for r in rows]

    # Filter by title or text_content containing the query
    matched = []
    for p in pages:
        if safe_q in p["title"].lower() or safe_q in (p.get("text_content") or "").lower():
            matched.append(p)

    # Sort: title matches first, then by updated_at desc
    def sort_key(p):
        title_score = 0 if safe_q in p["title"].lower() else 1
        return (title_score, -(p["updated_at"] or 0))

    matched.sort(key=sort_key)

    results = []
    for page in matched[:limit]:
        results.append({
            "page_id": page["id"],
            "title": page["title"],
            "slug": page["slug"],
            "excerpt": (page.get("text_content") or "")[:200],
            "match_type": "title" if safe_q in page["title"].lower() else "content",
            "icon": page.get("icon", ""),
            "collection_id": page.get("collection_id", ""),
        })

    return results


@router.get("/suggestions")
async def search_suggestions(
    q: str = Query("", description="Prefix for autocomplete"),
    limit: int = Query(10, ge=1, le=50),
):
    """Quick title-based autocomplete for the search bar."""
    if not q.strip():
        return []
    safe_q = q.lower()

    # Fetch all pages and filter in Python (STDB SQL is limited)
    rows = await sql_query(
        "SELECT id, title, slug, icon FROM page WHERE status != 'deleted'"
    )

    # Filter in Python
    filtered = [(r[0], r[1], r[2], r[3]) for r in rows if safe_q in str(r[1]).lower()]

    # Sort: exact prefix matches first, then alphabetically
    filtered.sort(key=lambda r: (
        0 if str(r[1]).lower().startswith(safe_q) else 1,
        str(r[1]).lower(),
    ))

    return [
        {"id": str(r[0]), "title": str(r[1]), "slug": str(r[2]), "icon": str(r[3])}
        for r in filtered[:limit]
    ]
