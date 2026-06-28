use spacetimedb::*;

// ─── Audit Event Log ─────────────────────────────────────────────────────────

/// Records administrative and security events in the wiki.
/// Used for audit trails — tracks who did what and when.
#[table(accessor = audit_event, public)]
#[derive(Debug, Clone)]
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
pub struct User {
    #[primary_key]
    pub id: String,
    pub name: String,
    #[index(btree)]
    pub email: String,
    pub password_hash: String,
    pub role: String,
    pub avatar_url: String,
    pub created_at: u64,
    pub updated_at: u64,
}

// ─── Collections ─────────────────────────────────────────────────────────────

/// A named folder/grouping for wiki pages, with optional parent hierarchy.
/// Collections can have custom sorting, icons, colours, and access permissions.
#[table(accessor = collection, public)]
#[derive(Debug, Clone)]
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
pub struct ShareLink {
    #[primary_key]
    pub id: String,
    #[index(btree)]
    pub page_id: String,
    #[index(btree)]
    pub token: String,
    pub password_hash: String,
    pub created_by: String,
    pub expires_at: u64,
    pub created_at: u64,
    pub visit_count: u32,
    pub brand_title: Option<String>,
    pub brand_logo_url: Option<String>,
}

// ─── Page Permissions ────────────────────────────────────────────────────────

#[table(accessor = page_permission, public)]
#[derive(Debug, Clone)]
/// Explicit page-level permission for a user or group.
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
pub struct ApiKey {
    #[primary_key]
    pub id: String,
    #[index(btree)]
    pub user_id: String,
    pub name: String,
    pub key_hash: String,
    pub key_prefix: String,
    pub last_used_at: u64,
    pub created_at: u64,
    pub expires_at: u64,
    pub is_revoked: bool,
}

// ─── Webhooks ────────────────────────────────────────────────────────────────

#[table(accessor = webhook, public)]
#[derive(Debug, Clone)]
/// A configured webhook that fires on wiki events.
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

#[table(accessor = saml_provider, public)]
#[derive(Debug, Clone)]
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

#[table(accessor = oidc_provider, public)]
#[derive(Debug, Clone)]
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

#[table(accessor = ldap_provider, public)]
#[derive(Debug, Clone)]
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

#[table(accessor = ldap_user, public)]
#[derive(Debug, Clone)]
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
pub struct AppSetting {
    #[primary_key]
    pub key: String,
    pub value: String,
    pub updated_at: u64,
}

// ─── Collab (Yjs) ────────────────────────────────────────────────────────────

#[table(accessor = collab_update, public)]
#[derive(Debug, Clone)]
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
pub struct AiConfig {
    #[primary_key]
    pub key: String,
    pub value: String,
    pub updated_at: u64,
}

#[table(accessor = ai_chat_session, public)]
#[derive(Debug, Clone)]
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
#[derive(Debug, Clone)]
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
pub struct ScimProvider {
    #[primary_key]
    pub id: String,
    pub name: String,
    pub slug: String,
    pub api_token_hash: String,
    pub is_active: bool,
    pub default_role: String,
    pub auto_register: bool,
    pub deprovision_behavior: String,
    pub sync_groups: bool,
    pub created_by: String,
    pub created_at: u64,
    pub updated_at: u64,
}

#[table(accessor = scim_event, public)]
#[derive(Debug, Clone)]
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

#[table(accessor = passkey_challenge, public)]
#[derive(Debug, Clone)]
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

#[table(accessor = invitation, public)]
#[derive(Debug, Clone)]
/// An email invitation to join the wiki.
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

#[table(accessor = mfa_method, public)]
#[derive(Debug, Clone)]
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

#[table(accessor = mfa_backup_code, public)]
#[derive(Debug, Clone)]
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
#[derive(Debug, Clone)]
/// A user subscription to notifications for a page or collection.
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
#[derive(Debug, Clone)]
/// A notification event sent to a user.
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
#[derive(Debug, Clone)]
/// A user request to access a restricted page.
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
    pub client_id: String,
    pub client_secret: String,
    pub icon: String,
    pub is_active: bool,
    pub auto_register: bool,
    pub default_role: String,
    pub created_by: String,
    pub created_at: u64,
    pub updated_at: u64,
}

#[table(accessor = oauth_user, public)]
#[derive(Debug, Clone)]
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
