// SPDX-License-Identifier: ISC

import type { AuditEvent } from "./types";
import { tableQuery } from "./client";
import { mapAuditEvent } from "./mappers";

export const auditApi = {
  /** Fetch recent audit events. Supports optional limit. Note: STDB does not support ORDER BY. */
  list: (limit = 100, _offset = 0): Promise<AuditEvent[]> => {
    const sql = `SELECT * FROM audit_event LIMIT ${limit}`;
    return tableQuery(sql, mapAuditEvent);
  },
  /** Fetch audit events for a specific target (page, collection, etc.) */
  listByTarget: (targetId: string, limit = 50): Promise<AuditEvent[]> => {
    const sql = `SELECT * FROM audit_event WHERE target_id = '${targetId}' LIMIT ${limit}`;
    return tableQuery(sql, mapAuditEvent);
  },
  /** Fetch audit events by a specific actor (user) */
  listByActor: (actorId: string, limit = 50): Promise<AuditEvent[]> => {
    const sql = `SELECT * FROM audit_event WHERE actor_id = '${actorId}' LIMIT ${limit}`;
    return tableQuery(sql, mapAuditEvent);
  },
  /** Fetch audit events by type */
  listByType: (eventType: string, limit = 50): Promise<AuditEvent[]> => {
    const sql = `SELECT * FROM audit_event WHERE event_type = '${eventType}' LIMIT ${limit}`;
    return tableQuery(sql, mapAuditEvent);
  },
};
