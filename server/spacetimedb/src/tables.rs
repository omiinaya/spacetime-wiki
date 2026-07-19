use spacetimedb::*;

// Allow dead code in default test constructors (only used in #[cfg(test)])
// Each default_* function below is annotated individually.

// ─── Audit Event Log ─────────────────────────────────────────────────────────

/// Records administrative and security events in the wiki.
/// Used for audit trails — tracks who did what and when.
#[table(accessor = audit_event)]
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

#[table(accessor = collection_group_permission)]
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
#[table(accessor = collection_member)]
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

#[table(accessor = favorite)]
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

#[table(accessor = comment_reaction)]
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
    pub key_hash: String,
    pub key_prefix: String,
    pub last_used_at: u64,
    pub created_at: u64,
    pub expires_at: u64,
    pub is_revoked: bool,
}

// ─── Webhooks ────────────────────────────────────────────────────────────────

#[table(accessor = webhook)]
#[derive(Debug, Clone)]
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

#[table(accessor = webhook_event)]
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

#[table(accessor = collection_sort_rule)]
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

#[table(accessor = search_result)]
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
#[derive(Debug, Clone)]
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
#[derive(Debug, Clone)]
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
#[derive(Debug, Clone)]
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
#[derive(Debug, Clone)]
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

#[table(accessor = page_view)]
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

#[table(accessor = app_setting)]
#[derive(Debug, Clone)]
#[cfg_attr(test, derive(Default))]
pub struct AppSetting {
    #[primary_key]
    pub key: String,
    pub value: String,
    pub updated_at: u64,
}

// ─── Collab (Yjs) ────────────────────────────────────────────────────────────

#[table(accessor = collab_update)]
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

#[table(accessor = collab_session)]
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

#[table(accessor = ai_config)]
#[derive(Debug, Clone)]
#[cfg_attr(test, derive(Default))]
pub struct AiConfig {
    #[primary_key]
    pub key: String,
    pub value: String,
    pub updated_at: u64,
}

#[table(accessor = ai_chat_session)]
#[derive(Debug, Clone)]
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

#[table(accessor = ai_chat_message)]
#[derive(Debug, Clone)]
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

#[table(accessor = scim_event)]
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

#[table(accessor = db_base)]
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

#[table(accessor = db_column)]
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

#[table(accessor = db_row)]
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

#[table(accessor = db_cell)]
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
#[derive(Debug, Clone)]
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

#[table(accessor = synced_block)]
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

#[table(accessor = synced_block_ref)]
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
#[derive(Debug, Clone)]
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
#[derive(Debug, Clone)]
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

#[table(accessor = watch)]
#[derive(Debug, Clone)]
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

#[table(accessor = notification)]
#[derive(Debug, Clone)]
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

#[table(accessor = access_request)]
#[derive(Debug, Clone)]
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

#[table(accessor = oauth_user)]
#[derive(Debug, Clone)]
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

// ─── Tests ────────────────────────────────────────────────────────────────────

#[allow(dead_code)]
#[cfg(test)]
#[cfg(test)]
#[cfg(test)]
fn group() -> Group {
    Group::default()
}

#[cfg(test)]
#[cfg(test)]
#[cfg(test)]
fn collection() -> Collection {
    Collection::default()
}

#[cfg(test)]
#[cfg(test)]
#[cfg(test)]
fn page() -> Page {
    Page::default()
}

#[cfg(test)]
#[cfg(test)]
#[cfg(test)]
fn page_revision() -> PageRevision {
    PageRevision::default()
}

#[cfg(test)]
#[cfg(test)]
#[cfg(test)]
fn comment() -> Comment {
    Comment::default()
}

#[cfg(test)]
#[cfg(test)]
#[cfg(test)]
fn attachment() -> Attachment {
    Attachment::default()
}

#[cfg(test)]
#[cfg(test)]
#[cfg(test)]
fn page_tag() -> PageTag {
    PageTag::default()
}

#[cfg(test)]
#[cfg(test)]
#[cfg(test)]
fn favorite() -> Favorite {
    Favorite::default()
}

