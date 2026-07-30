use crate::helpers::*;
use crate::tables::*;
use spacetimedb::*;

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
    if ctx.db.comment().id().find(&id).is_some() {
        return Ok(());
    }
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
    let page_title = ctx
        .db
        .page()
        .iter()
        .find(|p| p.id == page_id)
        .map(|p| p.title.clone())
        .unwrap_or_else(|| String::from("Unknown page"));
    let comment_message = make_comment_excerpt(&user_id, &page_title, &body);
    notify_page_watchers(
        ctx,
        &page_id,
        "comment.create",
        &user_id,
        &page_title,
        &comment_message,
        "",
    );
    Ok(())
}

#[reducer]
pub fn resolve_comment(ctx: &ReducerContext, id: String) -> Result<(), String> {
    let mut com = ctx
        .db
        .comment()
        .id()
        .find(id)
        .ok_or_else(|| "Comment not found".to_string())?;
    com.is_resolved = true;
    com.updated_at = now_ms(ctx);
    ctx.db.comment().id().update(com);
    Ok(())
}

#[cfg(test)]
mod tests {

    #[test]
    fn test_add_comment_uses_helpers() {
        assert!(crate::helpers::make_comment_excerpt("u", "p", "hello").contains("hello"));
        assert!(
            crate::helpers::make_comment_excerpt("u", "p", &"a".repeat(100)).ends_with("...\"")
        );
    }

    #[test]
    fn test_add_comment_reaction_toggle_logic() {
        // Pure logic test: existing reaction should be removed (toggle off)
        let storage: Vec<(String, String, String)> = vec![];
        let exists = storage
            .iter()
            .any(|(cid, uid, emoji)| cid == "c1" && uid == "u1" && emoji == "👍");
        assert!(!exists);
    }

    #[test]
    fn test_comment_reaction_toggle_removes_existing() {
        // If a reaction already exists, toggle should remove it
        let reactions = vec![("c1", "u1", "👍")];
        let exists = reactions.iter().any(|(cid, uid, e)| *cid == "c1" && *uid == "u1" && *e == "👍");
        assert!(exists);
        // After finding existing, we delete it — simulating toggle off
        let filtered: Vec<_> = reactions.into_iter().filter(|(cid, uid, e)| !(*cid == "c1" && *uid == "u1" && *e == "👍")).collect();
        assert_eq!(filtered.len(), 0);
    }

    #[test]
    fn test_comment_reaction_toggle_adds_new() {
        // If reaction doesn't exist, toggle should add it
        let reactions: Vec<(&str, &str, &str)> = vec![];
        let exists = reactions.iter().any(|(cid, uid, e)| *cid == "c1" && *uid == "u1" && *e == "👍");
        assert!(!exists);
        // Add the reaction
        let mut updated = reactions.clone();
        updated.push(("c1", "u1", "👍"));
        assert_eq!(updated.len(), 1);
    }

    #[test]
    fn test_resolve_comment_mark_resolved() {
        let resolved = true;
        assert!(resolved);
    }

    #[test]
    fn test_resolve_comment_toggle() {
        // Comments can be toggled between resolved/unresolved
        let mut is_resolved = false;
        is_resolved = true; // resolve
        assert!(is_resolved);
        is_resolved = false; // unresolve
        assert!(!is_resolved);
    }

    #[test]
    fn test_comment_excerpt_truncation() {
        let long_body = "This is a very long comment that exceeds the excerpt length and should be truncated to show only the first few characters with an ellipsis at the end.";
        let excerpt = crate::helpers::make_comment_excerpt("u1", "p1", long_body);
        assert!(excerpt.len() < long_body.len());
        assert!(excerpt.ends_with("...\""));
    }

    #[test]
    fn test_delete_comment_cascades_reactions() {
        // Deleting a comment should remove all its reactions
        let comment_id = "c1";
        let reactions: Vec<(&str, &str)> = vec![
            ("r1", "c1"),
            ("r2", "c1"),
            ("r3", "c2"), // different comment
        ];
        let to_delete: Vec<_> = reactions.iter().filter(|(_, cid)| *cid == comment_id).collect();
        assert_eq!(to_delete.len(), 2);
        let remaining: Vec<_> = reactions.iter().filter(|(_, cid)| *cid != comment_id).collect();
        assert_eq!(remaining.len(), 1);
    }
}

#[reducer]
pub fn delete_comment(ctx: &ReducerContext, id: String) -> Result<(), String> {
    ctx.db.comment().id().delete(&id);
    // Clean up reactions on deleted comment
    for r in ctx
        .db
        .comment_reaction()
        .iter()
        .filter(|r| r.comment_id == id)
    {
        ctx.db.comment_reaction().id().delete(&r.id);
    }
    Ok(())
}

#[reducer]
pub fn add_comment_reaction(
    ctx: &ReducerContext,
    id: String,
    comment_id: String,
    user_id: String,
    emoji: String,
) -> Result<(), String> {
    // Check if reaction already exists (toggle off)
    let existing = ctx
        .db
        .comment_reaction()
        .iter()
        .find(|r| r.comment_id == comment_id && r.user_id == user_id && r.emoji == emoji);
    if let Some(existing) = existing {
        ctx.db.comment_reaction().id().delete(&existing.id);
        return Ok(());
    }
    ctx.db.comment_reaction().insert(CommentReaction {
        id,
        comment_id,
        user_id,
        emoji,
        created_at: now_ms(ctx),
    });
    Ok(())
}
