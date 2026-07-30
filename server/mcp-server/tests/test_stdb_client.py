"""Tests for MCP server STDB client — SQL building, row mappers, validation, entity helpers."""

from __future__ import annotations

import sys
from unittest.mock import patch

import pytest

sys.path.insert(0, "server/mcp-server")

# Mock httpx before importing stdb_client
patch("stdb_client.httpx").start()

from stdb_client import (
    TABLE_NAMES,
    CircuitBreaker,
    CircuitState,
    STDBError,
    STDBErrorCode,
    _bool,
    _build_safe_sql,
    _clamp_int,
    _int,
    _safe_quote,
    _str,
    _validate_id,
    _validate_non_empty_string,
    map_collection,
    map_page,
    map_tag,
    map_user,
)


class TestSafeQuote:
    def test_basic(self):
        assert _safe_quote("hello") == "'hello'"

    def test_with_single_quote(self):
        assert _safe_quote("it's") == "'it''s'"

    def test_with_backslash(self):
        assert _safe_quote("path\\to") == "'path\\\\to'"

    def test_with_both(self):
        assert _safe_quote("it's\\way") == "'it''s\\\\way'"

    def test_empty(self):
        assert _safe_quote("") == "''"

    def test_non_string_raises(self):
        with pytest.raises(TypeError, match="string"):
            _safe_quote(42)


class TestBuildSafeSQL:
    def test_no_args(self):
        assert _build_safe_sql("SELECT 1") == "SELECT 1"

    def test_one_string(self):
        sql = _build_safe_sql("SELECT * FROM page WHERE id = ?", "p1")
        assert sql == "SELECT * FROM page WHERE id = 'p1'"

    def test_multiple_args(self):
        sql = _build_safe_sql(
            "SELECT * FROM page WHERE id = ? AND status = ?",
            "p1", "published",
        )
        assert sql == "SELECT * FROM page WHERE id = 'p1' AND status = 'published'"

    def test_none_becomes_null(self):
        sql = _build_safe_sql("UPDATE page SET title = ? WHERE id = ?", None, "p1")
        assert "NULL" in sql

    def test_arg_count_mismatch(self):
        with pytest.raises(ValueError, match="Expected"):
            _build_safe_sql("SELECT * FROM page WHERE id = ?", "a", "b")

    def test_quote_escaping(self):
        sql = _build_safe_sql("SELECT * FROM page WHERE title = ?", "it's a test")
        assert "it''s" in sql


class TestValidateId:
    def test_valid(self):
        _validate_id("abc123def")

    def test_valid_hex(self):
        _validate_id("a1b2c3d4e5f6")

    def test_empty_raises(self):
        with pytest.raises(ValueError, match="must not be empty"):
            _validate_id("")

    def test_whitespace_raises(self):
        with pytest.raises(ValueError, match="must not be empty"):
            _validate_id("   ")

    def test_sql_injection_chars(self):
        with pytest.raises(ValueError, match="invalid characters"):
            _validate_id("'; DROP TABLE page; --")

    def test_too_long(self):
        with pytest.raises(ValueError, match="exceeds maximum"):
            _validate_id("a" * 300)

    def test_valid_alphanumeric(self):
        _validate_id("abc123def456")


class TestValidateNonEmptyString:
    def test_valid(self):
        assert _validate_non_empty_string("hello", "label") == "hello"

    def test_strips(self):
        assert _validate_non_empty_string("  hello  ", "label") == "hello"

    def test_empty_raises(self):
        with pytest.raises(ValueError, match="must not be empty"):
            _validate_non_empty_string("", "label")

    def test_non_string_raises(self):
        with pytest.raises(TypeError, match="must be a string"):
            _validate_non_empty_string(42, "label")


class TestClampInt:
    def test_normal(self):
        assert _clamp_int(5, "count", 0, 0, 100) == 5

    def test_none_default(self):
        assert _clamp_int(None, "count", 10, 0, 100) == 10

    def test_below_min(self):
        assert _clamp_int(-5, "count", 0, 0, 100) == 0

    def test_above_max(self):
        assert _clamp_int(200, "count", 0, 0, 100) == 100

    def test_at_min(self):
        assert _clamp_int(0, "count", 0, 0, 100) == 0

    def test_at_max(self):
        assert _clamp_int(100, "count", 0, 0, 100) == 100

    def test_string_int_accepted(self):
        assert _clamp_int("5", "count", 0, 0, 100) == 5

    def test_non_numeric_raises(self):
        with pytest.raises(TypeError, match="must be an integer"):
            _clamp_int("abc", "count", 0, 0, 100)


