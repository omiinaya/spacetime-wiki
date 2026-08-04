// SPDX-License-Identifier: ISC
//
// Bridge reads for PRIVATE STDB tables.
//
// STDB tables marked `private` cannot be queried via SQL (hard error).
// The frontend calls bridge_read(table, filter_json, request_id), the
// reducer copies SAFE (non-secret) columns into the public `read_bridge`
// table, then this helper reads those rows back by request_id and clears
// them. Secret columns (password hashes, tokens, secrets) are never
// bridged.

import { callReducer, sqlQuery } from './client';

function genRequestId(): string {
  return `br_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 12)}`;
}

export interface BridgeRow {
  request_id: string;
  source_table: string;
  row_json: string;
}

/** Bridge-read rows from a private table, applying equality filters. */
export async function bridgeQuery(
  table: string,
  filter: Record<string, string | number | boolean>,
): Promise<BridgeRow[]> {
  const requestId = genRequestId();
  await callReducer('bridge_read', [requestId, table, JSON.stringify(filter)]);
  const rows = (await sqlQuery(
    `SELECT * FROM read_bridge WHERE request_id = '${requestId.replace(/'/g, "''")}'`,
  )) as unknown[][];
  const out = rows.map((r) => ({
    request_id: String(r[0] ?? ''),
    source_table: String(r[1] ?? ''),
    row_json: String(r[2] ?? ''),
  }));
  try {
    await callReducer('clear_read_bridge', [requestId]);
  } catch {
    // best-effort cleanup
  }
  return out;
}

/** Bridge-read a single row, parsing its JSON payload (or null). */
export async function bridgeQueryOne<T>(
  table: string,
  filter: Record<string, string | number | boolean>,
): Promise<T | null> {
  const rows = await bridgeQuery(table, filter);
  if (rows.length === 0) return null;
  try {
    return JSON.parse(rows[0].row_json) as T;
  } catch {
    return null;
  }
}

/** Bridge-read rows, parsing each JSON payload. */
export async function bridgeQueryAll<T>(
  table: string,
  filter: Record<string, string | number | boolean>,
): Promise<T[]> {
  const rows = await bridgeQuery(table, filter);
  return rows
    .map((r) => {
      try {
        return JSON.parse(r.row_json) as T;
      } catch {
        return null;
      }
    })
    .filter((x): x is T => x !== null);
}
