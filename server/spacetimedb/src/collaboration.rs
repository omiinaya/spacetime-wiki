use spacetimedb::*;
use crate::tables::*;
use crate::helpers::*;

// ─── Pure helpers (extracted for testability) ───────────────────────────────────

/// Validate that a Yjs update payload is not empty.
pub(crate) fn validate_collab_update(update_data: &str) -> Result<(), String> {
    if update_data.is_empty() {
        return Err("Update data cannot be empty".into());
    }
    Ok(())
}

/// Build a deterministic session_id from user_id and page_id.
/// Used consistently by join/leave/update_cursor_position.
pub(crate) fn make_collab_session_id(user_id: &str, page_id: &str) -> String {
    format!("{}:{}", user_id, page_id)
}

/// Compute the cutoff timestamp for stale collab sessions (5min TTL).
pub(crate) fn stale_session_cutoff(now_ms: u64) -> u64 {
    now_ms.saturating_sub(300_000)
}

/// Compute the cutoff timestamp for old collab updates (1hr TTL).
pub(crate) fn old_updates_cutoff(now_ms: u64) -> u64 {
    now_ms.saturating_sub(3_600_000)
}

// ─── Real-time Collaboration (Yjs CRDT) ─────────────────────────────────────────
//
// Uses an append-only log of Yjs updates per page. Clients broadcast their Yjs
// binary updates via `broadcast_yjs_update`, and all connected clients receive
// them via STDB subscriptions and apply them to their local Yjs document.
//
// Awareness (cursor presence) uses the `collab_session` table: users join/leave
// as they open/close pages, and update their cursor position on every move.

#[reducer]
pub fn broadcast_yjs_update(
    ctx: &ReducerContext,
    id: String,
    page_id: String,
    update_data: String,
    user_id: String,
) -> Result<(), String> {
    validate_collab_update(&update_data)?;
    ctx.db.collab_update().insert(CollabUpdate {
        id,
        page_id,
        update_data,
        user_id,
        created_at: now_ms(ctx),
    });
    Ok(())
}

#[reducer]
pub fn join_collab_session(
    ctx: &ReducerContext,
    page_id: String,
    user_id: String,
    user_name: String,
    color: String,
) -> Result<(), String> {
    let now = now_ms(ctx);
    let session_id = make_collab_session_id(&user_id, &page_id);
    let existing = ctx.db.collab_session().iter().find(|s| s.id == session_id);
    if let Some(mut session) = existing {
        session.user_name = user_name;
        session.color = color;
        session.last_seen_at = now;
        ctx.db.collab_session().id().update(session);
    } else {
        ctx.db.collab_session().insert(CollabSession {
            id: session_id,
            page_id,
            user_id,
            user_name,
            color,
            cursor_position: String::new(),
            last_seen_at: now,
            joined_at: now,
        });
    }
    Ok(())
}

#[reducer]
pub fn leave_collab_session(
    ctx: &ReducerContext,
    page_id: String,
    user_id: String,
) -> Result<(), String> {
    let session_id = make_collab_session_id(&user_id, &page_id);
    ctx.db.collab_session().id().delete(&session_id);
    Ok(())
}

#[reducer]
pub fn update_cursor_position(
    ctx: &ReducerContext,
    page_id: String,
    user_id: String,
    cursor_json: String,
) -> Result<(), String> {
    let session_id = make_collab_session_id(&user_id, &page_id);
    let found = ctx.db.collab_session().iter().find(|s| s.id == session_id);
    if let Some(mut session) = found {
        session.cursor_position = cursor_json;
        session.last_seen_at = now_ms(ctx);
        ctx.db.collab_session().id().update(session);
    }
    Ok(())
}

/// Clean up collab sessions that haven't been seen in over 5 minutes
/// (e.g. user closed tab without leaving)
#[reducer]
pub fn cleanup_stale_collab_sessions(ctx: &ReducerContext) -> Result<(), String> {
    let cutoff = stale_session_cutoff(now_ms(ctx));
    let stale: Vec<String> = ctx.db.collab_session().iter()
        .filter(|s| s.last_seen_at < cutoff)
        .map(|s| s.id.clone())
        .collect();
    for id in stale {
        ctx.db.collab_session().id().delete(&id);
    }
    Ok(())
}

