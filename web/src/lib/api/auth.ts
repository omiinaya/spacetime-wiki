// SPDX-License-Identifier: ISC

import type {
  OidcProvider,
  SamlProvider,
  LdapProvider,
  LdapUser,
  ApiKey,
  PasskeyCredential,
  PasskeyChallenge,
  MfaMethod,
  MfaBackupCode,
  OauthProvider,
  OauthUser,
} from './types';
import { tableQuery, tableQueryOne, sqlQuery, callReducer, genId } from './client';
import { bridgeQueryAll, bridgeQueryOne } from './bridge';
import {
  mapOidcProvider,
  mapSamlProvider,
  mapLdapProvider,
  mapLdapUser,
  mapApiKey,
  mapPasskeyCredential,
  mapPasskeyChallenge,
  mapMfaMethod,
  mapMfaBackupCode,
} from './mappers';

// ─── OIDC Providers ────────────────────────────────────────────────────────────
// oidc_provider is a PRIVATE table — reads go through the read bridge so the
// client_secret is never exposed via SQL.

export async function getOidcProviders(): Promise<OidcProvider[]> {
  const rows = await bridgeQueryAll<Record<string, unknown>>('oidc_provider', {});
  return rows.map(mapOidcProviderJson);
}

export async function getOidcProvider(id: string): Promise<OidcProvider | null> {
  const row = await bridgeQueryOne<Record<string, unknown>>('oidc_provider', { id });
  return row ? mapOidcProviderJson(row) : null;
}

export async function listActiveOidcProviders(): Promise<OidcProvider[]> {
  const rows = await bridgeQueryAll<Record<string, unknown>>('oidc_provider', { is_active: true });
  return rows.map(mapOidcProviderJson);
}

function mapOidcProviderJson(o: Record<string, unknown>): OidcProvider {
  return {
    id: String(o.id ?? ''),
    name: String(o.name ?? ''),
    slug: String(o.slug ?? ''),
    issuer_url: String(o.issuer_url ?? ''),
    client_id: String(o.client_id ?? ''),
    client_secret: String(o.client_secret ?? ''),
    scopes: String(o.scopes ?? ''),
    is_active: Boolean(o.is_active),
    created_by: String(o.created_by ?? ''),
    created_at: Number(o.created_at) || 0,
    updated_at: Number(o.updated_at) || 0,
  };
}

function mapSamlProviderJson(o: Record<string, unknown>): SamlProvider {
  return {
    id: String(o.id ?? ''),
    name: String(o.name ?? ''),
    slug: String(o.slug ?? ''),
    entity_id: String(o.entity_id ?? ''),
    sso_url: String(o.sso_url ?? ''),
    certificate: String(o.certificate ?? ''),
    name_id_format: String(o.name_id_format ?? ''),
    attribute_mapping: String(o.attribute_mapping ?? ''),
    auto_register: Boolean(o.auto_register),
    is_active: Boolean(o.is_active),
    created_by: String(o.created_by ?? ''),
    created_at: Number(o.created_at) || 0,
    updated_at: Number(o.updated_at) || 0,
  };
}

export async function addOidcProvider(
  name: string,
  slug: string,
  issuerUrl: string,
  clientId: string,
  clientSecret: string,
  scopes: string,
  createdBy: string,
): Promise<string> {
  const id = 'oidc_' + Math.random().toString(36).slice(2, 10);
  return callReducer('add_oidc_provider', [
    id,
    name,
    slug,
    issuerUrl,
    clientId,
    clientSecret,
    scopes,
    createdBy,
  ]).then(() => id);
}

export async function updateOidcProvider(
  id: string,
  name: string,
  slug: string,
  issuerUrl: string,
  clientId: string,
  clientSecret: string,
  scopes: string,
  isActive: boolean,
): Promise<void> {
  return callReducer('update_oidc_provider', [
    id,
    name,
    slug,
    issuerUrl,
    clientId,
    clientSecret,
    scopes,
    isActive,
  ]);
}

export async function deleteOidcProvider(id: string): Promise<void> {
  return callReducer('delete_oidc_provider', [id]);
}

// ─── SAML Providers ─────────────────────────���──────────────────────────────────

