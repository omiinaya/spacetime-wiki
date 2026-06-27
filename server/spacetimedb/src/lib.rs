#![allow(clippy::too_many_arguments)]

use spacetimedb::*;
use sha2::{Digest, Sha256};

// ─── Helpers ─────────────────────────────────────────────────────────────────

fn now_ms(ctx: &ReducerContext) -> u64 {
    ctx.timestamp.to_micros_since_unix_epoch() as u64 / 1000
}

fn make_id(prefix: &str, ctx: &ReducerContext) -> String {
    let ts = now_ms(ctx);
    let rand: u32 = (ts as u32).wrapping_mul(1103515245).wrapping_add(12345);
    format!("{}_{:x}", prefix, rand)
}

fn hash_password(password: &str) -> String {
    let mut hasher = Sha256::new();
    hasher.update(password.as_bytes());
    format!("{:x}", hasher.finalize())
}

// ─── Audit Event Log ─────────────────────────────────────────────────────────

#[table(accessor = audit_event, public)]
#[derive(Debug, Clone)]
pub struct AuditEvent {
    #[primary_key]
    pub id: String,
    /// The type of event: "page.create" | "page.update" | "page.delete" | "page.restore" | "page.publish" | "page.archive" | "collection.create" | "collection.delete" | "comment.create" | "comment.delete" | "group.create" | "group.delete" | "user.create" | "user.role_change"
    pub event_type: String,
    /// The user who performed the action
    pub actor_id: String,
    /// The target entity ID (page_id, collection_id, etc.)
    pub target_id: String,
    /// Human-readable target name (page title, collection name, etc.) for display
    pub target_name: String,
    /// JSON metadata with extra context
    pub metadata: String,
    pub created_at: u64,
}

fn log_event(
    ctx: &ReducerContext,
    event_type: &str,
    actor_id: &str,
    target_id: &str,
    target_name: &str,
    metadata: &str,
) {
    ctx.db.audit_event().insert(AuditEvent {
        id: make_id("ae", ctx),
        event_type: event_type.to_string(),
        actor_id: actor_id.to_string(),
        target_id: target_id.to_string(),
        target_name: target_name.to_string(),
        metadata: metadata.to_string(),
        created_at: now_ms(ctx),
    });
}

// ─── Tables ──────────────────────────────────────────────────────────────────

#[table(accessor = group, public)]
#[derive(Debug, Clone)]
pub struct Group {
    #[primary_key]
    pub id: String,
    pub name: String,
    pub description: String,
    pub created_by: String,
    pub created_at: u64,
    pub updated_at: u64,
}

#[table(accessor = group_member, public)]
#[derive(Debug, Clone)]
pub struct GroupMember {
    #[primary_key]
    pub id: String,
    pub group_id: String,
    pub user_id: String,
    pub role: String,
    pub added_by: String,
    pub created_at: u64,
}

#[table(accessor = collection_group_permission, public)]
#[derive(Debug, Clone)]
pub struct CollectionGroupPermission {
    #[primary_key]
    pub id: String,
    pub collection_id: String,
    pub group_id: String,
    pub role: String,
    pub created_at: u64,
}

#[table(accessor = user, public)]
#[derive(Debug, Clone)]
pub struct User {
    #[primary_key]
    pub id: String,
    pub name: String,
    pub email: String,
    pub password_hash: String,
    pub role: String,
    pub avatar_url: String,
    pub created_at: u64,
    pub updated_at: u64,
}

#[table(accessor = collection, public)]
#[derive(Debug, Clone)]
pub struct Collection {
    #[primary_key]
    pub id: String,
    pub name: String,
    pub slug: String,
    pub description: String,
    pub parent_id: String,
    pub icon: String,
    pub color: String,
    pub sort_order: u32,
    pub created_by: String,
    pub created_at: u64,
    pub updated_at: u64,
}

#[table(accessor = collection_member, public)]
#[derive(Debug, Clone)]
pub struct CollectionMember {
    #[primary_key]
    pub id: String,
    pub collection_id: String,
    pub user_id: String,
    pub role: String,
    pub added_by: String,
    pub created_at: u64,
}

#[table(accessor = page, public)]
#[derive(Debug, Clone)]
pub struct Page {
    #[primary_key]
    pub id: String,
    pub title: String,
    pub slug: String,
    pub content: String,
    pub text_content: String,
    pub collection_id: String,
    pub parent_page_id: String,
    pub status: String,
    pub icon: String,
    pub color: String,
    pub full_width: bool,
    pub is_pinned: bool,
    pub is_template: bool,
    pub template_id: String,
    pub sort_order: u32,
    pub created_by: String,
    pub updated_by: String,
    pub created_at: u64,
    pub updated_at: u64,
    pub published_at: u64,
    pub deleted_at: u64,
    pub direction: String,
}

#[table(accessor = page_revision, public)]
#[derive(Debug, Clone)]
pub struct PageRevision {
    #[primary_key]
    pub id: String,
    pub page_id: String,
    pub title: String,
    pub content: String,
    pub edited_by: String,
    pub created_at: u64,
    pub revision_number: u32,
}

#[table(accessor = comment, public)]
#[derive(Debug, Clone)]
pub struct Comment {
    #[primary_key]
    pub id: String,
    pub page_id: String,
    pub parent_comment_id: String,
    pub user_id: String,
    pub body: String,
    pub text_anchor: String,
    pub is_resolved: bool,
    pub created_at: u64,
    pub updated_at: u64,
}

#[table(accessor = attachment, public)]
#[derive(Debug, Clone)]
pub struct Attachment {
    #[primary_key]
    pub id: String,
    pub page_id: String,
    pub filename: String,
    pub mime_type: String,
    pub size_bytes: u64,
    pub storage_key: String,
    pub uploaded_by: String,
    pub created_at: u64,
}

#[table(accessor = page_tag, public)]
#[derive(Debug, Clone)]
pub struct PageTag {
    #[primary_key]
    pub id: String,
    pub page_id: String,
    pub name: String,
    pub value: String,
}

#[table(accessor = favorite, public)]
#[derive(Debug, Clone)]
pub struct Favorite {
    #[primary_key]
    pub id: String,
    pub user_id: String,
    pub page_id: String,
    pub created_at: u64,
}

#[table(accessor = comment_reaction, public)]
#[derive(Debug, Clone)]
pub struct CommentReaction {
    #[primary_key]
    pub id: String,
    pub comment_id: String,
    pub user_id: String,
    /// Emoji character, e.g. "👍", "❤️", "🎉"
    pub emoji: String,
    pub created_at: u64,
}

#[table(accessor = share_link, public)]
#[derive(Debug, Clone)]
pub struct ShareLink {
    #[primary_key]
    pub id: String,
    pub page_id: String,
    pub token: String,
    pub password_hash: String,
    pub created_by: String,
    pub expires_at: u64,
    pub created_at: u64,
    pub visit_count: u32,
    pub brand_title: Option<String>,
    pub brand_logo_url: Option<String>,
}

#[table(accessor = page_permission, public)]
#[derive(Debug, Clone)]
pub struct PagePermission {
    #[primary_key]
    pub id: String,
    pub page_id: String,
    pub user_id: String,
    pub group_id: String,
    pub role: String,
    pub created_at: u64,
}

#[table(accessor = api_key, public)]
#[derive(Debug, Clone)]
pub struct ApiKey {
    #[primary_key]
    pub id: String,
    pub user_id: String,
    pub name: String,
    pub key_hash: String,
    pub key_prefix: String,
    pub last_used_at: u64,
    pub created_at: u64,
    pub expires_at: u64,
    pub is_revoked: bool,
}

// ─── Webhooks ────────────────────────────────────────────────────────────────

#[table(accessor = webhook, public)]
#[derive(Debug, Clone)]
pub struct Webhook {
    #[primary_key]
    pub id: String,
    pub name: String,
    pub url: String,
    /// JSON array of event types, e.g. '["page.create","page.update","page.delete"]'
    pub events: String,
    pub is_active: bool,
    pub secret: String,
    pub created_by: String,
    pub created_at: u64,
    pub updated_at: u64,
}

#[table(accessor = webhook_event, public)]
#[derive(Debug, Clone)]
pub struct WebhookEvent {
    #[primary_key]
    pub id: String,
    pub webhook_id: String,
    pub event_type: String,
    pub page_id: String,
    pub payload: String,
    pub status: String, // "pending" | "sent" | "failed"
    pub response_code: u32,
    pub response_body: String,
    pub created_at: u64,
    pub sent_at: u64,
}

// ─── Helper: sort orders ────────────────────────────────────────────────────

fn next_sort_order(ctx: &ReducerContext, collection_id: &str, parent_page_id: &str) -> u32 {
    ctx.db.page().iter()
        .filter(|p| p.collection_id == collection_id && p.parent_page_id == parent_page_id)
        .map(|p| p.sort_order)
        .max()
        .unwrap_or(0) + 1
}

fn next_col_sort_order(ctx: &ReducerContext, parent_id: &str) -> u32 {
    ctx.db.collection().iter()
        .filter(|c| c.parent_id == parent_id)
        .map(|c| c.sort_order)
        .max()
        .unwrap_or(0) + 1
}

// ─── Users ───────────────────────────────────────────────────────────────────

#[reducer]
pub fn register_user(
    ctx: &ReducerContext,
    id: String,
    name: String,
    email: String,
    password: String,
    role: String,
) -> Result<(), String> {
    let existing = ctx.db.user().iter().find(|u| u.email == email);
    if existing.is_some() {
        return Err("Email already registered".into());
    }
    let valid_roles = ["admin", "member", "viewer"];
    let role_clean = if valid_roles.contains(&role.as_str()) { role } else { "member".into() };
    let now = now_ms(ctx);
    let password_hash = hash_password(&password);
    ctx.db.user().insert(User {
        id, name, email, password_hash,
        role: role_clean,
        avatar_url: String::new(),
        created_at: now, updated_at: now,
    });
    Ok(())
}

#[reducer]
pub fn login_user(
    ctx: &ReducerContext,
    email: String,
    password: String,
) -> Result<(), String> {
    let password_hash = hash_password(&password);
    let found = ctx.db.user().iter()
        .find(|u| u.email == email && u.password_hash == password_hash);
    if found.is_none() {
        return Err("Invalid email or password".into());
    }
    Ok(())
}

#[reducer]
pub fn update_user_role(
    ctx: &ReducerContext,
    user_id: String,
    new_role: String,
    updated_by: String,
) -> Result<(), String> {
    // Only admins can change roles
    let updater = ctx.db.user().iter().find(|u| u.id == updated_by);
    if updater.is_none() || updater.unwrap().role != "admin" {
        return Err("Only admins can change roles".into());
    }
    let valid_roles = ["admin", "member", "viewer"];
    if !valid_roles.contains(&new_role.as_str()) {
        return Err("Invalid role. Must be admin, member, or viewer".into());
    }
    let found = ctx.db.user().iter().find(|u| u.id == user_id);
    if found.is_none() {
        return Err("User not found".into());
    }
    let mut user = found.unwrap();
    user.role = new_role;
    user.updated_at = now_ms(ctx);
    ctx.db.user().id().update(user);
    Ok(())
}

#[reducer]
pub fn update_user_avatar(
    ctx: &ReducerContext,
    user_id: String,
    avatar_url: String,
    updated_by: String,
) -> Result<(), String> {
    // Only admins can change avatars
    let updater = ctx.db.user().iter().find(|u| u.id == updated_by);
    if updater.is_none() || updater.unwrap().role != "admin" {
        return Err("Only admins can change user avatars".into());
    }
    let found = ctx.db.user().iter().find(|u| u.id == user_id);
    if found.is_none() {
        return Err("User not found".into());
    }
    let mut user = found.unwrap();
    user.avatar_url = avatar_url;
    user.updated_at = now_ms(ctx);
    ctx.db.user().id().update(user);
    Ok(())
}

// ─── Collections ─────────────────────────────────────────────────────────────

