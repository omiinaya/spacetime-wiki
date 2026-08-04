use spacetimedb::*;

// ─── Audit Event Log ─────────────────────────────────────────────────────────

/// Records administrative and security events in the wiki.
/// Used for audit trails — tracks who did what and when.
#[table(accessor = audit_event, public)]
#[derive(Debug, Clone)]
#[cfg_attr(test, derive(Default))]
pub struct AuditEvent {
    #[primary_key]
    pub id: String,
    #[index(btree)]
    pub event_type: String,
    #[index(btree)]
    pub actor_id: String,
    pub target_id: String,
    pub target_name: String,
    pub metadata: String,
    #[index(btree)]
    pub created_at: u64,
}

// ─── Groups ──────────────────────────────────────────────────────────────────

/// A user group for organizing permissions and access control.
/// Groups can be granted collection-level roles and shared across the wiki.
#[table(accessor = group, public)]
#[derive(Debug, Clone)]
#[cfg_attr(test, derive(Default))]
pub struct Group {
    #[primary_key]
    pub id: String,
    pub name: String,
    pub description: String,
    pub created_by: String,
    pub created_at: u64,
    pub updated_at: u64,
}

/// Membership linking a user to a group with a specific role.
#[table(accessor = group_member, public)]
#[derive(Debug, Clone)]
#[cfg_attr(test, derive(Default))]
pub struct GroupMember {
    #[primary_key]
    pub id: String,
    #[index(btree)]
    pub group_id: String,
    #[index(btree)]
    pub user_id: String,
    pub role: String,
    pub added_by: String,
    pub created_at: u64,
}

#[table(accessor = collection_group_permission, public)]
#[derive(Debug, Clone)]
/// Permissions granted to a group for a specific collection.
#[cfg_attr(test, derive(Default))]
pub struct CollectionGroupPermission {
    #[primary_key]
    pub id: String,
    #[index(btree)]
    pub collection_id: String,
    pub group_id: String,
    pub role: String,
    pub created_at: u64,
}

// ─── Users ───────────────────────────────────────────────────────────────────

/// A registered wiki user with authentication credentials and profile.
#[table(accessor = user, public)]
#[derive(Debug, Clone)]
#[cfg_attr(test, derive(Default))]
pub struct User {
    #[primary_key]
    pub id: String,
    pub name: String,
    #[index(btree)]
    pub email: String,
    pub role: String,
    pub avatar_url: String,
    pub created_at: u64,
    pub updated_at: u64,
}

/// Password credentials for a user — PRIVATE table so the password hash is
/// never SQL-queryable. Reducers (register_user, login_user) access it directly.
#[table(accessor = user_credential)]
#[derive(Debug, Clone)]
#[cfg_attr(test, derive(Default))]
pub struct UserCredential {
    #[primary_key]
    pub user_id: String,
    pub password_hash: String,
}

// ─── Collections ─────────────────────────────────────────────────────────────

/// A named folder/grouping for wiki pages, with optional parent hierarchy.
/// Collections can have custom sorting, icons, colours, and access permissions.
#[table(accessor = collection, public)]
#[derive(Debug, Clone)]
#[cfg_attr(test, derive(Default))]
pub struct Collection {
    #[primary_key]
    pub id: String,
    pub name: String,
    #[index(btree)]
    pub slug: String,
    pub description: String,
    pub parent_id: String,
    pub icon: String,
    pub color: String,
    pub sort_order: u32,
    #[index(btree)]
    pub created_by: String,
    pub created_at: u64,
    pub updated_at: u64,
}

/// Membership linking a user to a collection with a specific role.
#[table(accessor = collection_member, public)]
#[derive(Debug, Clone)]
#[cfg_attr(test, derive(Default))]
pub struct CollectionMember {
    #[primary_key]
    pub id: String,
    #[index(btree)]
    pub collection_id: String,
    #[index(btree)]
    pub user_id: String,
    pub role: String,
    pub added_by: String,
    pub created_at: u64,
}

// ─── Pages ───────────────────────────────────────────────────────────────────

