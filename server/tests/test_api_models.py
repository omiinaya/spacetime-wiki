"""Tests for API server Pydantic models — field defaults, serialization, aliases."""

from __future__ import annotations

import sys
sys.path.insert(0, "api-server")

from models import (
    PageResponse,
    CollectionResponse,
    SearchResponse,
    SearchResultItem,
    SearchFilters,
    RevisionResponse,
    CommentResponse,
    TagResponse,
    AttachmentResponse,
    ShareLinkResponse,
    ApiKeyResponse,
    ApiKeyRegisterResponse,
    ApiKeyRevokeResponse,
    OAuthProviderResponse,
    OAuthLoginResponse,
    OAuthCallbackResponse,
    LDAPProviderResponse,
    LDAPLoginResponse,
    SCIMErrorResponse,
    WebAuthnBeginRegisterResponse,
    WebAuthnRegisterCompleteResponse,
    WebAuthnBeginAuthResponse,
    WebAuthnAuthCompleteResponse,
    ImportResponse,
    PaginatedResponse,
    HealthResponse,
    PageCreateResponse,
    PageUpdateResponse,
    PageDeleteResponse,
    CollectionCreateResponse,
    CollectionUpdateResponse,
    CollectionDeleteResponse,
    CommentCreateResponse,
    TagCreateResponse,
    ShareLinkCreateResponse,
    AutocompleteResult,
    OAuthUserLinkResponse,
)


class TestPageResponse:
    def test_minimal_fields(self):
        p = PageResponse(id="p1", title="Test", slug="test")
        assert p.id == "p1"
        assert p.title == "Test"
        assert p.slug == "test"
        assert p.content == ""
        assert p.status == "active"
        assert p.icon == ""

    def test_full_fields(self):
        p = PageResponse(
            id="p1", title="Test", slug="test", content='{"type":"doc"}',
            text_content="hello", status="published", icon="📄",
        )
        assert p.slug == "test"
        assert p.content == '{"type":"doc"}'
        assert p.status == "published"

    def test_serialization(self):
        p = PageResponse(id="p1", title="Test", slug="test")
        data = p.model_dump()
        assert data["id"] == "p1"
        assert data["slug"] == "test"


class TestCollectionResponse:
    def test_minimal(self):
        c = CollectionResponse(id="c1", name="Docs")
        assert c.id == "c1"
        assert c.name == "Docs"


class TestSearchResponse:
    def test_defaults(self):
        s = SearchResponse(query="hello")
        assert s.query == "hello"
        assert s.data == []
        assert s.total == 0

    def test_with_results(self):
        item = SearchResultItem(id="r1", page_id="p1", title="Found")
        s = SearchResponse(data=[item], query="hello")
        assert len(s.data) == 1
        assert s.data[0].title == "Found"


class TestSearchFilters:
    def test_defaults(self):
        f = SearchFilters()
        assert f.collection_id is None

    def test_from_alias(self):
        """The ``from_`` field has alias ``from`` for JSON compatibility."""
        f = SearchFilters(**{"from": "2024-01-01"})
        assert f.from_ == "2024-01-01"
        assert f.model_dump(by_alias=True)["from"] == "2024-01-01"


class TestRevisionResponse:
    def test_required(self):
        r = RevisionResponse(id="r1", page_id="p1")
        assert r.revision_number == 1


class TestCommentResponse:
    def test_minimal(self):
        c = CommentResponse(id="c1", page_id="p1")
        assert c.is_resolved is False


class TestTagResponse:
    def test_minimal(self):
        t = TagResponse(id="t1", page_id="p1", name="status")
        assert t.value == ""


class TestAttachmentResponse:
    def test_minimal(self):
        a = AttachmentResponse(id="a1", page_id="p1")
        assert a.size_bytes == 0


class TestShareLinkResponse:
    def test_minimal(self):
        s = ShareLinkResponse(id="s1", page_id="p1")
        assert s.visit_count == 0


class TestApiKeyResponse:
    def test_minimal(self):
        k = ApiKeyResponse(id="k1", user_id="u1")
        assert k.is_revoked is False


class TestApiKeyRegisterResponse:
    def test_required(self):
        r = ApiKeyRegisterResponse(api_key="sw_abc123")
        assert r.api_key == "sw_abc123"


class TestApiKeyRevokeResponse:
    def test_default(self):
        r = ApiKeyRevokeResponse()
        assert r.status == "revoked"


class TestPaginatedResponse:
    def test_minimal(self):
        p = PaginatedResponse(total=0)
        assert p.data == []
        assert p.offset == 0
        assert p.limit == 50


class TestHealthResponse:
    def test_defaults(self):
        h = HealthResponse()
        assert h.status == "ok"
        assert h.service == "spacetime-wiki-api"


class TestOAuthProviderResponse:
    def test_minimal(self):
        o = OAuthProviderResponse(id="o1", name="GitHub")
        assert o.is_active is True
        assert o.default_role == "member"


class TestSCIMErrorResponse:
    def test_minimal(self):
        e = SCIMErrorResponse(detail="Forbidden")
        assert e.detail == "Forbidden"
        assert "urn:ietf:params:scim:api:messages:2.0:Error" in e.schemas


class TestImportResponse:
    def test_minimal(self):
        r = ImportResponse(status="created")
        assert r.errors == []


class TestPageCreateResponse:
    def test_defaults(self):
        r = PageCreateResponse()
        assert r.status == "created"


class TestWebAuthnBeginRegisterResponse:
    def test_full(self):
        w = WebAuthnBeginRegisterResponse(
            challenge="abc", rp={"id": "localhost"}, user={"id": "u1"},
            pubKeyCredParams=[{"type": "public-key", "alg": -7}],
        )
        assert w.attestation == "none"
        assert w.timeout == 300000


class TestAutocompleteResult:
    def test_defaults(self):
        r = AutocompleteResult(id="r1", page_id="p1", title="Hello")
        assert r.title == "Hello"
