// ─── Generic read bridge for PRIVATE tables ─────────────────────────────────
//
// STDB reducers cannot return values. The frontend needs to read rows from
// tables that are `#[table(..., private)]` (oidc_provider, mfa_method,
// mfa_backup_code, ai_chat_session, ai_chat_message, watch, notification,
// access_request). SQL against a private table returns a hard error, so the
// frontend calls `bridge_read(table, filter_json, request_id)` and the
// reducer writes SAFE whitelisted columns of matching rows into the PUBLIC
// `read_bridge` table. The frontend reads the bridge rows back by
// request_id and then clears them.
//
// SECURITY: only the columns listed in SAFE_COLUMNS below are ever bridged.
// Secret material (password_hash, key_hash, totp_secret, code_hash,
// client_secret, api_token_hash) is NEVER copied into the public bridge.

use crate::helpers::now_ms;
use crate::tables::*;
use spacetimedb::*;

fn safe_json(table: &str, row_json: &str) -> Option<String> {
    // Parse the JSON object, drop every key that is NOT in the whitelist,
    // and re-serialize. Fields are snake_case to match the Rust structs.
    let v: serde_json::Value = serde_json::from_str(row_json).ok()?;
    let obj = v.as_object()?;
    let allowed: &[&str] = match table {
        "oidc_provider" => &[
            "id",
            "name",
            "slug",
            "issuer_url",
            "client_id",
            "scopes",
            "is_active",
            "created_by",
            "created_at",
            "updated_at",
        ],
        "mfa_method" => &[
            "id",
            "user_id",
            "method_type",
            "is_enabled",
            "created_at",
            "updated_at",
        ],
        "mfa_backup_code" => &["id", "user_id", "used", "created_at"],
        "ai_chat_session" => &[
            "id",
            "user_id",
            "title",
            "page_context_id",
            "created_at",
            "updated_at",
        ],
        "ai_chat_message" => &["id", "session_id", "role", "content", "created_at"],
        "watch" => &["id", "user_id", "target_type", "target_id", "created_at"],
        "notification" => &[
            "id",
            "user_id",
            "type",
            "title",
            "message",
            "read",
            "created_at",
        ],
        "access_request" => &[
            "id",
            "requester_id",
            "target_type",
            "target_id",
            "reason",
            "status",
            "created_at",
        ],
        "oauth_user" => &[
            "id",
            "user_id",
            "provider_id",
            "external_id",
            "external_username",
            "external_email",
            "last_synced_at",
            "created_at",
            "updated_at",
        ],
        "ldap_provider" => &[
            "id",
            "name",
            "slug",
            "host",
            "port",
            "is_secure",
            "bind_dn",
            "base_dn",
            "user_filter",
            "username_attribute",
            "email_attribute",
            "name_attribute",
            "default_role",
            "auto_register",
            "is_active",
            "created_by",
            "created_at",
            "updated_at",
        ],
        "saml_provider" => &[
            "id",
            "name",
            "slug",
            "entity_id",
            "sso_url",
            "name_id_format",
            "attribute_mapping",
            "auto_register",
            "is_active",
            "created_by",
            "created_at",
            "updated_at",
        ],
        "ldap_user" => &[
            "id",
            "user_id",
            "ldap_provider_id",
            "dn",
            "external_id",
            "last_synced_at",
            "created_at",
        ],
        "webhook" => &[
            "id",
            "name",
            "url",
            "events",
            "is_active",
            "created_by",
            "created_at",
            "updated_at",
        ],
        "invitation" => &[
            "id",
            "email",
            "invited_by",
            "role",
            "page_ids",
            "collection_ids",
            "token",
            "status",
            "message",
            "expires_at",
            "view_count",
            "created_at",
            "updated_at",
        ],
        _ => return None,
    };
    let mut out = serde_json::Map::new();
    for k in allowed {
        if let Some(v) = obj.get(*k) {
            out.insert((*k).to_string(), v.clone());
        }
    }
    serde_json::Value::Object(out).to_string().into()
}

/// Does a bridged row satisfy all equality filters?
fn row_matches(
    table: &str,
    row_json: &str,
    filters: &serde_json::Map<String, serde_json::Value>,
) -> bool {
    let Some(json) = safe_json(table, row_json) else {
        return false;
    };
    let Ok(v) = serde_json::from_str::<serde_json::Value>(&json) else {
        return false;
    };
    let Some(obj) = v.as_object() else {
        return false;
    };
    filters.iter().all(|(k, want)| match obj.get(k) {
        Some(got) => got == want,
        None => false,
    })
}

