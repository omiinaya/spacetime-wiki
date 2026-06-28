// SPDX-License-Identifier: ISC

import type { ShareLink } from "./types";
import { tableQuery, callReducer, genId } from "./client";
import { mapShareLink } from "./mappers";

export async function getShareLinks(pageId: string): Promise<ShareLink[]> {
  return tableQuery(`SELECT * FROM share_link WHERE page_id = '${pageId}'`, mapShareLink);
}

export async function createShareLink(pageId: string, password: string, createdBy: string, expiresDays: number): Promise<{ id: string; token: string }> {
  const id = genId("share");
  const token = crypto.randomUUID ? crypto.randomUUID() : genId("sh");
  return callReducer("create_share_link", [
    id, pageId, token, password, createdBy, expiresDays,
  ]).then(() => ({ id, token }));
}

export async function deleteShareLink(id: string): Promise<void> {
  return callReducer("delete_share_link", [id]);
}

export async function updateShareBranding(shareId: string, brandTitle: string | null, brandLogoUrl: string | null): Promise<void> {
  return callReducer("update_share_branding", [shareId, brandTitle ?? "", brandLogoUrl ?? ""]);
}

export async function verifySharePassword(token: string, password: string): Promise<void> {
  return callReducer("verify_share_password", [token, password]);
}

export async function visitShareLink(token: string): Promise<void> {
  return callReducer("visit_share_link", [token]);
}

// ── API section for the `api` object ──

export const shareLinksApi = {
  list: getShareLinks,
  create: createShareLink,
  delete: deleteShareLink,
  updateBranding: updateShareBranding,
  verify: verifySharePassword,
  visit: visitShareLink,
};
