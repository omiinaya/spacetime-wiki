"""MCP Server configuration."""

import os

STDB_HOST = os.getenv("STDB_HOST", "127.0.0.1:3001")
STDB_DATABASE = os.getenv(
    "STDB_DATABASE",
    "c20000000000000000000000000000000000000000000000000000000000000000",
)
MCP_SERVER_NAME = os.getenv("MCP_SERVER_NAME", "spacetime-wiki-mcp")