/// Bridge read of a private table.
///
/// `filter_json` is a JSON object of equality filters, e.g.
/// `{"user_id": "u1"}`. Only rows matching ALL filters are bridged.
/// Safe columns per table are whitelisted; secret columns are never copied.
#[reducer]
pub fn bridge_read(
    ctx: &ReducerContext,
    request_id: String,
    table: String,
    filter_json: String,
) -> Result<(), String> {
    if request_id.is_empty() {
        return Err("request_id is required".into());
    }
    let filters: serde_json::Map<String, serde_json::Value> =
        serde_json::from_str(&filter_json).unwrap_or_default();

    // Remove any stale rows with the same request_id (idempotent)
    let stale: Vec<String> = ctx
        .db
        .read_bridge()
        .iter()
        .filter(|r| r.request_id == request_id)
        .map(|r| r.request_id.clone())
        .collect();
    for rid in stale {
        if let Some(r) = ctx.db.read_bridge().request_id().find(&rid) {
            ctx.db.read_bridge().request_id().delete(&r.request_id);
        }
    }

    let now = now_ms(ctx);
    match table.as_str() {
        "oidc_provider" => {
            for row in ctx.db.oidc_provider().iter() {
                if let Some(json) = safe_json(
                    "oidc_provider",
                    &serde_json::to_string(&row).unwrap_or_default(),
                ) {
                    if row_matches("oidc_provider", &json, &filters) {
                        ctx.db.read_bridge().insert(ReadBridge {
                            request_id: request_id.clone(),
                            source_table: "oidc_provider".into(),
                            row_json: json,
                            created_at: now,
                        });
                    }
                }
            }
        }
        "mfa_method" => {
            for row in ctx.db.mfa_method().iter() {
                if let Some(json) = safe_json(
                    "mfa_method",
                    &serde_json::to_string(&row).unwrap_or_default(),
                ) {
                    if row_matches("mfa_method", &json, &filters) {
                        ctx.db.read_bridge().insert(ReadBridge {
                            request_id: request_id.clone(),
                            source_table: "mfa_method".into(),
                            row_json: json,
                            created_at: now,
                        });
                    }
                }
            }
        }
        "mfa_backup_code" => {
            for row in ctx.db.mfa_backup_code().iter() {
                if let Some(json) = safe_json(
                    "mfa_backup_code",
                    &serde_json::to_string(&row).unwrap_or_default(),
                ) {
                    if row_matches("mfa_backup_code", &json, &filters) {
                        ctx.db.read_bridge().insert(ReadBridge {
                            request_id: request_id.clone(),
                            source_table: "mfa_backup_code".into(),
                            row_json: json,
                            created_at: now,
                        });
                    }
                }
            }
        }
        "ai_chat_session" => {
            for row in ctx.db.ai_chat_session().iter() {
                if let Some(json) = safe_json(
                    "ai_chat_session",
                    &serde_json::to_string(&row).unwrap_or_default(),
                ) {
                    if row_matches("ai_chat_session", &json, &filters) {
                        ctx.db.read_bridge().insert(ReadBridge {
                            request_id: request_id.clone(),
                            source_table: "ai_chat_session".into(),
                            row_json: json,
                            created_at: now,
                        });
                    }
                }
            }
        }
        "ai_chat_message" => {
            for row in ctx.db.ai_chat_message().iter() {
                if let Some(json) = safe_json(
                    "ai_chat_message",
                    &serde_json::to_string(&row).unwrap_or_default(),
                ) {
                    if row_matches("ai_chat_message", &json, &filters) {
                        ctx.db.read_bridge().insert(ReadBridge {
                            request_id: request_id.clone(),
                            source_table: "ai_chat_message".into(),
                            row_json: json,
                            created_at: now,
                        });
                    }
                }
            }
        }
        "watch" => {
            for row in ctx.db.watch().iter() {
                if let Some(json) =
                    safe_json("watch", &serde_json::to_string(&row).unwrap_or_default())
                {
                    if row_matches("watch", &json, &filters) {
                        ctx.db.read_bridge().insert(ReadBridge {
                            request_id: request_id.clone(),
                            source_table: "watch".into(),
                            row_json: json,
                            created_at: now,
                        });
                    }
                }
            }
        }
        "notification" => {
            for row in ctx.db.notification().iter() {
                if let Some(json) = safe_json(
                    "notification",
                    &serde_json::to_string(&row).unwrap_or_default(),
                ) {
                    if row_matches("notification", &json, &filters) {
                        ctx.db.read_bridge().insert(ReadBridge {
                            request_id: request_id.clone(),
                            source_table: "notification".into(),
                            row_json: json,
                            created_at: now,
                        });
                    }
                }
            }
        }
        "access_request" => {
            for row in ctx.db.access_request().iter() {
                if let Some(json) = safe_json(
                    "access_request",
                    &serde_json::to_string(&row).unwrap_or_default(),
                ) {
                    if row_matches("access_request", &json, &filters) {
                        ctx.db.read_bridge().insert(ReadBridge {
                            request_id: request_id.clone(),
                            source_table: "access_request".into(),
                            row_json: json,
                            created_at: now,
                        });
                    }
                }
            }
        }
        "oauth_user" => {
            for row in ctx.db.oauth_user().iter() {
                if let Some(json) = safe_json(
                    "oauth_user",
                    &serde_json::to_string(&row).unwrap_or_default(),
                ) {
                    if row_matches("oauth_user", &json, &filters) {
                        ctx.db.read_bridge().insert(ReadBridge {
                            request_id: request_id.clone(),
                            source_table: "oauth_user".into(),
                            row_json: json,
                            created_at: now,
                        });
                    }
                }
            }
        }
        "ldap_provider" => {
            for row in ctx.db.ldap_provider().iter() {
                if let Some(json) = safe_json(
                    "ldap_provider",
                    &serde_json::to_string(&row).unwrap_or_default(),
                ) {
                    if row_matches("ldap_provider", &json, &filters) {
                        ctx.db.read_bridge().insert(ReadBridge {
                            request_id: request_id.clone(),
                            source_table: "ldap_provider".into(),
                            row_json: json,
                            created_at: now,
                        });
                    }
                }
            }
        }
        "saml_provider" => {
            for row in ctx.db.saml_provider().iter() {
                if let Some(json) = safe_json(
                    "saml_provider",
                    &serde_json::to_string(&row).unwrap_or_default(),
                ) {
                    if row_matches("saml_provider", &json, &filters) {
                        ctx.db.read_bridge().insert(ReadBridge {
                            request_id: request_id.clone(),
                            source_table: "saml_provider".into(),
                            row_json: json,
                            created_at: now,
                        });
                    }
                }
            }
        }
        "ldap_user" => {
            for row in ctx.db.ldap_user().iter() {
                if let Some(json) = safe_json(
                    "ldap_user",
                    &serde_json::to_string(&row).unwrap_or_default(),
                ) {
                    if row_matches("ldap_user", &json, &filters) {
                        ctx.db.read_bridge().insert(ReadBridge {
                            request_id: request_id.clone(),
                            source_table: "ldap_user".into(),
                            row_json: json,
                            created_at: now,
                        });
                    }
                }
            }
        }
        "webhook" => {
            for row in ctx.db.webhook().iter() {
                if let Some(json) =
                    safe_json("webhook", &serde_json::to_string(&row).unwrap_or_default())
                {
                    if row_matches("webhook", &json, &filters) {
                        ctx.db.read_bridge().insert(ReadBridge {
                            request_id: request_id.clone(),
                            source_table: "webhook".into(),
                            row_json: json,
                            created_at: now,
                        });
                    }
                }
            }
        }
        "invitation" => {
            for row in ctx.db.invitation().iter() {
                if let Some(json) = safe_json(
                    "invitation",
                    &serde_json::to_string(&row).unwrap_or_default(),
                ) {
                    if row_matches("invitation", &json, &filters) {
                        ctx.db.read_bridge().insert(ReadBridge {
                            request_id: request_id.clone(),
                            source_table: "invitation".into(),
                            row_json: json,
                            created_at: now,
                        });
                    }
                }
            }
        }
        _ => return Err(format!("bridge_read: unsupported table '{table}'")),
    }
    Ok(())
}

/// Clear bridge rows for a request_id after the caller has read them.
#[reducer]
pub fn clear_read_bridge(ctx: &ReducerContext, request_id: String) -> Result<(), String> {
    let stale: Vec<String> = ctx
        .db
        .read_bridge()
        .iter()
        .filter(|r| r.request_id == request_id)
        .map(|r| r.request_id.clone())
        .collect();
    for rid in stale {
        if let Some(r) = ctx.db.read_bridge().request_id().find(&rid) {
            ctx.db.read_bridge().request_id().delete(&r.request_id);
        }
    }
    Ok(())
}
