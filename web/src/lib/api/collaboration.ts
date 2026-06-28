// SPDX-License-Identifier: ISC

import type { CollabSession, CollabUpdate } from "./types";
import { sqlQuery, callReducer, genId } from "./client";
import { mapCollabSession, mapCollabUpdate } from "./mappers";

export async function joinCollabSession(pageId: string, userId: string, userName: string, color: string): Promise<void> {
  return callReducer("join_collab_session", [pageId, userId, userName, color]);
}

export async function leaveCollabSession(pageId: string, userId: string): Promise<void> {
  return callReducer("leave_collab_session", [pageId, userId]);
}

export async function updateCollabCursor(pageId: string, userId: string, cursorJson: string): Promise<void> {
  return callReducer("update_cursor_position", [pageId, userId, cursorJson]);
}

export async function broadcastCollabUpdate(pageId: string, updateData: string, userId: string): Promise<void> {
  const id = genId("cu");
  return callReducer("broadcast_yjs_update", [id, pageId, updateData, userId]);
}

export async function getCollabSessions(pageId: string): Promise<CollabSession[]> {
  return sqlQuery(`SELECT * FROM collab_session WHERE page_id = '${pageId}'`)
    .then((rows) => (rows as any as unknown[][]).map(mapCollabSession));
}

export async function getCollabUpdates(pageId: string): Promise<CollabUpdate[]> {
  return sqlQuery(`SELECT * FROM collab_update WHERE page_id = '${pageId}' ORDER BY created_at ASC`)
    .then((rows) => (rows as any as unknown[][]).map(mapCollabUpdate));
}

export async function cleanupCollabSessions(): Promise<void> {
  return callReducer("cleanup_stale_collab_sessions", []);
}

export async function cleanupOldCollabUpdates(): Promise<void> {
  return callReducer("cleanup_old_collab_updates", []);
}

// ── API section for the `api` object ──

export const collaborationApi = {
  joinSession: joinCollabSession,
  leaveSession: leaveCollabSession,
  updateCursor: updateCollabCursor,
  broadcastUpdate: broadcastCollabUpdate,
  getSessions: getCollabSessions,
  getUpdates: getCollabUpdates,
  cleanupSessions: cleanupCollabSessions,
  cleanupOldUpdates: cleanupOldCollabUpdates,
};
