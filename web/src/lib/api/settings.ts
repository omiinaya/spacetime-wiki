// SPDX-License-Identifier: ISC

import type {
  AiConfig,
  AiChatSession,
  AiChatMessage,
  Invitation,
  Watch,
  Notification,
  AppSetting,
  DbBase,
  DbColumn,
  DbRow,
  DbCell,
  SyncedBlock,
  SyncedBlockRef,
  ScimProvider,
  ScimEvent,
  PagePermission,
  CollectionGroupPermission,
} from './types';
import { tableQuery, tableQueryOne, sqlQuery, callReducer, genId } from './client';
import {
  mapAiConfig,
  mapAiChatSession,
  mapAiChatMessage,
  mapAppSetting,
  mapDbBase,
  mapDbColumn,
  mapDbRow,
  mapDbCell,
  mapSyncedBlock,
  mapSyncedBlockRef,
  mapInvitation,
  mapWatch,
  mapNotification,
  mapScimProvider,
  mapScimEvent,
  mapPagePermission,
  mapCollectionGroupPermission,
} from './mappers';

// ─── App Settings ─────────────────────────────────────────────────────────────

export async function getAppSetting(key: string): Promise<string> {
  const rows = await sqlQuery(`SELECT * FROM app_setting WHERE key = '${key}'`);
  return rows.length > 0 ? String(rows[0]?.[1] ?? '') : '';
}

export async function setAppSetting(key: string, value: string): Promise<void> {
  return callReducer('set_app_setting', [key, value]);
}

// ─── AI Config ────────────────────────────────────────────────────────────────

export async function getAiConfig(key: string): Promise<string> {
  const rows = await sqlQuery(`SELECT * FROM ai_config WHERE key = '${key}'`);
  return rows.length > 0 ? String(rows[0]?.[1] ?? '') : '';
}

export async function getAllAiConfig(): Promise<AiConfig[]> {
  return tableQuery('SELECT * FROM ai_config', mapAiConfig);
}

export async function setAiConfig(key: string, value: string): Promise<void> {
  return callReducer('set_ai_config', [key, value]);
}

// ─── AI Chat Sessions ─────────────────────────────────────────────────────────
// ai_chat_session / ai_chat_message are PRIVATE tables — reads go through
// the read bridge (content is bridged, which the chat UI needs; there are
// no secrets in these tables).

export async function getAiChatSessions(userId: string): Promise<AiChatSession[]> {
  const rows = await bridgeQueryAll<Record<string, unknown>>('ai_chat_session', { user_id: userId });
  return rows.map((r) => ({
    id: String(r.id ?? ''),
    user_id: String(r.user_id ?? ''),
    title: String(r.title ?? ''),
    page_context_id: String(r.page_context_id ?? ''),
    created_at: Number(r.created_at) || 0,
    updated_at: Number(r.updated_at) || 0,
  }));
}

export async function getAiChatSession(id: string): Promise<AiChatSession | null> {
  const row = await bridgeQueryOne<Record<string, unknown>>('ai_chat_session', { id });
  if (!row) return null;
  return {
    id: String(row.id ?? ''),
    user_id: String(row.user_id ?? ''),
    title: String(row.title ?? ''),
    page_context_id: String(row.page_context_id ?? ''),
    created_at: Number(row.created_at) || 0,
    updated_at: Number(row.updated_at) || 0,
  };
}

export async function createAiChatSession(
  userId: string,
  title: string,
  pageContextId: string = '',
): Promise<string> {
  const id = genId('ai_s');
  return callReducer('create_ai_chat_session', [id, userId, title, pageContextId]).then(() => id);
}

export async function deleteAiChatSession(id: string): Promise<void> {
  return callReducer('delete_ai_chat_session', [id]);
}

// ─── AI Chat Messages ─────────────────────────────────────────────────────────

export async function getAiChatMessages(sessionId: string): Promise<AiChatMessage[]> {
  const rows = await bridgeQueryAll<Record<string, unknown>>('ai_chat_message', { session_id: sessionId });
  return rows.map((r) => ({
    id: String(r.id ?? ''),
    session_id: String(r.session_id ?? ''),
    role: String(r.role ?? ''),
    content: String(r.content ?? ''),
    created_at: Number(r.created_at) || 0,
  }));
}

