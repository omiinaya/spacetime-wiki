"""SpacetimeWiki REST API — Configuration."""

import os
from typing import Optional

from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    stdb_host: str = os.getenv("STDB_HOST", "localhost:3001")
    stdb_database: str = os.getenv(
        "STDB_DATABASE",
        "spacetime-wiki",
    )
    api_port: int = int(os.getenv("API_PORT", "8711"))
    api_key_header: str = "X-API-Key"
    rate_limit: str = os.getenv("RATE_LIMIT", "100/minute")
    auto_star_repo: bool = os.getenv("AUTO_STAR_REPO", "false").lower() in ("1", "true", "yes")
    debug: bool = os.getenv("DEBUG", "true").lower() in ("1", "true", "yes", "")
    cors_origins: list[str] = os.getenv("CORS_ORIGINS", "http://localhost:5184,https://wiki.example.com").split(",")

    @property
    def cors_origins_safe(self) -> list[str]:
        """Return validated CORS origins, preventing wildcard with credentials."""
        origins = self.cors_origins
        unsafe = False
        validated = []
        for o in origins:
            o = o.strip()
            if not o:
                continue
            if "*" in o:
                unsafe = True
                import warnings
                warnings.warn(
                    f"CORS_ORIGINS contains wildcard pattern {o!r} which is unsafe "
                    "with allow_credentials=True. Removing it."
                )
            else:
                validated.append(o)
        if unsafe and not validated:
            validated = ["http://localhost:5184", "http://localhost:8711", "https://wiki.example.com"]
        return validated

    model_config = {"env_file": ".env", "env_file_encoding": "utf-8"}


settings = Settings()
