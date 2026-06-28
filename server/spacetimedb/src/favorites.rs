use spacetimedb::*;
use crate::tables::*;
use crate::helpers::*;

// ─── Favorites ───────────────────────────────────────────────────────────────

#[reducer]
pub fn toggle_favorite(
    ctx: &ReducerContext,
    id: String,
    user_id: String,
    page_id: String,
) -> Result<(), String> {
    let existing = ctx.db.favorite().iter()
        .find(|f| f.user_id == user_id && f.page_id == page_id);
    if let Some(fav) = existing {
        ctx.db.favorite().id().delete(&fav.id);
    } else {
        ctx.db.favorite().insert(Favorite {
            id, user_id, page_id, created_at: now_ms(ctx),
        });
    }
    Ok(())
}
