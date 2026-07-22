"""Tests for API server OAuth router — row mapping and basic routing."""

from __future__ import annotations

import sys
from unittest.mock import AsyncMock, patch

import pytest
from fastapi import FastAPI
from fastapi.testclient import TestClient

sys.path.insert(0, "server/api-server")

from routers.oauth import _map_oauth_provider, _map_user, _map_oauth_user


class TestOAuthRowMapping:
    def test_map_provider_full(self):
        row = [
            "o1", "GitHub", "github", "github", "https://github.com/login/oauth/authorize",
            "https://github.com/login/oauth/access_token", "https://api.github.com/user",
            "read:user", "client123", "secret!", "https://github.com/favicon.ico",
            True, True, "member", "u1", 1000, 2000,
        ]
        p = _map_oauth_provider(row)
        assert p is not None
        assert p["id"] == "o1"
        assert p["name"] == "GitHub"
        assert p["provider_type"] == "github"
        assert p["is_active"] is True
        assert "client_secret" not in p  # intentionally omitted

    def test_map_provider_empty(self):
        assert _map_oauth_provider([]) is None

    def test_map_user_full(self):
        row = ["u1", "Alice", "a@b.com", "", "admin", "https://avatar", 1000]
        u = _map_user(row)
        assert u is not None
        assert u["name"] == "Alice"

    def test_map_oauth_user_full(self):
        row = ["ou1", "u1", "o1", "ext123", "alice_ext", "a@b.com",
               "", "", "", 2000, 1000, 2000, 3000, 4000]
        ou = _map_oauth_user(row)
        assert ou is not None
        assert ou["user_id"] == "u1"
        assert ou["external_id"] == "ext123"


class TestOAuthRouter:
    @pytest.fixture
    def client(self):
        app = FastAPI()
        with patch("config.settings") as mock_settings:
            mock_settings.api_key_header = "X-API-Key"
            mock_settings.cors_origins_safe = ["*"]
            mock_settings.debug = True
            import importlib
            import routers.oauth as mod
            importlib.reload(mod)
            app.include_router(mod.router)
        return TestClient(app)

    def test_list_providers(self, client):
        with patch("routers.oauth.sql_query", new_callable=AsyncMock) as mock_sql:
            mock_sql.side_effect = [[[2]], [["o1", "GitHub", "github", "github", "", "", "", "", "", "", "", True, True, "member", "", 0, 0]]]
            resp = client.get("/api/v1/auth/oauth/providers")
            assert resp.status_code == 200
            data = resp.json()
            assert data["total"] == 2

    def test_list_all_providers(self, client):
        with patch("routers.oauth.sql_query", new_callable=AsyncMock) as mock_sql:
            mock_sql.side_effect = [[[1]], [["o1", "GitHub", "github", "github", "", "", "", "", "", "", "", True, True, "member", "", 0, 0]]]
            resp = client.get("/api/v1/auth/oauth/providers/all")
            assert resp.status_code == 200

    def test_login_missing_provider(self, client):
        resp = client.post("/api/v1/auth/oauth/login", json={})
        assert resp.status_code == 400

    def test_login_not_found(self, client):
        with patch("routers.oauth.sql_query", new_callable=AsyncMock) as mock_sql:
            mock_sql.return_value = []
            resp = client.post("/api/v1/auth/oauth/login", json={"provider_id": "nonexistent"})
            assert resp.status_code == 404

    def test_callback_missing_fields(self, client):
        resp = client.post("/api/v1/auth/oauth/callback", json={})
        assert resp.status_code == 400

    def test_list_user_links(self, client):
        with patch("routers.oauth.sql_query", new_callable=AsyncMock) as mock_sql:
            mock_sql.side_effect = [[[1]], [["ou1", "u1", "o1", "ext1", "ext_user", "e@m.com", "", "", "", 2000, 1000, 2000, 3000]]]
            resp = client.get("/api/v1/auth/oauth/user-links/u1")
            assert resp.status_code == 200
            assert resp.json()["total"] == 1
