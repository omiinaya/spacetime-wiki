"""Tests for API server collections router — CRUD endpoints."""

from __future__ import annotations

import sys
from unittest.mock import AsyncMock, patch

import pytest
from fastapi import FastAPI
from fastapi.testclient import TestClient

sys.path.insert(0, "server/api-server")


def _make_test_app():
    app = FastAPI()
    with patch("config.settings") as mock_settings:
        mock_settings.api_key_header = "X-API-Key"
        mock_settings.cors_origins_safe = ["*"]
        mock_settings.debug = True
        import importlib
        import routers.collections as mod
        importlib.reload(mod)
        app.include_router(mod.router)
    return app


class TestCollectionsRouter:
    @pytest.fixture
    def client(self):
        return TestClient(_make_test_app())

    def test_list_collections(self, client):
        with patch("routers.collections.sql_query", new_callable=AsyncMock) as mock_sql:
            mock_sql.side_effect = [
                [[3]],
                [["c1", "Docs", "docs", "All docs", "", "📚", "blue", 0, "u1", 1000, 2000]],
            ]
            resp = client.get("/api/v1/collections")
            assert resp.status_code == 200
            data = resp.json()
            assert data["total"] == 3
            assert len(data["data"]) == 1
            assert data["data"][0]["name"] == "Docs"

    def test_get_collection_found(self, client):
        with patch("routers.collections.sql_query", new_callable=AsyncMock) as mock_sql:
            mock_sql.return_value = [["c1", "Docs", "docs", "", "", "📚", "blue", 0, "u1", 1000, 2000]]
            resp = client.get("/api/v1/collections/c1")
            assert resp.status_code == 200
            assert resp.json()["name"] == "Docs"

    def test_get_collection_not_found(self, client):
        with patch("routers.collections.sql_query", new_callable=AsyncMock) as mock_sql:
            mock_sql.return_value = []
            resp = client.get("/api/v1/collections/nonexistent")
            assert resp.status_code == 404

    def test_create_collection(self, client):
        with patch("routers.collections.call_reducer", new_callable=AsyncMock) as mock_red:
            mock_red.return_value = {"status": "created"}
            resp = client.post("/api/v1/collections?name=New&description=test")
            assert resp.status_code == 200
            # Note: with query params the test client sends them differently
            # The endpoint uses POST with form params
            assert resp.json()["status"] == "created"

    def test_update_collection(self, client):
        with patch("routers.collections.call_reducer", new_callable=AsyncMock):
            resp = client.put("/api/v1/collections/c1")
            assert resp.status_code == 200
            assert resp.json()["status"] == "updated"

    def test_delete_collection(self, client):
        with patch("routers.collections.call_reducer", new_callable=AsyncMock):
            resp = client.delete("/api/v1/collections/c1")
            assert resp.status_code == 200
            assert resp.json()["status"] == "deleted"