export async function getSamlProviders(): Promise<SamlProvider[]> {
  const rows = await bridgeQueryAll<Record<string, unknown>>('saml_provider', {});
  return rows.map(mapSamlProviderJson);
}

export async function getSamlProvider(id: string): Promise<SamlProvider | null> {
  const row = await bridgeQueryOne<Record<string, unknown>>('saml_provider', { id });
  return row ? mapSamlProviderJson(row) : null;
}

export async function listActiveSamlProviders(): Promise<SamlProvider[]> {
  const rows = await bridgeQueryAll<Record<string, unknown>>('saml_provider', { is_active: true });
  return rows.map(mapSamlProviderJson);
}

export async function addSamlProvider(
  name: string,
  slug: string,
  entityId: string,
  ssoUrl: string,
  certificate: string,
  nameIdFormat: string,
  attributeMapping: string,
  autoRegister: boolean,
  createdBy: string,
): Promise<string> {
  const id = 'saml_' + Math.random().toString(36).slice(2, 10);
  return callReducer('add_saml_provider', [
    id,
    name,
    slug,
    entityId,
    ssoUrl,
    certificate,
    nameIdFormat,
    attributeMapping,
    autoRegister,
    createdBy,
  ]).then(() => id);
}

export async function updateSamlProvider(
  id: string,
  name: string,
  slug: string,
  entityId: string,
  ssoUrl: string,
  certificate: string,
  nameIdFormat: string,
  attributeMapping: string,
  autoRegister: boolean,
  isActive: boolean,
): Promise<void> {
  return callReducer('update_saml_provider', [
    id,
    name,
    slug,
    entityId,
    ssoUrl,
    certificate,
    nameIdFormat,
    attributeMapping,
    autoRegister,
    isActive,
  ]);
}

export async function deleteSamlProvider(id: string): Promise<void> {
  return callReducer('delete_saml_provider', [id]);
}

// ─── LDAP Providers ────────────────────────────────────────────────────────────
// ldap_provider is PRIVATE — reads go through the bridge (bind_password never
// bridged).

function mapLdapProviderJson(o: Record<string, unknown>): LdapProvider {
  return {
    id: String(o.id ?? ''),
    name: String(o.name ?? ''),
    slug: String(o.slug ?? ''),
    host: String(o.host ?? ''),
    port: Number(o.port) || 0,
    is_secure: Boolean(o.is_secure),
    bind_dn: String(o.bind_dn ?? ''),
    bind_password: String(o.bind_password ?? ''),
    base_dn: String(o.base_dn ?? ''),
    user_filter: String(o.user_filter ?? ''),
    username_attribute: String(o.username_attribute ?? ''),
    email_attribute: String(o.email_attribute ?? ''),
    name_attribute: String(o.name_attribute ?? ''),
    default_role: String(o.default_role ?? ''),
    auto_register: Boolean(o.auto_register),
    is_active: Boolean(o.is_active),
    created_by: String(o.created_by ?? ''),
    created_at: Number(o.created_at) || 0,
    updated_at: Number(o.updated_at) || 0,
  };
}

export async function getLdapProviders(): Promise<LdapProvider[]> {
  const rows = await bridgeQueryAll<Record<string, unknown>>('ldap_provider', {});
  return rows.map(mapLdapProviderJson);
}

export async function listActiveLdapProviders(): Promise<LdapProvider[]> {
  const rows = await bridgeQueryAll<Record<string, unknown>>('ldap_provider', { is_active: true });
  return rows.map(mapLdapProviderJson);
}

export async function getLdapProvider(id: string): Promise<LdapProvider | null> {
  const row = await bridgeQueryOne<Record<string, unknown>>('ldap_provider', { id });
  return row ? mapLdapProviderJson(row) : null;
}

export async function addLdapProvider(
  provider: {
    name: string;
    slug: string;
    host: string;
    port: number;
    is_secure: boolean;
    bind_dn: string;
    bind_password: string;
    base_dn: string;
    user_filter: string;
    username_attribute: string;
    email_attribute: string;
    name_attribute: string;
    default_role: string;
    auto_register: boolean;
  },
  createdBy: string,
): Promise<string> {
  const id = genId('ldap');
  return callReducer('add_ldap_provider', [
    id,
    provider.name,
    provider.slug,
    provider.host,
    provider.port,
    provider.is_secure,
    provider.bind_dn,
    provider.bind_password,
    provider.base_dn,
    provider.user_filter,
    provider.username_attribute,
    provider.email_attribute,
    provider.name_attribute,
    provider.default_role,
    provider.auto_register,
    createdBy,
  ]).then(() => id);
}

