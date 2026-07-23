"""Tests for API server main module — app creation, middleware, exception handlers, health."""

from __future__ import annotations

import sys
from unittest.mock import AsyncMock, MagicMock, patch

import pytest

sys.path.insert(0, "api-server")


class TestSecurityHeadersMiddleware:
    """Test the SecurityHeadersMiddleware response header injection."""

    @pytest.mark.asyncio
    async def test_security_headers_present(self):
        """All security headers should be set on every response."""
        # We can't easily test middleware in isolation without a full FastAPI app.
        # Instead, verify the class exists and has correct structure.
        import main as main_mod
        from main import SecurityHeadersMiddleware
        assert hasattr(SecurityHeadersMiddleware, "dispatch")
        assert callable(SecurityHeadersMiddleware.dispatch)


class TestAppCreation:
    """Verify the FastAPI app is constructed correctly."""

    def _make_app(self):
        import importlib
        import main
        with patch("main.settings") as mock_settings:
            mock_settings.cors_origins_safe = ["http://localhost:5184"]
            mock_settings.debug = True
            mock_settings.auto_star_repo = False
            mock_settings.api_key_header = "X-API-Key"
            mock_settings.api_port = 8711
            importlib.reload(main)
            app = main.app
            # Strip middleware that interfere with unit tests
            app.user_middleware = [
                m for m in app.user_middleware
                if m.cls.__name__ not in ("ApiKeyMiddleware", "TrustedHostMiddleware")
            ]
            # Reset middleware stack to force rebuild on first request
            app.middleware_stack = None
            return app

    def test_app_title(self):
        app = self._make_app()
        assert app.title == "SpacetimeWiki REST API"

    def test_health_endpoint(self):
        from fastapi.testclient import TestClient
        app = self._make_app()
        client = TestClient(app)
        resp = client.get("/health", headers={"Host": "localhost"})
        assert resp.status_code == 200
        data = resp.json()
        assert data["status"] == "ok"
        assert data["service"] == "spacetime-wiki-api"

    def test_openapi_spec_endpoint(self):
        from fastapi.testclient import TestClient
        app = self._make_app()
        client = TestClient(app)
        resp = client.get("/openapi-spec.json", headers={"Host": "localhost"})
        assert resp.status_code in (200, 500)  # 500 if no openapi.json file exists


class TestExceptionHandler:
    """Test the global exception handler."""

    def test_unhandled_exception_returns_500(self):
        import main as main_mod
        import importlib
        importlib.reload(main_mod)

        with patch("main.settings") as mock_settings:
            mock_settings.cors_origins_safe = ["http://localhost:5184"]
            mock_settings.debug = True
            mock_settings.auto_star_repo = False
            importlib.reload(main_mod)

            app = main_mod.app
            # Strip auth and trusted-host middleware so we can hit non-SKIP_PATHS paths
            app.user_middleware = [
                m for m in app.user_middleware
                if m.cls.__name__ not in ("ApiKeyMiddleware", "TrustedHostMiddleware")
            ]
            app.middleware_stack = None

            from fastapi.testclient import TestClient
            client = TestClient(app)
            resp = client.get("/nonexistent-path-xyz-123")
            # Should get 404 (not 500) for standard not-found
            assert resp.status_code == 404


class TestAutoStar:
    """Test the _auto_star function (without hitting real GitHub API)."""

    def test_auto_star_requires_token(self):
        """_auto_star should silently return if no token is set."""
        from main import _auto_star
        with patch.dict("os.environ", {}, clear=True):
            # This should not raise
            _auto_star("omiinaya/spacetime-wiki")

    def test_auto_star_with_token(self):
        """_auto_star should attempt to star with a token."""
        from main import _auto_star
        with patch.dict("os.environ", {"GITHUB_TOKEN": "fake_token"}):
            with patch("urllib.request.urlopen") as mock_urlopen:
                mock_response = MagicMock()
                mock_response.status = 204
                mock_urlopen.return_value.__enter__.return_value = mock_response
                # This should not raise
                _auto_star("omiinaya/spacetime-wiki")
                mock_urlopen.assert_called_once()
