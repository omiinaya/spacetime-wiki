use spacetimedb::*;
use crate::tables::*;
use crate::helpers::*;

// ─── Groups ───────────────────────────────────────────────────────────────────

#[reducer]
pub fn create_group(
    ctx: &ReducerContext,
    id: String,
    name: String,
    description: String,
    created_by: String,
) -> Result<(), String> {
    let now = now_ms(ctx);
    ctx.db.group().insert(Group {
        id: id.clone(),
        name,
        description,
        created_by: created_by.clone(),
        created_at: now,
        updated_at: now,
    });
    // Creator becomes group admin
    ctx.db.group_member().insert(GroupMember {
        id: make_id("gm", ctx),
        group_id: id,
        user_id: created_by,
        role: "admin".into(),
        added_by: String::new(),
        created_at: now,
    });
    Ok(())
}

#[reducer]
pub fn update_group(
    ctx: &ReducerContext,
    id: String,
    name: String,
    description: String,
) -> Result<(), String> {
    let found = ctx.db.group().iter().find(|g| g.id == id);
    if found.is_none() {
        return Err("Group not found".into());
    }
    let mut group = found.unwrap();
    group.name = name;
    group.description = description;
    group.updated_at = now_ms(ctx);
    ctx.db.group().id().update(group);
    Ok(())
}

#[reducer]
pub fn delete_group(ctx: &ReducerContext, id: String) -> Result<(), String> {
    // Remove all members
    for member in ctx.db.group_member().iter().filter(|m| m.group_id == id) {
        ctx.db.group_member().id().delete(&member.id);
    }
    // Remove all collection permissions for this group
    for perm in ctx.db.collection_group_permission().iter().filter(|p| p.group_id == id) {
        ctx.db.collection_group_permission().id().delete(&perm.id);
    }
    ctx.db.group().id().delete(&id);
    Ok(())
}

#[reducer]
pub fn add_group_member(
    ctx: &ReducerContext,
    id: String,
    group_id: String,
    user_id: String,
    role: String,
    added_by: String,
) -> Result<(), String> {
    let user_exists = ctx.db.user().iter().any(|u| u.id == user_id);
    let already_member = ctx.db.group_member().iter()
        .any(|m| m.group_id == group_id && m.user_id == user_id);
    is_valid_group_member_add(user_exists, already_member)
        .map_err(|e| e.to_string())?;
    let role_clean = normalize_group_role(&role).to_string();
    ctx.db.group_member().insert(GroupMember {
        id, group_id, user_id, role: role_clean, added_by,
        created_at: now_ms(ctx),
    });
    Ok(())
}

#[reducer]
pub fn update_group_member_role(
    ctx: &ReducerContext,
    id: String,
    new_role: String,
) -> Result<(), String> {
    if !valid_group_role(&new_role) {
        return Err("Invalid role. Must be admin or member".into());
    }
    let found = ctx.db.group_member().iter().find(|m| m.id == id);
    if found.is_none() {
        return Err("Group member not found".into());
    }
    let mut member = found.unwrap();
    member.role = new_role;
    ctx.db.group_member().id().update(member);
    Ok(())
}

#[reducer]
pub fn remove_group_member(ctx: &ReducerContext, id: String) -> Result<(), String> {
    ctx.db.group_member().id().delete(&id);
    Ok(())
}

// ─── Collection Group Permissions ─────────────────────────────────────────────

#[reducer]
pub fn set_collection_group_permission(
    ctx: &ReducerContext,
    id: String,
    collection_id: String,
    group_id: String,
    role: String,
) -> Result<(), String> {
    let existing = ctx.db.collection_group_permission().iter()
        .find(|p| p.collection_id == collection_id && p.group_id == group_id);
    if let Some(perm) = existing {
        let mut p = perm;
        p.role = role;
        ctx.db.collection_group_permission().id().update(p);
        return Ok(());
    }
    let role_clean = normalize_collection_permission_role(&role).to_string();
    ctx.db.collection_group_permission().insert(CollectionGroupPermission {
        id, collection_id, group_id, role: role_clean,
        created_at: now_ms(ctx),
    });
    Ok(())
}

