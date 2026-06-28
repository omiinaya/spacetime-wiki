// SPDX-License-Identifier: ISC

import type { Page, PageRevision } from "./types";
import { sqlQuery, callReducer, genId } from "./client";
import { mapPage, mapRevision } from "./mappers";

// ─── Page cache ────────────────────────────────────────────────────────────────

const pageCache = new Map<string, Page>();

export function getPageFromCache(id: string): Page | undefined {
  return pageCache.get(id);
}

export function setPageCache(id: string, page: Page): void {
  pageCache.set(id, page);
}

export function clearPageCache(): void {
  pageCache.clear();
}

// ─── Page functions ────────────────────────────────────────────────────────────

export async function listPages(collectionId?: string, status?: string): Promise<Page[]> {
  let sql = "SELECT * FROM page";
  const conditions: string[] = [];
  if (collectionId) conditions.push(`collection_id = '${collectionId}'`);
  if (status) conditions.push(`status = '${status}'`);
  else conditions.push("status != 'deleted'");
  if (conditions.length) sql += " WHERE " + conditions.join(" AND ");
  return sqlQuery(sql).then((rows) => (rows as any as unknown[][]).map(mapPage));
}

export async function listDeletedPages(): Promise<Page[]> {
  return sqlQuery("SELECT * FROM page WHERE status = 'deleted'").then((rows) => (rows as any as unknown[][]).map(mapPage));
}

export async function getPage(id: string): Promise<Page | null> {
  // Try as ID first, then as slug
  let rows = await sqlQuery(`SELECT * FROM page WHERE id = '${id}'`);
  if ((rows as any as unknown[][]).length === 0) {
    rows = await sqlQuery(`SELECT * FROM page WHERE slug = '${id}'`);
  }
  const row = (rows as any as unknown[][])[0];
  return row ? mapPage(row) : null;
}

export async function getPageBySlug(slug: string): Promise<Page | null> {
  return sqlQuery(`SELECT * FROM page WHERE slug = '${slug}'`).then(
    (rows) => ((rows as any as unknown[][])[0] ? mapPage((rows as any as unknown[][])[0]) : null),
  );
}

export async function createPage(
  title: string,
  content: string,
  collectionId: string,
  parentPageId: string,
  createdBy: string,
): Promise<string> {
  const id = genId("page");
  return callReducer("create_page", [
    id, title, content, collectionId, parentPageId, createdBy,
  ]).then(() => id);
}

export async function updatePage(id: string, title: string, content: string, updatedBy: string): Promise<void> {
  return callReducer("update_page", [id, title, content, updatedBy]);
}

export async function updatePageContent(id: string, content: string, updatedBy: string): Promise<void> {
  // Updates content while keeping the existing title
  // Fetch current page to get its title
  const page = await getPage(id);
  if (!page) throw new Error(`Page not found: ${id}`);
  return callReducer("update_page", [id, page.title, content, updatedBy]);
}

export async function setPageStatus(id: string, status: string): Promise<void> {
  return callReducer("set_page_status", [id, status]);
}

export async function restorePage(id: string): Promise<void> {
  return callReducer("restore_page", [id]);
}

export async function deletePagePermanent(id: string): Promise<void> {
  return callReducer("delete_page_permanent", [id]);
}

export async function emptyTrash(): Promise<void> {
  return callReducer("empty_trash", []);
}

export async function duplicatePage(id: string, createdBy: string): Promise<string> {
  const newId = genId("page");
  return callReducer("duplicate_page", [newId, id, createdBy]).then(() => newId);
}

export async function movePage(id: string, newCollectionId: string, newParentPageId: string): Promise<void> {
  return callReducer("move_page", [id, newCollectionId, newParentPageId]);
}

export async function reorderPages(orderedIds: string[]): Promise<void> {
  return callReducer("reorder_pages", [orderedIds]);
}

export async function setPageIcon(id: string, icon: string): Promise<void> {
  return callReducer("set_page_icon", [id, icon]);
}

export async function setPageFullWidth(id: string, fullWidth: boolean): Promise<void> {
  return callReducer("set_page_full_width", [id, fullWidth]);
}

export async function setPageColor(id: string, color: string): Promise<void> {
  return callReducer("set_page_color", [id, color]);
}

export async function setPagePinned(id: string, isPinned: boolean): Promise<void> {
  return callReducer("set_page_pinned", [id, isPinned]);
}

export async function setPageDirection(id: string, direction: string): Promise<void> {
  return callReducer("set_page_direction", [id, direction]);
}

export async function markAsTemplate(id: string, isTemplate: boolean): Promise<void> {
  return callReducer("mark_as_template", [id, isTemplate]);
}

export async function createFromTemplate(templateId: string, title: string, collectionId: string, createdBy: string): Promise<string> {
  const newId = genId("page");
  return callReducer("create_from_template", [newId, templateId, title, collectionId, createdBy]).then(() => newId);
}

export async function listTemplates(): Promise<Page[]> {
  return sqlQuery("SELECT * FROM page WHERE is_template = true")
    .then((rows) => (rows as any as unknown[][]).map(mapPage));
}

// ── Batch operations (for sidebar multi-select) ──

export async function batchSetPageStatus(pageIds: string[], status: string): Promise<void> {
  return callReducer("batch_set_page_status", [pageIds, status]);
}

export async function batchMovePages(pageIds: string[], newCollectionId: string): Promise<void> {
  return callReducer("batch_move_pages", [pageIds, newCollectionId]);
}

export async function batchDeletePages(pageIds: string[]): Promise<void> {
  return callReducer("batch_delete_pages", [pageIds]);
}

export async function batchAddTag(pageIds: string[], name: string, value: string): Promise<void> {
  return callReducer("batch_add_tag", [pageIds, name, value]);
}

// ── Revisions ──

export async function getPageRevisions(pageId: string): Promise<PageRevision[]> {
  return sqlQuery(`SELECT * FROM page_revision WHERE page_id = '${pageId}'`)
    .then((rows) => (rows as any as unknown[][]).map(mapRevision));
}

// ── API section for the `api` object ──

export const pagesApi = {
  pageCache,
  getPageFromCache,
  setPageCache,
  list: listPages,
  listDeleted: listDeletedPages,
  get: getPage,
  getBySlug: getPageBySlug,
  create: createPage,
  update: updatePage,
  setStatus: setPageStatus,
  delete: deletePagePermanent,
  restore: restorePage,
  emptyTrash,
  duplicate: duplicatePage,
  move: movePage,
  reorder: reorderPages,
  setIcon: setPageIcon,
  setFullWidth: setPageFullWidth,
  setColor: setPageColor,
  setPinned: setPagePinned,
  setDirection: setPageDirection,
  markAsTemplate,
  createFromTemplate,
  listTemplates,
  batchSetStatus: batchSetPageStatus,
  batchMove: batchMovePages,
  batchDelete: batchDeletePages,
  batchAddTag,
};
