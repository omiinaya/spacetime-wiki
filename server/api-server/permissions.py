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
        # For unauthenticated requests, allow access (public pages are accessible)
        return True
    
    role_hierarchy = {"viewer": 0, "editor": 1, "admin": 2}
    required = role_hierarchy.get(min_role, 0)
    
    # 1. Check direct user-level page permission
    rows = await sql_query(
        "SELECT role FROM page_permission WHERE page_id = ? AND user_id = ? AND group_id = ''",
        page_id, user_id
    )
    if rows and role_hierarchy.get(rows[0][0], -1) >= required:
        return True
    
    # 2. Get page's collection to check collection-level access
    page_rows = await sql_query("SELECT collection_id FROM page WHERE id = ?", page_id)
    if page_rows:
        collection_id = page_rows[0][0]
        
        # 2a. Check user's group memberships for page-level group permissions
        group_rows = await sql_query(
            "SELECT group_id FROM group_member WHERE user_id = ?", user_id
        )
        for grp in group_rows:
            group_id = grp[0]
            # Page permission via group
            rows = await sql_query(
                "SELECT role FROM page_permission WHERE page_id = ? AND group_id = ?",
                page_id, group_id
            )
            if rows and role_hierarchy.get(rows[0][0], -1) >= required:
                return True
            # Collection permission via group
            rows = await sql_query(
                "SELECT role FROM collection_group_permission WHERE collection_id = ? AND group_id = ?",
                collection_id, group_id
            )
            if rows and role_hierarchy.get(rows[0][0], -1) >= required:
                return True
        
        # 2b. Check direct collection user permission (if table exists)
        try:
            rows = await sql_query(
                "SELECT role FROM collection_member WHERE collection_id = ? AND user_id = ?",
                collection_id, user_id
            )
            if rows and role_hierarchy.get(rows[0][0], -1) >= required:
                return True
        except Exception:
            pass  # table may not exist or be private
    
    # 3. Check if user is the page creator/owner (implicit admin)
    rows = await sql_query("SELECT created_by FROM page WHERE id = ?", page_id)
    if rows and rows[0][0] == user_id:
        return True
    
    # No permission found
    raise HTTPException(
        status_code=HTTP_403_FORBIDDEN,
        detail="Access denied: insufficient permissions for this page",
    )


async def require_page_permission(request: Request, page_id: str, min_role: str = "viewer"):
    """Dependency that verifies page access, raising 403 if not allowed."""
    await check_page_access(request, page_id, min_role)