/// A wiki page — the core content entity. Pages can have rich text (via blocks),
/// be organized under collections, nested as children of other pages, and
/// support templates, pinning, archiving, and soft-delete.
#[table(accessor = page, public)]
#[derive(Debug, Clone)]
#[cfg_attr(test, derive(Default))]
pub struct Page {
    #[primary_key]
    pub id: String,
    pub title: String,
    pub slug: String,
    pub content: String,
    pub text_content: String,
    #[index(btree)]
    pub collection_id: String,
    pub parent_page_id: String,
    pub status: String,
    pub icon: String,
    pub color: String,
    pub full_width: bool,
    pub is_pinned: bool,
    pub is_template: bool,
    #[index(btree)]
    pub template_id: String,
    pub sort_order: u32,
    #[index(btree)]
    pub created_by: String,
    pub updated_by: String,
    pub created_at: u64,
    #[index(btree)]
    pub updated_at: u64,
    pub published_at: u64,
    pub deleted_at: u64,
    pub direction: String,
}

/// A snapshot of a page at a specific point in time for version history.
#[table(accessor = page_revision, public)]
#[derive(Debug, Clone)]
#[cfg_attr(test, derive(Default))]
pub struct PageRevision {
    #[primary_key]
    pub id: String,
    #[index(btree)]
    pub page_id: String,
    pub title: String,
    pub content: String,
    pub edited_by: String,
    pub created_at: u64,
    pub revision_number: u32,
}

// ─── Comments ────────────────────────────────────────────────────────────────

#[table(accessor = comment, public)]
#[derive(Debug, Clone)]
/// A threaded comment on a wiki page with optional text anchor.
#[cfg_attr(test, derive(Default))]
pub struct Comment {
    #[primary_key]
    pub id: String,
    #[index(btree)]
    pub page_id: String,
    pub parent_comment_id: String,
    pub user_id: String,
    pub body: String,
    pub text_anchor: String,
    pub is_resolved: bool,
    pub created_at: u64,
    pub updated_at: u64,
}

// ─── Attachments ─────────────────────────────────────────────────────────────

#[table(accessor = attachment, public)]
#[derive(Debug, Clone)]
/// A file attached to a wiki page.
#[cfg_attr(test, derive(Default))]
pub struct Attachment {
    #[primary_key]
    pub id: String,
    #[index(btree)]
    pub page_id: String,
    pub filename: String,
    pub mime_type: String,
    pub size_bytes: u64,
    pub storage_key: String,
    pub uploaded_by: String,
    pub created_at: u64,
}

// ─── Page Tags ───────────────────────────────────────────────────────────────

#[table(accessor = page_tag, public)]
#[derive(Debug, Clone)]
/// A key-value tag for labelling and filtering a page.
#[cfg_attr(test, derive(Default))]
pub struct PageTag {
    #[primary_key]
    pub id: String,
    #[index(btree)]
    pub page_id: String,
    #[index(btree)]
    pub name: String,
    pub value: String,
}

// ─── Favorites ───────────────────────────────────────────────────────────────

#[table(accessor = favorite, public)]
#[derive(Debug, Clone)]
/// A bookmarked/favorited page for a user.
#[cfg_attr(test, derive(Default))]
pub struct Favorite {
    #[primary_key]
    pub id: String,
    #[index(btree)]
    pub user_id: String,
    #[index(btree)]
    pub page_id: String,
    pub created_at: u64,
}

// ─── Comment Reactions ───────────────────────────────────────────────────────

#[table(accessor = comment_reaction, public)]
#[derive(Debug, Clone)]
/// An emoji reaction on a comment.
#[cfg_attr(test, derive(Default))]
pub struct CommentReaction {
    #[primary_key]
    pub id: String,
    #[index(btree)]
    pub comment_id: String,
    pub user_id: String,
    pub emoji: String,
    pub created_at: u64,
}

// ─── Share Links ─────────────────────────────────────────────────────────────

