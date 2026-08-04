"""Tests for API server search router — search and autocomplete endpoints."""

from __future__ import annotations

import sys
from unittest.mock import AsyncMock, patch

import pytest
from fastapi import FastAPI
from fastapi.testclient import TestClient

sys.path.insert(0, "api-server")


def _make_test_app():
    app = FastAPI()
    with patch("config.settings") as mock_settings:
        mock_settings.api_key_header = "X-API-Key"
        mock_settings.cors_origins_safe = ["*"]
        mock_settings.debug = True
        import importlib
        import routers.search as mod
        importlib.reload(mod)
        app.include_router(mod.router)
    return app


class TestSearchRouter:
    @pytest.fixture
    def client(self):
        return TestClient(_make_test_app())

    def test_search_requires_query(self, client):
        resp = client.get("/api/v1/search")
        assert resp.status_code == 422  # missing required query param

    def test_search_with_results(self, client):
        with patch("routers.search.call_reducer", new_callable=AsyncMock):
            with patch("routers.search.sql_query", new_callable=AsyncMock) as mock_sql:
                mock_sql.side_effect = [
                    [[2]],
                    [["r1", "t1", "p1", "Hello", "hello", "excerpt...", "title", 1000]],
                ]
                # The caller is authenticated and the result page is visible
                # (permission logic covered by test_api_permissions.py).
                with patch("routers.search.get_request_user_id", new_callable=AsyncMock) as mock_uid:
                    mock_uid.return_value = "u1"
                    with patch("routers.search._has_page_access", new_callable=AsyncMock) as mock_acc:
                        mock_acc.return_value = True
                        resp = client.get("/api/v1/search?q=hello")
                        assert resp.status_code == 200
                        data = resp.json()
                        assert data["query"] == "hello"
                        assert len(data["data"]) == 1

    def test_search_with_filters(self, client):
        with patch("routers.search.call_reducer", new_callable=AsyncMock):
            with patch("routers.search.sql_query", new_callable=AsyncMock) as mock_sql:
                mock_sql.side_effect = [[[0]], []]
                resp = client.get("/api/v1/search?q=test&collection_id=c1&author_id=u1")
                assert resp.status_code == 200

    def test_autocomplete(self, client):
        with patch("routers.search.call_reducer", new_callable=AsyncMock):
            with patch("routers.search.sql_query", new_callable=AsyncMock) as mock_sql:
                mock_sql.side_effect = [[[1]], [["r1", "t1", "p1", "Hello", "hello"]]]
                with patch("routers.search.get_request_user_id", new_callable=AsyncMock) as mock_uid:
                    mock_uid.return_value = "u1"
                    with patch("routers.search._has_page_access", new_callable=AsyncMock) as mock_acc:
                        mock_acc.return_value = True
                        resp = client.get("/api/v1/search/autocomplete?q=hel")
                        assert resp.status_code == 200
                        data = resp.json()
                        assert data["total"] == 1

    def test_autocomplete_requires_query(self, client):
        resp = client.get("/api/v1/search/autocomplete")
        assert resp.status_code == 422

    def test_search_token_generation(self):
        """Verify _gen_search_token produces unique, unpredictable tokens."""
        from routers.search import _gen_search_token
        t1 = _gen_search_token()
        t2 = _gen_search_token()
        assert t1 != t2
        assert t1.startswith("search_")
        assert t2.startswith("search_")
        assert len(t1) > len("search_") + 8, "token should carry entropy"
