// SPDX-License-Identifier: ISC

// ─── Re-export all types ─────────────────────────────────────────────────────
export * from "./types";

// ─── Re-export all mappers ───────────────────────────────────────────────────
export {
  mapPage, mapCollection, mapUser, mapRevision, mapComment, mapCommentReaction,
  mapTag, mapAttachment, mapCollectionMember, mapShareLink, mapApiKey, mapGroup,
  mapGroupMember, mapCollectionGroupPermission, mapPagePermission, mapWebhook,
  mapWebhookEvent, mapOidcProvider, mapSamlProvider, mapAppSetting, mapScimProvider,
  mapScimEvent, mapInvitation, mapCollectionSortRule, mapLdapProvider, mapLdapUser,
  mapWatch, mapNotification, mapAccessRequest, mapCollabSession, mapCollabUpdate,
  mapPasskeyCredential, mapPasskeyChallenge, mapMfaMethod, mapMfaBackupCode,
  mapAiConfig, mapAiChatSession, mapAiChatMessage, mapDbBase, mapDbColumn, mapDbRow,
  mapDbCell, mapSyncedBlock, mapSyncedBlockRef, mapAuditEvent,
} from "./mappers";

// ─── Re-export client utilities ──────────────────────────────────────────────
export {
  STDB_HOST, DB_ID, API_BASE, genId, sqlQuery, callReducer, MAX_IMAGE_BYTES,
  isAttachmentUrl, getAttachmentId, readFileAsBase64, base64ToBlobUrl,
  resolveContentAttachments,
} from "./client";

// ─── Re-export domain modules ────────────────────────────────────────────────
export {
  listPages, listDeletedPages, getPage, getPageBySlug, createPage, updatePage,
  updatePageContent, setPageStatus, restorePage, deletePagePermanent, emptyTrash,
  duplicatePage, movePage, reorderPages, setPageIcon, setPageFullWidth, setPageColor,
  setPagePinned, setPageDirection, markAsTemplate, createFromTemplate, listTemplates,
  batchSetPageStatus, batchMovePages, batchDeletePages, batchAddTag,
  getPageRevisions, pagesApi, getPageFromCache, setPageCache, clearPageCache,
} from "./pages";

export {
  listCollections, createCollection, updateCollection, deleteCollection,
  reorderCollections, addCollectionMember, updateCollectionMemberRole,
  removeCollectionMember, setCollectionSortRule, deleteCollectionSortRule,
  applyCollectionAutoSort, getCollection, getCollectionSortRule,
  listCollectionSortRules, listCollectionMembers, setCollectionGroupPermission,
  removeCollectionGroupPermission, listCollectionGroupPermissions,
  collectionsApi, membersApi,
} from "./collections";

export {
  listUsers, getUser, getUserByEmail, registerUser, loginUser,
  updateUserRole, updateUserAvatar, usersApi,
} from "./users";

export {
  getOidcProviders, getOidcProvider, listActiveOidcProviders,
  addOidcProvider, updateOidcProvider, deleteOidcProvider,
  getSamlProviders, getSamlProvider, listActiveSamlProviders,
  addSamlProvider, updateSamlProvider, deleteSamlProvider,
  getLdapProviders, listActiveLdapProviders, getLdapProvider,
  addLdapProvider, updateLdapProvider, deleteLdapProvider, linkLdapUser,
  getApiKeys, createApiKey, revokeApiKey,
  getPasskeyCredentials, storePasskeyCredential, createPasskeyChallenge,
  consumePasskeyChallenge, updatePasskeyCounter, deletePasskeyCredential,
  getPasskeyChallenges, enableTotp, disableMfa, verifyTotp, verifyMfaBackupCode,
  getMfaMethod, getMfaBackupCodes, isMfaEnabled,
  getOauthProviders, getAllOauthProviders, addOauthProvider, updateOauthProvider,
  deleteOauthProvider, getOauthUsers, linkOauthUser, unlinkOauthUser,
  oidcApi, samlApi, ldapApi, apiKeysApi, passkeysApi, mfaApi, oauthApi,
} from "./auth";

export {
  listGroups, getGroup, createGroup, updateGroup, deleteGroup,
  getGroupMembers, addGroupMember, updateGroupMemberRole, removeGroupMember,
  groupsApi,
} from "./groups";

export {
  getComments, addComment, resolveComment, deleteComment,
  addCommentReaction, listCommentReactions, hasCommentReaction, commentsApi,
} from "./comments";

