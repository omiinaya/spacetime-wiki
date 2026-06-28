// SPDX-License-Identifier: ISC

import type { PageTag } from "./types";
import { sqlQuery, callReducer, genId } from "./client";
import { mapTag } from "./mappers";

export async function getPageTags(pageId: string): Promise<PageTag[]> {
  return sqlQuery(`SELECT * FROM page_tag WHERE page_id = '${pageId}'`)
    .then((rows) => (rows as any as unknown[][]).map(mapTag));
}

export async function listAllTags(): Promise<PageTag[]> {
  return sqlQuery("SELECT * FROM page_tag")
    .then((rows) => (rows as any as unknown[][]).map(mapTag));
}

export async function addTag(pageId: string, name: string, value: string): Promise<string> {
  const id = genId("tag");
  return callReducer("add_tag", [id, pageId, name, value]).then(() => id);
}

export async function removeTag(id: string): Promise<void> {
  return callReducer("remove_tag", [id]);
}

// ── API section for the `api` object ──

export const tagsApi = {
  list: getPageTags,
  listAll: listAllTags,
  add: addTag,
  remove: removeTag,
};