#[table(accessor = share_link, public)]
#[derive(Debug, Clone)]
/// A shareable link to a page, optionally password-protected.
#[cfg_attr(test, derive(Default))]
pub struct ShareLink {
    #[primary_key]
    pub id: String,
    #[index(btree)]
    pub page_id: String,
    #[index(btree)]
    pub token: String,
    pub created_by: String,
    pub expires_at: u64,
    pub created_at: u64,
    pub visit_count: u32,
    pub has_password: bool,
    pub brand_title: Option<String>,
    pub brand_logo_url: Option<String>,
}

/// Share link password hash — PRIVATE table so hashes are never SQL-queryable.
#[table(accessor = share_link_credential)]
#[derive(Debug, Clone)]
#[cfg_attr(test, derive(Default))]
pub struct ShareLinkCredential {
    #[primary_key]
    pub share_link_id: String,
    pub password_hash: String,
}

// ─── Page Permissions ────────────────────────────────────────────────────────

#[table(accessor = page_permission, public)]
#[derive(Debug, Clone)]
/// Explicit page-level permission for a user or group.
#[cfg_attr(test, derive(Default))]
pub struct PagePermission {
    #[primary_key]
    pub id: String,
    #[index(btree)]
    pub page_id: String,
    pub user_id: String,
    pub group_id: String,
    pub role: String,
    pub created_at: u64,
}

// ─── API Keys ────────────────────────────────────────────────────────────────

#[table(accessor = api_key, public)]
#[derive(Debug, Clone)]
/// An API key for programmatic access, scoped to a user.
#[cfg_attr(test, derive(Default))]
pub struct ApiKey {
    #[primary_key]
    pub id: String,
    #[index(btree)]
    pub user_id: String,
    pub name: String,
    pub key_prefix: String,
    pub last_used_at: u64,
    pub created_at: u64,
    pub expires_at: u64,
    pub is_revoked: bool,
}

/// API key hash — PRIVATE table so key hashes are never SQL-queryable.
#[table(accessor = api_key_credential)]
#[derive(Debug, Clone)]
#[cfg_attr(test, derive(Default))]
pub struct ApiKeyCredential {
    #[primary_key]
    pub api_key_id: String,
    pub key_hash: String,
}

// ─── Webhooks ────────────────────────────────────────────────────────────────

#[table(accessor = webhook)]
#[derive(Debug, Clone, serde::Serialize)]
/// A configured webhook that fires on wiki events.
#[cfg_attr(test, derive(Default))]

pub struct Webhook {
    #[primary_key]
    pub id: String,
    pub name: String,
    pub url: String,
    pub events: String,
    pub is_active: bool,
    pub secret: String,
    pub created_by: String,
    pub created_at: u64,
    pub updated_at: u64,
}

#[table(accessor = webhook_event, public)]
#[derive(Debug, Clone)]
/// A single webhook delivery attempt.
#[cfg_attr(test, derive(Default))]
pub struct WebhookEvent {
    #[primary_key]
    pub id: String,
    #[index(btree)]
    pub webhook_id: String,
    pub event_type: String,
    pub page_id: String,
    pub payload: String,
    #[index(btree)]
    pub status: String,
    pub response_code: u32,
    pub response_body: String,
    pub created_at: u64,
    pub sent_at: u64,
}

// ─── Collection Sort Rules ───────────────────────────────────────────────────

#[table(accessor = collection_sort_rule, public)]
#[derive(Debug, Clone)]
#[cfg_attr(test, derive(Default))]
pub struct CollectionSortRule {
    #[primary_key]
    pub collection_id: String,
    pub sort_field: String,
    pub sort_direction: String,
    pub auto_apply: bool,
    pub updated_by: String,
    pub updated_at: u64,
}

// ─── Search Results ──────────────────────────────────────────────────────────

#[table(accessor = search_result, public)]
#[derive(Debug, Clone)]
#[cfg_attr(test, derive(Default))]
pub struct SearchResult {
    #[primary_key]
    pub id: String,
    pub search_token: String,
    pub page_id: String,
    pub title: String,
    pub slug: String,
    pub excerpt: String,
    pub match_type: String,
    pub created_at: u64,
}