export async function addAiChatMessage(
  sessionId: string,
  role: string,
  content: string,
): Promise<string> {
  const id = genId('ai_m');
  return callReducer('add_ai_chat_message', [id, sessionId, role, content]).then(() => id);
}

export async function deleteAiChatMessage(id: string): Promise<void> {
  return callReducer('delete_ai_chat_message', [id]);
}

// ─── Database Bases ───────────────────────────────────────────────────────────

export async function getDbBases(pageId?: string): Promise<DbBase[]> {
  let sql = 'SELECT * FROM db_base';
  if (pageId) sql += ` WHERE page_id = '${pageId}'`;
  sql += '';
  return tableQuery(sql, mapDbBase);
}

export async function getDbBase(id: string): Promise<DbBase | null> {
  return tableQueryOne(`SELECT * FROM db_base WHERE id = '${id}'`, mapDbBase);
}

export async function createDbBase(
  pageId: string,
  title: string,
  viewType: string,
  createdBy: string,
): Promise<string> {
  const id = genId('db');
  return callReducer('create_db_base', [id, pageId, title, viewType, createdBy]).then(() => id);
}

export async function deleteDbBase(id: string): Promise<void> {
  return callReducer('delete_db_base', [id]);
}

// ─── Database Columns ─────────────────────────────────────────────────────────

export async function getDbColumns(baseId: string): Promise<DbColumn[]> {
  return tableQuery(`SELECT * FROM db_column WHERE base_id = '${baseId}'`, mapDbColumn);
}

export async function createDbColumn(
  baseId: string,
  name: string,
  fieldType: string,
  options: string = '{}',
  sortOrder: number = 0,
): Promise<string> {
  const id = genId('dbc');
  return callReducer('create_db_column', [id, baseId, name, fieldType, options, sortOrder]).then(
    () => id,
  );
}

// ─── Database Rows ────────────────────────────────────────────────────────────

export async function getDbRows(baseId: string): Promise<DbRow[]> {
  return tableQuery(`SELECT * FROM db_row WHERE base_id = '${baseId}'`, mapDbRow);
}

export async function getDbRow(id: string): Promise<DbRow | null> {
  return tableQueryOne(`SELECT * FROM db_row WHERE id = '${id}'`, mapDbRow);
}

export async function createDbRow(
  baseId: string,
  sortOrder: number,
  createdBy: string,
): Promise<string> {
  const id = genId('dbr');
  return callReducer('create_db_row', [id, baseId, sortOrder, createdBy]).then(() => id);
}

export async function deleteDbRow(id: string): Promise<void> {
  return callReducer('delete_db_row', [id]);
}

export async function reorderDbRows(rowIds: string[], newSortOrders: number[]): Promise<void> {
  return callReducer('reorder_db_rows', [rowIds, newSortOrders]);
}

// ─── Database Cells ───────────────────────────────────────────────────────────

export async function getDbCells(rowId: string): Promise<DbCell[]> {
  return tableQuery(`SELECT * FROM db_cell WHERE row_id = '${rowId}'`, mapDbCell);
}

export async function getDbCellsForBase(baseId: string): Promise<DbCell[]> {
  return tableQuery(
    `SELECT c.* FROM db_cell c INNER JOIN db_row r ON c.row_id = r.id WHERE r.base_id = '${baseId}'`,
    mapDbCell,
  );
}

export async function setDbCell(rowId: string, columnId: string, value: string): Promise<void> {
  const id = genId('dce');
  return callReducer('set_db_cell', [rowId, columnId, value]);
}

export async function updateDbCell(rowId: string, columnId: string, value: string): Promise<void> {
  return setDbCell(rowId, columnId, value);
}

// ─── Synced Blocks ─────────────────────────────────────���──────────────────────

export async function getSyncedBlocks(): Promise<SyncedBlock[]> {
  return tableQuery('SELECT * FROM synced_block', mapSyncedBlock);
}

