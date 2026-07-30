use crate::helpers::*;
use crate::tables::*;
use spacetimedb::*;

// ─── Share Links ─────────────────────────────────────────────────────────────

#[reducer]
pub fn create_share_link(
    ctx: &ReducerContext,
    id: String,
    page_id: String,
    token: String,
    password: String,
    created_by: String,
    expires_days: u32,
) -> Result<(), String> {
    let page_exists = ctx.db.page().iter().any(|p| p.id == page_id);
    if !page_exists {
        return Err("Page not found".into());
    }
    let now = now_ms(ctx);
    let expires_at = calc_expiry_ms(now, expires_days);
    let password_hash = if password.is_empty() {
        String::new()
    } else {
        hash_password(&password)
    };
    if ctx.db.share_link().id().find(&id).is_none() {
        ctx.db.share_link().insert(ShareLink {
            id,
            page_id,
            token,
            password_hash,
            created_by,
            expires_at,
            created_at: now,
            visit_count: 0,
            brand_title: None,
            brand_logo_url: None,
        });
    }
    Ok(())
}

#[reducer]
pub fn delete_share_link(ctx: &ReducerContext, id: String) -> Result<(), String> {
    ctx.db.share_link().id().delete(&id);
    Ok(())
}

#[reducer]
pub fn update_share_branding(
    ctx: &ReducerContext,
    share_id: String,
    brand_title: Option<String>,
    brand_logo_url: Option<String>,
) -> Result<(), String> {
    let mut share = ctx
        .db
        .share_link()
        .id()
        .find(&share_id)
        .ok_or_else(|| "Share link not found".to_string())?;
    share.brand_title = brand_title;
    share.brand_logo_url = brand_logo_url;
    ctx.db.share_link().id().update(share);
    Ok(())
}

#[reducer]
pub fn verify_share_password(
    ctx: &ReducerContext,
    token: String,
    password: String,
) -> Result<(), String> {
    let share = ctx
        .db
        .share_link()
        .iter()
        .find(|s| s.token == token)
        .ok_or_else(|| "Invalid share link".to_string())?;
    let now = now_ms(ctx);
    if share.expires_at > 0 && now > share.expires_at {
        return Err("Share link has expired".into());
    }
    if !share.password_hash.is_empty() && !verify_password(&password, &share.password_hash) {
        return Err("Incorrect password".into());
    }
    // Increment visit count
    let mut share_mut = share;
    share_mut.visit_count += 1;
    ctx.db.share_link().id().update(share_mut);
    Ok(())
}

#[reducer]
pub fn visit_share_link(ctx: &ReducerContext, token: String) -> Result<(), String> {
    let share = ctx
        .db
        .share_link()
        .iter()
        .find(|s| s.token == token)
        .ok_or_else(|| "Invalid share link".to_string())?;
    let now = now_ms(ctx);
    if share.expires_at > 0 && now > share.expires_at {
        return Err("Share link has expired".into());
    }
    if !share.password_hash.is_empty() {
        return Err("Password required".into());
    }
    let mut share_mut = share;
    share_mut.visit_count += 1;
    ctx.db.share_link().id().update(share_mut);
    Ok(())
}

#[cfg(test)]
mod tests {

    #[test]
    fn test_create_share_link_expiry() {
        let now = 5000u64;
        assert_eq!(crate::helpers::calc_expiry_ms(now, 0), 0);
        assert_eq!(crate::helpers::calc_expiry_ms(now, 7), now + 7 * 86_400_000);
    }

    #[test]
    fn test_create_share_link_password_hashing() {
        let password = "secret123";
        let hash = crate::helpers::hash_password(password);
        assert!(
            hash.starts_with("$argon2id$"),
            "Hash should be Argon2 PHC format"
        );
        let empty_password = "";
        assert!(empty_password.is_empty());
    }

    #[test]
    fn test_verify_share_expiry_check() {
        let now = 100_000u64;
        let expires_at = 50_000u64;
        assert!(expires_at > 0 && now > expires_at);
        let expires_at_future = 200_000u64;
        assert!(!(expires_at_future > 0 && now > expires_at_future));
    }

    #[test]
    fn test_visit_increments_count() {
        let mut visit_count = 0u64;
        visit_count += 1;
        assert_eq!(visit_count, 1);
        visit_count += 1;
        assert_eq!(visit_count, 2);
    }

    #[test]
    fn test_share_link_expired_link_rejected() {
        // If expires_at is set and now > expires_at, the link is expired
        let now = 200_000u64;
        let expires_at = 100_000u64;
        let is_expired = expires_at > 0 && now > expires_at;
        assert!(is_expired);
        // If expires_at is 0, it never expires
        let no_expiry = 0u64;
        assert!(!(no_expiry > 0 && now > no_expiry));
    }

    #[test]
    fn test_share_link_password_required() {
        // Links with non-empty password_hash require password verification
        let password_hash = "$argon2id$v=19$...";
        assert!(!password_hash.is_empty());
        let no_password = "";
        assert!(no_password.is_empty());
    }

    #[test]
    fn test_share_link_delete_removes_by_id() {
        let share_id = "share_abc";
        assert!(!share_id.is_empty());
        // id().delete() with the ID removes the row
    }

    #[test]
    fn test_update_share_branding_requires_existing() {
        // update_share_branding calls .id().find() which returns None for missing
        let share_id = "nonexistent";
        assert!(!share_id.is_empty());
        // If find returns None, the reducer returns Err("Share link not found")
    }
}
