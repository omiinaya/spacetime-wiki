const STDB_HOST = "127.0.0.1:3001";
const DB_ID = "c20000000000000000000000000000000000000000000000000000000000000000";

// ─── Helpers ─────────────────────────────────────────────────────────────────

function genId(prefix: string): string {
  const ts = Date.now();
  const rand = ((ts * 1103515245 + 12345) >>> 0).toString(16);
  return `${prefix}_${rand}`;
}

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

export interface User {
  id: string; name: string; email: string; role: string; avatar_url: string;
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
      return sqlQuery(sql) as unknown as Page[];
    },
    get: (id: string) =>
      sqlQuery(`SELECT * FROM page WHERE id = '${id}'`).then(
        (rows) => (rows[0] as Page) || null,
      ),
    getBySlug: (slug: string) =>
      sqlQuery(`SELECT * FROM page WHERE slug = '${slug}'`).then(
        (rows) => (rows[0] as Page) || null,
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
    duplicate: (id: string, createdBy: string) => {
      const newId = genId("page");
      return callReducer("duplicate_page", [newId, id, createdBy]).then(() => newId);
    },
    move: (id: string, newCollectionId: string, newParentPageId: string) =>
      callReducer("move_page", [id, newCollectionId, newParentPageId]),
    reorder: (orderedIds: string[]) =>
      callReducer("reorder_pages", [orderedIds]),
  },

  collections: {
    list: () => sqlQuery("SELECT * FROM collection") as unknown as Collection[],
    get: (id: string) =>
      sqlQuery(`SELECT * FROM collection WHERE id = '${id}'`).then(
        (rows) => (rows[0] as Collection) || null,
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

  revisions: {
    list: (pageId: string) =>
      sqlQuery(
        `SELECT * FROM page_revision WHERE page_id = '${pageId}'`,
      ) as unknown as PageRevision[],
  },

  comments: {
    list: (pageId: string) =>
      sqlQuery(
        `SELECT * FROM comment WHERE page_id = '${pageId}'`,
      ) as unknown as Comment[],
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
      sqlQuery(
        `SELECT * FROM page_tag WHERE page_id = '${pageId}'`,
      ) as unknown as PageTag[],
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

  users: {
    register: (name: string, email: string, password: string) => {
      const id = genId("user");
      return callReducer("register_user", [id, name, email, password]);
    },
    login: async (email: string, password: string) => {
      await callReducer("login_user", [email, password]);
      // Login succeeded — look up user by email
      const rows = await sqlQuery(`SELECT * FROM user WHERE email = '${email}'`);
      return (rows[0] as unknown as User) || null;
    },
    get: (id: string) =>
      sqlQuery(`SELECT * FROM user WHERE id = '${id}'`).then(
        (rows) => (rows[0] as User) || null,
      ),
    getByEmail: (email: string) =>
      sqlQuery(`SELECT * FROM user WHERE email = '${email}'`).then(
        (rows) => (rows[0] as User) || null,
      ),
  },
};