// ─── SAML Providers ──────────────────────────────────────────────────────────

#[table(accessor = saml_provider)]
#[derive(Debug, Clone, serde::Serialize)]
#[cfg_attr(test, derive(Default))]

pub struct SamlProvider {
    #[primary_key]
    pub id: String,
    pub name: String,
    pub slug: String,
    pub entity_id: String,
    pub sso_url: String,
    pub certificate: String,
    pub name_id_format: String,
    pub attribute_mapping: String,
    pub auto_register: bool,
    pub is_active: bool,
    pub created_by: String,
    pub created_at: u64,
    pub updated_at: u64,
}

// ─── OIDC Providers ──────────────────────────────────────────────────────────

#[table(accessor = oidc_provider)]
#[derive(Debug, Clone, serde::Serialize)]
#[cfg_attr(test, derive(Default))]
pub struct OidcProvider {
    #[primary_key]
    pub id: String,
    pub name: String,
    pub slug: String,
    pub issuer_url: String,
    pub client_id: String,
    pub client_secret: String,
    pub scopes: String,
    pub is_active: bool,
    pub created_by: String,
    pub created_at: u64,
    pub updated_at: u64,
}

// ─── LDAP Providers ────────────────────────────────────────────────���─────────

#[table(accessor = ldap_provider)]
#[derive(Debug, Clone, serde::Serialize)]
#[cfg_attr(test, derive(Default))]

pub struct LdapProvider {
    #[primary_key]
    pub id: String,
    pub name: String,
    pub slug: String,
    pub host: String,
    pub port: u16,
    pub is_secure: bool,
    pub bind_dn: String,
    pub bind_password: String,
    pub base_dn: String,
    pub user_filter: String,
    pub username_attribute: String,
    pub email_attribute: String,
    pub name_attribute: String,
    pub default_role: String,
    pub auto_register: bool,
    pub is_active: bool,
    pub created_by: String,
    pub created_at: u64,
    pub updated_at: u64,
}

#[table(accessor = ldap_user)]
#[derive(Debug, Clone, serde::Serialize)]
#[cfg_attr(test, derive(Default))]

pub struct LdapUser {
    #[primary_key]
    pub id: String,
    #[index(btree)]
    pub user_id: String,
    #[index(btree)]
    pub ldap_provider_id: String,
    pub dn: String,
    pub external_id: String,
    pub last_synced_at: u64,
    pub created_at: u64,
}

// ─── Page Views ──────────────────────────────────────────────────────────────

#[table(accessor = page_view, public)]
#[derive(Debug, Clone)]
#[cfg_attr(test, derive(Default))]
pub struct PageView {
    #[primary_key]
    pub id: String,
    #[index(btree)]
    pub page_id: String,
    pub user_id: String,
    pub viewer: String,
    pub viewed_at: u64,
}

// ─── App Settings ────────────────────────────────────────────────────────────

#[table(accessor = app_setting, public)]
#[derive(Debug, Clone)]
#[cfg_attr(test, derive(Default))]
pub struct AppSetting {
    #[primary_key]
    pub key: String,
    pub value: String,
    pub updated_at: u64,
}

// ─── Collab (Yjs) ────────────────────────────────────────────────────────────

#[table(accessor = collab_update, public)]
#[derive(Debug, Clone)]
#[cfg_attr(test, derive(Default))]
pub struct CollabUpdate {
    #[primary_key]
    pub id: String,
    #[index(btree)]
    pub page_id: String,
    pub update_data: String,
    pub user_id: String,
    pub created_at: u64,
}

#[table(accessor = collab_session, public)]
#[derive(Debug, Clone)]
#[cfg_attr(test, derive(Default))]
pub struct CollabSession {
    #[primary_key]
    pub id: String,
    #[index(btree)]
    pub page_id: String,
    pub user_id: String,
    pub user_name: String,
    pub color: String,
    pub cursor_position: String,
    pub last_seen_at: u64,
    pub joined_at: u64,
}

// ─── AI ──────────────────────────────────────────────────────────────────────

