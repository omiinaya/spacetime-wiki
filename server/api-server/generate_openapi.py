#!/usr/bin/env python3
"""Generate OpenAPI 3.0 spec from the FastAPI application.

Usage:
    python generate_openapi.py

Output: openapi.json in the current directory.
"""

import json
import sys
import os

# Add the api-server directory to the path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

# Disable external connections for schema generation
os.environ["STDB_HOST"] = "localhost:3001"
os.environ["STDB_DATABASE"] = "placeholder"

from main import app

def generate():
    """Generate and write the OpenAPI 3.0 spec."""
    openapi_schema = app.openapi()

    # Ensure the schema is properly serialized
    output_path = os.path.join(os.path.dirname(os.path.abspath(__file__)), "openapi.json")

    # Add server info
    if "servers" not in openapi_schema:
        openapi_schema["servers"] = [
            {
                "url": "/",
                "description": "SpacetimeWiki API server"
            }
        ]

    # Ensure paths are sorted for consistent output
    openapi_schema["paths"] = dict(sorted(openapi_schema.get("paths", {}).items()))

    with open(output_path, "w") as f:
        json.dump(openapi_schema, f, indent=2, ensure_ascii=False)

    print(f"✅ OpenAPI 3.0 spec generated: {output_path}")
    print(f"   Paths: {len(openapi_schema.get('paths', {}))}")
    print(f"   Schemas: {len(openapi_schema.get('components', {}).get('schemas', {}))}")
    return True


if __name__ == "__main__":
    generate()
