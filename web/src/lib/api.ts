const STDB_HOST = "192.168.1.10:3001";
const DB_ID = "c2003d19339f9932811b3d54bf9b15e18ae48a47a8c8b7135a47367faa03481e";

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
  };
}
function mapCollection(row: unknown[]): Collection { return { id: String(row[0]??""), name: String(row[1]??""), slug: String(row[2]??""), description: String(row[3]??""), parent_id: String(row[4]??""), icon: String(row[5]??""), color: String(row[6]??""), sort_order: Number(row[7])||0, created_by: String(row[8]??""), created_at: Number(row[9])||0, updated_at: Number(row[10])||0 }; }
function mapUser(row: unknown[]): User { return { id: String(row[0]??""), name: String(row[1]??""), email: String(row[2]??""), role: String(row[4]??""), avatar_url: String(row[5]??""), created_at: Number(row[6])||0 }; }
function mapRevision(row: unknown[]): PageRevision { return { id: String(row[0]??""), page_id: String(row[1]??""), title: String(row[2]??""), content: String(row[3]??""), edited_by: String(row[4]??""), created_at: Number(row[5])||0, revision_number: Number(row[6])||0 }; }
function mapComment(row: unknown[]): Comment { return { id: String(row[0]??""), page_id: String(row[1]??""), parent_comment_id: String(row[2]??""), user_id: String(row[3]??""), body: String(row[4]??""), is_resolved: Boolean(row[5]), created_at: Number(row[6])||0, updated_at: Number(row[7])||0 }; }
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

// ─── Types ───────────────────────────────────────────────────────────────────

