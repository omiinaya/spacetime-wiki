use spacetimedb::*;
use crate::tables::*;
use crate::helpers::*;

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
    if update_data.is_empty() {
        return Err("Update data cannot be empty".into());
    }
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
    let session_id = format!("{}:{}", user_id, page_id);
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
    let session_id = format!("{}:{}", user_id, page_id);
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
    let session_id = format!("{}:{}", user_id, page_id);
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
    let cutoff = now_ms(ctx).saturating_sub(300_000); // 5 minutes
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
    let cutoff = now_ms(ctx).saturating_sub(3_600_000); // 1 hour
    let stale: Vec<String> = ctx.db.collab_update().iter()
        .filter(|u| u.created_at < cutoff)
        .map(|u| u.id.clone())
        .collect();
    for id in stale {
        ctx.db.collab_update().id().delete(&id);
    }
    Ok(())
}
