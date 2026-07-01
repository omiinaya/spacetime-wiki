use spacetimedb::*;
use crate::tables::*;
use crate::helpers::*;

// ─── Validation helpers (testable) ─────────────────────────────────────────

/// Checks that a URL starts with http:// or https://
pub(crate) fn validate_url(url: &str, field_name: &str) -> Result<(), String> {
    if !url.starts_with("http://") && !url.starts_with("https://") {
        Err(format!("{} must start with http:// or https://", field_name))
    } else {
        Ok(())
    }
}

/// Checks that a required string field is not empty
pub(crate) fn validate_not_empty(value: &str, field_name: &str) -> Result<(), String> {
    if value.is_empty() {
        Err(format!("{} is required", field_name))
    } else {
        Ok(())
    }
}

/// Validates that provider_type is one of the known OAuth types
pub(crate) fn validate_oauth_provider_type(provider_type: &str) -> Result<(), String> {
    let valid = ["slack", "discord", "github", "gitlab", "generic"];
    if valid.contains(&provider_type) {
        Ok(())
    } else {
        Err("Invalid provider type. Must be one of: slack, discord, github, gitlab, generic".into())
    }
}

/// Returns provider-appropriate default scope for OAuth provider types
pub(crate) fn default_oauth_scope(provider_type: &str) -> &'static str {
    match provider_type {
        "slack" => "openid email profile",
        "discord" => "identify email",
        "github" => "read:user user:email",
        "gitlab" => "read_user",
        _ => "openid email profile",
    }
}

/// Default role if the provided role isn't valid, otherwise return it as-is
pub(crate) fn sanitize_role(role: &str, valid_roles: &[&str], default: &str) -> String {
    if valid_roles.contains(&role) { role.to_string() } else { default.to_string() }
}

// ─── SAML 2.0 SSO ─────────────────────────────────────────────────────────────

