"""MCP Server configuration."""

import os

STDB_HOST = os.getenv("STDB_HOST", "192.168.1.10:3001")
STDB_DATABASE = os.getenv(
    "STDB_DATABASE",
    "c2003d19339f9932811b3d54bf9b15e18ae48a47a8c8b7135a47367faa03481e",
)
MCP_SERVER_NAME = os.getenv("MCP_SERVER_NAME", "spacetime-wiki-mcp")