export async function getSyncedBlock(id: string): Promise<SyncedBlock | null> {
  return tableQueryOne(`SELECT * FROM synced_block WHERE id = '${id}'`, mapSyncedBlock);
}

export async function createSyncedBlock(
  title: string,
  content: string,
  createdBy: string,
): Promise<string> {
  const id = genId('sb');
  return callReducer('create_synced_block', [id, title, content, createdBy]).then(() => id);
}

export async function updateSyncedBlock(
  id: string,
  title: string,
  content: string,
  updatedBy: string,
): Promise<void> {
  return callReducer('update_synced_block', [id, title, content, updatedBy]);
}

export async function deleteSyncedBlock(id: string): Promise<void> {
  return callReducer('delete_synced_block', [id]);
}

export async function addSyncedBlockRef(
  blockId: string,
  pageId: string,
  createdBy: string,
): Promise<string> {
  const id = genId('sbr');
  return callReducer('add_synced_block_ref', [id, blockId, pageId, createdBy]).then(() => id);
}

export async function removeSyncedBlockRef(id: string): Promise<void> {
  return callReducer('remove_synced_block_ref', [id]);
}

export async function listSyncedBlockRefs(blockId: string): Promise<SyncedBlockRef[]> {
  return tableQuery(
    `SELECT * FROM synced_block_ref WHERE block_id = '${blockId}'`,
    mapSyncedBlockRef,
  );
}

export async function listSyncedBlockRefsByPage(pageId: string): Promise<SyncedBlockRef[]> {
  return tableQuery(
    `SELECT * FROM synced_block_ref WHERE page_id = '${pageId}'`,
    mapSyncedBlockRef,
  );
}

// ─── Invitations ──────────────────────────────────────────────────────────────

export async function createInvitation(
  email: string,
  invitedBy: string,
  role: string,
  pageIds: string,
  collectionIds: string,
  token: string,
  message: string,
  expiresDays: number,
): Promise<string> {
  const id = genId('inv');
  return callReducer('create_invitation', [
    id,
    email,
    invitedBy,
    role,
    pageIds,
    collectionIds,
    token,
    message,
    expiresDays,
  ]).then(() => id);
}

export async function acceptInvitation(token: string, userId: string): Promise<void> {
  return callReducer('accept_invitation', [token, userId]);
}

export async function revokeInvitation(id: string, revokedBy: string): Promise<void> {
  return callReducer('revoke_invitation', [id, revokedBy]);
}

export async function recordInvitationView(token: string): Promise<void> {
  return callReducer('record_invitation_view', [token]);
}

export async function getInvitations(): Promise<Invitation[]> {
  return tableQuery('SELECT * FROM invitation', mapInvitation);
}

export async function getInvitation(id: string): Promise<Invitation | null> {
  return tableQueryOne(`SELECT * FROM invitation WHERE id = '${id}'`, mapInvitation);
}

export async function getInvitationByToken(token: string): Promise<Invitation | null> {
  return tableQueryOne(`SELECT * FROM invitation WHERE token = '${token}'`, mapInvitation);
}

// ─── Watch / Toggle ───────────────────────────────────────────────────────────

export async function toggleWatch(
  userId: string,
  targetType: string,
  targetId: string,
): Promise<void> {
  const id = genId('watch');
  return callReducer('toggle_watch', [id, userId, targetType, targetId]);
}

export async function getWatchByUser(userId: string): Promise<Watch[]> {
  // watch is PRIVATE — read through the bridge
  const rows = await bridgeQueryAll<Record<string, unknown>>('watch', { user_id: userId });
  return rows.map((r) => ({
    id: String(r.id ?? ''),
    user_id: String(r.user_id ?? ''),
    target_type: String(r.target_type ?? ''),
    target_id: String(r.target_id ?? ''),
    created_at: Number(r.created_at) || 0,
  }));
}

export async function getWatchByTarget(targetType: string, targetId: string): Promise<Watch[]> {
  const rows = await bridgeQueryAll<Record<string, unknown>>('watch', {
    target_type: targetType,
    target_id: targetId,
  });
  return rows.map((r) => ({
    id: String(r.id ?? ''),
    user_id: String(r.user_id ?? ''),
    target_type: String(r.target_type ?? ''),
    target_id: String(r.target_id ?? ''),
    created_at: Number(r.created_at) || 0,
  }));
}