#[table(accessor = ai_config, public)]
#[derive(Debug, Clone)]
#[cfg_attr(test, derive(Default))]
pub struct AiConfig {
    #[primary_key]
    pub key: String,
    pub value: String,
    pub updated_at: u64,
}

#[table(accessor = ai_chat_session, public)]
#[derive(Debug, Clone, serde::Serialize)]
#[cfg_attr(test, derive(Default))]
pub struct AiChatSession {
    #[primary_key]
    pub id: String,
    pub user_id: String,
    pub title: String,
    pub page_context_id: String,
    pub created_at: u64,
    pub updated_at: u64,
}

#[table(accessor = ai_chat_message, public)]
#[derive(Debug, Clone, serde::Serialize)]
#[cfg_attr(test, derive(Default))]
pub struct AiChatMessage {
    #[primary_key]
    pub id: String,
    #[index(btree)]
    pub session_id: String,
    pub role: String,
    pub content: String,
    pub created_at: u64,
}

// ─── SCIM ────────────────────────────────────────────────────────────────────

#[table(accessor = scim_provider, public)]
#[derive(Debug, Clone)]
#[cfg_attr(test, derive(Default))]
pub struct ScimProvider {
    #[primary_key]
    pub id: String,
    pub name: String,
    pub slug: String,
    pub is_active: bool,
    pub default_role: String,
    pub auto_register: bool,
    pub deprovision_behavior: String,
    pub sync_groups: bool,
    pub created_by: String,
    pub created_at: u64,
    pub updated_at: u64,
}

/// SCIM provider API token hash — PRIVATE table so tokens are never SQL-queryable.
#[table(accessor = scim_provider_credential)]
#[derive(Debug, Clone)]
#[cfg_attr(test, derive(Default))]
pub struct ScimProviderCredential {
    #[primary_key]
    pub scim_provider_id: String,
    pub api_token_hash: String,
}

#[table(accessor = scim_event, public)]
#[derive(Debug, Clone)]
#[cfg_attr(test, derive(Default))]
pub struct ScimEvent {
    #[primary_key]
    pub id: String,
    #[index(btree)]
    pub provider_id: String,
    pub resource_type: String,
    pub operation: String,
    pub external_id: String,
    pub local_id: String,
    pub status: String,
    pub detail: String,
    pub created_at: u64,
}

// ─── Passkeys ────────────────────────────────────────────────────────────────

#[table(accessor = passkey_credential, public)]
#[derive(Debug, Clone)]
#[cfg_attr(test, derive(Default))]
pub struct PasskeyCredential {
    #[primary_key]
    pub id: String,
    #[index(btree)]
    pub user_id: String,
    pub credential_id: String,
    pub public_key: String,
    pub counter: u64,
    pub transports: String,
    pub device_name: String,
    pub created_at: u64,
    pub last_used_at: u64,
}

#[table(accessor = passkey_challenge)]
#[derive(Debug, Clone)]
#[cfg_attr(test, derive(Default))]
pub struct PasskeyChallenge {
    #[primary_key]
    pub challenge: String,
    pub user_handle: String,
    pub purpose: String,
    pub created_at: u64,
    pub expires_at: u64,
}

// ─── Database (inline tables in pages) ───────────────────────────────────────

#[table(accessor = db_base, public)]
#[derive(Debug, Clone)]
#[cfg_attr(test, derive(Default))]
pub struct DbBase {
    #[primary_key]
    pub id: String,
    #[index(btree)]
    pub page_id: String,
    pub title: String,
    pub view_type: String,
    pub created_by: String,
    pub created_at: u64,
    pub updated_at: u64,
}

#[table(accessor = db_column, public)]
#[derive(Debug, Clone)]
#[cfg_attr(test, derive(Default))]
pub struct DbColumn {
    #[primary_key]
    pub id: String,
    #[index(btree)]
    pub base_id: String,
    pub name: String,
    pub field_type: String,
    pub options: String,
    pub sort_order: u32,
    pub created_at: u64,
    pub updated_at: u64,
}