#[reducer]
pub fn remove_collection_group_permission(ctx: &ReducerContext, id: String) -> Result<(), String> {
    ctx.db.collection_group_permission().id().delete(&id);
    Ok(())
}

// ─── Page Permissions ─────────────────────────────────────────────────────────

#[reducer]
pub fn set_page_permission(
    ctx: &ReducerContext,
    id: String,
    page_id: String,
    user_id: String,
    group_id: String,
    role: String,
) -> Result<(), String> {
    let page_exists = ctx.db.page().iter().any(|p| p.id == page_id);
    if !page_exists {
        return Err("Page not found".into());
    }
    let role_clean = normalize_page_permission_role(&role).to_string();

    let existing = ctx.db.page_permission().iter().find(|p| {
    let existing = ctx.db.page_permission().iter().find(|p| {
        p.page_id == page_id &&
        (if !user_id.is_empty() { p.user_id == user_id } else { false }) &&
        (if !group_id.is_empty() { p.group_id == group_id } else { false })
    });

    if let Some(perm) = existing {
        let mut p = perm;
        p.role = role_clean.clone();
        ctx.db.page_permission().id().update(p);
        return Ok(());
    }

    ctx.db.page_permission().insert(PagePermission {
        id,
        page_id,
        user_id,
        group_id,
        role: role_clean,
        created_at: now_ms(ctx),
    });
    Ok(())
}

#[reducer]
pub fn remove_page_permission(ctx: &ReducerContext, id: String) -> Result<(), String> {
    ctx.db.page_permission().id().delete(&id);
    Ok(())
}

// ─── Permission helpers (testable without STDB runtime) ──────────────────────

pub fn valid_group_role(role: &str) -> bool {
    matches!(role, "admin" | "member")
}

pub fn valid_collection_permission_role(role: &str) -> bool {
    matches!(role, "admin" | "editor" | "viewer")
}

pub fn valid_page_permission_role(role: &str) -> bool {
    matches!(role, "admin" | "editor" | "viewer")
}

pub fn normalize_group_role(role: &str) -> &'static str {
    if valid_group_role(role) { role } else { "member" }
}

pub fn normalize_collection_permission_role(role: &str) -> &'static str {
    if valid_collection_permission_role(role) { role } else { "viewer" }
}

pub fn normalize_page_permission_role(role: &str) -> &'static str {
    if valid_page_permission_role(role) { role } else { "viewer" }
}

pub fn is_valid_group_member_add(user_exists: bool, already_member: bool) -> Result<(), &'static str> {
    if !user_exists {
        return Err("User not found");
    }
    if already_member {
        return Err("User is already a member of this group");
    }
    Ok(())
}

// ─── Tests ────────────────────────────────────────────────────────────────────

#[cfg(test)]
mod tests {
    use super::*;

    // ─── Role validation ────────────────────────────────────────────────────────

    #[test]
    fn test_valid_group_role_allows_admin_and_member() {
        assert!(valid_group_role("admin"));
        assert!(valid_group_role("member"));
    }

    #[test]
    fn test_valid_group_role_rejects_invalid_roles() {
        assert!(!valid_group_role("editor"));
        assert!(!valid_group_role("viewer"));
        assert!(!valid_group_role("superadmin"));
        assert!(!valid_group_role(""));
        assert!(!valid_group_role("owner"));
    }

    #[test]
    fn test_valid_collection_permission_role_allows_valid() {
        assert!(valid_collection_permission_role("admin"));
        assert!(valid_collection_permission_role("editor"));
        assert!(valid_collection_permission_role("viewer"));
    }

    #[test]
    fn test_valid_collection_permission_role_rejects_invalid() {
        assert!(!valid_collection_permission_role("member"));
        assert!(!valid_collection_permission_role("owner"));
        assert!(!valid_collection_permission_role(""));
        assert!(!valid_collection_permission_role("superadmin"));
    }

    #[test]
    fn test_valid_page_permission_role_allows_valid() {
        assert!(valid_page_permission_role("admin"));
        assert!(valid_page_permission_role("editor"));
        assert!(valid_page_permission_role("viewer"));
    }

