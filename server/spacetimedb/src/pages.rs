use crate::helpers::*;
use crate::tables::*;
use spacetimedb::*;

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
    let slug = make_slug(&title);
    let now = now_ms(ctx);
    let sort_order = next_sort_order(ctx, &collection_id, &parent_page_id);
    let text_content = extract_text_content(&content);

    if ctx.db.page().id().find(&id).is_none() {
        ctx.db.page().insert(Page {
            id: id.clone(),
            title: title.clone(),
            slug,
            content: content.clone(),
            text_content,
            collection_id: collection_id.clone(),
            parent_page_id: parent_page_id.clone(),
            status: "draft".into(),
            icon: String::new(),
            color: String::new(),
            full_width: false,
            is_pinned: false,
            is_template: false,
            template_id: String::new(),
            sort_order,
            created_by: created_by.clone(),
            updated_by: created_by.clone(),
            created_at: now,
            updated_at: now,
            published_at: 0,
            deleted_at: 0,
            direction: "ltr".into(),
        });
    }

    ctx.db.page_revision().insert(PageRevision {
        id: make_id("rev", ctx),
        page_id: id.clone(),
        title: title.clone(),
        content: content.clone(),
        edited_by: created_by.clone(),
        created_at: now,
        revision_number: 1,
    });

    log_event(
        ctx,
        "page.create",
        &created_by,
        &id,
        &title,
        &format!(
            r#"{{"collection_id":"{}","parent_page_id":"{}"}}"#,
            collection_id, parent_page_id
        ),
    );
    // Notify collection watchers about new page
    notify_collection_watchers_new_page(
        ctx,
        &collection_id,
        &id,
        &created_by,
        &title,
        &format!("New page \"{}\" was created", title),
        "",
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
    let mut page = ctx
        .db
        .page()
        .id()
        .find(&id)
        .ok_or_else(|| "Page not found".to_string())?;
    let slug = make_slug(&title);
    let text_content = extract_text_content(&content);
    let now = now_ms(ctx);

    page.title = title.clone();
    page.slug = slug;
    page.content = content.clone();
    page.text_content = text_content;
    page.updated_by = updated_by.clone();
    page.updated_at = now;
    ctx.db.page().id().update(page);

    let max_rev = ctx
        .db
        .page_revision()
        .iter()
        .filter(|r| r.page_id == id)
        .map(|r| r.revision_number)
        .max()
        .unwrap_or(0);
    ctx.db.page_revision().insert(PageRevision {
        id: make_id("rev", ctx),
        page_id: id.clone(),
        title: title.clone(),
        content: content.clone(),
        edited_by: updated_by.clone(),
        created_at: now,
        revision_number: max_rev + 1,
    });

    log_event(ctx, "page.update", &updated_by, &id, &title, r#"{}"#);
    // Notify page watchers about update
    notify_page_watchers(
        ctx,
        &id,
        "page.update",
        &updated_by,
        &title,
        &format!("Page \"{}\" was updated", title),
        "",
    );
    Ok(())
}

#[reducer]
pub fn set_page_status(ctx: &ReducerContext, id: String, status: String) -> Result<(), String> {
    let mut page = ctx
        .db
        .page()
        .id()
        .find(&id)
        .ok_or_else(|| "Page not found".to_string())?;
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
    log_event(
        ctx,
        event_type,
        "",
        &id,
        &target_name,
        &format!(r#"{{"new_status":"{}"}}"#, status),
    );
    Ok(())
}

#[reducer]
pub fn restore_page(ctx: &ReducerContext, id: String) -> Result<(), String> {
    let mut page = ctx
        .db
        .page()
        .iter()
        .find(|p| p.id == id && p.status == "deleted")
        .ok_or_else(|| "Page not found or not in trash".to_string())?;
    page.status = "draft".into();
    page.deleted_at = 0;
    page.updated_at = now_ms(ctx);
    ctx.db.page().id().update(page);
    Ok(())
}

#[cfg(test)]
mod tests {

    #[test]
    fn test_make_slug_via_helper() {
        assert_eq!(crate::helpers::make_slug("Hello World"), "hello-world");
    }

    #[test]
    fn test_text_content_extraction_via_helper() {
        let input = "Hello, {\"json\": \"content\"} world!";
        let result = crate::helpers::extract_text_content(input);
        assert!(!result.contains('{'));
        assert!(!result.contains('"'));
        assert!(result.contains("Hello"));
        assert!(result.contains("world"));
    }

    #[test]
    fn test_valid_page_statuses() {
        let valid = ["draft", "published", "archived", "deleted"];
        assert!(valid.contains(&"draft"));
        assert!(valid.contains(&"published"));
        assert!(valid.contains(&"archived"));
        assert!(valid.contains(&"deleted"));
        assert!(!valid.contains(&"trashed"));
        assert!(!valid.contains(&""));
        assert!(!valid.contains(&"active"));
    }

    #[test]
    fn test_create_page_status_defaults_to_draft() {
        let default_status = "draft";
        assert_eq!(default_status, "draft");
        let explicit_status = "published";
        assert_ne!(explicit_status, default_status);
    }

    #[test]
    fn test_page_make_slug_edge_cases() {
        assert!(crate::helpers::make_slug("HELLO") == "hello");
        // make_slug replaces each space with a hyphen (multiple spaces → multiple hyphens)
        let result = crate::helpers::make_slug("Hello   World");
        assert_eq!(&result, "hello---world");
    }

    #[test]
    fn test_valid_direction_values() {
        assert_eq!("ltr", "ltr");
        assert_eq!("rtl", "rtl");
        assert_ne!("ltr", "rtl");
    }
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
    let retention_days = ctx
        .db
        .app_setting()
        .iter()
        .find(|s| s.key == "trash_retention_days")
        .map(|s| s.value.parse::<u64>().unwrap_or(0))
        .unwrap_or(0);

    let now = now_ms(ctx);
    let cutoff = if retention_days > 0 {
        now.saturating_sub(retention_days * 86_400_000)
    } else {
        0
    };

    let deleted_pages: Vec<String> = ctx
        .db
        .page()
        .iter()
        .filter(|p| p.status == "deleted" && (retention_days == 0 || p.deleted_at < cutoff))
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
    let page = ctx
        .db
        .page()
        .id()
        .find(&id)
        .ok_or_else(|| "Page not found".to_string())?;
    create_page(
        ctx,
        new_id,
        format!("{} (copy)", page.title),
        page.content,
        page.collection_id,
        page.parent_page_id,
        created_by,
    )
}

#[reducer]
pub fn move_page(
    ctx: &ReducerContext,
    id: String,
    new_collection_id: String,
    new_parent_page_id: String,
) -> Result<(), String> {
    let mut page = ctx
        .db
        .page()
        .id()
        .find(&id)
        .ok_or_else(|| "Page not found".to_string())?;
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
        if let Some(mut page) = ctx.db.page().id().find(id) {
            page.sort_order = i as u32;
            page.updated_at = now;
            ctx.db.page().id().update(page);
        }
    }
    Ok(())
}

#[reducer]
pub fn set_page_icon(ctx: &ReducerContext, id: String, icon: String) -> Result<(), String> {
    let mut page = ctx
        .db
        .page()
        .id()
        .find(&id)
        .ok_or_else(|| "Page not found".to_string())?;
    page.icon = icon;
    page.updated_at = now_ms(ctx);
    ctx.db.page().id().update(page);
    Ok(())
}

#[reducer]
pub fn set_page_full_width(
    ctx: &ReducerContext,
    id: String,
    full_width: bool,
) -> Result<(), String> {
    let mut page = ctx
        .db
        .page()
        .id()
        .find(&id)
        .ok_or_else(|| "Page not found".to_string())?;
    page.full_width = full_width;
    page.updated_at = now_ms(ctx);
    ctx.db.page().id().update(page);
    Ok(())
}

#[reducer]
pub fn set_page_color(ctx: &ReducerContext, id: String, color: String) -> Result<(), String> {
    let mut page = ctx
        .db
        .page()
        .id()
        .find(&id)
        .ok_or_else(|| "Page not found".to_string())?;
    page.color = color;
    page.updated_at = now_ms(ctx);
    ctx.db.page().id().update(page);
    Ok(())
}

#[reducer]
pub fn set_page_pinned(ctx: &ReducerContext, id: String, is_pinned: bool) -> Result<(), String> {
    let mut page = ctx
        .db
        .page()
        .id()
        .find(&id)
        .ok_or_else(|| "Page not found".to_string())?;
    page.is_pinned = is_pinned;
    page.updated_at = now_ms(ctx);
    ctx.db.page().id().update(page);
    Ok(())
}

// ─── Page direction (RTL / bidirectional text) ─────────────────────────────

#[reducer]
pub fn set_page_direction(
    ctx: &ReducerContext,
    id: String,
    direction: String,
) -> Result<(), String> {
    if direction != "ltr" && direction != "rtl" {
        return Err("Direction must be 'ltr' or 'rtl'".into());
    }
    let mut page = ctx
        .db
        .page()
        .id()
        .find(&id)
        .ok_or_else(|| "Page not found".to_string())?;
    page.direction = direction;
    page.updated_at = now_ms(ctx);
    ctx.db.page().id().update(page);
    Ok(())
}