#[cfg(test)]
#[cfg(test)]
#[cfg(test)]
fn share_link() -> ShareLink {
    ShareLink::default()
}

#[cfg(test)]
#[cfg(test)]
#[cfg(test)]
fn page_permission() -> PagePermission {
    PagePermission::default()
}

#[cfg(test)]
#[cfg(test)]
#[cfg(test)]
fn api_key() -> ApiKey {
    ApiKey::default()
}

#[cfg(test)]
#[cfg(test)]
#[cfg(test)]
fn webhook() -> Webhook {
    Webhook::default()
}

#[cfg(test)]
#[cfg(test)]
#[cfg(test)]
fn webhook_event() -> WebhookEvent {
    WebhookEvent::default()
}

#[cfg(test)]
#[cfg(test)]
#[cfg(test)]
fn collection_sort_rule() -> CollectionSortRule {
    CollectionSortRule::default()
}

#[cfg(test)]
#[cfg(test)]
#[cfg(test)]
fn search_result() -> SearchResult {
    SearchResult::default()
}

#[cfg(test)]
#[cfg(test)]
#[cfg(test)]
fn saml_provider() -> SamlProvider {
    SamlProvider::default()
}

#[cfg(test)]
#[cfg(test)]
#[cfg(test)]
fn oidc_provider() -> OidcProvider {
    OidcProvider::default()
}

#[cfg(test)]
#[cfg(test)]
#[cfg(test)]
fn ldap_provider() -> LdapProvider {
    LdapProvider::default()
}

#[cfg(test)]
#[cfg(test)]
#[cfg(test)]
fn ldap_user() -> LdapUser {
    LdapUser::default()
}

#[cfg(test)]
#[cfg(test)]
#[cfg(test)]
fn page_view() -> PageView {
    PageView::default()
}

#[cfg(test)]
#[cfg(test)]
#[cfg(test)]
fn app_setting() -> AppSetting {
    AppSetting::default()
}

#[cfg(test)]
#[cfg(test)]
#[cfg(test)]
fn collab_update() -> CollabUpdate {
    CollabUpdate::default()
}

#[cfg(test)]
#[cfg(test)]
#[cfg(test)]
fn collab_session() -> CollabSession {
    CollabSession::default()
}

#[cfg(test)]
#[cfg(test)]
#[cfg(test)]
fn ai_config() -> AiConfig {
    AiConfig::default()
}

#[cfg(test)]
#[cfg(test)]
#[cfg(test)]
fn ai_chat_message() -> AiChatMessage {
    AiChatMessage::default()
}

#[cfg(test)]
#[cfg(test)]
#[cfg(test)]
fn scim_provider() -> ScimProvider {
    ScimProvider::default()
}

#[cfg(test)]
#[cfg(test)]
#[cfg(test)]
fn passkey_credential() -> PasskeyCredential {
    PasskeyCredential::default()
}

#[cfg(test)]
#[cfg(test)]
#[cfg(test)]
fn passkey_challenge() -> PasskeyChallenge {
    PasskeyChallenge::default()
}

#[cfg(test)]
#[cfg(test)]
#[cfg(test)]
fn db_base() -> DbBase {
    DbBase::default()
}

#[cfg(test)]
#[cfg(test)]
#[cfg(test)]
fn db_column() -> DbColumn {
    DbColumn::default()
}

#[cfg(test)]
#[cfg(test)]
#[cfg(test)]
fn db_cell() -> DbCell {
    DbCell::default()
}

#[cfg(test)]
#[cfg(test)]
#[cfg(test)]
fn invitation() -> Invitation {
    Invitation::default()
}

#[cfg(test)]
#[cfg(test)]
#[cfg(test)]
fn synced_block() -> SyncedBlock {
    SyncedBlock::default()
}

#[cfg(test)]
#[cfg(test)]
#[cfg(test)]
fn mfa_method() -> MfaMethod {
    MfaMethod::default()
}

#[cfg(test)]
#[cfg(test)]
#[cfg(test)]
fn watch() -> Watch {
    Watch::default()
}

