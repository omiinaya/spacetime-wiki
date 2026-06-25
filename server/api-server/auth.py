"""API key authentication middleware."""

import hashlib
import secrets
from datetime import datetime, timezone

from fastapi import HTTPException, Request
from fastapi.responses import JSONResponse
from starlette.middleware.base import BaseHTTPMiddleware

from config import settings
from stdb_client import sql_query, map_api_key


SKIP_PATHS = {
    "/docs", "/openapi.json", "/redoc",
    "/health", "/api/v1/auth/register-key",
}


class ApiKeyMiddleware(BaseHTTPMiddleware):
    """Validates X-API-Key header against STDB api_key table."""

    async def dispatch(self, request: Request, call_next):
        path = request.url.path

        # Skip docs, health, and key registration
        if any(path.startswith(p) for p in SKIP_PATHS):
            return await call_next(request)

        api_key = request.headers.get(settings.api_key_header)
        if not api_key:
            return JSONResponse(
                status_code=401,
                content={"detail": "Missing API key. Provide via X-API-Key header."},
            )

        try:
            prefix = api_key[:8]
            rows = await sql_query(
                f"SELECT * FROM api_key WHERE key_prefix = '{prefix}' AND is_revoked = false"
            )
            if not rows:
                return JSONResponse(
                    status_code=401,
                    content={"detail": "Invalid or revoked API key."},
                )

            key_record = map_api_key(rows[0])
            key_hash = hashlib.sha256(api_key.encode()).hexdigest()
            if key_record["key_hash"] != key_hash:
                return JSONResponse(
                    status_code=401,
                    content={"detail": "API key does not match."},
                )

            # Check expiry
            expires = key_record["expires_at"]
            if expires and expires > 0 and expires < int(datetime.now(timezone.utc).timestamp() * 1000):
                return JSONResponse(
                    status_code=401,
                    content={"detail": "API key has expired."},
                )

            # Attach key info to request state
            request.state.api_key_id = key_record["id"]
            request.state.api_key_name = key_record["name"]
            request.state.api_user_id = key_record["user_id"]

        except Exception as exc:
            return JSONResponse(
                status_code=500,
                content={"detail": f"Auth error: {exc}"},
            )

        return await call_next(request)


def generate_api_key() -> tuple[str, str, str]:
    """Generate a new API key, returning (raw_key, key_hash, key_prefix)."""
    raw_key = f"sw_{secrets.token_hex(32)}"
    key_hash = hashlib.sha256(raw_key.encode()).hexdigest()
    key_prefix = raw_key[:8]
    return raw_key, key_hash, key_prefix
