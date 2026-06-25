"""SpacetimeWiki REST API — Configuration."""

import os
from typing import Optional

from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    stdb_host: str = os.getenv("STDB_HOST", "192.168.1.10:3001")
    stdb_database: str = os.getenv(
        "STDB_DATABASE",
        "c2003d19339f9932811b3d54bf9b15e18ae48a47a8c8b7135a47367faa03481e",
    )
    api_port: int = int(os.getenv("API_PORT", "8711"))
    api_key_header: str = "X-API-Key"
    rate_limit: str = os.getenv("RATE_LIMIT", "100/minute")

    model_config = {"env_file": ".env", "env_file_encoding": "utf-8"}


settings = Settings()
