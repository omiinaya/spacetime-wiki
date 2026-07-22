"""Tests for API server config — Settings model, CORS validation, env overrides."""

from __future__ import annotations

import os
import sys
from unittest.mock import patch

sys.path.insert(0, "server/api-server")


class TestSettingsDefaults:
    def _reload(self):
        import importlib
        import config
        importlib.reload(config)
        return config.settings

    def test_default_host(self):
        s = self._reload()
        assert s.stdb_host == "localhost:3001"

    def test_default_database(self):
        s = self._reload()
        assert s.stdb_database == "spacetime-wiki"

    def test_default_port(self):
        s = self._reload()
        assert s.api_port == 8711

    def test_debug_defaults_to_true(self):
        s = self._reload()
        assert s.debug is True

    def test_cors_origins_default(self):
        s = self._reload()
        assert "http://localhost:5184" in s.cors_origins

    def test_api_key_header(self):
        s = self._reload()
        assert s.api_key_header == "X-API-Key"


class TestSettingsOverrides:
    def _reload(self):
        import importlib
        import config
        importlib.reload(config)
        return config.settings

    def test_custom_host(self):
        with patch.dict(os.environ, {"STDB_HOST": "127.0.0.1:3001"}):
            s = self._reload()
            assert s.stdb_host == "127.0.0.1:3001"

    def test_custom_database(self):
        with patch.dict(os.environ, {"STDB_DATABASE": "wiki_prod"}):
            s = self._reload()
            assert s.stdb_database == "wiki_prod"

    def test_custom_port(self):
        with patch.dict(os.environ, {"API_PORT": "8080"}):
            s = self._reload()
            assert s.api_port == 8080

    def test_debug_false(self):
        with patch.dict(os.environ, {"DEBUG": "false"}):
            s = self._reload()
            assert s.debug is False

    def test_custom_cors(self):
        with patch.dict(os.environ, {"CORS_ORIGINS": '["https://wiki.example.com","https://app.example.com"]'}):
            s = self._reload()
            assert len(s.cors_origins) == 2
            assert "https://wiki.example.com" in s.cors_origins


class TestCorsOriginsSafe:
    def _reload(self):
        import importlib
        import config
        importlib.reload(config)
        return config.settings

    def test_no_wildcard(self):
        """Normal origins pass through unchanged."""
        with patch.dict(os.environ, {"CORS_ORIGINS": '["https://a.example.com","https://b.example.com"]'}):
            s = self._reload()
            safe = s.cors_origins_safe
            assert "https://a.example.com" in safe
            assert "https://b.example.com" in safe

    def test_wildcard_removed(self):
        """Wildcard origins like '*' should be filtered out and warned about."""
        with patch.dict(os.environ, {"CORS_ORIGINS": '["*","https://valid.example.com"]'}):
            s = self._reload()
            safe = s.cors_origins_safe
            assert "*" not in safe
            assert "https://valid.example.com" in safe

    def test_only_wildcard_falls_back(self):
        """If all origins are wildcards, fall back to safe defaults."""
        with patch.dict(os.environ, {"CORS_ORIGINS": '["*"]'}):
            s = self._reload()
            safe = s.cors_origins_safe
            assert "*" not in safe
            assert "http://localhost:5184" in safe

    def test_empty_origins_stripped(self):
        with patch.dict(os.environ, {"CORS_ORIGINS": '["  ","","https://valid.example.com"]'}):
            s = self._reload()
            safe = s.cors_origins_safe
            assert "https://valid.example.com" in safe