#[table(accessor = db_row, public)]
#[derive(Debug, Clone)]
#[cfg_attr(test, derive(Default))]
pub struct DbRow {
    #[primary_key]
    pub id: String,
    #[index(btree)]
    pub base_id: String,
    pub sort_order: u32,
    pub created_by: String,
    pub created_at: u64,
    pub updated_at: u64,
}

#[table(accessor = db_cell, public)]
#[derive(Debug, Clone)]
#[cfg_attr(test, derive(Default))]
pub struct DbCell {
    #[primary_key]
    pub id: String,
    #[index(btree)]
    pub row_id: String,
    #[index(btree)]
    pub column_id: String,
    pub value: String,
    pub created_at: u64,
    pub updated_at: u64,
}

// ─── Invitations ─────────────────────────────────────────────────────────────

#[table(accessor = invitation)]
#[derive(Debug, Clone, serde::Serialize)]
/// An email invitation to join the wiki.
#[cfg_attr(test, derive(Default))]

pub struct Invitation {
    #[primary_key]
    pub id: String,
    #[index(btree)]
    pub email: String,
    pub invited_by: String,
    pub role: String,
    pub page_ids: String,
    pub collection_ids: String,
    #[index(btree)]
    pub token: String,
    pub status: String,
    pub message: String,
    pub expires_at: u64,
    pub view_count: u32,
    pub created_at: u64,
    pub updated_at: u64,
}

// ─── Synced Blocks ───────────────────────────────────────────────────────────

#[table(accessor = synced_block, public)]
#[derive(Debug, Clone)]
#[cfg_attr(test, derive(Default))]
pub struct SyncedBlock {
    #[primary_key]
    pub id: String,
    pub title: String,
    pub content: String,
    pub created_by: String,
    pub created_at: u64,
    pub updated_at: u64,
    pub updated_by: String,
}

#[table(accessor = synced_block_ref, public)]
#[derive(Debug, Clone)]
#[cfg_attr(test, derive(Default))]
pub struct SyncedBlockRef {
    #[primary_key]
    pub id: String,
    #[index(btree)]
    pub block_id: String,
    #[index(btree)]
    pub page_id: String,
    pub created_by: String,
    pub created_at: u64,
}

// ─── MFA ─────────────────────────────────────────────────────────────────────

#[table(accessor = mfa_method)]
#[derive(Debug, Clone, serde::Serialize)]
#[cfg_attr(test, derive(Default))]
pub struct MfaMethod {
    #[primary_key]
    pub id: String,
    #[index(btree)]
    pub user_id: String,
    pub method_type: String,
    pub totp_secret: String,
    pub is_enabled: bool,
    pub created_at: u64,
    pub updated_at: u64,
}

#[table(accessor = mfa_backup_code)]
#[derive(Debug, Clone, serde::Serialize)]
#[cfg_attr(test, derive(Default))]
pub struct MfaBackupCode {
    #[primary_key]
    pub id: String,
    #[index(btree)]
    pub user_id: String,
    pub code_hash: String,
    pub is_used: bool,
    pub created_at: u64,
}

// ─── Watch / Notifications ───────────────────────────────────────────────────

#[table(accessor = watch, public)]
#[derive(Debug, Clone, serde::Serialize)]
/// A user subscription to notifications for a page or collection.
#[cfg_attr(test, derive(Default))]
pub struct Watch {
    #[primary_key]
    pub id: String,
    #[index(btree)]
    pub user_id: String,
    pub target_type: String,
    #[index(btree)]
    pub target_id: String,
    pub created_at: u64,
}

#[table(accessor = notification, public)]
#[derive(Debug, Clone, serde::Serialize)]
/// A notification event sent to a user.
#[cfg_attr(test, derive(Default))]
pub struct Notification {
    #[primary_key]
    pub id: String,
    #[index(btree)]
    pub user_id: String,
    pub event_type: String,
    pub target_id: String,
    pub title: String,
    pub message: String,
    pub actor_id: String,
    pub icon: String,
    pub is_read: bool,
    #[index(btree)]
    pub created_at: u64,
}

// ─── Access Requests ─────────────────────────────────────────────────────────

