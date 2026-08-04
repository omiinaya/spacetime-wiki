// SPDX-License-Identifier: ISC

import type { Comment, CommentReaction } from './types';
import { tableQuery, sqlQuery, callReducer, genId, sqlLit } from './client';
import { mapComment, mapCommentReaction } from './mappers';

export async function getComments(pageId: string): Promise<Comment[]> {
  return tableQuery(`SELECT * FROM comment WHERE page_id = ${sqlLit(pageId)}`, mapComment);
}

export async function addComment(
  pageId: string,
  parentCommentId: string,
  userId: string,
  body: string,
  textAnchor: string = '',
): Promise<string> {
  const id = genId('com');
  return callReducer('add_comment', [id, pageId, parentCommentId, userId, body, textAnchor]).then(
    () => id,
  );
}

export async function resolveComment(id: string): Promise<void> {
  return callReducer('resolve_comment', [id]);
}

export async function deleteComment(id: string): Promise<void> {
  return callReducer('delete_comment', [id]);
}

export async function addCommentReaction(
  commentId: string,
  userId: string,
  emoji: string,
): Promise<void> {
  const id = genId('cr');
  return callReducer('add_comment_reaction', [id, commentId, userId, emoji]);
}

export async function listCommentReactions(commentId: string): Promise<CommentReaction[]> {
  return tableQuery(
    `SELECT * FROM comment_reaction WHERE comment_id = ${sqlLit(commentId)}`,
    mapCommentReaction,
  );
}

export async function hasCommentReaction(
  commentId: string,
  userId: string,
  emoji: string,
): Promise<boolean> {
  const rows = await sqlQuery(
    `SELECT id FROM comment_reaction WHERE comment_id = ${sqlLit(commentId)} AND user_id = ${sqlLit(userId)} AND emoji = ${sqlLit(emoji)}`,
  );
  return rows.length > 0;
}

// ── API section for the `api` object ──

export const commentsApi = {
  list: getComments,
  add: addComment,
  resolve: resolveComment,
  delete: deleteComment,
  listReactions: listCommentReactions,
  addReaction: addCommentReaction,
  hasReacted: hasCommentReaction,
};
