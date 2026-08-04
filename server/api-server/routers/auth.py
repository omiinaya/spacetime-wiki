"""Authentication and API key management endpoints."""

from auth import generate_api_key
from fastapi import APIRouter, Query
from models import ApiKeyRegisterResponse, ApiKeyRevokeResponse, PaginatedResponse
from stdb_client import call_reducer, map_api_key, sql_query

router = APIRouter(prefix="/api/v1/auth", tags=["auth"])


@router.get("/keys", response_model=PaginatedResponse)
async def list_api_keys(
    offset: int = Query(0, ge=0, description="Zero-based offset"),
    limit: int = Query(50, le=100, description="Max results"),
):
    """List all registered API keys (without the raw key, only metadata)."""
    count_rows = await sql_query("SELECT COUNT(*) AS n FROM api_key")
    total = count_rows[0][0] if count_rows else 0
    rows = await sql_query("SELECT * FROM api_key LIMIT ?i OFFSET ?i", limit, offset)
    keys = []
    for r in rows:
        k = map_api_key(r)
        # Never expose key_hash
        del k["key_hash"]
        keys.append(k)
    return {
        "data": keys,
        "total": total,
        "offset": offset,
        "limit": limit,
    }


@router.post("/register-key", response_model=ApiKeyRegisterResponse)
async def register_key(body: dict):
    """Register a new API key. Returns the raw key once."""
    name = body.get("name", "default")
    user_id = body.get("user_id", "")
    raw_key, key_hash, key_prefix = generate_api_key()
    import uuid
    key_id = str(uuid.uuid4())
    await call_reducer("create_api_key", [key_id, user_id, name, key_hash, key_prefix, 0])

    return {
        "api_key": raw_key,
        "name": name,
        "key_prefix": key_prefix,
        "message": "Save this key — it won't be shown again.",
    }


@router.delete("/keys/{key_id}", response_model=ApiKeyRevokeResponse)
async def revoke_api_key(key_id: str):
    """Revoke an API key via reducer."""
    await call_reducer("revoke_api_key", [key_id])
    return {"status": "revoked"}
