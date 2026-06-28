use spacetimedb::*;
use crate::tables::*;
use crate::helpers::*;

// ─── API Keys ────────────────────────────────────────────────────────────────

#[reducer]
pub fn create_api_key(
    ctx: &ReducerContext,
    id: String,
    user_id: String,
    name: String,
    key_hash: String,
    key_prefix: String,
    expires_days: u32,
) -> Result<(), String> {
    let now = now_ms(ctx);
    let expires_at = if expires_days > 0 {
        now + (expires_days as u64) * 86_400_000
    } else {
        0
    };
    ctx.db.api_key().insert(ApiKey {
        id,
        user_id,
        name,
        key_hash,
        key_prefix,
        last_used_at: 0,
        created_at: now,
        expires_at,
        is_revoked: false,
    });
    Ok(())
}

#[reducer]
pub fn revoke_api_key(ctx: &ReducerContext, id: String) -> Result<(), String> {
    let found = ctx.db.api_key().iter().find(|k| k.id == id);
    if found.is_none() {
        return Err("API key not found".into());
    }
    let mut key = found.unwrap();
    key.is_revoked = true;
    ctx.db.api_key().id().update(key);
    Ok(())
}

#[reducer]
pub fn update_api_key_usage(ctx: &ReducerContext, id: String) -> Result<(), String> {
    let found = ctx.db.api_key().iter().find(|k| k.id == id);
    if found.is_none() {
        return Err("API key not found".into());
    }
    let mut key = found.unwrap();
    key.last_used_at = now_ms(ctx);
    ctx.db.api_key().id().update(key);
    Ok(())
}
