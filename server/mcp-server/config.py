"""MCP Server configuration with validation."""

import os
import re
import logging

logger = logging.getLogger("spacetime-wiki-mcp.config")

_STDB_HOST_PATTERN = re.compile(
    r"^[\w.-]+:\d{2,5}$"  # hostname_or_ip:port
)


def _validate_config() -> None:
    """Validate required config at import time. Logs warnings for suspicious values."""
    issues: list[str] = []

    if not STDB_DATABASE:
        issues.append("STDB_DATABASE is empty — MCP queries will fail")
    elif len(STDB_DATABASE) < 10:
        issues.append(
            f"STDB_DATABASE looks suspiciously short ({len(STDB_DATABASE)} chars)"
        )

    if not STDB_HOST:
        issues.append("STDB_HOST is empty — MCP cannot reach SpacetimeDB")
    elif not _STDB_HOST_PATTERN.match(STDB_HOST):
        if ":" not in STDB_HOST:
            issues.append(
                f"STDB_HOST={STDB_HOST!r} has no port — defaulting to 3001"
            )
        else:
            issues.append(
                f"STDB_HOST={STDB_HOST!r} does not look like host:port"
            )

    for issue in issues:
        logger.warning("Config issue: %s", issue)


# ─── Config values ──────────────────────────────────────────────────────────

STDB_HOST: str = os.getenv("STDB_HOST", "localhost:3001")
STDB_DATABASE: str = os.getenv(
    "STDB_DATABASE",
    "spacetime-wiki",
)
MCP_SERVER_NAME: str = os.getenv("MCP_SERVER_NAME", "spacetime-wiki-mcp")

# Derived / convenience
STDB_BASE_URL: str = os.getenv(
    "STDB_BASE_URL",
    f"http://{STDB_HOST}"
)

STDB_SQL_URL: str = f"{STDB_BASE_URL}/v1/database/{STDB_DATABASE}/sql"

# Connection tuning
STDB_TIMEOUT_S: float = float(os.getenv("STDB_TIMEOUT_S", "30"))
STDB_MAX_RETRIES: int = int(os.getenv("STDB_MAX_RETRIES", "3"))
STDB_BASE_DELAY_S: float = float(os.getenv("STDB_BASE_DELAY_S", "0.5"))

_validate_config()
