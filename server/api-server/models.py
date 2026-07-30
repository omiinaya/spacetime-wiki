"""Pydantic response models for SpacetimeWiki REST API.

These models are used as response_model= annotations on FastAPI endpoints,
which makes the auto-generated OpenAPI 3.0 spec at /docs and /openapi.json
contain proper JSON Schema for all response types.
"""

from typing import Any

from pydantic import BaseModel, Field

# ─── Pages ─────────────────────────────────────────────────────────────────────


class PageResponse(BaseModel):
    id: str = Field(..., description="Unique page ID")
    title: str = Field(..., description="Page title")
    slug: str = Field(..., description="URL-friendly slug")
    content: str = Field(default="", description="ProseMirror JSON content")
    text_content: str = Field(default="", description="Plain-text extracted content for search")
    collection_id: str = Field(default="", description="Parent collection ID")
    parent_page_id: str = Field(default="", description="Parent page ID for hierarchy")
    status: str = Field(default="active", description="Page status: active, archived, deleted")
    icon: str = Field(default="", description="Page emoji icon")
    color: str = Field(default="", description="Page accent color")
    full_width: bool = Field(default=False, description="Use full-width layout")
    is_template: bool = Field(default=False, description="Whether this page is a template")
    template_id: str = Field(default="", description="Template this page was created from")
    sort_order: int = Field(default=0, description="Sort order within parent")
    created_by: str = Field(default="", description="User ID of creator")
    updated_by: str = Field(default="", description="User ID of last editor")
    created_at: int = Field(default=0, description="Creation timestamp (ms epoch)")
    updated_at: int = Field(default=0, description="Last update timestamp (ms epoch)")
    published_at: int = Field(default=0, description="Publish timestamp (ms epoch)")
    deleted_at: int = Field(default=0, description="Deletion timestamp (ms epoch)")


class PageCreateResponse(BaseModel):
    status: str = Field(default="created", description="Operation result")
    id: str | None = Field(default=None, description="Newly created page ID")
    title: str | None = Field(default=None, description="Page title")


class PageUpdateResponse(BaseModel):
    status: str = Field(default="updated", description="Operation result")


class PageDeleteResponse(BaseModel):
    status: str = Field(default="deleted", description="Operation result")


# ─── Collections ───────────────────────────────────────────────────────────────


class CollectionResponse(BaseModel):
    id: str = Field(..., description="Unique collection ID")
    name: str = Field(..., description="Collection name")
    slug: str = Field(default="", description="URL-friendly slug")
    description: str = Field(default="", description="Collection description")
    parent_id: str = Field(default="", description="Parent collection ID")
    icon: str = Field(default="", description="Collection emoji icon")
    color: str = Field(default="", description="Collection accent color")
    sort_order: int = Field(default=0, description="Sort order")
    created_by: str = Field(default="", description="User ID of creator")
    created_at: int = Field(default=0, description="Creation timestamp (ms epoch)")
    updated_at: int = Field(default=0, description="Last update timestamp (ms epoch)")


class CollectionCreateResponse(BaseModel):
    status: str = Field(default="created", description="Operation result")


class CollectionUpdateResponse(BaseModel):
    status: str = Field(default="updated", description="Operation result")


class CollectionDeleteResponse(BaseModel):
    status: str = Field(default="deleted", description="Operation result")


# ─── Search ────────────────────────────────────────────────────────────────────


class SearchResultItem(BaseModel):
    id: str = Field(default="", description="Search result ID")
    search_token: str = Field(default="", description="Search session token")
    page_id: str = Field(default="", description="Matched page ID")
    title: str = Field(default="", description="Matched page title")
    slug: str = Field(default="", description="Matched page slug")
    excerpt: str = Field(default="", description="Contextual excerpt with match highlighting")
    match_type: str = Field(default="", description="Type of match: title, content, tag")
    created_at: int = Field(default=0, description="Sort timestamp")


class SearchFilters(BaseModel):
    collection_id: str | None = Field(default=None, description="Filter by collection ID")
    author_id: str | None = Field(default=None, description="Filter by author/user ID")
    from_: str | None = Field(default=None, alias="from", description="Date range start")
    to: str | None = Field(default=None, description="Date range end")
    tags: str | None = Field(default=None, description="Tag filters")


class SearchResponse(BaseModel):
    data: list[SearchResultItem] = Field(default_factory=list, description="Search results")
    query: str = Field(default="", description="Original search query")
    filters: SearchFilters = Field(default_factory=SearchFilters, description="Applied filters")
    total: int = Field(default=0, description="Total result count")
    offset: int = Field(default=0, description="Zero-based offset for pagination")
    limit: int = Field(default=50, description="Maximum items per page")


class AutocompleteResult(BaseModel):
    id: str = Field(default="", description="Result ID")
    page_id: str = Field(default="", description="Matched page ID")
    title: str = Field(default="", description="Page title")
    slug: str = Field(default="", description="Page slug")


# ─── Revisions ─────────────────────────────────────────────────────────────────