    #[test]
    fn test_valid_page_permission_role_rejects_invalid() {
        assert!(!valid_page_permission_role("member"));
        assert!(!valid_page_permission_role("owner"));
        assert!(!valid_page_permission_role(""));
        assert!(!valid_page_permission_role("superadmin"));
    }

    // ─── Role normalization ─────────────────────────────────────────────────────

    #[test]
    fn test_normalize_group_role_passes_valid_roles() {
        assert_eq!(normalize_group_role("admin"), "admin");
        assert_eq!(normalize_group_role("member"), "member");
    }

    #[test]
    fn test_normalize_group_role_defaults_to_member() {
        assert_eq!(normalize_group_role(""), "member");
        assert_eq!(normalize_group_role("editor"), "member");
        assert_eq!(normalize_group_role("viewer"), "member");
        assert_eq!(normalize_group_role("owner"), "member");
    }

    #[test]
    fn test_normalize_collection_permission_role_passes_valid() {
        assert_eq!(normalize_collection_permission_role("admin"), "admin");
        assert_eq!(normalize_collection_permission_role("editor"), "editor");
        assert_eq!(normalize_collection_permission_role("viewer"), "viewer");
    }

    #[test]
    fn test_normalize_collection_permission_role_defaults_to_viewer() {
        assert_eq!(normalize_collection_permission_role(""), "viewer");
        assert_eq!(normalize_collection_permission_role("member"), "viewer");
        assert_eq!(normalize_collection_permission_role("owner"), "viewer");
    }

    #[test]
    fn test_normalize_page_permission_role_passes_valid() {
        assert_eq!(normalize_page_permission_role("admin"), "admin");
        assert_eq!(normalize_page_permission_role("editor"), "editor");
        assert_eq!(normalize_page_permission_role("viewer"), "viewer");
    }

    #[test]
    fn test_normalize_page_permission_role_defaults_to_viewer() {
        assert_eq!(normalize_page_permission_role(""), "viewer");
        assert_eq!(normalize_page_permission_role("member"), "viewer");
        assert_eq!(normalize_page_permission_role("owner"), "viewer");
    }

    // ─── Group member validation logic ──────────────────────────────────────────

    #[test]
    fn test_is_valid_group_member_add_accepts_valid() {
        assert!(is_valid_group_member_add(true, false).is_ok());
    }

    #[test]
    fn test_is_valid_group_member_add_rejects_nonexistent_user() {
        let result = is_valid_group_member_add(false, false);
        assert!(result.is_err());
        assert_eq!(result.unwrap_err(), "User not found");
    }

    #[test]
    fn test_is_valid_group_member_add_rejects_duplicate() {
        let result = is_valid_group_member_add(true, true);
        assert!(result.is_err());
        assert_eq!(result.unwrap_err(), "User is already a member of this group");
    }

    #[test]
    fn test_is_valid_group_member_add_rejects_missing_user_over_duplicate() {
        // Missing user check comes before duplicate check
        let result = is_valid_group_member_add(false, true);
        assert!(result.is_err());
        assert_eq!(result.unwrap_err(), "User not found");
    }

    // ─── Edge cases ─────────────────────────────────────────────────────────────

    #[test]
    fn test_normalize_group_role_case_sensitivity() {
        // Roles should be case-sensitive; uppercase is not valid
        assert_eq!(normalize_group_role("Admin"), "member");
        assert_eq!(normalize_group_role("ADMIN"), "member");
        assert_eq!(normalize_group_role("Member"), "member");
    }

    #[test]
    fn test_roles_are_distinct_sets() {
        // Admin is the only overlapping role across all three domains
        assert!(valid_group_role("admin"));
        assert!(valid_collection_permission_role("admin"));
        assert!(valid_page_permission_role("admin"));

        // Member is only valid for groups
        assert!(valid_group_role("member"));
        assert!(!valid_collection_permission_role("member"));
        assert!(!valid_page_permission_role("member"));

        // Editor and viewer are only valid for permissions (not groups)
        assert!(!valid_group_role("editor"));
        assert!(valid_collection_permission_role("editor"));
        assert!(valid_page_permission_role("editor"));
        assert!(!valid_group_role("viewer"));
        assert!(valid_collection_permission_role("viewer"));
        assert!(valid_page_permission_role("viewer"));
    }
}
