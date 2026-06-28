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
