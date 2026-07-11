# Privacy Audit — Public Table Data Exposure

**Date:** 2026-07-05
**Audit scope:** Originally all 50 #[table(public)] tables in tables.rs. **As of current: 35 now private, 15 remain public.**

**Method:** Source code review of field-level sensitivity

## Summary
**35 of 50 tables** are now private (15 remain public for API SQL queries).

### Why this matters

- SpacetimeDB's `public` attribute means the table is queryable without any authentication via the STDB SQL/HTTP API
- The wiki's permission system (RBAC, per-page ACLs, collection membership) is enforced at the API server layer, NOT the database layer
- Direct STDB connections bypass the API server entirely
- The STDB port (3001) is exposed to the host network via docker-compose

---

## CRITICAL — Secrets/credentials exposed publicly

These tables contain fields that are **secrets by design**. Making them public means any STDB client can extract live credentials, enabling account takeover, lateral movement, and offline cracking attacks.

| # | Table | Exposed Field | Risk |
|---|-------|---------------|------|
| 1 | `mfa_method` | `totp_secret` | **TOTP seed values** — the raw secret used to generate 2FA codes. Anyone who reads this can generate valid TOTP codes for any user. Complete MFA bypass. |
| 2 | `oauth_user` | `access_token`, `refresh_token` | **Live OAuth tokens** for Slack/Discord/GitHub/etc. Anyone who reads these can impersonate the linked user on the external service. |
| 3 | `oidc_provider` | `client_secret` | **OIDC client secret** — the shared secret for the OIDC provider. Could enable impersonation of the wiki to the OIDC provider. |
| 4 | `oauth_provider` | `client_secret` | **OAuth app client secret** — same category as OIDC. Exposed in plaintext. |
| 5 | `ldap_provider` | `bind_password` | **LDAP bind password** — the admin password for the LDAP directory. Full LDAP server compromise. |
| 6 | `webhook` | `secret` | **Webhook signing secret.** Controls webhook HMAC signing. Exposed secret lets attackers forge valid webhook payloads. |
| 7 | `user` | `password_hash` | **Argon2 password hash** — enables offline brute-force attacks against user passwords. |
| 8 | `api_key` | `key_hash` | **API key hash** — enables offline cracking of API keys if the hash function is reversible or the key space is small. |
| 9 | `mfa_backup_code` | `code_hash` | **Backup code hash** — enables offline cracking of backup codes, letting attackers bypass 2FA. |
| 10 | `share_link` | `password_hash` | **Share link password hash** — enables offline cracking of share link passwords. |
| 11 | `scim_provider` | `api_token_hash` | **SCIM provider API token hash** — offline cracking risk. |
| 12 | `passkey_credential` | `credential_id`, `public_key` | **WebAuthn credential ID and public key.** While the public key is technically public in the WebAuthn model, the credential ID links a specific device to a user — enabling tracking/fingerprinting. |
| 13 | `saml_provider` | `certificate`, `entity_id`, `sso_url` | **SAML certificate and IdP metadata** — certificate is usually public, but combined with entity ID/SSO URL it reveals the full SAML trust configuration. |
| 14 | `ldap_user` | `dn` | **LDAP distinguished names** — leak internal directory structure and naming conventions. Useful for reconnaissance. |

---

## HIGH — PII and private content exposed

These tables contain personal data or private content that should only be visible to authorized users.

| # | Table | Exposed Field | Risk |
|---|-------|---------------|------|
| 15 | `user` | `email` | **Email address** — PII. Exposed to anyone querying the STDB directly. |
| 16 | `user` | `name` | **User display name** — generally non-sensitive but contributes to user enumeration. |
| 17 | `page` | `content`, `text_content` | **Full wiki page content** — defeats the entire permission system. Pages in private collections, draft pages, and archived pages are all readable. |
| 18 | `page_revision` | `content` | **Full page revision history** — every version of every page, including deleted content that still exists as a revision. |
| 19 | `comment` | `body` | **All comments on all pages** — including comments on private/restricted pages. |
| 20 | `notification` | `message`, `title` | **Notification content** — reveals what events other users are being notified about. Could leak page title changes, mentions, etc. |
| 21 | `access_request` | `reason`, `requester_id` | **Access request details** — who requested access to what page and why. |
| 22 | `ai_chat_message` | `content`, `role` | **AI chat message content** — full conversation history with the AI assistant, which may contain private information users discussed. |
| 23 | `ai_chat_session` | `title`, `page_context_id`, `user_id` | **AI chat session metadata** — reveals which pages users are discussing with the AI, and when. |
| 24 | `collab_update` | `update_data` | **Yjs document state** — the collaborative editing state for each page. Contains the full document content. |
| 25 | `search_result` | `excerpt` | **Search excerpts** — content snippets from pages. Reveals page content even for restricted pages if they were indexed. |
| 26 | `invitation` | `email`, `message` | **Invitation emails and messages** — PII (email) plus any custom invitation message. Also reveals invited_by (who invited whom). |
| 27 | `attachment` | `storage_key` | **File storage paths** — leaks the internal file storage layout. Combined with `filename`, reveals what files exist for which pages. |

---

## MODERATE — Metadata leakage

These tables contain operational data that may not be directly sensitive but can be combined (correlated) with other exposures.

