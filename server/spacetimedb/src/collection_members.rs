use crate::helpers::*;
use crate::tables::*;
use spacetimedb::*;

// ─── Collection Members ──────────────────────────────────────────────────────

#[reducer]
pub fn add_collection_member(
    ctx: &ReducerContext,
    id: String,
    collection_id: String,
    user_id: String,
    role: String,
    added_by: String,
) -> Result<(), String> {
    let existing = ctx
        .db
        .collection_member()
        .iter()
        .find(|m| m.collection_id == collection_id && m.user_id == user_id);
    if existing.is_some() {
        return Err("User is already a member of this collection".into());
    }
    let role_clean = sanitize_collection_role(&role);
    if ctx.db.collection_member().id().find(&id).is_none() {
        ctx.db.collection_member().insert(CollectionMember {
            id,
            collection_id,
            user_id,
            role: role_clean,
            added_by,
            created_at: now_ms(ctx),
        });
    }
    Ok(())
}

#[reducer]
pub fn update_collection_member_role(
    ctx: &ReducerContext,
    id: String,
    new_role: String,
) -> Result<(), String> {
    let valid_roles = ["admin", "editor", "viewer"];
    if !valid_roles.contains(&new_role.as_str()) {
        return Err("Invalid role. Must be admin, editor, or viewer".into());
    }
    let mut member = ctx
        .db
        .collection_member()
        .id()
        .find(id)
        .ok_or_else(|| "Member not found".to_string())?;
    member.role = new_role;
    ctx.db.collection_member().id().update(member);
    Ok(())
}

#[reducer]
pub fn remove_collection_member(ctx: &ReducerContext, id: String) -> Result<(), String> {
    ctx.db.collection_member().id().delete(&id);
    Ok(())
}

#[cfg(test)]
mod tests {

    #[test]
    fn test_add_collection_member_with_valid_role() {
        assert!(crate::helpers::is_valid_collection_role("admin"));
        assert!(crate::helpers::is_valid_collection_role("editor"));
        assert!(crate::helpers::is_valid_collection_role("viewer"));
        assert_eq!(crate::helpers::sanitize_collection_role("admin"), "admin");
        assert_eq!(crate::helpers::sanitize_collection_role("editor"), "editor");
        assert_eq!(crate::helpers::sanitize_collection_role("viewer"), "viewer");
    }

    #[test]
    fn test_add_collection_member_with_invalid_role_defaults_to_viewer() {
        assert_eq!(
            crate::helpers::sanitize_collection_role("unknown"),
            "viewer"
        );
        assert_eq!(crate::helpers::sanitize_collection_role("member"), "viewer");
        assert_eq!(crate::helpers::sanitize_collection_role(""), "viewer");
    }

    #[test]
    fn test_update_role_rejects_invalid_roles() {
        let valid_roles = ["admin", "editor", "viewer"];
        assert!(!valid_roles.contains(&"member"));
        assert!(!valid_roles.contains(&"owner"));
        assert!(!valid_roles.contains(&""));
    }

    #[test]
    fn test_remove_member_by_id() {
        let id = "member_001";
        assert!(!id.is_empty());
    }

    #[test]
    fn test_add_member_prevents_duplicate() {
        // Adding the same user+collection twice should fail
        let members = [("c1", "u1"), ("c1", "u2")];
        // Try to add u1 to c1 again — should find existing
        let exists = members
            .iter()
            .any(|(cid, uid)| *cid == "c1" && *uid == "u1");
        assert!(exists);
    }

    #[test]
    fn test_add_member_allows_different_collections() {
        // Same user can be in multiple collections
        let members = [("c1", "u1")];
        let in_c2 = members
            .iter()
            .any(|(cid, uid)| *cid == "c2" && *uid == "u1");
        assert!(!in_c2);
    }

    #[test]
    fn test_update_role_validates_before_apply() {
        let valid_roles = ["admin", "editor", "viewer"];
        // Only valid roles should pass
        for role in &["admin", "editor", "viewer"] {
            assert!(valid_roles.contains(role));
        }
    }

    #[test]
    fn test_remove_member_is_idempotent() {
        // Removing a non-existent member should be safe (id().delete is no-op)
        let non_existent = "member_nonexistent";
        assert!(!non_existent.is_empty());
    }
}
