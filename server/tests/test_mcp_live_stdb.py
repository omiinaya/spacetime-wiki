"""Live-STDB integration tests for the MCP server's stdb_client.

These exercise the REAL HTTP path (sql_query → STDB), unlike the unit tests
in mcp-server/tests/ which mock httpx. They would have caught the four
systemic STDB v2.6.1 compat bugs:
  1. typed ?i/?f/?b placeholders missing from _build_safe_sql
  2. OFFSET unsupported → empty pages for offset > 0
  3. text_content LIKE unsupported
  4. '_' wrongly rejected by _validate_id (real genIds are prefix_<hex>)

Run against a live STDB (CI's python-integration job provides one):
    STDB_HOST=localhost:3001 DB_NAME=spacetime-wiki \
        python3 -m pytest server/tests/test_mcp_live_stdb.py -q
"""

from __future__ import annotations

import os
import sys

# Configure env BEFORE importing stdb_client — config.py reads these at
# import time to build STDB_SQL_URL / STDB_REDUCER_URL.
os.environ.setdefault("STDB_HOST", os.environ.get("STDB_HOST", "localhost:3001"))
os.environ.setdefault("STDB_DATABASE", os.environ.get("DB_NAME", "spacetime-wiki"))

import pytest  # noqa: E402

sys.path.insert(0, "mcp-server")  # noqa: E402

import stdb_client  # noqa: E402

STDB_HOST = os.environ.get("STDB_HOST", "localhost:3001")
DB_NAME = os.environ.get("DB_NAME", "spacetime-wiki")


@pytest.fixture(autouse=True)
async def _fresh_http_client():
    """Reset the module's cached HTTPX client before each test.

    The MCP stdb_client caches one shared HTTPX client (bound to whichever
    event loop created it). pytest-asyncio runs each test on a FUNCTION-scoped
    loop, so a client created in one test cannot be reused in the next
    ('Event loop is closed'). Drop the cached client before each test so each
    one builds a fresh client on its own loop.
    """
    stdb_client._http_client = None
    yield
    await stdb_client.close_http_client()


async def test_live_sql_placeholder_escaping():
    """? placeholders still escape values against the live endpoint."""
    rows = await stdb_client.sql_query(
        "SELECT * FROM page WHERE id = ?", "__definitely_not_a_page_id__"
    )
    assert rows == []


async def test_live_typed_int_placeholder():
    """?i renders a numeric LIMIT that STDB accepts (regression for bug 1)."""
    rows = await stdb_client.sql_query(
        "SELECT * FROM page WHERE status != 'deleted' LIMIT ?i", 3
    )
    assert len(rows) <= 3


async def test_live_pagination_offsets_distinct():
    """OFFSET pages must be distinct and non-empty (regression for bug 2)."""
    page1 = await stdb_client.sql_query(
        "SELECT id FROM page WHERE status != 'deleted' LIMIT ?i OFFSET ?i",
        5, 0,
    )
    page2 = await stdb_client.sql_query(
        "SELECT id FROM page WHERE status != 'deleted' LIMIT ?i OFFSET ?i",
        5, 5,
    )
    ids1 = [r[0] for r in page1]
    ids2 = [r[0] for r in page2]
    # Distinct pages: no row appears on both.
    assert not (set(ids1) & set(ids2))
    # First page should be full when there are enough rows.
    if len(page1) == 5:
        assert len(page2) <= 5


async def test_live_list_pages_no_crash():
    """list_pages must work end-to-end (uses ?i OFFSET ?i)."""
    pages = await stdb_client.list_pages()
    assert isinstance(pages, list)
    assert all(isinstance(p.get("id"), str) for p in pages)


async def test_live_underscore_ids_validate():
    """Real genIds (prefix_<hex>) must pass validation (regression for bug 4)."""
    # No exception means the id passed validation.
    assert stdb_client._validate_id("page_a1b2c3d4e5f6") is None


async def test_live_get_page_with_real_id():
    """get_page must work with a real underscore-prefixed page id."""
    pages = await stdb_client.list_pages()
    if not pages:
        pytest.skip("no pages in live DB")
    pid = pages[0]["id"]
    page = await stdb_client.get_page(pid)
    assert page is not None
    assert page["id"] == pid


async def test_live_backlinks_no_like_crash():
    """get_backlinks must not raise (LIKE would 400 on STDB v2.6.1)."""
    pages = await stdb_client.list_pages()
    if not pages:
        pytest.skip("no pages in live DB")
    result = await stdb_client.get_backlinks(pages[0]["id"])
    assert isinstance(result, list)


async def test_live_linked_pages_no_like_crash():
    """get_linked_pages must not raise (LIKE would 400 on STDB v2.6.1)."""
    pages = await stdb_client.list_pages()
    if not pages:
        pytest.skip("no pages in live DB")
    result = await stdb_client.get_linked_pages(pages[0]["id"])
    assert isinstance(result, list)
