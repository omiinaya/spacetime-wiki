"""Pages REST endpoints."""

from fastapi import APIRouter, HTTPException, Query
from pydantic import BaseModel

from stdb_client import sql_query, call_reducer, map_page, map_revision, map_comment, map_tag, map_attachment

router = APIRouter(prefix="/api/v1/pages", tags=["pages"])

# Helper: generate a simple ID
def gen_id(prefix: str = "page") -> str:
    import time, random
    ts = int(time.time() * 1000)
    rand = random.randint(0, 0xFFFFF)
    return f"{prefix}_{ts:x}{rand:x}"


class CreatePage(BaseModel):
    title: str
    content: str = "{}"
    collection_id: str = ""
    parent_page_id: str = ""
    created_by: str = "api"


class UpdatePage(BaseModel):
    title: str | None = None
    content: str | None = None
    updated_by: str = "api"


@router.get("")
async def list_pages(
    collection_id: str = Query(None),
    status: str = Query(None),
    include_deleted: bool = Query(False),
):
    """List pages, optionally filtered by collection and status."""
    conditions = []
    if collection_id:
        conditions.append(f"collection_id = '{collection_id}'")
    if status:
        conditions.append(f"status = '{status}'")
    elif not include_deleted:
        conditions.append("status != 'deleted'")
    sql = "SELECT * FROM page"
    if conditions:
        sql += " WHERE " + " AND ".join(conditions)
    rows = await sql_query(sql)
    return [map_page(r) for r in rows]


@router.get("/{page_id}")
async def get_page(page_id: str):
    """Get a single page by ID."""
    rows = await sql_query(f"SELECT * FROM page WHERE id = '{page_id}'")
    if not rows:
        raise HTTPException(404, "Page not found")
    return map_page(rows[0])


@router.get("/slug/{slug}")
async def get_page_by_slug(slug: str):
    """Get a page by its URL slug."""
    rows = await sql_query(f"SELECT * FROM page WHERE slug = '{slug}'")
    if not rows:
        raise HTTPException(404, "Page not found")
    return map_page(rows[0])


@router.post("", status_code=201)
async def create_page(body: CreatePage):
    """Create a new page via the create_page reducer.

    Reducer signature: create_page(id, title, content, collection_id, parent_page_id, created_by)
    """
    page_id = gen_id("page")
    await call_reducer("create_page", [
        page_id, body.title, body.content,
        body.collection_id, body.parent_page_id, body.created_by,
    ])
    rows = await sql_query(f"SELECT * FROM page WHERE id = '{page_id}'")
    if rows:
        return map_page(rows[0])
    return {"status": "created", "id": page_id}


@router.patch("/{page_id}")
async def update_page(page_id: str, body: UpdatePage):
    """Update a page's title and/or content.

    Reducer signature: update_page(id, title, content, updated_by)
    """
    title = body.title or ""
    content = body.content or "{}"
    await call_reducer("update_page", [page_id, title, content, body.updated_by])
    rows = await sql_query(f"SELECT * FROM page WHERE id = '{page_id}'")
    if not rows:
        raise HTTPException(404, "Page not found")
    return map_page(rows[0])


@router.patch("/{page_id}/status")
async def set_page_status(page_id: str, status: str):
    """Set page status (draft/published/archived/deleted).

    Reducer: set_page_status(id, status)
    """
    valid = {"draft", "published", "archived", "deleted"}
    if status not in valid:
        raise HTTPException(400, f"Invalid status. Must be one of: {', '.join(valid)}")
    await call_reducer("set_page_status", [page_id, status])
    return {"status": "updated", "id": page_id, "new_status": status}


@router.delete("/{page_id}")
async def delete_page(page_id: str, permanent: bool = Query(False)):
    """Soft-delete (set status=deleted) or permanently delete a page."""
    if permanent:
        await call_reducer("delete_page_permanent", [page_id])
    else:
        await call_reducer("set_page_status", [page_id, "deleted"])
    return {"status": "deleted", "id": page_id}


@router.post("/{page_id}/restore")
async def restore_page(page_id: str):
    """Restore a soft-deleted page."""
    await call_reducer("restore_page", [page_id])
    rows = await sql_query(f"SELECT * FROM page WHERE id = '{page_id}'")
    return map_page(rows[0]) if rows else {"status": "restored", "id": page_id}


# ─── Sub-resources ────────────────────────────────────────────────────────────

@router.get("/{page_id}/revisions")
async def list_revisions(page_id: str):
    """List all revisions for a page."""
    rows = await sql_query(f"SELECT * FROM page_revision WHERE page_id = '{page_id}'")
    return [map_revision(r) for r in rows]


@router.get("/{page_id}/comments")
async def list_comments(page_id: str):
    """List comments on a page."""
    rows = await sql_query(f"SELECT * FROM comment WHERE page_id = '{page_id}'")
    return [map_comment(r) for r in rows]


@router.get("/{page_id}/tags")
async def list_tags(page_id: str):
    """List tags on a page."""
    rows = await sql_query(f"SELECT * FROM page_tag WHERE page_id = '{page_id}'")
    return [map_tag(r) for r in rows]


@router.get("/{page_id}/attachments")
async def list_attachments(page_id: str):
    """List attachments on a page."""
    rows = await sql_query(f"SELECT * FROM attachment WHERE page_id = '{page_id}'")
    return [map_attachment(r) for r in rows]
