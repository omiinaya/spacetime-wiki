import { stdbConfig } from './index.js';

/**
 * Execute a SQL query against STDB and return the rows.
 * Rows are positional arrays from STDB's JSON response.
 */
export async function sqlQuery(sql) {
  const url = `http://${stdbConfig.host}/v1/database/${stdbConfig.dbId}/sql`;
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'text/plain' },
    body: sql,
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`STDB query failed (${res.status}): ${text}`);
  }
  const data = await res.json();
  return (data[0]?.rows || []);
}

/**
 * Call a reducer function on STDB and return the result.
 */
export async function callReducer(reducer, args = []) {
  const url = `http://${stdbConfig.host}/v1/database/${stdbConfig.dbId}/call/${reducer}`;
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(args),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Reducer ${reducer} failed (${res.status}): ${text}`);
  }
  return res.json();
}

/**
 * Generate a simple ID with prefix.
 */
export function genId(prefix) {
  const ts = Date.now();
  const rand = ((ts * 1103515245 + 12345) >>> 0).toString(16);
  return `${prefix}_${rand}`;
}

// ─── Row mappers ─────────────────────────────────────────────────────────────

export function mapPage(row) {
  return {
    id: String(row[0] ?? ''), title: String(row[1] ?? ''), slug: String(row[2] ?? ''),
    content: String(row[3] ?? ''), text_content: String(row[4] ?? ''),
    collection_id: String(row[5] ?? ''), parent_page_id: String(row[6] ?? ''),
    status: String(row[7] ?? ''), icon: String(row[8] ?? ''), color: String(row[9] ?? ''),
    full_width: Boolean(row[10]), is_pinned: Boolean(row[11]),
    is_template: Boolean(row[12]),
    template_id: String(row[13] ?? ''), sort_order: Number(row[14]) || 0,
    created_by: String(row[15] ?? ''), updated_by: String(row[16] ?? ''),
    created_at: Number(row[17]) || 0, updated_at: Number(row[18]) || 0,
    published_at: Number(row[19]) || 0, deleted_at: Number(row[20]) || 0,
  };
}

export function mapCollection(row) {
  return {
    id: String(row[0]??''), name: String(row[1]??''), slug: String(row[2]??''),
    description: String(row[3]??''), parent_id: String(row[4]??''),
    icon: String(row[5]??''), color: String(row[6]??''),
    sort_order: Number(row[7])||0, created_by: String(row[8]??''),
    created_at: Number(row[9])||0, updated_at: Number(row[10])||0,
  };
}

export function mapUser(row) {
  return {
    id: String(row[0]??''), name: String(row[1]??''), email: String(row[2]??''),
    password_hash: String(row[3]??''), role: String(row[4]??''),
    avatar_url: String(row[5]??''),
    created_at: Number(row[6])||0, updated_at: Number(row[7])||0,
  };
}

export function mapPageTag(row) {
  return {
    id: String(row[0]??''), page_id: String(row[1]??''),
    name: String(row[2]??''), value: String(row[3]??''),
  };
}

export function mapAttachment(row) {
  return {
    id: String(row[0]??''), page_id: String(row[1]??''),
    filename: String(row[2]??''), mime_type: String(row[3]??''),
    size_bytes: Number(row[4])||0, storage_key: String(row[5]??''),
    uploaded_by: String(row[6]??''), created_at: Number(row[7])||0,
  };
}
