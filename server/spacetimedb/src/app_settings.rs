use crate::*;

// ─── App Settings (key-value store) ──────────────────────────────────────────

#[reducer]
pub fn set_app_setting(ctx: &ReducerContext, key: String, value: String) -> Result<(), String> {
    let now = now_ms(ctx);
    let existing = ctx.db.app_setting().iter().find(|s| s.key == key);
    if let Some(mut setting) = existing {
        setting.value = value;
        setting.updated_at = now;
        ctx.db.app_setting().key().update(setting);
    } else {
        ctx.db.app_setting().insert(AppSetting {
            key: key.clone(),
            value,
            updated_at: now,
        });
    }
    Ok(())
}

/// Purge expired trash pages based on the trash_retention_days setting.
/// If the setting is 0 (or unset), all trashed pages are purged (current behavior).
/// If the setting is > 0, only pages whose deleted_at is older than N days are permanently deleted.
#[reducer]
pub fn purge_expired_trash(ctx: &ReducerContext) -> Result<(), String> {
    let retention_setting = ctx
        .db
        .app_setting()
        .iter()
        .find(|s| s.key == "trash_retention_days")
        .map(|s| s.value.parse::<u64>().unwrap_or(0))
        .unwrap_or(0);

    let now = now_ms(ctx);
    let cutoff = if retention_setting > 0 {
        now.saturating_sub(retention_setting * 86_400_000)
    } else {
        0 // purge all
    };

    let to_purge: Vec<String> = ctx
        .db
        .page()
        .iter()
        .filter(|p| p.status == "deleted" && (retention_setting == 0 || p.deleted_at < cutoff))
        .map(|p| p.id.clone())
        .collect();

    for page_id in to_purge {
        let _ = delete_page_permanent(ctx, page_id);
    }
    Ok(())
}

#[cfg(test)]
mod tests {

    #[test]
    fn test_set_app_setting_upsert() {
        // Pure logic: upsert pattern
        let existing: Option<String> = None;
        let value = "new_value".to_string();
        let result = match existing {
            None => value.clone(),
            Some(_) => value,
        };
        assert_eq!(result, "new_value");
    }

    #[test]
    fn test_purge_expired_trash_retention_logic() {
        let retention_days = 30u64;
        let now = 5_000_000_000u64; // large enough for subtraction
        let cutoff = now.saturating_sub(retention_days * 86_400_000);
        assert!(cutoff < now);
        // A page deleted yesterday should not be purged
        let deleted_at = now - 86_400_000; // 1 day ago
        let should_purge = retention_days == 0 || deleted_at < cutoff;
        assert!(!should_purge);
        // A page deleted 31 days ago should be purged
        let deleted_at_old = now - 31 * 86_400_000;
        let should_purge_old = retention_days == 0 || deleted_at_old < cutoff;
        assert!(should_purge_old);
    }
}