export interface Page {
  id: string; title: string; slug: string; content: string;
  text_content: string; collection_id: string; parent_page_id: string;
  status: string; icon: string; color: string; full_width: boolean;
  is_pinned: boolean;
  is_template: boolean; template_id: string; sort_order: number;
  created_by: string; updated_by: string; created_at: number;
  updated_at: number; published_at: number; deleted_at: number;
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
  user_id: string; body: string; is_resolved: boolean;
  created_at: number; updated_at: number;
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
      return sqlQuery(sql).then((rows) => (rows as unknown[][]).map(mapPage));
    },
    listDeleted: () =>
      sqlQuery("SELECT * FROM page WHERE status = 'deleted'").then((rows) => (rows as unknown[][]).map(mapPage)),
    get: (id: string) =>
      sqlQuery(`SELECT * FROM page WHERE id = '${id}'`).then(
        (rows) => ((rows as unknown[][])[0] ? mapPage((rows as unknown[][])[0]) : null),
      ),
    getBySlug: (slug: string) =>
      sqlQuery(`SELECT * FROM page WHERE slug = '${slug}'`).then(
        (rows) => ((rows as unknown[][])[0] ? mapPage((rows as unknown[][])[0]) : null),
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
    markAsTemplate: (id: string, isTemplate: boolean) =>
      callReducer("mark_as_template", [id, isTemplate]),
    createFromTemplate: (templateId: string, title: string, collectionId: string, createdBy: string) => {
      const newId = genId("page");
      return callReducer("create_from_template", [newId, templateId, title, collectionId, createdBy]).then(() => newId);
    },
    listTemplates: () =>
      sqlQuery("SELECT * FROM page WHERE is_template = true")
        .then((rows) => (rows as unknown[][]).map(mapPage)),

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
    list: () => sqlQuery("SELECT * FROM collection").then((rows) => (rows as unknown[][]).map(mapCollection)),
    get: (id: string) =>
      sqlQuery(`SELECT * FROM collection WHERE id = '${id}'`).then(
        (rows) => ((rows as unknown[][])[0] ? mapCollection((rows as unknown[][])[0]) : null),
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
        .then((rows) => (rows as unknown[][]).map(mapCollectionMember)),
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
        .then((rows) => (rows as unknown[][]).map(mapRevision)),
  },

  comments: {
    list: (pageId: string) =>
      sqlQuery(`SELECT * FROM comment WHERE page_id = '${pageId}'`)
        .then((rows) => (rows as unknown[][]).map(mapComment)),
    add: (
      pageId: string, parentCommentId: string, userId: string, body: string,
    ) => {
      const id = genId("com");
      return callReducer("add_comment", [
        id, pageId, parentCommentId, userId, body,
      ]).then(() => id);
    },
    resolve: (id: string) => callReducer("resolve_comment", [id]),
    delete: (id: string) => callReducer("delete_comment", [id]),
    // ── Comment reactions (localStorage-based until STDB module build is fixed) ──
    getReactions: (commentId: string): Record<string, string[]> => {
      try {
        const raw = localStorage.getItem("sw_reactions");
        if (!raw) return {};
        const all = JSON.parse(raw);
        return all[commentId] || {};
      } catch { return {}; }
    },
    addReaction: (commentId: string, userId: string, emoji: string) => {
      try {
        const raw = localStorage.getItem("sw_reactions") || "{}";
        const all = JSON.parse(raw);
        if (!all[commentId]) all[commentId] = {};
        const emojis = all[commentId];
        if (!emojis[emoji]) emojis[emoji] = [];
        // Toggle: if user already reacted with this emoji, remove them
        const idx = emojis[emoji].indexOf(userId);
        if (idx >= 0) {
          emojis[emoji].splice(idx, 1);
          if (emojis[emoji].length === 0) delete emojis[emoji];
        } else {
          emojis[emoji].push(userId);
        }
        localStorage.setItem("sw_reactions", JSON.stringify(all));
      } catch {}
    },
    hasReacted: (commentId: string, userId: string, emoji: string): boolean => {
      try {
        const raw = localStorage.getItem("sw_reactions");
        if (!raw) return false;
        const all = JSON.parse(raw);
        return all[commentId]?.[emoji]?.includes(userId) || false;
      } catch { return false; }
    },
  },

  tags: {
    list: (pageId: string) =>
      sqlQuery(`SELECT * FROM page_tag WHERE page_id = '${pageId}'`)
        .then((rows) => (rows as unknown[][]).map(mapTag)),
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
        .then((rows) => (rows as unknown[][]).map(mapAttachment)),
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
        .then((rows) => (rows as unknown[][]).map(mapShareLink)),
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
      return (rows as unknown[][])[0] ? mapUser((rows as unknown[][])[0]) : null;
    },
    list: () => sqlQuery("SELECT * FROM user").then((rows) => (rows as unknown[][]).map(mapUser)),
    get: (id: string) =>
      sqlQuery(`SELECT * FROM user WHERE id = '${id}'`).then(
        (rows) => ((rows as unknown[][])[0] ? mapUser((rows as unknown[][])[0]) : null),
      ),
    getByEmail: (email: string) =>
      sqlQuery(`SELECT * FROM user WHERE email = '${email}'`).then(
        (rows) => ((rows as unknown[][])[0] ? mapUser((rows as unknown[][])[0]) : null),
      ),
    updateRole: (userId: string, newRole: string, updatedBy: string) =>
      callReducer("update_user_role", [userId, newRole, updatedBy]),
  },

  apiKeys: {
    list: (userId: string) =>
      sqlQuery(`SELECT * FROM api_key WHERE user_id = '${userId}' AND is_revoked = false`)
        .then((rows) => (rows as unknown[][]).map(mapApiKey)),
    create: (userId: string, name: string, keyHash: string, keyPrefix: string, expiresDays: number) => {
      const id = genId("apk");
      return callReducer("create_api_key", [id, userId, name, keyHash, keyPrefix, expiresDays]).then(() => id);
    },
    revoke: (id: string) => callReducer("revoke_api_key", [id]),
  },

  groups: {
    list: () => sqlQuery("SELECT * FROM `group`").then((rows) => (rows as unknown[][]).map(mapGroup)),
    get: (id: string) =>
      sqlQuery(`SELECT * FROM \`group\` WHERE id = '${id}'`).then(
        (rows) => ((rows as unknown[][])[0] ? mapGroup((rows as unknown[][])[0]) : null),
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
        .then((rows) => (rows as unknown[][]).map(mapGroupMember)),
    addMember: (groupId: string, userId: string, role: string, addedBy: string) => {
      const id = genId("gm");
      return callReducer("add_group_member", [id, groupId, userId, role, addedBy]);
    },
    updateMemberRole: (id: string, newRole: string) =>
      callReducer("update_group_member_role", [id, newRole]),
    removeMember: (id: string) => callReducer("remove_group_member", [id]),
    listCollectionPermissions: (collectionId: string) =>
      sqlQuery(`SELECT * FROM collection_group_permission WHERE collection_id = '${collectionId}'`)
        .then((rows) => (rows as unknown[][]).map(mapCollectionGroupPermission)),
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
        .then((rows) => (rows as unknown[][]).map(mapPagePermission)),
    set: (pageId: string, userId: string, groupId: string, role: string) => {
      const id = genId("pp");
      return callReducer("set_page_permission", [id, pageId, userId, groupId, role]);
    },
    remove: (id: string) => callReducer("remove_page_permission", [id]),
  },

  webhooks: {
    list: () =>
      sqlQuery("SELECT * FROM webhook")
        .then((rows) => (rows as unknown[][]).map(mapWebhook)),
    get: (id: string) =>
      sqlQuery(`SELECT * FROM webhook WHERE id = '${id}'`).then(
        (rows) => ((rows as unknown[][])[0] ? mapWebhook((rows as unknown[][])[0]) : null),
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
        .then((rows) => (rows as unknown[][]).map(mapWebhookEvent)),
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
      ).then((rows) => (rows as unknown[][]).slice(0, limit).map(r => ({
        page_id: String(r[0] ?? ""),
        views: Number(r[1] ?? 0),
      }))),
  },

  oidc: {
    list: () =>
      sqlQuery("SELECT * FROM oidc_provider")
        .then((rows) => (rows as unknown[][]).map(mapOidcProvider)),
    get: (id: string) =>
      sqlQuery(`SELECT * FROM oidc_provider WHERE id = '${id}'`).then(
        (rows) => ((rows as unknown[][])[0] ? mapOidcProvider((rows as unknown[][])[0]) : null),
      ),
    listActive: () =>
      sqlQuery("SELECT * FROM oidc_provider WHERE is_active = true")
        .then((rows) => (rows as unknown[][]).map(mapOidcProvider)),
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
        .then((rows) => (rows as unknown[][]).map(mapSamlProvider)),
    get: (id: string) =>
      sqlQuery(`SELECT * FROM saml_provider WHERE id = '${id}'`).then(
        (rows) => ((rows as unknown[][])[0] ? mapSamlProvider((rows as unknown[][])[0]) : null),
      ),
    listActive: () =>
      sqlQuery("SELECT * FROM saml_provider WHERE is_active = true")
        .then((rows) => (rows as unknown[][]).map(mapSamlProvider)),
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
};

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
} as const;

export function usePagesSubscription() {
  return useSubscription(SUBSCRIPTION_SQLS.pages, (row: unknown[]) => mapPage(row));
}

export function useCollectionsSubscription() {
  return useSubscription(SUBSCRIPTION_SQLS.collections, (row: unknown[]) => mapCollection(row));
}
