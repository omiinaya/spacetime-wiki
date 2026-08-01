"""Admin proxy endpoints for hermes-id agent approvals.

Proxies list/approve/deny calls to the hermes-id auth server's admin API,
authenticating with the per-app scoped admin key (``HERMES_ID_ADMIN_KEY``).
These endpoints are gated by an ``X-Admin-Key`` header check against that
same env var — the api-server has no human JWT admin gate, so the header
comparison is the gate.

The auth server env vars come from the systemd EnvironmentFile
(``/home/user/.hermes/auth/projects/spacetime-wiki.env``):

    HERMES_AUTH_SERVER_URL, HERMES_AUTH_PROJECT, HERMES_AUTH_VERIFY,
    HERMES_ID_ADMIN_KEY
"""

import logging
import os
import secrets

import httpx
from fastapi import APIRouter, Depends, Header, HTTPException, Query
from fastapi.responses import JSONResponse

logger = logging.getLogger(__name__)


def require_admin_key(
    x_admin_key: str | None = Header(default=None, alias="X-Admin-Key"),
) -> None:
    """Reject requests without the correct HERMES_ID_ADMIN_KEY header."""
    expected = os.environ.get("HERMES_ID_ADMIN_KEY", "")
    if not expected:
        raise HTTPException(
            status_code=503,
            detail="HERMES_ID_ADMIN_KEY is not configured on the server",
        )
    if not x_admin_key or not secrets.compare_digest(x_admin_key, expected):
        raise HTTPException(
            status_code=403,
            detail="Invalid or missing X-Admin-Key header",
        )


router = APIRouter(
    prefix="/api/v1/admin/hermes-id/agents",
    tags=["hermes-id-admin"],
    dependencies=[Depends(require_admin_key)],
)


async def _hermes_id_request(method: str, path: str, params: dict | None = None) -> JSONResponse:
    """Proxy a request to the hermes-id auth server admin API.

    Authenticates with the per-app scoped admin key (``HERMES_ID_ADMIN_KEY``)
    so the proxy can only touch this project's agents. Returns the auth
    server's JSON body directly; on upstream errors returns a JSONResponse
    carrying the upstream status code and detail.
    """
    server_url = os.environ.get("HERMES_AUTH_SERVER_URL", "").rstrip("/")
    project = os.environ.get("HERMES_AUTH_PROJECT", "")
    admin_key = os.environ.get("HERMES_ID_ADMIN_KEY", "")

    if not server_url or not project or not admin_key:
        raise HTTPException(
            status_code=503,
            detail=(
                "Hermes-ID auth server not configured — set HERMES_AUTH_SERVER_URL, "
                "HERMES_AUTH_PROJECT and HERMES_ID_ADMIN_KEY"
            ),
        )

    url = f"{server_url}{path}"
    query = dict(params or {})
    query.setdefault("project", project)
    headers = {"X-Admin-Key": admin_key}
    verify = os.environ.get("HERMES_AUTH_VERIFY") or True

    try:
        async with httpx.AsyncClient(verify=verify, timeout=30.0) as client:
            resp = await client.request(method, url, params=query, headers=headers)
    except httpx.HTTPError as e:
        logger.error("[HERMES-ID] auth server request failed: %s", e)
        return JSONResponse(status_code=502, content={"detail": f"Auth server unreachable: {e}"})

    if resp.status_code >= 400:
        detail: str = resp.text
        try:
            body = resp.json()
            if isinstance(body, dict) and "detail" in body:
                detail = str(body["detail"])
        except ValueError:
            pass
        logger.warning("[HERMES-ID] auth server returned %s: %s", resp.status_code, detail)
        return JSONResponse(status_code=resp.status_code, content={"detail": detail})

    try:
        body = resp.json()
    except ValueError:
        body = {"raw": resp.text}
    return JSONResponse(status_code=resp.status_code, content=body)


@router.get("")
async def list_agents(
    status: str = Query("pending", description="Agent status filter (pending/approved/denied/revoked)"),
    page: int = Query(1, ge=1, description="Page number"),
    page_size: int = Query(50, ge=1, le=100, description="Results per page"),
):
    """List hermes-id agents for this project (default: pending)."""
    return await _hermes_id_request(
        "GET", "/agents", {"status": status, "page": page, "page_size": page_size}
    )


@router.post("/{did}/approve")
async def approve_agent(did: str):
    """Approve a pending hermes-id agent for this project."""
    return await _hermes_id_request("POST", f"/agents/{did}/approve")


@router.post("/{did}/deny")
async def deny_agent(did: str):
    """Deny a pending hermes-id agent for this project."""
    return await _hermes_id_request("POST", f"/agents/{did}/deny")