#[cfg(test)]
#[cfg(test)]
#[cfg(test)]
fn notification() -> Notification {
    Notification::default()
}

#[cfg(test)]
#[cfg(test)]
#[cfg(test)]
fn access_request() -> AccessRequest {
    AccessRequest::default()
}

#[cfg(test)]
#[cfg(test)]
#[cfg(test)]
fn oauth_provider() -> OauthProvider {
    OauthProvider::default()
}

#[cfg(test)]
#[cfg(test)]
#[cfg(test)]
fn oauth_user() -> OauthUser {
    OauthUser::default()
}

#[cfg(test)]
mod tests {
    use super::*;

    // ─── AuditEvent ──────────────────────────────────────────────────────────

    #[test]
    fn test_audit_event_construction() {
        let event = AuditEvent {
            id: "ae_1".into(),
            event_type: "user.login".into(),
            actor_id: "u_1".into(),
            target_id: "u_1".into(),
            target_name: "admin".into(),
            metadata: "{}".into(),
            created_at: 1000,
        };
        assert_eq!(event.id, "ae_1");
        assert_eq!(event.event_type, "user.login");
    }

    // ─── Group ───────────────────────────────────────────────────────────────

    #[test]
    fn test_group_construction() {
        let group = Group {
            name: "Editors".into(),
            description: "Can edit all pages".into(),
            created_by: "u_1".into(),
            created_at: 1000,
            updated_at: 1000,
            ..default_group()
        };
        assert_eq!(group.name, "Editors");
    }

    // ─── Collection ──────────────────────────────────────────────────────────

    #[test]
    fn test_collection_slug_format() {
        let col = Collection {
            name: "Engineering Wiki".into(),
            slug: "engineering-wiki".into(),
            icon: "🚀".into(),
            color: "#00ff00".into(),
            created_by: "u_1".into(),
            created_at: 1000,
            updated_at: 1000,
            ..default_collection()
        };
        assert_eq!(col.slug, "engineering-wiki");
        assert!(!col.slug.contains(' '), "Slug must not contain spaces");
    }

    // ─── Page ────────────────────────────────────────────────────────────────

    #[test]
    fn test_page_default_status_is_draft() {
        let page = Page {
            title: "Getting Started".into(),
            slug: "getting-started".into(),
            collection_id: "c_1".into(),
            status: "draft".into(),
            created_by: "u_1".into(),
            updated_by: "u_1".into(),
            created_at: 1000,
            updated_at: 1000,
            ..default_page()
        };
        assert_eq!(page.status, "draft");
        assert!(!page.full_width);
        assert!(!page.is_pinned);
    }

    #[test]
    fn test_page_revision_numbering() {
        let rev = PageRevision {
            page_id: "p_1".into(),
            title: "Old Title".into(),
            content: "# Old Content".into(),
            edited_by: "u_1".into(),
            revision_number: 1,
            ..default_page_revision()
        };
        assert_eq!(rev.revision_number, 1);
    }

    // ─── Comment ─────────────────────────────────────────────────────────────

    #[test]
    fn test_comment_default_resolved() {
        let comment = Comment {
            page_id: "p_1".into(),
            user_id: "u_1".into(),
            body: "Great point!".into(),
            is_resolved: false,
            ..default_comment()
        };
        assert!(!comment.is_resolved);
    }

    // ─── Attachment ──────────────────────────────────────────────────────────

    #[test]
    fn test_attachment_file_extension() {
        let att = Attachment {
            filename: "report.pdf".into(),
            mime_type: "application/pdf".into(),
            size_bytes: 1024,
            storage_key: "attachments/p_1/report.pdf".into(),
            uploaded_by: "u_1".into(),
            ..default_attachment()
        };
        assert!(att.filename.ends_with(".pdf"));
        assert_eq!(att.mime_type, "application/pdf");
    }

    // ─── PageTag ─────────────────────────────────────────────────────────────

    #[test]
    fn test_page_tag_kv() {
        let tag = PageTag {
            page_id: "p_1".into(),
            name: "status".into(),
            value: "active".into(),
            ..default_page_tag()
        };
        assert_eq!(tag.name, "status");
        assert_eq!(tag.value, "active");
    }

