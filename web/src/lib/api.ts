const STDB_HOST = "127.0.0.1:3001";
const DB_ID = "c20000000000000000000000000000000000000000000000000000000000000000";

// ─── Helpers ─────────────────────────────────────────────────────────────────

function genId(prefix: string): string {
  const ts = Date.now();
  const rand = ((ts * 1103515245 + 12345) >>> 0).toString(16);
  return `${prefix}_${rand}`;
}

// ─── Row mappers (STDB returns positional arrays, not objects) ──────────────

function mapPage(row: unknown[]): Page {
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
function mapCollection(row: unknown[]): Collection { return { id: String(row[0]??""), name: String(row[1]??""), slug: String(row[2]??""), description: String(row[3]??""), parent_id: String(row[4]??""), icon: String(row[5]??""), color: String(row[6]??""), sort_order: Number(row[7])||0, created_by: String(row[8]??""), created_at: Number(row[9])||0, updated_at: Number(row[10])||0 }; }
function mapUser(row: unknown[]): User { return { id: String(row[0]??""), name: String(row[1]??""), email: String(row[2]??""), role: String(row[4]??""), avatar_url: String(row[5]??""), created_at: Number(row[6])||0 }; }
function mapRevision(row: unknown[]): PageRevision { return { id: String(row[0]??""), page_id: String(row[1]??""), title: String(row[2]??""), content: String(row[3]??""), edited_by: String(row[4]??""), created_at: Number(row[5])||0, revision_number: Number(row[6])||0 }; }
function mapComment(row: unknown[]): Comment { return { id: String(row[0]??""), page_id: String(row[1]??""), parent_comment_id: String(row[2]??""), user_id: String(row[3]??""), body: String(row[4]??""), text_anchor: String(row[5]??""), is_resolved: Boolean(row[6]), created_at: Number(row[7])||0, updated_at: Number(row[8])||0 }; }
function mapCommentReaction(row: unknown[]): CommentReaction { return { id: String(row[0]??""), comment_id: String(row[1]??""), user_id: String(row[2]??""), emoji: String(row[3]??""), created_at: Number(row[4])||0 }; }
function mapTag(row: unknown[]): PageTag { return { id: String(row[0]??""), page_id: String(row[1]??""), name: String(row[2]??""), value: String(row[3]??"") }; }
function mapAttachment(row: unknown[]): Attachment { return { id: String(row[0]??""), page_id: String(row[1]??""), filename: String(row[2]??""), mime_type: String(row[3]??""), size_bytes: Number(row[4])||0, storage_key: String(row[5]??""), uploaded_by: String(row[6]??""), created_at: Number(row[7])||0 }; }
function mapCollectionMember(row: unknown[]): CollectionMember { return { id: String(row[0]??""), collection_id: String(row[1]??""), user_id: String(row[2]??""), role: String(row[3]??""), added_by: String(row[4]??""), created_at: Number(row[5])||0 }; }
function mapShareLink(row: unknown[]): ShareLink { return { id: String(row[0]??""), page_id: String(row[1]??""), token: String(row[2]??""), password_hash: String(row[3]??""), created_by: String(row[4]??""), expires_at: Number(row[5])||0, created_at: Number(row[6])||0, visit_count: Number(row[7])||0 }; }
function mapApiKey(row: unknown[]): ApiKey { return { id: String(row[0]??""), user_id: String(row[1]??""), name: String(row[2]??""), key_hash: String(row[3]??""), key_prefix: String(row[4]??""), last_used_at: Number(row[5])||0, created_at: Number(row[6])||0, expires_at: Number(row[7])||0, is_revoked: Boolean(row[8]) }; }
function mapGroup(row: unknown[]): Group { return { id: String(row[0]??""), name: String(row[1]??""), description: String(row[2]??""), created_by: String(row[3]??""), created_at: Number(row[4])||0, updated_at: Number(row[5])||0 }; }
function mapGroupMember(row: unknown[]): GroupMember { return { id: String(row[0]??""), group_id: String(row[1]??""), user_id: String(row[2]??""), role: String(row[3]??""), added_by: String(row[4]??""), created_at: Number(row[5])||0 }; }
function mapCollectionGroupPermission(row: unknown[]): CollectionGroupPermission { return { id: String(row[0]??""), collection_id: String(row[1]??""), group_id: String(row[2]??""), role: String(row[3]??""), created_at: Number(row[4])||0 }; }
function mapPagePermission(row: unknown[]): PagePermission { return { id: String(row[0]??""), page_id: String(row[1]??""), user_id: String(row[2]??""), group_id: String(row[3]??""), role: String(row[4]??""), created_at: Number(row[5])||0 }; }
function mapWebhook(row: unknown[]): Webhook { return { id: String(row[0]??""), name: String(row[1]??""), url: String(row[2]??""), events: String(row[3]??""), is_active: Boolean(row[4]), secret: String(row[5]??""), created_by: String(row[6]??""), created_at: Number(row[7])||0, updated_at: Number(row[8])||0 }; }
function mapWebhookEvent(row: unknown[]): WebhookEvent { return { id: String(row[0]??""), webhook_id: String(row[1]??""), event_type: String(row[2]??""), page_id: String(row[3]??""), payload: String(row[4]??""), status: String(row[5]??""), response_code: Number(row[6])||0, response_body: String(row[7]??""), created_at: Number(row[8])||0, sent_at: Number(row[9])||0 }; }
function mapOidcProvider(row: unknown[]): OidcProvider { return { id: String(row[0]??""), name: String(row[1]??""), slug: String(row[2]??""), issuer_url: String(row[3]??""), client_id: String(row[4]??""), client_secret: String(row[5]??""), scopes: String(row[6]??""), is_active: Boolean(row[7]), created_by: String(row[8]??""), created_at: Number(row[9])||0, updated_at: Number(row[10])||0 }; }
function mapSamlProvider(row: unknown[]): SamlProvider { return { id: String(row[0]??""), name: String(row[1]??""), slug: String(row[2]??""), entity_id: String(row[3]??""), sso_url: String(row[4]??""), certificate: String(row[5]??""), name_id_format: String(row[6]??""), attribute_mapping: String(row[7]??""), auto_register: Boolean(row[8]), is_active: Boolean(row[9]), created_by: String(row[10]??""), created_at: Number(row[11])||0, updated_at: Number(row[12])||0 }; }
function mapAppSetting(row: unknown[]): AppSetting { return { key: String(row[0]??""), value: String(row[1]??""), updated_at: Number(row[2])||0 }; }
function mapScimProvider(row: unknown[]): ScimProvider { return { id: String(row[0]??""), name: String(row[1]??""), slug: String(row[2]??""), api_token_hash: String(row[3]??""), is_active: Boolean(row[4]), default_role: String(row[5]??""), auto_register: Boolean(row[6]), deprovision_behavior: String(row[7]??""), sync_groups: Boolean(row[8]), created_by: String(row[9]??""), created_at: Number(row[10])||0, updated_at: Number(row[11])||0 }; }
function mapScimEvent(row: unknown[]): ScimEvent { return { id: String(row[0]??""), provider_id: String(row[1]??""), resource_type: String(row[2]??""), operation: String(row[3]??""), external_id: String(row[4]??""), local_id: String(row[5]??""), status: String(row[6]??""), detail: String(row[7]??""), created_at: Number(row[8])||0 }; }

// ─── STDB SQL ────────────────────────────────────────────────────────────────

async function sqlQuery(sql: string): Promise<Record<string, unknown>[]> {
  const res = await fetch(`http://${STDB_HOST}/v1/database/${DB_ID}/sql`, {
    method: "POST",
    headers: { "Content-Type": "text/plain" },
    body: sql,
  });
  if (!res.ok) throw new Error(`STDB query failed: ${res.status}`);
  const data = await res.json();
  return (data[0]?.rows || []) as Record<string, unknown>[];
}

// ─── Reducer calls ───────────────────────────────────────────────────────────

async function callReducer(reducer: string, args: unknown[]): Promise<void> {
  const res = await fetch(
    `http://${STDB_HOST}/v1/database/${DB_ID}/call/${reducer}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(args),
    },
  );
  if (!res.ok) {
    const text = await res.text();
    throw new Error(text || `Reducer ${reducer} failed: ${res.status}`);
  }
}

// ─── Attachment URL scheme (attachment://<id>) ────────────────────────────────

const ATTACHMENT_PREFIX = "attachment://";

/** Max upload size for pasted/dropped images: 10 MB */
export const MAX_IMAGE_BYTES = 10 * 1024 * 1024;

/** Check if a URL references an inline attachment */
export function isAttachmentUrl(src: string): boolean {
  return src.startsWith(ATTACHMENT_PREFIX);
}

/** Extract the attachment ID from an attachment:// URL */
export function getAttachmentId(src: string): string {
  return src.slice(ATTACHMENT_PREFIX.length);
}

/** Read a File as a base64 string (without the data: URI prefix) */
export function readFileAsBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const dataUri = reader.result as string;
      resolve(dataUri.split(",")[1] || "");
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

/** Convert base64 + mime type to a blob: URL */
export function base64ToBlobUrl(base64: string, mimeType: string): string {
  try {
    const binary = atob(base64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) {
      bytes[i] = binary.charCodeAt(i);
    }
    const blob = new Blob([bytes], { type: mimeType });
    return URL.createObjectURL(blob);
  } catch (e) {
    console.error("base64ToBlobUrl failed:", e);
    return "";
  }
}

/**
 * Walk through Tiptap editor JSON and resolve every attachment:// URL into
 * a blob: URL by loading the base64 payload from the STDB attachment table.
 * Uses the supplied cache Map to avoid redundant lookups.
 * Returns a new content tree with resolved URLs plus the cache map.
 */
export async function resolveContentAttachments(
  content: unknown,
  blobCache: Map<string, string>,
): Promise<unknown> {
  // Collect attachment IDs that need fetching
  const needed = new Set<string>();
  const walkCollect = (node: unknown) => {
    if (!node || typeof node !== "object") return;
    const obj = node as Record<string, unknown>;
    if (
      obj.attrs && typeof obj.attrs === "object" &&
      typeof (obj.attrs as Record<string, unknown>).src === "string" &&
      isAttachmentUrl((obj.attrs as Record<string, unknown>).src as string)
    ) {
      const id = getAttachmentId((obj.attrs as Record<string, unknown>).src as string);
      if (!blobCache.has(id)) needed.add(id);
    }
    if (Array.isArray(obj.content)) {
      obj.content.forEach(walkCollect);
    }
  };
  walkCollect(content);

  // Fetch missing attachments from STDB
  if (needed.size > 0) {
    for (const id of needed) {
      try {
        const rows = await sqlQuery(`SELECT * FROM attachment WHERE id = '${id}'`);
        if (rows.length > 0) {
          const row = rows[0] as any as unknown[];
          const storageKey = String(row[5] ?? "");
          const mimeType = String(row[3] ?? "image/png");
          const blobUrl = base64ToBlobUrl(storageKey, mimeType);
          if (blobUrl) blobCache.set(id, blobUrl);
        }
      } catch (err) {
        console.error(`resolveContentAttachments: failed to load attachment ${id}`, err);
      }
    }
  }

  // Replace attachment:// URLs with blob URLs
  const resolveNode = (node: unknown): unknown => {
    if (!node || typeof node !== "object") return node;
    const obj = node as Record<string, unknown>;
    if (
      obj.attrs && typeof obj.attrs === "object" &&
      typeof (obj.attrs as Record<string, unknown>).src === "string" &&
      isAttachmentUrl((obj.attrs as Record<string, unknown>).src as string)
    ) {
      const id = getAttachmentId((obj.attrs as Record<string, unknown>).src as string);
      const blobUrl = blobCache.get(id);
      if (blobUrl) {
        return { ...obj, attrs: { ...(obj.attrs as Record<string, unknown>), src: blobUrl } };
      }
    }
    if (Array.isArray(obj.content)) {
      return { ...obj, content: obj.content.map(resolveNode) };
    }
    return obj;
  };
  return resolveNode(content);
}

// ─── Types ───────────────────────────────────────────────────────────────────

export interface Page {
  id: string; title: string; slug: string; content: string;
  text_content: string; collection_id: string; parent_page_id: string;
  status: string; icon: string; color: string; full_width: boolean;
  is_pinned: boolean;
  is_template: boolean; template_id: string; sort_order: number;
  created_by: string; updated_by: string; created_at: number;
  updated_at: number; published_at: number; deleted_at: number;
  direction: string;
}

export interface Collection {
  id: string; name: string; slug: string; description: string;
  parent_id: string; icon: string; color: string; sort_order: number;
  created_by: string; created_at: number; updated_at: number;
}

export interface PageRevision {
  id: string; page_id: string; title: string; content: string;
  edited_by: string; created_at: number; revision_number: number;
}

export interface Comment {
  id: string; page_id: string; parent_comment_id: string;
  user_id: string; body: string; text_anchor: string; is_resolved: boolean;
  created_at: number; updated_at: number;
}

export interface CommentReaction {
  id: string; comment_id: string; user_id: string;
  emoji: string; created_at: number;
}

export interface PageTag {
  id: string; page_id: string; name: string; value: string;
}

export interface Attachment {
  id: string; page_id: string; filename: string; mime_type: string;
  size_bytes: number; storage_key: string; uploaded_by: string; created_at: number;
}

export interface User {
  id: string; name: string; email: string; role: string; avatar_url: string;
  created_at: number;
}

export interface CollectionMember {
  id: string; collection_id: string; user_id: string; role: string;
  added_by: string; created_at: number;
}

export interface ShareLink {
  id: string; page_id: string; token: string; password_hash: string;
  created_by: string; expires_at: number; created_at: number; visit_count: number;
}

export interface ApiKey {
  id: string; user_id: string; name: string; key_hash: string;
  key_prefix: string; last_used_at: number; created_at: number;
  expires_at: number; is_revoked: boolean;
}

export interface Group {
  id: string; name: string; description: string;
  created_by: string; created_at: number; updated_at: number;
}

export interface GroupMember {
  id: string; group_id: string; user_id: string; role: string;
  added_by: string; created_at: number;
}

export interface CollectionGroupPermission {
  id: string; collection_id: string; group_id: string; role: string;
  created_at: number;
}

export interface PagePermission {
  id: string; page_id: string; user_id: string; group_id: string;
  role: string; created_at: number;
}

export interface Webhook {
  id: string; name: string; url: string; events: string;
  is_active: boolean; secret: string; created_by: string;
  created_at: number; updated_at: number;
}

export interface WebhookEvent {
  id: string; webhook_id: string; event_type: string; page_id: string;
  payload: string; status: string; response_code: number;
  response_body: string; created_at: number; sent_at: number;
}

export interface OidcProvider {
  id: string; name: string; slug: string; issuer_url: string;
  client_id: string; client_secret: string; scopes: string;
  is_active: boolean; created_by: string;
  created_at: number; updated_at: number;
}

export interface SamlProvider {
  id: string; name: string; slug: string; entity_id: string;
  sso_url: string; certificate: string; name_id_format: string;
  attribute_mapping: string; auto_register: boolean;
  is_active: boolean; created_by: string;
  created_at: number; updated_at: number;
}

export interface AppSetting {
  key: string; value: string; updated_at: number;
}

export interface ScimProvider {
  id: string; name: string; slug: string;
  api_token_hash: string; is_active: boolean;
  default_role: string; auto_register: boolean;
  deprovision_behavior: string; sync_groups: boolean;
  created_by: string; created_at: number; updated_at: number;
}

export interface ScimEvent {
  id: string; provider_id: string; resource_type: string;
  operation: string; external_id: string; local_id: string;
  status: string; detail: string; created_at: number;
}

export interface CollabSession {
  id: string; page_id: string; user_id: string;
  user_name: string; color: string; cursor_position: string;
  last_seen_at: number; joined_at: number;
}

export interface CollabUpdate {
  id: string; page_id: string; update_data: string;
  user_id: string; created_at: number;
}

// ─── AI Assistant Types ────────────────────────────────────────────────────────

export interface AiConfig {
  key: string; value: string; updated_at: number;
}

export interface AiChatSession {
  id: string; user_id: string; title: string;
  page_context_id: string; created_at: number; updated_at: number;
}

export interface AiChatMessage {
  id: string; session_id: string; role: string;
  content: string; created_at: number;
}

// ─── Database Bases Types ────────────────────────────────────────────────────

export interface DbBase {
  id: string; page_id: string; title: string;
  view_type: string; created_by: string;
  created_at: number; updated_at: number;
}

export interface DbColumn {
  id: string; base_id: string; name: string;
  field_type: string; options: string;
  sort_order: number; created_at: number; updated_at: number;
}

export interface DbRow {
  id: string; base_id: string; sort_order: number;
  created_by: string; created_at: number; updated_at: number;
}

export interface DbCell {
  id: string; row_id: string; column_id: string;
  value: string; created_at: number; updated_at: number;
}

// ─── Mappers ───────────────────────────────────────────────────────────────────

function mapCollabSession(row: unknown[]): CollabSession {
  return {
    id: String(row[0]??""), page_id: String(row[1]??""), user_id: String(row[2]??""),
    user_name: String(row[3]??""), color: String(row[4]??""),
    cursor_position: String(row[5]??""), last_seen_at: Number(row[6])||0,
    joined_at: Number(row[7])||0,
  };
}
function mapCollabUpdate(row: unknown[]): CollabUpdate {
  return {
    id: String(row[0]??""), page_id: String(row[1]??""),
    update_data: String(row[2]??""), user_id: String(row[3]??""),
    created_at: Number(row[4])||0,
  };
}
function mapAiConfig(row: unknown[]): AiConfig {
  return { key: String(row[0]??""), value: String(row[1]??""), updated_at: Number(row[2])||0 };
}
function mapAiChatSession(row: unknown[]): AiChatSession {
  return {
    id: String(row[0]??""), user_id: String(row[1]??""), title: String(row[2]??""),
    page_context_id: String(row[3]??""), created_at: Number(row[4])||0,
    updated_at: Number(row[5])||0,
  };
}
function mapAiChatMessage(row: unknown[]): AiChatMessage {
  return {
    id: String(row[0]??""), session_id: String(row[1]??""), role: String(row[2]??""),
    content: String(row[3]??""), created_at: Number(row[4])||0,
  };
}
function mapDbBase(row: unknown[]): DbBase {
  return {
    id: String(row[0]??""), page_id: String(row[1]??""), title: String(row[2]??""),
    view_type: String(row[3]??""), created_by: String(row[4]??""),
    created_at: Number(row[5])||0, updated_at: Number(row[6])||0,
  };
}
function mapDbColumn(row: unknown[]): DbColumn {
  return {
    id: String(row[0]??""), base_id: String(row[1]??""), name: String(row[2]??""),
    field_type: String(row[3]??""), options: String(row[4]??""),
    sort_order: Number(row[5])||0, created_at: Number(row[6])||0, updated_at: Number(row[7])||0,
  };
}
function mapDbRow(row: unknown[]): DbRow {
  return {
    id: String(row[0]??""), base_id: String(row[1]??""), sort_order: Number(row[2])||0,
    created_by: String(row[3]??""), created_at: Number(row[4])||0, updated_at: Number(row[5])||0,
  };
}
function mapDbCell(row: unknown[]): DbCell {
  return {
    id: String(row[0]??""), row_id: String(row[1]??""), column_id: String(row[2]??""),
    value: String(row[3]??""), created_at: Number(row[4])||0, updated_at: Number(row[5])||0,
  };
}

// ─── API ─────────────────────────────────────────────────────────────────────

export const api = {
  pages: {
    list: (collectionId?: string, status?: string) => {
      let sql = "SELECT * FROM page";
      const conditions: string[] = [];
      if (collectionId) conditions.push(`collection_id = '${collectionId}'`);
      if (status) conditions.push(`status = '${status}'`);
      else conditions.push("status != 'deleted'");
      if (conditions.length) sql += " WHERE " + conditions.join(" AND ");
      return sqlQuery(sql).then((rows) => (rows as any as unknown[][]).map(mapPage));
    },
    listDeleted: () =>
      sqlQuery("SELECT * FROM page WHERE status = 'deleted'").then((rows) => (rows as any as unknown[][]).map(mapPage)),
    get: (id: string) =>
      sqlQuery(`SELECT * FROM page WHERE id = '${id}'`).then(
        (rows) => ((rows as any as unknown[][])[0] ? mapPage((rows as any as unknown[][])[0]) : null),
      ),
    getBySlug: (slug: string) =>
      sqlQuery(`SELECT * FROM page WHERE slug = '${slug}'`).then(
        (rows) => ((rows as any as unknown[][])[0] ? mapPage((rows as any as unknown[][])[0]) : null),
      ),
    create: (
      title: string,
      content: string,
      collectionId: string,
      parentPageId: string,
      createdBy: string,
    ) => {
      const id = genId("page");
      return callReducer("create_page", [
        id, title, content, collectionId, parentPageId, createdBy,
      ]).then(() => id);
    },
    update: (id: string, title: string, content: string, updatedBy: string) =>
      callReducer("update_page", [id, title, content, updatedBy]),
    setStatus: (id: string, status: string) =>
      callReducer("set_page_status", [id, status]),
    delete: (id: string) => callReducer("delete_page_permanent", [id]),
    restore: (id: string) => callReducer("restore_page", [id]),
    emptyTrash: () => callReducer("empty_trash", []),
    duplicate: (id: string, createdBy: string) => {
      const newId = genId("page");
      return callReducer("duplicate_page", [newId, id, createdBy]).then(() => newId);
    },
    move: (id: string, newCollectionId: string, newParentPageId: string) =>
      callReducer("move_page", [id, newCollectionId, newParentPageId]),
    reorder: (orderedIds: string[]) =>
      callReducer("reorder_pages", [orderedIds]),
    setIcon: (id: string, icon: string) =>
      callReducer("set_page_icon", [id, icon]),
    setFullWidth: (id: string, fullWidth: boolean) =>
      callReducer("set_page_full_width", [id, fullWidth]),
    setColor: (id: string, color: string) =>
      callReducer("set_page_color", [id, color]),
    setPinned: (id: string, isPinned: boolean) =>
      callReducer("set_page_pinned", [id, isPinned]),
    setDirection: (id: string, direction: string) =>
      callReducer("set_page_direction", [id, direction]),
    markAsTemplate: (id: string, isTemplate: boolean) =>
      callReducer("mark_as_template", [id, isTemplate]),
    createFromTemplate: (templateId: string, title: string, collectionId: string, createdBy: string) => {
      const newId = genId("page");
      return callReducer("create_from_template", [newId, templateId, title, collectionId, createdBy]).then(() => newId);
    },
    listTemplates: () =>
      sqlQuery("SELECT * FROM page WHERE is_template = true")
        .then((rows) => (rows as any as unknown[][]).map(mapPage)),

    // ── Batch operations (for sidebar multi-select) ──
    batchSetStatus: (pageIds: string[], status: string) =>
      callReducer("batch_set_page_status", [pageIds, status]),
    batchMove: (pageIds: string[], newCollectionId: string) =>
      callReducer("batch_move_pages", [pageIds, newCollectionId]),
    batchDelete: (pageIds: string[]) =>
      callReducer("batch_delete_pages", [pageIds]),
    batchAddTag: (pageIds: string[], name: string, value: string) =>
      callReducer("batch_add_tag", [pageIds, name, value]),
  },

  collections: {
    list: () => sqlQuery("SELECT * FROM collection").then((rows) => (rows as any as unknown[][]).map(mapCollection)),
    get: (id: string) =>
      sqlQuery(`SELECT * FROM collection WHERE id = '${id}'`).then(
        (rows) => ((rows as any as unknown[][])[0] ? mapCollection((rows as any as unknown[][])[0]) : null),
      ),
    create: (
      name: string,
      description: string,
      parentId: string,
      icon: string,
      color: string,
      createdBy: string,
    ) => {
      const id = genId("col");
      return callReducer("create_collection", [
        id, name, description, parentId, icon, color, createdBy,
      ]).then(() => id);
    },
    update: (
      id: string, name: string, description: string, icon: string, color: string,
    ) => callReducer("update_collection", [id, name, description, icon, color]),
    delete: (id: string) => callReducer("delete_collection", [id]),
    reorder: (orderedIds: string[]) =>
      callReducer("reorder_collections", [orderedIds]),
  },

  members: {
    list: (collectionId: string) =>
      sqlQuery(`SELECT * FROM collection_member WHERE collection_id = '${collectionId}'`)
        .then((rows) => (rows as any as unknown[][]).map(mapCollectionMember)),
    add: (collectionId: string, userId: string, role: string, addedBy: string) => {
      const id = genId("cm");
      return callReducer("add_collection_member", [id, collectionId, userId, role, addedBy]);
    },
    updateRole: (id: string, newRole: string) =>
      callReducer("update_collection_member_role", [id, newRole]),
    remove: (id: string) => callReducer("remove_collection_member", [id]),
  },

  revisions: {
    list: (pageId: string) =>
      sqlQuery(`SELECT * FROM page_revision WHERE page_id = '${pageId}'`)
        .then((rows) => (rows as any as unknown[][]).map(mapRevision)),
  },

  comments: {
    list: (pageId: string) =>
      sqlQuery(`SELECT * FROM comment WHERE page_id = '${pageId}'`)
        .then((rows) => (rows as any as unknown[][]).map(mapComment)),
    add: (
      pageId: string, parentCommentId: string, userId: string, body: string,
      textAnchor: string = "",
    ) => {
      const id = genId("com");
      return callReducer("add_comment", [
        id, pageId, parentCommentId, userId, body, textAnchor,
      ]).then(() => id);
    },
    resolve: (id: string) => callReducer("resolve_comment", [id]),
    delete: (id: string) => callReducer("delete_comment", [id]),
    // ── Comment reactions (STDB-backed with toggle via add_comment_reaction reducer) ──
    listReactions: (commentId: string) =>
      sqlQuery(`SELECT * FROM comment_reaction WHERE comment_id = '${commentId}'`)
        .then((rows) => (rows as any as unknown[][]).map(mapCommentReaction)),
    addReaction: (commentId: string, userId: string, emoji: string) => {
      const id = genId("cr");
      return callReducer("add_comment_reaction", [id, commentId, userId, emoji]);
    },
    hasReacted: async (commentId: string, userId: string, emoji: string): Promise<boolean> => {
      const rows = await sqlQuery(
        `SELECT id FROM comment_reaction WHERE comment_id = '${commentId}' AND user_id = '${userId}' AND emoji = '${emoji}'`
      );
      return rows.length > 0;
    },
  },

  tags: {
    list: (pageId: string) =>
      sqlQuery(`SELECT * FROM page_tag WHERE page_id = '${pageId}'`)
        .then((rows) => (rows as any as unknown[][]).map(mapTag)),
    add: (pageId: string, name: string, value: string) => {
      const id = genId("tag");
      return callReducer("add_tag", [id, pageId, name, value]).then(() => id);
    },
    remove: (id: string) => callReducer("remove_tag", [id]),
  },

  favorites: {
    list: (userId: string) =>
      sqlQuery(`SELECT * FROM favorite WHERE user_id = '${userId}'`),
    toggle: (userId: string, pageId: string) => {
      const id = genId("fav");
      return callReducer("toggle_favorite", [id, userId, pageId]);
    },
  },

  attachments: {
    list: (pageId: string) =>
      sqlQuery(`SELECT * FROM attachment WHERE page_id = '${pageId}'`)
        .then((rows) => (rows as any as unknown[][]).map(mapAttachment)),
    add: (
      pageId: string, filename: string, mimeType: string, sizeBytes: number,
      storageKey: string, uploadedBy: string,
    ) => {
      const id = genId("att");
      return callReducer("add_attachment", [
        id, pageId, filename, mimeType, sizeBytes, storageKey, uploadedBy,
      ]).then(() => id);
    },
    delete: (id: string) => callReducer("delete_attachment", [id]),
  },

  shareLinks: {
    list: (pageId: string) =>
      sqlQuery(`SELECT * FROM share_link WHERE page_id = '${pageId}'`)
        .then((rows) => (rows as any as unknown[][]).map(mapShareLink)),
    create: (pageId: string, password: string, createdBy: string, expiresDays: number) => {
      const id = genId("share");
      const token = crypto.randomUUID ? crypto.randomUUID() : genId("sh");
      return callReducer("create_share_link", [
        id, pageId, token, password, createdBy, expiresDays,
      ]).then(() => ({ id, token }));
    },
    delete: (id: string) => callReducer("delete_share_link", [id]),
    verify: (token: string, password: string) =>
      callReducer("verify_share_password", [token, password]),
    visit: (token: string) =>
      callReducer("visit_share_link", [token]),
  },

  users: {
    register: (name: string, email: string, password: string, role: string) => {
      const id = genId("user");
      return callReducer("register_user", [id, name, email, password, role]);
    },
    login: async (email: string, password: string) => {
      await callReducer("login_user", [email, password]);
      const rows = await sqlQuery(`SELECT * FROM user WHERE email = '${email}'`);
      return (rows as any as unknown[][])[0] ? mapUser((rows as any as unknown[][])[0]) : null;
    },
    list: () => sqlQuery("SELECT * FROM user").then((rows) => (rows as any as unknown[][]).map(mapUser)),
    get: (id: string) =>
      sqlQuery(`SELECT * FROM user WHERE id = '${id}'`).then(
        (rows) => ((rows as any as unknown[][])[0] ? mapUser((rows as any as unknown[][])[0]) : null),
      ),
    getByEmail: (email: string) =>
      sqlQuery(`SELECT * FROM user WHERE email = '${email}'`).then(
        (rows) => ((rows as any as unknown[][])[0] ? mapUser((rows as any as unknown[][])[0]) : null),
      ),
    updateRole: (userId: string, newRole: string, updatedBy: string) =>
      callReducer("update_user_role", [userId, newRole, updatedBy]),
  },

  apiKeys: {
    list: (userId: string) =>
      sqlQuery(`SELECT * FROM api_key WHERE user_id = '${userId}' AND is_revoked = false`)
        .then((rows) => (rows as any as unknown[][]).map(mapApiKey)),
    create: (userId: string, name: string, keyHash: string, keyPrefix: string, expiresDays: number) => {
      const id = genId("apk");
      return callReducer("create_api_key", [id, userId, name, keyHash, keyPrefix, expiresDays]).then(() => id);
    },
    revoke: (id: string) => callReducer("revoke_api_key", [id]),
  },

  groups: {
    list: () => sqlQuery("SELECT * FROM `group`").then((rows) => (rows as any as unknown[][]).map(mapGroup)),
    get: (id: string) =>
      sqlQuery(`SELECT * FROM \`group\` WHERE id = '${id}'`).then(
        (rows) => ((rows as any as unknown[][])[0] ? mapGroup((rows as any as unknown[][])[0]) : null),
      ),
    create: (name: string, description: string, createdBy: string) => {
      const id = genId("grp");
      return callReducer("create_group", [id, name, description, createdBy]).then(() => id);
    },
    update: (id: string, name: string, description: string) =>
      callReducer("update_group", [id, name, description]),
    delete: (id: string) => callReducer("delete_group", [id]),
    listMembers: (groupId: string) =>
      sqlQuery(`SELECT * FROM group_member WHERE group_id = '${groupId}'`)
        .then((rows) => (rows as any as unknown[][]).map(mapGroupMember)),
    addMember: (groupId: string, userId: string, role: string, addedBy: string) => {
      const id = genId("gm");
      return callReducer("add_group_member", [id, groupId, userId, role, addedBy]);
    },
    updateMemberRole: (id: string, newRole: string) =>
      callReducer("update_group_member_role", [id, newRole]),
    removeMember: (id: string) => callReducer("remove_group_member", [id]),
    listCollectionPermissions: (collectionId: string) =>
      sqlQuery(`SELECT * FROM collection_group_permission WHERE collection_id = '${collectionId}'`)
        .then((rows) => (rows as any as unknown[][]).map(mapCollectionGroupPermission)),
    setCollectionPermission: (collectionId: string, groupId: string, role: string) => {
      const id = genId("cgp");
      return callReducer("set_collection_group_permission", [id, collectionId, groupId, role]);
    },
    removeCollectionPermission: (id: string) =>
      callReducer("remove_collection_group_permission", [id]),
  },

  pagePermissions: {
    list: (pageId: string) =>
      sqlQuery(`SELECT * FROM page_permission WHERE page_id = '${pageId}'`)
        .then((rows) => (rows as any as unknown[][]).map(mapPagePermission)),
    set: (pageId: string, userId: string, groupId: string, role: string) => {
      const id = genId("pp");
      return callReducer("set_page_permission", [id, pageId, userId, groupId, role]);
    },
    remove: (id: string) => callReducer("remove_page_permission", [id]),
  },

  webhooks: {
    list: () =>
      sqlQuery("SELECT * FROM webhook")
        .then((rows) => (rows as any as unknown[][]).map(mapWebhook)),
    get: (id: string) =>
      sqlQuery(`SELECT * FROM webhook WHERE id = '${id}'`).then(
        (rows) => ((rows as any as unknown[][])[0] ? mapWebhook((rows as any as unknown[][])[0]) : null),
      ),
    create: (name: string, url: string, events: string, secret: string, createdBy: string) => {
      const id = genId("wh");
      return callReducer("create_webhook", [id, name, url, events, secret, createdBy]).then(() => id);
    },
    update: (id: string, name: string, url: string, events: string, secret: string, isActive: boolean) =>
      callReducer("update_webhook", [id, name, url, events, secret, isActive]),
    delete: (id: string) => callReducer("delete_webhook", [id]),
    listEvents: (webhookId: string) =>
      sqlQuery(`SELECT * FROM webhook_event WHERE webhook_id = '${webhookId}' ORDER BY created_at DESC`)
        .then((rows) => (rows as any as unknown[][]).map(mapWebhookEvent)),
    fire: (webhookId: string, eventType: string, pageId: string, payload: string) => {
      const id = genId("wev");
      return callReducer("fire_webhook_event", [id, webhookId, eventType, pageId, payload]);
    },
    markSent: (id: string, responseCode: number, responseBody: string) =>
      callReducer("mark_webhook_event_sent", [id, responseCode, responseBody]),
    cleanup: (olderThanMs: number) =>
      callReducer("cleanup_webhook_events", [olderThanMs]),
  },

  analytics: {
    recordView: (pageId: string, viewer: string) =>
      callReducer("record_page_view", [pageId, viewer]),
    getViewCount: (pageId: string) =>
      sqlQuery(`SELECT COUNT(*) FROM page_view WHERE page_id = '${pageId}'`)
        .then((rows) => Number((rows[0] as any)?.[0] ?? 0)),
    getTrending: (limit: number = 8) =>
      sqlQuery(
        "SELECT page_id, COUNT(*) FROM page_view " +
        "GROUP BY page_id ORDER BY COUNT(*) DESC",
      ).then((rows) => (rows as any as unknown[][]).slice(0, limit).map(r => ({
        page_id: String(r[0] ?? ""),
        views: Number(r[1] ?? 0),
      }))),
  },

  oidc: {
    list: () =>
      sqlQuery("SELECT * FROM oidc_provider")
        .then((rows) => (rows as any as unknown[][]).map(mapOidcProvider)),
    get: (id: string) =>
      sqlQuery(`SELECT * FROM oidc_provider WHERE id = '${id}'`).then(
        (rows) => ((rows as any as unknown[][])[0] ? mapOidcProvider((rows as any as unknown[][])[0]) : null),
      ),
    listActive: () =>
      sqlQuery("SELECT * FROM oidc_provider WHERE is_active = true")
        .then((rows) => (rows as any as unknown[][]).map(mapOidcProvider)),
    create: (
      name: string, slug: string, issuerUrl: string,
      clientId: string, clientSecret: string, scopes: string,
      createdBy: string,
    ) => {
      const id = "oidc_" + Math.random().toString(36).slice(2, 10);
      return callReducer("add_oidc_provider", [
        id, name, slug, issuerUrl, clientId, clientSecret, scopes, createdBy,
      ]).then(() => id);
    },
    update: (
      id: string, name: string, slug: string, issuerUrl: string,
      clientId: string, clientSecret: string, scopes: string, isActive: boolean,
    ) =>
      callReducer("update_oidc_provider", [
        id, name, slug, issuerUrl, clientId, clientSecret, scopes, isActive,
      ]),
    delete: (id: string) =>
      callReducer("delete_oidc_provider", [id]),
  },

  saml: {
    list: () =>
      sqlQuery("SELECT * FROM saml_provider")
        .then((rows) => (rows as any as unknown[][]).map(mapSamlProvider)),
    get: (id: string) =>
      sqlQuery(`SELECT * FROM saml_provider WHERE id = '${id}'`).then(
        (rows) => ((rows as any as unknown[][])[0] ? mapSamlProvider((rows as any as unknown[][])[0]) : null),
      ),
    listActive: () =>
      sqlQuery("SELECT * FROM saml_provider WHERE is_active = true")
        .then((rows) => (rows as any as unknown[][]).map(mapSamlProvider)),
    create: (
      name: string, slug: string, entityId: string, ssoUrl: string,
      certificate: string, nameIdFormat: string, attributeMapping: string,
      autoRegister: boolean, createdBy: string,
    ) => {
      const id = "saml_" + Math.random().toString(36).slice(2, 10);
      return callReducer("add_saml_provider", [
        id, name, slug, entityId, ssoUrl, certificate, nameIdFormat,
        attributeMapping, autoRegister, createdBy,
      ]).then(() => id);
    },
    update: (
      id: string, name: string, slug: string, entityId: string, ssoUrl: string,
      certificate: string, nameIdFormat: string, attributeMapping: string,
      autoRegister: boolean, isActive: boolean,
    ) =>
      callReducer("update_saml_provider", [
        id, name, slug, entityId, ssoUrl, certificate, nameIdFormat,
        attributeMapping, autoRegister, isActive,
      ]),
    delete: (id: string) =>
      callReducer("delete_saml_provider", [id]),
  },

  // ── Database Bases (table/kanban views) ──
  databases: {
    list: (pageId?: string) => {
      let sql = "SELECT * FROM db_base";
      if (pageId) sql += ` WHERE page_id = '${pageId}'`;
      sql += " ORDER BY created_at ASC";
      return sqlQuery(sql).then((rows) => (rows as any as unknown[][]).map(mapDbBase));
    },
    get: (id: string) =>
      sqlQuery(`SELECT * FROM db_base WHERE id = '${id}'`).then(
        (rows) => ((rows as any as unknown[][])[0] ? mapDbBase((rows as any as unknown[][])[0]) : null),
      ),
    create: (pageId: string, title: string, viewType: string, createdBy: string) => {
      const id = genId("db");
      return callReducer("create_db_base", [id, pageId, title, viewType, createdBy]).then(() => id);
    },
    delete: (id: string) => callReducer("delete_db_base", [id]),

    columns: {
      list: (baseId: string) =>
        sqlQuery(`SELECT * FROM db_column WHERE base_id = '${baseId}' ORDER BY sort_order ASC`)
          .then((rows) => (rows as any as unknown[][]).map(mapDbColumn)),
      create: (baseId: string, name: string, fieldType: string, options: string = "{}", sortOrder: number = 0) => {
        const id = genId("dbc");
        return callReducer("create_db_column", [id, baseId, name, fieldType, options, sortOrder]).then(() => id);
      },
    },

    rows: {
      list: (baseId: string) =>
        sqlQuery(`SELECT * FROM db_row WHERE base_id = '${baseId}' ORDER BY sort_order ASC`)
          .then((rows) => (rows as any as unknown[][]).map(mapDbRow)),
      get: (id: string) =>
        sqlQuery(`SELECT * FROM db_row WHERE id = '${id}'`).then(
          (rows) => ((rows as any as unknown[][])[0] ? mapDbRow((rows as any as unknown[][])[0]) : null),
        ),
      create: (baseId: string, sortOrder: number, createdBy: string) => {
        const id = genId("dbr");
        return callReducer("create_db_row", [id, baseId, sortOrder, createdBy]).then(() => id);
      },
      delete: (id: string) => callReducer("delete_db_row", [id]),
      reorder: (rowIds: string[], newSortOrders: number[]) =>
        callReducer("reorder_db_rows", [rowIds, newSortOrders]),
    },

    cells: {
      list: (rowId: string) =>
        sqlQuery(`SELECT * FROM db_cell WHERE row_id = '${rowId}'`)
          .then((rows) => (rows as any as unknown[][]).map(mapDbCell)),
      listForBase: (baseId: string) =>
        sqlQuery(
          `SELECT c.* FROM db_cell c INNER JOIN db_row r ON c.row_id = r.id WHERE r.base_id = '${baseId}'`
        ).then((rows) => (rows as any as unknown[][]).map(mapDbCell)),
      update: (rowId: string, columnId: string, value: string) => {
        const id = genId("dce");
        return callReducer("set_db_cell", [rowId, columnId, value]);
      },
    },
  },

  settings: {
    get: async (key: string): Promise<string> => {
      const rows = await sqlQuery(`SELECT * FROM app_setting WHERE key = '${key}'`);
      return rows.length > 0 ? String((rows as any as unknown[][])[0]?.[1] ?? "") : "";
    },
    set: (key: string, value: string) =>
      callReducer("set_app_setting", [key, value]),
    getTrashRetentionDays: async (): Promise<number> => {
      const val = await api.settings.get("trash_retention_days");
      return parseInt(val) || 0;
    },
    setTrashRetentionDays: (days: number) =>
      callReducer("set_app_setting", ["trash_retention_days", String(days)]),
    purgeExpiredTrash: () =>
      callReducer("purge_expired_trash", []),
  },

  // ── Real-time collaboration ──
  collaboration: {
    joinSession: (pageId: string, userId: string, userName: string, color: string) =>
      callReducer("join_collab_session", [pageId, userId, userName, color]),
    leaveSession: (pageId: string, userId: string) =>
      callReducer("leave_collab_session", [pageId, userId]),
    updateCursor: (pageId: string, userId: string, cursorJson: string) =>
      callReducer("update_cursor_position", [pageId, userId, cursorJson]),
    broadcastUpdate: (pageId: string, updateData: string, userId: string) => {
      const id = genId("cu");
      return callReducer("broadcast_yjs_update", [id, pageId, updateData, userId]);
    },
    getSessions: (pageId: string) =>
      sqlQuery(`SELECT * FROM collab_session WHERE page_id = '${pageId}'`)
        .then((rows) => (rows as any as unknown[][]).map(mapCollabSession)),
    getUpdates: (pageId: string) =>
      sqlQuery(`SELECT * FROM collab_update WHERE page_id = '${pageId}' ORDER BY created_at ASC`)
        .then((rows) => (rows as any as unknown[][]).map(mapCollabUpdate)),
    cleanupSessions: () =>
      callReducer("cleanup_stale_collab_sessions", []),
    cleanupOldUpdates: () =>
      callReducer("cleanup_old_collab_updates", []),
  },

  // ── AI Assistant ──
  ai: {
    config: {
      get: async (key: string): Promise<string> => {
        const rows = await sqlQuery(`SELECT * FROM ai_config WHERE key = '${key}'`);
        return rows.length > 0 ? String((rows as any as unknown[][])[0]?.[1] ?? "") : "";
      },
      getAll: () =>
        sqlQuery("SELECT * FROM ai_config")
          .then((rows) => (rows as any as unknown[][]).map(mapAiConfig)),
      set: (key: string, value: string) =>
        callReducer("set_ai_config", [key, value]),
    },
    sessions: {
      list: (userId: string) =>
        sqlQuery(`SELECT * FROM ai_chat_session WHERE user_id = '${userId}' ORDER BY updated_at DESC`)
          .then((rows) => (rows as any as unknown[][]).map(mapAiChatSession)),
      get: (id: string) =>
        sqlQuery(`SELECT * FROM ai_chat_session WHERE id = '${id}'`)
          .then((rows) => (rows as any as unknown[][])[0] ? mapAiChatSession((rows as any as unknown[][])[0]) : null),
      create: (userId: string, title: string, pageContextId: string = "") => {
        const id = genId("ai_s");
        return callReducer("create_ai_chat_session", [id, userId, title, pageContextId])
          .then(() => id);
      },
      delete: (id: string) =>
        callReducer("delete_ai_chat_session", [id]),
    },
    messages: {
      list: (sessionId: string) =>
        sqlQuery(`SELECT * FROM ai_chat_message WHERE session_id = '${sessionId}' ORDER BY created_at ASC`)
          .then((rows) => (rows as any as unknown[][]).map(mapAiChatMessage)),
      add: (sessionId: string, role: string, content: string) => {
        const id = genId("ai_m");
        return callReducer("add_ai_chat_message", [id, sessionId, role, content])
          .then(() => id);
      },
      delete: (id: string) =>
        callReducer("delete_ai_chat_message", [id]),
    },
    /** Call the AI proxy to get an LLM response */
    ask: async (sessionId: string, userMessage: string, pageContextId?: string): Promise<string> => {
      // Get AI config
      const [provider, apiUrl, apiKey, model, systemPrompt] = await Promise.all([
        api.ai.config.get("provider"),
        api.ai.config.get("api_url"),
        api.ai.config.get("api_key"),
        api.ai.config.get("model"),
        api.ai.config.get("system_prompt"),
      ]);

      // Get conversation history
      const messages = await api.ai.messages.list(sessionId);

      // Get page context if specified
      let pageContext = "";
      if (pageContextId) {
        const page = await api.pages.get(pageContextId);
        if (page) {
          pageContext = page.text_content.substring(0, 4000);
        }
      }

      // Call AI proxy via HTTP
      const proxyUrl = (apiUrl || "http://localhost:11434") + "/v1/chat/completions";
      const body = JSON.stringify({
        model: model || "llama3.2",
        messages: [
          ...(systemPrompt ? [{ role: "system", content: systemPrompt }] : []),
          ...(pageContext ? [{ role: "system", content: `Context from current page:\n${pageContext}` }] : []),
          ...messages.map((m: AiChatMessage) => ({ role: m.role, content: m.content })),
          { role: "user", content: userMessage },
        ],
        stream: false,
      });

      const res = await fetch(proxyUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(apiKey ? { "Authorization": `Bearer ${apiKey}` } : {}),
        },
        body,
      });

      if (!res.ok) {
        const text = await res.text();
        throw new Error(`AI request failed: ${res.status} — ${text.slice(0, 200)}`);
      }

      const data = await res.json();
      return data.choices?.[0]?.message?.content || "[No response from AI]";
    },
  },
  scim: {
    listProviders: () =>
      sqlQuery("SELECT * FROM scim_provider").then((rows) => (rows as any as unknown[][]).map(mapScimProvider)),
    addProvider: (name: string, slug: string, apiToken: string, defaultRole: string,
                  autoRegister: boolean, deprovisionBehavior: string, syncGroups: boolean,
                  createdBy: string) => {
      const id = genId("scim");
      return callReducer("add_scim_provider", [id, name, slug, apiToken, defaultRole,
        autoRegister, deprovisionBehavior, syncGroups, createdBy]).then(() => id);
    },
    updateProvider: (id: string, name: string, slug: string, apiToken: string,
                      defaultRole: string, autoRegister: boolean, deprovisionBehavior: string,
                      syncGroups: boolean, isActive: boolean) =>
      callReducer("update_scim_provider", [id, name, slug, apiToken, defaultRole,
        autoRegister, deprovisionBehavior, syncGroups, isActive]),
    deleteProvider: (id: string) => callReducer("delete_scim_provider", [id]),
    listEvents: (providerId?: string) => {
      let sql = "SELECT * FROM scim_event";
      if (providerId) sql += ` WHERE provider_id = '${providerId}'`;
      sql += " ORDER BY created_at DESC LIMIT 100";
      return sqlQuery(sql).then((rows) => (rows as any as unknown[][]).map(mapScimEvent));
    },
  },
};

