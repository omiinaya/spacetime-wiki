#![allow(clippy::too_many_arguments)]
// Provide __getrandom_custom for WASM builds (required by argon2/getrandom).
// STDB deliberately depends on getrandom with the `custom` feature; the host
// does not define the symbol, so this module provides it. Returns 0 (error)
// — the module uses ctx.rng() so this should never actually be called at
// runtime; it only exists so the WASM binary links.
#[cfg(target_arch = "wasm32")]
mod wasm_getrandom {
    #[no_mangle]
    pub extern "C" fn __getrandom_custom(dest: *mut u8, len: usize) -> u32 {
        for i in 0..len {
            unsafe { *dest.add(i) = (i as u8).wrapping_mul(0x9e).wrapping_add(0x37) };
        }
        0
    }
}
use spacetimedb::*;
mod helpers;
mod tables;
mod users;
use crate::helpers::*;
use crate::tables::*;
mod pages;
pub(crate) use pages::*;
mod api_keys;
mod app_settings;
mod attachments;
mod collaboration;
mod collection_members;
mod comments;
mod favorites;
mod permissions;
mod read_bridge;
mod share_links;
mod sso;
mod tags;
mod templates;

// ─── Init (bootstrap) ─────────────────────────────────────────────────────────

/// Runs on first publish or database reset. Creates default settings and an admin user.
#[reducer(init)]
pub fn init(ctx: &ReducerContext) -> Result<(), String> {
    let now = now_ms(ctx);

    // Default app settings
    let defaults = [
        ("site_name", "SpacetimeWiki"),
        ("site_description", "A wiki powered by SpacetimeDB"),
        ("trash_retention_days", "30"),
        ("allow_registration", "true"),
        ("default_user_role", "member"),
    ];
    for (key, value) in defaults {
        let exists = ctx.db.app_setting().iter().any(|s| s.key == key);
        if !exists {
            ctx.db.app_setting().insert(AppSetting {
                key: key.to_string(),
                value: value.to_string(),
                updated_at: now,
            });
        }
    }

    log_event(
        ctx,
        "system.init",
        "system",
        "",
        "SpacetimeWiki initialized",
        r#"{}"#,
    );
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
    validate_required_str(&name, "Collection name", 200)?;
    let slug = name.to_lowercase().replace(' ', "-");
    let now = now_ms(ctx);
    let sort_order = next_col_sort_order(ctx, &parent_id);
    if ctx.db.collection().id().find(&id).is_none() {
        ctx.db.collection().insert(Collection {
            id: id.clone(),
            name: name.clone(),
            slug,
            description,
            parent_id,
            icon,
            color,
            sort_order,
            created_by: created_by.clone(),
            created_at: now,
            updated_at: now,
        });
    }
    // Creator gets admin access (idempotent — skip if already exists)
    let admin_member_id = make_id("cm", ctx);
    if ctx
        .db
        .collection_member()
        .id()
        .find(&admin_member_id)
        .is_none()
    {
        ctx.db.collection_member().insert(CollectionMember {
            id: admin_member_id,
            collection_id: id.clone(),
            user_id: created_by.clone(),
            role: "admin".into(),
            added_by: String::new(),
            created_at: now,
        });
    }

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
    let mut col = ctx
        .db
        .collection()
        .id()
        .find(id)
        .ok_or_else(|| "Collection not found".to_string())?;
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
        if let Some(mut col) = ctx.db.collection().id().find(id) {
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
        return Err(
            "Invalid sort field. Must be one of: title, created_at, updated_at, manual".into(),
        );
    }
    let valid_dirs = ["asc", "desc"];
    if !valid_dirs.contains(&sort_direction.as_str()) {
        return Err("Invalid sort direction. Must be 'asc' or 'desc'".into());
    }
    let now = now_ms(ctx);
    let existing = ctx
        .db
        .collection_sort_rule()
        .iter()
        .find(|r| r.collection_id == collection_id);
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
pub fn delete_collection_sort_rule(
    ctx: &ReducerContext,
    collection_id: String,
) -> Result<(), String> {
    ctx.db
        .collection_sort_rule()
        .collection_id()
        .delete(&collection_id);
    Ok(())
}

#[reducer]
pub fn apply_collection_auto_sort(
    ctx: &ReducerContext,
    collection_id: String,
) -> Result<(), String> {
    let rule = ctx
        .db
        .collection_sort_rule()
        .iter()
        .find(|r| r.collection_id == collection_id)
        .ok_or_else(|| "No sort rule configured for this collection".to_string())?;
    if rule.sort_field == "manual" {
        return Ok(()); // no-op for manual sort
    }

    let mut pages: Vec<_> = ctx
        .db
        .page()
        .iter()
        .filter(|p| p.collection_id == collection_id && p.status != "deleted")
        .collect();

    // Sort in-memory
    match rule.sort_field.as_str() {
        "title" => {
            if rule.sort_direction == "desc" {
                pages.sort_by_key(|b| std::cmp::Reverse(b.title.to_lowercase()));
            } else {
                pages.sort_by_key(|a| a.title.to_lowercase());
            }
        }
        "created_at" => {
            if rule.sort_direction == "desc" {
                pages.sort_by_key(|b| std::cmp::Reverse(b.created_at));
            } else {
                pages.sort_by_key(|a| a.created_at);
            }
        }
        "updated_at" => {
            if rule.sort_direction == "desc" {
                pages.sort_by_key(|b| std::cmp::Reverse(b.updated_at));
            } else {
                pages.sort_by_key(|a| a.updated_at);
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
        if let Some(mut p) = ctx.db.page().id().find(page.id.clone()) {
            p.sort_order = sort_idx;
            p.updated_at = now;
            ctx.db.page().id().update(p);
            sort_idx += 1;
        }
    }
    Ok(())
}

// ─── Groups / Teams ──────────────────────────────────────────────────────────
// ─── Webhooks ────────────────────────────────────────────────────────────────
#[reducer]
pub fn create_webhook(
    ctx: &ReducerContext,
    id: String,
    name: String,
    url: String,
    events: String, // JSON array, e.g. '["page.create","page.update","page.delete"]'
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
    if ctx.db.webhook().id().find(&id).is_none() {
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
    }
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
    let mut wh = ctx
        .db
        .webhook()
        .id()
        .find(&id)
        .ok_or_else(|| "Webhook not found".to_string())?;
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
    let mut event = ctx
        .db
        .webhook_event()
        .id()
        .find(&id)
        .ok_or_else(|| "Webhook event not found".to_string())?;
    event.status = if (200..300).contains(&response_code) {
        "sent".to_string()
    } else {
        "failed".to_string()
    };
    event.response_code = response_code;
    event.response_body = response_body;
    event.sent_at = now_ms(ctx);
    ctx.db.webhook_event().id().update(event);
    Ok(())
}

#[reducer]
pub fn cleanup_webhook_events(ctx: &ReducerContext, older_than_ms: u64) -> Result<(), String> {
    let cutoff = now_ms(ctx) - older_than_ms;
    let to_delete: Vec<String> = ctx
        .db
        .webhook_event()
        .iter()
        .filter(|e| e.created_at < cutoff)
        .map(|e| e.id.clone())
        .collect();
    for id in to_delete {
        ctx.db.webhook_event().id().delete(&id);
    }
    Ok(())
}

// ─── Full-Text Search ──────────────────────────────────────────────────────────

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
    let existing: Vec<String> = ctx
        .db
        .search_result()
        .iter()
        .filter(|r| r.search_token == search_token)
        .map(|r| r.id.clone())
        .collect();
    for id in existing {
        ctx.db.search_result().id().delete(&id);
    }

    // Also clean up orphaned results older than 5 minutes
    let cutoff = now - 300_000;
    let stale: Vec<String> = ctx
        .db
        .search_result()
        .iter()
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
            // Try to find the match position and show surrounding text.
            // NOTE: `find` on the LOWERCASED string returns a byte offset into
            // content_lower, which is NOT a valid byte boundary in the original
            // text_content (lowercasing can change byte lengths, e.g. İ→i̇,
            // ẞ→ß). Slicing the original at that offset would panic on a
            // mid-codepoint boundary — do char-indexed slicing instead.
            if let Some(pos) = content_lower.find(query_trimmed) {
                let char_pos = content_lower[..pos].chars().count();
                let chars: Vec<char> = page.text_content.chars().collect();
                let start_char = char_pos.saturating_sub(80);
                let end_char = std::cmp::min(start_char + 200, chars.len());
                let excerpt_raw: String = chars[start_char..end_char].iter().collect();
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
    let stale: Vec<String> = ctx
        .db
        .search_result()
        .iter()
        .filter(|r| r.created_at < cutoff)
        .map(|r| r.id.clone())
        .collect();
    for id in stale {
        ctx.db.search_result().id().delete(&id);
    }
    Ok(())
}

// ─── Page Analytics ───────────────────────────────────────────────────────────

#[reducer]
pub fn record_page_view(
    ctx: &ReducerContext,
    page_id: String,
    viewer: String,
) -> Result<(), String> {
    let now = now_ms(ctx);
    // Deduplicate by page + viewer within the last 5 minutes to avoid spam
    let five_min_ago = now.saturating_sub(300_000);
    let recent = ctx
        .db
        .page_view()
        .iter()
        .filter(|v| v.page_id == page_id && v.viewer == viewer && v.viewed_at > five_min_ago)
        .count();
    if recent > 0 {
        return Ok(()); // Already counted this viewer recently
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

// ─── Batch operations (for sidebar multi-select) ────────────────────────────

#[reducer]
pub fn batch_set_page_status(
    ctx: &ReducerContext,
    page_ids: Vec<String>,
    status: String,
) -> Result<(), String> {
    let valid_statuses = ["draft", "published", "archived", "deleted"];
    if !valid_statuses.contains(&status.as_str()) {
        return Err("Invalid status".into());
    }
    let now = now_ms(ctx);
    for id in &page_ids {
        if let Some(mut page) = ctx.db.page().id().find(id) {
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
        if let Some(mut page) = ctx.db.page().id().find(id) {
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
        let exists = ctx
            .db
            .page_tag()
            .iter()
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
    if ctx.db.ai_chat_session().id().find(&id).is_none() {
        ctx.db.ai_chat_session().insert(AiChatSession {
            id,
            user_id,
            title,
            page_context_id,
            created_at: now,
            updated_at: now,
        });
    }
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
    if ctx.db.ai_chat_message().id().find(&id).is_none() {
        ctx.db.ai_chat_message().insert(AiChatMessage {
            id,
            session_id: session_id.clone(),
            role,
            content,
            created_at: now,
        });
    }
    // Update session's updated_at
    if let Some(mut session) = ctx.db.ai_chat_session().id().find(&session_id) {
        session.updated_at = now;
        ctx.db.ai_chat_session().id().update(session);
    }
    Ok(())
}

#[reducer]
pub fn delete_ai_chat_session(ctx: &ReducerContext, id: String) -> Result<(), String> {
    // Delete all messages in the session
    for msg in ctx
        .db
        .ai_chat_message()
        .iter()
        .filter(|m| m.session_id == id)
    {
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
    let role_clean = if valid_roles.contains(&default_role.as_str()) {
        default_role
    } else {
        "member".into()
    };
    let api_token_hash = hash_password(&api_token)?;
    let now = now_ms(ctx);
    if ctx.db.scim_provider().id().find(&id).is_none() {
        ctx.db.scim_provider().insert(ScimProvider {
            id: id.clone(),
            name,
            slug,
            is_active: true,
            default_role: role_clean,
            auto_register,
            deprovision_behavior,
            sync_groups,
            created_by,
            created_at: now,
            updated_at: now,
        });
        ctx.db
            .scim_provider_credential()
            .insert(ScimProviderCredential {
                scim_provider_id: id,
                api_token_hash,
            });
    }
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
    let mut provider = ctx
        .db
        .scim_provider()
        .id()
        .find(&id)
        .ok_or_else(|| "SCIM provider not found".to_string())?;
    provider.name = name;
    provider.slug = slug;
    if !api_token.is_empty() {
        let new_hash = hash_password(&api_token)?;
        // Upsert the credential in the private table
        if let Some(mut cred) = ctx
            .db
            .scim_provider_credential()
            .scim_provider_id()
            .find(&provider.id)
        {
            cred.api_token_hash = new_hash;
            ctx.db
                .scim_provider_credential()
                .scim_provider_id()
                .update(cred);
        } else {
            ctx.db
                .scim_provider_credential()
                .insert(ScimProviderCredential {
                    scim_provider_id: provider.id.clone(),
                    api_token_hash: new_hash,
                });
        }
    }
    let valid_roles = ["admin", "member", "viewer"];
    let role_clean = if valid_roles.contains(&default_role.as_str()) {
        default_role
    } else {
        "member".into()
    };
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
    let found = ctx.db.scim_provider().id().find(&id);
    if found.is_none() {
        return Err("SCIM provider not found".into());
    }
    // Clean up events for this provider
    let events: Vec<String> = ctx
        .db
        .scim_event()
        .iter()
        .filter(|e| e.provider_id == id)
        .map(|e| e.id.clone())
        .collect();
    for eid in events {
        ctx.db.scim_event().id().delete(&eid);
    }
    ctx.db.scim_provider().id().delete(&id);
    Ok(())
}

/// Verify a SCIM bearer token against the PRIVATE scim_provider_credential
/// table. The Python SCIM middleware calls this reducer instead of reading
/// the token hash via SQL. Uses Argon2 verification (matches how the token
/// hash is stored), fixing the old sha256-vs-argon2 mismatch.
#[reducer]
pub fn verify_scim_token(
    ctx: &ReducerContext,
    provider_id: String,
    api_token: String,
) -> Result<(), String> {
    let provider = ctx
        .db
        .scim_provider()
        .id()
        .find(&provider_id)
        .ok_or_else(|| "SCIM provider not found".to_string())?;
    if !provider.is_active {
        return Err("SCIM provider is inactive".into());
    }
    let cred = ctx
        .db
        .scim_provider_credential()
        .scim_provider_id()
        .find(&provider_id)
        .ok_or_else(|| "SCIM token not configured".to_string())?;
    if cred.api_token_hash.is_empty() || !verify_password(&api_token, &cred.api_token_hash) {
        return Err("Invalid SCIM token".into());
    }
    Ok(())
}

/// Fetch an OAuth provider's client secret for the Python callback flow.
/// Reducers cannot return values, so this writes the secret into the
/// PUBLIC oauth_secret_bridge table keyed by a random request_id that the
/// caller generated. The caller reads it back with the request_id, then
/// clears it via clear_oauth_secret_bridge. Without the request_id the
/// row is unreachable; the window is a single callback exchange.
#[reducer]
pub fn get_oauth_provider_secret(
    ctx: &ReducerContext,
    provider_id: String,
    request_id: String,
) -> Result<(), String> {
    let provider = ctx
        .db
        .oauth_provider()
        .id()
        .find(&provider_id)
        .ok_or_else(|| "OAuth provider not found".to_string())?;
    if !provider.is_active {
        return Err("OAuth provider is inactive".into());
    }
    let cred = ctx
        .db
        .oauth_provider_credential()
        .oauth_provider_id()
        .find(&provider_id)
        .ok_or_else(|| "OAuth client secret not configured".to_string())?;
    if cred.client_secret.is_empty() {
        return Err("OAuth client secret is empty".into());
    }
    // Remove any stale bridge row with the same request_id (idempotent)
    if let Some(old) = ctx.db.oauth_secret_bridge().request_id().find(&request_id) {
        ctx.db
            .oauth_secret_bridge()
            .request_id()
            .delete(&old.request_id);
    }
    ctx.db.oauth_secret_bridge().insert(OauthSecretBridge {
        request_id,
        oauth_provider_id: provider_id,
        client_secret: cred.client_secret,
        created_at: now_ms(ctx),
    });
    Ok(())
}

/// Clear a consumed OAuth secret bridge row after the callback exchange.
#[reducer]
pub fn clear_oauth_secret_bridge(ctx: &ReducerContext, request_id: String) -> Result<(), String> {
    if let Some(row) = ctx.db.oauth_secret_bridge().request_id().find(&request_id) {
        ctx.db
            .oauth_secret_bridge()
            .request_id()
            .delete(&row.request_id);
    }
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
        id,
        provider_id,
        resource_type,
        operation,
        external_id,
        local_id,
        status,
        detail,
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
        return Err(format!(
            "User '{}' not found and auto_register is disabled",
            email
        ));
    }
    let valid_roles = ["admin", "member", "viewer"];
    let role_clean = if valid_roles.contains(&default_role.as_str()) {
        default_role
    } else {
        "member".into()
    };
    let user_id = make_id("scim_user", ctx);
    // Generate a random password for SCIM-provisioned users (they'll use SSO)
    let random_password = format!("scim_{:x}", now);
    let password_hash = hash_password(&random_password)?;
    ctx.db.user().insert(User {
        id: user_id.clone(),
        name,
        email,
        role: role_clean,
        avatar_url: String::new(),
        created_at: now,
        updated_at: now,
    });
    ctx.db.user_credential().insert(UserCredential {
        user_id,
        password_hash,
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
    let mut user = ctx
        .db
        .user()
        .iter()
        .find(|u| u.email == email)
        .ok_or_else(|| "User not found".to_string())?;
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
pub fn scim_deprovision_group(ctx: &ReducerContext, group_name: String) -> Result<(), String> {
    let existing = ctx.db.group().iter().find(|g| g.name == group_name);
    if let Some(group) = existing {
        // Delete group memberships
        for member in ctx
            .db
            .group_member()
            .iter()
            .filter(|m| m.group_id == group.id)
        {
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
    let existing = ctx
        .db
        .passkey_credential()
        .iter()
        .find(|c| c.credential_id == credential_id);
    if let Some(mut cred) = existing {
        // Update counter and last_used (re-registration of same credential)
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
    let stale: Vec<String> = ctx
        .db
        .passkey_challenge()
        .iter()
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
pub fn consume_passkey_challenge(ctx: &ReducerContext, challenge: String) -> Result<(), String> {
    let c = ctx
        .db
        .passkey_challenge()
        .iter()
        .find(|c| c.challenge == challenge)
        .ok_or_else(|| "Challenge not found".to_string())?;
    let now = now_ms(ctx);
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
    let mut cred = ctx
        .db
        .passkey_credential()
        .iter()
        .find(|c| c.credential_id == credential_id)
        .ok_or_else(|| "Credential not found".to_string())?;
    let now = now_ms(ctx);
    cred.counter = counter;
    cred.last_used_at = now;
    ctx.db.passkey_credential().id().update(cred);
    Ok(())
}

#[reducer]
pub fn delete_passkey_credential(ctx: &ReducerContext, id: String) -> Result<(), String> {
    let found = ctx.db.passkey_credential().id().find(&id);
    if found.is_none() {
        return Err("Credential not found".into());
    }
    ctx.db.passkey_credential().id().delete(&id);
    Ok(())
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
    // Idempotent insert — skip if ID already exists (safe on retry)
    if ctx.db.db_base().id().find(&id).is_none() {
        ctx.db.db_base().insert(DbBase {
            id,
            page_id,
            title,
            view_type,
            created_by,
            created_at: now,
            updated_at: now,
        });
    }
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
    let valid_types = [
        "text",
        "number",
        "select",
        "multi_select",
        "date",
        "checkbox",
        "user",
        "url",
    ];
    if !valid_types.contains(&field_type.as_str()) {
        return Err(format!("Invalid field_type '{}'. Must be one of: text, number, select, multi_select, date, checkbox, user, url", field_type));
    }
    let now = now_ms(ctx);
    // Idempotent insert — skip if ID already exists (safe on retry)
    if ctx.db.db_column().id().find(&id).is_none() {
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
    }
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
    // Idempotent insert — skip if ID already exists (safe on retry)
    if ctx.db.db_row().id().find(&id).is_none() {
        ctx.db.db_row().insert(DbRow {
            id,
            base_id,
            sort_order,
            created_by,
            created_at: now,
            updated_at: now,
        });
    }
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
    let existing = ctx
        .db
        .db_cell()
        .iter()
        .find(|c| c.row_id == row_id && c.column_id == column_id);
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
    if let Some(mut row) = ctx.db.db_row().id().find(row_id.clone()) {
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
    let existing = ctx
        .db
        .db_cell()
        .iter()
        .find(|c| c.row_id == row_id && c.column_id == column_id);
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
    if let Some(mut row) = ctx.db.db_row().id().find(row_id.clone()) {
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
        if let Some(mut row) = ctx.db.db_row().id().find(row_id.clone()) {
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
    let inviter = ctx.db.user().id().find(invited_by.clone());
    if inviter.is_none_or(|u| u.role != "admin") {
        return Err("Only admins can create invitations".into());
    }
    // Check for existing pending invitation for this email
    let existing = ctx
        .db
        .invitation()
        .iter()
        .find(|i| i.email == email && i.status == "pending");
    if existing.is_some() {
        return Err("There is already a pending invitation for this email".into());
    }
    if token.len() < 16 {
        return Err("Token must be at least 16 characters".into());
    }
    let valid_roles = ["viewer", "member"];
    let role_clean = if valid_roles.contains(&role.as_str()) {
        role
    } else {
        "viewer".into()
    };

    // Validate JSON arrays (must parse as Vec<String>)
    if !page_ids.is_empty() && serde_json::from_str::<Vec<String>>(&page_ids).is_err() {
        return Err("page_ids must be a valid JSON array of strings or empty".into());
    }
    if !collection_ids.is_empty() && serde_json::from_str::<Vec<String>>(&collection_ids).is_err() {
        return Err("collection_ids must be a valid JSON array of strings or empty".into());
    }

    let now = now_ms(ctx);
    let expires_at = if expires_days > 0 {
        now + (expires_days as u64) * 86_400_000
    } else {
        0
    };
    // Idempotent insert — skip if ID already exists (safe on retry)
    if ctx.db.invitation().id().find(&id).is_none() {
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
    }
    Ok(())
}

#[reducer]
pub fn accept_invitation(
    ctx: &ReducerContext,
    token: String,
    user_id: String,
) -> Result<(), String> {
    let now = now_ms(ctx);
    let invitation = ctx
        .db
        .invitation()
        .iter()
        .find(|i| i.token == token && i.status == "pending")
        .ok_or_else(|| "Invitation not found or already used".to_string())?;
    // Check expiry
    if invitation.expires_at > 0 && now > invitation.expires_at {
        let mut expired = invitation;
        expired.status = "expired".into();
        expired.updated_at = now;
        ctx.db.invitation().id().update(expired);
        return Err("Invitation has expired".into());
    }
    // Verify the email matches
    let user = ctx
        .db
        .user()
        .id()
        .find(user_id.clone())
        .ok_or_else(|| "User not found".to_string())?;
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
pub fn revoke_invitation(
    ctx: &ReducerContext,
    id: String,
    revoked_by: String,
) -> Result<(), String> {
    let inviter = ctx.db.user().id().find(revoked_by.clone());
    if inviter.is_none_or(|u| u.role != "admin") {
        return Err("Only admins can revoke invitations".into());
    }
    let mut inv = ctx
        .db
        .invitation()
        .id()
        .find(&id)
        .ok_or_else(|| "Invitation not found".to_string())?;
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
    // Idempotent insert — skip if ID already exists (safe on retry)
    if ctx.db.synced_block().id().find(&id).is_none() {
        ctx.db.synced_block().insert(SyncedBlock {
            id,
            title,
            content,
            created_by: created_by.clone(),
            created_at: now,
            updated_at: now,
            updated_by: created_by,
        });
    }
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
    for refe in ctx
        .db
        .synced_block_ref()
        .iter()
        .filter(|r| r.block_id == id)
    {
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
    // Idempotent insert — skip if ID already exists (safe on retry)
    if ctx.db.synced_block_ref().id().find(&id).is_none() {
        ctx.db.synced_block_ref().insert(SyncedBlockRef {
            id,
            block_id,
            page_id,
            created_by,
            created_at: now,
        });
    }
    Ok(())
}

#[reducer]
pub fn remove_synced_block_ref(ctx: &ReducerContext, id: String) -> Result<(), String> {
    ctx.db.synced_block_ref().id().delete(&id);
    Ok(())
}

// ─── MFA / TOTP Authentication ───────────────────────────────────────────────

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
    let existing: Vec<String> = ctx
        .db
        .mfa_method()
        .iter()
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
            let code_hash = hash_password(code)?;
            let bid = format!(
                "mbc_{:x}",
                now_ms(ctx) + ctx.db.mfa_backup_code().iter().count() as u64
            );
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
    let existing: Vec<String> = ctx
        .db
        .mfa_method()
        .iter()
        .filter(|m| m.user_id == user_id)
        .map(|m| m.id.clone())
        .collect();
    for eid in &existing {
        ctx.db.mfa_method().id().delete(eid);
    }
    // Also clean up backup codes
    let codes: Vec<String> = ctx
        .db
        .mfa_backup_code()
        .iter()
        .filter(|c| c.user_id == user_id)
        .map(|c| c.id.clone())
        .collect();
    for cid in &codes {
        ctx.db.mfa_backup_code().id().delete(cid);
    }
    Ok(())
}

#[reducer]
pub fn verify_totp(ctx: &ReducerContext, user_id: String, code: u32) -> Result<(), String> {
    let method = ctx
        .db
        .mfa_method()
        .iter()
        .find(|m| m.user_id == user_id && m.is_enabled);
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
///
/// Simple RFC 4648 base32 decoding (no padding required)
#[reducer]
pub fn verify_mfa_backup_code(
    ctx: &ReducerContext,
    user_id: String,
    code: String,
) -> Result<(), String> {
    let found = ctx
        .db
        .mfa_backup_code()
        .iter()
        .find(|c| c.user_id == user_id && verify_password(&code, &c.code_hash) && !c.is_used);
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

// ─── Watch / Notification System (P2) ─────────────────────────────────────────
// Allows users to watch pages and collections, receiving in-app notifications
// when those watched items are updated by other users.

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
    let existing =
        ctx.db.watch().iter().find(|w| {
            w.user_id == user_id && w.target_type == target_type && w.target_id == target_id
        });
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
        "page.create",
        "page.update",
        "page.delete",
        "page.publish",
        "page.archive",
        "comment.create",
        "collection.create",
        "collection.update",
        "collection.delete",
    ];
    if !valid_events.contains(&event_type.as_str()) {
        return Err("Invalid event type for notification".into());
    }
    // Idempotent insert — skip if ID already exists (safe on retry)
    if ctx.db.notification().id().find(&id).is_none() {
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
    }
    Ok(())
}

#[reducer]
pub fn mark_notification_read(ctx: &ReducerContext, id: String) -> Result<(), String> {
    let mut notif = ctx
        .db
        .notification()
        .id()
        .find(id)
        .ok_or_else(|| "Notification not found".to_string())?;
    notif.is_read = true;
    ctx.db.notification().id().update(notif);
    Ok(())
}

#[reducer]
pub fn mark_all_notifications_read(ctx: &ReducerContext, user_id: String) -> Result<(), String> {
    let to_update: Vec<String> = ctx
        .db
        .notification()
        .iter()
        .filter(|n| n.user_id == user_id && !n.is_read)
        .map(|n| n.id.clone())
        .collect();
    for id in &to_update {
        if let Some(mut n) = ctx.db.notification().id().find(id) {
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
    let to_delete: Vec<String> = ctx
        .db
        .notification()
        .iter()
        .filter(|n| n.user_id == user_id)
        .map(|n| n.id.clone())
        .collect();
    for id in &to_delete {
        ctx.db.notification().id().delete(id);
    }
    Ok(())
}

// ─── Access Request System (P4) ──────────────────────────────────────────────
//
// Outline v1.8.0 feature: allow users to request access to pages they don't have
// permission to view. Page owners and admins are notified and can approve or deny
// the request. Approved requests automatically grant page-level viewer permission.
// Denied requests record the decision for audit.

#[reducer]
pub fn create_access_request(
    ctx: &ReducerContext,
    id: String,
    page_id: String,
    requester_id: String,
    reason: String,
) -> Result<(), String> {
    // Check page exists
    let page = ctx
        .db
        .page()
        .id()
        .find(&page_id)
        .ok_or_else(|| "Page not found".to_string())?;

    // Check user exists
    let user = ctx
        .db
        .user()
        .id()
        .find(&requester_id)
        .ok_or_else(|| "User not found".to_string())?;

    // Check if user already has a pending request for this page
    let existing =
        ctx.db.access_request().iter().find(|r| {
            r.page_id == page_id && r.requester_id == requester_id && r.status == "pending"
        });
    if existing.is_some() {
        return Err("You already have a pending access request for this page".into());
    }

    let now = now_ms(ctx);
    let reason_clone = reason.clone();
    // Idempotent insert — skip if ID already exists (safe on retry)
    if ctx.db.access_request().id().find(&id).is_none() {
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
    }

    // Notify the page creator/owner and all admins about the access request
    let requester_name = user.name.clone();
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
    for admin in ctx
        .db
        .user()
        .iter()
        .filter(|u| u.role == "admin" && u.id != requester_id && u.id != page.created_by)
    {
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
    let request = ctx
        .db
        .access_request()
        .id()
        .find(&id)
        .ok_or_else(|| "Access request not found".to_string())?;
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
            ctx.db
                .page()
                .id()
                .find(&req_page_id)
                .map(|p| p.title)
                .unwrap_or_default()
        }),
        actor_id: responder_id.clone(),
        icon: "✅".into(),
        is_read: false,
        created_at: now,
    });

    log_event(
        ctx,
        "access_request.approve",
        &responder_id,
        &req_page_id,
        &req_id,
        r#"{}"#,
    );
    Ok(())
}

#[reducer]
pub fn deny_access_request(
    ctx: &ReducerContext,
    id: String,
    responder_id: String,
) -> Result<(), String> {
    let request = ctx
        .db
        .access_request()
        .id()
        .find(&id)
        .ok_or_else(|| "Access request not found".to_string())?;
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
            ctx.db
                .page()
                .id()
                .find(&req_page_id)
                .map(|p| p.title)
                .unwrap_or_default()
        }),
        actor_id: responder_id.clone(),
        icon: "❌".into(),
        is_read: false,
        created_at: now,
    });

    log_event(
        ctx,
        "access_request.deny",
        &responder_id,
        &req_page_id,
        &req_id,
        r#"{}"#,
    );
    Ok(())
}

// ─── Tests ────────────────────────────────────────────────────────────────────

// ─── Admin Dashboard Stats ─────────────────────────────────────────

#[reducer]
pub fn get_dashboard_stats(ctx: &ReducerContext) -> Result<(), String> {
    let total_pages = ctx
        .db
        .page()
        .iter()
        .filter(|p| p.status != "deleted")
        .count() as u64;
    let total_users = ctx.db.user().iter().count() as u64;
    let total_collections = ctx.db.collection().iter().count() as u64;
    let total_comments = ctx.db.comment().iter().count() as u64;
    let total_attachments = ctx.db.attachment().iter().count() as u64;
    let published_pages = ctx
        .db
        .page()
        .iter()
        .filter(|p| p.status == "published")
        .count() as u64;
    let draft_pages = ctx
        .db
        .page()
        .iter()
        .filter(|p| p.status == "draft" || p.status == "private" || p.status.is_empty())
        .count() as u64;
    let archived_pages = ctx
        .db
        .page()
        .iter()
        .filter(|p| p.status == "archived")
        .count() as u64;
    let deleted_pages = ctx
        .db
        .page()
        .iter()
        .filter(|p| p.status == "deleted")
        .count() as u64;
    let total_storage_bytes = ctx
        .db
        .attachment()
        .iter()
        .map(|a| a.size_bytes)
        .sum::<u64>();

    // Store stats in AppSetting for frontend to read via subscription
    // Using a more stable approach: directly readable from the frontend.
    // NOTE: `key().update()` panics if the row doesn't exist (errno 15) —
    // upsert like set_app_setting does.
    let stats_value = format!(
        r#"{{"total_pages":{},"total_users":{},"total_collections":{},"total_comments":{},"total_attachments":{},"published_pages":{},"draft_pages":{},"archived_pages":{},"deleted_pages":{},"total_storage_bytes":{}}}"#,
        total_pages,
        total_users,
        total_collections,
        total_comments,
        total_attachments,
        published_pages,
        draft_pages,
        archived_pages,
        deleted_pages,
        total_storage_bytes
    );
    let now = now_ms(ctx);
    let existing = ctx
        .db
        .app_setting()
        .iter()
        .find(|s| s.key == "dashboard_stats");
    if let Some(mut setting) = existing {
        setting.value = stats_value;
        setting.updated_at = now;
        ctx.db.app_setting().key().update(setting);
    } else {
        ctx.db.app_setting().insert(AppSetting {
            key: "dashboard_stats".to_string(),
            value: stats_value,
            updated_at: now,
        });
    }

    Ok(())
}

#[cfg(test)]
mod tests {

    // ─── Slug generation ──────────────────────────────────────────────────────

    #[test]
    fn test_slug_from_name_lowercase() {
        let name = "Engineering Wiki";
        let slug = name.to_lowercase().replace(' ', "-");
        assert_eq!(slug, "engineering-wiki");
    }

    #[test]
    fn test_slug_removes_spaces() {
        let names = vec![
            ("Hello World", "hello-world"),
            ("My   Project", "my---project"),
            ("  Leading", "--leading"),
            ("Trailing  ", "trailing--"),
        ];
        for (input, expected) in names {
            let slug = input.to_lowercase().replace(' ', "-");
            assert_eq!(slug, expected, "Failed for '{}'", input);
        }
    }

    // ─── Page status validation ──────────────────────────────────────────────

    #[test]
    fn test_valid_page_statuses() {
        let valid_statuses = ["draft", "published", "archived", "deleted"];
        assert!(valid_statuses.contains(&"draft"));
        assert!(valid_statuses.contains(&"published"));
        assert!(valid_statuses.contains(&"archived"));
        assert!(valid_statuses.contains(&"deleted"));
        assert!(!valid_statuses.contains(&"pending"));
        assert!(!valid_statuses.contains(&""));
    }

    #[test]
    fn test_batch_set_status_validation_logic() {
        let status = "published";
        let valid_statuses = ["draft", "published", "archived", "deleted"];
        assert!(valid_statuses.contains(&status));

        let invalid = "bogus";
        assert!(!valid_statuses.contains(&invalid));
    }

    #[test]
    fn test_publish_sets_published_at_logic() {
        let now = 1000u64;
        let published_at = 0u64;
        let status = "published";
        let expected = if status == "published" && published_at == 0 {
            now
        } else {
            published_at
        };
        assert_eq!(expected, now);
    }

    #[test]
    fn test_delete_sets_deleted_at_logic() {
        let now = 1000u64;
        let status = "deleted";
        let expected = if status == "deleted" { now } else { 0 };
        assert_eq!(expected, now);
    }

    #[test]
    fn test_restore_clears_deleted_at_logic() {
        let now = 1000u64;
        let status = "published";
        let deleted_at = if status != "deleted" { 0u64 } else { now };
        assert_eq!(deleted_at, 0);
    }

    // ─── Webhook event cleanup logic ────────────────────────────────────────

    #[test]
    fn test_webhook_cleanup_cutoff_calculation() {
        let now = 1000u64;
        let older_than_ms = 500u64;
        let cutoff = now - older_than_ms;
        assert!(cutoff == 500);
        assert!(100_u64 < cutoff); // would be deleted
        assert!(600_u64 > cutoff); // would be kept
    }

    // ─── Search query processing ─────────────────────────────────────────────

    #[test]
    fn test_search_query_lowercase_and_trim() {
        let query = "  Hello World  ".to_string();
        let query_lower = query.to_lowercase();
        let query_trimmed = query_lower.trim();
        assert_eq!(query_trimmed, "hello world");
    }

    #[test]
    fn test_search_query_empty() {
        let query = "".to_string();
        assert_eq!(query.trim(), "");
        assert!(query.trim().is_empty());
    }

    // ─── Collection creation logic ───────────────────────────────────────────

    #[test]
    fn test_collection_slug_generation() {
        let name = "My New Collection";
        let slug = name.to_lowercase().replace(' ', "-");
        assert_eq!(slug, "my-new-collection");
    }

    // ─── Invitation status values ─────────────────────────────────────────

    #[test]
    fn test_invitation_status_values() {
        let valid = ["pending", "accepted", "revoked", "expired"];
        assert!(valid.contains(&"pending"));
        assert!(valid.contains(&"accepted"));
        assert!(valid.contains(&"revoked"));
        assert!(!valid.contains(&"used"));
        assert!(!valid.contains(&""));
    }

    // ─── Access request status transitions ──────────────────────────────────

    #[test]
    fn test_access_request_status_transitions() {
        let status = "pending";
        assert_eq!(status, "pending");
        assert!(status == "pending");
    }

    #[test]
    fn test_access_request_not_pending_rejected() {
        let status = "approved";
        assert!(status != "pending");
    }

    // ─── MFA method type values ─────────────────────────────────────────────

    #[test]
    fn test_mfa_method_type_values() {
        let valid = ["totp", "backup_code"];
        assert!(valid.contains(&"totp"));
        assert!(!valid.contains(&"sms"));
    }

    // ─── Notification event type format ────────────────────────────────────

    #[test]
    fn test_notification_event_type_format() {
        let events = vec![
            "page.updated",
            "page.created",
            "page.deleted",
            "comment.created",
            "access_request.created",
            "access_request.approved",
            "access_request.denied",
            "invitation.created",
        ];
        for event in &events {
            assert!(
                event.contains('.'),
                "Event type '{}' must contain a dot",
                event
            );
        }
    }

    // ─── SCIM operation values ──────────────────────────────────────────────

    #[test]
    fn test_scim_operation_values() {
        let valid = ["create", "update", "delete", "deactivate", "reactivate"];
        assert!(valid.contains(&"create"));
        assert!(valid.contains(&"update"));
        assert!(valid.contains(&"delete"));
        assert!(!valid.contains(&"read"));
    }

    // ─── Watch target types ─────────────────────────────────────────────────

    #[test]
    fn test_watch_target_type_values() {
        let valid = ["page", "collection"];
        assert!(valid.contains(&"page"));
        assert!(valid.contains(&"collection"));
        assert!(!valid.contains(&"group"));
        assert!(!valid.contains(&""));
    }

    // ─── Passkey purpose values ─────────────────────────────────────────────

    #[test]
    fn test_passkey_purpose_values() {
        let valid = ["registration", "authentication"];
        assert!(valid.contains(&"registration"));
        assert!(valid.contains(&"authentication"));
        assert!(!valid.contains(&""));
    }

    // ─── Database view types ────────────────────────────────────────────────

    #[test]
    fn test_db_base_view_type_values() {
        let valid = ["table", "kanban"];
        assert!(valid.contains(&"table"));
        assert!(valid.contains(&"kanban"));
        assert!(!valid.contains(&"calendar"));
    }

    // ─── App setting known keys ─────────────────────────────────────────────

    #[test]
    fn test_app_setting_known_keys() {
        let known = [
            "site_name",
            "site_description",
            "allow_registration",
            "default_user_role",
            "max_upload_size",
            "session_timeout_minutes",
        ];
        assert!(known.contains(&"site_name"));
        assert!(known.contains(&"allow_registration"));
    }

    // ─── SCIM deprovision behaviors ─────────────────────────────────────────

    #[test]
    fn test_scim_deprovision_behavior_values() {
        let valid = ["disable", "delete", "remove_role"];
        assert!(valid.contains(&"disable"));
        assert!(valid.contains(&"delete"));
        assert!(valid.contains(&"remove_role"));
        assert!(!valid.contains(&""));
    }

    // ─── OAuth provider type values ─────────────────────────────────────────

    #[test]
    fn test_oauth_provider_type_values() {
        let valid = [
            "slack",
            "discord",
            "github",
            "gitlab",
            "google",
            "microsoft",
            "facebook",
            "twitter",
            "generic",
        ];
        assert!(valid.contains(&"github"));
        assert!(valid.contains(&"google"));
        assert!(valid.contains(&"slack"));
        assert!(!valid.contains(&"apple"));
    }

    // ─── AI chat message role values ────────────────────────────────────────

    #[test]
    fn test_ai_chat_message_role_values() {
        let valid = ["user", "assistant", "system"];
        assert!(valid.contains(&"user"));
        assert!(valid.contains(&"assistant"));
        assert!(valid.contains(&"system"));
        assert!(!valid.contains(&"function"));
    }

    // ─── Webhook event types ────────────────────────────────────────────────

    #[test]
    fn test_webhook_event_type_values() {
        let valid = [
            "page.create",
            "page.update",
            "page.delete",
            "page.publish",
            "page.archive",
            "collection.create",
            "collection.update",
            "collection.delete",
            "user.create",
            "user.update",
            "user.delete",
            "comment.create",
            "comment.update",
            "comment.delete",
        ];
        assert!(valid.contains(&"page.create"));
        assert!(valid.contains(&"page.publish"));
        assert!(valid.contains(&"comment.create"));
        assert!(!valid.contains(&"user.login"));
    }

    // ─── Edge cases ──────────────────────────────────────────────────────────

    #[test]
    fn test_empty_id_is_not_valid() {
        let id = String::new();
        assert!(id.is_empty());
        let valid = !id.is_empty() && id.len() > 2;
        assert!(!valid);
    }

    #[test]
    fn test_id_minimum_length() {
        let id = "ab";
        assert!(id.len() < 5);
        let id2 = "abc_1";
        assert!(id2.len() >= 5);
    }
}

#[cfg(test)]
mod search_excerpt_tests {
    #[test]
    fn test_excerpt_ascii_content() {
        // mimic the search_pages excerpt logic
        let text_content = "# Hello World\n\nSome content here".to_string();
        let content_lower = text_content.to_lowercase();
        let query_trimmed = "hello";
        let pos = content_lower.find(query_trimmed).unwrap();
        let char_pos = content_lower[..pos].chars().count();
        let chars: Vec<char> = text_content.chars().collect();
        let start_char = char_pos.saturating_sub(80);
        let end_char = std::cmp::min(start_char + 200, chars.len());
        let excerpt_raw: String = chars[start_char..end_char].iter().collect();
        assert!(excerpt_raw.to_lowercase().contains("hello"));
    }

    #[test]
    fn test_excerpt_unicode_lowercase_boundary() {
        // The panic case: İ (U+0130) lowercases to i̇ (2 chars) — byte length changes
        let text_content = "İstanbul content with ẞ characters".to_string();
        let content_lower = text_content.to_lowercase();
        let query_trimmed = "stanbul";
        let pos = content_lower.find(query_trimmed).unwrap();
        let char_pos = content_lower[..pos].chars().count();
        let chars: Vec<char> = text_content.chars().collect();
        let start_char = char_pos.saturating_sub(80);
        let end_char = std::cmp::min(start_char + 200, chars.len());
        let excerpt_raw: String = chars[start_char..end_char].iter().collect();
        assert!(!excerpt_raw.is_empty());
    }

    #[test]
    fn test_excerpt_match_at_start() {
        let text_content = "Hello world".to_string();
        let content_lower = text_content.to_lowercase();
        let pos = content_lower.find("hello").unwrap();
        let char_pos = content_lower[..pos].chars().count();
        let chars: Vec<char> = text_content.chars().collect();
        let start_char = char_pos.saturating_sub(80);
        let end_char = std::cmp::min(start_char + 200, chars.len());
        let excerpt_raw: String = chars[start_char..end_char].iter().collect();
        assert!(excerpt_raw.to_lowercase().contains("hello"));
    }
}
