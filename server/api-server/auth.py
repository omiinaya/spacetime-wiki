"""API key authentication middleware."""

import hashlib
import logging
import secrets
from datetime import datetime, timezone

from fastapi import Request
from fastapi.responses import JSONResponse
from starlette.middleware.base import BaseHTTPMiddleware

logger = logging.getLogger(__name__)

from config import settings
from stdb_client import call_reducer, map_api_key, sql_query

SKIP_PATHS = {
    "/docs", "/openapi.json", "/redoc",
    "/health", "/openapi-spec.json",
    "/api/v1/auth/register-key",
    "/api/v1/webauthn",
    "/hermes-id",  # hermes-id agent auth routes handle their own auth
    "/api/v1/admin/hermes-id",  # hermes-id admin proxy — gated by X-Admin-Key dependency
}


class ApiKeyMiddleware(BaseHTTPMiddleware):
    """Validates X-API-Key header against STDB api_key table.

    The key hash lives in the PRIVATE api_key_credential table, so the
    hash comparison is done inside the verify_api_key reducer — never via
    SQL. The public api_key table only holds metadata (prefix, expiry).
    """

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
                "SELECT * FROM api_key WHERE key_prefix = ? AND is_revoked = false", prefix
            )
            if not rows:
                return JSONResponse(
                    status_code=401,
                    content={"detail": "Invalid or revoked API key."},
                )

            key_record = map_api_key(rows[0])
            key_hash = hashlib.sha256(api_key.encode()).hexdigest()

            # Verify the hash inside the reducer (private table lookup)
            try:
                await call_reducer("verify_api_key", [prefix, key_hash])
            except Exception:
                return JSONResponse(
                    status_code=401,
                    content={"detail": "Invalid or revoked API key."},
                )

            # Attach key info to request state
            request.state.api_key_id = key_record["id"]
            request.state.api_key_name = key_record["name"]
            request.state.api_user_id = key_record["user_id"]

        except Exception:
            logger.exception("Auth middleware error")
            return JSONResponse(
                status_code=500,
                content={"detail": "Internal authentication error."},
            )

        return await call_next(request)


def generate_api_key() -> tuple[str, str, str]:
    """Generate a new API key, returning (raw_key, key_hash, key_prefix)."""
    raw_key = f"sw_{secrets.token_hex(32)}"
    key_hash = hashlib.sha256(raw_key.encode()).hexdigest()
    key_prefix = raw_key[:8]
    return raw_key, key_hash, key_prefix