// ─── Transclusion resolver ────────────────────────────────────────────────────
//
// Scans ProseMirror JSON for `{{@page_id}}` or `{{@slug}}` patterns in text nodes
// and replaces them with the referenced page's content wrapped in a
// transclusion node for inline rendering.

/**
 * Find a page by ID or slug. Tries ID first, then slug.
 */
async function resolvePageRef(ref: string): Promise<Page | null> {
  // Try as ID first
  let page = await api.pages.get(ref);
  if (page) return page;
  // Try as slug
  try {
    const rows = await sqlQuery(`SELECT * FROM page WHERE slug = '${ref}'`);
    if (rows.length > 0) {
      return mapPage((rows as any as unknown[][])[0]);
    }
  } catch { /* ignore */ }
  return null;
}

/**
 * Walk a ProseMirror JSON tree and replace all text nodes containing
 * `{{@page_id}}` or `{{@slug}}` patterns with transclusion nodes.
 *
 * The transclusion node has attrs: { pageId, pageTitle, content } where
 * `content` is the referenced page's ProseMirror content (parsed JSON).
 *
 * Handles:
 *   - `{{@page_id}}` — inline reference by page ID
 *   - `{{@slug}}` — inline reference by page slug
 *
 * Returns the resolved content tree (or the original if no transclusions found).
 */
