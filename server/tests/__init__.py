"""SpacetimeWiki integration tests.

These tests exercise SpacetimeDB reducers and SQL queries through the
STDB HTTP API (port 3001).  They require a running SpacetimeDB instance
with the spacetime-wiki module published.

Run with:
    cd server && python -m pytest tests/ -v

Or via docker-compose:
    docker compose run --rm tests
"""