class TestSTDBError:
    def test_default_code(self):
        err = STDBError("something failed")
        assert err.code == STDBErrorCode.QUERY_FAILED

    def test_custom_code(self):
        err = STDBError("timeout", code=STDBErrorCode.TIMEOUT)
        assert err.code == STDBErrorCode.TIMEOUT

    def test_to_dict(self):
        err = STDBError("oops", code=STDBErrorCode.QUERY_FAILED)
        d = err.to_dict()
        assert d["error"] == "oops"
        assert d["code"] == "STDB_QUERY_FAILED"
        assert "correlation_id" in d

    def test_correlation_id(self):
        err = STDBError("fail", correlation_id="cid-123")
        assert err.correlation_id == "cid-123"

    def test_original_error(self):
        cause = ValueError("root cause")
        err = STDBError("wrapped", original_error=cause)
        assert err.original_error is cause


class TestSTDBErrorCode:
    def test_all_codes_present(self):
        codes = [
            STDBErrorCode.CONNECTION_FAILED,
            STDBErrorCode.TIMEOUT,
            STDBErrorCode.QUERY_FAILED,
            STDBErrorCode.INVALID_RESPONSE,
            STDBErrorCode.CIRCUIT_OPEN,
            STDBErrorCode.VALIDATION_ERROR,
            STDBErrorCode.NOT_FOUND,
        ]
        assert len(codes) == 7


class TestCircuitBreaker:
    @pytest.mark.asyncio
    async def test_initial_state_closed(self):
        cb = CircuitBreaker()
        assert cb.state == CircuitState.CLOSED

    @pytest.mark.asyncio
    async def test_can_execute_when_closed(self):
        cb = CircuitBreaker()
        assert await cb.can_execute() is True

    @pytest.mark.asyncio
    async def test_opens_after_threshold_failures(self):
        cb = CircuitBreaker(failure_threshold=3, timeout=60)
        for _ in range(3):
            cb._record_failure()
        assert cb.state == CircuitState.OPEN

    @pytest.mark.asyncio
    async def test_cannot_execute_when_open(self):
        cb = CircuitBreaker(failure_threshold=1, timeout=3600)
        cb._record_failure()
        assert await cb.can_execute() is False

    @pytest.mark.asyncio
    async def test_half_open_after_timeout(self):
        cb = CircuitBreaker(failure_threshold=1, timeout=0.01)
        cb._record_failure()
        assert cb.state == CircuitState.OPEN
        import asyncio
        await asyncio.sleep(0.02)
        assert await cb.can_execute() is True
        assert cb.state == CircuitState.HALF_OPEN

    @pytest.mark.asyncio
    async def test_closes_after_success_in_half_open(self):
        cb = CircuitBreaker(failure_threshold=1, success_threshold=2, timeout=0.01)
        cb._record_failure()
        assert cb.state == CircuitState.OPEN
        import asyncio
        await asyncio.sleep(0.02)
        # can_execute transitions to HALF_OPEN
        can = await cb.can_execute()
        assert can is True
        assert cb.state == CircuitState.HALF_OPEN
        for _ in range(2):
            cb._record_success()
        assert cb.state == CircuitState.CLOSED

    @pytest.mark.asyncio
    async def test_execute_with_breaker_success(self):
        cb = CircuitBreaker()
        async def ok():
            return "ok"
        result = await cb.execute_with_breaker(ok)
        assert result == "ok"

    @pytest.mark.asyncio
    async def test_execute_with_breaker_failure(self):
        cb = CircuitBreaker(failure_threshold=1, timeout=3600)
        cb._record_failure()
        with pytest.raises(RuntimeError, match="Circuit breaker OPEN"):
            async def fail():
                raise ValueError("fail")
            await cb.execute_with_breaker(fail)


class TestTableNames:
    def test_known_tables(self):
        assert "page" in TABLE_NAMES
        assert "collection" in TABLE_NAMES
        assert "user" in TABLE_NAMES
        assert "api_key" in TABLE_NAMES
        assert "group" in TABLE_NAMES
        assert "group_member" in TABLE_NAMES

    def test_no_unknown_tables(self):
        assert "secret_table" not in TABLE_NAMES


