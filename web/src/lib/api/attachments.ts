// SPDX-License-Identifier: ISC

import type { Attachment } from "./types";
import { tableQuery, callReducer, genId } from "./client";
import { mapAttachment } from "./mappers";

export async function getAttachments(pageId: string): Promise<Attachment[]> {
  return tableQuery(`SELECT * FROM attachment WHERE page_id = '${pageId}'`, mapAttachment);
}

export async function addAttachment(
  pageId: string, filename: string, mimeType: string, sizeBytes: number,
  storageKey: string, uploadedBy: string,
): Promise<string> {
  const id = genId("att");
  return callReducer("add_attachment", [
    id, pageId, filename, mimeType, sizeBytes, storageKey, uploadedBy,
  ]).then(() => id);
}

export async function deleteAttachment(id: string): Promise<void> {
  return callReducer("delete_attachment", [id]);
}

// ── API section for the `api` object ──

export const attachmentsApi = {
  list: getAttachments,
  add: addAttachment,
  delete: deleteAttachment,
};
