// SPDX-License-Identifier: ISC

import type { User } from "./types";
import { tableQuery, tableQueryOne, callReducer, genId } from "./client";
import { mapUser } from "./mappers";

export async function listUsers(): Promise<User[]> {
  return tableQuery("SELECT * FROM user", mapUser);
}

export async function getUser(id: string): Promise<User | null> {
  return tableQueryOne(`SELECT * FROM user WHERE id = '${id}'`, mapUser);
}

export async function getUserByEmail(email: string): Promise<User | null> {
  return tableQueryOne(`SELECT * FROM user WHERE email = '${email}'`, mapUser);
}

export async function registerUser(name: string, email: string, password: string, role: string): Promise<void> {
  const id = genId("user");
  return callReducer("register_user", [id, name, email, password, role]);
}

export async function loginUser(email: string, password: string): Promise<User | null> {
  await callReducer("login_user", [email, password]);
  return tableQueryOne(`SELECT * FROM user WHERE email = '${email}'`, mapUser);
}

export async function updateUserRole(userId: string, newRole: string, updatedBy: string): Promise<void> {
  return callReducer("update_user_role", [userId, newRole, updatedBy]);
}

export async function updateUserAvatar(userId: string, avatarUrl: string, updatedBy: string): Promise<void> {
  return callReducer("update_user_avatar", [userId, avatarUrl, updatedBy]);
}

// ── API section for the `api` object ──

export const usersApi = {
  list: listUsers,
  get: getUser,
  getByEmail: getUserByEmail,
  register: registerUser,
  login: loginUser,
  updateRole: updateUserRole,
  updateAvatar: updateUserAvatar,
};
