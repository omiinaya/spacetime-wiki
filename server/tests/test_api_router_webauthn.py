"""Tests for API server WebAuthn router — base64, user helpers, credential helpers."""

from __future__ import annotations

import sys
from unittest.mock import AsyncMock, patch

import pytest
from fastapi import FastAPI
from fastapi.testclient import TestClient

sys.path.insert(0, "api-server")

from routers.webauthn import (
    base64url_decode,
    base64url_encode,
    get_rp_id,
    get_rp_origin,
    get_user_by_email,
    get_credentials_for_user,
    get_credential_by_credential_id,
    parse_transports,
)


class TestBase64Url:
    def test_roundtrip(self):
        data = b"hello world"
        encoded = base64url_encode(data)
        decoded = base64url_decode(encoded)
        assert decoded == data

    def test_encode_no_padding(self):
        encoded = base64url_encode(b"test")
        assert "=" not in encoded

    def test_decode_with_padding(self):
        data = base64url_decode("dGVzdA==")
        assert data == b"test"

    def test_decode_url_safe(self):
        """URL-safe base64 with - and _."""
        encoded = base64url_encode(b"\xfb\xff\xff\xff")
        decoded = base64url_decode(encoded)
        assert decoded == b"\xfb\xff\xff\xff"

    def test_empty(self):
        assert base64url_encode(b"") == ""
        assert base64url_decode("") == b""


class TestRpHelpers:
    def test_get_rp_id_from_origin(self):
        class MockRequest:
            headers = {"origin": "https://wiki.example.com"}
        rid = get_rp_id(MockRequest())
        assert rid == "wiki.example.com"

    def test_get_rp_id_defaults_to_localhost(self):
        class MockRequest:
            headers = {}
        rid = get_rp_id(MockRequest())
        assert rid == "localhost"

    def test_get_rp_origin(self):
        class MockRequest:
            headers = {"origin": "https://wiki.example.com"}
        assert get_rp_origin(MockRequest()) == "https://wiki.example.com"

    def test_get_rp_origin_default(self):
        class MockRequest:
            headers = {}
        assert get_rp_origin(MockRequest()) == "http://localhost"


class TestUserHelpers:
    @pytest.mark.asyncio
    async def test_get_user_by_email_found(self):
        with patch("routers.webauthn.sql_query", new_callable=AsyncMock) as mock_sql:
            mock_sql.return_value = [["u1", "Alice", "a@b.com"]]
            user = await get_user_by_email("a@b.com")
            assert user is not None
            assert user["id"] == "u1"
            assert user["email"] == "a@b.com"

    @pytest.mark.asyncio
    async def test_get_user_by_email_not_found(self):
        with patch("routers.webauthn.sql_query", new_callable=AsyncMock) as mock_sql:
            mock_sql.return_value = []
            user = await get_user_by_email("nobody@example.com")
            assert user is None

    @pytest.mark.asyncio
    async def test_get_credentials_for_user(self):
        with patch("routers.webauthn.sql_query", new_callable=AsyncMock) as mock_sql:
            mock_sql.return_value = [
                ["cred1", "u1", "cred1_b64", "pubkey_b64", 5, '["internal"]', "YubiKey"],
            ]
            creds = await get_credentials_for_user("u1")
            assert len(creds) == 1
            assert creds[0]["credential_id"] == "cred1_b64"
            assert creds[0]["device_name"] == "YubiKey"
            assert creds[0]["counter"] == 5

    @pytest.mark.asyncio
    async def test_get_credential_by_id(self):
        with patch("routers.webauthn.sql_query", new_callable=AsyncMock) as mock_sql:
            mock_sql.return_value = [["id1", "u1", "cred_b64", "pk_b64", 3, '["usb"]', "Key"]]
            cred = await get_credential_by_credential_id("cred_b64")
            assert cred is not None
            assert cred["user_id"] == "u1"

    @pytest.mark.asyncio
    async def test_get_credential_by_id_not_found(self):
        with patch("routers.webauthn.sql_query", new_callable=AsyncMock) as mock_sql:
            mock_sql.return_value = []
            cred = await get_credential_by_credential_id("nonexistent")
            assert cred is None


class TestParseTransports:
    def test_valid_json(self):
        assert parse_transports('["usb","internal"]') == ["usb", "internal"]

    def test_empty(self):
        assert parse_transports("") == []

    def test_invalid_json(self):
        assert parse_transports("not json") == []

    def test_not_list(self):
        assert parse_transports('"string"') == []


class TestWebAuthnRouter:
    @pytest.fixture
    def client(self):
        app = FastAPI()
        with patch("config.settings") as mock_settings:
            mock_settings.api_key_header = "X-API-Key"
            mock_settings.cors_origins_safe = ["*"]
            mock_settings.debug = True
            import importlib
            import routers.webauthn as mod
            importlib.reload(mod)
            app.include_router(mod.router)
        return TestClient(app)

    def test_register_begin_no_user(self, client):
        with patch("routers.webauthn.sql_query", new_callable=AsyncMock) as mock_sql:
            mock_sql.return_value = []  # user not found
            resp = client.get("/api/v1/webauthn/register/begin?email=nobody@example.com")
            assert resp.status_code == 404
