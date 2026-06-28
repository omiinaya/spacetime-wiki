// SPDX-License-Identifier: ISC

import type { OidcProvider, SamlProvider, LdapProvider, LdapUser, ApiKey, PasskeyCredential, PasskeyChallenge, MfaMethod, MfaBackupCode, OauthProvider, OauthUser } from "./types";
import { tableQuery, tableQueryOne, sqlQuery, callReducer, genId } from "./client";
import { mapOidcProvider, mapSamlProvider, mapLdapProvider, mapLdapUser, mapApiKey, mapPasskeyCredential, mapPasskeyChallenge, mapMfaMethod, mapMfaBackupCode } from "./mappers";

// ─── OIDC Providers ────────────────────────────────────────────────────────────

export async function getOidcProviders(): Promise<OidcProvider[]> {
  return tableQuery("SELECT * FROM oidc_provider", mapOidcProvider);
}

export async function getOidcProvider(id: string): Promise<OidcProvider | null> {
  return tableQueryOne(`SELECT * FROM oidc_provider WHERE id = '${id}'`, mapOidcProvider);
}

export async function listActiveOidcProviders(): Promise<OidcProvider[]> {
  return tableQuery("SELECT * FROM oidc_provider WHERE is_active = true", mapOidcProvider);
}

export async function addOidcProvider(
  name: string, slug: string, issuerUrl: string,
  clientId: string, clientSecret: string, scopes: string,
  createdBy: string,
): Promise<string> {
  const id = "oidc_" + Math.random().toString(36).slice(2, 10);
  return callReducer("add_oidc_provider", [
    id, name, slug, issuerUrl, clientId, clientSecret, scopes, createdBy,
  ]).then(() => id);
}

export async function updateOidcProvider(
  id: string, name: string, slug: string, issuerUrl: string,
  clientId: string, clientSecret: string, scopes: string, isActive: boolean,
): Promise<void> {
  return callReducer("update_oidc_provider", [
    id, name, slug, issuerUrl, clientId, clientSecret, scopes, isActive,
  ]);
}

export async function deleteOidcProvider(id: string): Promise<void> {
  return callReducer("delete_oidc_provider", [id]);
}

// ─── SAML Providers ─────────────────────────���──────────────────────────────────

export async function getSamlProviders(): Promise<SamlProvider[]> {
  return tableQuery("SELECT * FROM saml_provider", mapSamlProvider);
}

export async function getSamlProvider(id: string): Promise<SamlProvider | null> {
  return tableQueryOne(`SELECT * FROM saml_provider WHERE id = '${id}'`, mapSamlProvider);
}

export async function listActiveSamlProviders(): Promise<SamlProvider[]> {
  return tableQuery("SELECT * FROM saml_provider WHERE is_active = true", mapSamlProvider);
}

export async function addSamlProvider(
  name: string, slug: string, entityId: string, ssoUrl: string,
  certificate: string, nameIdFormat: string, attributeMapping: string,
  autoRegister: boolean, createdBy: string,
): Promise<string> {
  const id = "saml_" + Math.random().toString(36).slice(2, 10);
  return callReducer("add_saml_provider", [
    id, name, slug, entityId, ssoUrl, certificate, nameIdFormat,
    attributeMapping, autoRegister, createdBy,
  ]).then(() => id);
}

export async function updateSamlProvider(
  id: string, name: string, slug: string, entityId: string, ssoUrl: string,
  certificate: string, nameIdFormat: string, attributeMapping: string,
  autoRegister: boolean, isActive: boolean,
): Promise<void> {
  return callReducer("update_saml_provider", [
    id, name, slug, entityId, ssoUrl, certificate, nameIdFormat,
    attributeMapping, autoRegister, isActive,
  ]);
}

export async function deleteSamlProvider(id: string): Promise<void> {
  return callReducer("delete_saml_provider", [id]);
}

// ─── LDAP Providers ────────────────────────────────────────────────────────────

export async function getLdapProviders(): Promise<LdapProvider[]> {
  return tableQuery("SELECT * FROM ldap_provider", mapLdapProvider);
}

export async function listActiveLdapProviders(): Promise<LdapProvider[]> {
  return tableQuery("SELECT * FROM ldap_provider WHERE is_active = true", mapLdapProvider);
}

export async function getLdapProvider(id: string): Promise<LdapProvider | null> {
  return tableQueryOne(`SELECT * FROM ldap_provider WHERE id = '${id}'`, mapLdapProvider);
}

