// SPDX-License-Identifier: ISC

export const STDB_HOST = import.meta.env.VITE_STDB_HOST || "127.0.0.1:3001";
export const DB_ID = import.meta.env.VITE_STDB_DB || "c20000000000000000000000000000000000000000000000000000000000000000";

/** Base URL for the REST API server (Python FastAPI backend). */
export const API_BASE = import.meta.env.VITE_API_BASE || `http://${STDB_HOST.replace(/:3001$/, ":8000")}`;

export function genId(prefix: string): string {
  const ts = Date.now();
  const rand = ((ts * 1103515245 + 12345) >>> 0).toString(16);
  return `${prefix}_${rand}`;
}

export async function sqlQuery(sql: string): Promise<Record<string, unknown>[]> {
  const res = await fetch(`http://${STDB_HOST}/v1/database/${DB_ID}/sql`, {
    method: "POST",
    headers: { "Content-Type": "text/plain" },
    body: sql,
  });
  if (!res.ok) throw new Error(`STDB query failed: ${res.status}`);
  const data = await res.json();
  return (data[0]?.rows || []) as Record<string, unknown>[];
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
