// SPDX-License-Identifier: ISC

export interface Page {
  id: string;
  title: string;
  slug: string;
  content: string;
  text_content: string;
  collection_id: string;
  parent_page_id: string;
  status: string;
  icon: string;
  color: string;
  full_width: boolean;
  is_pinned: boolean;
  is_template: boolean;
  template_id: string;
  sort_order: number;
  created_by: string;
  updated_by: string;
  created_at: number;
  updated_at: number;
  published_at: number;
  deleted_at: number;
  direction: string;
}

export interface Collection {
  id: string;
  name: string;
  slug: string;
  description: string;
  parent_id: string;
  icon: string;
  color: string;
  sort_order: number;
  created_by: string;
  created_at: number;
  updated_at: number;
}

export interface PageRevision {
  id: string;
  page_id: string;
  title: string;
  content: string;
  edited_by: string;
  created_at: number;
  revision_number: number;
}

export interface Comment {
  id: string;
  page_id: string;
  parent_comment_id: string;
  user_id: string;
  body: string;
  text_anchor: string;
  is_resolved: boolean;
  created_at: number;
  updated_at: number;
}

export interface CommentReaction {
  id: string;
  comment_id: string;
  user_id: string;
  emoji: string;
  created_at: number;
}

export interface PageTag {
  id: string;
  page_id: string;
  name: string;
  value: string;
}

export interface Attachment {
  id: string;
  page_id: string;
  filename: string;
  mime_type: string;
  size_bytes: number;
  storage_key: string;
  uploaded_by: string;
  created_at: number;
}

export interface User {
  id: string;
  name: string;
  email: string;
  role: string;
  avatar_url: string;
  created_at: number;
}

export interface CollectionMember {
  id: string;
  collection_id: string;
  user_id: string;
  role: string;
  added_by: string;
  created_at: number;
}

export interface ShareLink {
  id: string;
  page_id: string;
  token: string;
  created_by: string;
  expires_at: number;
  created_at: number;
  visit_count: number;
  has_password: boolean;
  brand_title: string | null;
  brand_logo_url: string | null;
}

export interface ApiKey {
  id: string;
  user_id: string;
  name: string;
  key_prefix: string;
  last_used_at: number;
  created_at: number;
  expires_at: number;
  is_revoked: boolean;
}

export interface Group {
  id: string;
  name: string;
  description: string;
  created_by: string;
  created_at: number;
  updated_at: number;
}

export interface GroupMember {
  id: string;
  group_id: string;
  user_id: string;
  role: string;
  added_by: string;
  created_at: number;
}

export interface CollectionGroupPermission {
  id: string;
  collection_id: string;
  group_id: string;
  role: string;
  created_at: number;
}

export interface PagePermission {
  id: string;
  page_id: string;
  user_id: string;
  group_id: string;
  role: string;
  created_at: number;
}

export interface Webhook {
  id: string;
  name: string;
  url: string;
  events: string;
  is_active: boolean;
  secret: string;
  created_by: string;
  created_at: number;
  updated_at: number;
}

export interface WebhookEvent {
  id: string;
  webhook_id: string;
  event_type: string;
  page_id: string;
  payload: string;
  status: string;
  response_code: number;
  response_body: string;
  created_at: number;
  sent_at: number;
}

export interface OidcProvider {
  id: string;
  name: string;
  slug: string;
  issuer_url: string;
  client_id: string;
  client_secret: string;
  scopes: string;
  is_active: boolean;
  created_by: string;
  created_at: number;
  updated_at: number;
}

export interface SamlProvider {
  id: string;
  name: string;
  slug: string;
  entity_id: string;
  sso_url: string;
  certificate: string;
  name_id_format: string;
  attribute_mapping: string;
  auto_register: boolean;
  is_active: boolean;
  created_by: string;
  created_at: number;
  updated_at: number;
}

export interface AppSetting {
  key: string;
  value: string;
  updated_at: number;
}

export interface ScimProvider {
  id: string;
  name: string;
  slug: string;
  api_token_hash: string;
  is_active: boolean;
  default_role: string;
  auto_register: boolean;
  deprovision_behavior: string;
  sync_groups: boolean;
  created_by: string;
  created_at: number;
  updated_at: number;
}

export interface ScimEvent {
  id: string;
  provider_id: string;
  resource_type: string;
  operation: string;
  external_id: string;
  local_id: string;
  status: string;
  detail: string;
  created_at: number;
}

export interface CollabSession {
  id: string;
  page_id: string;
  user_id: string;
  user_name: string;
  color: string;
  cursor_position: string;
  last_seen_at: number;
  joined_at: number;
}