#[reducer]
pub fn add_saml_provider(
    ctx: &ReducerContext,
    id: String,
    name: String,
    slug: String,
    entity_id: String,
    sso_url: String,
    certificate: String,
    name_id_format: String,
    attribute_mapping: String,
    auto_register: bool,
    created_by: String,
) -> Result<(), String> {
    validate_not_empty(&entity_id, "Entity ID")?;
    validate_url(&sso_url, "SSO URL")?;
    let now = now_ms(ctx);
    ctx.db.saml_provider().insert(SamlProvider {
        id, name, slug, entity_id, sso_url,
        certificate,
        name_id_format: if name_id_format.is_empty() { "urn:oasis:names:tc:SAML:1.1:nameid-format:emailAddress".into() } else { name_id_format },
        attribute_mapping: if attribute_mapping.is_empty() { r#"{"email":"email","name":"name"}"#.into() } else { attribute_mapping },
        auto_register,
        is_active: true,
        created_by,
        created_at: now,
        updated_at: now,
    });
    Ok(())
}

#[reducer]
pub fn update_saml_provider(
    ctx: &ReducerContext,
    id: String,
    name: String,
    slug: String,
    entity_id: String,
    sso_url: String,
    certificate: String,
    name_id_format: String,
    attribute_mapping: String,
    auto_register: bool,
    is_active: bool,
) -> Result<(), String> {
    validate_not_empty(&entity_id, "Entity ID")?;
    validate_url(&sso_url, "SSO URL")?;
    let mut provider = ctx.db.saml_provider().id().find(id).ok_or_else(|| "SAML provider not found".to_string())?;
    provider.name = name;
    provider.slug = slug;
    provider.entity_id = entity_id;
    provider.sso_url = sso_url;
    if !certificate.is_empty() {
        provider.certificate = certificate;
    }
    provider.name_id_format = if name_id_format.is_empty() { "urn:oasis:names:tc:SAML:1.1:nameid-format:emailAddress".into() } else { name_id_format };
    provider.attribute_mapping = if attribute_mapping.is_empty() { r#"{"email":"email","name":"name"}"#.into() } else { attribute_mapping };
    provider.auto_register = auto_register;
    provider.is_active = is_active;
    provider.updated_at = now_ms(ctx);
    ctx.db.saml_provider().id().update(provider);
    Ok(())
}

#[reducer]
pub fn delete_saml_provider(ctx: &ReducerContext, id: String) -> Result<(), String> {
    if ctx.db.saml_provider().id().find(&id).is_none() {
        return Err("SAML provider not found".into());
    }
    ctx.db.saml_provider().id().delete(&id);
    Ok(())
}

// ─── OIDC SSO ─────────────────────────────────────────────────────────────────

#[reducer]
pub fn add_oidc_provider(
    ctx: &ReducerContext,
    id: String,
    name: String,
    slug: String,
    issuer_url: String,
    client_id: String,
    client_secret: String,
    scopes: String,
    created_by: String,
) -> Result<(), String> {
    validate_url(&issuer_url, "Issuer URL")?;
    validate_not_empty(&client_id, "Client ID")?;
    let now = now_ms(ctx);
    ctx.db.oidc_provider().insert(OidcProvider {
        id, name, slug, issuer_url, client_id,
        client_secret: if client_secret.is_empty() { String::new() } else { client_secret },
        scopes: if scopes.is_empty() { "openid email profile".into() } else { scopes },
        is_active: true,
        created_by,
        created_at: now,
        updated_at: now,
    });
    Ok(())
}

#[reducer]
pub fn update_oidc_provider(
    ctx: &ReducerContext,
    id: String,
    name: String,
    slug: String,
    issuer_url: String,
    client_id: String,
    client_secret: String,
    scopes: String,
    is_active: bool,
) -> Result<(), String> {
    validate_url(&issuer_url, "Issuer URL")?;
    validate_not_empty(&client_id, "Client ID")?;
    let mut provider = ctx.db.oidc_provider().id().find(id).ok_or_else(|| "OIDC provider not found".to_string())?;
    provider.name = name;
    provider.slug = slug;
    provider.issuer_url = issuer_url;
    provider.client_id = client_id;
    if !client_secret.is_empty() {
        provider.client_secret = client_secret;
    }
    provider.scopes = if scopes.is_empty() { "openid email profile".into() } else { scopes };
    provider.is_active = is_active;
    provider.updated_at = now_ms(ctx);
    ctx.db.oidc_provider().id().update(provider);
    Ok(())
}

#[reducer]
pub fn delete_oidc_provider(ctx: &ReducerContext, id: String) -> Result<(), String> {
    let found = ctx.db.oidc_provider().id().find(id.clone());
    if found.is_none() {
        return Err("OIDC provider not found".into());
    }
    ctx.db.oidc_provider().id().delete(&id);
    Ok(())
}

// ─── LDAP Authentication ───────────────────────────────────────────────────────

#[reducer]
pub fn add_ldap_provider(
    ctx: &ReducerContext,
    id: String,
    name: String,
    slug: String,
    host: String,
    port: u16,
    is_secure: bool,
    bind_dn: String,
    bind_password: String,
    base_dn: String,
    user_filter: String,
    username_attribute: String,
    email_attribute: String,
    name_attribute: String,
    default_role: String,
    auto_register: bool,
    created_by: String,
) -> Result<(), String> {
    validate_not_empty(&host, "LDAP host")?;
    validate_not_empty(&base_dn, "Base DN")?;
    validate_not_empty(&user_filter, "User filter")?;
    let role_clean = sanitize_role(&default_role, &["admin", "member", "viewer"], "member");
    let now = now_ms(ctx);
    ctx.db.ldap_provider().insert(LdapProvider {
        id, name, slug, host, port, is_secure,
        bind_dn, bind_password, base_dn, user_filter,
        username_attribute, email_attribute, name_attribute,
        default_role: role_clean,
        auto_register, is_active: true,
        created_by, created_at: now, updated_at: now,
    });
    Ok(())
}

#[reducer]
pub fn update_ldap_provider(
    ctx: &ReducerContext,
    id: String,
    name: String,
    slug: String,
    host: String,
    port: u16,
    is_secure: bool,
    bind_dn: String,
    bind_password: String,
    base_dn: String,
    user_filter: String,
    username_attribute: String,
    email_attribute: String,
    name_attribute: String,
    default_role: String,
    auto_register: bool,
    is_active: bool,
) -> Result<(), String> {
    validate_not_empty(&host, "LDAP host")?;
    validate_not_empty(&base_dn, "Base DN")?;
    let found = ctx.db.ldap_provider().id().find(id.clone());
    if found.is_none() {
        return Err("LDAP provider not found".into());
    }
    let mut provider = found.unwrap();
    provider.name = name;
    provider.slug = slug;
    provider.host = host;
    provider.port = port;
    provider.is_secure = is_secure;
    provider.bind_dn = bind_dn;
    if !bind_password.is_empty() {
        provider.bind_password = bind_password;
    }
    provider.base_dn = base_dn;
    provider.user_filter = user_filter;
    provider.username_attribute = if username_attribute.is_empty() { "uid".into() } else { username_attribute };
    provider.email_attribute = if email_attribute.is_empty() { "mail".into() } else { email_attribute };
    provider.name_attribute = if name_attribute.is_empty() { "cn".into() } else { name_attribute };
    provider.default_role = sanitize_role(&default_role, &["admin", "member", "viewer"], "member");
    provider.auto_register = auto_register;
    provider.is_active = is_active;
    provider.updated_at = now_ms(ctx);
    ctx.db.ldap_provider().id().update(provider);
    Ok(())
}

#[reducer]
pub fn delete_ldap_provider(ctx: &ReducerContext, id: String) -> Result<(), String> {
    let found = ctx.db.ldap_provider().id().find(id.clone());
    if found.is_none() {
        return Err("LDAP provider not found".into());
    }
    // Also delete linked ldap_user records
    for u in ctx.db.ldap_user().iter().filter(|u| u.ldap_provider_id == id).map(|u| u.id.clone()).collect::<Vec<_>>() {
        ctx.db.ldap_user().id().delete(&u);
    }
    ctx.db.ldap_provider().id().delete(&id);
    Ok(())
}

#[reducer]
pub fn link_ldap_user(
    ctx: &ReducerContext,
    id: String,
    user_id: String,
    ldap_provider_id: String,
    dn: String,
    external_id: String,
) -> Result<(), String> {
    let now = now_ms(ctx);
    ctx.db.ldap_user().insert(LdapUser {
        id, user_id, ldap_provider_id, dn, external_id,
        last_synced_at: now, created_at: now,
    });
    Ok(())
}

// ─── OAuth 2.0 Provider (Slack/Discord/GitHub/GitLab) ──────────────────────

#[reducer]
pub fn add_oauth_provider(
    ctx: &ReducerContext,
    id: String,
    name: String,
    slug: String,
    provider_type: String,
    authorize_url: String,
    token_url: String,
    userinfo_url: String,
    scope: String,
    client_id: String,
    client_secret: String,
    icon: String,
    auto_register: bool,
    default_role: String,
    created_by: String,
) -> Result<(), String> {
    validate_oauth_provider_type(&provider_type)?;
    validate_not_empty(&name, "Provider name")?;
    validate_not_empty(&client_id, "Client ID")?;
    validate_not_empty(&client_secret, "Client secret")?;
    if authorize_url.is_empty() || token_url.is_empty() || userinfo_url.is_empty() {
        return Err("authorize_url, token_url, and userinfo_url are required".into());
    }
    let role_clean = sanitize_role(&default_role, &["admin", "member", "viewer"], "member");
    let scopes_clean = if scope.is_empty() { default_oauth_scope(&provider_type).into() } else { scope };
    let now = now_ms(ctx);
    let provider_type_clone = provider_type.clone();
    ctx.db.oauth_provider().insert(OauthProvider {
        id, name, slug, provider_type,
        authorize_url, token_url, userinfo_url,
        scope: scopes_clean, client_id, client_secret,
        icon: if icon.is_empty() { provider_type_clone.clone() } else { icon },
        is_active: true, auto_register,
        default_role: role_clean,
        created_by, created_at: now, updated_at: now,
    });
    Ok(())
}

#[reducer]
pub fn update_oauth_provider(
    ctx: &ReducerContext,
    id: String,
    name: String,
    slug: String,
    provider_type: String,
    authorize_url: String,
    token_url: String,
    userinfo_url: String,
    scope: String,
    client_id: String,
    client_secret: String,
    icon: String,
    auto_register: bool,
    default_role: String,
    is_active: bool,
) -> Result<(), String> {
    let found = ctx.db.oauth_provider().id().find(id.clone());
    if found.is_none() {
        return Err("OAuth provider not found".into());
    }
    validate_oauth_provider_type(&provider_type)?;
    validate_not_empty(&name, "Provider name")?;
    validate_not_empty(&client_id, "Client ID")?;
    let mut provider = found.unwrap();
    provider.name = name;
    provider.slug = slug;
    provider.provider_type = provider_type;
    provider.authorize_url = authorize_url;
    provider.token_url = token_url;
    provider.userinfo_url = userinfo_url;
    if !scope.is_empty() {
        provider.scope = scope;
    }
    provider.client_id = client_id;
    if !client_secret.is_empty() {
        provider.client_secret = client_secret;
    }
    provider.icon = if icon.is_empty() { provider.provider_type.clone() } else { icon };
    provider.auto_register = auto_register;
    provider.default_role = sanitize_role(&default_role, &["admin", "member", "viewer"], "member");
    provider.is_active = is_active;
    provider.updated_at = now_ms(ctx);
    ctx.db.oauth_provider().id().update(provider);
    Ok(())
}

#[reducer]
pub fn delete_oauth_provider(ctx: &ReducerContext, id: String) -> Result<(), String> {
    let found = ctx.db.oauth_provider().id().find(id.clone());
    if found.is_none() {
        return Err("OAuth provider not found".into());
    }
    // Remove linked OAuth user records
    let linked: Vec<String> = ctx.db.oauth_user().iter()
        .filter(|u| u.provider_id == id)
        .map(|u| u.id.clone())
        .collect();
    for uid in &linked {
        ctx.db.oauth_user().id().delete(uid);
    }
    ctx.db.oauth_provider().id().delete(&id);
    Ok(())
}

#[reducer]
pub fn link_oauth_user(
    ctx: &ReducerContext,
    id: String,
    user_id: String,
    provider_id: String,
    external_id: String,
    external_username: String,
    external_email: String,
    access_token: String,
    refresh_token: String,
    token_expires_at: u64,
) -> Result<(), String> {
    if ctx.db.user().id().find(&user_id).is_none() {
        return Err("User not found".into());
    }
    if ctx.db.oauth_provider().id().find(&provider_id).is_none() {
        return Err("OAuth provider not found".into());
    }
    let now = now_ms(ctx);
    ctx.db.oauth_user().insert(OauthUser {
        id, user_id, provider_id, external_id, external_username, external_email,
        access_token, refresh_token, token_expires_at,
        last_synced_at: now, created_at: now, updated_at: now,
    });
    Ok(())
}

#[reducer]
pub fn unlink_oauth_user(ctx: &ReducerContext, id: String) -> Result<(), String> {
    let found = ctx.db.oauth_user().id().find(&id);
    if found.is_none() {
        return Err("OAuth user link not found".into());
    }
    ctx.db.oauth_user().id().delete(&id);
    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;

    // ─── validate_url ──────────────────────────────────────────────────────────

    #[test]
    fn test_validate_url_accepts_https() {
        assert!(validate_url("https://example.com", "URL").is_ok());
    }

    #[test]
    fn test_validate_url_accepts_http() {
        assert!(validate_url("http://example.com", "URL").is_ok());
    }

    #[test]
    fn test_validate_url_rejects_no_scheme() {
        let err = validate_url("example.com", "URL").unwrap_err();
        assert!(err.contains("must start with http:// or https://"));
    }

    #[test]
    fn test_validate_url_rejects_ftp() {
        let err = validate_url("ftp://example.com", "URL").unwrap_err();
        assert!(err.contains("must start with http:// or https://"));
    }

    #[test]
    fn test_validate_url_rejects_empty() {
        let err = validate_url("", "URL").unwrap_err();
        assert!(err.contains("must start with http:// or https://"));
    }

    #[test]
    fn test_validate_url_uses_field_name_in_error() {
        let err = validate_url("bad", "Issuer URL").unwrap_err();
        assert!(err.contains("Issuer URL"));
    }

    // ─── validate_not_empty ─────────────────────────────────────────────────────

    #[test]
    fn test_validate_not_empty_accepts_non_empty() {
        assert!(validate_not_empty("hello", "Field").is_ok());
    }

    #[test]
    fn test_validate_not_empty_rejects_empty() {
        let err = validate_not_empty("", "Field").unwrap_err();
        assert!(err.contains("required"));
    }

    #[test]
    fn test_validate_not_empty_uses_field_name() {
        let err = validate_not_empty("", "Client ID").unwrap_err();
        assert!(err.contains("Client ID"));
    }

    #[test]
    fn test_validate_not_empty_accepts_whitespace() {
        // Whitespace is still non-empty
        assert!(validate_not_empty(" ", "Field").is_ok());
    }

    // ─── validate_oauth_provider_type ───────────────────────────────────────────

    #[test]
    fn test_validate_oauth_provider_type_accepts_known_types() {
        assert!(validate_oauth_provider_type("slack").is_ok());
        assert!(validate_oauth_provider_type("discord").is_ok());
        assert!(validate_oauth_provider_type("github").is_ok());
        assert!(validate_oauth_provider_type("gitlab").is_ok());
        assert!(validate_oauth_provider_type("generic").is_ok());
    }

    #[test]
    fn test_validate_oauth_provider_type_rejects_unknown() {
        let err = validate_oauth_provider_type("microsoft").unwrap_err();
        assert!(err.contains("Invalid provider type"));
    }

    #[test]
    fn test_validate_oauth_provider_type_rejects_empty() {
        let err = validate_oauth_provider_type("").unwrap_err();
        assert!(err.contains("Invalid provider type"));
    }

    // ─── default_oauth_scope ────────────────────────────────────────────────────

    #[test]
    fn test_default_oauth_scope_slack() {
        assert_eq!(default_oauth_scope("slack"), "openid email profile");
    }

    #[test]
    fn test_default_oauth_scope_discord() {
        assert_eq!(default_oauth_scope("discord"), "identify email");
    }

    #[test]
    fn test_default_oauth_scope_github() {
        assert_eq!(default_oauth_scope("github"), "read:user user:email");
    }

    #[test]
    fn test_default_oauth_scope_gitlab() {
        assert_eq!(default_oauth_scope("gitlab"), "read_user");
    }

    #[test]
    fn test_default_oauth_scope_generic() {
        assert_eq!(default_oauth_scope("generic"), "openid email profile");
    }

    #[test]
    fn test_default_oauth_scope_unknown_falls_back() {
        assert_eq!(default_oauth_scope("unknown"), "openid email profile");
    }

    // ─── sanitize_role ──────────────────────────────────────────────────────────

    #[test]
    fn test_sanitize_role_passes_valid() {
        assert_eq!(sanitize_role("admin", &["admin", "member", "viewer"], "member"), "admin");
        assert_eq!(sanitize_role("member", &["admin", "member", "viewer"], "member"), "member");
        assert_eq!(sanitize_role("viewer", &["admin", "member", "viewer"], "member"), "viewer");
    }

    #[test]
    fn test_sanitize_role_defaults_on_invalid() {
        assert_eq!(sanitize_role("editor", &["admin", "member", "viewer"], "member"), "member");
        assert_eq!(sanitize_role("owner", &["admin", "member", "viewer"], "viewer"), "viewer");
        assert_eq!(sanitize_role("superadmin", &["admin", "member", "viewer"], "viewer"), "viewer");
    }

    #[test]
    fn test_sanitize_role_uses_custom_default() {
        assert_eq!(sanitize_role("", &["admin", "member", "viewer"], "viewer"), "viewer");
    }
}
