"""Page CRUD endpoints."""
from typing import Annotated
from fastapi import APIRouter, HTTPException, Query

from stdb_client import (
    sql_query,
    call_reducer,
    map_page,
    map_revision,
    map_comment,
    map_tag,
    map_attachment,
    map_share_link,
)
from models import (
    PageResponse,
    PageCreateResponse,
    PageUpdateResponse,
    PageDeleteResponse,
    RevisionResponse,
    CommentResponse,
    CommentCreateResponse,
    TagResponse,
    TagCreateResponse,
    AttachmentResponse,
    ShareLinkResponse,
    ShareLinkCreateResponse,
)

router = APIRouter(prefix="/api/v1/pages", tags=["pages"])


@router.get("", response_model=list[PageResponse])
async def list_pages(
    collection_id: str | None = Query(None, description="Filter by collection ID"),
    status: str = Query("active", description="Page status filter"),
    limit: int = Query(50, le=100, description="Max results"),
):
    """List pages, optionally filtered by collection."""
    where = f"status = '{status.replace(chr(39), chr(39)*2)}'"
    if collection_id:
        safe = collection_id.replace("'", "''")
        where += f" AND collection_id = '{safe}'"

    rows = await sql_query(f"SELECT * FROM page WHERE {where}")
    return [map_page(r) for r in rows[:limit]]


@router.get("/{page_id}", response_model=PageResponse)
async def get_page(page_id: str):
    """Get a single page by ID."""
    safe = page_id.replace("'", "''")
    rows = await sql_query(f"SELECT * FROM page WHERE id = '{safe}'")
    if not rows:
        raise HTTPException(404, "Page not found")
    return map_page(rows[0])


@router.post("", response_model=PageCreateResponse)
async def create_page(
    title: str,
    collection_id: str | None = None,
    content: str = "",
    icon: str = "",
    is_template: bool = False,
):
    """Create a new page via the create_page reducer."""
    result = await call_reducer("create_page", [
        title, collection_id or "", content, icon, is_template,
    ])
    return result or {"status": "created"}


@router.put("/{page_id}", response_model=PageUpdateResponse)
async def update_page(page_id: str, title: str | None = None, content: str | None = None):
    """Update a page's title and/or content via reducer."""
    await call_reducer("update_page", [page_id, title or "", content or "", ""])
    return {"status": "updated"}


@router.delete("/{page_id}", response_model=PageDeleteResponse)
async def delete_page(page_id: str):
    """Soft-delete a page via reducer."""
    await call_reducer("set_page_status", [page_id, "deleted"])
    return {"status": "deleted"}


# ─── Revisions ─────────────────────────────────────────────────────────────────


@router.get("/{page_id}/revisions", response_model=list[RevisionResponse])
async def list_revisions(page_id: str):
    """List page revision history."""
    safe = page_id.replace("'", "''")
    rows = await sql_query(f"SELECT * FROM revision WHERE page_id = '{safe}'")
    return [map_revision(r) for r in rows]


# ─── Comments ──────────────────────────────────────────────────────────────────


@router.get("/{page_id}/comments", response_model=list[CommentResponse])
async def list_comments(page_id: str):
    """List comments on a page."""
    safe = page_id.replace("'", "''")
    rows = await sql_query(f"SELECT * FROM comment WHERE page_id = '{safe}'")
    return [map_comment(r) for r in rows]


@router.post("/{page_id}/comments", response_model=CommentCreateResponse)
async def create_comment(page_id: str, body: str, user_id: str = ""):
    """Add a comment to a page."""
    result = await call_reducer("add_comment", [page_id, body, user_id])
    return result or {"status": "created"}


# ─── Tags ──────────────────────────────────────────────────────────────────────


@router.get("/{page_id}/tags", response_model=list[TagResponse])
async def list_tags(page_id: str):
    """List tags on a page."""
    safe = page_id.replace("'", "''")
    rows = await sql_query(f"SELECT * FROM page_tag WHERE page_id = '{safe}'")
    return [map_tag(r) for r in rows]


@router.post("/{page_id}/tags", response_model=TagCreateResponse)
async def add_tag(page_id: str, name: str, value: str = ""):
    """Add a tag to a page."""
    result = await call_reducer("add_page_tag", [page_id, name, value])
    return result or {"status": "created"}


# ─── Attachments ───────────────────────────────────────────────────────────────


@router.get("/{page_id}/attachments", response_model=list[AttachmentResponse])
async def list_attachments(page_id: str):
    """List attachments on a page."""
    safe = page_id.replace("'", "''")
    rows = await sql_query(f"SELECT * FROM attachment WHERE page_id = '{safe}'")
    return [map_attachment(r) for r in rows]


# ─── Share links ───────────────────────────────────────────────────────────────


@router.get("/{page_id}/share-links", response_model=list[ShareLinkResponse])
async def list_share_links(page_id: str):
    """List share links for a page."""
    safe = page_id.replace("'", "''")
    rows = await sql_query(f"SELECT * FROM share_link WHERE page_id = '{safe}'")
    return [map_share_link(r) for r in rows]


@router.post("/{page_id}/share-links", response_model=ShareLinkCreateResponse)
async def create_share_link(page_id: str, expires_at: int = 0):
    """Create a share link for a page."""
    result = await call_reducer("create_share_link", [page_id, expires_at])
    return result or {"status": "created"}
