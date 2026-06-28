// SPDX-License-Identifier: ISC

import type { Infer as __Infer } from "spacetimedb";

export const STDB_HOST = import.meta.env.VITE_STDB_HOST || "192.168.1.10:3001";
export const DB_ID = import.meta.env.VITE_STDB_DB || "c2000df40a4560c4985121fce5ab36ba57e4d170e4fa08a5f00c85880b5102f0";

/** Base URL for the REST API server (Python FastAPI backend). */
export const API_BASE = import.meta.env.VITE_API_BASE || `http://${STDB_HOST.replace(/:3001$/, ":8000")}`;

/**
 * Execute a raw SQL query against STDB and return rows as positional arrays.
 *
 * STDB's HTTP SQL endpoint returns rows as positional arrays (`unknown[][]`)
 * indexed by column position in the SELECT clause.
 */
export async function sqlQuery(sql: string): Promise<unknown[][]> {
  const res = await fetch(`http://${STDB_HOST}/v1/database/${DB_ID}/sql`, {
    method: "POST",
    headers: { "Content-Type": "text/plain" },
    body: sql,
  });
  if (!res.ok) throw new Error(`STDB query failed: ${res.status}`);
  const data = await res.json();
  return (data[0]?.rows || []) as unknown[][];
}

/**
 * Execute a SQL query and map each positional row array into a typed object
 * using the supplied mapper function. The row type `T` is constrained to match
 * the mapper output rather than being positionally indexed.
 *
 * Usage:
 * ```ts
 * const pages = await tableQuery(
 *   "SELECT * FROM page WHERE status = 'published'",
 *   mapPage,
 * );
 * ```
 */
export async function tableQuery<T>(
  sql: string,
  mapper: (row: unknown[]) => T,
): Promise<T[]> {
  return sqlQuery(sql).then((rows) => rows.map(mapper));
}

/**
 * Execute a SQL query returning a single row (or null if empty).
 * Maps the first row via the supplied mapper.
 */
export async function tableQueryOne<T>(
  sql: string,
  mapper: (row: unknown[]) => T,
): Promise<T | null> {
  const rows = await sqlQuery(sql);
  return rows.length > 0 ? mapper(rows[0]) : null;
}

/**
 * Typed SQL query — uses an auto-generated module_binding row schema
 * to map positional STDB rows into typed objects (camelCase fields).
 *
 * Usage:
 * ```ts
 * import { typedQuery } from "./client";
 * import PageRowSchema from "../../module_bindings/page_table";
 * const pages = await typedQuery("SELECT * FROM page", PageRowSchema);
 * ```
 */
export async function typedQuery<T>(
  sql: string,
  schema: object & Record<string, unknown>,
): Promise<T[]> {
  const { fromStdbRow } = await import("./typed-sql");
  const mapper = fromStdbRow<T>(schema);
  return sqlQuery(sql).then((rows) => rows.map(mapper));
}

/**
 * Typed SQL query returning a single row (or null).
 */
export async function typedQueryOne<T>(
  sql: string,
  schema: object & Record<string, unknown>,
): Promise<T | null> {
  const rows = await typedQuery<T>(sql, schema);
  return rows.length > 0 ? rows[0] : null;
}

/**
 * Extract a single scalar value from the first column of the first row.
 * Returns `undefined` if no rows.
 */
export async function sqlScalar<T = string>(sql: string): Promise<T | undefined> {
  const rows = await sqlQuery(sql);
  if (rows.length === 0) return undefined;
  return rows[0][0] as T;
}

/**
 * Generate a unique ID string with the given prefix.
 * Based on current timestamp + pseudo-random bits.
 */
export function genId(prefix: string): string {
  const ts = Date.now();
  const rand = ((ts * 1103515245 + 12345) >>> 0).toString(16);
  return `${prefix}_${rand}`;
}

export async function callReducer(reducer: string, args: unknown[]): Promise<void> {
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
          const row = rows[0];
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