| # | Table | Exposed Field | Risk |
|---|-------|---------------|------|
| 28 | `collab_session` | `user_id`, `user_name`, `cursor_position` | **Active editing sessions** — who is editing what page in real time. User presence info. |
| 29 | `page_view` | `user_id`, `viewer` | **Page view analytics** — who viewed what page and when. Surveillance risk. |
| 30 | `user` | `id`, `role`, `avatar_url`, `created_at` | **User metadata** — user enumeration, role hierarchy discovery. |
| 31 | `collection_member` | `user_id`, `collection_id`, `role` | **Collection membership** — reveals which users have access to which collections. |
| 32 | `group_member` | `user_id`, `group_id`, `role` | **Group membership** — reveals team/group composition and roles. |
| 33 | `page_permission` | `user_id`, `group_id`, `page_id`, `role` | **Explicit page ACLs** — reveals which users/groups have special access to which pages. |
| 34 | `watch` | `user_id`, `target_type`, `target_id` | **Notification subscriptions** — reveals what pages/collections a user is monitoring. |
| 35 | `favorite` | `user_id`, `page_id` | **User bookmarks** — reveals what pages a user finds important. |
| 36 | `oauth_user` | `external_id`, `external_username`, `external_email`, `provider_id` | **Third-party account links** — maps wiki user IDs to external accounts (Slack, Discord, GitHub usernames). |
| 37 | `ldap_user` | `user_id`, `ldap_provider_id`, `external_id`, `dn` | **LDAP identity mapping** — maps wiki users to LDAP entries. |
| 38 | `passkey_credential` | `device_name`, `user_id` | **Device fingerprinting** — what devices users registered for passkeys. |
| 39 | `scim_event` | `resource_type`, `operation`, `external_id`, `local_id` | **SCIM provisioning events** — reveals user/group sync activity patterns. |

---

## LOW — Acceptably public

These tables contain structural/metadata information that's reasonably safe as public or is the kind of data that needs to be widely queryable for the app to function.

| # | Table | Rationale |
|---|-------|-----------|
| 40 | `audit_event` | Audit log events — contains actor/target info but no secrets |
| 41 | `group` | Group definitions — name/description is not sensitive |
| 42 | `collection` | Collection metadata — names, icons, sorting |
| 43 | `collection_sort_rule` | Collection sort preferences |
| 44 | `page_tag` | Tag metadata |
| 45 | `comment_reaction` | Emoji reactions — emoji + user_id |
| 46 | `app_setting` | App-wide configuration (site name, etc.) |
| 47 | `ai_config` | AI configuration |
| 48 | `db_base`, `db_column`, `db_row`, `db_cell` | Inline database tables within pages — content is page data |
| 49 | `synced_block`, `synced_block_ref` | Synced block content |
| 50 | `webhook_event` | Webhook delivery records |

---

## Recommended Actions

### Immediate (critical vulnerabilities)

1. **`mfa_method.totp_secret`** — Make this table private, or split TOTP secrets into a separate private table keyed by `user_id`.
2. **`oauth_user.access_token` + `refresh_token`** — Move to a private table. These should never be directly queryable.
3. **`oidc_provider.client_secret`** — Make private or store as a server-side config that's injected, not in a queryable table.
4. **`oauth_provider.client_secret`** — Same treatment as OIDC.
5. **`ldap_provider.bind_password`** — Most critical. Make private immediately.
6. **`webhook.secret`** — Make private.

### Short-term (high priority)

7. **`user`** — Split `password_hash` and `email` into a private `user_credential` table. Keep only `id`, `name`, `role`, `avatar_url`, `created_at`, `updated_at` in the public table.
8. **`api_key`** — Move `key_hash` to a private table or keep the entire table private.
9. **`share_link`** — Move `password_hash` to a private table.
10. **`mfa_backup_code`** — Make private entirely.
11. **`page`** — Make private. Page content is the primary asset and should only be accessible through the API server's permission enforcement.
12. **`page_revision`** — Make private alongside pages.
13. **`comment`** — Make private.
14. **`ai_chat_message` + `ai_chat_session`** — Make private. AI conversations are user-private.
15. **`notification`** — Make private or filter by user_id at the API layer.

### Architectural recommendation

SpacetimeDB's `public` attribute is **all-or-nothing per table** — there's no column-level or row-level privacy. The wiki relies on the API server for authorization, which means the STDB port (3001) should be:

1. **Firewalled** — only accessible from the API server container, not exposed to the host network
2. **Authenticated** — add STDB-level token auth if SpacetimeDB supports it (or use a proxy)
3. **Audited** — monitor for direct STDB connections that bypass the API server

Alternatively, the wiki architecture could adopt a **private-by-default** pattern: only tables that genuinely need cross-client querying (like `audit_event`) remain public. Everything else starts private and is accessed through reducers that enforce permissions.

---

## Table Privacy Classification Summary

| Category | Count | Tables |
|----------|-------|--------|
| CRITICAL (secrets exposed) | 14 | mfa_method, oauth_user, oidc_provider, oauth_provider, ldap_provider, webhook, user (hash+email), api_key, mfa_backup_code, share_link, scim_provider, passkey_credential, saml_provider, ldap_user |
| HIGH (PII/content exposed) | 13 | user (email+name), page, page_revision, comment, notification, access_request, ai_chat_message, ai_chat_session, collab_update, search_result, invitation, attachment |
| MODERATE (metadata leakage) | 12 | collab_session, page_view, collection_member, group_member, page_permission, watch, favorite, oauth_user (ext), ldap_user (ext), passkey_credential (metadata), scim_event |
| LOW (acceptably public) | 11 | audit_event, group, collection, collection_sort_rule, page_tag, comment_reaction, app_setting, ai_config, db_base/col/row/cell, synced_block/ref, webhook_event |
| **Total** | **50** | |
