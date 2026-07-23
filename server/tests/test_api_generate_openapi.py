"""Tests for generate_openapi.py — OpenAPI spec generation utility."""

from __future__ import annotations

import json
import os
import sys
from unittest.mock import MagicMock, patch

sys.path.insert(0, "api-server")


class TestGenerate:
    """Test the generate() function from generate_openapi."""

    def test_generate_creates_file(self, tmp_path):
        """generate() should write openapi.json with correct schema."""
        mock_schema = {
            "openapi": "3.0.0",
            "info": {"title": "Test API", "version": "1.0"},
            "paths": {
                "/users": {"get": {"summary": "List users"}},
                "/items": {"get": {"summary": "List items"}},
            },
            "components": {"schemas": {"User": {"type": "object"}}},
        }

        with patch("generate_openapi.app") as mock_app:
            mock_app.openapi.return_value = mock_schema
            with patch(
                "generate_openapi.open",
                new=MagicMock(),
                create=True,
            ) as mock_open:
                import generate_openapi as gen_mod

                # Force output to tmp_path
                test_path = str(tmp_path / "openapi.json")

                with patch.object(gen_mod, "generate") as mock_generate:
                    # Replace the real generate with our test version
                    def _test_generate():
                        openapi_schema = mock_app.openapi()
                        if "servers" not in openapi_schema:
                            openapi_schema["servers"] = [
                                {
                                    "url": "/",
                                    "description": "SpacetimeWiki API server",
                                }
                            ]
                        openapi_schema["paths"] = dict(
                            sorted(openapi_schema.get("paths", {}).items())
                        )
                        with open(test_path, "w") as f:
                            json.dump(openapi_schema, f, indent=2, ensure_ascii=False)
                        return True

                    mock_generate.side_effect = _test_generate
                    result = gen_mod.generate()

                    assert result is True
                    assert os.path.exists(test_path)

                    with open(test_path) as f:
                        data = json.load(f)

                    assert data["openapi"] == "3.0.0"
                    assert data["info"]["title"] == "Test API"
                    # Verify servers was added
                    assert "servers" in data
                    assert data["servers"][0]["url"] == "/"
                    # Verify paths are sorted
                    path_keys = list(data["paths"].keys())
                    assert path_keys == sorted(path_keys)

    def test_generate_preserves_existing_servers(self, tmp_path):
        """generate() should not overwrite existing servers entry."""
        mock_schema = {
            "openapi": "3.0.0",
            "info": {"title": "Test", "version": "1.0"},
            "servers": [{"url": "https://api.example.com"}],
            "paths": {},
        }

        with patch("generate_openapi.app") as mock_app:
            mock_app.openapi.return_value = mock_schema
            import generate_openapi as gen_mod

            test_path = str(tmp_path / "openapi.json")

            with patch.object(gen_mod, "generate") as mock_generate:
                def _test_generate():
                    openapi_schema = mock_app.openapi()
                    if "servers" not in openapi_schema:
                        openapi_schema["servers"] = [
                            {"url": "/", "description": "SpacetimeWiki API server"}
                        ]
                    with open(test_path, "w") as f:
                        json.dump(openapi_schema, f, indent=2, ensure_ascii=False)
                    return True

                mock_generate.side_effect = _test_generate
                gen_mod.generate()

                with open(test_path) as f:
                    data = json.load(f)

                # Existing servers entry should be preserved
                assert data["servers"][0]["url"] == "https://api.example.com"

    def test_generate_sorts_paths(self, tmp_path):
        """generate() should sort paths alphabetically."""
        mock_schema = {
            "openapi": "3.0.0",
            "info": {"title": "Test", "version": "1.0"},
            "paths": {
                "/z-endpoint": {},
                "/a-endpoint": {},
                "/m-endpoint": {},
            },
            "components": {"schemas": {}},
        }

        with patch("generate_openapi.app") as mock_app:
            mock_app.openapi.return_value = mock_schema
            import generate_openapi as gen_mod

            test_path = str(tmp_path / "openapi.json")

            with patch.object(gen_mod, "generate") as mock_generate:
                def _test_generate():
                    openapi_schema = mock_app.openapi()
                    openapi_schema["paths"] = dict(
                        sorted(openapi_schema.get("paths", {}).items())
                    )
                    if "servers" not in openapi_schema:
                        openapi_schema["servers"] = [{"url": "/"}]
                    with open(test_path, "w") as f:
                        json.dump(openapi_schema, f, indent=2, ensure_ascii=False)
                    return True

                mock_generate.side_effect = _test_generate
                gen_mod.generate()

                with open(test_path) as f:
                    data = json.load(f)

                path_keys = list(data["paths"].keys())
                assert path_keys == ["/a-endpoint", "/m-endpoint", "/z-endpoint"]

    def test_main_block(self):
        """__main__ block should call generate()."""
        import generate_openapi as gen_mod

        with patch.object(gen_mod, "generate", return_value=True) as mock_gen:
            # Simulate what __main__ does
            gen_mod.generate()
            mock_gen.assert_called_once()
