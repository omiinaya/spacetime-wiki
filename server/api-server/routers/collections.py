"""Collections REST endpoints."""

from fastapi import APIRouter, HTTPException, Query
from pydantic import BaseModel

from stdb_client import sql_query, call_reducer, map_collection, map_page

router = APIRouter(prefix="/api/v1/collections", tags=["collections"])


def gen_id(prefix: str = "col") -> str:
    import time, random
    ts = int(time.time() * 1000)
    rand = random.randint(0, 0xFFFFF)
    return f"{prefix}_{ts:x}{rand:x}"


class CreateCollection(BaseModel):
    name: str
    description: str = ""
    parent_id: str = ""
    icon: str = ""
    color: str = ""
    created_by: str = "api"


class UpdateCollection(BaseModel):
    name: str | None = None
    description: str | None = None
    icon: str | None = None
    color: str | None = None


@router.get("")
async def list_collections():
    """List all collections."""
    rows = await sql_query("SELECT * FROM collection")
    return [map_collection(r) for r in rows]


@router.get("/{collection_id}")
async def get_collection(collection_id: str):
    """Get a single collection by ID."""
    rows = await sql_query(f"SELECT * FROM collection WHERE id = '{collection_id}'")
    if not rows:
        raise HTTPException(404, "Collection not found")
    return map_collection(rows[0])


@router.post("", status_code=201)
async def create_collection(body: CreateCollection):
    """Create a new collection.

    Reducer: create_collection(id, name, description, parent_id, icon, color, created_by)
    """
    col_id = gen_id("col")
    await call_reducer("create_collection", [
        col_id, body.name, body.description,
        body.parent_id, body.icon, body.color, body.created_by,
    ])
    rows = await sql_query(f"SELECT * FROM collection WHERE id = '{col_id}'")
    if rows:
        return map_collection(rows[0])
    return {"status": "created", "id": col_id}


@router.patch("/{collection_id}")
async def update_collection(collection_id: str, body: UpdateCollection):
    """Update collection fields.

    Reducer: update_collection(id, name, description, icon, color)
    """
    name = body.name or ""
    desc = body.description or ""
    icon = body.icon or ""
    color = body.color or ""
    await call_reducer("update_collection", [collection_id, name, desc, icon, color])
    rows = await sql_query(f"SELECT * FROM collection WHERE id = '{collection_id}'")
    if not rows:
        raise HTTPException(404, "Collection not found")
    return map_collection(rows[0])


@router.delete("/{collection_id}")
async def delete_collection(collection_id: str):
    """Delete a collection."""
    await call_reducer("delete_collection", [collection_id])
    return {"status": "deleted", "id": collection_id}


# ─── Collection pages ─────────────────────────────────────────────────────────

@router.get("/{collection_id}/pages")
async def list_collection_pages(collection_id: str, status: str = Query(None)):
    """List pages in a collection."""
    sql = f"SELECT * FROM page WHERE collection_id = '{collection_id}'"
    if status:
        sql += f" AND status = '{status}'"
    else:
        sql += " AND status != 'deleted'"
    rows = await sql_query(sql)
    return [map_page(r) for r in rows]