class RevisionResponse(BaseModel):
    id: str = Field(..., description="Revision ID")
    page_id: str = Field(..., description="Page ID")
    title: str = Field(default="", description="Revision title")
    content: str = Field(default="", description="Revision ProseMirror content")
    edited_by: str = Field(default="", description="User ID of editor")
    created_at: int = Field(default=0, description="Timestamp (ms epoch)")
    revision_number: int = Field(default=1, description="Sequential revision number")


# ─── Comments ──────────────────────────────────────────────────────────────────


class CommentResponse(BaseModel):
    id: str = Field(..., description="Comment ID")
    page_id: str = Field(..., description="Page ID")
    parent_comment_id: str = Field(default="", description="Parent comment ID for threads")
    user_id: str = Field(default="", description="Author user ID")
    body: str = Field(default="", description="Comment body text")
    is_resolved: bool = Field(default=False, description="Whether the comment thread is resolved")
    created_at: int = Field(default=0, description="Creation timestamp (ms epoch)")
    updated_at: int = Field(default=0, description="Last update timestamp (ms epoch)")


class CommentCreateResponse(BaseModel):
    status: str = Field(default="created", description="Operation result")


# ─── Tags ──────────────────────────────────────────────────────────────────────


class TagResponse(BaseModel):
    id: str = Field(..., description="Tag ID")
    page_id: str = Field(..., description="Page ID")
    name: str = Field(..., description="Tag name")
    value: str = Field(default="", description="Tag value")


class TagCreateResponse(BaseModel):
    status: str = Field(default="created", description="Operation result")


# ─── Attachments ───────────────────────────────────────────────────────────────


class AttachmentResponse(BaseModel):
    id: str = Field(..., description="Attachment ID")
    page_id: str = Field(..., description="Page ID")
    filename: str = Field(default="", description="Original filename")
    mime_type: str = Field(default="", description="MIME type")
    size_bytes: int = Field(default=0, description="File size in bytes")
    storage_key: str = Field(default="", description="Storage backend key")
    uploaded_by: str = Field(default="", description="Uploader user ID")
    created_at: int = Field(default=0, description="Upload timestamp (ms epoch)")


# ─── Share Links ───────────────────────────────────────────────────────────────


class ShareLinkResponse(BaseModel):
    id: str = Field(..., description="Share link ID")
    page_id: str = Field(..., description="Page ID")
    token: str = Field(default="", description="Share token")
    password_hash: str = Field(default="", description="Optional password hash")
    created_by: str = Field(default="", description="Creator user ID")
    expires_at: int = Field(default=0, description="Expiry timestamp (ms epoch)")
    created_at: int = Field(default=0, description="Creation timestamp (ms epoch)")
    visit_count: int = Field(default=0, description="Number of visits")


class ShareLinkCreateResponse(BaseModel):
    status: str = Field(default="created", description="Operation result")


# ─── Auth / API Keys ──────────────────────────────────────────────────────────


class ApiKeyResponse(BaseModel):
    id: str = Field(..., description="API key ID")
    user_id: str = Field(default="", description="Owning user ID")
    name: str = Field(default="", description="Key name")
    key_prefix: str = Field(default="", description="Prefix for identification")
    last_used_at: int = Field(default=0, description="Last usage timestamp")
    created_at: int = Field(default=0, description="Creation timestamp")
    expires_at: int = Field(default=0, description="Expiry timestamp")
    is_revoked: bool = Field(default=False, description="Whether this key is revoked")


class ApiKeyRegisterResponse(BaseModel):
    api_key: str = Field(..., description="Raw API key (only shown once)")
    name: str = Field(default="", description="Key name")
    key_prefix: str = Field(default="", description="Key prefix")
    message: str = Field(default="Save this key — it won't be shown again.", description="Warning message")


class ApiKeyRevokeResponse(BaseModel):
    status: str = Field(default="revoked", description="Operation result")


# ─── OAuth ────────────────────────────────────────────────────────────────────


class OAuthProviderResponse(BaseModel):
    id: str = Field(..., description="Provider ID")
    name: str = Field(default="", description="Display name")
    slug: str = Field(default="", description="URL slug")
    provider_type: str = Field(default="", description="Provider type: github, discord, slack, gitlab, generic")
    authorize_url: str = Field(default="", description="OAuth authorize URL")
    token_url: str = Field(default="", description="Token exchange URL")
    userinfo_url: str = Field(default="", description="User info URL")
    scope: str = Field(default="", description="OAuth scope")
    client_id: str = Field(default="", description="OAuth client ID")
    icon: str = Field(default="", description="Provider icon URL")
    is_active: bool = Field(default=True, description="Whether provider is active")
    auto_register: bool = Field(default=False, description="Auto-register new users")
    default_role: str = Field(default="member", description="Default role for new users")
    created_by: str = Field(default="", description="Creator user ID")
    created_at: int = Field(default=0, description="Creation timestamp")
    updated_at: int = Field(default=0, description="Last update timestamp")


