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
    full_width: Boolean(row[10]), is_template: Boolean(row[11]),
    template_id: String(row[12] ?? ""), sort_order: Number(row[13]) || 0,
    created_by: String(row[14] ?? ""), updated_by: String(row[15] ?? ""),
    created_at: Number(row[16]) || 0, updated_at: Number(row[17]) || 0,
    published_at: Number(row[18]) || 0, deleted_at: Number(row[19]) || 0,
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
    markAsTemplate: (id: string, isTemplate: boolean) =>
      callReducer("mark_as_template", [id, isTemplate]),
    createFromTemplate: (templateId: string, title: string, collectionId: string, createdBy: string) => {
      const newId = genId("page");
      return callReducer("create_from_template", [newId, templateId, title, collectionId, createdBy]).then(() => newId);
    },
    listTemplates: () =>
      sqlQuery("SELECT * FROM page WHERE is_template = true")
        .then((rows) => (rows as unknown[][]).map(mapPage)),
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
};
