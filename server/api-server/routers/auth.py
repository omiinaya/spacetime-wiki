"""Authentication and API key management endpoints."""

from auth import BOOTSTRAP_ADMIN_USER_ID, generate_api_key
from fastapi import APIRouter, Depends, HTTPException, Query, Request
from models import ApiKeyRegisterResponse, ApiKeyRevokeResponse, PaginatedResponse
from rate_limit import limiter
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


@limiter.limit("10/minute")
@router.post("/register-key", response_model=ApiKeyRegisterResponse)
async def register_key(request: Request, body: dict):
    """Register a new API key. Returns the raw key once.

    The key is bound to the AUTHENTICATED caller (from the middleware's
    request.state.api_user_id) — never to a client-supplied user_id, which
    would let an unauthenticated attacker mint a key for any user (full
    impersonation). On a fresh install, the X-Bootstrap-Secret header is
    accepted instead and binds the key to the bootstrap admin user.
    """
    name = body.get("name", "default")
    # Security: bind to the authenticated caller, never to body["user_id"].
    user_id = getattr(request.state, "api_user_id", None)
    if not user_id:
        raise HTTPException(status_code=401, detail="Authentication required to register an API key.")
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
async def revoke_api_key(key_id: str, request: Request):
    """Revoke an API key — only by its owner (or bootstrap admin)."""
    caller_id = getattr(request.state, "api_user_id", None)
    if not caller_id:
        raise HTTPException(status_code=401, detail="Authentication required.")
    rows = await sql_query("SELECT * FROM api_key WHERE id = ?", key_id)
    if not rows:
        raise HTTPException(status_code=404, detail="Key not found.")
    owner_id = map_api_key(rows[0]).get("user_id")
    if owner_id != caller_id and caller_id != BOOTSTRAP_ADMIN_USER_ID:
        raise HTTPException(status_code=403, detail="Not authorized to revoke this key.")
    await call_reducer("revoke_api_key", [key_id])
    return {"status": "revoked"}