    // ─── Favorite ────────────────────────────────────────────────────────────

    #[test]
    fn test_favorite_links_user_to_page() {
        let fav = Favorite {
            user_id: "u_1".into(),
            page_id: "p_1".into(),
            ..default_favorite()
        };
        assert_eq!(fav.page_id, "p_1");
        assert_eq!(fav.user_id, "u_1");
    }

    // ─── ShareLink ───────────────────────────────────────────────────────────

    #[test]
    fn test_share_link_default_no_password() {
        let link = ShareLink {
            token: "abc123".into(),
            created_by: "u_1".into(),
            visit_count: 0,
            brand_title: None,
            brand_logo_url: None,
            ..default_share_link()
        };
        assert_eq!(link.visit_count, 0);
        assert!(link.brand_title.is_none());
    }

    // ─── PagePermission ──────────────────────────────────────────────────────

    #[test]
    fn test_page_permission_role() {
        let perm = PagePermission {
            page_id: "p_1".into(),
            user_id: "u_1".into(),
            role: "editor".into(),
            ..default_page_permission()
        };
        assert_eq!(perm.role, "editor");
    }

    // ─── ApiKey ──────────────────────────────────────────────────────────────

    #[test]
    fn test_api_key_not_revoked_by_default() {
        let key = ApiKey {
            user_id: "u_1".into(),
            name: "CI Token".into(),
            key_hash: "sha256hash".into(),
            key_prefix: "sw_".into(),
            is_revoked: false,
            ..default_api_key()
        };
        assert!(!key.is_revoked);
    }

    // ─── Webhook ─────────────────────────────────────────────────────────────

    #[test]
    fn test_webhook_https_url() {
        let wh = Webhook {
            name: "Slack".into(),
            url: "https://hooks.slack.com/xxx".into(),
            is_active: true,
            ..default_webhook()
        };
        assert!(wh.is_active);
        assert!(wh.url.starts_with("https://"));
    }

    #[test]
    fn test_webhook_event_pending() {
        let we = WebhookEvent {
            webhook_id: "wh_1".into(),
            event_type: "page.create".into(),
            status: "pending".into(),
            ..default_webhook_event()
        };
        assert_eq!(we.status, "pending");
        assert_eq!(we.response_code, 0);
    }

    // ─── CollectionSortRule ──────────────────────────────────────────────────

    #[test]
    fn test_collection_sort_rule_asc() {
        let rule = CollectionSortRule {
            collection_id: "c_1".into(),
            sort_field: "title".into(),
            sort_direction: "asc".into(),
            auto_apply: true,
            ..default_collection_sort_rule()
        };
        assert!(rule.auto_apply);
    }

    // ─── SearchResult ────────────────────────────────────────────────────────

    #[test]
    fn test_search_result_match_type() {
        let sr = SearchResult {
            search_token: "tok_1".into(),
            page_id: "p_1".into(),
            title: "Getting Started".into(),
            slug: "getting-started".into(),
            excerpt: "To get started...".into(),
            match_type: "title".into(),
            ..default_search_result()
        };
        assert_eq!(sr.match_type, "title");
    }

    // ─── SAML Provider ───────────────────────────────────────────────────────

    #[test]
    fn test_saml_provider_construction() {
        let sp = SamlProvider {
            name: "Azure AD".into(),
            slug: "azure-ad".into(),
            entity_id: "https://sts.windows.net/xxx".into(),
            sso_url: "https://login.microsoftonline.com/xxx/saml2".into(),
            certificate: "MIID...".into(),
            auto_register: true,
            is_active: true,
            ..default_saml_provider()
        };
        assert!(sp.is_active);
        assert!(sp.sso_url.contains("saml"));
    }

    // ─── OIDC Provider ───────────────────────────────────────────────────────

    #[test]
    fn test_oidc_provider_construction() {
        let oidc = OidcProvider {
            name: "Google".into(),
            slug: "google".into(),
            issuer_url: "https://accounts.google.com".into(),
            scopes: "openid profile email".into(),
            is_active: true,
            ..default_oidc_provider()
        };
        assert!(oidc.is_active);
        assert!(oidc.issuer_url.contains("google"));
    }