export async function resolveTransclusions(doc: unknown): Promise<unknown> {
  if (!doc || typeof doc !== "object") return doc;
  const obj = doc as Record<string, unknown>;

  // TRANSCLUSION_REGEX matches {{@<identifier>}} where identifier is
  // alphanumeric plus underscore and hyphen (covers both IDs and slugs)
  const TRANS_RE = /\{\{@([a-zA-Z0-9_:-]+)\}\}/g;

  // Walk content array, looking for text nodes with transclusion patterns
  async function walkNode(node: unknown): Promise<unknown> {
    if (!node || typeof node !== "object") return node;
    const n = node as Record<string, unknown>;

    if (n.type === "text" && typeof n.text === "string") {
      const text = n.text as string;
      if (!text.includes("{{@")) return node; // fast path

      const parts: unknown[] = [];
      let lastIndex = 0;
      let match: RegExpExecArray | null;

      // Reset regex
      TRANS_RE.lastIndex = 0;

      while ((match = TRANS_RE.exec(text)) !== null) {
        // Push text before the match
        if (match.index > lastIndex) {
          const before = text.slice(lastIndex, match.index);
          if (before) {
            parts.push({ type: "text", text: before });
          }
        }

        const ref = match[1];
        // Fetch referenced page
        const referencedPage = await resolvePageRef(ref);
        if (referencedPage) {
          let parsedContent: unknown = null;
          try {
            parsedContent = JSON.parse(referencedPage.content || "{}");
          } catch {
            parsedContent = { type: "doc", content: [
              { type: "paragraph", content: [{ type: "text", text: `[Page "${referencedPage.title}" — content could not be parsed]` }] }
            ]};
          }

          parts.push({
            type: "transclusion",
            attrs: {
              pageId: referencedPage.id,
              pageTitle: referencedPage.title,
              content: parsedContent,
            },
          });
        } else {
          // Page not found — show a placeholder text
          parts.push({
            type: "text",
            text: `[Page not found: ${ref}]`,
          });
        }

        lastIndex = match.index + match[0].length;
      }

      // Push remaining text after the last match
      if (lastIndex < text.length) {
        const remaining = text.slice(lastIndex);
        if (remaining) {
          parts.push({ type: "text", text: remaining });
        }
      }

      if (parts.length === 0) return node;
      if (parts.length === 1) return parts[0];
      // Multiple parts — return a virtual paragraph wrapping all parts
      // (Tiptap doc model won't accept bare array where a single node is expected,
      //  but since this runs before editor.setContent, the parent walker handles it)
      return { type: "paragraph", content: parts };
    }

    // Recurse into content array
    if (Array.isArray(n.content)) {
      const resolvedContent: unknown[] = [];
      for (const child of n.content) {
        const resolved = await walkNode(child);
        if (Array.isArray(resolved)) {
          // If a text node resolved to multiple parts, spread them
          resolvedContent.push(...resolved);
        } else {
          resolvedContent.push(resolved);
        }
      }
      return { ...n, content: resolvedContent };
    }

    return node;
  }

  return walkNode(obj);
}

