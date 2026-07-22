"""Tests for API server SCIM router — mapping functions, hash, config."""

from __future__ import annotations

import sys
from unittest.mock import AsyncMock, patch

import pytest
from fastapi import FastAPI
from fastapi.testclient import TestClient

sys.path.insert(0, "server/api-server")

from routers.scim import (
    hash_token,
    _wiki_user_to_scim,
    _wiki_group_to_scim,
    SCIM_CONFIG,
    USER_SCHEMA,
    GROUP_SCHEMA,
)


class TestScimHash:
    def test_hash_consistency(self):
        assert hash_token("hello") == hash_token("hello")

    def test_hash_different(self):
        assert hash_token("abc") != hash_token("xyz")

    def test_hash_length(self):
        h = hash_token("test")
        assert len(h) == 64  # SHA-256 hex


class TestScimUserMapping:
    def test_wiki_user_to_scim_dict_row(self):
        rows = [{"id": "u1", "name": "Alice Smith", "email": "alice@example.com", "role": "admin"}]
        s = _wiki_user_to_scim(rows)
        assert s is not None
        assert s["schemas"] == ["urn:ietf:params:scim:schemas:core:2.0:User"]
        assert s["id"] == "u1"
        assert s["userName"] == "alice@example.com"
        assert s["name"]["givenName"] == "Alice"
        assert s["name"]["familyName"] == "Smith"
        assert s["active"] is True

    def test_wiki_user_to_scim_list_row(self):
        rows = [["u1", "Bob", "bob@example.com", "", "viewer", "", 1000]]
        s = _wiki_user_to_scim(rows)
        assert s is not None
        assert s["id"] == "u1"
        assert s["active"] is False  # viewer -> inactive

    def test_wiki_user_to_scim_empty(self):
        assert _wiki_user_to_scim([]) is None

    def test_wiki_user_to_scim_no_name_parts(self):
        rows = [["u1", "Alice", "alice@example.com"]]
        s = _wiki_user_to_scim(rows)
        assert s["name"]["givenName"] == "Alice"
        assert s["name"]["familyName"] == ""


class TestScimGroupMapping:
    def test_wiki_group_to_scim_dict(self):
        rows = [{"id": "g1", "name": "Admins"}]
        g = _wiki_group_to_scim(rows)
        assert g is not None
        assert g["displayName"] == "Admins"
        assert g["members"] == []

    def test_wiki_group_to_scim_list(self):
        rows = [["g1", "Editors"]]
        g = _wiki_group_to_scim(rows)
        assert g["displayName"] == "Editors"

    def test_wiki_group_to_scim_empty(self):
        assert _wiki_group_to_scim([]) is None


class TestScimConstants:
    def test_scim_config_keys(self):
        assert "patch" in SCIM_CONFIG
        assert "bulk" in SCIM_CONFIG
        assert "filter" in SCIM_CONFIG
        assert "authenticationSchemes" in SCIM_CONFIG

    def test_user_schema(self):
        assert USER_SCHEMA["id"] == "urn:ietf:params:scim:schemas:core:2.0:User"

    def test_group_schema(self):
        assert GROUP_SCHEMA["id"] == "urn:ietf:params:scim:schemas:core:2.0:Group"


class TestScimRouter:
    @pytest.fixture
    def client(self):
        app = FastAPI()
        with patch("config.settings") as mock_settings:
            mock_settings.api_key_header = "X-API-Key"
            mock_settings.cors_origins_safe = ["*"]
            mock_settings.debug = True
            import importlib
            import routers.scim as mod
            importlib.reload(mod)
            app.include_router(mod.router)
        return TestClient(app)

    def test_service_provider_config_no_auth(self, client):
        """Without auth header, should be rejected."""
        resp = client.get("/scim/v2/ServiceProviderConfig")
        assert resp.status_code == 401

    def test_service_provider_config_with_invalid_token(self, client):
        with patch("routers.scim.sql_query", new_callable=AsyncMock, return_value=[]):
            resp = client.get(
                "/scim/v2/ServiceProviderConfig",
                headers={"Authorization": "Bearer invalid_token"},
            )
            assert resp.status_code == 401