class OAuthLoginResponse(BaseModel):
    provider: OAuthProviderResponse = Field(..., description="Provider configuration for building redirect URL")


class OAuthCallbackResponse(BaseModel):
    user: dict[str, Any] = Field(..., description="Authenticated wiki user object")


class OAuthUserLinkResponse(BaseModel):
    id: str = Field(..., description="Link ID")
    user_id: str = Field(..., description="Wiki user ID")
    provider_id: str = Field(..., description="OAuth provider ID")
    external_id: str = Field(default="", description="External user ID from provider")
    external_username: str = Field(default="", description="External username")
    external_email: str = Field(default="", description="External email")
    token_expires_at: int = Field(default=0, description="Token expiry timestamp")
    last_synced_at: int = Field(default=0, description="Last sync timestamp")
    created_at: int = Field(default=0, description="Creation timestamp")
    updated_at: int = Field(default=0, description="Last update timestamp")


# ─── LDAP ──────────────────────────────────────────────────────────────────────


class LDAPProviderResponse(BaseModel):
    id: str = Field(..., description="Provider ID")
    name: str = Field(default="", description="Display name")
    slug: str = Field(default="", description="URL slug")
    host: str = Field(default="", description="LDAP server host")
    port: int = Field(default=389, description="LDAP server port")
    is_secure: bool = Field(default=False, description="Use LDAPS")
    bind_dn: str = Field(default="", description="Service account bind DN")
    bind_password: str = Field(default="", description="Service account password")
    base_dn: str = Field(default="", description="LDAP base DN")
    user_filter: str = Field(default="(uid={{username}})", description="LDAP user search filter")
    username_attribute: str = Field(default="uid", description="Username attribute")
    email_attribute: str = Field(default="mail", description="Email attribute")
    name_attribute: str = Field(default="cn", description="Display name attribute")
    default_role: str = Field(default="member", description="Default role")
    auto_register: bool = Field(default=False, description="Auto-register new users")
    is_active: bool = Field(default=True, description="Whether provider is active")
    created_by: str = Field(default="", description="Creator user ID")
    created_at: int = Field(default=0, description="Creation timestamp")
    updated_at: int = Field(default=0, description="Last update timestamp")


class LDAPLoginResponse(BaseModel):
    user: dict[str, Any] = Field(..., description="Authenticated wiki user object")


# ─── SCIM ──────────────────────────────────────────────────────────────────────


class SCIMErrorResponse(BaseModel):
    detail: str = Field(..., description="Error detail")
    schemas: list[str] = Field(default_factory=lambda: ["urn:ietf:params:scim:api:messages:2.0:Error"])


# ─── WebAuthn ──────────────────────────────────────────────────────────────────


class WebAuthnBeginRegisterResponse(BaseModel):
    challenge: str = Field(..., description="Registration challenge")
    rp: dict[str, Any] = Field(..., description="Relying party info")
    user: dict[str, Any] = Field(..., description="User info")
    pubKeyCredParams: list[dict[str, Any]] = Field(..., description="Accepted key types")
    timeout: int = Field(default=300000, description="Timeout in ms")
    attestation: str = Field(default="none", description="Attestation preference")
    excludeCredentials: list[dict[str, Any]] = Field(default_factory=list)
    authenticatorSelection: dict[str, Any] = Field(default_factory=dict)


class WebAuthnRegisterCompleteResponse(BaseModel):
    status: str = Field(default="ok", description="Registration status")
    credential_id: str = Field(default="", description="Registered credential ID")


class WebAuthnBeginAuthResponse(BaseModel):
    challenge: str = Field(..., description="Authentication challenge")
    timeout: int = Field(default=300000, description="Timeout in ms")
    rpId: str = Field(default="localhost", description="Relying party ID")
    allowCredentials: list[dict[str, Any]] = Field(default_factory=list)
    userVerification: str = Field(default="preferred")


class WebAuthnAuthCompleteResponse(BaseModel):
    status: str = Field(default="ok", description="Authentication status")
    user: dict[str, Any] = Field(..., description="Authenticated user data")


# ─── Import ────────────────────────────────────────────────────────────────────


class ImportResponse(BaseModel):
    status: str = Field(..., description="Import status")
    id: str | None = Field(default=None, description="Created page ID (single import)")
    title: str | None = Field(default=None, description="Page title (single import)")
    pages_created: int | None = Field(default=None, description="Number of pages created (batch)")
    errors: list[str] = Field(default_factory=list, description="Import errors")


# ─── Pagination ────────────────────────────────────────────────────────────────


class PaginatedResponse(BaseModel):
    data: list[dict] = Field(default_factory=list, description="Paginated list of items")
    total: int = Field(..., description="Total number of items matching the query")
    offset: int = Field(default=0, description="Zero-based offset for pagination")
    limit: int = Field(default=50, description="Maximum items per page")


# ─── Health ────────────────────────────────────────────────────────────────────


class HealthResponse(BaseModel):
    status: str = Field(default="ok", description="Service health status")
    service: str = Field(default="spacetime-wiki-api", description="Service name")