#[reducer]
pub fn create_collection(
    ctx: &ReducerContext,
    id: String,
    name: String,
    description: String,
    parent_id: String,
    icon: String,
    color: String,
    created_by: String,
) -> Result<(), String> {
    let slug = name.to_lowercase().replace(' ', "-");
    let now = now_ms(ctx);
    let sort_order = next_col_sort_order(ctx, &parent_id);
    ctx.db.collection().insert(Collection {
        id: id.clone(), name: name.clone(), slug, description, parent_id, icon, color,
        sort_order, created_by: created_by.clone(),
        created_at: now, updated_at: now,
    });
    // Creator gets admin access
    ctx.db.collection_member().insert(CollectionMember {
        id: make_id("cm", ctx),
        collection_id: id.clone(),
        user_id: created_by.clone(),
        role: "admin".into(),
        added_by: String::new(),
        created_at: now,
    });

    log_event(ctx, "collection.create", &created_by, &id, &name, r#"{}"#);
    Ok(())
}

#[reducer]
pub fn update_collection(
    ctx: &ReducerContext,
    id: String,
    name: String,
    description: String,
    icon: String,
    color: String,
) -> Result<(), String> {
    let found = ctx.db.collection().iter().find(|c| c.id == id);
    if found.is_none() {
        return Err("Collection not found".into());
    }
    let mut col = found.unwrap();
    col.name = name;
    col.slug = col.name.to_lowercase().replace(' ', "-");
    col.description = description;
    col.icon = icon;
    col.color = color;
    col.updated_at = now_ms(ctx);
    ctx.db.collection().id().update(col);
    Ok(())
}

#[reducer]
pub fn delete_collection(ctx: &ReducerContext, id: String) -> Result<(), String> {
    let now = now_ms(ctx);
    for mut page in ctx.db.page().iter().filter(|p| p.collection_id == id) {
        page.status = "archived".into();
        page.updated_at = now;
        ctx.db.page().id().update(page);
    }
    ctx.db.collection().id().delete(&id);
    Ok(())
}

#[reducer]
pub fn reorder_collections(ctx: &ReducerContext, ordered_ids: Vec<String>) -> Result<(), String> {
    let now = now_ms(ctx);
    for (i, id) in ordered_ids.iter().enumerate() {
        if let Some(mut col) = ctx.db.collection().iter().find(|c| &c.id == id) {
            col.sort_order = i as u32;
            col.updated_at = now;
            ctx.db.collection().id().update(col);
        }
    }
    Ok(())
}

// ─── Auto-sort rules for collections ────────────────────────────────────────
//
// Allows configuring automatic sort ordering for pages within a collection.
// sort_field: "title" | "created_at" | "updated_at" | "manual"
// sort_direction: "asc" | "desc"
// auto_apply: if true, pages are automatically re-sorted when created/updated

#[table(accessor = collection_sort_rule, public)]
#[derive(Debug, Clone)]
pub struct CollectionSortRule {
    #[primary_key]
    pub collection_id: String,
    pub sort_field: String,     // "title" | "created_at" | "updated_at" | "manual"
    pub sort_direction: String, // "asc" | "desc"
    pub auto_apply: bool,
    pub updated_by: String,
    pub updated_at: u64,
}

#[reducer]
pub fn set_collection_sort_rule(
    ctx: &ReducerContext,
    collection_id: String,
    sort_field: String,
    sort_direction: String,
    auto_apply: bool,
    updated_by: String,
) -> Result<(), String> {
    let valid_fields = ["title", "created_at", "updated_at", "manual"];
    if !valid_fields.contains(&sort_field.as_str()) {
        return Err("Invalid sort field. Must be one of: title, created_at, updated_at, manual".into());
    }
    let valid_dirs = ["asc", "desc"];
    if !valid_dirs.contains(&sort_direction.as_str()) {
        return Err("Invalid sort direction. Must be 'asc' or 'desc'".into());
    }
    let now = now_ms(ctx);
    let existing = ctx.db.collection_sort_rule().iter().find(|r| r.collection_id == collection_id);
    if let Some(mut rule) = existing {
        rule.sort_field = sort_field;
        rule.sort_direction = sort_direction;
        rule.auto_apply = auto_apply;
        rule.updated_by = updated_by;
        rule.updated_at = now;
        ctx.db.collection_sort_rule().collection_id().update(rule);
    } else {
        ctx.db.collection_sort_rule().insert(CollectionSortRule {
            collection_id,
            sort_field,
            sort_direction,
            auto_apply,
            updated_by,
            updated_at: now,
        });
    }
    Ok(())
}

#[reducer]
pub fn delete_collection_sort_rule(ctx: &ReducerContext, collection_id: String) -> Result<(), String> {
    ctx.db.collection_sort_rule().collection_id().delete(&collection_id);
    Ok(())
}

#[reducer]
pub fn apply_collection_auto_sort(ctx: &ReducerContext, collection_id: String) -> Result<(), String> {
    let rule = ctx.db.collection_sort_rule().iter()
        .find(|r| r.collection_id == collection_id);
    if rule.is_none() {
        return Err("No sort rule configured for this collection".into());
    }
    let rule = rule.unwrap();
    if rule.sort_field == "manual" {
        return Ok(()); // no-op for manual sort
    }

    let mut pages: Vec<_> = ctx.db.page().iter()
        .filter(|p| p.collection_id == collection_id && p.status != "deleted")
        .collect();

    // Sort in-memory
    match rule.sort_field.as_str() {
        "title" => {
            if rule.sort_direction == "desc" {
                pages.sort_by(|a, b| b.title.to_lowercase().cmp(&a.title.to_lowercase()));
            } else {
                pages.sort_by(|a, b| a.title.to_lowercase().cmp(&b.title.to_lowercase()));
            }
        }
        "created_at" => {
            if rule.sort_direction == "desc" {
                pages.sort_by(|a, b| b.created_at.cmp(&a.created_at));
            } else {
                pages.sort_by(|a, b| a.created_at.cmp(&b.created_at));
            }
        }
        "updated_at" => {
            if rule.sort_direction == "desc" {
                pages.sort_by(|a, b| b.updated_at.cmp(&a.updated_at));
            } else {
                pages.sort_by(|a, b| a.updated_at.cmp(&b.updated_at));
            }
        }
        _ => {}
    }

    // Update sort_order based on position (pinned pages stay on top)
    let now = now_ms(ctx);
    let mut sort_idx: u32 = 0;
    for page in pages {
        if page.is_pinned {
            continue;
        }
        if let Some(mut p) = ctx.db.page().iter().find(|p| p.id == page.id) {
            p.sort_order = sort_idx;
            p.updated_at = now;
            ctx.db.page().id().update(p);
            sort_idx += 1;
        }
    }
    Ok(())
}

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

// ─── Pages ───────────────────────────────────────────────────────────────────

#[reducer]
pub fn create_page(
    ctx: &ReducerContext,
    id: String,
    title: String,
    content: String,
    collection_id: String,
    parent_page_id: String,
    created_by: String,
) -> Result<(), String> {
    let slug = title.to_lowercase()
        .replace(' ', "-")
        .chars().filter(|c| c.is_alphanumeric() || *c == '-').collect::<String>();
    let now = now_ms(ctx);
    let sort_order = next_sort_order(ctx, &collection_id, &parent_page_id);
    let text_content = content.chars()
        .filter(|c| !r#"{}[]",:"#.contains(*c)).take(2000).collect::<String>();

    ctx.db.page().insert(Page {
        id: id.clone(), title: title.clone(), slug, content: content.clone(),
        text_content, collection_id: collection_id.clone(), parent_page_id: parent_page_id.clone(),
        status: "draft".into(), icon: String::new(), color: String::new(),
        full_width: false, is_pinned: false, is_template: false, template_id: String::new(),
        sort_order, created_by: created_by.clone(), updated_by: created_by.clone(),
        created_at: now, updated_at: now, published_at: 0, deleted_at: 0,
        direction: "ltr".into(),
    });

    ctx.db.page_revision().insert(PageRevision {
        id: make_id("rev", ctx), page_id: id.clone(), title: title.clone(), content: content.clone(),
        edited_by: created_by.clone(), created_at: now, revision_number: 1,
    });

    log_event(ctx, "page.create", &created_by, &id, &title, &format!(r#"{{"collection_id":"{}","parent_page_id":"{}"}}"#, collection_id, parent_page_id));
    // Notify collection watchers about new page
    notify_collection_watchers_new_page(
        ctx, &collection_id, &id, &created_by, &title,
        &format!("New page \"{}\" was created", title),
        &String::new(),
    );
    Ok(())
}

#[reducer]
pub fn update_page(
    ctx: &ReducerContext,
    id: String,
    title: String,
    content: String,
    updated_by: String,
) -> Result<(), String> {
    let found = ctx.db.page().iter().find(|p| p.id == id);
    if found.is_none() {
        return Err("Page not found".into());
    }
    let mut page = found.unwrap();
    let slug = title.to_lowercase()
        .replace(' ', "-")
        .chars().filter(|c| c.is_alphanumeric() || *c == '-').collect::<String>();
    let text_content = content.chars()
        .filter(|c| !r#"{}[]",:"#.contains(*c)).take(2000).collect::<String>();
    let now = now_ms(ctx);

    page.title = title.clone();
    page.slug = slug;
    page.content = content.clone();
    page.text_content = text_content;
    page.updated_by = updated_by.clone();
    page.updated_at = now;
    ctx.db.page().id().update(page);

    let max_rev = ctx.db.page_revision().iter()
        .filter(|r| r.page_id == id)
        .map(|r| r.revision_number).max().unwrap_or(0);
    ctx.db.page_revision().insert(PageRevision {
        id: make_id("rev", ctx), page_id: id.clone(), title: title.clone(), content: content.clone(),
        edited_by: updated_by.clone(), created_at: now, revision_number: max_rev + 1,
    });

    log_event(ctx, "page.update", &updated_by, &id, &title, r#"{}"#);
    // Notify page watchers about update
    notify_page_watchers(
        ctx, &id, "page.update", &updated_by, &title,
        &format!("Page \"{}\" was updated", title),
        &String::new(),
    );
    Ok(())
}

#[reducer]
pub fn set_page_status(ctx: &ReducerContext, id: String, status: String) -> Result<(), String> {
    let found = ctx.db.page().iter().find(|p| p.id == id);
    if found.is_none() {
        return Err("Page not found".into());
    }
    let mut page = found.unwrap();
    let now = now_ms(ctx);
    let valid_statuses = ["draft", "published", "archived", "deleted"];
    if !valid_statuses.contains(&status.as_str()) {
        return Err("Invalid status".into());
    }
    page.status = status.clone();
    page.updated_at = now;
    if page.status == "published" && page.published_at == 0 {
        page.published_at = now;
    }
    if page.status == "deleted" {
        page.deleted_at = now;
    }
    if page.status != "deleted" {
        page.deleted_at = 0;
    }
    let target_name = page.title.clone();
    ctx.db.page().id().update(page);

    // Log status change events
    let event_type = match status.as_str() {
        "published" => "page.publish",
        "deleted" => "page.delete",
        "archived" => "page.archive",
        _ => "page.status_change",
    };
    log_event(ctx, event_type, "", &id, &target_name, &format!(r#"{{"new_status":"{}"}}"#, status));
    Ok(())
}

#[reducer]
pub fn restore_page(ctx: &ReducerContext, id: String) -> Result<(), String> {
    let found = ctx.db.page().iter().find(|p| p.id == id && p.status == "deleted");
    if found.is_none() {
        return Err("Page not found or not in trash".into());
    }
    let mut page = found.unwrap();
    page.status = "draft".into();
    page.deleted_at = 0;
    page.updated_at = now_ms(ctx);
    ctx.db.page().id().update(page);
    Ok(())
}

#[reducer]
pub fn delete_page_permanent(ctx: &ReducerContext, id: String) -> Result<(), String> {
    for rev in ctx.db.page_revision().iter().filter(|r| r.page_id == id) {
        ctx.db.page_revision().id().delete(&rev.id);
    }
    for com in ctx.db.comment().iter().filter(|c| c.page_id == id) {
        ctx.db.comment().id().delete(&com.id);
    }
    for att in ctx.db.attachment().iter().filter(|a| a.page_id == id) {
        ctx.db.attachment().id().delete(&att.id);
    }
    for tag in ctx.db.page_tag().iter().filter(|t| t.page_id == id) {
        ctx.db.page_tag().id().delete(&tag.id);
    }
    for fav in ctx.db.favorite().iter().filter(|f| f.page_id == id) {
        ctx.db.favorite().id().delete(&fav.id);
    }
    for share in ctx.db.share_link().iter().filter(|s| s.page_id == id) {
        ctx.db.share_link().id().delete(&share.id);
    }
    ctx.db.page().id().delete(&id);
    Ok(())
}

#[reducer]
pub fn empty_trash(ctx: &ReducerContext) -> Result<(), String> {
    // Check retention setting
    let retention_days = ctx.db.app_setting().iter()
        .find(|s| s.key == "trash_retention_days")
        .map(|s| s.value.parse::<u64>().unwrap_or(0))
        .unwrap_or(0);

    let now = now_ms(ctx);
    let cutoff = if retention_days > 0 {
        now.saturating_sub(retention_days * 86_400_000)
    } else {
        0
    };

    let deleted_pages: Vec<String> = ctx.db.page().iter()
        .filter(|p| {
            p.status == "deleted" && (retention_days == 0 || p.deleted_at < cutoff)
        })
        .map(|p| p.id.clone())
        .collect();
    for page_id in deleted_pages {
        let _ = delete_page_permanent(ctx, page_id);
    }
    Ok(())
}

#[reducer]
pub fn duplicate_page(
    ctx: &ReducerContext,
    new_id: String,
    id: String,
    created_by: String,
) -> Result<(), String> {
    let found = ctx.db.page().iter().find(|p| p.id == id);
    if found.is_none() {
        return Err("Page not found".into());
    }
    let page = found.unwrap();
    create_page(
        ctx, new_id,
        format!("{} (copy)", page.title),
        page.content,
        page.collection_id, page.parent_page_id, created_by,
    )
}

#[reducer]
pub fn move_page(
    ctx: &ReducerContext,
    id: String,
    new_collection_id: String,
    new_parent_page_id: String,
) -> Result<(), String> {
    let found = ctx.db.page().iter().find(|p| p.id == id);
    if found.is_none() {
        return Err("Page not found".into());
    }
    let mut page = found.unwrap();
    page.collection_id = new_collection_id;
    page.parent_page_id = new_parent_page_id;
    page.updated_at = now_ms(ctx);
    ctx.db.page().id().update(page);
    Ok(())
}

#[reducer]
pub fn reorder_pages(ctx: &ReducerContext, ordered_ids: Vec<String>) -> Result<(), String> {
    let now = now_ms(ctx);
    for (i, id) in ordered_ids.iter().enumerate() {
        if let Some(mut page) = ctx.db.page().iter().find(|p| &p.id == id) {
            page.sort_order = i as u32;
            page.updated_at = now;
            ctx.db.page().id().update(page);
        }
    }
    Ok(())
}

#[reducer]
pub fn set_page_icon(ctx: &ReducerContext, id: String, icon: String) -> Result<(), String> {
    let found = ctx.db.page().iter().find(|p| p.id == id);
    if found.is_none() {
        return Err("Page not found".into());
    }
    let mut page = found.unwrap();
    page.icon = icon;
    page.updated_at = now_ms(ctx);
    ctx.db.page().id().update(page);
    Ok(())
}

#[reducer]
pub fn set_page_full_width(ctx: &ReducerContext, id: String, full_width: bool) -> Result<(), String> {
    let found = ctx.db.page().iter().find(|p| p.id == id);
    if found.is_none() {
        return Err("Page not found".into());
    }
    let mut page = found.unwrap();
    page.full_width = full_width;
    page.updated_at = now_ms(ctx);
    ctx.db.page().id().update(page);
    Ok(())
}

#[reducer]
pub fn set_page_color(ctx: &ReducerContext, id: String, color: String) -> Result<(), String> {
    let found = ctx.db.page().iter().find(|p| p.id == id);
    if found.is_none() {
        return Err("Page not found".into());
    }
    let mut page = found.unwrap();
    page.color = color;
    page.updated_at = now_ms(ctx);
    ctx.db.page().id().update(page);
    Ok(())
}

#[reducer]
pub fn set_page_pinned(ctx: &ReducerContext, id: String, is_pinned: bool) -> Result<(), String> {
    let found = ctx.db.page().iter().find(|p| p.id == id);
    if found.is_none() {
        return Err("Page not found".into());
    }
    let mut page = found.unwrap();
    page.is_pinned = is_pinned;
    page.updated_at = now_ms(ctx);
    ctx.db.page().id().update(page);
    Ok(())
}

// ─── Page direction (RTL / bidirectional text) ─────────────────────────────

#[reducer]
pub fn set_page_direction(ctx: &ReducerContext, id: String, direction: String) -> Result<(), String> {
    if direction != "ltr" && direction != "rtl" {
        return Err("Direction must be 'ltr' or 'rtl'".into());
    }
    let found = ctx.db.page().iter().find(|p| p.id == id);
    if found.is_none() {
        return Err("Page not found".into());
    }
    let mut page = found.unwrap();
    page.direction = direction;
    page.updated_at = now_ms(ctx);
    ctx.db.page().id().update(page);
    Ok(())
}

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
    let body_excerpt: String = body.chars().take(80).collect();
    let comment_message = if body_excerpt.len() < body.len() {
        format!("{} commented on \"{}\": \"{}...\"", user_id, page_title, body_excerpt)
    } else {
        format!("{} commented on \"{}\": \"{}\"", user_id, page_title, body_excerpt)
    };
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

// ─── Tags ────────────────────────────────────────────────────────────────────

#[reducer]
pub fn add_tag(
    ctx: &ReducerContext,
    id: String,
    page_id: String,
    name: String,
    value: String,
) -> Result<(), String> {
    ctx.db.page_tag().insert(PageTag {
        id, page_id, name: name.to_lowercase().trim().to_string(), value,
    });
    Ok(())
}

#[reducer]
pub fn remove_tag(ctx: &ReducerContext, id: String) -> Result<(), String> {
    ctx.db.page_tag().id().delete(&id);
    Ok(())
}

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

// ─── Attachments ─────────────────────────────────────────────────────────────

#[reducer]
pub fn add_attachment(
    ctx: &ReducerContext,
    id: String,
    page_id: String,
    filename: String,
    mime_type: String,
    size_bytes: u64,
    storage_key: String,
    uploaded_by: String,
) -> Result<(), String> {
    ctx.db.attachment().insert(Attachment {
        id, page_id, filename, mime_type, size_bytes, storage_key, uploaded_by,
        created_at: now_ms(ctx),
    });
    Ok(())
}

#[reducer]
pub fn delete_attachment(ctx: &ReducerContext, id: String) -> Result<(), String> {
    ctx.db.attachment().id().delete(&id);
    Ok(())
}

// ─── Share Links ─────────────────────────────────────────────────────────────

#[reducer]
pub fn create_share_link(
    ctx: &ReducerContext,
    id: String,
    page_id: String,
    token: String,
    password: String,
    created_by: String,
    expires_days: u32,
) -> Result<(), String> {
    let page_exists = ctx.db.page().iter().any(|p| p.id == page_id);
    if !page_exists {
        return Err("Page not found".into());
    }
    let now = now_ms(ctx);
    let expires_at = if expires_days > 0 {
        now + (expires_days as u64) * 86_400_000
    } else {
        0 // never expires
    };
    let password_hash = if password.is_empty() {
        String::new()
    } else {
        hash_password(&password)
    };
    ctx.db.share_link().insert(ShareLink {
        id, page_id, token, password_hash, created_by,
        expires_at, created_at: now, visit_count: 0,
        brand_title: None,
        brand_logo_url: None,
    });
    Ok(())
}

#[reducer]
pub fn delete_share_link(ctx: &ReducerContext, id: String) -> Result<(), String> {
    ctx.db.share_link().id().delete(&id);
    Ok(())
}

#[reducer]
pub fn update_share_branding(
    ctx: &ReducerContext,
    share_id: String,
    brand_title: Option<String>,
    brand_logo_url: Option<String>,
) -> Result<(), String> {
    let found = ctx.db.share_link().id().find(&share_id);
    if found.is_none() {
        return Err("Share link not found".into());
    }
    let mut share = found.unwrap();
    share.brand_title = brand_title;
    share.brand_logo_url = brand_logo_url;
    ctx.db.share_link().id().update(share);
    Ok(())
}

#[reducer]
pub fn verify_share_password(
    ctx: &ReducerContext,
    token: String,
    password: String,
) -> Result<(), String> {
    let found = ctx.db.share_link().iter()
        .find(|s| s.token == token);
    if found.is_none() {
        return Err("Invalid share link".into());
    }
    let share = found.unwrap();
    let now = now_ms(ctx);
    if share.expires_at > 0 && now > share.expires_at {
        return Err("Share link has expired".into());
    }
    if !share.password_hash.is_empty() {
        if hash_password(&password) != share.password_hash {
            return Err("Incorrect password".into());
        }
    }
    // Increment visit count
    let mut share_mut = share;
    share_mut.visit_count += 1;
    ctx.db.share_link().id().update(share_mut);
    Ok(())
}

#[reducer]
pub fn visit_share_link(ctx: &ReducerContext, token: String) -> Result<(), String> {
    let found = ctx.db.share_link().iter()
        .find(|s| s.token == token);
    if found.is_none() {
        return Err("Invalid share link".into());
    }
    let share = found.unwrap();
    let now = now_ms(ctx);
    if share.expires_at > 0 && now > share.expires_at {
        return Err("Share link has expired".into());
    }
    if !share.password_hash.is_empty() {
        return Err("Password required".into());
    }
    let mut share_mut = share;
    share_mut.visit_count += 1;
    ctx.db.share_link().id().update(share_mut);
    Ok(())
}

// ─── API Keys ────────────────────────────────────────────────────────────────

#[reducer]
pub fn create_api_key(
    ctx: &ReducerContext,
    id: String,
    user_id: String,
    name: String,
    key_hash: String,
    key_prefix: String,
    expires_days: u32,
) -> Result<(), String> {
    let now = now_ms(ctx);
    let expires_at = if expires_days > 0 {
        now + (expires_days as u64) * 86_400_000
    } else {
        0
    };
    ctx.db.api_key().insert(ApiKey {
        id,
        user_id,
        name,
        key_hash,
        key_prefix,
        last_used_at: 0,
        created_at: now,
        expires_at,
        is_revoked: false,
    });
    Ok(())
}

#[reducer]
pub fn revoke_api_key(ctx: &ReducerContext, id: String) -> Result<(), String> {
    let found = ctx.db.api_key().iter().find(|k| k.id == id);
    if found.is_none() {
        return Err("API key not found".into());
    }
    let mut key = found.unwrap();
    key.is_revoked = true;
    ctx.db.api_key().id().update(key);
    Ok(())
}

#[reducer]
pub fn update_api_key_usage(ctx: &ReducerContext, id: String) -> Result<(), String> {
    let found = ctx.db.api_key().iter().find(|k| k.id == id);
    if found.is_none() {
        return Err("API key not found".into());
    }
    let mut key = found.unwrap();
    key.last_used_at = now_ms(ctx);
    ctx.db.api_key().id().update(key);
    Ok(())
}

// ─── Templates ──────────────────────────────────────────────────────────────

#[reducer]
pub fn mark_as_template(ctx: &ReducerContext, id: String, is_template: bool) -> Result<(), String> {
    let found = ctx.db.page().iter().find(|p| p.id == id);
    if found.is_none() {
        return Err("Page not found".into());
    }
    let mut page = found.unwrap();
    page.is_template = is_template;
    page.updated_at = now_ms(ctx);
    ctx.db.page().id().update(page);
    Ok(())
}

#[reducer]
pub fn create_from_template(
    ctx: &ReducerContext,
    new_id: String,
    template_id: String,
    title: String,
    collection_id: String,
    created_by: String,
) -> Result<(), String> {
    let found = ctx.db.page().iter().find(|p| p.id == template_id && p.is_template);
    if found.is_none() {
        return Err("Template not found".into());
    }
    let template = found.unwrap();
    create_page(
        ctx, new_id.clone(), title, template.content,
        collection_id, String::new(), created_by,
    )?;
    // Mark which template was used
    if let Some(mut new_page) = ctx.db.page().iter().find(|p| p.id == new_id) {
        new_page.template_id = template_id;
        ctx.db.page().id().update(new_page);
    }
    Ok(())
}

// ─── Groups / Teams ──────────────────────────────────────────────────────────

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
    // Check user exists
    let user_exists = ctx.db.user().iter().any(|u| u.id == user_id);
    if !user_exists {
        return Err("User not found".into());
    }
    let existing = ctx.db.group_member().iter()
        .find(|m| m.group_id == group_id && m.user_id == user_id);
    if existing.is_some() {
        return Err("User is already a member of this group".into());
    }
    let valid_roles = ["admin", "member"];
    let role_clean = if valid_roles.contains(&role.as_str()) { role } else { "member".into() };
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
    let valid_roles = ["admin", "member"];
    if !valid_roles.contains(&new_role.as_str()) {
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

#[reducer]
pub fn set_collection_group_permission(
    ctx: &ReducerContext,
    id: String,
    collection_id: String,
    group_id: String,
    role: String,
) -> Result<(), String> {
    // Check if permission already exists for this collection+group
    let existing = ctx.db.collection_group_permission().iter()
        .find(|p| p.collection_id == collection_id && p.group_id == group_id);
    if let Some(perm) = existing {
        // Update role
        let mut p = perm;
        p.role = role;
        ctx.db.collection_group_permission().id().update(p);
        return Ok(());
    }
    let valid_roles = ["admin", "editor", "viewer"];
    let role_clean = if valid_roles.contains(&role.as_str()) { role } else { "viewer".into() };
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

// ─── Page Permissions ────────────────────────────────────────────────────────

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
    let valid_roles = ["admin", "editor", "viewer"];
    let role_clean = if valid_roles.contains(&role.as_str()) { role } else { "viewer".into() };

    // Check if permission already exists for this page+user (if user_id) or page+group (if group_id)
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

// ─── Webhooks ────────────────────────────────────────────────────────────────

#[reducer]
pub fn create_webhook(
    ctx: &ReducerContext,
    id: String,
    name: String,
    url: String,
    events: String,  // JSON array, e.g. '["page.create","page.update","page.delete"]'
    secret: String,
    created_by: String,
) -> Result<(), String> {
    // Validate URL starts with http/https
    if !url.starts_with("http://") && !url.starts_with("https://") {
        return Err("Webhook URL must start with http:// or https://".into());
    }
    // Validate events is valid JSON array
    if serde_json::from_str::<Vec<String>>(&events).is_err() {
        return Err("Events must be a JSON array of strings".into());
    }
    let now = now_ms(ctx);
    ctx.db.webhook().insert(Webhook {
        id,
        name,
        url,
        events,
        is_active: true,
        secret,
        created_by,
        created_at: now,
        updated_at: now,
    });
    Ok(())
}

#[reducer]
pub fn update_webhook(
    ctx: &ReducerContext,
    id: String,
    name: String,
    url: String,
    events: String,
    secret: String,
    is_active: bool,
) -> Result<(), String> {
    if !url.starts_with("http://") && !url.starts_with("https://") {
        return Err("Webhook URL must start with http:// or https://".into());
    }
    if serde_json::from_str::<Vec<String>>(&events).is_err() {
        return Err("Events must be a JSON array of strings".into());
    }
    let found = ctx.db.webhook().iter().find(|w| w.id == id);
    if found.is_none() {
        return Err("Webhook not found".into());
    }
    let mut wh = found.unwrap();
    wh.name = name;
    wh.url = url;
    wh.events = events;
    wh.secret = secret;
    wh.is_active = is_active;
    wh.updated_at = now_ms(ctx);
    ctx.db.webhook().id().update(wh);
    Ok(())
}

#[reducer]
pub fn delete_webhook(ctx: &ReducerContext, id: String) -> Result<(), String> {
    // Remove all pending events for this webhook
    for event in ctx.db.webhook_event().iter().filter(|e| e.webhook_id == id) {
        ctx.db.webhook_event().id().delete(&event.id);
    }
    ctx.db.webhook().id().delete(&id);
    Ok(())
}

#[reducer]
pub fn fire_webhook_event(
    ctx: &ReducerContext,
    event_id: String,
    webhook_id: String,
    event_type: String,
    page_id: String,
    payload: String,
) -> Result<(), String> {
    let now = now_ms(ctx);
    ctx.db.webhook_event().insert(WebhookEvent {
        id: event_id,
        webhook_id,
        event_type,
        page_id,
        payload,
        status: "pending".into(),
        response_code: 0,
        response_body: String::new(),
        created_at: now,
        sent_at: 0,
    });
    Ok(())
}

#[reducer]
pub fn mark_webhook_event_sent(
    ctx: &ReducerContext,
    id: String,
    response_code: u32,
    response_body: String,
) -> Result<(), String> {
    let found = ctx.db.webhook_event().iter().find(|e| e.id == id);
    if found.is_none() {
        return Err("Webhook event not found".into());
    }
    let mut event = found.unwrap();
    event.status = if response_code >= 200 && response_code < 300 { "sent".to_string() } else { "failed".to_string() };
    event.response_code = response_code;
    event.response_body = response_body;
    event.sent_at = now_ms(ctx);
    ctx.db.webhook_event().id().update(event);
    Ok(())
}

#[reducer]
pub fn cleanup_webhook_events(ctx: &ReducerContext, older_than_ms: u64) -> Result<(), String> {
    let cutoff = now_ms(ctx) - older_than_ms;
    let to_delete: Vec<String> = ctx.db.webhook_event().iter()
        .filter(|e| e.created_at < cutoff)
        .map(|e| e.id.clone())
        .collect();
    for id in to_delete {
        ctx.db.webhook_event().id().delete(&id);
    }
    Ok(())
}

// ─── Full-Text Search ──────────────────────────────────────────────────────────

#[table(accessor = search_result, public)]
#[derive(Debug, Clone)]
pub struct SearchResult {
    #[primary_key]
    pub id: String,
    /// Unique token per search query, used to group results
    pub search_token: String,
    pub page_id: String,
    pub title: String,
    pub slug: String,
    /// First ~200 chars of text_content for excerpt
    pub excerpt: String,
    /// "title" or "content" — what matched (title matches ranked first)
    pub match_type: String,
    pub created_at: u64,
}

#[reducer]
pub fn search_pages(
    ctx: &ReducerContext,
    search_token: String,
    query: String,
    collection_id: String,
    author_id: String,
    date_from: i64,
    date_to: i64,
) -> Result<(), String> {
    let now = now_ms(ctx);
    let query_lower = query.to_lowercase();
    let query_trimmed = query_lower.trim();

    if query_trimmed.is_empty() {
        return Err("Search query cannot be empty".into());
    }

    // Clean up any previous results for this token
    let existing: Vec<String> = ctx.db.search_result().iter()
        .filter(|r| r.search_token == search_token)
        .map(|r| r.id.clone())
        .collect();
    for id in existing {
        ctx.db.search_result().id().delete(&id);
    }

    // Also clean up orphaned results older than 5 minutes
    let cutoff = now - 300_000;
    let stale: Vec<String> = ctx.db.search_result().iter()
        .filter(|r| r.created_at < cutoff)
        .map(|r| r.id.clone())
        .collect();
    for id in stale {
        ctx.db.search_result().id().delete(&id);
    }

    // Iterate all non-deleted pages and match
    for page in ctx.db.page().iter().filter(|p| p.status != "deleted") {
        // Collection filter
        if !collection_id.is_empty() && page.collection_id != collection_id {
            continue;
        }
        // Author filter
        if !author_id.is_empty() && page.created_by != author_id {
            continue;
        }
        // Date range filter (updated_at)
        if date_from > 0 && (page.updated_at as i64) < date_from {
            continue;
        }
        if date_to > 0 && (page.updated_at as i64) > date_to {
            continue;
        }

        let title_lower = page.title.to_lowercase();
        let content_lower = page.text_content.to_lowercase();

        let (matched, match_type) = if title_lower.contains(query_trimmed) {
            (true, "title")
        } else if content_lower.contains(query_trimmed) {
            (true, "content")
        } else {
            (false, "")
        };

        if !matched {
            continue;
        }

        // Build excerpt (first 200 chars around match in text_content)
        let excerpt = if match_type == "title" {
            page.title.clone()
        } else {
            // Try to find the match position and show surrounding text
            if let Some(pos) = content_lower.find(query_trimmed) {
                let start = if pos > 80 { pos - 80 } else { 0 };
                let end = std::cmp::min(start + 200, page.text_content.len());
                let excerpt_raw = &page.text_content[start..end];
                format!("...{}...", excerpt_raw.trim())
            } else {
                // Fallback: first 200 chars
                let short = page.text_content.chars().take(200).collect::<String>();
                format!("{}...", short.trim())
            }
        };

        let id = make_id("sr", ctx);
        ctx.db.search_result().insert(SearchResult {
            id,
            search_token: search_token.clone(),
            page_id: page.id.clone(),
            title: page.title.clone(),
            slug: page.slug.clone(),
            excerpt,
            match_type: match_type.to_string(),
            created_at: now,
        });
    }

    Ok(())

}

#[reducer]
pub fn cleanup_search_results(ctx: &ReducerContext, older_than_ms: u64) -> Result<(), String> {
    let cutoff = now_ms(ctx) - older_than_ms;
    let stale: Vec<String> = ctx.db.search_result().iter()
        .filter(|r| r.created_at < cutoff)
        .map(|r| r.id.clone())
        .collect();
    for id in stale {
        ctx.db.search_result().id().delete(&id);
    }
    Ok(())
}

// ─── SAML 2.0 SSO ─────────────────────────────────────────────────────────────

#[table(accessor = saml_provider, public)]
#[derive(Debug, Clone)]
pub struct SamlProvider {
    #[primary_key]
    pub id: String,
    pub name: String,
    pub slug: String,
    /// IdP entity ID (issuer)
    pub entity_id: String,
    /// IdP SSO URL (where to send AuthnRequest)
    pub sso_url: String,
    /// IdP X.509 certificate (for signature verification, optional)
    pub certificate: String,
    /// Name ID format, e.g. "urn:oasis:names:tc:SAML:1.1:nameid-format:emailAddress"
    pub name_id_format: String,
    /// JSON mapping of SAML attributes → user fields, e.g. {"email":"email","firstName":"name"}
    pub attribute_mapping: String,
    /// Whether to auto-register users who don't exist
    pub auto_register: bool,
    pub is_active: bool,
    pub created_by: String,
    pub created_at: u64,
    pub updated_at: u64,
}

#[reducer]
pub fn add_saml_provider(
    ctx: &ReducerContext,
    id: String,
    name: String,
    slug: String,
    entity_id: String,
    sso_url: String,
    certificate: String,
    name_id_format: String,
    attribute_mapping: String,
    auto_register: bool,
    created_by: String,
) -> Result<(), String> {
    if entity_id.is_empty() {
        return Err("Entity ID is required".into());
    }
    if !sso_url.starts_with("http://") && !sso_url.starts_with("https://") {
        return Err("SSO URL must start with http:// or https://".into());
    }
    let now = now_ms(ctx);
    ctx.db.saml_provider().insert(SamlProvider {
        id, name, slug, entity_id, sso_url,
        certificate,
        name_id_format: if name_id_format.is_empty() { "urn:oasis:names:tc:SAML:1.1:nameid-format:emailAddress".into() } else { name_id_format },
        attribute_mapping: if attribute_mapping.is_empty() { r#"{"email":"email","name":"name"}"#.into() } else { attribute_mapping },
        auto_register,
        is_active: true,
        created_by,
        created_at: now,
        updated_at: now,
    });
    Ok(())
}

#[reducer]
pub fn update_saml_provider(
    ctx: &ReducerContext,
    id: String,
    name: String,
    slug: String,
    entity_id: String,
    sso_url: String,
    certificate: String,
    name_id_format: String,
    attribute_mapping: String,
    auto_register: bool,
    is_active: bool,
) -> Result<(), String> {
    if entity_id.is_empty() {
        return Err("Entity ID is required".into());
    }
    if !sso_url.starts_with("http://") && !sso_url.starts_with("https://") {
        return Err("SSO URL must start with http:// or https://".into());
    }
    let found = ctx.db.saml_provider().iter().find(|p| p.id == id);
    if found.is_none() {
        return Err("SAML provider not found".into());
    }
    let mut provider = found.unwrap();
    provider.name = name;
    provider.slug = slug;
    provider.entity_id = entity_id;
    provider.sso_url = sso_url;
    if !certificate.is_empty() {
        provider.certificate = certificate;
    }
    provider.name_id_format = if name_id_format.is_empty() { "urn:oasis:names:tc:SAML:1.1:nameid-format:emailAddress".into() } else { name_id_format };
    provider.attribute_mapping = if attribute_mapping.is_empty() { r#"{"email":"email","name":"name"}"#.into() } else { attribute_mapping };
    provider.auto_register = auto_register;
    provider.is_active = is_active;
    provider.updated_at = now_ms(ctx);
    ctx.db.saml_provider().id().update(provider);
    Ok(())
}

#[reducer]
pub fn delete_saml_provider(ctx: &ReducerContext, id: String) -> Result<(), String> {
    let found = ctx.db.saml_provider().iter().find(|p| p.id == id);
    if found.is_none() {
        return Err("SAML provider not found".into());
    }
    ctx.db.saml_provider().id().delete(&id);
    Ok(())
}

// ─── OIDC SSO ─────────────────────────────────────────────────────────────────

#[table(accessor = oidc_provider, public)]
#[derive(Debug, Clone)]
pub struct OidcProvider {
    #[primary_key]
    pub id: String,
    pub name: String,
    pub slug: String,
    pub issuer_url: String,
    pub client_id: String,
    pub client_secret: String,
    pub scopes: String,
    pub is_active: bool,
    pub created_by: String,
    pub created_at: u64,
    pub updated_at: u64,
}

#[reducer]
pub fn add_oidc_provider(
    ctx: &ReducerContext,
    id: String,
    name: String,
    slug: String,
    issuer_url: String,
    client_id: String,
    client_secret: String,
    scopes: String,
    created_by: String,
) -> Result<(), String> {
    if !issuer_url.starts_with("http://") && !issuer_url.starts_with("https://") {
        return Err("Issuer URL must start with http:// or https://".into());
    }
    if client_id.is_empty() {
        return Err("Client ID is required".into());
    }
    let now = now_ms(ctx);
    ctx.db.oidc_provider().insert(OidcProvider {
        id, name, slug, issuer_url, client_id,
        client_secret: if client_secret.is_empty() { String::new() } else { client_secret },
        scopes: if scopes.is_empty() { "openid email profile".into() } else { scopes },
        is_active: true,
        created_by,
        created_at: now,
        updated_at: now,
    });
    Ok(())
}

#[reducer]
pub fn update_oidc_provider(
    ctx: &ReducerContext,
    id: String,
    name: String,
    slug: String,
    issuer_url: String,
    client_id: String,
    client_secret: String,
    scopes: String,
    is_active: bool,
) -> Result<(), String> {
    if !issuer_url.starts_with("http://") && !issuer_url.starts_with("https://") {
        return Err("Issuer URL must start with http:// or https://".into());
    }
    if client_id.is_empty() {
        return Err("Client ID is required".into());
    }
    let found = ctx.db.oidc_provider().iter().find(|p| p.id == id);
    if found.is_none() {
        return Err("OIDC provider not found".into());
    }
    let mut provider = found.unwrap();
    provider.name = name;
    provider.slug = slug;
    provider.issuer_url = issuer_url;
    provider.client_id = client_id;
    if !client_secret.is_empty() {
        provider.client_secret = client_secret;
    }
    provider.scopes = if scopes.is_empty() { "openid email profile".into() } else { scopes };
    provider.is_active = is_active;
    provider.updated_at = now_ms(ctx);
    ctx.db.oidc_provider().id().update(provider);
    Ok(())
}

#[reducer]
pub fn delete_oidc_provider(ctx: &ReducerContext, id: String) -> Result<(), String> {
    let found = ctx.db.oidc_provider().iter().find(|p| p.id == id);
    if found.is_none() {
        return Err("OIDC provider not found".into());
    }
    ctx.db.oidc_provider().id().delete(&id);
    Ok(())
}

// ─── LDAP Authentication ───────────────────────────────────────────────────────

#[table(accessor = ldap_provider, public)]
#[derive(Debug, Clone)]
pub struct LdapProvider {
    #[primary_key]
    pub id: String,
    pub name: String,
    pub slug: String,
    pub host: String,
    pub port: u16,
    /// Whether to use LDAPS (SSL/TLS)
    pub is_secure: bool,
    /// Distinguished Name of the bind user (empty for anonymous bind)
    pub bind_dn: String,
    pub bind_password: String,
    /// Base DN for user searches, e.g. "dc=example,dc=com"
    pub base_dn: String,
    /// LDAP filter to find users, e.g. "(uid={{username}})" — {{username}} is replaced with the login input
    pub user_filter: String,
    /// LDAP attribute that holds the username/login (e.g. "uid", "cn", "sAMAccountName")
    pub username_attribute: String,
    /// LDAP attribute that holds the email address (e.g. "mail")
    pub email_attribute: String,
    /// LDAP attribute that holds the display name (e.g. "displayName", "cn")
    pub name_attribute: String,
    /// Default role assigned to new LDAP users
    pub default_role: String,
    /// If true, automatically create wiki accounts for authenticated LDAP users
    pub auto_register: bool,
    pub is_active: bool,
    pub created_by: String,
    pub created_at: u64,
    pub updated_at: u64,
}

/// Tracks which wiki users are linked to LDAP directory entries
#[table(accessor = ldap_user, public)]
#[derive(Debug, Clone)]
pub struct LdapUser {
    #[primary_key]
    pub id: String,
    pub user_id: String,
    pub ldap_provider_id: String,
    /// Full DN of the user in LDAP
    pub dn: String,
    /// Unique external ID (e.g. objectGUID or entryUUID)
    pub external_id: String,
    pub last_synced_at: u64,
    pub created_at: u64,
}

#[reducer]
pub fn add_ldap_provider(
    ctx: &ReducerContext,
    id: String,
    name: String,
    slug: String,
    host: String,
    port: u16,
    is_secure: bool,
    bind_dn: String,
    bind_password: String,
    base_dn: String,
    user_filter: String,
    username_attribute: String,
    email_attribute: String,
    name_attribute: String,
    default_role: String,
    auto_register: bool,
    created_by: String,
) -> Result<(), String> {
    if host.is_empty() {
        return Err("LDAP host is required".into());
    }
    if base_dn.is_empty() {
        return Err("Base DN is required".into());
    }
    if user_filter.is_empty() {
        return Err("User filter is required".into());
    }
    let valid_roles = ["admin", "member", "viewer"];
    let role_clean = if valid_roles.contains(&default_role.as_str()) { default_role.clone() } else { "member".into() };
    let now = now_ms(ctx);
    ctx.db.ldap_provider().insert(LdapProvider {
        id, name, slug, host, port, is_secure,
        bind_dn, bind_password, base_dn, user_filter,
        username_attribute, email_attribute, name_attribute,
        default_role: role_clean,
        auto_register, is_active: true,
        created_by, created_at: now, updated_at: now,
    });
    Ok(())
}

#[reducer]
pub fn update_ldap_provider(
    ctx: &ReducerContext,
    id: String,
    name: String,
    slug: String,
    host: String,
    port: u16,
    is_secure: bool,
    bind_dn: String,
    bind_password: String,
    base_dn: String,
    user_filter: String,
    username_attribute: String,
    email_attribute: String,
    name_attribute: String,
    default_role: String,
    auto_register: bool,
    is_active: bool,
) -> Result<(), String> {
    if host.is_empty() {
        return Err("LDAP host is required".into());
    }
    if base_dn.is_empty() {
        return Err("Base DN is required".into());
    }
    let found = ctx.db.ldap_provider().iter().find(|p| p.id == id);
    if found.is_none() {
        return Err("LDAP provider not found".into());
    }
    let mut provider = found.unwrap();
    provider.name = name;
    provider.slug = slug;
    provider.host = host;
    provider.port = port;
    provider.is_secure = is_secure;
    provider.bind_dn = bind_dn;
    if !bind_password.is_empty() {
        provider.bind_password = bind_password;
    }
    provider.base_dn = base_dn;
    provider.user_filter = user_filter;
    provider.username_attribute = if username_attribute.is_empty() { "uid".into() } else { username_attribute };
    provider.email_attribute = if email_attribute.is_empty() { "mail".into() } else { email_attribute };
    provider.name_attribute = if name_attribute.is_empty() { "cn".into() } else { name_attribute };
    let valid_roles = ["admin", "member", "viewer"];
    provider.default_role = if valid_roles.contains(&default_role.as_str()) { default_role } else { "member".into() };
    provider.auto_register = auto_register;
    provider.is_active = is_active;
    provider.updated_at = now_ms(ctx);
    ctx.db.ldap_provider().id().update(provider);
    Ok(())
}

#[reducer]
pub fn delete_ldap_provider(ctx: &ReducerContext, id: String) -> Result<(), String> {
    let found = ctx.db.ldap_provider().iter().find(|p| p.id == id);
    if found.is_none() {
        return Err("LDAP provider not found".into());
    }
    // Also delete linked ldap_user records
    for u in ctx.db.ldap_user().iter().filter(|u| u.ldap_provider_id == id).map(|u| u.id.clone()).collect::<Vec<_>>() {
        ctx.db.ldap_user().id().delete(&u);
    }
    ctx.db.ldap_provider().id().delete(&id);
    Ok(())
}

#[reducer]
pub fn link_ldap_user(
    ctx: &ReducerContext,
    id: String,
    user_id: String,
    ldap_provider_id: String,
    dn: String,
    external_id: String,
) -> Result<(), String> {
    let now = now_ms(ctx);
    ctx.db.ldap_user().insert(LdapUser {
        id, user_id, ldap_provider_id, dn, external_id,
        last_synced_at: now, created_at: now,
    });
    Ok(())
}

// ─── Page Analytics ───────────────────────────────────────────────────────────

#[table(accessor = page_view, public)]
#[derive(Debug, Clone)]
pub struct PageView {
    #[primary_key]
    pub id: String,
    pub page_id: String,
    pub user_id: String,
    /// Client IP or "anonymous"
    pub viewer: String,
    pub viewed_at: u64,
}

#[reducer]
pub fn record_page_view(
    ctx: &ReducerContext,
    page_id: String,
    viewer: String,
) -> Result<(), String> {
    let now = now_ms(ctx);
    // Deduplicate by page + viewer within the last 5 minutes to avoid spam
    let five_min_ago = now.saturating_sub(300_000);
    let recent = ctx.db.page_view().iter()
        .filter(|v| v.page_id == page_id && v.viewer == viewer && v.viewed_at > five_min_ago)
        .count();
    if recent > 0 {
        return Ok(());  // Already counted this viewer recently
    }
    ctx.db.page_view().insert(PageView {
        id: make_id("pv", ctx),
        page_id,
        user_id: String::new(),
        viewer,
        viewed_at: now,
    });
    Ok(())
}

// ─── App Settings (key-value store) ──────────────────────────────────────────

#[table(accessor = app_setting, public)]
#[derive(Debug, Clone)]
pub struct AppSetting {
    #[primary_key]
    pub key: String,
    pub value: String,
    pub updated_at: u64,
}

#[reducer]
pub fn set_app_setting(ctx: &ReducerContext, key: String, value: String) -> Result<(), String> {
    let now = now_ms(ctx);
    let existing = ctx.db.app_setting().iter().find(|s| s.key == key);
    if let Some(mut setting) = existing {
        setting.value = value;
        setting.updated_at = now;
        ctx.db.app_setting().key().update(setting);
    } else {
        ctx.db.app_setting().insert(AppSetting {
            key: key.clone(),
            value,
            updated_at: now,
        });
    }
    Ok(())
}

/// Purge expired trash pages based on the trash_retention_days setting.
/// If the setting is 0 (or unset), all trashed pages are purged (current behavior).
/// If the setting is > 0, only pages whose deleted_at is older than N days are permanently deleted.
#[reducer]
pub fn purge_expired_trash(ctx: &ReducerContext) -> Result<(), String> {
    let retention_setting = ctx.db.app_setting().iter()
        .find(|s| s.key == "trash_retention_days")
        .map(|s| s.value.parse::<u64>().unwrap_or(0))
        .unwrap_or(0);

    let now = now_ms(ctx);
    let cutoff = if retention_setting > 0 {
        now.saturating_sub(retention_setting * 86_400_000)
    } else {
        0 // purge all
    };

    let to_purge: Vec<String> = ctx.db.page().iter()
        .filter(|p| {
            p.status == "deleted" && (retention_setting == 0 || p.deleted_at < cutoff)
        })
        .map(|p| p.id.clone())
        .collect();

    for page_id in to_purge {
        let _ = delete_page_permanent(ctx, page_id);
    }
    Ok(())
}

// ─── Real-time Collaboration (Yjs CRDT) ─────────────────────────────────────────
//
// Uses an append-only log of Yjs updates per page. Clients broadcast their Yjs
// binary updates via `broadcast_yjs_update`, and all connected clients receive
// them via STDB subscriptions and apply them to their local Yjs document.
//
// Awareness (cursor presence) uses the `collab_session` table: users join/leave
// as they open/close pages, and update their cursor position on every move.

#[table(accessor = collab_update, public)]
#[derive(Debug, Clone)]
pub struct CollabUpdate {
    #[primary_key]
    pub id: String,
    pub page_id: String,
    /// Base64-encoded Yjs binary update (the diff/state)
    pub update_data: String,
    pub user_id: String,
    pub created_at: u64,
}

#[table(accessor = collab_session, public)]
#[derive(Debug, Clone)]
pub struct CollabSession {
    #[primary_key]
    pub id: String,
    pub page_id: String,
    pub user_id: String,
    pub user_name: String,
    pub color: String,
    /// JSON: { "from": number, "to": number } or null
    pub cursor_position: String,
    pub last_seen_at: u64,
    pub joined_at: u64,
}

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

// ─── Batch operations (for sidebar multi-select) ────────────────────────────

#[reducer]
pub fn batch_set_page_status(ctx: &ReducerContext, page_ids: Vec<String>, status: String) -> Result<(), String> {
    let valid_statuses = ["draft", "published", "archived", "deleted"];
    if !valid_statuses.contains(&status.as_str()) {
        return Err("Invalid status".into());
    }
    let now = now_ms(ctx);
    for id in &page_ids {
        if let Some(mut page) = ctx.db.page().iter().find(|p| &p.id == id) {
            page.status = status.clone();
            page.updated_at = now;
            if status == "published" && page.published_at == 0 {
                page.published_at = now;
            }
            if status == "deleted" {
                page.deleted_at = now;
            }
            if status != "deleted" {
                page.deleted_at = 0;
            }
            ctx.db.page().id().update(page);
        }
    }
    Ok(())
}

#[reducer]
pub fn batch_move_pages(
    ctx: &ReducerContext,
    page_ids: Vec<String>,
    new_collection_id: String,
) -> Result<(), String> {
    let now = now_ms(ctx);
    for id in &page_ids {
        if let Some(mut page) = ctx.db.page().iter().find(|p| &p.id == id) {
            page.collection_id = new_collection_id.clone();
            page.updated_at = now;
            ctx.db.page().id().update(page);
        }
    }
    Ok(())
}

#[reducer]
pub fn batch_delete_pages(ctx: &ReducerContext, page_ids: Vec<String>) -> Result<(), String> {
    for id in &page_ids {
        let _ = delete_page_permanent(ctx, id.clone());
    }
    Ok(())
}

#[reducer]
pub fn batch_add_tag(
    ctx: &ReducerContext,
    page_ids: Vec<String>,
    tag_name: String,
    tag_value: String,
) -> Result<(), String> {
    for id in &page_ids {
        // Skip if tag already exists for this page
        let exists = ctx.db.page_tag().iter()
            .any(|t| t.page_id == *id && t.name == tag_name && t.value == tag_value);
        if !exists {
            ctx.db.page_tag().insert(PageTag {
                id: make_id("tag", ctx),
                page_id: id.clone(),
                name: tag_name.clone(),
                value: tag_value.clone(),
            });
        }
    }
    Ok(())
}

// ─── AI Assistant ─────────────────────────────────────���───────────────────────

#[table(accessor = ai_config, public)]
#[derive(Debug, Clone)]
pub struct AiConfig {
    #[primary_key]
    pub key: String,
    pub value: String,
    pub updated_at: u64,
}

#[table(accessor = ai_chat_session, public)]
#[derive(Debug, Clone)]
pub struct AiChatSession {
    #[primary_key]
    pub id: String,
    pub user_id: String,
    pub title: String,
    /// Optional page ID that provides context for the chat (RAG)
    pub page_context_id: String,
    pub created_at: u64,
    pub updated_at: u64,
}

#[table(accessor = ai_chat_message, public)]
#[derive(Debug, Clone)]
pub struct AiChatMessage {
    #[primary_key]
    pub id: String,
    pub session_id: String,
    pub role: String,  // "user" | "assistant" | "system"
    pub content: String,
    pub created_at: u64,
}

#[reducer]
pub fn set_ai_config(ctx: &ReducerContext, key: String, value: String) -> Result<(), String> {
    let now = now_ms(ctx);
    let existing = ctx.db.ai_config().iter().find(|c| c.key == key);
    if let Some(mut config) = existing {
        config.value = value;
        config.updated_at = now;
        ctx.db.ai_config().key().update(config);
    } else {
        ctx.db.ai_config().insert(AiConfig {
            key: key.clone(),
            value,
            updated_at: now,
        });
    }
    Ok(())
}

#[reducer]
pub fn create_ai_chat_session(
    ctx: &ReducerContext,
    id: String,
    user_id: String,
    title: String,
    page_context_id: String,
) -> Result<(), String> {
    let now = now_ms(ctx);
    ctx.db.ai_chat_session().insert(AiChatSession {
        id,
        user_id,
        title,
        page_context_id,
        created_at: now,
        updated_at: now,
    });
    Ok(())
}

#[reducer]
pub fn add_ai_chat_message(
    ctx: &ReducerContext,
    id: String,
    session_id: String,
    role: String,
    content: String,
) -> Result<(), String> {
    let valid_roles = ["user", "assistant", "system"];
    if !valid_roles.contains(&role.as_str()) {
        return Err("Invalid role. Must be user, assistant, or system".into());
    }
    let now = now_ms(ctx);
    ctx.db.ai_chat_message().insert(AiChatMessage {
        id,
        session_id: session_id.clone(),
        role,
        content,
        created_at: now,
    });
    // Update session's updated_at
    if let Some(mut session) = ctx.db.ai_chat_session().iter().find(|s| s.id == session_id) {
        session.updated_at = now;
        ctx.db.ai_chat_session().id().update(session);
    }
    Ok(())
}

#[reducer]
pub fn delete_ai_chat_session(ctx: &ReducerContext, id: String) -> Result<(), String> {
    // Delete all messages in the session
    for msg in ctx.db.ai_chat_message().iter().filter(|m| m.session_id == id) {
        ctx.db.ai_chat_message().id().delete(&msg.id);
    }
    ctx.db.ai_chat_session().id().delete(&id);
    Ok(())
}

#[reducer]
pub fn delete_ai_chat_message(ctx: &ReducerContext, id: String) -> Result<(), String> {
    ctx.db.ai_chat_message().id().delete(&id);
    Ok(())
}

// ─── SCIM Provisioning (Identity Management) ───────────────────────────────
//
// SCIM 2.0 (RFC 7642-7644) — System for Cross-domain Identity Management.
// Allows external IdPs (Okta, Azure AD, OneLogin) to auto-provision users
// and groups into the wiki via a standard REST API.

#[table(accessor = scim_provider, public)]
#[derive(Debug, Clone)]
pub struct ScimProvider {
    #[primary_key]
    pub id: String,
    pub name: String,
    pub slug: String,
    /// Bearer token the SCIM client (IdP) must present when calling our SCIM API
    pub api_token_hash: String,
    /// Whether this provider is active — SCIM API calls from inactive providers are rejected
    pub is_active: bool,
    /// Which user role to assign auto-provisioned users (admin, member, viewer)
    pub default_role: String,
    /// Whether to auto-register users who don't exist yet
    pub auto_register: bool,
    /// Whether to deactivate (set role=viewer) or delete users when deprovisioned
    pub deprovision_behavior: String, // "deactivate" | "delete"
    /// When true, groups pushed from SCIM are also created in the wiki groups system
    pub sync_groups: bool,
    pub created_by: String,
    pub created_at: u64,
    pub updated_at: u64,
}

#[table(accessor = scim_event, public)]
#[derive(Debug, Clone)]
pub struct ScimEvent {
    #[primary_key]
    pub id: String,
    pub provider_id: String,
    /// SCIM resource type: "User" | "Group"
    pub resource_type: String,
    /// SCIM operation: "POST" | "PUT" | "PATCH" | "DELETE"
    pub operation: String,
    /// SCIM external ID (the IdP's user/group ID)
    pub external_id: String,
    /// Wiki user ID or group ID affected
    pub local_id: String,
    /// Outcome: "success" | "skipped" | "error"
    pub status: String,
    /// Human-readable detail about what happened
    pub detail: String,
    pub created_at: u64,
}

#[reducer]
pub fn add_scim_provider(
    ctx: &ReducerContext,
    id: String,
    name: String,
    slug: String,
    api_token: String,
    default_role: String,
    auto_register: bool,
    deprovision_behavior: String,
    sync_groups: bool,
    created_by: String,
) -> Result<(), String> {
    if name.is_empty() {
        return Err("Name is required".into());
    }
    if slug.is_empty() {
        return Err("Slug is required".into());
    }
    if api_token.is_empty() {
        return Err("API token is required".into());
    }
    let valid_behaviors = ["deactivate", "delete"];
    if !valid_behaviors.contains(&deprovision_behavior.as_str()) {
        return Err("Deprovision behavior must be 'deactivate' or 'delete'".into());
    }
    let valid_roles = ["admin", "member", "viewer"];
    let role_clean = if valid_roles.contains(&default_role.as_str()) { default_role } else { "member".into() };
    let api_token_hash = hash_password(&api_token);
    let now = now_ms(ctx);
    ctx.db.scim_provider().insert(ScimProvider {
        id, name, slug,
        api_token_hash,
        is_active: true,
        default_role: role_clean,
        auto_register,
        deprovision_behavior,
        sync_groups,
        created_by,
        created_at: now,
        updated_at: now,
    });
    Ok(())
}

#[reducer]
pub fn update_scim_provider(
    ctx: &ReducerContext,
    id: String,
    name: String,
    slug: String,
    api_token: String,
    default_role: String,
    auto_register: bool,
    deprovision_behavior: String,
    sync_groups: bool,
    is_active: bool,
) -> Result<(), String> {
    if name.is_empty() {
        return Err("Name is required".into());
    }
    let valid_behaviors = ["deactivate", "delete"];
    if !valid_behaviors.contains(&deprovision_behavior.as_str()) {
        return Err("Deprovision behavior must be 'deactivate' or 'delete'".into());
    }
    let found = ctx.db.scim_provider().iter().find(|p| p.id == id);
    if found.is_none() {
        return Err("SCIM provider not found".into());
    }
    let mut provider = found.unwrap();
    provider.name = name;
    provider.slug = slug;
    if !api_token.is_empty() {
        provider.api_token_hash = hash_password(&api_token);
    }
    let valid_roles = ["admin", "member", "viewer"];
    let role_clean = if valid_roles.contains(&default_role.as_str()) { default_role } else { "member".into() };
    provider.default_role = role_clean;
    provider.auto_register = auto_register;
    provider.deprovision_behavior = deprovision_behavior;
    provider.sync_groups = sync_groups;
    provider.is_active = is_active;
    provider.updated_at = now_ms(ctx);
    ctx.db.scim_provider().id().update(provider);
    Ok(())
}

#[reducer]
pub fn delete_scim_provider(ctx: &ReducerContext, id: String) -> Result<(), String> {
    let found = ctx.db.scim_provider().iter().find(|p| p.id == id);
    if found.is_none() {
        return Err("SCIM provider not found".into());
    }
    // Clean up events for this provider
    let events: Vec<String> = ctx.db.scim_event().iter()
        .filter(|e| e.provider_id == id)
        .map(|e| e.id.clone())
        .collect();
    for eid in events {
        ctx.db.scim_event().id().delete(&eid);
    }
    ctx.db.scim_provider().id().delete(&id);
    Ok(())
}

#[reducer]
pub fn record_scim_event(
    ctx: &ReducerContext,
    id: String,
    provider_id: String,
    resource_type: String,
    operation: String,
    external_id: String,
    local_id: String,
    status: String,
    detail: String,
) -> Result<(), String> {
    ctx.db.scim_event().insert(ScimEvent {
        id, provider_id, resource_type, operation, external_id,
        local_id, status, detail,
        created_at: now_ms(ctx),
    });
    Ok(())
}

/// SCIM sync: create or update a user from SCIM data.
/// Returns the wiki user ID.
#[reducer]
pub fn scim_sync_user(
    ctx: &ReducerContext,
    email: String,
    name: String,
    _external_id: String,
    _provider_id: String,
    default_role: String,
    auto_register: bool,
) -> Result<(), String> {
    let now = now_ms(ctx);
    let existing = ctx.db.user().iter().find(|u| u.email == email);
    if let Some(mut user) = existing {
        // Update existing user's name if it changed
        if user.name != name {
            user.name = name;
            user.updated_at = now;
            ctx.db.user().id().update(user);
        }
        return Ok(());
    }
    if !auto_register {
        return Err(format!("User '{}' not found and auto_register is disabled", email));
    }
    let valid_roles = ["admin", "member", "viewer"];
    let role_clean = if valid_roles.contains(&default_role.as_str()) { default_role } else { "member".into() };
    let user_id = make_id("scim_user", ctx);
    // Generate a random password for SCIM-provisioned users (they'll use SSO)
    let random_password = format!("scim_{:x}", now);
    ctx.db.user().insert(User {
        id: user_id.clone(),
        name,
        email,
        password_hash: hash_password(&random_password),
        role: role_clean,
        avatar_url: String::new(),
        created_at: now,
        updated_at: now,
    });
    Ok(())
}

/// SCIM sync: deprovision a user (deactivate or delete).
#[reducer]
pub fn scim_deprovision_user(
    ctx: &ReducerContext,
    email: String,
    behavior: String,
) -> Result<(), String> {
    let existing = ctx.db.user().iter().find(|u| u.email == email);
    if existing.is_none() {
        return Ok(()); // User already gone
    }
    let mut user = existing.unwrap();
    let now = now_ms(ctx);
    if behavior == "delete" {
        ctx.db.user().id().delete(&user.id);
    } else {
        // Deactivate: set role to viewer (cannot write)
        user.role = "viewer".into();
        user.updated_at = now;
        ctx.db.user().id().update(user);
    }
    Ok(())
}

/// SCIM sync: create or update a group from SCIM data.
#[reducer]
pub fn scim_sync_group(
    ctx: &ReducerContext,
    group_id: String,
    name: String,
    _external_id: String,
    provider_id: String,
) -> Result<(), String> {
    let now = now_ms(ctx);
    let existing = ctx.db.group().iter().find(|g| g.name == name);
    if let Some(mut group) = existing {
        group.name = name;
        group.updated_at = now;
        ctx.db.group().id().update(group);
        return Ok(());
    }
    // Create new group
    ctx.db.group().insert(Group {
        id: group_id.clone(),
        name,
        description: format!("SCIM-provisioned group from provider {}", provider_id),
        created_by: "scim".into(),
        created_at: now,
        updated_at: now,
    });
    Ok(())
}

#[reducer]
pub fn scim_deprovision_group(
    ctx: &ReducerContext,
    group_name: String,
) -> Result<(), String> {
    let existing = ctx.db.group().iter().find(|g| g.name == group_name);
    if let Some(group) = existing {
        // Delete group memberships
        for member in ctx.db.group_member().iter().filter(|m| m.group_id == group.id) {
            ctx.db.group_member().id().delete(&member.id);
        }
        ctx.db.group().id().delete(&group.id);
    }
    Ok(())
}

// ─── Passkeys / WebAuthn ──────────────────────────────────────────────────
//
// WebAuthn (FIDO2/Passkeys) passwordless authentication.
// Credentials are stored as COSE public keys verified by the API server.
// Challenges are stored in STDB for the registration/authentication flow.

#[table(accessor = passkey_credential, public)]
#[derive(Debug, Clone)]
pub struct PasskeyCredential {
    #[primary_key]
    pub id: String,
    pub user_id: String,
    /// Base64url-encoded credential ID (from browser)
    pub credential_id: String,
    /// Base64-encoded COSE public key bytes
    pub public_key: String,
    /// Signature counter — monotonically increasing
    pub counter: u64,
    /// JSON array of transport types, e.g. ["internal","usb","nfc","ble"]
    pub transports: String,
    /// User-agent / device description shown in the UI
    pub device_name: String,
    pub created_at: u64,
    pub last_used_at: u64,
}

#[table(accessor = passkey_challenge, public)]
#[derive(Debug, Clone)]
pub struct PasskeyChallenge {
    #[primary_key]
    pub challenge: String,
    /// Empty for authentication, user email for registration
    pub user_handle: String,
    /// "registration" | "authentication"
    pub purpose: String,
    pub created_at: u64,
    pub expires_at: u64,
}

#[reducer]
pub fn store_passkey_credential(
    ctx: &ReducerContext,
    id: String,
    user_id: String,
    credential_id: String,
    public_key: String,
    counter: u64,
    transports: String,
    device_name: String,
) -> Result<(), String> {
    if credential_id.is_empty() {
        return Err("credential_id is required".into());
    }
    if public_key.is_empty() {
        return Err("public_key is required".into());
    }
    let now = now_ms(ctx);
    // Check for duplicate credential_id
    let existing = ctx.db.passkey_credential().iter()
        .find(|c| c.credential_id == credential_id);
    if existing.is_some() {
        // Update counter and last_used (re-registration of same credential)
        let mut cred = existing.unwrap();
        cred.counter = counter;
        cred.last_used_at = now;
        ctx.db.passkey_credential().id().update(cred);
        return Ok(());
    }
    ctx.db.passkey_credential().insert(PasskeyCredential {
        id,
        user_id,
        credential_id,
        public_key,
        counter,
        transports,
        device_name,
        created_at: now,
        last_used_at: now,
    });
    Ok(())
}

#[reducer]
pub fn create_passkey_challenge(
    ctx: &ReducerContext,
    challenge: String,
    user_handle: String,
    purpose: String,
) -> Result<(), String> {
    let valid_purposes = ["registration", "authentication"];
    if !valid_purposes.contains(&purpose.as_str()) {
        return Err("Purpose must be 'registration' or 'authentication'".into());
    }
    let now = now_ms(ctx);
    // Expire after 5 minutes
    let expires_at = now + 300_000;
    // Clean up any existing challenges for this user/purpose
    let stale: Vec<String> = ctx.db.passkey_challenge().iter()
        .filter(|c| {
            (purpose == "registration" && c.user_handle == user_handle && c.purpose == purpose)
            || (purpose == "authentication" && c.purpose == purpose)
            || c.expires_at < now
        })
        .map(|c| c.challenge.clone())
        .collect();
    for c in stale {
        ctx.db.passkey_challenge().challenge().delete(&c);
    }
    ctx.db.passkey_challenge().insert(PasskeyChallenge {
        challenge,
        user_handle,
        purpose,
        created_at: now,
        expires_at,
    });
    Ok(())
}

#[reducer]
pub fn consume_passkey_challenge(
    ctx: &ReducerContext,
    challenge: String,
) -> Result<(), String> {
    let found = ctx.db.passkey_challenge().iter().find(|c| c.challenge == challenge);
    if found.is_none() {
        return Err("Challenge not found".into());
    }
    let now = now_ms(ctx);
    let c = found.unwrap();
    if c.expires_at < now {
        ctx.db.passkey_challenge().challenge().delete(&challenge);
        return Err("Challenge has expired".into());
    }
    ctx.db.passkey_challenge().challenge().delete(&challenge);
    Ok(())
}

#[reducer]
pub fn update_passkey_counter(
    ctx: &ReducerContext,
    credential_id: String,
    counter: u64,
) -> Result<(), String> {
    let found = ctx.db.passkey_credential().iter().find(|c| c.credential_id == credential_id);
    if found.is_none() {
        return Err("Credential not found".into());
    }
    let mut cred = found.unwrap();
    let now = now_ms(ctx);
    cred.counter = counter;
    cred.last_used_at = now;
    ctx.db.passkey_credential().id().update(cred);
    Ok(())
}

#[reducer]
pub fn delete_passkey_credential(
    ctx: &ReducerContext,
    id: String,
) -> Result<(), String> {
    let found = ctx.db.passkey_credential().iter().find(|c| c.id == id);
    if found.is_none() {
        return Err("Credential not found".into());
    }
    ctx.db.passkey_credential().id().delete(&id);
    Ok(())
}

#[table(accessor = db_base, public)]
#[derive(Debug, Clone)]
pub struct DbBase {
    #[primary_key]
    pub id: String,
    pub page_id: String,
    pub title: String,
    pub view_type: String, // "table" | "kanban"
    pub created_by: String,
    pub created_at: u64,
    pub updated_at: u64,
}

#[table(accessor = db_column, public)]
#[derive(Debug, Clone)]
pub struct DbColumn {
    #[primary_key]
    pub id: String,
    pub base_id: String,
    pub name: String,
    pub field_type: String, // "text","number","select","multi_select","date","checkbox","user","url"
    pub options: String,    // JSON: { "choices": ["a","b","c"] } for select types
    pub sort_order: u32,
    pub created_at: u64,
    pub updated_at: u64,
}

#[table(accessor = db_row, public)]
#[derive(Debug, Clone)]
pub struct DbRow {
    #[primary_key]
    pub id: String,
    pub base_id: String,
    pub sort_order: u32,
    pub created_by: String,
    pub created_at: u64,
    pub updated_at: u64,
}

#[table(accessor = db_cell, public)]
#[derive(Debug, Clone)]
pub struct DbCell {
    #[primary_key]
    pub id: String,
    pub row_id: String,
    pub column_id: String,
    pub value: String, // JSON value: string, number, or array for multi_select
    pub created_at: u64,
    pub updated_at: u64,
}

#[reducer]
pub fn create_db_base(
    ctx: &ReducerContext,
    id: String,
    page_id: String,
    title: String,
    view_type: String,
    created_by: String,
) -> Result<(), String> {
    let valid_views = ["table", "kanban"];
    if !valid_views.contains(&view_type.as_str()) {
        return Err("Invalid view_type. Must be 'table' or 'kanban'".into());
    }
    let now = now_ms(ctx);
    ctx.db.db_base().insert(DbBase {
        id,
        page_id,
        title,
        view_type,
        created_by,
        created_at: now,
        updated_at: now,
    });
    Ok(())
}

#[reducer]
pub fn create_db_column(
    ctx: &ReducerContext,
    id: String,
    base_id: String,
    name: String,
    field_type: String,
    options: String,
    sort_order: u32,
) -> Result<(), String> {
    let valid_types = ["text", "number", "select", "multi_select", "date", "checkbox", "user", "url"];
    if !valid_types.contains(&field_type.as_str()) {
        return Err(format!("Invalid field_type '{}'. Must be one of: text, number, select, multi_select, date, checkbox, user, url", field_type));
    }
    let now = now_ms(ctx);
    ctx.db.db_column().insert(DbColumn {
        id,
        base_id,
        name,
        field_type,
        options,
        sort_order,
        created_at: now,
        updated_at: now,
    });
    Ok(())
}

#[reducer]
pub fn create_db_row(
    ctx: &ReducerContext,
    id: String,
    base_id: String,
    sort_order: u32,
    created_by: String,
) -> Result<(), String> {
    let now = now_ms(ctx);
    ctx.db.db_row().insert(DbRow {
        id,
        base_id,
        sort_order,
        created_by,
        created_at: now,
        updated_at: now,
    });
    Ok(())
}

#[reducer]
pub fn update_db_cell(
    ctx: &ReducerContext,
    id: String,
    row_id: String,
    column_id: String,
    value: String,
) -> Result<(), String> {
    let now = now_ms(ctx);
    let existing = ctx.db.db_cell().iter().find(|c| c.row_id == row_id && c.column_id == column_id);
    if let Some(mut cell) = existing {
        cell.value = value;
        cell.updated_at = now;
        ctx.db.db_cell().id().update(cell);
    } else {
        ctx.db.db_cell().insert(DbCell {
            id,
            row_id: row_id.clone(),
            column_id: column_id.clone(),
            value,
            created_at: now,
            updated_at: now,
        });
    }
    // Also update the parent row's updated_at
    if let Some(mut row) = ctx.db.db_row().iter().find(|r| r.id == row_id) {
        row.updated_at = now;
        ctx.db.db_row().id().update(row);
    }
    Ok(())
}

#[reducer]
pub fn set_db_cell(
    ctx: &ReducerContext,
    row_id: String,
    column_id: String,
    value: String,
) -> Result<(), String> {
    let now = now_ms(ctx);
    let existing = ctx.db.db_cell().iter().find(|c| c.row_id == row_id && c.column_id == column_id);
    if let Some(mut cell) = existing {
        cell.value = value;
        cell.updated_at = now;
        ctx.db.db_cell().id().update(cell);
    } else {
        ctx.db.db_cell().insert(DbCell {
            id: make_id("dbc", ctx),
            row_id: row_id.clone(),
            column_id: column_id.clone(),
            value,
            created_at: now,
            updated_at: now,
        });
    }
    if let Some(mut row) = ctx.db.db_row().iter().find(|r| r.id == row_id) {
        row.updated_at = now;
        ctx.db.db_row().id().update(row);
    }
    Ok(())
}

#[reducer]
pub fn delete_db_row(ctx: &ReducerContext, row_id: String) -> Result<(), String> {
    for cell in ctx.db.db_cell().iter().filter(|c| c.row_id == row_id) {
        ctx.db.db_cell().id().delete(&cell.id);
    }
    ctx.db.db_row().id().delete(&row_id);
    Ok(())
}

#[reducer]
pub fn delete_db_base(ctx: &ReducerContext, base_id: String) -> Result<(), String> {
    // Delete all rows (and their cells)
    for row in ctx.db.db_row().iter().filter(|r| r.base_id == base_id) {
        for cell in ctx.db.db_cell().iter().filter(|c| c.row_id == row.id) {
            ctx.db.db_cell().id().delete(&cell.id);
        }
        ctx.db.db_row().id().delete(&row.id);
    }
    // Delete all columns
    for col in ctx.db.db_column().iter().filter(|c| c.base_id == base_id) {
        ctx.db.db_column().id().delete(&col.id);
    }
    ctx.db.db_base().id().delete(&base_id);
    Ok(())
}

#[reducer]
pub fn reorder_db_rows(
    ctx: &ReducerContext,
    row_ids: Vec<String>,
    new_sort_order: Vec<u32>,
) -> Result<(), String> {
    if row_ids.len() != new_sort_order.len() {
        return Err("row_ids and new_sort_order must have the same length".into());
    }
    let now = now_ms(ctx);
    for (i, row_id) in row_ids.iter().enumerate() {
        if let Some(mut row) = ctx.db.db_row().iter().find(|r| &r.id == row_id) {
            row.sort_order = new_sort_order[i];
            row.updated_at = now;
            ctx.db.db_row().id().update(row);
        }
    }
    Ok(())
}

// ─── Invitations / Guest Users (P4) ────────────────────────────────────────────
//
// Admins can invite external users by email, granting limited access to specific
// pages and/or collections. Invitations are accepted via a unique token link.

#[table(accessor = invitation, public)]
#[derive(Debug, Clone)]
pub struct Invitation {
    #[primary_key]
    pub id: String,
    pub email: String,
    /// The wiki user who created the invitation (must be admin)
    pub invited_by: String,
    /// Role to assign on acceptance: "viewer" (default) | "member"
    pub role: String,
    /// JSON array of page IDs the guest gets access to, e.g. '["page_1","page_2"]'
    pub page_ids: String,
    /// JSON array of collection IDs the guest gets access to, e.g. '["col_1"]'
    pub collection_ids: String,
    /// Unique token for the invitation link (URL-safe random string)
    pub token: String,
    /// "pending" | "accepted" | "expired" | "revoked"
    pub status: String,
    /// Optional personal message shown to the invitee
    pub message: String,
    /// Max acceptance deadline (ms epoch), 0 = never expires
    pub expires_at: u64,
    /// How many times the invite link was opened
    pub view_count: u32,
    pub created_at: u64,
    pub updated_at: u64,
}

#[reducer]
pub fn create_invitation(
    ctx: &ReducerContext,
    id: String,
    email: String,
    invited_by: String,
    role: String,
    page_ids: String,
    collection_ids: String,
    token: String,
    message: String,
    expires_days: u32,
) -> Result<(), String> {
    if email.trim().is_empty() || !email.contains('@') {
        return Err("A valid email address is required".into());
    }
    // Only admins can invite
    let inviter = ctx.db.user().iter().find(|u| u.id == invited_by);
    if inviter.is_none() || inviter.unwrap().role != "admin" {
        return Err("Only admins can create invitations".into());
    }
    // Check for existing pending invitation for this email
    let existing = ctx.db.invitation().iter()
        .find(|i| i.email == email && i.status == "pending");
    if existing.is_some() {
        return Err("There is already a pending invitation for this email".into());
    }
    if token.len() < 16 {
        return Err("Token must be at least 16 characters".into());
    }
    let valid_roles = ["viewer", "member"];
    let role_clean = if valid_roles.contains(&role.as_str()) { role } else { "viewer".into() };

    // Validate JSON arrays (must parse as Vec<String>)
    if !page_ids.is_empty() {
        if serde_json::from_str::<Vec<String>>(&page_ids).is_err() {
            return Err("page_ids must be a valid JSON array of strings or empty".into());
        }
    }
    if !collection_ids.is_empty() {
        if serde_json::from_str::<Vec<String>>(&collection_ids).is_err() {
            return Err("collection_ids must be a valid JSON array of strings or empty".into());
        }
    }

    let now = now_ms(ctx);
    let expires_at = if expires_days > 0 {
        now + (expires_days as u64) * 86_400_000
    } else {
        0
    };
    ctx.db.invitation().insert(Invitation {
        id,
        email,
        invited_by,
        role: role_clean,
        page_ids,
        collection_ids,
        token,
        status: "pending".into(),
        message,
        expires_at,
        view_count: 0,
        created_at: now,
        updated_at: now,
    });
    Ok(())
}

#[reducer]
pub fn accept_invitation(
    ctx: &ReducerContext,
    token: String,
    user_id: String,
) -> Result<(), String> {
    let now = now_ms(ctx);
    let inv = ctx.db.invitation().iter()
        .find(|i| i.token == token && i.status == "pending");
    if inv.is_none() {
        return Err("Invitation not found or already used".into());
    }
    let invitation = inv.unwrap();
    // Check expiry
    if invitation.expires_at > 0 && now > invitation.expires_at {
        let mut expired = invitation;
        expired.status = "expired".into();
        expired.updated_at = now;
        ctx.db.invitation().id().update(expired);
        return Err("Invitation has expired".into());
    }
    // Verify the email matches
    let user = ctx.db.user().iter().find(|u| u.id == user_id);
    if user.is_none() {
        return Err("User not found".into());
    }
    let user = user.unwrap();
    if user.email.to_lowercase() != invitation.email.to_lowercase() {
        return Err("This invitation was sent to a different email address".into());
    }
    // Grant page-level permissions for each page in page_ids
    if !invitation.page_ids.is_empty() {
        if let Ok(page_ids) = serde_json::from_str::<Vec<String>>(&invitation.page_ids) {
            for page_id in &page_ids {
                let perm_id = make_id("pp", ctx);
                ctx.db.page_permission().insert(PagePermission {
                    id: perm_id,
                    page_id: page_id.clone(),
                    user_id: user_id.clone(),
                    group_id: String::new(),
                    role: invitation.role.clone(),
                    created_at: now,
                });
            }
        }
    }
    // Add to collection memberships for each collection in collection_ids
    if !invitation.collection_ids.is_empty() {
        if let Ok(col_ids) = serde_json::from_str::<Vec<String>>(&invitation.collection_ids) {
            for col_id in &col_ids {
                let cm_id = make_id("cm", ctx);
                ctx.db.collection_member().insert(CollectionMember {
                    id: cm_id,
                    collection_id: col_id.clone(),
                    user_id: user_id.clone(),
                    role: invitation.role.clone(),
                    added_by: invitation.invited_by.clone(),
                    created_at: now,
                });
            }
        }
    }
    // Mark invitation as accepted
    let mut inv_mut = invitation;
    inv_mut.status = "accepted".into();
    inv_mut.updated_at = now;
    ctx.db.invitation().id().update(inv_mut);
    Ok(())
}

#[reducer]
pub fn revoke_invitation(ctx: &ReducerContext, id: String, revoked_by: String) -> Result<(), String> {
    let inviter = ctx.db.user().iter().find(|u| u.id == revoked_by);
    if inviter.is_none() || inviter.unwrap().role != "admin" {
        return Err("Only admins can revoke invitations".into());
    }
    let found = ctx.db.invitation().iter().find(|i| i.id == id);
    if found.is_none() {
        return Err("Invitation not found".into());
    }
    let mut inv = found.unwrap();
    if inv.status != "pending" {
        return Err("Can only revoke pending invitations".into());
    }
    inv.status = "revoked".into();
    inv.updated_at = now_ms(ctx);
    ctx.db.invitation().id().update(inv);
    Ok(())
}

#[reducer]
pub fn record_invitation_view(ctx: &ReducerContext, token: String) -> Result<(), String> {
    let found = ctx.db.invitation().iter().find(|i| i.token == token);
    if let Some(mut inv) = found {
        inv.view_count += 1;
        ctx.db.invitation().id().update(inv);
    }
    Ok(())
}

// ─── Synced Blocks (P4) — edit once, update everywhere ──────────────────────────

#[table(accessor = synced_block, public)]
#[derive(Debug, Clone)]
pub struct SyncedBlock {
    #[primary_key]
    pub id: String,
    pub title: String,
    /// Prosemirror JSON content of the block
    pub content: String,
    pub created_by: String,
    pub created_at: u64,
    pub updated_at: u64,
    pub updated_by: String,
}

#[table(accessor = synced_block_ref, public)]
#[derive(Debug, Clone)]
pub struct SyncedBlockRef {
    #[primary_key]
    pub id: String,
    /// The synced block this reference points to
    pub block_id: String,
    /// The page that contains this reference
    pub page_id: String,
    pub created_by: String,
    pub created_at: u64,
}

#[reducer]
pub fn create_synced_block(
    ctx: &ReducerContext,
    id: String,
    title: String,
    content: String,
    created_by: String,
) -> Result<(), String> {
    if title.trim().is_empty() {
        return Err("Title is required".into());
    }
    let now = now_ms(ctx);
    ctx.db.synced_block().insert(SyncedBlock {
        id,
        title,
        content,
        created_by: created_by.clone(),
        created_at: now,
        updated_at: now,
        updated_by: created_by,
    });
    Ok(())
}

#[reducer]
pub fn update_synced_block(
    ctx: &ReducerContext,
    id: String,
    title: String,
    content: String,
    updated_by: String,
) -> Result<(), String> {
    let now = now_ms(ctx);
    if let Some(mut block) = ctx.db.synced_block().id().find(&id) {
        block.title = title;
        block.content = content;
        block.updated_at = now;
        block.updated_by = updated_by;
        ctx.db.synced_block().id().update(block);
        Ok(())
    } else {
        Err("Synced block not found".into())
    }
}

#[reducer]
pub fn delete_synced_block(ctx: &ReducerContext, id: String) -> Result<(), String> {
    // Delete all references first
    for refe in ctx.db.synced_block_ref().iter().filter(|r| r.block_id == id) {
        ctx.db.synced_block_ref().id().delete(&refe.id);
    }
    ctx.db.synced_block().id().delete(&id);
    Ok(())
}

#[reducer]
pub fn add_synced_block_ref(
    ctx: &ReducerContext,
    id: String,
    block_id: String,
    page_id: String,
    created_by: String,
) -> Result<(), String> {
    if ctx.db.synced_block().id().find(&block_id).is_none() {
        return Err("Synced block not found".into());
    }
    let now = now_ms(ctx);
    ctx.db.synced_block_ref().insert(SyncedBlockRef {
        id,
        block_id,
        page_id,
        created_by,
        created_at: now,
    });
    Ok(())
}

#[reducer]
pub fn remove_synced_block_ref(ctx: &ReducerContext, id: String) -> Result<(), String> {
    ctx.db.synced_block_ref().id().delete(&id);
    Ok(())
}

// ─── MFA / TOTP Authentication ───────────────────────────────────────────────

#[table(accessor = mfa_method, public)]
#[derive(Debug, Clone)]
pub struct MfaMethod {
    #[primary_key]
    pub id: String,
    pub user_id: String,
    /// "totp" for now; extensible for future methods like "sms", "email"
    pub method_type: String,
    /// base32-encoded TOTP secret
    pub totp_secret: String,
    pub is_enabled: bool,
    pub created_at: u64,
    pub updated_at: u64,
}

#[table(accessor = mfa_backup_code, public)]
#[derive(Debug, Clone)]
pub struct MfaBackupCode {
    #[primary_key]
    pub id: String,
    pub user_id: String,
    /// sha256 hash of the backup code
    pub code_hash: String,
    pub is_used: bool,
    pub created_at: u64,
}

#[reducer]
pub fn enable_totp(
    ctx: &ReducerContext,
    user_id: String,
    // base32-encoded TOTP secret
    totp_secret: String,
    // Plain-text backup codes (will be hashed before storing)
    backup_codes: Vec<String>,
) -> Result<(), String> {
    // Validate user exists
    if ctx.db.user().id().find(&user_id).is_none() {
        return Err("User not found".into());
    }
    if totp_secret.is_empty() {
        return Err("TOTP secret is required".into());
    }
    let now = now_ms(ctx);
    let id = format!("mfa_{:x}", now);

    // Upsert: remove existing MFA method for this user first
    let user_id_clone = user_id.clone();
    let existing: Vec<String> = ctx.db.mfa_method().iter()
        .filter(|m| m.user_id == user_id)
        .map(|m| m.id.clone())
        .collect();
    for eid in &existing {
        ctx.db.mfa_method().id().delete(eid);
    }

    ctx.db.mfa_method().insert(MfaMethod {
        id: id.clone(),
        user_id,
        method_type: "totp".into(),
        totp_secret,
        is_enabled: true,
        created_at: now,
        updated_at: now,
    });

    // Store backup codes (hashed)
    for code in &backup_codes {
        if !code.is_empty() {
            let code_hash = hash_password(code);
            let bid = format!("mbc_{:x}", now_ms(ctx) + ctx.db.mfa_backup_code().iter().count() as u64);
            ctx.db.mfa_backup_code().insert(MfaBackupCode {
                id: bid,
                user_id: user_id_clone.clone(),
                code_hash,
                is_used: false,
                created_at: now,
            });
        }
    }

    Ok(())
}

#[reducer]
pub fn disable_mfa(ctx: &ReducerContext, user_id: String) -> Result<(), String> {
    let existing: Vec<String> = ctx.db.mfa_method().iter()
        .filter(|m| m.user_id == user_id)
        .map(|m| m.id.clone())
        .collect();
    for eid in &existing {
        ctx.db.mfa_method().id().delete(eid);
    }
    // Also clean up backup codes
    let codes: Vec<String> = ctx.db.mfa_backup_code().iter()
        .filter(|c| c.user_id == user_id)
        .map(|c| c.id.clone())
        .collect();
    for cid in &codes {
        ctx.db.mfa_backup_code().id().delete(cid);
    }
    Ok(())
}

#[reducer]
pub fn verify_totp(
    ctx: &ReducerContext,
    user_id: String,
    code: u32,
) -> Result<(), String> {
    let method = ctx.db.mfa_method().iter().find(|m| m.user_id == user_id && m.is_enabled);
    match method {
        None => Err("MFA not enabled for this user".into()),
        Some(m) => {
            if m.method_type != "totp" {
                return Err("Unsupported MFA method".into());
            }
            // Decode base32 secret
            let secret = match base32_decode(&m.totp_secret) {
                Some(s) => s,
                None => return Err("Invalid TOTP secret encoding".into()),
            };
            let now = now_ms(ctx);
            if verify_totp_code(&secret, code, now) {
                Ok(())
            } else {
                Err("Invalid TOTP code".into())
            }
        }
    }
}

/// Verify a TOTP code using HMAC-SHA1 (RFC 6238).
/// Checks the current 30-second window and adjacent windows (±1) for clock drift.
fn verify_totp_code(secret: &[u8], code: u32, now_ms: u64) -> bool {
    use hmac::{Hmac, Mac};
    use sha1::Sha1;

    type HmacSha1 = Hmac<Sha1>;

    let time_step: u64 = 30; // 30-second windows
    let counter = now_ms / 1000 / time_step;
    let modulus: u32 = 1_000_000; // 6-digit code

    // Check current, previous, and next time windows for tolerance
    for delta in &[0u64, 1, u64::MAX] {
        let c = if *delta == u64::MAX {
            counter.wrapping_sub(1)
        } else {
            counter + delta
        };

        // Convert counter to 8-byte big-endian
        let mut counter_bytes = [0u8; 8];
        counter_bytes[..8].copy_from_slice(&c.to_be_bytes());

        // Compute HMAC-SHA1
        let mut mac = match HmacSha1::new_from_slice(secret) {
            Ok(m) => m,
            Err(_) => return false,
        };
        mac.update(&counter_bytes);
        let result = mac.finalize();
        let hmac_result = result.into_bytes();

        // Dynamic truncation per RFC 4226
        let offset = (hmac_result[19] & 0x0f) as usize;
        let binary_code = u32::from_be_bytes([
            hmac_result[offset] & 0x7f,
            hmac_result[offset + 1],
            hmac_result[offset + 2],
            hmac_result[offset + 3],
        ]);
        let otp = binary_code % modulus;

        if otp == code {
            return true;
        }
    }
    false
}

/// Simple RFC 4648 base32 decoding (no padding required)
#[reducer]
pub fn verify_mfa_backup_code(
    ctx: &ReducerContext,
    user_id: String,
    code: String,
) -> Result<(), String> {
    let code_hash = hash_password(&code);
    let found = ctx.db.mfa_backup_code().iter()
        .find(|c| c.user_id == user_id && c.code_hash == code_hash && !c.is_used);
    match found {
        None => Err("Invalid or already used backup code".into()),
        Some(c) => {
            let mut updated = c.clone();
            updated.is_used = true;
            ctx.db.mfa_backup_code().id().update(updated);
            Ok(())
        }
    }
}

/// Simple RFC 4648 base32 decoding (no padding required)
fn base32_decode(input: &str) -> Option<Vec<u8>> {
    let chars: Vec<char> = input.to_uppercase().chars().filter(|c| *c != ' ').collect();
    if chars.is_empty() {
        return None;
    }
    let alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";
    let mut bits = 0u64;
    let mut bit_count = 0u32;
    let mut output = Vec::new();

    for &ch in &chars {
        let val = alphabet.find(ch)? as u64;
        bits = (bits << 5) | val;
        bit_count += 5;
        if bit_count >= 8 {
            bit_count -= 8;
            output.push((bits >> bit_count) as u8);
            bits &= (1 << bit_count) - 1;
        }
    }
    Some(output)
}

// ─── Watch / Notification System (P2) ─────────────────────────────────────────
// Allows users to watch pages and collections, receiving in-app notifications
// when those watched items are updated by other users.

#[table(accessor = watch, public)]
#[derive(Debug, Clone)]
pub struct Watch {
    #[primary_key]
    pub id: String,
    pub user_id: String,
    /// "page" or "collection"
    pub target_type: String,
    pub target_id: String,
    pub created_at: u64,
}

#[table(accessor = notification, public)]
#[derive(Debug, Clone)]
pub struct Notification {
    #[primary_key]
    pub id: String,
    /// The user who receives this notification
    pub user_id: String,
    /// "page.create" | "page.update" | "page.delete" | "page.publish" | "page.archive" |
    /// "comment.create" | "collection.create" | "collection.update" | "collection.delete"
    pub event_type: String,
    /// The target ID (page_id, collection_id, etc.)
    pub target_id: String,
    /// Human-readable title for display in the notification dropdown
    pub title: String,
    /// Human-readable message body
    pub message: String,
    /// The user who triggered the event
    pub actor_id: String,
    /// Icon/emoji for the notification (e.g. page icon, or a generic icon)
    pub icon: String,
    /// Whether the notification has been read
    pub is_read: bool,
    pub created_at: u64,
}

#[reducer]
pub fn toggle_watch(
    ctx: &ReducerContext,
    id: String,
    user_id: String,
    target_type: String,
    target_id: String,
) -> Result<(), String> {
    if target_type != "page" && target_type != "collection" {
        return Err("target_type must be 'page' or 'collection'".into());
    }
    // Check if watch already exists (toggle off)
    let existing = ctx.db.watch().iter()
        .find(|w| w.user_id == user_id && w.target_type == target_type && w.target_id == target_id);
    if let Some(w) = existing {
        ctx.db.watch().id().delete(&w.id);
        return Ok(());
    }
    ctx.db.watch().insert(Watch {
        id,
        user_id,
        target_type,
        target_id,
        created_at: now_ms(ctx),
    });
    Ok(())
}

#[reducer]
pub fn create_notification(
    ctx: &ReducerContext,
    id: String,
    user_id: String,
    event_type: String,
    target_id: String,
    title: String,
    message: String,
    actor_id: String,
    icon: String,
) -> Result<(), String> {
    let valid_events = [
        "page.create", "page.update", "page.delete",
        "page.publish", "page.archive",
        "comment.create", "collection.create",
        "collection.update", "collection.delete",
    ];
    if !valid_events.contains(&event_type.as_str()) {
        return Err("Invalid event type for notification".into());
    }
    ctx.db.notification().insert(Notification {
        id,
        user_id,
        event_type,
        target_id,
        title,
        message,
        actor_id,
        icon,
        is_read: false,
        created_at: now_ms(ctx),
    });
    Ok(())
}

#[reducer]
pub fn mark_notification_read(ctx: &ReducerContext, id: String) -> Result<(), String> {
    let found = ctx.db.notification().iter().find(|n| n.id == id);
    if found.is_none() {
        return Err("Notification not found".into());
    }
    let mut notif = found.unwrap();
    notif.is_read = true;
    ctx.db.notification().id().update(notif);
    Ok(())
}

#[reducer]
pub fn mark_all_notifications_read(ctx: &ReducerContext, user_id: String) -> Result<(), String> {
    let to_update: Vec<String> = ctx.db.notification().iter()
        .filter(|n| n.user_id == user_id && !n.is_read)
        .map(|n| n.id.clone())
        .collect();
    for id in &to_update {
        if let Some(mut n) = ctx.db.notification().iter().find(|n| &n.id == id) {
            n.is_read = true;
            ctx.db.notification().id().update(n);
        }
    }
    Ok(())
}

#[reducer]
pub fn delete_notification(ctx: &ReducerContext, id: String) -> Result<(), String> {
    ctx.db.notification().id().delete(&id);
    Ok(())
}

#[reducer]
pub fn clear_all_notifications(ctx: &ReducerContext, user_id: String) -> Result<(), String> {
    let to_delete: Vec<String> = ctx.db.notification().iter()
        .filter(|n| n.user_id == user_id)
        .map(|n| n.id.clone())
        .collect();
    for id in &to_delete {
        ctx.db.notification().id().delete(id);
    }
    Ok(())
}

// ─── Auto-notify watchers helpers ─────────────────────────────────────────────
// Called from page/comment reducers to automatically create notifications
// for users who watch a given page (or whose watched collection the page lives in).

/// Notify all watchers of a page about an event (page.update, comment.create, etc.).
/// Skips the actor who triggered the event.
fn notify_page_watchers(
    ctx: &ReducerContext,
    page_id: &str,
    event_type: &str,
    actor_id: &str,
    title: &str,
    message: &str,
    icon: &str,
) {
    for watcher in ctx.db.watch().iter().filter(|w| {
        w.target_type == "page" && w.target_id == page_id && w.user_id != actor_id
    }) {
        ctx.db.notification().insert(Notification {
            id: make_id("notif", ctx),
            user_id: watcher.user_id.clone(),
            event_type: event_type.to_string(),
            target_id: page_id.to_string(),
            title: title.to_string(),
            message: message.to_string(),
            actor_id: actor_id.to_string(),
            icon: icon.to_string(),
            is_read: false,
            created_at: now_ms(ctx),
        });
    }
}

/// Notify collection watchers when a new page is created in that collection.
/// Skips the creator.
fn notify_collection_watchers_new_page(
    ctx: &ReducerContext,
    collection_id: &str,
    page_id: &str,
    actor_id: &str,
    title: &str,
    message: &str,
    icon: &str,
) {
    for watcher in ctx.db.watch().iter().filter(|w| {
        w.target_type == "collection" && w.target_id == collection_id && w.user_id != actor_id
    }) {
        ctx.db.notification().insert(Notification {
            id: make_id("notif", ctx),
            user_id: watcher.user_id.clone(),
            event_type: "page.create".to_string(),
            target_id: page_id.to_string(),
            title: title.to_string(),
            message: message.to_string(),
            actor_id: actor_id.to_string(),
            icon: icon.to_string(),
            is_read: false,
            created_at: now_ms(ctx),
        });
    }
}

// ─── Access Request System (P4) ──────────────────────────────────────────────
//
// Outline v1.8.0 feature: allow users to request access to pages they don't have
// permission to view. Page owners and admins are notified and can approve or deny
// the request. Approved requests automatically grant page-level viewer permission.
// Denied requests record the decision for audit.

#[table(accessor = access_request, public)]
#[derive(Debug, Clone)]
pub struct AccessRequest {
    #[primary_key]
    pub id: String,
    /// The page the user wants access to
    pub page_id: String,
    /// The user requesting access
    pub requester_id: String,
    /// Optional user-supplied reason for the request
    pub reason: String,
    /// "pending" | "approved" | "denied"
    pub status: String,
    /// Who responded (admin or page owner) — empty if still pending
    pub responded_by: String,
    /// When the request was resolved (ms epoch), 0 if still pending
    pub responded_at: u64,
    pub created_at: u64,
}

#[reducer]
pub fn create_access_request(
    ctx: &ReducerContext,
    id: String,
    page_id: String,
    requester_id: String,
    reason: String,
) -> Result<(), String> {
    // Check page exists
    let page = ctx.db.page().id().find(&page_id);
    if page.is_none() {
        return Err("Page not found".into());
    }
    let page = page.unwrap();

    // Check user exists
    let user = ctx.db.user().id().find(&requester_id);
    if user.is_none() {
        return Err("User not found".into());
    }

    // Check if user already has a pending request for this page
    let existing = ctx.db.access_request().iter().find(|r| {
        r.page_id == page_id && r.requester_id == requester_id && r.status == "pending"
    });
    if existing.is_some() {
        return Err("You already have a pending access request for this page".into());
    }

    let now = now_ms(ctx);
    let reason_clone = reason.clone();
    ctx.db.access_request().insert(AccessRequest {
        id,
        page_id: page_id.clone(),
        requester_id: requester_id.clone(),
        reason,
        status: "pending".into(),
        responded_by: String::new(),
        responded_at: 0,
        created_at: now,
    });

    // Notify the page creator/owner and all admins about the access request
    let requester_name = user.unwrap().name.clone();
    let page_title = page.title.clone();
    let message = format!(
        "{} requested access to page \"{}\"",
        requester_name, page_title
    );

    // Notify page owner
    if page.created_by != requester_id {
        let _ = ctx.db.notification().insert(Notification {
            id: make_id("notif", ctx),
            user_id: page.created_by.clone(),
            event_type: "access_request".to_string(),
            target_id: page_id.clone(),
            title: "Access Request".to_string(),
            message: message.clone(),
            actor_id: requester_id.clone(),
            icon: "🔑".into(),
            is_read: false,
            created_at: now,
        });
    }

    // Also notify all admins about the request
    for admin in ctx.db.user().iter().filter(|u| u.role == "admin" && u.id != requester_id && u.id != page.created_by) {
        let _ = ctx.db.notification().insert(Notification {
            id: make_id("notif", ctx),
            user_id: admin.id.clone(),
            event_type: "access_request".to_string(),
            target_id: page_id.clone(),
            title: "Access Request".to_string(),
            message: message.clone(),
            actor_id: requester_id.clone(),
            icon: "🔑".into(),
            is_read: false,
            created_at: now,
        });
    }

    log_event(
        ctx,
        "access_request.create",
        &requester_id,
        &page_id,
        &page_title,
        &format!(r#"{{"reason":"{}"}}"#, reason_clone.replace('"', "\\\"")),
    );
    Ok(())
}

#[reducer]
pub fn approve_access_request(
    ctx: &ReducerContext,
    id: String,
    responder_id: String,
) -> Result<(), String> {
    let request = ctx.db.access_request().id().find(&id);
    if request.is_none() {
        return Err("Access request not found".into());
    }
    let request = request.unwrap();
    if request.status != "pending" {
        return Err("Access request is not pending".into());
    }

    let now = now_ms(ctx);

    // Grant page-level viewer permission
    let perm_id = make_id("pp", ctx);
    ctx.db.page_permission().insert(PagePermission {
        id: perm_id,
        page_id: request.page_id.clone(),
        user_id: request.requester_id.clone(),
        group_id: String::new(),
        role: "viewer".into(),
        created_at: now,
    });

    // Update request status
    let mut req = request;
    req.status = "approved".into();
    req.responded_by = responder_id.clone();
    req.responded_at = now;
    let req_page_id = req.page_id.clone();
    let req_id = req.id.clone();
    let req_requester_id = req.requester_id.clone();
    ctx.db.access_request().id().update(req);

    // Notify the requester that their request was approved
    let _ = ctx.db.notification().insert(Notification {
        id: make_id("notif", ctx),
        user_id: req_requester_id,
        event_type: "access_request.approved".to_string(),
        target_id: req_page_id.clone(),
        title: "Access Approved".to_string(),
        message: format!("Your request to access \"{}\" has been approved", {
            ctx.db.page().id().find(&req_page_id).map(|p| p.title).unwrap_or_default()
        }),
        actor_id: responder_id.clone(),
        icon: "✅".into(),
        is_read: false,
        created_at: now,
    });

    log_event(ctx, "access_request.approve", &responder_id, &req_page_id, &req_id, r#"{}"#);
    Ok(())
}

#[reducer]
pub fn deny_access_request(
    ctx: &ReducerContext,
    id: String,
    responder_id: String,
) -> Result<(), String> {
    let request = ctx.db.access_request().id().find(&id);
    if request.is_none() {
        return Err("Access request not found".into());
    }
    let request = request.unwrap();
    if request.status != "pending" {
        return Err("Access request is not pending".into());
    }

    let now = now_ms(ctx);
    let mut req = request;
    req.status = "denied".into();
    req.responded_by = responder_id.clone();
    req.responded_at = now;
    let req_page_id = req.page_id.clone();
    let req_id = req.id.clone();
    let req_requester_id = req.requester_id.clone();
    ctx.db.access_request().id().update(req);

    // Notify the requester that their request was denied
    let _ = ctx.db.notification().insert(Notification {
        id: make_id("notif", ctx),
        user_id: req_requester_id,
        event_type: "access_request.denied".to_string(),
        target_id: req_page_id.clone(),
        title: "Access Denied".to_string(),
        message: format!("Your request to access \"{}\" has been denied", {
            ctx.db.page().id().find(&req_page_id).map(|p| p.title).unwrap_or_default()
        }),
        actor_id: responder_id.clone(),
        icon: "❌".into(),
        is_read: false,
        created_at: now,
    });

    log_event(ctx, "access_request.deny", &responder_id, &req_page_id, &req_id, r#"{}"#);
    Ok(())
}

// ─── OAuth 2.0 Provider (Slack/Discord/GitHub/GitLab) ──────────────────────

#[table(accessor = oauth_provider, public)]
#[derive(Debug, Clone)]
pub struct OauthProvider {
    #[primary_key]
    pub id: String,
    pub name: String,
    pub slug: String,
    /// Provider type: "slack" | "discord" | "github" | "gitlab" | "generic"
    pub provider_type: String,
    /// OAuth authorize endpoint URL
    pub authorize_url: String,
    /// OAuth token endpoint URL
    pub token_url: String,
    /// OAuth userinfo endpoint URL (called with the access token)
    pub userinfo_url: String,
    /// Space-separated scopes, e.g. "openid email profile" or "read:user user:email"
    pub scope: String,
    /// OAuth client ID (public)
    pub client_id: String,
    /// OAuth client secret (stored encrypted)
    pub client_secret: String,
    /// Icon identifier for the login button, e.g. "slack", "discord", "github"
    pub icon: String,
    pub is_active: bool,
    /// If true, auto-register users who authenticate successfully
    pub auto_register: bool,
    /// Default role for auto-registered users
    pub default_role: String,
    pub created_by: String,
    pub created_at: u64,
    pub updated_at: u64,
}

/// Tracks which wiki users are linked to OAuth provider accounts
#[table(accessor = oauth_user, public)]
#[derive(Debug, Clone)]
pub struct OauthUser {
    #[primary_key]
    pub id: String,
    pub user_id: String,
    pub provider_id: String,
    /// The external user ID from the OAuth provider (e.g. GitHub user ID, Slack user ID)
    pub external_id: String,
    /// The external username/login from the provider (e.g. GitHub handle)
    pub external_username: String,
    /// Email from the provider (used for matching existing users)
    pub external_email: String,
    /// Stored encrypted access token for API calls (e.g. Slack bot token)
    pub access_token: String,
    pub refresh_token: String,
    pub token_expires_at: u64,
    pub last_synced_at: u64,
    pub created_at: u64,
    pub updated_at: u64,
}

#[reducer]
pub fn add_oauth_provider(
    ctx: &ReducerContext,
    id: String,
    name: String,
    slug: String,
    provider_type: String,
    authorize_url: String,
    token_url: String,
    userinfo_url: String,
    scope: String,
    client_id: String,
    client_secret: String,
    icon: String,
    auto_register: bool,
    default_role: String,
    created_by: String,
) -> Result<(), String> {
    let valid_types = ["slack", "discord", "github", "gitlab", "generic"];
    if !valid_types.contains(&provider_type.as_str()) {
        return Err("Invalid provider type. Must be one of: slack, discord, github, gitlab, generic".into());
    }
    if name.is_empty() {
        return Err("Provider name is required".into());
    }
    if client_id.is_empty() {
        return Err("Client ID is required".into());
    }
    if client_secret.is_empty() {
        return Err("Client secret is required".into());
    }
    if authorize_url.is_empty() || token_url.is_empty() || userinfo_url.is_empty() {
        return Err("authorize_url, token_url, and userinfo_url are required".into());
    }
    let valid_roles = ["admin", "member", "viewer"];
    let role_clean = if valid_roles.contains(&default_role.as_str()) { default_role.clone() } else { "member".into() };
    let scopes_clean = if scope.is_empty() {
        match provider_type.as_str() {
            "slack" => "openid email profile".into(),
            "discord" => "identify email".into(),
            "github" => "read:user user:email".into(),
            "gitlab" => "read_user".into(),
            _ => "openid email profile".into(),
        }
    } else { scope };
    let now = now_ms(ctx);
    let provider_type_clone = provider_type.clone();
    ctx.db.oauth_provider().insert(OauthProvider {
        id, name, slug, provider_type,
        authorize_url, token_url, userinfo_url,
        scope: scopes_clean, client_id, client_secret,
        icon: if icon.is_empty() { provider_type_clone.clone() } else { icon },
        is_active: true, auto_register,
        default_role: role_clean,
        created_by, created_at: now, updated_at: now,
    });
    Ok(())
}

#[reducer]
pub fn update_oauth_provider(
    ctx: &ReducerContext,
    id: String,
    name: String,
    slug: String,
    provider_type: String,
    authorize_url: String,
    token_url: String,
    userinfo_url: String,
    scope: String,
    client_id: String,
    client_secret: String,
    icon: String,
    auto_register: bool,
    default_role: String,
    is_active: bool,
) -> Result<(), String> {
    let found = ctx.db.oauth_provider().iter().find(|p| p.id == id);
    if found.is_none() {
        return Err("OAuth provider not found".into());
    }
    let valid_types = ["slack", "discord", "github", "gitlab", "generic"];
    if !valid_types.contains(&provider_type.as_str()) {
        return Err("Invalid provider type".into());
    }
    if name.is_empty() {
        return Err("Provider name is required".into());
    }
    if client_id.is_empty() {
        return Err("Client ID is required".into());
    }
    let mut provider = found.unwrap();
    provider.name = name;
    provider.slug = slug;
    provider.provider_type = provider_type;
    provider.authorize_url = authorize_url;
    provider.token_url = token_url;
    provider.userinfo_url = userinfo_url;
    if !scope.is_empty() {
        provider.scope = scope;
    }
    provider.client_id = client_id;
    if !client_secret.is_empty() {
        provider.client_secret = client_secret;
    }
    provider.icon = if icon.is_empty() { provider.provider_type.clone() } else { icon };
    provider.auto_register = auto_register;
    let valid_roles = ["admin", "member", "viewer"];
    provider.default_role = if valid_roles.contains(&default_role.as_str()) { default_role } else { "member".into() };
    provider.is_active = is_active;
    provider.updated_at = now_ms(ctx);
    ctx.db.oauth_provider().id().update(provider);
    Ok(())
}

#[reducer]
pub fn delete_oauth_provider(ctx: &ReducerContext, id: String) -> Result<(), String> {
    let found = ctx.db.oauth_provider().iter().find(|p| p.id == id);
    if found.is_none() {
        return Err("OAuth provider not found".into());
    }
    // Remove linked OAuth user records
    let linked: Vec<String> = ctx.db.oauth_user().iter()
        .filter(|u| u.provider_id == id)
        .map(|u| u.id.clone())
        .collect();
    for uid in &linked {
        ctx.db.oauth_user().id().delete(uid);
    }
    ctx.db.oauth_provider().id().delete(&id);
    Ok(())
}

#[reducer]
pub fn link_oauth_user(
    ctx: &ReducerContext,
    id: String,
    user_id: String,
    provider_id: String,
    external_id: String,
    external_username: String,
    external_email: String,
    access_token: String,
    refresh_token: String,
    token_expires_at: u64,
) -> Result<(), String> {
    if ctx.db.user().id().find(&user_id).is_none() {
        return Err("User not found".into());
    }
    if ctx.db.oauth_provider().id().find(&provider_id).is_none() {
        return Err("OAuth provider not found".into());
    }
    let now = now_ms(ctx);
    ctx.db.oauth_user().insert(OauthUser {
        id, user_id, provider_id, external_id, external_username, external_email,
        access_token, refresh_token, token_expires_at,
        last_synced_at: now, created_at: now, updated_at: now,
    });
    Ok(())
}

#[reducer]
pub fn unlink_oauth_user(ctx: &ReducerContext, id: String) -> Result<(), String> {
    let found = ctx.db.oauth_user().id().find(&id);
    if found.is_none() {
        return Err("OAuth user link not found".into());
    }
    ctx.db.oauth_user().id().delete(&id);
    Ok(())
}