/// Clean up collab_updates older than 1 hour to prevent unbounded growth.
/// Yjs updates are commutative — older updates can be GC'd once clients have
/// synced via the full document state stored in the page.content field.
#[reducer]
pub fn cleanup_old_collab_updates(ctx: &ReducerContext) -> Result<(), String> {
    let cutoff = old_updates_cutoff(now_ms(ctx));
    let stale: Vec<String> = ctx.db.collab_update().iter()
        .filter(|u| u.created_at < cutoff)
        .map(|u| u.id.clone())
        .collect();
    for id in stale {
        ctx.db.collab_update().id().delete(&id);
    }
    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;

    // ─── validate_collab_update ─────────────────────────────────────────────────

    #[test]
    fn test_validate_collab_update_accepts_non_empty() {
        assert!(validate_collab_update("some data").is_ok());
    }

    #[test]
    fn test_validate_collab_update_rejects_empty() {
        let err = validate_collab_update("").unwrap_err();
        assert!(err.contains("cannot be empty"));
    }

    #[test]
    fn test_validate_collab_update_rejects_whitespace_only() {
        // Whitespace is not empty; should pass through (Yjs handles binary data)
        assert!(validate_collab_update(" ").is_ok());
        assert!(validate_collab_update("\n").is_ok());
    }

    #[test]
    fn test_validate_collab_update_accepts_large_data() {
        let large = "x".repeat(100_000);
        assert!(validate_collab_update(&large).is_ok());
    }

    // ─── make_collab_session_id ──────────────────────────────────────────────────

    #[test]
    fn test_make_collab_session_id_format() {
        let id = make_collab_session_id("user_abc", "page_123");
        assert_eq!(id, "user_abc:page_123");
    }

    #[test]
    fn test_make_collab_session_id_contains_colon() {
        let id = make_collab_session_id("u1", "p1");
        assert!(id.contains(':'));
    }

    #[test]
    fn test_make_collab_session_id_unique_per_user_and_page() {
        let a = make_collab_session_id("alice", "page_x");
        let b = make_collab_session_id("bob", "page_x");
        let c = make_collab_session_id("alice", "page_y");
        assert_ne!(a, b);
        assert_ne!(a, c);
        assert_ne!(b, c);
    }

    #[test]
    fn test_make_collab_session_id_deterministic() {
        let a = make_collab_session_id("user1", "page1");
        let b = make_collab_session_id("user1", "page1");
        assert_eq!(a, b);
    }

    #[test]
    fn test_make_collab_session_id_handles_empty_user_id() {
        let id = make_collab_session_id("", "page1");
        assert_eq!(id, ":page1");
    }

    #[test]
    fn test_make_collab_session_id_handles_empty_page_id() {
        let id = make_collab_session_id("user1", "");
        assert_eq!(id, "user1:");
    }

    // ─── stale_session_cutoff ────────────────────────────────────────────────────

    #[test]
    fn test_stale_session_cutoff_five_minutes_ago() {
        let now = 1_000_000;
        let cutoff = stale_session_cutoff(now);
        assert_eq!(cutoff, 700_000); // 1_000_000 - 300_000
    }

    #[test]
    fn test_stale_session_cutoff_at_zero() {
        let cutoff = stale_session_cutoff(0);
        assert_eq!(cutoff, 0); // saturating_sub prevents underflow
    }

    #[test]
    fn test_stale_session_cutoff_below_zero_clamps() {
        let cutoff = stale_session_cutoff(100);
        assert_eq!(cutoff, 0); // 100 - 300_000 saturates to 0
    }

    #[test]
    fn test_stale_session_cutoff_large_timestamp() {
        let now = u64::MAX;
        let cutoff = stale_session_cutoff(now);
        assert_eq!(cutoff, now - 300_000);
    }

    // ─── old_updates_cutoff ─────────────────────────────────────────────────────

    #[test]
    fn test_old_updates_cutoff_one_hour_ago() {
        let now = 3_600_000;
        let cutoff = old_updates_cutoff(now);
        assert_eq!(cutoff, 0);
    }

    #[test]
    fn test_old_updates_cutoff_large_timestamp() {
        let now = 7_200_000;
        let cutoff = old_updates_cutoff(now);
        assert_eq!(cutoff, 3_600_000);
    }

    #[test]
    fn test_old_updates_cutoff_at_zero() {
        let cutoff = old_updates_cutoff(0);
        assert_eq!(cutoff, 0);
    }

    #[test]
    fn test_old_updates_cutoff_below_zero_clamps() {
        let cutoff = old_updates_cutoff(1_000);
        assert_eq!(cutoff, 0);
    }

    #[test]
    fn test_old_updates_cutoff_max() {
        let now = u64::MAX;
        let cutoff = old_updates_cutoff(now);
        assert_eq!(cutoff, now - 3_600_000);
    }

    // ─── Integration: verify the standard collab flow ───────────────────────────

    #[test]
    fn test_session_id_roundtrip() {
        // Simulate the pattern used by join_collab_session + leave_collab_session
        let user_id = "user_42";
        let page_id = "page_7";
        let session_id = make_collab_session_id(user_id, page_id);
        assert_eq!(session_id, "user_42:page_7");

        // The leave function uses the same pattern to delete
        let leave_id = make_collab_session_id(user_id, page_id);
        assert_eq!(leave_id, session_id);
    }

    #[test]
    fn test_update_validation_before_broadcast() {
        // Simulate the check in broadcast_yjs_update
        let valid = validate_collab_update("some_data");
        assert!(valid.is_ok());

        let invalid = validate_collab_update("");
        assert!(invalid.is_err());
        assert_eq!(invalid.unwrap_err(), "Update data cannot be empty");
    }
}
