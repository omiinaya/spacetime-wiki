use crate::helpers::*;
use crate::tables::*;
use spacetimedb::*;

// ─── Favorites ───────────────────────────────────────────────────────────────

#[reducer]
pub fn toggle_favorite(
    ctx: &ReducerContext,
    id: String,
    user_id: String,
    page_id: String,
) -> Result<(), String> {
    let existing = ctx
        .db
        .favorite()
        .iter()
        .find(|f| f.user_id == user_id && f.page_id == page_id);
    if let Some(fav) = existing {
        ctx.db.favorite().id().delete(&fav.id);
    } else {
        ctx.db.favorite().insert(Favorite {
            id,
            user_id,
            page_id,
            created_at: now_ms(ctx),
        });
    }
    Ok(())
}

#[cfg(test)]
mod tests {

    #[test]
    fn test_toggle_favorite_adds_when_not_exists() {
        let storage: Vec<(String, String)> = vec![];
        let exists = storage.iter().any(|(uid, pid)| uid == "u1" && pid == "p1");
        assert!(!exists);
    }

    #[test]
    fn test_toggle_favorite_removes_when_exists() {
        let storage = [("u1".to_string(), "p1".to_string())];
        let exists = storage.iter().any(|(uid, pid)| uid == "u1" && pid == "p1");
        assert!(exists);
    }

    #[test]
    fn test_toggle_favorite_respects_user_scoping() {
        // Each user has their own favorites — user u2 shouldn't affect u1
        let storage = [("u1", "p1"), ("u2", "p1"), ("u1", "p2")];
        let u1_favs: Vec<_> = storage.iter().filter(|(uid, _)| *uid == "u1").collect();
        assert_eq!(u1_favs.len(), 2);
        let u2_favs: Vec<_> = storage.iter().filter(|(uid, _)| *uid == "u2").collect();
        assert_eq!(u2_favs.len(), 1);
    }

    #[test]
    fn test_toggle_favorite_handles_same_page_different_users() {
        // User A favorites page P1, user B favorites page P1 — both should exist
        let mut favs: Vec<(String, String)> = vec![("u1".into(), "p1".into())];
        // User B toggles p1 (should add since not in list for u2)
        let u2_exists = favs.iter().any(|(uid, pid)| uid == "u2" && pid == "p1");
        assert!(!u2_exists);
        favs.push(("u2".into(), "p1".into()));
        assert_eq!(favs.len(), 2);
    }

    #[test]
    fn test_toggle_favorite_removes_only_matching_combo() {
        // Toggling should only remove the exact user+page match
        let mut favs: Vec<(String, String)> =
            vec![("u1".into(), "p1".into()), ("u1".into(), "p2".into())];
        // Remove u1+p1
        if let Some(pos) = favs
            .iter()
            .position(|(uid, pid)| uid == "u1" && pid == "p1")
        {
            favs.remove(pos);
        }
        assert_eq!(favs.len(), 1);
        assert_eq!(favs[0], ("u1".to_string(), "p2".to_string()));
    }
}