// ─── Subscription helpers ────────────────────────────────────────────────────
// These hooks wrap useSubscription with proper STDB positional-array mappers
// for real-time data in App.tsx and other components.

import { useSubscription } from "./subscriptions";

export const SUBSCRIPTION_SQLS = {
  pages: "SELECT * FROM page WHERE status != 'deleted'",
  allPages: "SELECT * FROM page",
  collections: "SELECT * FROM collection",
  comments: (pageId: string) => `SELECT * FROM comment WHERE page_id = '${pageId}'`,
  favorites: (userId: string) => `SELECT * FROM favorite WHERE user_id = '${userId}'`,
  tags: (pageId: string) => `SELECT * FROM page_tag WHERE page_id = '${pageId}'`,
  collabSessions: (pageId: string) => `SELECT * FROM collab_session WHERE page_id = '${pageId}'`,
  collabUpdates: (pageId: string) => `SELECT * FROM collab_update WHERE page_id = '${pageId}'`,
  dbBases: (pageId: string) => `SELECT * FROM db_base WHERE page_id = '${pageId}'`,
  dbColumns: (baseId: string) => `SELECT * FROM db_column WHERE base_id = '${baseId}' ORDER BY sort_order ASC`,
  dbRows: (baseId: string) => `SELECT * FROM db_row WHERE base_id = '${baseId}' ORDER BY sort_order ASC`,
  dbCellsForBase: (baseId: string) =>
    `SELECT c.* FROM db_cell c INNER JOIN db_row r ON c.row_id = r.id WHERE r.base_id = '${baseId}'`,
} as const;

export function usePagesSubscription() {
  return useSubscription(SUBSCRIPTION_SQLS.pages, (row: unknown[]) => mapPage(row));
}

export function useCollectionsSubscription() {
  return useSubscription(SUBSCRIPTION_SQLS.collections, (row: unknown[]) => mapCollection(row));
}

export function useCollabSessionsSubscription(pageId: string | undefined) {
  return useSubscription(
    pageId ? SUBSCRIPTION_SQLS.collabSessions(pageId) : "SELECT * FROM collab_session WHERE 1=0",
    (row: unknown[]) => mapCollabSession(row),
  );
}

export function useCollabUpdatesSubscription(pageId: string | undefined) {
  return useSubscription(
    pageId ? SUBSCRIPTION_SQLS.collabUpdates(pageId) : "SELECT * FROM collab_update WHERE 1=0",
    (row: unknown[]) => mapCollabUpdate(row),
  );
}
