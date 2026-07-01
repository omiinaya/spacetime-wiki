"""Collection CRUD endpoints."""
from fastapi import APIRouter, HTTPException

from stdb_client import sql_query, call_reducer, map_collection
from models import (
    CollectionResponse,
    CollectionCreateResponse,
    CollectionUpdateResponse,
    CollectionDeleteResponse,
)

router = APIRouter(prefix="/api/v1/collections", tags=["collections"])


@router.get("", response_model=list[CollectionResponse])
async def list_collections():
    """List all collections."""
    rows = await sql_query("SELECT * FROM collection")
    return [map_collection(r) for r in rows]


@router.get("/{collection_id}", response_model=CollectionResponse)
async def get_collection(collection_id: str):
    """Get a single collection by ID."""
    safe = collection_id.replace("'", "''")
    rows = await sql_query(f"SELECT * FROM collection WHERE id = '{safe}'")
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
