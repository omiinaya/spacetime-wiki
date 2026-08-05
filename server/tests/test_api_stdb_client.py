"""Tests for API server STDB client — SQL building, table name safety, row mappers."""

from __future__ import annotations

import sys
from unittest.mock import AsyncMock, patch

import pytest

sys.path.insert(0, "api-server")

from stdb_client import (
    _safe_quote,
    _safe_table,
    _build_safe_sql,
    _str,
    _int,
    _bool,
    map_page,
    map_collection,
    map_user,
    map_revision,
    map_comment,
    map_tag,
    map_attachment,
    map_share_link,
    map_api_key,
    _TABLE_NAMES,
    resolve_statement_offset,
)


class TestResolveStatementOffset:
    def test_no_offset(self):
        stmt, off = resolve_statement_offset("SELECT * FROM page LIMIT 5")
        assert off is None
        assert "LIMIT 5" in stmt

    def test_limit_offset_rewrites_limit(self):
        stmt, off = resolve_statement_offset(
            "SELECT * FROM page WHERE status != 'deleted' LIMIT 10 OFFSET 5"
        )
        assert off == 5
        assert stmt == "SELECT * FROM page WHERE status != 'deleted' LIMIT 15"
        assert "OFFSET" not in stmt

    def test_zero_offset_still_rewrites(self):
        stmt, off = resolve_statement_offset("SELECT * FROM page LIMIT 10 OFFSET 0")
        assert off == 0
        assert stmt == "SELECT * FROM page LIMIT 10"

    def test_bare_offset_stripped(self):
        stmt, off = resolve_statement_offset("SELECT * FROM page OFFSET 3")
        assert off == 3
        assert stmt == "SELECT * FROM page"
        assert "OFFSET" not in stmt

    def test_trailing_whitespace_allowed(self):
        stmt, off = resolve_statement_offset("SELECT * FROM page LIMIT 10 OFFSET 20\n")
        assert off == 20
        assert stmt == "SELECT * FROM page LIMIT 30"


class TestSafeQuote:
    def test_basic(self):
        assert _safe_quote("hello") == "'hello'"
    def test_with_single_quote(self):
        assert _safe_quote("it's") == "'it''s'"

    def test_with_backslash(self):
        assert _safe_quote("path\\to") == "'path\\\\to'"

    def test_both_escaped(self):
        assert _safe_quote("it's\\way") == "'it''s\\\\way'"

    def test_empty(self):
        assert _safe_quote("") == "''"

    def test_non_string_raises(self):
        with pytest.raises(TypeError, match="string"):
            _safe_quote(42)


class TestSafeTable:
    def test_known_table_unquoted(self):
        assert _safe_table("page") == "page"
        assert _safe_table("collection") == "collection"

    def test_unknown_table_quoted(self):
        assert _safe_table("unknown") == '"unknown"'

    def test_case_insensitive(self):
        assert _safe_table("PAGE") == "PAGE"  # lower matches


class TestTableNames:
    def test_known_tables(self):
        assert "page" in _TABLE_NAMES
        assert "collection" in _TABLE_NAMES
        assert "user" in _TABLE_NAMES
        assert "page_revision" in _TABLE_NAMES
        assert "comment" in _TABLE_NAMES
        assert "page_tag" in _TABLE_NAMES
        assert "attachment" in _TABLE_NAMES
        assert "share_link" in _TABLE_NAMES
        assert "api_key" in _TABLE_NAMES

    def test_unknown_not_present(self):
        assert "secret" not in _TABLE_NAMES


class TestBuildSafeSQL:
    def test_no_args(self):
        assert _build_safe_sql("SELECT 1") == "SELECT 1"

    def test_string_placeholder(self):
        sql = _build_safe_sql("SELECT * FROM page WHERE id = ?", "p1")
        assert sql == "SELECT * FROM page WHERE id = 'p1'"

    def test_integer_placeholder(self):
        sql = _build_safe_sql("SELECT * FROM page LIMIT ?i OFFSET ?i", 10, 0)
        assert "10" in sql
        assert "0" in sql

    def test_float_placeholder(self):
        sql = _build_safe_sql("SELECT * FROM page WHERE score > ?f", 3.5)
        assert "3.5" in sql

    def test_bool_placeholder(self):
        sql = _build_safe_sql("SELECT * FROM page WHERE active = ?b", True)
        assert "true" in sql.lower()

    def test_default_string_for_plain_question(self):
        sql = _build_safe_sql("SELECT * FROM page WHERE id = ?", "my-id")
        assert sql == "SELECT * FROM page WHERE id = 'my-id'"

    def test_int_placeholder_raises_on_string(self):
        with pytest.raises(TypeError, match="Expected int"):
            _build_safe_sql("SELECT * FROM page LIMIT ?i", "ten")

    def test_float_placeholder_raises_on_int(self):
        with pytest.raises(TypeError, match="Expected float"):
            _build_safe_sql("SELECT * FROM page WHERE score > ?f", 42)

    def test_arg_count_mismatch(self):
        with pytest.raises(ValueError, match="Expected"):
            _build_safe_sql("SELECT * FROM page WHERE id = ?", "a", "b")

    def test_placeholder_with_s_suffix(self):
        sql = _build_safe_sql("SELECT * FROM page WHERE id = ?s", "hello")
        assert sql == "SELECT * FROM page WHERE id = 'hello'"

    def test_none_arg(self):
        sql = _build_safe_sql("UPDATE page SET title = ? WHERE id = ?", None, "p1")
        assert "NULL" in sql

    def test_mixed_placeholders(self):
        sql = _build_safe_sql(
            "SELECT * FROM page WHERE status = ? AND limit > ?i",
            "active", 5,
        )
        assert "'active'" in sql
        assert "5" in sql

    def test_multiple_integers(self):
        sql = _build_safe_sql(
            "SELECT * FROM page LIMIT ?i OFFSET ?i", 50, 0
        )
        assert "50" in sql
        assert "0" in sql


