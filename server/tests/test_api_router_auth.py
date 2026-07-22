"""Tests for API server auth router — API key CRUD endpoints."""

from __future__ import annotations

import sys
from unittest.mock import AsyncMock, patch

import pytest
from fastapi import FastAPI
from fastapi.testclient import TestClient

sys.path.insert(0, "server/api-server")


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
            with patch("routers.auth.call_reducer", new_callable=AsyncMock):
                with patch("routers.auth.generate_api_key") as mock_gen:
                    mock_gen.return_value = ("sw_testkey123", "hash", "sw_test")
                    resp = client.post(
                        "/api/v1/auth/register-key",
                        json={"name": "test-key", "user_id": "u1"},
                    )
                    assert resp.status_code == 200
                    data = resp.json()
                    assert data["api_key"] == "sw_testkey123"
                    assert data["name"] == "test-key"
                    assert "won't be shown again" in data["message"]

    def test_revoke_key(self, client):
        with patch("routers.auth.call_reducer", new_callable=AsyncMock) as mock_red:
            resp = client.delete("/api/v1/auth/keys/k1")
            assert resp.status_code == 200
            data = resp.json()
            assert data["status"] == "revoked"
