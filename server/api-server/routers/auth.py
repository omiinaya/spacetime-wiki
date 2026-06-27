"""Authentication and API key management endpoints."""

from fastapi import APIRouter, HTTPException

from auth import generate_api_key
from stdb_client import sql_query, call_reducer, map_api_key
from models import ApiKeyResponse, ApiKeyRegisterResponse, ApiKeyRevokeResponse

router = APIRouter(prefix="/api/v1/auth", tags=["auth"])


@router.get("/keys", response_model=list[ApiKeyResponse])
async def list_api_keys():
    """List all registered API keys (without the raw key, only metadata)."""
    rows = await sql_query("SELECT * FROM api_key")
    keys = []
    for r in rows:
        k = map_api_key(r)
        # Never expose key_hash
        del k["key_hash"]
        keys.append(k)
    return keys


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
    """Revoke an API key."""
    safe = key_id.replace("'", "''")
    await sql_query(f"UPDATE api_key SET is_revoked = true WHERE id = '{safe}'")
    return {"status": "revoked"}
