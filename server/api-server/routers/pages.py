"""Page CRUD endpoints."""
from fastapi import APIRouter, HTTPException, Query, Request
from models import (
    CommentCreateResponse,
    PageCreateResponse,
    PageDeleteResponse,
    PageResponse,
    PageUpdateResponse,
    PaginatedResponse,
    ShareLinkCreateResponse,
    TagCreateResponse,
)
from permissions import check_page_access
from rate_limit import limiter
from stdb_client import (
    call_reducer,
    map_attachment,
    map_comment,
    map_page,
    map_revision,
    map_share_link,
    map_tag,
    sql_query,
)

router = APIRouter(prefix="/api/v1/pages", tags=["pages"])


@router.get("", response_model=PaginatedResponse)
async def list_pages(
    collection_id: str | None = Query(None, description="Filter by collection ID"),
    status: str = Query("active", description="Page status filter"),
    offset: int = Query(0, ge=0, description="Zero-based offset"),
    limit: int = Query(50, le=100, description="Max results"),
):
    """List pages, optionally filtered by collection."""
    where = "status = ?"
    args: list[str] = [status]
    if collection_id:
        where += " AND collection_id = ?"
        args.append(collection_id)

    count_rows = await sql_query("SELECT COUNT(*) AS n FROM page WHERE " + where, *args)
    total = count_rows[0][0] if count_rows else 0

    rows = await sql_query("SELECT * FROM page WHERE " + where + " LIMIT ?i OFFSET ?i", *args, limit, offset)
    return {
        "data": [map_page(r) for r in rows],
        "total": total,
        "offset": offset,
        "limit": limit,
    }


@router.get("/{page_id}", response_model=PageResponse)
async def get_page(request: Request, page_id: str):
    await check_page_access(request, page_id, "viewer")
    """Get a single page by ID."""
    rows = await sql_query("SELECT * FROM page WHERE id = ?", page_id)
    if not rows:
        raise HTTPException(404, "Page not found")
    return map_page(rows[0])


@limiter.limit("60/minute")
@router.post("", response_model=PageCreateResponse)
async def create_page(request: Request, 
    title: str,
    collection_id: str | None = None,
    content: str = "",
    icon: str = "",
    is_template: bool = False,
):
    """Create a new page via the create_page reducer.

    The reducer signature is create_page(id, title, content, collection_id,
    parent_page_id, created_by). The API generates the id and binds
    created_by to the AUTHENTICATED caller (never a client-supplied value).
    """
    import uuid
    page_id = f"page_{uuid.uuid4().hex[:12]}"
    created_by = getattr(request.state, "api_user_id", "")
    await call_reducer("create_page", [
        page_id, title, content, collection_id or "", "", created_by,
    ])
    return {"status": "created", "id": page_id}


@router.put("/{page_id}", response_model=PageUpdateResponse)
async def update_page(request: Request, page_id: str, title: str | None = None, content: str | None = None):
    """Update a page's title and/or content via reducer."""
    await check_page_access(request, page_id, "editor")
    await call_reducer("update_page", [page_id, title or "", content or "", ""])
    return {"status": "updated"}


@router.delete("/{page_id}", response_model=PageDeleteResponse)
async def delete_page(request: Request, page_id: str):
    """Soft-delete a page via reducer."""
    await check_page_access(request, page_id, "admin")
    await call_reducer("set_page_status", [page_id, "deleted"])
    return {"status": "deleted"}


# ─── Revisions ─────────────────────────────────────────────────────────────────


@router.get("/{page_id}/revisions", response_model=PaginatedResponse)
async def list_revisions(
    page_id: str,
    offset: int = Query(0, ge=0, description="Zero-based offset"),
    limit: int = Query(50, le=100, description="Max results"),
):
    """List page revision history."""
    count_rows = await sql_query("SELECT COUNT(*) AS n FROM revision WHERE page_id = ?", page_id)
    total = count_rows[0][0] if count_rows else 0
    rows = await sql_query("SELECT * FROM revision WHERE page_id = ? LIMIT ?i OFFSET ?i", page_id, limit, offset)
    return {
        "data": [map_revision(r) for r in rows],
        "total": total,
        "offset": offset,
        "limit": limit,
    }


# ─── Comments ──────────────────────────────────────────────────────────────────


