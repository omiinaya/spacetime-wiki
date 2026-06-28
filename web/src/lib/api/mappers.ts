// SPDX-License-Identifier: ISC

import type {
  Page,
  Collection,
  User,
  PageRevision,
  Comment,
  CommentReaction,
  PageTag,
  Attachment,
  CollectionMember,
  ShareLink,
  ApiKey,
  Group,
  GroupMember,
  CollectionGroupPermission,
  PagePermission,
  Webhook,
  WebhookEvent,
  OidcProvider,
  SamlProvider,
  AppSetting,
  ScimProvider,
  ScimEvent,
  Invitation,
  CollectionSortRule,
  LdapProvider,
  LdapUser,
  Watch,
  Notification,
  AccessRequest,
  CollabSession,
  CollabUpdate,
  PasskeyCredential,
  PasskeyChallenge,
  MfaMethod,
  MfaBackupCode,
  AiConfig,
  AiChatSession,
  AiChatMessage,
  DbBase,
  DbColumn,
  DbRow,
  DbCell,
  SyncedBlock,
  SyncedBlockRef,
  AuditEvent,
} from "./types";

export function mapPage(row: unknown[]): Page {
  return {
    id: String(row[0] ?? ""), title: String(row[1] ?? ""), slug: String(row[2] ?? ""),
    content: String(row[3] ?? ""), text_content: String(row[4] ?? ""),
    collection_id: String(row[5] ?? ""), parent_page_id: String(row[6] ?? ""),
    status: String(row[7] ?? ""), icon: String(row[8] ?? ""), color: String(row[9] ?? ""),
    full_width: Boolean(row[10]), is_pinned: Boolean(row[11]),
    is_template: Boolean(row[12]),
    template_id: String(row[13] ?? ""), sort_order: Number(row[14]) || 0,
    created_by: String(row[15] ?? ""), updated_by: String(row[16] ?? ""),
    created_at: Number(row[17]) || 0, updated_at: Number(row[18]) || 0,
    published_at: Number(row[19]) || 0, deleted_at: Number(row[20]) || 0,
    direction: String(row[21] ?? "ltr"),
  };
}
export function mapCollection(row: unknown[]): Collection { return { id: String(row[0]??""), name: String(row[1]??""), slug: String(row[2]??""), description: String(row[3]??""), parent_id: String(row[4]??""), icon: String(row[5]??""), color: String(row[6]??""), sort_order: Number(row[7])||0, created_by: String(row[8]??""), created_at: Number(row[9])||0, updated_at: Number(row[10])||0 }; }
export function mapUser(row: unknown[]): User { return { id: String(row[0]??""), name: String(row[1]??""), email: String(row[2]??""), role: String(row[4]??""), avatar_url: String(row[5]??""), created_at: Number(row[6])||0 }; }
export function mapRevision(row: unknown[]): PageRevision { return { id: String(row[0]??""), page_id: String(row[1]??""), title: String(row[2]??""), content: String(row[3]??""), edited_by: String(row[4]??""), created_at: Number(row[5])||0, revision_number: Number(row[6])||0 }; }
export function mapComment(row: unknown[]): Comment { return { id: String(row[0]??""), page_id: String(row[1]??""), parent_comment_id: String(row[2]??""), user_id: String(row[3]??""), body: String(row[4]??""), text_anchor: String(row[5]??""), is_resolved: Boolean(row[6]), created_at: Number(row[7])||0, updated_at: Number(row[8])||0 }; }
export function mapCommentReaction(row: unknown[]): CommentReaction { return { id: String(row[0]??""), comment_id: String(row[1]??""), user_id: String(row[2]??""), emoji: String(row[3]??""), created_at: Number(row[4])||0 }; }
export function mapTag(row: unknown[]): PageTag { return { id: String(row[0]??""), page_id: String(row[1]??""), name: String(row[2]??""), value: String(row[3]??"") }; }
export function mapAttachment(row: unknown[]): Attachment { return { id: String(row[0]??""), page_id: String(row[1]??""), filename: String(row[2]??""), mime_type: String(row[3]??""), size_bytes: Number(row[4])||0, storage_key: String(row[5]??""), uploaded_by: String(row[6]??""), created_at: Number(row[7])||0 }; }
export function mapCollectionMember(row: unknown[]): CollectionMember { return { id: String(row[0]??""), collection_id: String(row[1]??""), user_id: String(row[2]??""), role: String(row[3]??""), added_by: String(row[4]??""), created_at: Number(row[5])||0 }; }
export function mapShareLink(row: unknown[]): ShareLink { return { id: String(row[0]??""), page_id: String(row[1]??""), token: String(row[2]??""), password_hash: String(row[3]??""), created_by: String(row[4]??""), expires_at: Number(row[5])||0, created_at: Number(row[6])||0, visit_count: Number(row[7])||0, brand_title: row[8] ? String(row[8]) : null, brand_logo_url: row[9] ? String(row[9]) : null }; }
export function mapApiKey(row: unknown[]): ApiKey { return { id: String(row[0]??""), user_id: String(row[1]??""), name: String(row[2]??""), key_hash: String(row[3]??""), key_prefix: String(row[4]??""), last_used_at: Number(row[5])||0, created_at: Number(row[6])||0, expires_at: Number(row[7])||0, is_revoked: Boolean(row[8]) }; }
export function mapGroup(row: unknown[]): Group { return { id: String(row[0]??""), name: String(row[1]??""), description: String(row[2]??""), created_by: String(row[3]??""), created_at: Number(row[4])||0, updated_at: Number(row[5])||0 }; }
export function mapGroupMember(row: unknown[]): GroupMember { return { id: String(row[0]??""), group_id: String(row[1]??""), user_id: String(row[2]??""), role: String(row[3]??""), added_by: String(row[4]??""), created_at: Number(row[5])||0 }; }
export function mapCollectionGroupPermission(row: unknown[]): CollectionGroupPermission { return { id: String(row[0]??""), collection_id: String(row[1]??""), group_id: String(row[2]??""), role: String(row[3]??""), created_at: Number(row[4])||0 }; }
export function mapPagePermission(row: unknown[]): PagePermission { return { id: String(row[0]??""), page_id: String(row[1]??""), user_id: String(row[2]??""), group_id: String(row[3]??""), role: String(row[4]??""), created_at: Number(row[5])||0 }; }
export function mapWebhook(row: unknown[]): Webhook { return { id: String(row[0]??""), name: String(row[1]??""), url: String(row[2]??""), events: String(row[3]??""), is_active: Boolean(row[4]), secret: String(row[5]??""), created_by: String(row[6]??""), created_at: Number(row[7])||0, updated_at: Number(row[8])||0 }; }
export function mapWebhookEvent(row: unknown[]): WebhookEvent { return { id: String(row[0]??""), webhook_id: String(row[1]??""), event_type: String(row[2]??""), page_id: String(row[3]??""), payload: String(row[4]??""), status: String(row[5]??""), response_code: Number(row[6])||0, response_body: String(row[7]??""), created_at: Number(row[8])||0, sent_at: Number(row[9])||0 }; }
export function mapOidcProvider(row: unknown[]): OidcProvider { return { id: String(row[0]??""), name: String(row[1]??""), slug: String(row[2]??""), issuer_url: String(row[3]??""), client_id: String(row[4]??""), client_secret: String(row[5]??""), scopes: String(row[6]??""), is_active: Boolean(row[7]), created_by: String(row[8]??""), created_at: Number(row[9])||0, updated_at: Number(row[10])||0 }; }
export function mapSamlProvider(row: unknown[]): SamlProvider { return { id: String(row[0]??""), name: String(row[1]??""), slug: String(row[2]??""), entity_id: String(row[3]??""), sso_url: String(row[4]??""), certificate: String(row[5]??""), name_id_format: String(row[6]??""), attribute_mapping: String(row[7]??""), auto_register: Boolean(row[8]), is_active: Boolean(row[9]), created_by: String(row[10]??""), created_at: Number(row[11])||0, updated_at: Number(row[12])||0 }; }
export function mapAppSetting(row: unknown[]): AppSetting { return { key: String(row[0]??""), value: String(row[1]??""), updated_at: Number(row[2])||0 }; }
export function mapScimProvider(row: unknown[]): ScimProvider { return { id: String(row[0]??""), name: String(row[1]??""), slug: String(row[2]??""), api_token_hash: String(row[3]??""), is_active: Boolean(row[4]), default_role: String(row[5]??""), auto_register: Boolean(row[6]), deprovision_behavior: String(row[7]??""), sync_groups: Boolean(row[8]), created_by: String(row[9]??""), created_at: Number(row[10])||0, updated_at: Number(row[11])||0 }; }
export function mapScimEvent(row: unknown[]): ScimEvent { return { id: String(row[0]??""), provider_id: String(row[1]??""), resource_type: String(row[2]??""), operation: String(row[3]??""), external_id: String(row[4]??""), local_id: String(row[5]??""), status: String(row[6]??""), detail: String(row[7]??""), created_at: Number(row[8])||0 }; }
export function mapInvitation(row: unknown[]): Invitation { return { id: String(row[0]??""), email: String(row[1]??""), invited_by: String(row[2]??""), role: String(row[3]??""), page_ids: String(row[4]??""), collection_ids: String(row[5]??""), token: String(row[6]??""), status: String(row[7]??""), message: String(row[8]??""), expires_at: Number(row[9])||0, view_count: Number(row[10])||0, created_at: Number(row[11])||0, updated_at: Number(row[12])||0 }; }
export function mapCollectionSortRule(row: unknown[]): CollectionSortRule { return { collection_id: String(row[0]??""), sort_field: String(row[1]??""), sort_direction: String(row[2]??""), auto_apply: Boolean(row[3]), updated_by: String(row[4]??""), updated_at: Number(row[5])||0 }; }
export function mapLdapProvider(row: unknown[]): LdapProvider { return { id: String(row[0]??""), name: String(row[1]??""), slug: String(row[2]??""), host: String(row[3]??""), port: Number(row[4])||389, is_secure: Boolean(row[5]), bind_dn: String(row[6]??""), bind_password: String(row[7]??""), base_dn: String(row[8]??""), user_filter: String(row[9]??""), username_attribute: String(row[10]??""), email_attribute: String(row[11]??""), name_attribute: String(row[12]??""), default_role: String(row[13]??""), auto_register: Boolean(row[14]), is_active: Boolean(row[15]), created_by: String(row[16]??""), created_at: Number(row[17])||0, updated_at: Number(row[18])||0 }; }
export function mapLdapUser(row: unknown[]): LdapUser { return { id: String(row[0]??""), user_id: String(row[1]??""), ldap_provider_id: String(row[2]??""), dn: String(row[3]??""), external_id: String(row[4]??""), last_synced_at: Number(row[5])||0, created_at: Number(row[6])||0 }; }
export function mapWatch(row: unknown[]): Watch { return { id: String(row[0]??""), user_id: String(row[1]??""), target_type: String(row[2]??""), target_id: String(row[3]??""), created_at: Number(row[4])||0 }; }
export function mapNotification(row: unknown[]): Notification { return { id: String(row[0]??""), user_id: String(row[1]??""), event_type: String(row[2]??""), target_id: String(row[3]??""), title: String(row[4]??""), message: String(row[5]??""), actor_id: String(row[6]??""), icon: String(row[7]??""), is_read: Boolean(row[8]), created_at: Number(row[9])||0 }; }
export function mapAccessRequest(row: unknown[]): AccessRequest { return { id: String(row[0]??""), page_id: String(row[1]??""), requester_id: String(row[2]??""), reason: String(row[3]??""), status: String(row[4]??""), responded_by: String(row[5]??""), responded_at: Number(row[6])||0, created_at: Number(row[7])||0 }; }
export function mapCollabSession(row: unknown[]): CollabSession {
  return {
    id: String(row[0]??""), page_id: String(row[1]??""), user_id: String(row[2]??""),
    user_name: String(row[3]??""), color: String(row[4]??""),
    cursor_position: String(row[5]??""), last_seen_at: Number(row[6])||0,
    joined_at: Number(row[7])||0,
  };
}
export function mapCollabUpdate(row: unknown[]): CollabUpdate {
  return {
    id: String(row[0]??""), page_id: String(row[1]??""),
    update_data: String(row[2]??""), user_id: String(row[3]??""),
    created_at: Number(row[4])||0,
  };
}
export function mapPasskeyCredential(row: unknown[]): PasskeyCredential {
  return {
    id: String(row[0]??""), user_id: String(row[1]??""),
    credential_id: String(row[2]??""), public_key: String(row[3]??""),
    counter: Number(row[4])||0, transports: String(row[5]??""),
    device_name: String(row[6]??""), created_at: Number(row[7])||0,
    last_used_at: Number(row[8])||0,
  };
}
export function mapPasskeyChallenge(row: unknown[]): PasskeyChallenge {
  return {
    challenge: String(row[0]??""), user_handle: String(row[1]??""),
    purpose: String(row[2]??""), created_at: Number(row[3])||0,
    expires_at: Number(row[4])||0,
  };
}
export function mapMfaMethod(row: unknown[]): MfaMethod {
  return {
    id: String(row[0]??""), user_id: String(row[1]??""),
    method_type: String(row[2]??""), totp_secret: String(row[3]??""),
    is_enabled: Boolean(row[4]), created_at: Number(row[5])||0,
    updated_at: Number(row[6])||0,
  };
}
export function mapMfaBackupCode(row: unknown[]): MfaBackupCode {
  return {
    id: String(row[0]??""), user_id: String(row[1]??""),
    code_hash: String(row[2]??""), is_used: Boolean(row[3]),
    created_at: Number(row[4])||0,
  };
}
export function mapAiConfig(row: unknown[]): AiConfig {
  return { key: String(row[0]??""), value: String(row[1]??""), updated_at: Number(row[2])||0 };
}
export function mapAiChatSession(row: unknown[]): AiChatSession {
  return {
    id: String(row[0]??""), user_id: String(row[1]??""), title: String(row[2]??""),
    page_context_id: String(row[3]??""), created_at: Number(row[4])||0,
    updated_at: Number(row[5])||0,
  };
}
export function mapAiChatMessage(row: unknown[]): AiChatMessage {
  return {
    id: String(row[0]??""), session_id: String(row[1]??""), role: String(row[2]??""),
    content: String(row[3]??""), created_at: Number(row[4])||0,
  };
}
export function mapDbBase(row: unknown[]): DbBase {
  return {
    id: String(row[0]??""), page_id: String(row[1]??""), title: String(row[2]??""),
    view_type: String(row[3]??""), created_by: String(row[4]??""),
    created_at: Number(row[5])||0, updated_at: Number(row[6])||0,
  };
}
export function mapDbColumn(row: unknown[]): DbColumn {
  return {
    id: String(row[0]??""), base_id: String(row[1]??""), name: String(row[2]??""),
    field_type: String(row[3]??""), options: String(row[4]??""),
    sort_order: Number(row[5])||0, created_at: Number(row[6])||0, updated_at: Number(row[7])||0,
  };
}
export function mapDbRow(row: unknown[]): DbRow {
  return {
    id: String(row[0]??""), base_id: String(row[1]??""), sort_order: Number(row[2])||0,
    created_by: String(row[3]??""), created_at: Number(row[4])||0, updated_at: Number(row[5])||0,
  };
}
export function mapDbCell(row: unknown[]): DbCell {
  return {
    id: String(row[0]??""), row_id: String(row[1]??""), column_id: String(row[2]??""),
    value: String(row[3]??""), created_at: Number(row[4])||0, updated_at: Number(row[5])||0,
  };
}
export function mapSyncedBlock(row: unknown[]): SyncedBlock {
  return {
    id: String(row[0]??""), title: String(row[1]??""), content: String(row[2]??""),
    created_by: String(row[3]??""), created_at: Number(row[4])||0,
    updated_at: Number(row[5])||0, updated_by: String(row[6]??""),
  };
}
export function mapSyncedBlockRef(row: unknown[]): SyncedBlockRef {
  return {
    id: String(row[0]??""), block_id: String(row[1]??""), page_id: String(row[2]??""),
    created_by: String(row[3]??""), created_at: Number(row[4])||0,
  };
}
export function mapAuditEvent(row: unknown[]): AuditEvent {
  return {
    id: String(row[0] ?? ""),
    event_type: String(row[1] ?? ""),
    actor_id: String(row[2] ?? ""),
    target_id: String(row[3] ?? ""),
    target_name: String(row[4] ?? ""),
    metadata: String(row[5] ?? ""),
    created_at: Number(row[6]) || 0,
  };
}