export async function updateLdapProvider(
  id: string,
  provider: {
    name: string;
    slug: string;
    host: string;
    port: number;
    is_secure: boolean;
    bind_dn: string;
    bind_password: string;
    base_dn: string;
    user_filter: string;
    username_attribute: string;
    email_attribute: string;
    name_attribute: string;
    default_role: string;
    auto_register: boolean;
    is_active: boolean;
  },
): Promise<void> {
  return callReducer('update_ldap_provider', [
    id,
    provider.name,
    provider.slug,
    provider.host,
    provider.port,
    provider.is_secure,
    provider.bind_dn,
    provider.bind_password,
    provider.base_dn,
    provider.user_filter,
    provider.username_attribute,
    provider.email_attribute,
    provider.name_attribute,
    provider.default_role,
    provider.auto_register,
    provider.is_active,
  ]);
}

export async function deleteLdapProvider(id: string): Promise<void> {
  return callReducer('delete_ldap_provider', [id]);
}

export async function linkLdapUser(providerId: string): Promise<LdapUser[]> {
  return tableQuery(
    `SELECT * FROM ldap_user WHERE ldap_provider_id = '${providerId}'`,
    mapLdapUser,
  );
}

// ─── API Keys ──────────────────────────────────────────────────────────────────

export async function getApiKeys(userId: string): Promise<ApiKey[]> {
  return tableQuery(
    `SELECT * FROM api_key WHERE user_id = '${userId}' AND is_revoked = false`,
    mapApiKey,
  );
}

export async function createApiKey(
  userId: string,
  name: string,
  keyHash: string,
  keyPrefix: string,
  expiresDays: number,
): Promise<string> {
  const id = genId('apk');
  return callReducer('create_api_key', [id, userId, name, keyHash, keyPrefix, expiresDays]).then(
    () => id,
  );
}

export async function revokeApiKey(id: string): Promise<void> {
  return callReducer('revoke_api_key', [id]);
}

// ─── Passkeys / WebAuthn ───────────────────────────────────────────────────────

export async function getPasskeyCredentials(userId: string): Promise<PasskeyCredential[]> {
  return tableQuery(
    `SELECT * FROM passkey_credential WHERE user_id = '${userId}' `,
    mapPasskeyCredential,
  );
}

export async function storePasskeyCredential(
  userId: string,
  credentialId: string,
  publicKey: string,
  counter: number,
  transports: string,
  deviceName: string,
): Promise<string> {
  const id = genId('pk');
  return callReducer('store_passkey_credential', [
    id,
    userId,
    credentialId,
    publicKey,
    counter,
    transports,
    deviceName,
  ]).then(() => id);
}

export async function createPasskeyChallenge(
  challenge: string,
  userHandle: string,
  purpose: string,
): Promise<void> {
  return callReducer('create_passkey_challenge', [challenge, userHandle, purpose]);
}

export async function consumePasskeyChallenge(challenge: string): Promise<void> {
  return callReducer('consume_passkey_challenge', [challenge]);
}

export async function updatePasskeyCounter(credentialId: string, counter: number): Promise<void> {
  return callReducer('update_passkey_counter', [credentialId, counter]);
}

export async function deletePasskeyCredential(id: string): Promise<void> {
  return callReducer('delete_passkey_credential', [id]);
}

export async function getPasskeyChallenges(userId: string): Promise<PasskeyCredential[]> {
  return tableQuery(
    `SELECT * FROM passkey_credential WHERE user_id = '${userId}'`,
    mapPasskeyCredential,
  );
}

// ─── TOTP / MFA ────────────────────────────────────────────────────────────────

export async function enableTotp(
  userId: string,
  totpSecret: string,
  backupCodes: string[],
): Promise<void> {
  return callReducer('enable_totp', [userId, totpSecret, backupCodes]);
}

export async function disableMfa(userId: string): Promise<void> {
  return callReducer('disable_mfa', [userId]);
}