export async function addLdapProvider(provider: {
  name: string; slug: string; host: string; port: number;
  is_secure: boolean; bind_dn: string; bind_password: string;
  base_dn: string; user_filter: string; username_attribute: string;
  email_attribute: string; name_attribute: string;
  default_role: string; auto_register: boolean;
}, createdBy: string): Promise<string> {
  const id = genId("ldap");
  return callReducer("add_ldap_provider", [
    id, provider.name, provider.slug, provider.host, provider.port,
    provider.is_secure, provider.bind_dn, provider.bind_password,
    provider.base_dn, provider.user_filter, provider.username_attribute,
    provider.email_attribute, provider.name_attribute,
    provider.default_role, provider.auto_register, createdBy,
  ]).then(() => id);
}

export async function updateLdapProvider(id: string, provider: {
  name: string; slug: string; host: string; port: number;
  is_secure: boolean; bind_dn: string; bind_password: string;
  base_dn: string; user_filter: string; username_attribute: string;
  email_attribute: string; name_attribute: string;
  default_role: string; auto_register: boolean; is_active: boolean;
}): Promise<void> {
  return callReducer("update_ldap_provider", [
    id, provider.name, provider.slug, provider.host, provider.port,
    provider.is_secure, provider.bind_dn, provider.bind_password,
    provider.base_dn, provider.user_filter, provider.username_attribute,
    provider.email_attribute, provider.name_attribute,
    provider.default_role, provider.auto_register, provider.is_active,
  ]);
}

export async function deleteLdapProvider(id: string): Promise<void> {
  return callReducer("delete_ldap_provider", [id]);
}

export async function linkLdapUser(providerId: string): Promise<LdapUser[]> {
  return tableQuery(`SELECT * FROM ldap_user WHERE ldap_provider_id = '${providerId}'`, mapLdapUser);
}

// ─── API Keys ──────────────────────────────────────────────────────────────────

export async function getApiKeys(userId: string): Promise<ApiKey[]> {
  return tableQuery(`SELECT * FROM api_key WHERE user_id = '${userId}' AND is_revoked = false`, mapApiKey);
}

export async function createApiKey(userId: string, name: string, keyHash: string, keyPrefix: string, expiresDays: number): Promise<string> {
  const id = genId("apk");
  return callReducer("create_api_key", [id, userId, name, keyHash, keyPrefix, expiresDays]).then(() => id);
}

export async function revokeApiKey(id: string): Promise<void> {
  return callReducer("revoke_api_key", [id]);
}

// ─── Passkeys / WebAuthn ───────────────────────────────────────────────────────

export async function getPasskeyCredentials(userId: string): Promise<PasskeyCredential[]> {
  return tableQuery(`SELECT * FROM passkey_credential WHERE user_id = '${userId}' ORDER BY created_at DESC`, mapPasskeyCredential);
}

export async function storePasskeyCredential(
  userId: string, credentialId: string, publicKey: string,
  counter: number, transports: string, deviceName: string,
): Promise<string> {
  const id = genId("pk");
  return callReducer("store_passkey_credential", [id, userId, credentialId, publicKey, counter, transports, deviceName]).then(() => id);
}

export async function createPasskeyChallenge(challenge: string, userHandle: string, purpose: string): Promise<void> {
  return callReducer("create_passkey_challenge", [challenge, userHandle, purpose]);
}

export async function consumePasskeyChallenge(challenge: string): Promise<void> {
  return callReducer("consume_passkey_challenge", [challenge]);
}

export async function updatePasskeyCounter(credentialId: string, counter: number): Promise<void> {
  return callReducer("update_passkey_counter", [credentialId, counter]);
}

export async function deletePasskeyCredential(id: string): Promise<void> {
  return callReducer("delete_passkey_credential", [id]);
}

export async function getPasskeyChallenges(userId: string): Promise<PasskeyCredential[]> {
  return tableQuery(`SELECT * FROM passkey_credential WHERE user_id = '${userId}'`, mapPasskeyCredential);
}

// ─── TOTP / MFA ────────────────────────────────────────────────────────────────

export async function enableTotp(userId: string, totpSecret: string, backupCodes: string[]): Promise<void> {
  return callReducer("enable_totp", [userId, totpSecret, backupCodes]);
}

export async function disableMfa(userId: string): Promise<void> {
  return callReducer("disable_mfa", [userId]);
}

export async function verifyTotp(userId: string, code: number): Promise<void> {
  return callReducer("verify_totp", [userId, code]);
}

export async function verifyMfaBackupCode(userId: string, code: string): Promise<void> {
  return callReducer("verify_mfa_backup_code", [userId, code]);
}

export async function getMfaMethod(userId: string): Promise<MfaMethod | null> {
  return tableQueryOne(`SELECT * FROM mfa_method WHERE user_id = '${userId}'`, mapMfaMethod);
}