export {
  getShareLinks, createShareLink, deleteShareLink, updateShareBranding,
  verifySharePassword, visitShareLink, shareLinksApi,
} from "./shares";

export {
  getPageTags, listAllTags, addTag, removeTag, tagsApi,
} from "./tags";

export {
  getAttachments, addAttachment, deleteAttachment, attachmentsApi,
} from "./attachments";

export {
  listWebhooks, getWebhook, createWebhook, updateWebhook, deleteWebhook,
  getWebhookEvents, fireWebhookEvent, markWebhookEventSent, cleanupWebhookEvents,
  webhooksApi,
} from "./webhooks";

export {
  searchPages, cleanupSearchResults,
} from "./search";

export {
  SUBSCRIPTION_SQLS, usePagesSubscription, useCollectionsSubscription,
  useNotificationsSubscription, useWatchSubscription,
  useCollabSessionsSubscription, useCollabUpdatesSubscription,
} from "./subscriptions";

export {
  resolveTransclusions,
} from "./transclusions";

export {
  auditApi,
} from "./audit";

export {
  accessRequestApi,
} from "./access-requests";

export {
  getAppSetting, setAppSetting, getAiConfig, getAllAiConfig, setAiConfig,
  getAiChatSessions, getAiChatSession, createAiChatSession, deleteAiChatSession,
  getAiChatMessages, addAiChatMessage, deleteAiChatMessage,
  getDbBases, getDbBase, createDbBase, deleteDbBase, getDbColumns, createDbColumn,
  getDbRows, getDbRow, createDbRow, deleteDbRow, reorderDbRows,
  getDbCells, getDbCellsForBase, setDbCell, updateDbCell,
  getSyncedBlocks, getSyncedBlock, createSyncedBlock, updateSyncedBlock, deleteSyncedBlock,
  addSyncedBlockRef, removeSyncedBlockRef, listSyncedBlockRefs, listSyncedBlockRefsByPage,
  createInvitation, acceptInvitation, revokeInvitation, recordInvitationView,
  getInvitations, getInvitation, getInvitationByToken,
  toggleWatch, getWatchByUser, getWatchByTarget, isWatching,
  getNotifications, getUnreadNotifications, getUnreadNotificationCount,
  createNotification, markNotificationRead, markAllNotificationsRead,
  deleteNotification, clearAllNotifications,
  getScimProviders, addScimProvider, updateScimProvider, deleteScimProvider,
  getScimEvents, recordScimEvent, scimSyncUser, scimDeprovisionUser,
  scimSyncGroup, scimDeprovisionGroup,
  getFavorites, toggleFavorite,
  getPagePermissions, setPagePermission, removePagePermission,
  settingsApi, databasesApi, aiApi, scimApi, syncedBlocksApi, invitationsApi,
  watchApi, notificationsApi, pagePermissionsApi, favoritesApi,
} from "./settings";

export {
  joinCollabSession, leaveCollabSession, updateCollabCursor,
  broadcastCollabUpdate, getCollabSessions, getCollabUpdates,
  cleanupCollabSessions, cleanupOldCollabUpdates, collaborationApi,
} from "./collaboration";

// ─── API object assembly ─────────────────────────────────────────────────────

import type { AiChatMessage, Page } from "./types";
import { callReducer, sqlQuery } from "./client";
import { getPage as _getPage } from "./pages";
import { getAiConfig as _getAiConfig, getAiChatMessages as _getAiChatMessages } from "./settings";
import { pagesApi, getPageRevisions, getPageFromCache, setPageCache } from "./pages";
import { collectionsApi, membersApi } from "./collections";
import { usersApi } from "./users";
import {
  oidcApi, samlApi, ldapApi, apiKeysApi, passkeysApi, mfaApi, oauthApi,
} from "./auth";
import { groupsApi } from "./groups";
import { commentsApi } from "./comments";
import { shareLinksApi } from "./shares";
import { tagsApi } from "./tags";
import { attachmentsApi } from "./attachments";
import { webhooksApi } from "./webhooks";
import { searchPages } from "./search";
import { settingsApi, databasesApi, aiApi, scimApi, syncedBlocksApi, invitationsApi, watchApi, notificationsApi, pagePermissionsApi, favoritesApi, getAppSetting } from "./settings";
import { collaborationApi } from "./collaboration";
import { auditApi } from "./audit";
import { accessRequestApi } from "./access-requests";

// ─── Analytics (not extracted to a separate module) ─────────────────────────