export async function verifyTotp(userId: string, code: number): Promise<void> {
  return callReducer('verify_totp', [userId, code]);
}

export async function verifyMfaBackupCode(userId: string, code: string): Promise<void> {
  return callReducer('verify_mfa_backup_code', [userId, code]);
}

export async function getMfaMethod(userId: string): Promise<MfaMethod | null> {
  // mfa_method is PRIVATE — read through the bridge (totp_secret never bridged)
  const row = await bridgeQueryOne<Record<string, unknown>>('mfa_method', { user_id: userId });
  if (!row) return null;
  return {
    id: String(row.id ?? ''),
    user_id: String(row.user_id ?? ''),
    method_type: String(row.method_type ?? ''),
    is_enabled: Boolean(row.is_enabled),
    created_at: Number(row.created_at) || 0,
    updated_at: Number(row.updated_at) || 0,
  };
}

export async function getMfaBackupCodes(userId: string): Promise<MfaBackupCode[]> {
  // mfa_backup_code is PRIVATE — read through the bridge (code_hash never bridged)
  const rows = await bridgeQueryAll<Record<string, unknown>>('mfa_backup_code', {
    user_id: userId,
  });
  return rows.map((r) => ({
    id: String(r.id ?? ''),
    user_id: String(r.user_id ?? ''),
    used: Boolean(r.used),
    created_at: Number(r.created_at) || 0,
  }));
}

export async function isMfaEnabled(userId: string): Promise<boolean> {
  const rows = await bridgeQueryAll<Record<string, unknown>>('mfa_method', {
    user_id: userId,
    is_enabled: true,
  });
  return rows.length > 0;
}

// ─── OAuth Providers ───────────────────────────────────────────────────────────

export async function getOauthProviders(): Promise<OauthProvider[]> {
  return fetch(`/api/v1/auth/oauth/providers`).then((r) => r.json());
}

export async function getAllOauthProviders(): Promise<OauthProvider[]> {
  return fetch(`/api/v1/auth/oauth/providers/all`).then((r) => r.json());
}

export async function addOauthProvider(
  name: string,
  slug: string,
  providerType: string,
  authorizeUrl: string,
  tokenUrl: string,
  userinfoUrl: string,
  scope: string,
  clientId: string,
  clientSecret: string,
  icon: string,
  autoRegister: boolean,
  defaultRole: string,
  createdBy: string,
): Promise<string> {
  const id = genId('oa');
  return callReducer('add_oauth_provider', [
    id,
    name,
    slug,
    providerType,
    authorizeUrl,
    tokenUrl,
    userinfoUrl,
    scope,
    clientId,
    clientSecret,
    icon,
    autoRegister,
    defaultRole,
    createdBy,
  ]).then(() => id);
}

export async function updateOauthProvider(
  id: string,
  provider: {
    name: string;
    slug: string;
    provider_type: string;
    authorize_url: string;
    token_url: string;
    userinfo_url: string;
    scope: string;
    client_id: string;
    client_secret: string;
    icon: string;
    auto_register: boolean;
    default_role: string;
    is_active: boolean;
  },
): Promise<void> {
  return callReducer('update_oauth_provider', [
    id,
    provider.name,
    provider.slug,
    provider.provider_type,
    provider.authorize_url,
    provider.token_url,
    provider.userinfo_url,
    provider.scope,
    provider.client_id,
    provider.client_secret,
    provider.icon,
    provider.auto_register,
    provider.default_role,
    provider.is_active,
  ]);
}

export async function deleteOauthProvider(id: string): Promise<void> {
  return callReducer('delete_oauth_provider', [id]);
}

export async function getOauthUsers(userId: string): Promise<OauthUser[]> {
  return fetch(`/api/v1/auth/oauth/user-links/${userId}`).then((r) => r.json());
}

export async function linkOauthUser(id: string): Promise<void> {
  // This is typically handled by the OAuth redirect flow on the server
  // Placeholder for explicit linking via reducer if needed
  throw new Error('Not implemented: OAuth user linking is handled server-side via redirect flow');
}

export async function unlinkOauthUser(id: string): Promise<void> {
  return callReducer('unlink_oauth_user', [id]);
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
