// SPDX-License-Identifier: ISC

import type { Group, GroupMember } from "./types";
import { sqlQuery, callReducer, genId } from "./client";
import { mapGroup, mapGroupMember } from "./mappers";

export async function listGroups(): Promise<Group[]> {
  return sqlQuery("SELECT * FROM `group`").then((rows) => (rows as any as unknown[][]).map(mapGroup));
}

export async function getGroup(id: string): Promise<Group | null> {
  return sqlQuery(`SELECT * FROM \`group\` WHERE id = '${id}'`).then(
    (rows) => ((rows as any as unknown[][])[0] ? mapGroup((rows as any as unknown[][])[0]) : null),
  );
}

export async function createGroup(name: string, description: string, createdBy: string): Promise<string> {
  const id = genId("grp");
  return callReducer("create_group", [id, name, description, createdBy]).then(() => id);
}

export async function updateGroup(id: string, name: string, description: string): Promise<void> {
  return callReducer("update_group", [id, name, description]);
}

export async function deleteGroup(id: string): Promise<void> {
  return callReducer("delete_group", [id]);
}

export async function getGroupMembers(groupId: string): Promise<GroupMember[]> {
  return sqlQuery(`SELECT * FROM group_member WHERE group_id = '${groupId}'`)
    .then((rows) => (rows as any as unknown[][]).map(mapGroupMember));
}

export async function addGroupMember(groupId: string, userId: string, role: string, addedBy: string): Promise<void> {
  const id = genId("gm");
  return callReducer("add_group_member", [id, groupId, userId, role, addedBy]);
}

export async function updateGroupMemberRole(id: string, newRole: string): Promise<void> {
  return callReducer("update_group_member_role", [id, newRole]);
}

export async function removeGroupMember(id: string): Promise<void> {
  return callReducer("remove_group_member", [id]);
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
