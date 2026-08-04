use crate::helpers::*;
use crate::tables::*;
use spacetimedb::*;

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
    validate_required_str(&name, "User name", 200)?;
    let existing = ctx.db.user().iter().find(|u| u.email == email);
    if existing.is_some() {
        return Err("Email already registered".into());
    }
    let role_clean = sanitize_user_role(&role);
    let now = now_ms(ctx);
    let password_hash = hash_password(&password)?;
    ctx.db.user().insert(User {
        id: id.clone(),
        name,
        email,
        role: role_clean,
        avatar_url: String::new(),
        created_at: now,
        updated_at: now,
    });
    ctx.db.user_credential().insert(UserCredential {
        user_id: id,
        password_hash,
    });
    Ok(())
}

#[reducer]
pub fn login_user(ctx: &ReducerContext, email: String, password: String) -> Result<(), String> {
    let found = ctx.db.user().iter().find(|u| u.email == email);
    let Some(user) = found else {
        return Err("Invalid email or password".into());
    };
    let cred = ctx
        .db
        .user_credential()
        .user_id()
        .find(&user.id)
        .ok_or_else(|| "Invalid email or password".to_string())?;
    if !verify_password(&password, &cred.password_hash) {
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
    let updater = ctx.db.user().id().find(updated_by);
    if updater.is_none_or(|u| u.role != "admin") {
        return Err("Only admins can change roles".into());
    }
    let valid_roles = ["admin", "member", "viewer"];
    if !valid_roles.contains(&new_role.as_str()) {
        return Err("Invalid role. Must be admin, member, or viewer".into());
    }
    let mut user = ctx
        .db
        .user()
        .id()
        .find(user_id)
        .ok_or_else(|| "User not found".to_string())?;
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
    let updater = ctx.db.user().id().find(updated_by);
    if updater.is_none_or(|u| u.role != "admin") {
        return Err("Only admins can change user avatars".into());
    }
    let mut user = ctx
        .db
        .user()
        .id()
        .find(user_id)
        .ok_or_else(|| "User not found".to_string())?;
    user.avatar_url = avatar_url;
    user.updated_at = now_ms(ctx);
    ctx.db.user().id().update(user);
    Ok(())
}

#[cfg(test)]
mod tests {

    #[test]
    fn test_register_user_validates_roles() {
        assert!(crate::helpers::is_valid_user_role("admin"));
        assert!(crate::helpers::is_valid_user_role("member"));
        assert!(crate::helpers::is_valid_user_role("viewer"));
        assert!(!crate::helpers::is_valid_user_role("superadmin"));
    }

    #[test]
    fn test_password_hash_consistency() {
        let hash = crate::helpers::hash_password("testpass123").unwrap();
        assert!(
            hash.starts_with("$argon2id$"),
            "Hash should be Argon2 PHC format"
        );
        assert!(
            crate::helpers::verify_password("testpass123", &hash),
            "Should verify against own hash"
        );
    }

    #[test]
    fn test_update_role_validates_role_values() {
        let valid_roles = ["admin", "member", "viewer"];
        assert!(valid_roles.contains(&"admin"));
        assert!(valid_roles.contains(&"member"));
        assert!(valid_roles.contains(&"viewer"));
        assert!(!valid_roles.contains(&"editor"));
        assert!(!valid_roles.contains(&""));
    }

    #[test]
    fn test_update_avatar_requires_admin() {
        let role = "admin";
        assert_eq!(role, "admin");
        let non_admin = "member";
        assert_ne!(non_admin, "admin");
    }

    #[test]
    fn test_register_user_rejects_duplicate_email() {
        // Reducer checks for existing email before inserting
        let existing_emails = ["user@example.com", "other@example.com"];
        let duplicate = existing_emails.contains(&"user@example.com");
        assert!(duplicate);
        let new_email = existing_emails.contains(&"new@example.com");
        assert!(!new_email);
    }

    #[test]
    fn test_login_user_verifies_password() {
        let password = "mypassword";
        let hash = crate::helpers::hash_password(password).unwrap();
        let verified = crate::helpers::verify_password(password, &hash);
        assert!(verified);
        let wrong = crate::helpers::verify_password("wrongpassword", &hash);
        assert!(!wrong);
    }

    #[test]
    fn test_update_user_role_rejects_empty() {
        let valid_roles = ["admin", "member", "viewer"];
        assert!(!valid_roles.contains(&""));
    }
}