#[table(accessor = access_request, public)]
#[derive(Debug, Clone, serde::Serialize)]
/// A user request to access a restricted page.
#[cfg_attr(test, derive(Default))]
pub struct AccessRequest {
    #[primary_key]
    pub id: String,
    #[index(btree)]
    pub page_id: String,
    pub requester_id: String,
    pub reason: String,
    pub status: String,
    pub responded_by: String,
    pub responded_at: u64,
    pub created_at: u64,
}

// ─── OAuth (legacy Slack/Discord/GitHub etc.) ────────────────────────────────

#[table(accessor = oauth_provider, public)]
#[derive(Debug, Clone)]
#[cfg_attr(test, derive(Default))]
pub struct OauthProvider {
    #[primary_key]
    pub id: String,
    pub name: String,
    pub slug: String,
    pub provider_type: String,
    pub authorize_url: String,
    pub token_url: String,
    pub userinfo_url: String,
    pub scope: String,
    #[index(btree)]
    pub client_id: String,
    pub icon: String,
    pub is_active: bool,
    pub auto_register: bool,
    pub default_role: String,
    pub created_by: String,
    pub created_at: u64,
    pub updated_at: u64,
}

/// OAuth provider client secret — PRIVATE table so secrets are never
/// SQL-queryable.
#[table(accessor = oauth_provider_credential)]
#[derive(Debug, Clone)]
#[cfg_attr(test, derive(Default))]
pub struct OauthProviderCredential {
    #[primary_key]
    pub oauth_provider_id: String,
    pub client_secret: String,
}

/// Transient bridge for the Python API server to fetch a client secret.
#[table(accessor = oauth_secret_bridge, public)]
#[derive(Debug, Clone)]
#[cfg_attr(test, derive(Default))]
pub struct OauthSecretBridge {
    #[primary_key]
    pub request_id: String,
    pub oauth_provider_id: String,
    pub client_secret: String,
    pub created_at: u64,
}

/// Generic read bridge for PRIVATE tables (frontend reads).
#[table(accessor = read_bridge, public)]
#[derive(Debug, Clone)]
#[cfg_attr(test, derive(Default))]
pub struct ReadBridge {
    #[primary_key]
    pub request_id: String,
    pub source_table: String,
    pub row_json: String,
    pub created_at: u64,
}

/// Transient bridge for the frontend OIDC callback to fetch a client secret.
/// Mirrors oauth_secret_bridge: the secret is written here ONLY on demand
/// (get_oidc_provider_secret) keyed by a random request_id and cleared after
/// the callback exchange. Without the request_id the row is unreachable.
#[table(accessor = oidc_secret_bridge, public)]
#[derive(Debug, Clone)]
#[cfg_attr(test, derive(Default))]
pub struct OidcSecretBridge {
    #[primary_key]
    pub request_id: String,
    pub oidc_provider_id: String,
    pub client_secret: String,
    pub created_at: u64,
}

/// Transient bridge for the Python API server LDAP flow to fetch a bind
/// password. Mirrors oauth_secret_bridge: written ONLY on demand
/// (get_ldap_bind_secret) keyed by a random request_id and cleared after
/// use. Without the request_id the row is unreachable.
#[table(accessor = ldap_bind_bridge, public)]
#[derive(Debug, Clone)]
#[cfg_attr(test, derive(Default))]
pub struct LdapBindBridge {
    #[primary_key]
    pub request_id: String,
    pub ldap_provider_id: String,
    pub bind_password: String,
    pub created_at: u64,
}

#[table(accessor = oauth_user)]
#[derive(Debug, Clone, serde::Serialize)]
#[cfg_attr(test, derive(Default))]

