"""Search endpoints — uses STDB search_pages reducer with full filter support."""

import time

from fastapi import APIRouter, HTTPException, Query
from models import PaginatedResponse, SearchResponse
from stdb_client import call_reducer, sql_query

router = APIRouter(prefix="/api/v1/search", tags=["search"])


def _gen_search_token() -> str:
    """Generate a unique search token."""
    ts = int(time.time() * 1000)
    rand = (ts * 1103515245 + 12345) & 0xFFFFFFFF
    return f"search_{rand:x}"


@router.get("", response_model=SearchResponse)
async def search(
    q: str = Query(..., min_length=1, description="Free-text search query"),
    collection_id: str = Query("", description="Filter by collection ID"),
    author_id: str = Query("", description="Filter by author/user ID"),
    from_date: str = Query("", alias="from", description="Date range start (ms epoch or ISO date)"),
    to_date: str = Query("", alias="to", description="Date range end (ms epoch or ISO date)"),
    tags: str = Query("", description="Comma-separated tag:value filters, e.g. 'status:published,priority:high'"),
    limit: int = Query(50, le=100, description="Max results"),
    offset: int = Query(0, ge=0, description="Zero-based offset"),
):
    """Full-text search with advanced filters.

    Supports query syntax:
    - `q` — free-text search against page title + content
    - `collection_id` — narrow to a specific collection
    - `author_id` — narrow to a specific author
    - `from` / `to` — date range on updated_at (ISO dates or epoch ms)
    - `tags` — tag:value filters, colon-separated, comma-delimited
    """
    search_token = _gen_search_token()

    # Parse date params: try as epoch ms, fall back to ISO 8601
    date_from: int = 0
    date_to: int = 0

    if from_date:
        try:
            date_from = int(from_date)
        except ValueError:
            import datetime
            try:
                dt = datetime.datetime.fromisoformat(from_date)
                date_from = int(dt.timestamp() * 1000)
            except ValueError:
                raise HTTPException(400, f"Invalid from_date format: {from_date}. Use ISO date or epoch ms.")

    if to_date:
        try:
            date_to = int(to_date)
        except ValueError:
            import datetime
            try:
                dt = datetime.datetime.fromisoformat(to_date)
                # Include the entire day (end of day)
                dt = dt.replace(hour=23, minute=59, second=59, microsecond=999000)
                date_to = int(dt.timestamp() * 1000)
            except ValueError:
                raise HTTPException(400, f"Invalid to_date format: {to_date}. Use ISO date or epoch ms.")

    # Call the search_pages reducer
    await call_reducer("search_pages", [
        search_token,
        q,
        collection_id,
        author_id,
        date_from,
        date_to,
    ])

    # Get total count for pagination
    count_rows = await sql_query(
        "SELECT COUNT(*) AS n FROM search_result WHERE search_token = ?",
        search_token,
    )
    total = count_rows[0][0] if count_rows else 0

    if tags:
        # Tag filters can't be pushed to SQL — fetch all, filter locally, then slice
        tag_pairs = [t.strip() for t in tags.split(",") if t.strip()]
        all_rows = await sql_query(
            "SELECT * FROM search_result WHERE search_token = ? ORDER BY created_at DESC",
            search_token,
        )
        filtered = []
        for row in all_rows:
            page_id = str(row[2]) if len(row) > 2 else ""
            if not page_id:
                continue
            all_match = True
            for pair in tag_pairs:
                if ":" in pair:
                    tag_name, tag_value = pair.split(":", 1)
                    tag_rows = await sql_query(
                        "SELECT 1 FROM page_tag WHERE page_id = ? AND name = ? AND value = ?",
                        page_id, tag_name.strip(), tag_value.strip(),
                    )
                    if not tag_rows:
                        all_match = False
                        break
                else:
                    tag_rows = await sql_query(
                        "SELECT 1 FROM page_tag WHERE page_id = ? AND name = ?",
                        page_id, pair.strip(),
                    )
                    if not tag_rows:
                        all_match = False
                        break
            if all_match:
                filtered.append(row)
        total = len(filtered)
        page = filtered[offset:offset + limit]
    else:
        # No tags — efficient SQL-level pagination
        rows = await sql_query(
            "SELECT * FROM search_result WHERE search_token = ? ORDER BY created_at DESC LIMIT ?i OFFSET ?i",
            search_token, limit, offset,
        )
        page = rows

    # Map results
    results = []
    for r in page:
        results.append({
            "id": str(r[0] or "") if len(r) > 0 else "",
            "search_token": str(r[1] or "") if len(r) > 1 else "",
            "page_id": str(r[2] or "") if len(r) > 2 else "",
            "title": str(r[3] or "") if len(r) > 3 else "",
            "slug": str(r[4] or "") if len(r) > 4 else "",
            "excerpt": str(r[5] or "") if len(r) > 5 else "",
            "match_type": str(r[6] or "") if len(r) > 6 else "",
            "created_at": int(r[7] or 0) if len(r) > 7 else 0,
        })

    return {
        "data": results,
        "query": q,
        "filters": {
            "collection_id": collection_id or None,
            "author_id": author_id or None,
            "from": from_date or None,
            "to": to_date or None,
            "tags": tags or None,
        },
        "total": total,
        "offset": offset,
        "limit": limit,
    }


@router.get("/autocomplete", response_model=PaginatedResponse)
async def autocomplete(
    q: str = Query(..., min_length=1, description="Search query prefix"),
    limit: int = Query(10, le=25, description="Max suggestions"),
    offset: int = Query(0, ge=0, description="Zero-based offset"),
):
    """Quick title-only autocomplete search."""
    search_token = _gen_search_token()
    # Search with no filters
    await call_reducer("search_pages", [
        search_token,
        q,
        "",  # collection_id
        "",  # author_id
        0,   # date_from
        0,   # date_to
    ])
    # Get total count for pagination
    count_rows = await sql_query(
        "SELECT COUNT(*) AS n FROM search_result WHERE search_token = ?",
        search_token,
    )
    total = count_rows[0][0] if count_rows else 0
    # Fetch paginated results
    rows = await sql_query(
        "SELECT * FROM search_result WHERE search_token = ? ORDER BY created_at DESC LIMIT ?i OFFSET ?i",
        search_token, limit, offset,
    )
    results = []
    for r in rows:
        results.append({
            "id": str(r[0] or "") if len(r) > 0 else "",
            "page_id": str(r[2] or "") if len(r) > 2 else "",
            "title": str(r[3] or "") if len(r) > 3 else "",
            "slug": str(r[4] or "") if len(r) > 4 else "",
        })
    return {
        "data": results,
        "total": total,
        "offset": offset,
        "limit": limit,
    }
