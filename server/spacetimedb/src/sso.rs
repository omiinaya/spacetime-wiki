use spacetimedb::*;
use crate::tables::*;
use crate::helpers::*;

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
    if entity_id.is_empty() {
        return Err("Entity ID is required".into());
    }
    if !sso_url.starts_with("http://") && !sso_url.starts_with("https://") {
        return Err("SSO URL must start with http:// or https://".into());
    }
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
    if entity_id.is_empty() {
        return Err("Entity ID is required".into());
    }
    if !sso_url.starts_with("http://") && !sso_url.starts_with("https://") {
        return Err("SSO URL must start with http:// or https://".into());
    }
    let found = ctx.db.saml_provider().iter().find(|p| p.id == id);
    if found.is_none() {
        return Err("SAML provider not found".into());
    }
    let mut provider = found.unwrap();
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
    let found = ctx.db.saml_provider().iter().find(|p| p.id == id);
    if found.is_none() {
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
    if !issuer_url.starts_with("http://") && !issuer_url.starts_with("https://") {
        return Err("Issuer URL must start with http:// or https://".into());
    }
    if client_id.is_empty() {
        return Err("Client ID is required".into());
    }
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
    if !issuer_url.starts_with("http://") && !issuer_url.starts_with("https://") {
        return Err("Issuer URL must start with http:// or https://".into());
    }
    if client_id.is_empty() {
        return Err("Client ID is required".into());
    }
    let found = ctx.db.oidc_provider().iter().find(|p| p.id == id);
    if found.is_none() {
        return Err("OIDC provider not found".into());
    }
    let mut provider = found.unwrap();
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
    let found = ctx.db.oidc_provider().iter().find(|p| p.id == id);
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
    if host.is_empty() {
        return Err("LDAP host is required".into());
    }
    if base_dn.is_empty() {
        return Err("Base DN is required".into());
    }
    if user_filter.is_empty() {
        return Err("User filter is required".into());
    }
    let valid_roles = ["admin", "member", "viewer"];
    let role_clean = if valid_roles.contains(&default_role.as_str()) { default_role.clone() } else { "member".into() };
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
    if host.is_empty() {
        return Err("LDAP host is required".into());
    }
    if base_dn.is_empty() {
        return Err("Base DN is required".into());
    }
    let found = ctx.db.ldap_provider().iter().find(|p| p.id == id);
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
    let valid_roles = ["admin", "member", "viewer"];
    provider.default_role = if valid_roles.contains(&default_role.as_str()) { default_role } else { "member".into() };
    provider.auto_register = auto_register;
    provider.is_active = is_active;
    provider.updated_at = now_ms(ctx);
    ctx.db.ldap_provider().id().update(provider);
    Ok(())
}

#[reducer]
pub fn delete_ldap_provider(ctx: &ReducerContext, id: String) -> Result<(), String> {
    let found = ctx.db.ldap_provider().iter().find(|p| p.id == id);
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
    let valid_types = ["slack", "discord", "github", "gitlab", "generic"];
    if !valid_types.contains(&provider_type.as_str()) {
        return Err("Invalid provider type. Must be one of: slack, discord, github, gitlab, generic".into());
    }
    if name.is_empty() {
        return Err("Provider name is required".into());
    }
    if client_id.is_empty() {
        return Err("Client ID is required".into());
    }
    if client_secret.is_empty() {
        return Err("Client secret is required".into());
    }
    if authorize_url.is_empty() || token_url.is_empty() || userinfo_url.is_empty() {
        return Err("authorize_url, token_url, and userinfo_url are required".into());
    }
    let valid_roles = ["admin", "member", "viewer"];
    let role_clean = if valid_roles.contains(&default_role.as_str()) { default_role.clone() } else { "member".into() };
    let scopes_clean = if scope.is_empty() {
        match provider_type.as_str() {
            "slack" => "openid email profile".into(),
            "discord" => "identify email".into(),
            "github" => "read:user user:email".into(),
            "gitlab" => "read_user".into(),
            _ => "openid email profile".into(),
        }
    } else { scope };
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
    let found = ctx.db.oauth_provider().iter().find(|p| p.id == id);
    if found.is_none() {
        return Err("OAuth provider not found".into());
    }
    let valid_types = ["slack", "discord", "github", "gitlab", "generic"];
    if !valid_types.contains(&provider_type.as_str()) {
        return Err("Invalid provider type".into());
    }
    if name.is_empty() {
        return Err("Provider name is required".into());
    }
    if client_id.is_empty() {
        return Err("Client ID is required".into());
    }
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
    let valid_roles = ["admin", "member", "viewer"];
    provider.default_role = if valid_roles.contains(&default_role.as_str()) { default_role } else { "member".into() };
    provider.is_active = is_active;
    provider.updated_at = now_ms(ctx);
    ctx.db.oauth_provider().id().update(provider);
    Ok(())
}

#[reducer]
pub fn delete_oauth_provider(ctx: &ReducerContext, id: String) -> Result<(), String> {
    let found = ctx.db.oauth_provider().iter().find(|p| p.id == id);
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
