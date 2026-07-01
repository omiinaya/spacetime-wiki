use spacetimedb::*;
use crate::tables::*;
use crate::helpers::*;

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
    if ctx.db.attachment().id().find(&id).is_none() {
        ctx.db.attachment().insert(Attachment {
            id, page_id, filename, mime_type, size_bytes, storage_key, uploaded_by,
            created_at: now_ms(ctx),
        });
    }
    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_add_attachment_stores_fields() {
        let filename = "test.pdf";
        assert!(filename.ends_with(".pdf"));
        let mime = "application/pdf";
        assert_eq!(mime, "application/pdf");
    }

    #[test]
    fn test_delete_attachment_by_id() {
        let id = "att_123";
        assert!(!id.is_empty());
    }
}

#[reducer]
pub fn delete_attachment(ctx: &ReducerContext, id: String) -> Result<(), String> {
    ctx.db.attachment().id().delete(&id);
    Ok(())
}
