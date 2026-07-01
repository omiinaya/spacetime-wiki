"""MCP Server configuration."""

import os

STDB_HOST = os.getenv("STDB_HOST", "192.168.1.10:3001")
STDB_DATABASE = os.getenv(
    "STDB_DATABASE",
    "c200926c025aa06e282de1bbe461b13f618ae8958f6e2e57bad445abcf27a502",
)
MCP_SERVER_NAME = os.getenv("MCP_SERVER_NAME", "spacetime-wiki-mcp")