class TestRowHelpers:
    def test_str_returns_empty_for_none(self):
        assert _str([], 0) == ""
        assert _str([None], 0) == ""

    def test_str_returns_value(self):
        assert _str(["hello"], 0) == "hello"

    def test_int_returns_zero_for_none(self):
        assert _int([], 0) == 0
        assert _int([None], 0) == 0

    def test_int_parses_value(self):
        assert _int([42], 0) == 42

    def test_int_returns_zero_on_error(self):
        assert _int(["abc"], 0) == 0

    def test_bool_returns_false_for_empty(self):
        assert _bool([], 0) is False

    def test_bool_truthy(self):
        assert _bool([True], 0) is True
        assert _bool([1], 0) is True

    def test_bool_falsy(self):
        assert _bool([False], 0) is False
        assert _bool([0], 0) is False


class TestMapPage:
    FULL_PAGE_ROW = [
        "p1",           # 0: id
        "Test Page",    # 1: title
        "test-page",    # 2: slug
        "",             # 3: content_json
        "Hello world",  # 4: text_content
        "c1",           # 5: collection_id
        "",             # 6: parent_page_id
        "published",    # 7: status
        "📄",           # 8: icon
        "gray",         # 9: color
        False,          # 10: full_width
        False,          # 11: is_pinned
        False,          # 12: is_template
        "",             # 13: template_id
        0,              # 14: sort_order
        "u1",           # 15: created_by
        "u1",           # 16: updated_by
        1000,           # 17: created_at
        2000,           # 18: updated_at
        1000,           # 19: published_at
        0,              # 20: deleted_at
    ]

    def test_full_row(self):
        p = map_page(self.FULL_PAGE_ROW)
        assert p["id"] == "p1"
        assert p["title"] == "Test Page"
        assert p["slug"] == "test-page"
        assert p["text_content"] == "Hello world"
        assert p["collection_id"] == "c1"
        assert p["status"] == "published"
        assert p["icon"] == "📄"
        assert p["created_at"] == 1000
        assert p["updated_at"] == 2000

    def test_short_row_uses_defaults(self):
        """Row with fewer columns gets defaults for missing fields."""
        short_row = ["p1", "Title", "slug"]
        p = map_page(short_row)
        assert p["id"] == "p1"
        assert p["title"] == "Title"
        assert p["slug"] == "slug"
        assert p["text_content"] == ""  # default for missing


class TestMapCollection:
    FULL_COL_ROW = [
        "c1",           # 0: id
        "Documents",    # 1: name
        "docs",         # 2: slug
        "All docs",     # 3: description
        "",             # 4: parent_id
        "📚",           # 5: icon
        "blue",         # 6: color
        0,              # 7: sort_order
        "u1",           # 8: created_by
        1000,           # 9: created_at
        2000,           # 10: updated_at
    ]

    def test_full_row(self):
        c = map_collection(self.FULL_COL_ROW)
        assert c["id"] == "c1"
        assert c["name"] == "Documents"
        assert c["slug"] == "docs"
        assert c["description"] == "All docs"
        assert c["icon"] == "📚"
        assert c["color"] == "blue"
        assert c["created_at"] == 1000

    def test_short_row(self):
        c = map_collection(["c1"])
        assert c["id"] == "c1"
        assert c["name"] == ""


class TestMapUser:
    FULL_USER_ROW = [
        "u1",       # 0: id
        "Alice",    # 1: name
        "a@b.com",  # 2: email
        "",         # 3: (skip)
        "admin",    # 4: role
        "",         # 5: (skip)
        1000,       # 6: created_at
    ]

    def test_full_row(self):
        u = map_user(self.FULL_USER_ROW)
        assert u["id"] == "u1"
        assert u["name"] == "Alice"
        assert u["email"] == "a@b.com"
        assert u["role"] == "admin"
        assert u["created_at"] == 1000


class TestMapTag:
    FULL_TAG_ROW = [
        "t1",       # 0: id
        "p1",       # 1: page_id
        "status",   # 2: name
        "done",     # 3: value
    ]

    def test_full_row(self):
        t = map_tag(self.FULL_TAG_ROW)
        assert t["id"] == "t1"
        assert t["page_id"] == "p1"
        assert t["name"] == "status"
        assert t["value"] == "done"
