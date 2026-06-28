use spacetimedb::*;
use crate::tables::*;
use crate::helpers::*;

// ─── Users ───────────────────────────────────────────────────────────────────

#[reducer]
pub fn register_user(
    ctx: &ReducerContext,
    id: String,
    name: String,
    email: String,
    password: String,
    role: String,
) -> Result<(), String> {
    let existing = ctx.db.user().iter().find(|u| u.email == email);
    if existing.is_some() {
        return Err("Email already registered".into());
    }
    let valid_roles = ["admin", "member", "viewer"];
    let role_clean = if valid_roles.contains(&role.as_str()) { role } else { "member".into() };
    let now = now_ms(ctx);
    let password_hash = hash_password(&password);
    ctx.db.user().insert(User {
        id, name, email, password_hash,
        role: role_clean,
        avatar_url: String::new(),
        created_at: now, updated_at: now,
    });
    Ok(())
}

#[reducer]
pub fn login_user(
    ctx: &ReducerContext,
    email: String,
    password: String,
) -> Result<(), String> {
    let password_hash = hash_password(&password);
    let found = ctx.db.user().iter()
        .find(|u| u.email == email && u.password_hash == password_hash);
    if found.is_none() {
        return Err("Invalid email or password".into());
    }
    Ok(())
}

#[reducer]
pub fn update_user_role(
    ctx: &ReducerContext,
    user_id: String,
    new_role: String,
    updated_by: String,
) -> Result<(), String> {
    // Only admins can change roles
    let updater = ctx.db.user().iter().find(|u| u.id == updated_by);
    if updater.is_none() || updater.unwrap().role != "admin" {
        return Err("Only admins can change roles".into());
    }
    let valid_roles = ["admin", "member", "viewer"];
    if !valid_roles.contains(&new_role.as_str()) {
        return Err("Invalid role. Must be admin, member, or viewer".into());
    }
    let found = ctx.db.user().iter().find(|u| u.id == user_id);
    if found.is_none() {
        return Err("User not found".into());
    }
    let mut user = found.unwrap();
    user.role = new_role;
    user.updated_at = now_ms(ctx);
    ctx.db.user().id().update(user);
    Ok(())
}

#[reducer]
pub fn update_user_avatar(
    ctx: &ReducerContext,
    user_id: String,
    avatar_url: String,
    updated_by: String,
) -> Result<(), String> {
    // Only admins can change avatars
    let updater = ctx.db.user().iter().find(|u| u.id == updated_by);
    if updater.is_none() || updater.unwrap().role != "admin" {
        return Err("Only admins can change user avatars".into());
    }
    let found = ctx.db.user().iter().find(|u| u.id == user_id);
    if found.is_none() {
        return Err("User not found".into());
    }
    let mut user = found.unwrap();
    user.avatar_url = avatar_url;
    user.updated_at = now_ms(ctx);
    ctx.db.user().id().update(user);
    Ok(())
}
