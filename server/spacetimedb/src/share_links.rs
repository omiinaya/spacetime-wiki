use spacetimedb::*;
use crate::tables::*;
use crate::helpers::*;

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
    let expires_at = if expires_days > 0 {
        now + (expires_days as u64) * 86_400_000
    } else {
        0 // never expires
    };
    let password_hash = if password.is_empty() {
        String::new()
    } else {
        hash_password(&password)
    };
    ctx.db.share_link().insert(ShareLink {
        id, page_id, token, password_hash, created_by,
        expires_at, created_at: now, visit_count: 0,
        brand_title: None,
        brand_logo_url: None,
    });
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
    let found = ctx.db.share_link().id().find(&share_id);
    if found.is_none() {
        return Err("Share link not found".into());
    }
    let mut share = found.unwrap();
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
    let found = ctx.db.share_link().iter()
        .find(|s| s.token == token);
    if found.is_none() {
        return Err("Invalid share link".into());
    }
    let share = found.unwrap();
    let now = now_ms(ctx);
    if share.expires_at > 0 && now > share.expires_at {
        return Err("Share link has expired".into());
    }
    if !share.password_hash.is_empty() {
        if hash_password(&password) != share.password_hash {
            return Err("Incorrect password".into());
        }
    }
    // Increment visit count
    let mut share_mut = share;
    share_mut.visit_count += 1;
    ctx.db.share_link().id().update(share_mut);
    Ok(())
}

#[reducer]
pub fn visit_share_link(ctx: &ReducerContext, token: String) -> Result<(), String> {
    let found = ctx.db.share_link().iter()
        .find(|s| s.token == token);
    if found.is_none() {
        return Err("Invalid share link".into());
    }
    let share = found.unwrap();
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
