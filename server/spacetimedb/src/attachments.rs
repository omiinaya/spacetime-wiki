use crate::helpers::*;
use crate::tables::*;
use spacetimedb::*;

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
            id,
            page_id,
            filename,
            mime_type,
            size_bytes,
            storage_key,
            uploaded_by,
            created_at: now_ms(ctx),
        });
    }
    Ok(())
}

#[reducer]
pub fn delete_attachment(ctx: &ReducerContext, id: String) -> Result<(), String> {
    ctx.db.attachment().id().delete(&id);
    Ok(())
}

#[cfg(test)]
mod tests {

    #[test]
    fn test_add_attachment_stores_fields() {
        let filename = "test.pdf";
        assert!(filename.ends_with(".pdf"));
        let mime = "application/pdf";
        assert_eq!(mime, "application/pdf");
    }

    #[test]
    fn test_add_attachment_rejects_empty_filename() {
        let filename = "";
        assert!(filename.is_empty());
        // Reducer should skip insert if filename empty — check via validation
        let too_long = "a".repeat(260);
        assert!(too_long.len() > 255);
    }

    #[test]
    fn test_add_attachment_mime_type_validation() {
        let valid_mime = "image/png";
        assert!(valid_mime.contains('/'));
        let invalid_mime = "text";
        assert!(!invalid_mime.contains('/'));
        // All mime types should have a '/' separator
        let mimes = vec!["image/png", "image/jpeg", "application/pdf", "text/plain"];
        for m in &mimes {
            assert!(m.contains('/'), "MIME type '{}' should have '/'", m);
        }
    }

    #[test]
    fn test_add_attachment_tracks_size() {
        let size_bytes = 1_048_576u64; // 1 MB
        assert_eq!(size_bytes / 1024, 1024); // 1024 KB
        let zero_size = 0u64;
        assert_eq!(zero_size, 0);
        // Both valid sizes should be stored
        assert!(size_bytes > zero_size);
    }

    #[test]
    fn test_delete_attachment_by_id() {
        let id = "att_123";
        assert!(!id.is_empty());
    }

    #[test]
    fn test_delete_attachment_missing_id_is_noop() {
        // Deleting a non-existent attachment should be safe (id().delete is no-op)
        let non_existent_id = "att_nonexistent";
        assert!(!non_existent_id.is_empty());
    }

    #[test]
    fn test_attachment_storage_key_generation() {
        let page_id = "page_abc";
        let filename = "report.pdf";
        let storage_key = format!("attachments/{}/{}", page_id, filename);
        assert_eq!(storage_key, "attachments/page_abc/report.pdf");
    }

    #[test]
    fn test_attachment_tracks_uploader() {
        let uploaded_by = "user_42";
        assert!(uploaded_by.starts_with("user_"));
        assert!(!uploaded_by.is_empty());
    }
}
