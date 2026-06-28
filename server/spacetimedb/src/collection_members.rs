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
    let valid_roles = ["admin", "editor", "viewer"];
    let role_clean = if valid_roles.contains(&role.as_str()) { role } else { "viewer".into() };
    ctx.db.collection_member().insert(CollectionMember {
        id, collection_id, user_id, role: role_clean, added_by,
        created_at: now_ms(ctx),
    });
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
    let found = ctx.db.collection_member().iter().find(|m| m.id == id);
    if found.is_none() {
        return Err("Member not found".into());
    }
    let mut member = found.unwrap();
    member.role = new_role;
    ctx.db.collection_member().id().update(member);
    Ok(())
}

#[reducer]
pub fn remove_collection_member(ctx: &ReducerContext, id: String) -> Result<(), String> {
    ctx.db.collection_member().id().delete(&id);
    Ok(())
}
