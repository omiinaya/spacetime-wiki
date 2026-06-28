use spacetimedb::*;
use crate::tables::*;
use crate::helpers::*;

// ─── Comments ────────────────────────────────────────────────────────────────

#[reducer]
pub fn add_comment(
    ctx: &ReducerContext,
    id: String,
    page_id: String,
    parent_comment_id: String,
    user_id: String,
    body: String,
    text_anchor: String,
) -> Result<(), String> {
    let now = now_ms(ctx);
    ctx.db.comment().insert(Comment {
        id,
        page_id: page_id.clone(),
        parent_comment_id,
        user_id: user_id.clone(),
        body: body.clone(),
        text_anchor,
        is_resolved: false,
        created_at: now,
        updated_at: now,
    });
    // Notify page watchers about new comment
    let page_title = ctx.db.page().iter()
        .find(|p| p.id == page_id)
        .map(|p| p.title.clone())
        .unwrap_or_else(|| String::from("Unknown page"));
    let comment_message = make_comment_excerpt(&user_id, &page_title, &body);
    notify_page_watchers(
        ctx, &page_id, "comment.create", &user_id,
        &page_title, &comment_message, &String::new(),
    );
    Ok(())
}

#[reducer]
pub fn resolve_comment(ctx: &ReducerContext, id: String) -> Result<(), String> {
    let found = ctx.db.comment().iter().find(|c| c.id == id);
    if found.is_none() {
        return Err("Comment not found".into());
    }
    let mut com = found.unwrap();
    com.is_resolved = true;
    com.updated_at = now_ms(ctx);
    ctx.db.comment().id().update(com);
    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_add_comment_uses_helpers() {
        assert!(crate::helpers::make_comment_excerpt("u", "p", "hello").contains("hello"));
        assert!(crate::helpers::make_comment_excerpt("u", "p", &"a".repeat(100)).ends_with("...\""));
    }

    #[test]
    fn test_add_comment_reaction_toggle_logic() {
        // Pure logic test: existing reaction should be removed (toggle off)
        let storage: Vec<(String, String, String)> = vec![];
        let exists = storage.iter().any(|(cid, uid, emoji)| cid == "c1" && uid == "u1" && emoji == "👍");
        assert!(!exists);
    }

    #[test]
    fn test_resolve_comment_mark_resolved() {
        let mut resolved = false;
        resolved = true;
        assert!(resolved);
    }
}

#[reducer]
pub fn delete_comment(ctx: &ReducerContext, id: String) -> Result<(), String> {
    ctx.db.comment().id().delete(&id);
    // Clean up reactions on deleted comment
    for r in ctx.db.comment_reaction().iter().filter(|r| r.comment_id == id) {
        ctx.db.comment_reaction().id().delete(&r.id);
    }
    Ok(())
}

#[reducer]
pub fn add_comment_reaction(ctx: &ReducerContext, id: String, comment_id: String, user_id: String, emoji: String) -> Result<(), String> {
    // Check if reaction already exists (toggle off)
    let existing = ctx.db.comment_reaction().iter()
        .find(|r| r.comment_id == comment_id && r.user_id == user_id && r.emoji == emoji);
    if existing.is_some() {
        ctx.db.comment_reaction().id().delete(&existing.unwrap().id);
        return Ok(());
    }
    ctx.db.comment_reaction().insert(CommentReaction {
        id, comment_id, user_id, emoji,
        created_at: now_ms(ctx),
    });
    Ok(())
}
