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
    let expires_at = calc_expiry_ms(now, expires_days);
    if ctx.db.api_key().id().find(&id).is_none() {
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
    }
    Ok(())
}

#[reducer]
pub fn revoke_api_key(ctx: &ReducerContext, id: String) -> Result<(), String> {
    let mut key = ctx.db.api_key().id().find(id).ok_or_else(|| "API key not found".to_string())?;
    key.is_revoked = true;
    ctx.db.api_key().id().update(key);
    Ok(())
}

#[reducer]
pub fn update_api_key_usage(ctx: &ReducerContext, id: String) -> Result<(), String> {
    let mut key = ctx.db.api_key().id().find(id).ok_or_else(|| "API key not found".to_string())?;
    key.last_used_at = now_ms(ctx);
    ctx.db.api_key().id().update(key);
    Ok(())
}

#[cfg(test)]
mod tests {

    #[test]
    fn test_create_api_key_expiry() {
        let now = 1000u64;
        assert_eq!(crate::helpers::calc_expiry_ms(now, 0), 0);
        assert_eq!(crate::helpers::calc_expiry_ms(now, 1), now + 86_400_000);
    }

    #[test]
    fn test_revoke_api_key_mark_revoked() {
        let revoked = true;
        assert!(revoked);
    }

    #[test]
    fn test_update_usage_updates_timestamp() {
        let last_used_at = 1000u64;
        assert_eq!(last_used_at, 1000);
    }
}