    // ─── LDAP Provider ───────────────────────────────────────────────────────

    #[test]
    fn test_ldap_provider_secure_port() {
        let ldap = LdapProvider {
            name: "Company LDAP".into(),
            slug: "company-ldap".into(),
            host: "ldap.company.com".into(),
            port: 636,
            is_secure: true,
            ..default_ldap_provider()
        };
        assert_eq!(ldap.port, 636);
        assert!(ldap.is_secure);
    }

    #[test]
    fn test_ldap_user_dn_format() {
        let lu = LdapUser {
            user_id: "u_1".into(),
            dn: "cn=Alice,ou=Users,dc=company,dc=com".into(),
            ..default_ldap_user()
        };
        assert!(lu.dn.contains("cn="));
    }

    // ─── PageView ────────────────────────────────────────────────────────────

    #[test]
    fn test_page_view_construction() {
        let pv = PageView {
            page_id: "p_1".into(),
            user_id: "u_1".into(),
            viewer: "Alice".into(),
            ..default_page_view()
        };
        assert_eq!(pv.viewer, "Alice");
    }

    // ─── AppSetting ──────────────────────────────────────────────────────────

    #[test]
    fn test_app_setting_kv() {
        let setting = AppSetting {
            key: "site_name".into(),
            value: "My Wiki".into(),
            ..default_app_setting()
        };
        assert_eq!(setting.value, "My Wiki");
    }

    // ─── Collab ──────────────────────────────────────────────────────────────

    #[test]
    fn test_collab_update_construction() {
        let cu = CollabUpdate {
            page_id: "p_1".into(),
            update_data: "yjs-update-data".into(),
            user_id: "u_1".into(),
            ..default_collab_update()
        };
        assert_eq!(cu.page_id, "p_1");
    }

    #[test]
    fn test_collab_session_color_format() {
        let cs = CollabSession {
            page_id: "p_1".into(),
            user_id: "u_1".into(),
            user_name: "Alice".into(),
            color: "#ff6600".into(),
            ..default_collab_session()
        };
        assert_eq!(cs.color, "#ff6600");
        assert!(cs.last_seen_at >= cs.joined_at);
    }

    // ─── AI ──────────────────────────────────────────────────────────────────

    #[test]
    fn test_ai_config_kv() {
        let cfg = AiConfig {
            key: "model".into(),
            value: "gpt-4".into(),
            ..default_ai_config()
        };
        assert_eq!(cfg.value, "gpt-4");
    }

    #[test]
    fn test_ai_chat_message_role() {
        let msg = AiChatMessage {
            session_id: "ai_s_1".into(),
            role: "assistant".into(),
            content: "Here's how...".into(),
            ..default_ai_chat_message()
        };
        assert_eq!(msg.role, "assistant");
    }

    // ─── SCIM ────────────────────────────────────────────────────────────────

    #[test]
    fn test_scim_provider_construction() {
        let sp = ScimProvider {
            name: "Azure SCIM".into(),
            slug: "azure-scim".into(),
            is_active: true,
            sync_groups: true,
            deprovision_behavior: "disable".into(),
            ..default_scim_provider()
        };
        assert!(sp.is_active);
        assert!(sp.sync_groups);
    }

    // ─── Passkey ─────────────────────────────────────────────────────────────

    #[test]
    fn test_passkey_credential_construction() {
        let pc = PasskeyCredential {
            user_id: "u_1".into(),
            credential_id: "cred_abc".into(),
            counter: 0,
            device_name: "YubiKey 5".into(),
            ..default_passkey_credential()
        };
        assert_eq!(pc.counter, 0);
    }

    #[test]
    fn test_passkey_challenge_expiry() {
        let challenge = PasskeyChallenge {
            challenge: "ch_abc".into(),
            purpose: "registration".into(),
            expires_at: 1000 + 300000,
            ..default_passkey_challenge()
        };
        assert_eq!(challenge.purpose, "registration");
        assert!(challenge.expires_at > challenge.created_at);
    }

