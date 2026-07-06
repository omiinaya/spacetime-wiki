"""Collection CRUD endpoints."""
from fastapi import APIRouter, HTTPException, Query

from stdb_client import sql_query, call_reducer, map_collection
from models import (
    CollectionResponse,
    CollectionCreateResponse,
    CollectionUpdateResponse,
    CollectionDeleteResponse,
    PaginatedResponse,
)

router = APIRouter(prefix="/api/v1/collections", tags=["collections"])


@router.get("", response_model=PaginatedResponse)
async def list_collections(
    offset: int = Query(0, ge=0, description="Zero-based offset"),
    limit: int = Query(50, le=100, description="Max results"),
):
    """List all collections."""
    count_rows = await sql_query("SELECT COUNT(*) FROM collection")
    total = count_rows[0][0] if count_rows else 0
    rows = await sql_query("SELECT * FROM collection LIMIT ?i OFFSET ?i", limit, offset)
    return {
        "data": [map_collection(r) for r in rows],
        "total": total,
        "offset": offset,
        "limit": limit,
    }


@router.get("/{collection_id}", response_model=CollectionResponse)
async def get_collection(collection_id: str):
    """Get a single collection by ID."""
    rows = await sql_query("SELECT * FROM collection WHERE id = ?", collection_id)
    if not rows:
        raise HTTPException(404, "Collection not found")
    return map_collection(rows[0])


@router.post("", response_model=CollectionCreateResponse)
async def create_collection(name: str, description: str = "", icon: str = "", color: str = ""):
    """Create a new collection via reducer."""
    result = await call_reducer("create_collection", [name, description, icon, color])
    return result or {"status": "created"}


@router.put("/{collection_id}", response_model=CollectionUpdateResponse)
async def update_collection(collection_id: str, name: str | None = None, description: str | None = None):
    """Update a collection via reducer."""
    current_name = name or ""
    current_desc = description or ""
    await call_reducer("update_collection", [collection_id, current_name, current_desc, "", ""])
    return {"status": "updated"}


@router.delete("/{collection_id}", response_model=CollectionDeleteResponse)
async def delete_collection(collection_id: str):
    """Delete a collection via reducer."""
    await call_reducer("delete_collection", [collection_id])
    return {"status": "deleted"}
