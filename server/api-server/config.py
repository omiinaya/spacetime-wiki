"""SpacetimeWiki REST API — Configuration."""

import os
from typing import Optional

from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    stdb_host: str = os.getenv("STDB_HOST", "127.0.0.1:3001")
    stdb_database: str = os.getenv(
        "STDB_DATABASE",
        "spacetime-wiki",
    )
    api_port: int = int(os.getenv("API_PORT", "8711"))
    api_key_header: str = "X-API-Key"
    rate_limit: str = os.getenv("RATE_LIMIT", "100/minute")
    auto_star_repo: bool = os.getenv("AUTO_STAR_REPO", "false").lower() in ("1", "true", "yes")
    debug: bool = os.getenv("DEBUG", "true").lower() in ("1", "true", "yes", "")

    model_config = {"env_file": ".env", "env_file_encoding": "utf-8"}


settings = Settings()
