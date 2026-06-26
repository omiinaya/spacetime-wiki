"""SpacetimeWiki REST API — FastAPI application."""

import uvicorn
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
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

# ─── App ──────────────────────────────────────────────────────────────────────

limiter = Limiter(key_func=get_remote_address)

app = FastAPI(
    title="SpacetimeWiki REST API",
    description="Programmatic CRUD and search for pages, collections, and more.",
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

@app.get("/health")
async def health():
    return {"status": "ok", "service": "spacetime-wiki-api"}


# ─── Entry point ──────────────────────────────────────────────────────────────

if __name__ == "__main__":
    uvicorn.run("main:app", host="0.0.0.0", port=settings.api_port, reload=True)