export interface CollabUpdate {
  id: string;
  page_id: string;
  update_data: string;
  user_id: string;
  created_at: number;
}

export interface PasskeyCredential {
  id: string;
  user_id: string;
  credential_id: string;
  public_key: string;
  counter: number;
  transports: string;
  device_name: string;
  created_at: number;
  last_used_at: number;
}

export interface PasskeyChallenge {
  challenge: string;
  user_handle: string;
  purpose: string;
  created_at: number;
  expires_at: number;
}

export interface AiConfig {
  key: string;
  value: string;
  updated_at: number;
}

export interface AiChatSession {
  id: string;
  user_id: string;
  title: string;
  page_context_id: string;
  created_at: number;
  updated_at: number;
}

export interface AiChatMessage {
  id: string;
  session_id: string;
  role: string;
  content: string;
  created_at: number;
}

export interface Invitation {
  id: string;
  email: string;
  invited_by: string;
  role: string;
  page_ids: string;
  collection_ids: string;
  token: string;
  status: string;
  message: string;
  expires_at: number;
  view_count: number;
  created_at: number;
  updated_at: number;
}

export interface CollectionSortRule {
  collection_id: string;
  sort_field: string; // "title" | "created_at" | "updated_at" | "manual"
  sort_direction: string; // "asc" | "desc"
  auto_apply: boolean;
  updated_by: string;
  updated_at: number;
}

export interface MfaMethod {
  id: string;
  user_id: string;
  method_type: string;
  totp_secret: string;
  is_enabled: boolean;
  created_at: number;
  updated_at: number;
}

export interface MfaBackupCode {
  id: string;
  user_id: string;
  code_hash: string;
  is_used: boolean;
  created_at: number;
}

export interface DbBase {
  id: string;
  page_id: string;
  title: string;
  view_type: string;
  created_by: string;
  created_at: number;
  updated_at: number;
}

export interface DbColumn {
  id: string;
  base_id: string;
  name: string;
  field_type: string;
  options: string;
  sort_order: number;
  created_at: number;
  updated_at: number;
}

export interface DbRow {
  id: string;
  base_id: string;
  sort_order: number;
  created_by: string;
  created_at: number;
  updated_at: number;
}

export interface DbCell {
  id: string;
  row_id: string;
  column_id: string;
  value: string;
  created_at: number;
  updated_at: number;
}

export interface SyncedBlock {
  id: string;
  title: string;
  content: string;
  created_by: string;
  created_at: number;
  updated_at: number;
  updated_by: string;
}

export interface SyncedBlockRef {
  id: string;
  block_id: string;
  page_id: string;
  created_by: string;
  created_at: number;
}

export interface LdapProvider {
  id: string;
  name: string;
  slug: string;
  host: string;
  port: number;
  is_secure: boolean;
  bind_dn: string;
  bind_password: string;
  base_dn: string;
  user_filter: string;
  username_attribute: string;
  email_attribute: string;
  name_attribute: string;
  default_role: string;
  auto_register: boolean;
  is_active: boolean;
  created_by: string;
  created_at: number;
  updated_at: number;
}

export interface LdapUser {
  id: string;
  user_id: string;
  ldap_provider_id: string;
  dn: string;
  external_id: string;
  last_synced_at: number;
  created_at: number;
}

export interface Watch {
  id: string;
  user_id: string;
  target_type: string; // "page" | "collection"
  target_id: string;
  created_at: number;
}

export interface AccessRequest {
  id: string;
  page_id: string;
  requester_id: string;
  reason: string;
  status: string; // "pending" | "approved" | "denied"
  responded_by: string;
  responded_at: number;
  created_at: number;
}

export interface Notification {
  id: string;
  user_id: string;
  event_type: string;
  target_id: string;
  title: string;
  message: string;
  actor_id: string;
  icon: string;
  is_read: boolean;
  created_at: number;
}

export interface OauthProvider {
  id: string;
  name: string;
  slug: string;
  provider_type: string; // "slack" | "discord" | "github" | "gitlab" | "generic"
  authorize_url: string;
  token_url: string;
  userinfo_url: string;
  scope: string;
  client_id: string;
  icon: string;
  is_active: boolean;
  auto_register: boolean;
  default_role: string;
  created_by: string;
  created_at: number;
  updated_at: number;
}

export interface OauthUser {
  id: string;
  user_id: string;
  provider_id: string;
  external_id: string;
  external_username: string;
  external_email: string;
  token_expires_at: number;
  last_synced_at: number;
  created_at: number;
  updated_at: number;
}

export interface AuditEvent {
  id: string;
  event_type: string;
  actor_id: string;
  target_id: string;
  target_name: string;
  metadata: string;
  created_at: number;
}
