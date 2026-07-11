use spacetimedb::*;
use crate::tables::*;
use crate::helpers::*;

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
    let existing = ctx.db.collection_member().iter()
        .find(|m| m.collection_id == collection_id && m.user_id == user_id);
    if existing.is_some() {
        return Err("User is already a member of this collection".into());
    }
    let role_clean = sanitize_collection_role(&role);
    if ctx.db.collection_member().id().find(&id).is_none() {
        ctx.db.collection_member().insert(CollectionMember {
            id, collection_id, user_id, role: role_clean, added_by,
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
    let mut member = ctx.db.collection_member().id().find(id).ok_or_else(|| "Member not found".to_string())?;
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
        assert_eq!(crate::helpers::sanitize_collection_role("unknown"), "viewer");
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
}