@router.get("/{page_id}/comments", response_model=PaginatedResponse)
async def list_comments(
    request: Request,
    page_id: str,
    offset: int = Query(0, ge=0, description="Zero-based offset"),
    limit: int = Query(50, le=100, description="Max results"),
):
    """List comments on a page."""
    await check_page_access(request, page_id, "viewer")
    count_rows = await sql_query("SELECT COUNT(*) AS n FROM comment WHERE page_id = ?", page_id)
    total = count_rows[0][0] if count_rows else 0
    rows = await sql_query("SELECT * FROM comment WHERE page_id = ? LIMIT ?i OFFSET ?i", page_id, limit, offset)
    return {
        "data": [map_comment(r) for r in rows],
        "total": total,
        "offset": offset,
        "limit": limit,
    }


@router.post("/{page_id}/comments", response_model=CommentCreateResponse)
async def create_comment(request: Request, page_id: str, body: str, user_id: str = ""):
    """Add a comment to a page."""
    await check_page_access(request, page_id, "editor")
    result = await call_reducer("add_comment", [page_id, body, user_id])
    return result or {"status": "created"}


# ─── Tags ──────────────────────────────────────────────────────────────────────


@router.get("/{page_id}/tags", response_model=PaginatedResponse)
async def list_tags(
    request: Request,
    page_id: str,
    offset: int = Query(0, ge=0, description="Zero-based offset"),
    limit: int = Query(50, le=100, description="Max results"),
):
    """List tags on a page."""
    await check_page_access(request, page_id, "viewer")
    count_rows = await sql_query("SELECT COUNT(*) AS n FROM page_tag WHERE page_id = ?", page_id)
    total = count_rows[0][0] if count_rows else 0
    rows = await sql_query("SELECT * FROM page_tag WHERE page_id = ? LIMIT ?i OFFSET ?i", page_id, limit, offset)
    return {
        "data": [map_tag(r) for r in rows],
        "total": total,
        "offset": offset,
        "limit": limit,
    }


@router.post("/{page_id}/tags", response_model=TagCreateResponse)
async def add_tag(request: Request, page_id: str, name: str, value: str = ""):
    """Add a tag to a page."""
    await check_page_access(request, page_id, "editor")
    result = await call_reducer("add_page_tag", [page_id, name, value])
    return result or {"status": "created"}


# ─── Attachments ───────────────────────────────────────────────────────────────


@router.get("/{page_id}/attachments", response_model=PaginatedResponse)
async def list_attachments(
    request: Request,
    page_id: str,
    offset: int = Query(0, ge=0, description="Zero-based offset"),
    limit: int = Query(50, le=100, description="Max results"),
):
    """List attachments on a page."""
    await check_page_access(request, page_id, "viewer")
    count_rows = await sql_query("SELECT COUNT(*) AS n FROM attachment WHERE page_id = ?", page_id)
    total = count_rows[0][0] if count_rows else 0
    rows = await sql_query("SELECT * FROM attachment WHERE page_id = ? LIMIT ?i OFFSET ?i", page_id, limit, offset)
    return {
        "data": [map_attachment(r) for r in rows],
        "total": total,
        "offset": offset,
        "limit": limit,
    }


# ─── Share links ───────────────────────────────────────────────────────────────


@router.get("/{page_id}/share-links", response_model=PaginatedResponse)
async def list_share_links(
    request: Request,
    page_id: str,
    offset: int = Query(0, ge=0, description="Zero-based offset"),
    limit: int = Query(50, le=100, description="Max results"),
):
    """List share links for a page."""
    await check_page_access(request, page_id, "viewer")
    count_rows = await sql_query("SELECT COUNT(*) AS n FROM share_link WHERE page_id = ?", page_id)
    total = count_rows[0][0] if count_rows else 0
    rows = await sql_query("SELECT * FROM share_link WHERE page_id = ? LIMIT ?i OFFSET ?i", page_id, limit, offset)
    return {
        "data": [map_share_link(r) for r in rows],
        "total": total,
        "offset": offset,
        "limit": limit,
    }


@router.post("/{page_id}/share-links", response_model=ShareLinkCreateResponse)
async def create_share_link(request: Request, page_id: str, expires_at: int = 0):
    """Create a share link for a page."""
    await check_page_access(request, page_id, "editor")
    result = await call_reducer("create_share_link", [page_id, expires_at])
    return result or {"status": "created"}