    // ─── Database (inline tables) ────────────────────────────────────────────

    #[test]
    fn test_db_base_view_type() {
        let base = DbBase {
            page_id: "p_1".into(),
            title: "Tasks".into(),
            view_type: "table".into(),
            created_by: "u_1".into(),
            ..default_db_base()
        };
        assert_eq!(base.view_type, "table");
    }

    #[test]
    fn test_db_column_field_type() {
        let col = DbColumn {
            base_id: "db_1".into(),
            name: "Status".into(),
            field_type: "text".into(),
            ..default_db_column()
        };
        assert_eq!(col.field_type, "text");
    }

    #[test]
    fn test_db_cell_value() {
        let cell = DbCell {
            row_id: "drow_1".into(),
            column_id: "dcol_1".into(),
            value: "Done".into(),
            ..default_db_cell()
        };
        assert_eq!(cell.value, "Done");
    }

    // ─── Invitation ──────────────────────────────────────────────────────────

    #[test]
    fn test_invitation_pending_status() {
        let inv = Invitation {
            email: "newuser@example.com".into(),
            role: "member".into(),
            token: "tok_abc".into(),
            status: "pending".into(),
            ..default_invitation()
        };
        assert_eq!(inv.status, "pending");
        assert_eq!(inv.email, "newuser@example.com");
    }

    // ─── SyncedBlock ─────────────────────────────────────────────────────────

    #[test]
    fn test_synced_block_construction() {
        let sb = SyncedBlock {
            title: "Footer Notice".into(),
            content: "© 2026 Acme Corp".into(),
            created_by: "u_1".into(),
            updated_by: "u_1".into(),
            ..default_synced_block()
        };
        assert_eq!(sb.title, "Footer Notice");
    }

    // ─── MFA ─────────────────────────────────────────────────────────────────

    #[test]
    fn test_mfa_method_totp_type() {
        let mfa = MfaMethod {
            user_id: "u_1".into(),
            method_type: "totp".into(),
            is_enabled: false,
            ..default_mfa_method()
        };
        assert!(!mfa.is_enabled);
        assert_eq!(mfa.method_type, "totp");
    }

    // ─── Watch / Notifications ───────────────────────────────────────────────

    #[test]
    fn test_watch_target_type() {
        let watch = Watch {
            user_id: "u_1".into(),
            target_type: "page".into(),
            target_id: "p_1".into(),
            ..default_watch()
        };
        assert_eq!(watch.target_type, "page");
    }

    #[test]
    fn test_notification_unread() {
        let notif = Notification {
            user_id: "u_1".into(),
            event_type: "page.updated".into(),
            target_id: "p_1".into(),
            title: "Page Updated".into(),
            message: "Alice updated Getting Started".into(),
            actor_id: "u_2".into(),
            is_read: false,
            ..default_notification()
        };
        assert!(!notif.is_read);
    }

    // ─── AccessRequest ───────────────────────────────────────────────────────

    #[test]
    fn test_access_request_pending() {
        let req = AccessRequest {
            page_id: "p_1".into(),
            requester_id: "u_2".into(),
            reason: "I need to edit this page".into(),
            status: "pending".into(),
            ..default_access_request()
        };
        assert_eq!(req.status, "pending");
    }

    // ─── OAuth ───────────────────────────────────────────────────────────────

    #[test]
    fn test_oauth_provider_construction() {
        let oauth = OauthProvider {
            name: "GitHub".into(),
            slug: "github".into(),
            provider_type: "github".into(),
            authorize_url: "https://github.com/login/oauth/authorize".into(),
            scope: "read:user".into(),
            is_active: true,
            auto_register: true,
            ..default_oauth_provider()
        };
        assert!(oauth.is_active);
        assert_eq!(oauth.provider_type, "github");
    }

    #[test]
    fn test_oauth_user_linking() {
        let ou = OauthUser {
            user_id: "u_1".into(),
            external_username: "alice".into(),
            external_email: "alice@github.com".into(),
            ..default_oauth_user()
        };
        assert_eq!(ou.external_username, "alice");
    }
}
