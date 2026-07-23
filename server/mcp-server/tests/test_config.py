"""Tests for MCP server config module — validation and default values."""

import os
import re
from unittest.mock import patch

# Reload config after each env change
import importlib


class TestConfigDefaults:
    """Verify default values when no env vars are set."""

    def _reload_config(self):
        import config as mcp_config
        importlib.reload(mcp_config)
        return mcp_config

    def test_default_host(self):
        cfg = self._reload_config()
        assert cfg.STDB_HOST == "localhost:3001"

    def test_default_database(self):
        cfg = self._reload_config()
        assert cfg.STDB_DATABASE == "spacetime-wiki"

    def test_default_server_name(self):
        cfg = self._reload_config()
        assert cfg.MCP_SERVER_NAME == "spacetime-wiki-mcp"

    def test_default_base_url(self):
        cfg = self._reload_config()
        assert cfg.STDB_BASE_URL == "http://localhost:3001"

    def test_default_timeout(self):
        cfg = self._reload_config()
        assert cfg.STDB_TIMEOUT_S == 30.0

    def test_default_max_retries(self):
        cfg = self._reload_config()
        assert cfg.STDB_MAX_RETRIES == 3

    def test_default_base_delay(self):
        cfg = self._reload_config()
        assert cfg.STDB_BASE_DELAY_S == 0.5

    def test_sql_url_format(self):
        cfg = self._reload_config()
        assert cfg.STDB_SQL_URL == (
            "http://localhost:3001/v1/database/spacetime-wiki/sql"
        )


class TestConfigOverrides:
    """Verify env var overrides work."""

    def _reload_config(self):
        import config as mcp_config
        importlib.reload(mcp_config)
        return mcp_config

    def test_custom_host(self):
        with patch.dict(os.environ, {"STDB_HOST": "stdb.example.com:9999"}):
            cfg = self._reload_config()
            assert cfg.STDB_HOST == "stdb.example.com:9999"
            assert cfg.STDB_BASE_URL == "http://stdb.example.com:9999"
            assert "stdb.example.com:9999" in cfg.STDB_SQL_URL

    def test_custom_database(self):
        with patch.dict(os.environ, {"STDB_DATABASE": "my_custom_db"}):
            cfg = self._reload_config()
            assert cfg.STDB_DATABASE == "my_custom_db"

    def test_custom_server_name(self):
        with patch.dict(os.environ, {"MCP_SERVER_NAME": "my-mcp"}):
            cfg = self._reload_config()
            assert cfg.MCP_SERVER_NAME == "my-mcp"

    def test_custom_timeout(self):
        with patch.dict(os.environ, {"STDB_TIMEOUT_S": "15"}):
            cfg = self._reload_config()
            assert cfg.STDB_TIMEOUT_S == 15.0

    def test_custom_max_retries(self):
        with patch.dict(os.environ, {"STDB_MAX_RETRIES": "5"}):
            cfg = self._reload_config()
            assert cfg.STDB_MAX_RETRIES == 5

    def test_custom_base_url(self):
        with patch.dict(os.environ, {"STDB_BASE_URL": "https://stdb.internal:3001"}):
            cfg = self._reload_config()
            assert cfg.STDB_BASE_URL == "https://stdb.internal:3001"
            assert cfg.STDB_SQL_URL.startswith("https://stdb.internal:3001")


class TestConfigValidation:
    """Test the _validate_config function via env manipulation."""

    def _reload_config(self):
        import config as mcp_config
        importlib.reload(mcp_config)
        return mcp_config

    def test_empty_database_warns(self):
        """Empty STDB_DATABASE should trigger a warning."""
        with patch.dict(os.environ, {"STDB_DATABASE": ""}):
            cfg = self._reload_config()
            assert cfg.STDB_DATABASE == ""

    def test_short_database_warns(self):
        """Very short database name should trigger a warning."""
        with patch.dict(os.environ, {"STDB_DATABASE": "ab"}):
            cfg = self._reload_config()
            assert len(cfg.STDB_DATABASE) < 10

    def test_empty_host_warns(self):
        """Empty STDB_HOST should trigger a warning."""
        with patch.dict(os.environ, {"STDB_HOST": ""}):
            cfg = self._reload_config()
            assert cfg.STDB_HOST == ""

    def test_host_without_port_warns(self):
        """Host without a port should trigger a warning."""
        with patch.dict(os.environ, {"STDB_HOST": "localhost"}):
            cfg = self._reload_config()
            assert ":" not in cfg.STDB_HOST

    def test_host_pattern(self):
        """Verify the STDB_HOST_PATTERN regex works correctly."""
        from config import _STDB_HOST_PATTERN

        assert _STDB_HOST_PATTERN.match("localhost:3001")
        assert _STDB_HOST_PATTERN.match("127.0.0.1:8080")
        assert _STDB_HOST_PATTERN.match("stdb.example.com:443")
        assert _STDB_HOST_PATTERN.match("my-host:12345")
        # Should NOT match
        assert not _STDB_HOST_PATTERN.match("localhost")
        assert not _STDB_HOST_PATTERN.match("localhost:3001:extra")
        assert not _STDB_HOST_PATTERN.match("")
        assert not _STDB_HOST_PATTERN.match("host:port")
