"""API key management endpoints."""

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

from stdb_client import sql_query, call_reducer, map_api_key
from auth import generate_api_key

router = APIRouter(prefix="/api/v1/auth", tags=["auth"])


def gen_id(prefix: str = "key") -> str:
    import time, random
    ts = int(time.time() * 1000)
    rand = random.randint(0, 0xFFFFF)
    return f"{prefix}_{ts:x}{rand:x}"


class RegisterKeyRequest(BaseModel):
    user_id: str
    name: str = "api-client"
    expires_days: int = 365


class RegisterKeyResponse(BaseModel):
    api_key: str
    key_prefix: str
    name: str
    message: str


@router.post("/register-key", response_model=RegisterKeyResponse)
async def register_api_key(body: RegisterKeyRequest):
    """Register a new API key. Returns the raw key — show once only.

    Reducer: create_api_key(id, user_id, name, key_hash, key_prefix, expires_days)
    """
    raw_key, key_hash, key_prefix = generate_api_key()
    key_id = gen_id("key")

    await call_reducer("create_api_key", [
        key_id, body.user_id, body.name, key_hash, key_prefix, body.expires_days,
    ])

    return RegisterKeyResponse(
        api_key=raw_key,
        key_prefix=key_prefix,
        name=body.name,
        message="Save this key — it will not be shown again.",
    )


@router.get("/keys")
async def list_api_keys(user_id: str = ""):
    """List registered API keys (optionally filter by user)."""
    if user_id:
        rows = await sql_query(f"SELECT * FROM api_key WHERE user_id = '{user_id}'")
    else:
        rows = await sql_query("SELECT * FROM api_key")
    return [map_api_key(r) for r in rows]


@router.delete("/keys/{key_id}")
async def revoke_api_key(key_id: str):
    """Revoke an API key."""
    await call_reducer("revoke_api_key", [key_id])
    return {"status": "revoked", "id": key_id}
