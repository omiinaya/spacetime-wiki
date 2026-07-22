"""Tests for API server auth module — API key generation, hashing, prefix extraction."""

from __future__ import annotations

import sys
import hashlib
from unittest.mock import AsyncMock, MagicMock, patch

sys.path.insert(0, "server/api-server")

from auth import generate_api_key


class TestGenerateApiKey:
    def test_returns_tuple(self):
        result = generate_api_key()
        assert len(result) == 3
        raw, key_hash, prefix = result
        assert isinstance(raw, str)
        assert isinstance(key_hash, str)
        assert isinstance(prefix, str)

    def test_starts_with_sw(self):
        raw, _, _ = generate_api_key()
        assert raw.startswith("sw_")

    def test_key_hash_is_sha256(self):
        raw, key_hash, _ = generate_api_key()
        expected = hashlib.sha256(raw.encode()).hexdigest()
        assert key_hash == expected

    def test_key_prefix_is_first_8_chars(self):
        raw, _, prefix = generate_api_key()
        assert prefix == raw[:8]

    def test_unique_generations(self):
        _, h1, _ = generate_api_key()
        _, h2, _ = generate_api_key()
        assert h1 != h2


class TestAuthMiddleware:
    """Structural tests for the ApiKeyMiddleware class.

    The middleware is tested via the router integration tests.
    """

    def test_skip_paths_defined(self):
        import auth as auth_mod
        assert "/docs" in auth_mod.SKIP_PATHS
        assert "/health" in auth_mod.SKIP_PATHS
        assert "/openapi.json" in auth_mod.SKIP_PATHS

    def test_dispatch_method_exists(self):
        import auth as auth_mod
        assert hasattr(auth_mod.ApiKeyMiddleware, "dispatch")
        assert callable(auth_mod.ApiKeyMiddleware.dispatch)
