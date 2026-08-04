"""API key authentication middleware."""

import hashlib
import logging
import os
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
    "/api/v1/webauthn",
    "/hermes-id",  # hermes-id agent auth routes handle their own auth
    "/api/v1/admin/hermes-id",  # hermes-id admin proxy — gated by X-Admin-Key dependency
}

# register-key is NOT in SKIP_PATHS on purpose: minting an API key is a
# privileged operation. Two authorized paths exist:
#   1. An existing valid X-API-Key (binds the new key to that caller)
#   2. The configured X-Bootstrap-Secret (fresh-install first key only,
#      binds to the bootstrap admin user id)
# Anything else gets a 401 from the middleware below.

BOOTSTRAP_ADMIN_USER_ID = os.getenv("BOOTSTRAP_ADMIN_USER_ID", "user-admin")


class ApiKeyMiddleware(BaseHTTPMiddleware):
    """Validates X-API-Key header against STDB api_key table.

    The key hash lives in the PRIVATE api_key_credential table, so the
    hash comparison is done inside the verify_api_key reducer — never via
    SQL. The public api_key table only holds metadata (prefix, expiry).
    """

    async def dispatch(self, request: Request, call_next):
        path = request.url.path

        # Skip docs, health (but NOT register-key — see SKIP_PATHS comment)
        if any(path.startswith(p) for p in SKIP_PATHS):
            return await call_next(request)

        api_key = request.headers.get(settings.api_key_header)
        api_user_id = None

        # Bootstrap path: allow minting the FIRST key when the caller presents
        # the configured bootstrap secret. Bind it to the bootstrap admin user.
        if path == "/api/v1/auth/register-key":
            supplied = request.headers.get("X-Bootstrap-Secret", "")
            if supplied and settings.api_bootstrap_secret and supplied == settings.api_bootstrap_secret:
                request.state.api_key_id = None
                request.state.api_key_name = None
                request.state.api_user_id = BOOTSTRAP_ADMIN_USER_ID
                return await call_next(request)

            # If no bootstrap secret supplied/configured, fall through to the
            # normal API-key path so an authenticated caller can still mint a key.
            if not api_key:
                return JSONResponse(
                    status_code=401,
                    content={"detail": "Missing API key or bootstrap secret."},
                )

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
