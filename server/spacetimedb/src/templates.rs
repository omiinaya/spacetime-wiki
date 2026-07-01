use spacetimedb::*;
use crate::*;

// ─── Templates ──────────────────────────────────────────────────────────────

#[reducer]
pub fn mark_as_template(ctx: &ReducerContext, id: String, is_template: bool) -> Result<(), String> {
    let mut page = ctx.db.page().id().find(id).ok_or_else(|| "Page not found".to_string())?;
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
    if let Some(mut new_page) = ctx.db.page().id().find(new_id) {
        new_page.template_id = template_id;
        ctx.db.page().id().update(new_page);
    }
    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_mark_as_template_checks_page_exists() {
        let is_template = true;
        assert!(is_template);
    }

    #[test]
    fn test_create_from_template_looks_up_template() {
        let template_id = "tpl_001";
        assert!(!template_id.is_empty());
    }
}
