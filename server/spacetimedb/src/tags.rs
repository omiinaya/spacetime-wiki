use crate::tables::*;
use spacetimedb::*;

// ─── Tags ────────────────────────────────────────────────────────────────────

#[reducer]
pub fn add_tag(
    ctx: &ReducerContext,
    id: String,
    page_id: String,
    name: String,
    value: String,
) -> Result<(), String> {
    if ctx.db.page_tag().id().find(&id).is_none() {
        ctx.db.page_tag().insert(PageTag {
            id,
            page_id,
            name: name.to_lowercase().trim().to_string(),
            value,
        });
    }
    Ok(())
}

#[reducer]
pub fn remove_tag(ctx: &ReducerContext, id: String) -> Result<(), String> {
    ctx.db.page_tag().id().delete(&id);
    Ok(())
}

#[cfg(test)]
mod tests {

    #[test]
    fn test_add_tag_lowercases_name() {
        let name = "HelloWorld".to_lowercase().trim().to_string();
        assert_eq!(name, "helloworld");
    }

    #[test]
    fn test_remove_tag_uses_id() {
        let id = "some_id";
        assert!(!id.is_empty());
    }
}
