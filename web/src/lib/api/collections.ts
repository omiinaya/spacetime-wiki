// SPDX-License-Identifier: ISC

import type {
  Collection,
  CollectionMember,
  CollectionGroupPermission,
  CollectionSortRule,
} from './types';
import { tableQuery, tableQueryOne, callReducer, genId, sqlLit } from './client';
import {
  mapCollection,
  mapCollectionMember,
  mapCollectionGroupPermission,
  mapCollectionSortRule,
} from './mappers';

export async function listCollections(): Promise<Collection[]> {
  return tableQuery('SELECT * FROM collection', mapCollection);
}

export async function getCollection(id: string): Promise<Collection | null> {
  return tableQueryOne(`SELECT * FROM collection WHERE id = ${sqlLit(id)}`, mapCollection);
}

export async function createCollection(
  name: string,
  description: string,
  parentId: string,
  icon: string,
  color: string,
  createdBy: string,
): Promise<string> {
  const id = genId('col');
  return callReducer('create_collection', [
    id,
    name,
    description,
    parentId,
    icon,
    color,
    createdBy,
  ]).then(() => id);
}

export async function updateCollection(
  id: string,
  name: string,
  description: string,
  icon: string,
  color: string,
): Promise<void> {
  return callReducer('update_collection', [id, name, description, icon, color]);
}

export async function deleteCollection(id: string): Promise<void> {
  return callReducer('delete_collection', [id]);
}

export async function reorderCollections(orderedIds: string[]): Promise<void> {
  return callReducer('reorder_collections', [orderedIds]);
}

// ── Collection Sort Rules ──

export async function setCollectionSortRule(
  collectionId: string,
  sortField: string,
  sortDirection: string,
  autoApply: boolean,
  updatedBy: string,
): Promise<void> {
  return callReducer('set_collection_sort_rule', [
    collectionId,
    sortField,
    sortDirection,
    autoApply,
    updatedBy,
  ]);
}

export async function deleteCollectionSortRule(collectionId: string): Promise<void> {
  return callReducer('delete_collection_sort_rule', [collectionId]);
}

export async function applyCollectionAutoSort(collectionId: string): Promise<void> {
  return callReducer('apply_collection_auto_sort', [collectionId]);
}

export async function getCollectionSortRule(
  collectionId: string,
): Promise<CollectionSortRule | null> {
  return tableQueryOne(
    `SELECT * FROM collection_sort_rule WHERE collection_id = ${sqlLit(collectionId)}`,
    mapCollectionSortRule,
  );
}

export async function listCollectionSortRules(): Promise<CollectionSortRule[]> {
  return tableQuery('SELECT * FROM collection_sort_rule', mapCollectionSortRule);
}

// ── Collection Members ──

export async function addCollectionMember(
  collectionId: string,
  userId: string,
  role: string,
  addedBy: string,
): Promise<void> {
  const id = genId('cm');
  return callReducer('add_collection_member', [id, collectionId, userId, role, addedBy]);
}

export async function updateCollectionMemberRole(id: string, newRole: string): Promise<void> {
  return callReducer('update_collection_member_role', [id, newRole]);
}

export async function removeCollectionMember(id: string): Promise<void> {
  return callReducer('remove_collection_member', [id]);
}

export async function listCollectionMembers(collectionId: string): Promise<CollectionMember[]> {
  return tableQuery(
    `SELECT * FROM collection_member WHERE collection_id = ${sqlLit(collectionId)}`,
    mapCollectionMember,
  );
}

// ── Collection Group Permissions ──

export async function setCollectionGroupPermission(
  collectionId: string,
  groupId: string,
  role: string,
): Promise<void> {
  const id = genId('cgp');
  return callReducer('set_collection_group_permission', [id, collectionId, groupId, role]);
}

export async function removeCollectionGroupPermission(id: string): Promise<void> {
  return callReducer('remove_collection_group_permission', [id]);
}

export async function listCollectionGroupPermissions(
  collectionId: string,
): Promise<CollectionGroupPermission[]> {
  return tableQuery(
    `SELECT * FROM collection_group_permission WHERE collection_id = ${sqlLit(collectionId)}`,
    mapCollectionGroupPermission,
  );
}

// ── API section for the `api` object ──

export const collectionsApi = {
  list: listCollections,
  get: getCollection,
  create: createCollection,
  update: updateCollection,
  delete: deleteCollection,
  reorder: reorderCollections,
  sortRules: {
    set: setCollectionSortRule,
    delete: deleteCollectionSortRule,
    apply: applyCollectionAutoSort,
    get: getCollectionSortRule,
    list: listCollectionSortRules,
  },
};

export const membersApi = {
  list: listCollectionMembers,
  add: addCollectionMember,
  updateRole: updateCollectionMemberRole,
  remove: removeCollectionMember,
};
