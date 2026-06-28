// SPDX-License-Identifier: ISC

import { useSubscription } from "../subscriptions";
import { mapPage, mapCollection, mapNotification, mapWatch, mapCollabSession, mapCollabUpdate } from "./mappers";

export const SUBSCRIPTION_SQLS = {
  pages: "SELECT * FROM page WHERE status != 'deleted'",
  allPages: "SELECT * FROM page",
  collections: "SELECT * FROM collection",
  comments: (pageId: string) => `SELECT * FROM comment WHERE page_id = '${pageId}'`,
  favorites: (userId: string) => `SELECT * FROM favorite WHERE user_id = '${userId}'`,
  tags: (pageId: string) => `SELECT * FROM page_tag WHERE page_id = '${pageId}'`,
  collabSessions: (pageId: string) => `SELECT * FROM collab_session WHERE page_id = '${pageId}'`,
  collabUpdates: (pageId: string) => `SELECT * FROM collab_update WHERE page_id = '${pageId}'`,
  dbBases: (pageId: string) => `SELECT * FROM db_base WHERE page_id = '${pageId}'`,
  dbColumns: (baseId: string) => `SELECT * FROM db_column WHERE base_id = '${baseId}' ORDER BY sort_order ASC`,
  dbRows: (baseId: string) => `SELECT * FROM db_row WHERE base_id = '${baseId}' ORDER BY sort_order ASC`,
  dbCellsForBase: (baseId: string) =>
    `SELECT c.* FROM db_cell c INNER JOIN db_row r ON c.row_id = r.id WHERE r.base_id = '${baseId}'`,
  collectionSortRules: "SELECT * FROM collection_sort_rule",
  notifications: (userId: string) => `SELECT * FROM notification WHERE user_id = '${userId}' ORDER BY created_at DESC LIMIT 100`,
  watch: (userId: string) => `SELECT * FROM watch WHERE user_id = '${userId}'`,
} as const;

export function usePagesSubscription() {
  return useSubscription(SUBSCRIPTION_SQLS.pages, (row: unknown[]) => mapPage(row));
}

export function useCollectionsSubscription() {
  return useSubscription(SUBSCRIPTION_SQLS.collections, (row: unknown[]) => mapCollection(row));
}

export function useNotificationsSubscription(userId: string | undefined) {
  return useSubscription(
    userId ? SUBSCRIPTION_SQLS.notifications(userId) : null,
    (row: unknown[]) => mapNotification(row),
    userId,
  );
}

export function useWatchSubscription(userId: string | undefined) {
  return useSubscription(
    userId ? SUBSCRIPTION_SQLS.watch(userId) : null,
    (row: unknown[]) => mapWatch(row),
    userId,
  );
}

export function useCollabSessionsSubscription(pageId: string | undefined) {
  return useSubscription(
    pageId ? SUBSCRIPTION_SQLS.collabSessions(pageId) : null,
    (row: unknown[]) => mapCollabSession(row),
  );
}

export function useCollabUpdatesSubscription(pageId: string | undefined) {
  return useSubscription(
    pageId ? SUBSCRIPTION_SQLS.collabUpdates(pageId) : null,
    (row: unknown[]) => mapCollabUpdate(row),
  );
}
