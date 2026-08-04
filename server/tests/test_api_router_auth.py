"""Tests for API server auth router — API key CRUD endpoints."""

from __future__ import annotations

import sys
from unittest.mock import AsyncMock, patch

import pytest
from fastapi import FastAPI
from fastapi.testclient import TestClient

sys.path.insert(0, "api-server")


def _make_test_app():
    """Create a FastAPI app with the auth router and mocked deps."""
    app = FastAPI()

    # Patch settings to bypass auth middleware
    with patch("config.settings") as mock_settings:
        mock_settings.api_key_header = "X-API-Key"
        mock_settings.cors_origins_safe = ["*"]
        mock_settings.debug = True

        import importlib
        import routers.auth as auth_router_mod
        importlib.reload(auth_router_mod)
        app.include_router(auth_router_mod.router)

    return app


class TestAuthRouter:
    @pytest.fixture
    def app(self):
        return _make_test_app()

    @pytest.fixture
    def client(self, app):
        return TestClient(app)

    def test_list_keys_returns_paginated(self, client):
        with patch("routers.auth.sql_query", new_callable=AsyncMock) as mock_sql:
            mock_sql.side_effect = [
                [[5]],  # COUNT(*)
                [       # SELECT *
                 ["k1", "u1", "my-key", "hash1", "sw_abc", 0, 1000, 0, False],
                 ["k2", "u1", "dev-key", "hash2", "sw_def", 0, 1001, 0, False],
                ],
            ]
            resp = client.get("/api/v1/auth/keys")
            assert resp.status_code == 200
            data = resp.json()
            assert data["total"] == 5
            assert len(data["data"]) == 2

    def test_list_keys_excludes_key_hash(self, client):
        with patch("routers.auth.sql_query", new_callable=AsyncMock) as mock_sql:
            mock_sql.return_value = [[1]]
            # Second call returns keys
            mock_sql.side_effect = [
                [[1]],
                [["k1", "u1", "key1", "hash123", "sw_abc", 0, 1000, 0, False]],
            ]
            resp = client.get("/api/v1/auth/keys")
            data = resp.json()
            key = data["data"][0]
            assert "key_hash" not in key

    def test_register_key_returns_raw_key(self, client):
        with patch("routers.auth.sql_query", new_callable=AsyncMock) as mock_sql:
            mock_sql.return_value = []
            with patch("routers.auth.call_reducer", new_callable=AsyncMock) as mock_red:
                with patch("routers.auth.generate_api_key") as mock_gen:
                    mock_gen.return_value = ("sw_testkey123", "hash", "sw_test")
                    # Simulate the auth middleware having authenticated the caller
                    client.app.middleware_stack = None  # force rebuild below
                    from starlette.middleware.base import BaseHTTPMiddleware

                    @client.app.middleware("http")
                    async def _fake_auth(request, call_next):
                        request.state.api_user_id = "u1"
                        return await call_next(request)

                    resp = client.post(
                        "/api/v1/auth/register-key",
                        json={"name": "test-key", "user_id": "attacker-chosen"},
                    )
                    assert resp.status_code == 200
                    data = resp.json()
                    assert data["api_key"] == "sw_testkey123"
                    assert data["name"] == "test-key"
                    assert "won't be shown again" in data["message"]
                    # Key must be bound to the AUTHENTICATED caller (u1),
                    # never to the client-supplied user_id.
                    args = mock_red.call_args[0][1]
                    assert args[1] == "u1"

    def test_register_key_rejects_unauthenticated(self, client):
        """Anonymous caller cannot mint a key (P0 impersonation fix)."""
        with patch("routers.auth.sql_query", new_callable=AsyncMock) as mock_sql:
            mock_sql.return_value = []
            with patch("routers.auth.call_reducer", new_callable=AsyncMock) as mock_red:
                resp = client.post(
                    "/api/v1/auth/register-key",
                    json={"name": "evil", "user_id": "admin-id"},
                )
                assert resp.status_code == 401
                mock_red.assert_not_called()

    def test_register_key_bootstrap_secret_binds_admin(self, client):
        """X-Bootstrap-Secret path binds the key to the bootstrap admin user."""
        import auth as auth_mod
        from unittest.mock import patch as _patch

        with _patch.object(auth_mod, "settings") as mock_settings:
            mock_settings.api_bootstrap_secret = "s3cret"
            mock_settings.api_key_header = "X-API-Key"
            mock_settings.cors_origins_safe = ["*"]
            mock_settings.debug = True
            # Rebuild app with a middleware that honors the bootstrap secret
            app2 = FastAPI()

            @app2.middleware("http")
            async def _bootstrap_auth(request, call_next):
                if request.url.path == "/api/v1/auth/register-key":
                    supplied = request.headers.get("X-Bootstrap-Secret", "")
                    if supplied == "s3cret":
                        request.state.api_user_id = auth_mod.BOOTSTRAP_ADMIN_USER_ID
                        return await call_next(request)
                request.state.api_user_id = None
                return await call_next(request)

            import importlib
            import routers.auth as auth_router_mod
            importlib.reload(auth_router_mod)
            app2.include_router(auth_router_mod.router)
            c2 = TestClient(app2)

            with patch("routers.auth.sql_query", new_callable=AsyncMock) as mock_sql:
                mock_sql.return_value = []
                with patch("routers.auth.call_reducer", new_callable=AsyncMock) as mock_red:
                    with patch("routers.auth.generate_api_key") as mock_gen:
                        mock_gen.return_value = ("sw_boot123", "hash", "sw_boot")
                        resp = c2.post(
                            "/api/v1/auth/register-key",
                            json={"name": "first-key"},
                            headers={"X-Bootstrap-Secret": "s3cret"},
                        )
                        assert resp.status_code == 200
                        assert resp.json()["api_key"] == "sw_boot123"
                        args = mock_red.call_args[0][1]
                        assert args[1] == "user-admin"

    def test_revoke_key_requires_owner(self, client):
        """A caller cannot revoke another user's key."""
        with patch("routers.auth.sql_query", new_callable=AsyncMock) as mock_sql:
            # Key k1 belongs to u2; caller is u1
            mock_sql.return_value = [["k1", "u2", "key1", "hash123", "sw_abc", 0, 1000, 0, False]]
            with patch("routers.auth.call_reducer", new_callable=AsyncMock) as mock_red:
                from starlette.middleware.base import BaseHTTPMiddleware

                @client.app.middleware("http")
                async def _fake_auth(request, call_next):
                    request.state.api_user_id = "u1"
                    return await call_next(request)

                resp = client.delete("/api/v1/auth/keys/k1")
                assert resp.status_code == 403
                mock_red.assert_not_called()

    def test_revoke_key_by_owner(self, client):
        """The key owner can revoke their own key."""
        with patch("routers.auth.sql_query", new_callable=AsyncMock) as mock_sql:
            mock_sql.return_value = [["k1", "u1", "key1", "hash123", "sw_abc", 0, 1000, 0, False]]
            with patch("routers.auth.call_reducer", new_callable=AsyncMock) as mock_red:
                from starlette.middleware.base import BaseHTTPMiddleware

                @client.app.middleware("http")
                async def _fake_auth(request, call_next):
                    request.state.api_user_id = "u1"
                    return await call_next(request)

                resp = client.delete("/api/v1/auth/keys/k1")
                assert resp.status_code == 200
                assert resp.json()["status"] == "revoked"
                mock_red.assert_called_once_with("revoke_api_key", ["k1"])