export async function getMfaBackupCodes(userId: string): Promise<MfaBackupCode[]> {
  return tableQuery(`SELECT * FROM mfa_backup_code WHERE user_id = '${userId}'`, mapMfaBackupCode);
}

export async function isMfaEnabled(userId: string): Promise<boolean> {
  const rows = await sqlQuery(`SELECT id FROM mfa_method WHERE user_id = '${userId}' AND is_enabled = true`);
  return rows.length > 0;
}

// ─── OAuth Providers ───────────────────────────────────────────────────────────

export async function getOauthProviders(): Promise<OauthProvider[]> {
  return fetch(`/api/v1/auth/oauth/providers`).then(r => r.json());
}

export async function getAllOauthProviders(): Promise<OauthProvider[]> {
  return fetch(`/api/v1/auth/oauth/providers/all`).then(r => r.json());
}

export async function addOauthProvider(
  name: string, slug: string, providerType: string,
  authorizeUrl: string, tokenUrl: string, userinfoUrl: string,
  scope: string, clientId: string, clientSecret: string,
  icon: string, autoRegister: boolean, defaultRole: string,
  createdBy: string,
): Promise<string> {
  const id = genId("oa");
  return callReducer("add_oauth_provider", [
    id, name, slug, providerType, authorizeUrl, tokenUrl, userinfoUrl,
    scope, clientId, clientSecret, icon, autoRegister, defaultRole, createdBy,
  ]).then(() => id);
}

export async function updateOauthProvider(id: string, provider: {
  name: string; slug: string; provider_type: string;
  authorize_url: string; token_url: string; userinfo_url: string;
  scope: string; client_id: string; client_secret: string;
  icon: string; auto_register: boolean; default_role: string; is_active: boolean;
}): Promise<void> {
  return callReducer("update_oauth_provider", [
    id, provider.name, provider.slug, provider.provider_type,
    provider.authorize_url, provider.token_url, provider.userinfo_url,
    provider.scope, provider.client_id, provider.client_secret,
    provider.icon, provider.auto_register, provider.default_role,
    provider.is_active,
  ]);
}

export async function deleteOauthProvider(id: string): Promise<void> {
  return callReducer("delete_oauth_provider", [id]);
}

export async function getOauthUsers(userId: string): Promise<OauthUser[]> {
  return fetch(`/api/v1/auth/oauth/user-links/${userId}`).then(r => r.json());
}

export async function linkOauthUser(id: string): Promise<void> {
  // This is typically handled by the OAuth redirect flow on the server
  // Placeholder for explicit linking via reducer if needed
  throw new Error("Not implemented: OAuth user linking is handled server-side via redirect flow");
}

export async function unlinkOauthUser(id: string): Promise<void> {
  return callReducer("unlink_oauth_user", [id]);
}

// ── API section for the `api` object ──

export const oidcApi = {
  list: getOidcProviders,
  get: getOidcProvider,
  listActive: listActiveOidcProviders,
  create: addOidcProvider,
  update: updateOidcProvider,
  delete: deleteOidcProvider,
};

export const samlApi = {
  list: getSamlProviders,
  get: getSamlProvider,
  listActive: listActiveSamlProviders,
  create: addSamlProvider,
  update: updateSamlProvider,
  delete: deleteSamlProvider,
};

export const ldapApi = {
  list: getLdapProviders,
  listActive: listActiveLdapProviders,
  get: getLdapProvider,
  add: addLdapProvider,
  update: updateLdapProvider,
  delete: deleteLdapProvider,
  getLinkedUsers: linkLdapUser,
};

export const apiKeysApi = {
  list: getApiKeys,
  create: createApiKey,
  revoke: revokeApiKey,
};

export const passkeysApi = {
  listCredentials: getPasskeyCredentials,
  listCredentialsForUser: getPasskeyCredentials,
  store: storePasskeyCredential,
  createChallenge: createPasskeyChallenge,
  consumeChallenge: consumePasskeyChallenge,
  updateCounter: updatePasskeyCounter,
  delete: deletePasskeyCredential,
};

export const mfaApi = {
  getMethod: getMfaMethod,
  getBackupCodes: getMfaBackupCodes,
  enableTotp,
  disable: disableMfa,
  verifyTotp,
  verifyBackupCode: verifyMfaBackupCode,
  isEnabled: isMfaEnabled,
};

export const oauthApi = {
  listProviders: getOauthProviders,
  listAllProviders: getAllOauthProviders,
  addProvider: addOauthProvider,
  updateProvider: updateOauthProvider,
  deleteProvider: deleteOauthProvider,
  getUserLinks: getOauthUsers,
  unlinkUser: unlinkOauthUser,
};