export async function isWatching(
  userId: string,
  targetType: string,
  targetId: string,
): Promise<boolean> {
  const rows = await bridgeQueryAll<Record<string, unknown>>('watch', {
    user_id: userId,
    target_type: targetType,
    target_id: targetId,
  });
  return rows.length > 0;
}

// ─── Notifications ────────────────────────────────────────────────────────────

export async function getNotifications(
  userId: string,
  limit: number = 50,
): Promise<Notification[]> {
  return tableQuery(
    `SELECT * FROM notification WHERE user_id = '${userId}' LIMIT ${limit}`,
    mapNotification,
  );
}

export async function getUnreadNotifications(
  userId: string,
  limit: number = 50,
): Promise<Notification[]> {
  return tableQuery(
    `SELECT * FROM notification WHERE user_id = '${userId}' AND is_read = false LIMIT ${limit}`,
    mapNotification,
  );
}

export async function getUnreadNotificationCount(userId: string): Promise<number> {
  const rows = await sqlQuery(
    `SELECT COUNT(*) FROM notification WHERE user_id = '${userId}' AND is_read = false`,
  );
  return Number(rows[0]?.[0] ?? 0);
}

export async function createNotification(
  userId: string,
  eventType: string,
  targetId: string,
  title: string,
  message: string,
  actorId: string,
  icon: string,
): Promise<string> {
  const id = genId('notif');
  return callReducer('create_notification', [
    id,
    userId,
    eventType,
    targetId,
    title,
    message,
    actorId,
    icon,
  ]).then(() => id);
}

export async function markNotificationRead(id: string): Promise<void> {
  return callReducer('mark_notification_read', [id]);
}

export async function markAllNotificationsRead(userId: string): Promise<void> {
  return callReducer('mark_all_notifications_read', [userId]);
}

export async function deleteNotification(id: string): Promise<void> {
  return callReducer('delete_notification', [id]);
}

export async function clearAllNotifications(userId: string): Promise<void> {
  return callReducer('clear_all_notifications', [userId]);
}

// ─── SCIM Providers ─────────────────────────────────────��─────────────────────

export async function getScimProviders(): Promise<ScimProvider[]> {
  return tableQuery('SELECT * FROM scim_provider', mapScimProvider);
}

export async function addScimProvider(
  name: string,
  slug: string,
  apiToken: string,
  defaultRole: string,
  autoRegister: boolean,
  deprovisionBehavior: string,
  syncGroups: boolean,
  createdBy: string,
): Promise<string> {
  const id = genId('scim');
  return callReducer('add_scim_provider', [
    id,
    name,
    slug,
    apiToken,
    defaultRole,
    autoRegister,
    deprovisionBehavior,
    syncGroups,
    createdBy,
  ]).then(() => id);
}

export async function updateScimProvider(
  id: string,
  name: string,
  slug: string,
  apiToken: string,
  defaultRole: string,
  autoRegister: boolean,
  deprovisionBehavior: string,
  syncGroups: boolean,
  isActive: boolean,
): Promise<void> {
  return callReducer('update_scim_provider', [
    id,
    name,
    slug,
    apiToken,
    defaultRole,
    autoRegister,
    deprovisionBehavior,
    syncGroups,
    isActive,
  ]);
}

export async function deleteScimProvider(id: string): Promise<void> {
  return callReducer('delete_scim_provider', [id]);
}

export async function getScimEvents(providerId?: string): Promise<ScimEvent[]> {
  let sql = 'SELECT * FROM scim_event';
  if (providerId) sql += ` WHERE provider_id = '${providerId}'`;
  sql += ' LIMIT 100';
  return sqlQuery(sql).then((rows) => (rows as unknown[][]).map(mapScimEvent));
}

export async function recordScimEvent(): Promise<void> {
  // Placeholder - events are recorded server-side
}

export async function scimSyncUser(): Promise<void> {
  // Placeholder - sync is triggered server-side
}

