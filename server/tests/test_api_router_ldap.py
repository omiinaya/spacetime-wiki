"""Tests for API server LDAP router — row mapping functions."""

from __future__ import annotations

import sys
from unittest.mock import AsyncMock, patch

import pytest
from fastapi import FastAPI
from fastapi.testclient import TestClient

sys.path.insert(0, "api-server")

from routers.ldap_auth import _map_ldap_provider_dict, _map_user, _str, _int, _bool


class TestLdapRowMapping:
    def test_map_ldap_provider_full(self):
        row = {
            "id": "l1",
            "name": "MyLDAP",
            "slug": "my-ldap",
            "host": "ldap.example.com",
            "port": 389,
            "is_secure": True,
            "bind_dn": "cn=admin,dc=example",
            "bind_password": "secret",
            "base_dn": "dc=example,dc=com",
            "user_filter": "(uid={{username}})",
            "username_attribute": "uid",
            "email_attribute": "mail",
            "name_attribute": "cn",
            "default_role": "member",
            "auto_register": True,
            "is_active": True,
            "created_by": "u1",
            "created_at": 1000,
            "updated_at": 2000,
        }
        p = _map_ldap_provider_dict(row)
        assert p is not None
        assert p["id"] == "l1"
        assert p["name"] == "MyLDAP"
        assert p["host"] == "ldap.example.com"
        assert p["port"] == 389
        assert p["is_secure"] is True
        assert p["base_dn"] == "dc=example,dc=com"
        assert p["user_filter"] == "(uid={{username}})"
        # bind_password is never echoed (secrets stay in the private table)
        assert p["bind_password"] == ""

    def test_map_ldap_provider_empty(self):
        assert _map_ldap_provider_dict({})["id"] == ""
        assert _map_ldap_provider_dict(None)["id"] == ""

    def test_map_ldap_provider_short_row(self):
        p = _map_ldap_provider_dict({"id": "l1"})
        assert p is not None
        assert p["id"] == "l1"
        assert p["name"] == ""

    def test_map_user_full(self):
        row = ["u1", "Alice", "a@b.com", "", "admin", "https://avatar", 1000]
        u = _map_user(row)
        assert u is not None
        assert u["id"] == "u1"
        assert u["name"] == "Alice"

    def test_map_user_empty(self):
        assert _map_user([]) is None

    def test_str_helper(self):
        assert _str(["hello"], 0) == "hello"
        assert _str([], 0) == ""

    def test_int_helper(self):
        assert _int([42], 0) == 42
        assert _int([], 0) == 0

    def test_bool_helper(self):
        assert _bool([True], 0) is True
        assert _bool([], 0) is False


class TestLdapRouter:
    """Test the LDAP router endpoints (login path)."""

    @pytest.fixture
    def client(self):
        app = FastAPI()
        with patch("config.settings") as mock_settings:
            mock_settings.api_key_header = "X-API-Key"
            mock_settings.cors_origins_safe = ["*"]
            mock_settings.debug = True
            import importlib
            import routers.ldap_auth as mod
            importlib.reload(mod)
            app.include_router(mod.router)
        return TestClient(app)

    def test_login_missing_fields(self, client):
        resp = client.post("/api/v1/auth/ldap/login", json={})
        assert resp.status_code == 400
        assert "required" in resp.json()["detail"].lower()