class TestRowHelpers:
    def test_str_missing(self):
        assert _str([], 0) == ""

    def test_str_none(self):
        assert _str([None], 0) == ""

    def test_str_value(self):
        assert _str(["hello"], 0) == "hello"

    def test_int_missing(self):
        assert _int([], 0) == 0

    def test_int_none(self):
        assert _int([None], 0) == 0

    def test_int_value(self):
        assert _int([42], 0) == 42

    def test_bool_missing(self):
        assert _bool([], 0) is False

    def test_bool_truthy(self):
        assert _bool([1], 0) is True

    def test_bool_falsy(self):
        assert _bool([0], 0) is False


class TestMapPage:
    FULL = [
        "p1", "Test", "test", '{"type":"doc"}', "Hello",
        "c1", "", "published", "📄", "gray",
        False, False, False, "", 0,
        "u1", "u1", 1000, 2000, 1000, 0, "",
    ]

    def test_full_row(self):
        p = map_page(self.FULL)
        assert p["id"] == "p1"
        assert p["title"] == "Test"
        assert p["content"] == '{"type":"doc"}'
        assert p["text_content"] == "Hello"
        assert p["collection_id"] == "c1"
        assert p["sort_order"] == 0

    def test_short_row(self):
        p = map_page(["p1", "T"])
        assert p["id"] == "p1"
        assert p["title"] == "T"


class TestMapCollection:
    FULL = ["c1", "Docs", "docs", "All docs", "", "📚", "blue", 0, "u1", 1000, 2000]

    def test_full(self):
        c = map_collection(self.FULL)
        assert c["id"] == "c1"
        assert c["name"] == "Docs"
        assert c["created_at"] == 1000


class TestMapUser:
    FULL = ["u1", "Alice", "a@b.com", "", "admin", "https://avatar.url", 1000]

    def test_full(self):
        u = map_user(self.FULL)
        assert u["id"] == "u1"
        assert u["name"] == "Alice"
        assert u["email"] == "a@b.com"
        assert u["role"] == "admin"
        assert u["avatar_url"] == "https://avatar.url"
        assert u["created_at"] == 1000

    def test_short_row(self):
        u = map_user(["u1"])
        assert u["id"] == "u1"


class TestMapRevision:
    FULL = ["r1", "p1", "Rev 1", '{"type":"doc"}', "u1", 1000, 1]

    def test_full(self):
        r = map_revision(self.FULL)
        assert r["id"] == "r1"
        assert r["page_id"] == "p1"
        assert r["title"] == "Rev 1"
        assert r["content"] == '{"type":"doc"}'
        assert r["revision_number"] == 1


class TestMapComment:
    FULL = ["c1", "p1", "", "u1", "Great!", False, 1000, 2000]

    def test_full(self):
        c = map_comment(self.FULL)
        assert c["id"] == "c1"
        assert c["page_id"] == "p1"
        assert c["user_id"] == "u1"
        assert c["body"] == "Great!"
        assert c["is_resolved"] is False


class TestMapTag:
    FULL = ["t1", "p1", "status", "done"]

    def test_full(self):
        t = map_tag(self.FULL)
        assert t["id"] == "t1"
        assert t["page_id"] == "p1"
        assert t["name"] == "status"
        assert t["value"] == "done"


class TestMapAttachment:
    FULL = ["a1", "p1", "doc.pdf", "application/pdf", 1024, "key1", "u1", 1000]

    def test_full(self):
        a = map_attachment(self.FULL)
        assert a["id"] == "a1"
        assert a["filename"] == "doc.pdf"
        assert a["mime_type"] == "application/pdf"
        assert a["size_bytes"] == 1024


class TestMapShareLink:
    FULL = ["s1", "p1", "tok_abc", "", "u1", 0, 1000, 5]

    def test_full(self):
        s = map_share_link(self.FULL)
        assert s["id"] == "s1"
        assert s["token"] == "tok_abc"
        assert s["visit_count"] == 5


class TestMapApiKey:
    FULL = ["k1", "u1", "my-key", "hash123", "sw_abc", 1000, 2000, 3000, False]

    def test_full(self):
        k = map_api_key(self.FULL)
        assert k["id"] == "k1"
        assert k["name"] == "my-key"
        assert k["key_hash"] == "hash123"
        assert k["key_prefix"] == "sw_abc"
        assert k["is_revoked"] is False