export async function scimDeprovisionUser(): Promise<void> {
  // Placeholder - deprovision is triggered server-side
}

export async function scimSyncGroup(): Promise<void> {
  // Placeholder - sync is triggered server-side
}

export async function scimDeprovisionGroup(): Promise<void> {
  // Placeholder - deprovision is triggered server-side
}

// ─── Favorites ────────────────────────────────────────────────────────────────

export async function getFavorites(userId: string): Promise<unknown[][]> {
  return sqlQuery(`SELECT * FROM favorite WHERE user_id = '${userId}'`);
}

export async function toggleFavorite(userId: string, pageId: string): Promise<void> {
  const id = genId('fav');
  return callReducer('toggle_favorite', [id, userId, pageId]);
}

// ─── Page Permissions ─────────────────────────────────────────────────────────

export async function getPagePermissions(pageId: string): Promise<PagePermission[]> {
  return sqlQuery(`SELECT * FROM page_permission WHERE page_id = '${pageId}'`).then((rows) =>
    (rows as unknown[][]).map(mapPagePermission),
  );
}

export async function setPagePermission(
  pageId: string,
  userId: string,
  groupId: string,
  role: string,
): Promise<void> {
  const id = genId('pp');
  return callReducer('set_page_permission', [id, pageId, userId, groupId, role]);
}

export async function removePagePermission(id: string): Promise<void> {
  return callReducer('remove_page_permission', [id]);
}

// ── API sections for the `api` object ──

export const settingsApi = {
  get: getAppSetting,
  set: setAppSetting,
};

export const databasesApi = {
  list: getDbBases,
  get: getDbBase,
  create: createDbBase,
  delete: deleteDbBase,
  columns: {
    list: getDbColumns,
    create: createDbColumn,
  },
  rows: {
    list: getDbRows,
    get: getDbRow,
    create: createDbRow,
    delete: deleteDbRow,
    reorder: reorderDbRows,
  },
  cells: {
    list: getDbCells,
    listForBase: getDbCellsForBase,
    update: setDbCell,
  },
};

export const aiApi = {
  config: {
    get: getAiConfig,
    getAll: getAllAiConfig,
    set: setAiConfig,
  },
  sessions: {
    list: getAiChatSessions,
    get: getAiChatSession,
    create: createAiChatSession,
    delete: deleteAiChatSession,
  },
  messages: {
    list: getAiChatMessages,
    add: addAiChatMessage,
    delete: deleteAiChatMessage,
  },
};

export const scimApi = {
  listProviders: getScimProviders,
  addProvider: addScimProvider,
  updateProvider: updateScimProvider,
  deleteProvider: deleteScimProvider,
  listEvents: getScimEvents,
};

export const syncedBlocksApi = {
  list: getSyncedBlocks,
  get: getSyncedBlock,
  create: createSyncedBlock,
  update: updateSyncedBlock,
  delete: deleteSyncedBlock,
  listRefs: listSyncedBlockRefs,
  listRefsByPage: listSyncedBlockRefsByPage,
  addRef: addSyncedBlockRef,
  removeRef: removeSyncedBlockRef,
};

export const invitationsApi = {
  list: getInvitations,
  get: getInvitation,
  getByToken: getInvitationByToken,
  create: createInvitation,
  accept: acceptInvitation,
  revoke: revokeInvitation,
  recordView: recordInvitationView,
};

export const watchApi = {
  toggle: toggleWatch,
  listByUser: getWatchByUser,
  listByTarget: getWatchByTarget,
  isWatching,
  getWatchers: getWatchByTarget,
};

export const notificationsApi = {
  list: getNotifications,
  listUnread: getUnreadNotifications,
  unreadCount: getUnreadNotificationCount,
  create: createNotification,
  markRead: markNotificationRead,
  markAllRead: markAllNotificationsRead,
  delete: deleteNotification,
  clearAll: clearAllNotifications,
};

export const pagePermissionsApi = {
  list: getPagePermissions,
  set: setPagePermission,
  remove: removePagePermission,
};

export const favoritesApi = {
  list: getFavorites,
  toggle: toggleFavorite,
};
