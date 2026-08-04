"""SpacetimeWiki REST API — Permission Checks for API Access."""

import logging

from fastapi import HTTPException, Request
from starlette.status import HTTP_403_FORBIDDEN
from stdb_client import sql_query

logger = logging.getLogger(__name__)


async def get_request_user_id(request: Request) -> str:
    """Get user ID from request state (set by auth middleware)."""
    return getattr(request.state, "api_user_id", "")


async def _has_page_access(user_id: str, page_id: str, min_role: str = "viewer") -> bool:
    """Pure visibility check — returns True/False, never raises.

    Mirrors the access rules in check_page_access so list/search can filter
    rows without 403-ing the whole request.
    """
    role_hierarchy = {"viewer": 0, "editor": 1, "admin": 2}
    required = role_hierarchy.get(min_role, 0)

    # 1. Direct user-level page permission
    rows = await sql_query(
        "SELECT role FROM page_permission WHERE page_id = ? AND user_id = ? AND group_id = ''",
        page_id, user_id
    )
    if rows and role_hierarchy.get(rows[0][0], -1) >= required:
        return True

    # 2. Page's collection for collection-level access
    page_rows = await sql_query("SELECT collection_id FROM page WHERE id = ?", page_id)
    if page_rows:
        collection_id = page_rows[0][0]

        # 2a. User's group memberships → page + collection group permissions
        group_rows = await sql_query(
            "SELECT group_id FROM group_member WHERE user_id = ?", user_id
        )
        for grp in group_rows:
            group_id = grp[0]
            rows = await sql_query(
                "SELECT role FROM page_permission WHERE page_id = ? AND group_id = ?",
                page_id, group_id
            )
            if rows and role_hierarchy.get(rows[0][0], -1) >= required:
                return True
            rows = await sql_query(
                "SELECT role FROM collection_group_permission WHERE collection_id = ? AND group_id = ?",
                collection_id, group_id
            )
            if rows and role_hierarchy.get(rows[0][0], -1) >= required:
                return True

        # 2b. Direct collection user permission
        try:
            rows = await sql_query(
                "SELECT role FROM collection_member WHERE collection_id = ? AND user_id = ?",
                collection_id, user_id
            )
            if rows and role_hierarchy.get(rows[0][0], -1) >= required:
                return True
        except RuntimeError:
            logger.debug("collection_member table not available — skipping collection permission check")

    # 3. Page creator/owner (implicit admin)
    rows = await sql_query("SELECT created_by FROM page WHERE id = ?", page_id)
    if rows and rows[0][0] == user_id:
        return True

    return False


async def filter_visible_pages(request: Request, rows: list, min_role: str = "viewer") -> list:
    """Filter a list of page rows (from SELECT * FROM page) to those the
    authenticated user can view.

    Fail-closed: an unauthenticated request yields an empty list.
    """
    user_id = await get_request_user_id(request)
    if not user_id:
        return []
    visible = []
    for r in rows:
        page_id = str(r[0]) if r and len(r) > 0 else ""
        if page_id and await _has_page_access(user_id, page_id, min_role):
            visible.append(r)
    return visible


async def check_page_access(request: Request, page_id: str, min_role: str = "viewer") -> bool:
    """Check if the authenticated user has access to a page.

    Returns True if allowed, raises HTTPException(403) if not.
    FAIL-CLOSED: if no user is authenticated (user_id unset), access is
    DENIED. The auth middleware sets request.state.api_user_id for every
    protected route, so an unset value means a middleware bypass / missing
    key — which must not be granted read/write. Public pages are served via
    the separate share-link path, not through this API-key-gated check.
    """
    user_id = await get_request_user_id(request)
    if not user_id:
        raise HTTPException(
            status_code=HTTP_403_FORBIDDEN,
            detail="Authentication required — access denied",
        )
    if not await _has_page_access(user_id, page_id, min_role):
        raise HTTPException(
            status_code=HTTP_403_FORBIDDEN,
            detail="Access denied: insufficient permissions for this page",
        )
    return True


async def require_page_permission(request: Request, page_id: str, min_role: str = "viewer"):
    """Dependency that verifies page access, raising 403 if not allowed."""
    await check_page_access(request, page_id, min_role)