const analyticsApi = {
  recordView: (pageId: string, viewer: string) =>
    callReducer("record_page_view", [pageId, viewer]),
  getViewCount: (pageId: string) =>
    sqlQuery(`SELECT COUNT(*) FROM page_view WHERE page_id = '${pageId}'`)
      .then((rows) => Number((rows[0] as any)?.[0] ?? 0)),
  getTrending: (limit: number = 8) =>
    sqlQuery(
      "SELECT page_id, COUNT(*) FROM page_view " +
      "GROUP BY page_id ORDER BY COUNT(*) DESC",
    ).then((rows) => (rows as any as unknown[][]).slice(0, limit).map(r => ({
      page_id: String(r[0] ?? ""),
      views: Number(r[1] ?? 0),
    }))),
};

// ─── Revisions section ──────────────────────────────────────────────────────

const revisionsApi = {
  list: getPageRevisions,
};

// ─── Settings helpers (trash retention) ──────────────────────────────────────

const trashSettingsApi = {
  getTrashRetentionDays: async (): Promise<number> => {
    const val = await getAppSetting("trash_retention_days");
    return parseInt(val) || 0;
  },
  setTrashRetentionDays: (days: number) =>
    callReducer("set_app_setting", ["trash_retention_days", String(days)]),
  purgeExpiredTrash: () =>
    callReducer("purge_expired_trash", []),
};

// ─── AI ask helper (uses other api functions) ───────────────────────────────

const aiAskApi = {
  ask: async (sessionId: string, userMessage: string, pageContextId?: string): Promise<string> => {
    // Get AI config
    const [provider, apiUrl, apiKey, model, systemPrompt] = await Promise.all([
      _getAiConfig("provider"),
      _getAiConfig("api_url"),
      _getAiConfig("api_key"),
      _getAiConfig("model"),
      _getAiConfig("system_prompt"),
    ]);

    // Get conversation history
    const messages = await _getAiChatMessages(sessionId);

    // Get page context if specified
    let pageContext = "";
    if (pageContextId) {
      const page = await _getPage(pageContextId);
      if (page) {
        pageContext = page.text_content.substring(0, 4000);
      }
    }

    // Call AI proxy via HTTP
    const proxyUrl = (apiUrl || "http://localhost:11434") + "/v1/chat/completions";
    const body = JSON.stringify({
      model: model || "llama3.2",
      messages: [
        ...(systemPrompt ? [{ role: "system", content: systemPrompt }] : []),
        ...(pageContext ? [{ role: "system", content: `Context from current page:\n${pageContext}` }] : []),
        ...messages.map((m: AiChatMessage) => ({ role: m.role, content: m.content })),
        { role: "user", content: userMessage },
      ],
      stream: false,
    });

    const res = await fetch(proxyUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(apiKey ? { "Authorization": `Bearer ${apiKey}` } : {}),
      },
      body,
    });

    if (!res.ok) {
      const text = await res.text();
      throw new Error(`AI request failed: ${res.status} — ${text.slice(0, 200)}`);
    }

    const data = await res.json();
    return data.choices?.[0]?.message?.content || "[No response from AI]";
  },
};

// ─── Combined settings section ──────────────────────────────────────────────

const settingsSection = {
  ...settingsApi,
  ...trashSettingsApi,
};

// ─── Combined AI section ────────────────────────────────────────────────────

const aiSection = {
  ...aiApi,
  ...aiAskApi,
};

// ─── Combined pages section (includes search) ───────────────────────────────

const pagesSection = {
  ...pagesApi,
  search: searchPages,
};

// ─── The main `api` object ───────────────────────────────────────────────────

export const api = {
  pages: pagesSection,
  collections: collectionsApi,
  members: membersApi,
  revisions: revisionsApi,
  comments: commentsApi,
  tags: tagsApi,
  favorites: favoritesApi,
  attachments: attachmentsApi,
  shareLinks: shareLinksApi,
  users: usersApi,
  apiKeys: apiKeysApi,
  groups: groupsApi,
  pagePermissions: pagePermissionsApi,
  webhooks: webhooksApi,
  analytics: analyticsApi,
  oidc: oidcApi,
  saml: samlApi,
  databases: databasesApi,
  settings: settingsSection,
  collaboration: collaborationApi,
  ai: aiSection,
  scim: scimApi,
  passkeys: passkeysApi,
  mfa: mfaApi,
  syncedBlocks: syncedBlocksApi,
  invitations: invitationsApi,
  ldap: ldapApi,
  oauth: oauthApi,
  watch: watchApi,
  notifications: notificationsApi,
};
