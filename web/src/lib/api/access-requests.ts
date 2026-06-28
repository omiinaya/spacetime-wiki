// SPDX-License-Identifier: ISC

import type { AccessRequest } from "./types";
import { tableQuery, callReducer } from "./client";
import { mapAccessRequest } from "./mappers";

export const accessRequestApi = {
  /** Create a new access request for a page */
  create: (id: string, pageId: string, requesterId: string, reason: string): Promise<void> =>
    callReducer("create_access_request", [id, pageId, requesterId, reason]),

  /** Approve a pending access request (grants page-level viewer permission) */
  approve: (id: string, responderId: string): Promise<void> =>
    callReducer("approve_access_request", [id, responderId]),

  /** Deny a pending access request */
  deny: (id: string, responderId: string): Promise<void> =>
    callReducer("deny_access_request", [id, responderId]),

  /** Fetch all pending access requests (for admins and page owners) */
  listPending: (): Promise<AccessRequest[]> => {
    const sql = "SELECT * FROM access_request WHERE status = 'pending' ORDER BY created_at DESC";
    return tableQuery(sql, mapAccessRequest);
  },

  /** Fetch access requests for a specific page */
  listByPage: (pageId: string): Promise<AccessRequest[]> => {
    const sql = `SELECT * FROM access_request WHERE page_id = '${pageId}' ORDER BY created_at DESC`;
    return tableQuery(sql, mapAccessRequest);
  },

  /** Fetch access requests by a specific requester */
  listByRequester: (requesterId: string): Promise<AccessRequest[]> => {
    const sql = `SELECT * FROM access_request WHERE requester_id = '${requesterId}' ORDER BY created_at DESC`;
    return tableQuery(sql, mapAccessRequest);
  },
};
