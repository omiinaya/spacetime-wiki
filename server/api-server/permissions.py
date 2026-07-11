"""SpacetimeWiki REST API — Permission Checks for API Access."""

import logging

from fastapi import HTTPException, Request
from starlette.status import HTTP_403_FORBIDDEN

from stdb_client import sql_query

logger = logging.getLogger(__name__)


async def get_request_user_id(request: Request) -> str:
    """Get user ID from request state (set by auth middleware)."""
    return getattr(request.state, "api_user_id", "")


async def check_page_access(request: Request, page_id: str, min_role: str = "viewer") -> bool:
    """Check if the authenticated user has access to a page.
    
    Returns True if allowed, raises HTTPException(403) if not.
    Falls back to allowing access if no user_id is set (unauthenticated requests).
    """
    user_id = await get_request_user_id(request)
    if not user_id:
        # For unauthenticated requests, check if page is publicly accessible
        return True  # Allow - public pages are accessible without auth
    
    # Check direct page permission
    rows = await sql_query(
        "SELECT role FROM page_permission WHERE page_id = ? AND user_id = ? AND group_id = ''",
        page_id, user_id
    )
    if rows:
        role_hierarchy = {"viewer": 0, "editor": 1, "admin": 2}
        if role_hierarchy.get(rows[0][0], -1) >= role_hierarchy.get(min_role, 0):
            return True
    
    # Check collection-level permission
    page_rows = await sql_query("SELECT collection_id FROM page WHERE id = ?", page_id)
    if page_rows:
        collection_id = page_rows[0][0]
        rows = await sql_query(
            "SELECT role FROM collection_permission WHERE collection_id = ? AND user_id = ? AND group_id = ''",
            collection_id, user_id
        )
        if rows:
            role_hierarchy = {"viewer": 0, "editor": 1, "admin": 2}
            if role_hierarchy.get(rows[0][0], -1) >= role_hierarchy.get(min_role, 0):
                return True
        
        # Check group permissions
        group_rows = await sql_query(
            "SELECT group_id FROM group_member WHERE user_id = ?", user_id
        )
        for grp in group_rows:
            group_id = grp[0]
            rows = await sql_query(
                "SELECT role FROM page_permission WHERE page_id = ? AND group_id = ?",
                page_id, group_id
            )
            if rows:
                role_hierarchy = {"viewer": 0, "editor": 1, "admin": 2}
                if role_hierarchy.get(rows[0][0], -1) >= role_hierarchy.get(min_role, 0):
                    return True
            rows = await sql_query(
                "SELECT role FROM collection_group_permission WHERE collection_id = ? AND group_id = ?",
                collection_id, group_id
            )
            if rows:
                role_hierarchy = {"viewer": 0, "editor": 1, "admin": 2}
                if role_hierarchy.get(rows[0][0], -1) >= role_hierarchy.get(min_role, 0):
                    return True
    
    # No permission found
    raise HTTPException(
        status_code=HTTP_403_FORBIDDEN,
        detail="Access denied: insufficient permissions for this page",
    )


async def require_page_permission(request: Request, page_id: str, min_role: str = "viewer"):
    """Dependency that verifies page access, raising 403 if not allowed."""
    await check_page_access(request, page_id, min_role)
