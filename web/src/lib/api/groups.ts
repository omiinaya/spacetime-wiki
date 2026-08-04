// SPDX-License-Identifier: ISC

import type { Group, GroupMember } from './types';
import { tableQuery, tableQueryOne, callReducer, genId, sqlLit } from './client';
import { mapGroup, mapGroupMember } from './mappers';

export async function listGroups(): Promise<Group[]> {
  return tableQuery('SELECT * FROM `group`', mapGroup);
}

export async function getGroup(id: string): Promise<Group | null> {
  return tableQueryOne(`SELECT * FROM \`group\` WHERE id = ${sqlLit(id)}`, mapGroup);
}

export async function createGroup(
  name: string,
  description: string,
  createdBy: string,
): Promise<string> {
  const id = genId('grp');
  return callReducer('create_group', [id, name, description, createdBy]).then(() => id);
}

export async function updateGroup(id: string, name: string, description: string): Promise<void> {
  return callReducer('update_group', [id, name, description]);
}

export async function deleteGroup(id: string): Promise<void> {
  return callReducer('delete_group', [id]);
}

export async function getGroupMembers(groupId: string): Promise<GroupMember[]> {
  return tableQuery(
    `SELECT * FROM group_member WHERE group_id = ${sqlLit(groupId)}`,
    mapGroupMember,
  );
}

export async function addGroupMember(
  groupId: string,
  userId: string,
  role: string,
  addedBy: string,
): Promise<void> {
  const id = genId('gm');
  return callReducer('add_group_member', [id, groupId, userId, role, addedBy]);
}

export async function updateGroupMemberRole(id: string, newRole: string): Promise<void> {
  return callReducer('update_group_member_role', [id, newRole]);
}

export async function removeGroupMember(id: string): Promise<void> {
  return callReducer('remove_group_member', [id]);
}

// ── API section for the `api` object ──

export const groupsApi = {
  list: listGroups,
  get: getGroup,
  create: createGroup,
  update: updateGroup,
  delete: deleteGroup,
  listMembers: getGroupMembers,
  addMember: addGroupMember,
  updateMemberRole: updateGroupMemberRole,
  removeMember: removeGroupMember,
};
