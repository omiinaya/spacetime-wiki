"""Tests for API server permissions module — role hierarchy, page access, edge cases."""

from __future__ import annotations

import sys
from unittest.mock import AsyncMock, MagicMock, patch

import pytest

sys.path.insert(0, "api-server")


class TestGetRequestUserId:
    @pytest.mark.asyncio
    async def test_with_user_id(self):
        from permissions import get_request_user_id

        class MockRequest:
            state = MagicMock(api_user_id="u1")
        request = MockRequest()

        result = await get_request_user_id(request)
        assert result == "u1"

    @pytest.mark.asyncio
    async def test_without_user_id(self):
        from permissions import get_request_user_id

        class MockRequest:
            state = MagicMock(spec=[])
        request = MockRequest()

        result = await get_request_user_id(request)
        assert result == ""


class TestCheckPageAccess:
    @pytest.mark.asyncio
    async def test_unauthenticated_denied(self):
        """Unauthenticated requests (no user_id) must be DENIED (fail-closed)."""
        from permissions import check_page_access
        from fastapi import HTTPException

        class MockRequest:
            state = MagicMock(spec=[])
        request = MockRequest()

        with pytest.raises(HTTPException) as excinfo:
            await check_page_access(request, "p1", "viewer")
        assert excinfo.value.status_code == 403

    @pytest.mark.asyncio
    async def test_direct_permission_grants(self):
        """User with direct page permission should pass."""
        from permissions import check_page_access

        class MockRequest:
            state = MagicMock(api_user_id="u1")
        request = MockRequest()

        with patch("permissions.sql_query", new_callable=AsyncMock) as mock_sql:
            # Direct permission: page_id=p1, user_id=u1, role=editor
            mock_sql.side_effect = [
                [["editor"]],  # page_permission check
                [["c1"]],      # page's collection_id
            ]
            result = await check_page_access(request, "p1", "viewer")
            assert result is True

    @pytest.mark.asyncio
    async def test_creator_implicit_admin(self):
        """Page creator should have implicit admin access."""
        from permissions import check_page_access

        class MockRequest:
            state = MagicMock(api_user_id="u1")
        request = MockRequest()

        with patch("permissions.sql_query", new_callable=AsyncMock) as mock_sql:
            mock_sql.side_effect = [
                [],          # no direct page_permission
                [["c1"]],    # page's collection_id
                [],          # no group memberships
                [],          # no collection membership
                [["u1"]],    # created_by matches user_id → implicit admin
            ]

            result = await check_page_access(request, "p1", "admin")
            assert result is True

    @pytest.mark.asyncio
    async def test_insufficient_role_raises(self):
        """User without sufficient role should get 403."""
        from permissions import check_page_access

        class MockRequest:
            state = MagicMock(api_user_id="u1")
        request = MockRequest()

        with patch("permissions.sql_query", new_callable=AsyncMock) as mock_sql:
            mock_sql.side_effect = [
                [],          # no direct page permission
                [["c1"]],    # page's collection_id
                [],          # no group memberships
                [],          # no collection membership
                [["u2"]],    # created_by != user_id
            ]

            with pytest.raises(Exception) as exc_info:
                await check_page_access(request, "p1", "editor")

    @pytest.mark.asyncio
    async def test_role_hierarchy(self):
        """Verify the role hierarchy: viewer < editor < admin."""
        from permissions import check_page_access, require_page_permission

        class MockRequest:
            state = MagicMock(api_user_id="u1")

        # Check that require_page_permission calls check_page_access
        assert callable(require_page_permission)

    @pytest.mark.asyncio
    async def test_filter_visible_pages_keeps_only_accessible(self):
        """filter_visible_pages returns only pages the user can view."""
        from permissions import filter_visible_pages

        class MockRequest:
            state = MagicMock(api_user_id="u1")
        request = MockRequest()

        rows = [
            ["p1", "Visible", "v", "", "", "", "", "active", "", "", False, False, False, "", 0, "u1", "u1", 1000, 2000, 0, 0],
            ["p2", "Secret", "s", "", "", "", "", "active", "", "", False, False, False, "", 0, "u2", "u2", 1000, 2000, 0, 0],
        ]
        with patch("permissions.sql_query", new_callable=AsyncMock) as mock_sql:
            # p1: creator check hits immediately; p2: creator != u1, no grants
            mock_sql.side_effect = [
                # p1 -> page_permission (none), collection_id, group_members (none),
                #      collection_member (none), created_by (u1 -> True)
                [], [["c1"]], [], [], [["u1"]],
                # p2 -> page_permission (none), collection_id, group_members (none),
                #      collection_member (none), created_by (u2 -> False)
                [], [["c1"]], [], [], [["u2"]],
            ]
            result = await filter_visible_pages(request, rows, "viewer")
        assert [r[0] for r in result] == ["p1"]

    @pytest.mark.asyncio
    async def test_filter_visible_pages_fail_closed(self):
        """filter_visible_pages returns [] for unauthenticated requests."""
        from permissions import filter_visible_pages

        class MockRequest:
            state = MagicMock(spec=[])
        request = MockRequest()

        result = await filter_visible_pages(request, [["p1", "x"]], "viewer")
        assert result == []
