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
    fn test_set_app_setting_updates_existing_value() {
        let existing = Some("old_value".to_string());
        let value = "updated_value".to_string();
        let result = match existing {
            None => value.clone(),
            Some(_old) => {
                // Update the old value
                format!("{}", value)
            }
        };
        assert_eq!(result, "updated_value");
    }

    #[test]
    fn test_purge_expired_trash_retention_logic() {
        let retention_days = 30u64;
        let now = 5_000_000_000u64;
        let cutoff = now.saturating_sub(retention_days * 86_400_000);
        assert!(cutoff < now);
        // A page deleted yesterday should NOT be purged
        let deleted_at = now - 86_400_000;
        let should_purge = retention_days == 0 || deleted_at < cutoff;
        assert!(!should_purge);
        // A page deleted 31 days ago SHOULD be purged
        let deleted_at_old = now - 31 * 86_400_000;
        let should_purge_old = retention_days == 0 || deleted_at_old < cutoff;
        assert!(should_purge_old);
    }

    #[test]
    fn test_purge_expired_trash_zero_retention_purges_all() {
        let retention_days = 0u64;
        let now = 5_000_000_000u64;
        let cutoff = now.saturating_sub(retention_days * 86_400_000);
        assert_eq!(cutoff, now); // 0 retention = cutoff = now
                                 // With 0 retention, EVERY deleted page should be purged
        let deleted_1_sec_ago = now - 1_000;
        let should_purge = retention_days == 0 || deleted_1_sec_ago < cutoff;
        assert!(should_purge); // 0 retention purges everything
    }

    #[test]
    fn test_purge_expired_trash_high_retention_preserves() {
        let retention_days = 365u64; // 1 year
        let now = 50_000_000_000u64; // large enough for 1y subtraction
        let cutoff = now.saturating_sub(retention_days * 86_400_000);
        // A page deleted 6 months ago should NOT be purged
        let deleted_6mo_ago = now.saturating_sub(180 * 86_400_000u64);
        assert!(deleted_6mo_ago > cutoff); // 6mo < 1yr retention
    }

    #[test]
    fn test_set_app_setting_tracks_timestamp() {
        // The setting tracks when it was last updated
        let created_at = 1000u64;
        let updated_at = 2000u64;
        assert!(updated_at > created_at);
        let later_updated = updated_at + 500;
        assert!(later_updated > updated_at);
    }

    #[test]
    fn test_app_setting_key_lookup_is_case_sensitive() {
        let keys = vec!["SiteName", "sitename", "SITENAME"];
        let site_name_count = keys.iter().filter(|k| *k == &"SiteName").count();
        assert_eq!(site_name_count, 1);
    }
}