pub struct OauthUser {
    #[primary_key]
    pub id: String,
    #[index(btree)]
    pub user_id: String,
    #[index(btree)]
    pub provider_id: String,
    pub external_id: String,
    pub external_username: String,
    pub external_email: String,
    pub access_token: String,
    pub refresh_token: String,
    pub token_expires_at: u64,
    pub last_synced_at: u64,
    pub created_at: u64,
    pub updated_at: u64,
}
// ─── Default-constructibility smoke test ────────────────────────────────────────
//
// Every table struct derives `Default` in test builds. These one-line
// constructors are the only thing the ~700-line `default_*()` helper +
// per-struct construction-test scaffolding ever verified (struct literals
// round-tripping values the compiler already type-checks). A single
// parameterized test keeps the signal: all structs remain default-
// constructible, with their primary keys starting empty.
#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn all_table_structs_are_default_constructible() {
        let cases: &[(&str, String)] = &[
            ("AuditEvent", AuditEvent::default().id),
            ("Group", Group::default().id),
            ("GroupMember", GroupMember::default().id),
            (
                "CollectionGroupPermission",
                CollectionGroupPermission::default().id,
            ),
            ("User", User::default().id),
            ("UserCredential", UserCredential::default().user_id),
            ("Collection", Collection::default().id),
            ("CollectionMember", CollectionMember::default().id),
            ("Page", Page::default().id),
            ("PageRevision", PageRevision::default().id),
            ("Comment", Comment::default().id),
            ("Attachment", Attachment::default().id),
            ("PageTag", PageTag::default().id),
            ("Favorite", Favorite::default().id),
            ("CommentReaction", CommentReaction::default().id),
            ("ShareLink", ShareLink::default().id),
            (
                "ShareLinkCredential",
                ShareLinkCredential::default().share_link_id,
            ),
            ("PagePermission", PagePermission::default().id),
            ("ApiKey", ApiKey::default().id),
            ("ApiKeyCredential", ApiKeyCredential::default().api_key_id),
            ("Webhook", Webhook::default().id),
            ("WebhookEvent", WebhookEvent::default().id),
            (
                "CollectionSortRule",
                CollectionSortRule::default().collection_id,
            ),
            ("SearchResult", SearchResult::default().id),
            ("SamlProvider", SamlProvider::default().id),
            ("OidcProvider", OidcProvider::default().id),
            ("LdapProvider", LdapProvider::default().id),
            ("LdapUser", LdapUser::default().id),
            ("PageView", PageView::default().id),
            ("AppSetting", AppSetting::default().key),
            ("CollabUpdate", CollabUpdate::default().id),
            ("CollabSession", CollabSession::default().id),
            ("AiConfig", AiConfig::default().key),
            ("AiChatSession", AiChatSession::default().id),
            ("AiChatMessage", AiChatMessage::default().id),
            ("ScimProvider", ScimProvider::default().id),
            (
                "ScimProviderCredential",
                ScimProviderCredential::default().scim_provider_id,
            ),
            ("ScimEvent", ScimEvent::default().id),
            ("PasskeyCredential", PasskeyCredential::default().id),
            ("PasskeyChallenge", PasskeyChallenge::default().challenge),
            ("DbBase", DbBase::default().id),
            ("DbColumn", DbColumn::default().id),
            ("DbRow", DbRow::default().id),
            ("DbCell", DbCell::default().id),
            ("Invitation", Invitation::default().id),
            ("SyncedBlock", SyncedBlock::default().id),
            ("SyncedBlockRef", SyncedBlockRef::default().id),
            ("MfaMethod", MfaMethod::default().id),
            ("MfaBackupCode", MfaBackupCode::default().id),
            ("Watch", Watch::default().id),
            ("Notification", Notification::default().id),
            ("AccessRequest", AccessRequest::default().id),
            ("OauthProvider", OauthProvider::default().id),
            (
                "OauthProviderCredential",
                OauthProviderCredential::default().oauth_provider_id,
            ),
            ("OauthSecretBridge", OauthSecretBridge::default().request_id),
            ("ReadBridge", ReadBridge::default().request_id),
            ("OidcSecretBridge", OidcSecretBridge::default().request_id),
            ("LdapBindBridge", LdapBindBridge::default().request_id),
            ("OauthUser", OauthUser::default().id),
        ];
        for (name, pk) in cases {
            assert!(
                pk.is_empty(),
                "{} primary key should default to empty",
                name
            );
        }
    }
}
