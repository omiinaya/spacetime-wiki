"""Shared test fixtures and STDB HTTP client for integration tests."""

from __future__ import annotations

import json
import os
from collections.abc import AsyncIterator

import httpx
import pytest

STDB_HOST = os.environ.get("STDB_HOST", "localhost:3001")
DB_NAME = os.environ.get("DB_NAME", "spacetime-wiki")


@pytest.fixture(scope="session")
def stdb_host() -> str:
    return STDB_HOST


@pytest.fixture(scope="session")
def db_name() -> str:
    return DB_NAME


@pytest.fixture(scope="session")
def http_base(stdb_host: str) -> str:
    return f"http://{stdb_host}/v1/database/{DB_NAME}"


@pytest.fixture(scope="function")
async def http_client() -> AsyncIterator[httpx.AsyncClient]:
    """Function-scoped HTTP client.

    Session-scoped async fixtures bind the httpx client to the SESSION event
    loop, but pytest-asyncio runs each test on a FUNCTION loop — calls from
    the test then raise 'Event loop is closed' / cross-loop RuntimeError.
    Function scope gives every test a client on its own loop (slightly more
    setup cost, but correct).
    """
    async with httpx.AsyncClient(timeout=30) as client:
        yield client


async def call_reducer(
    client: httpx.AsyncClient,
    base: str,
    reducer: str,
    args: list,
) -> dict | None:
    """Call a SpacetimeDB reducer and return its result (if any)."""
    resp = await client.post(f"{base}/call/{reducer}", json=args)
    if resp.status_code >= 400:
        detail = resp.text[:500]
        raise RuntimeError(
            f"Reducer '{reducer}' failed ({resp.status_code}): {detail}"
        )
    text = resp.text.strip()
    return json.loads(text) if text else None


async def sql_query(
    client: httpx.AsyncClient,
    base: str,
    sql: str,
) -> list[list]:
    """Execute a SQL query and return rows (list of lists)."""
    resp = await client.post(f"{base}/sql", content=sql, headers={"Content-Type": "text/plain"})
    if resp.status_code >= 400:
        detail = resp.text[:500]
        raise RuntimeError(f"SQL query failed ({resp.status_code}): {detail}")
    data = resp.json()
    return (data[0] or {}).get("rows", [])


async def count_rows(client: httpx.AsyncClient, base: str, table: str) -> int:
    """Count all rows in a table."""
    rows = await sql_query(client, base, f"SELECT COUNT(*) AS n FROM {table}")
    return int(rows[0][0]) if rows else 0


async def reducer_succeeds(
    client: httpx.AsyncClient,
    base: str,
    reducer: str,
    args: list,
) -> bool:
    """Return True if a reducer call succeeds (does not raise)."""
    try:
        await call_reducer(client, base, reducer, args)
        return True
    except RuntimeError:
        return False


# ─── Assertion helpers ─────────────────────────────────────────────────────────

def assert_row_count(rows: list, n: int) -> None:
    """Assert that a SQL result has exactly n rows."""
    assert len(rows) == n, f"Expected {n} row(s), got {len(rows)}"


def assert_gt(a: int, b: int) -> None:
    assert a > b, f"Expected {a} > {b}"
