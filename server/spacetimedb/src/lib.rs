#![allow(clippy::too_many_arguments)]

use spacetimedb::*;
use sha2::{Digest, Sha256};

// ─── Helpers ─────────────────────────────────────────────────────────────────

fn now_ms() -> u64 {
    std::time::SystemTime::now()
        .duration_since(std::time::UNIX_EPOCH)
        .unwrap_or_default()
        .as_millis() as u64
}

fn uuid_v4() -> String {
    uuid::Uuid::new_v4().to_string()
}

fn make_id(prefix: &str) -> String {
    format!("{}_{}", prefix, &uuid_v4()[..8])
}

fn hash_password(password: &str) -> String {
    let mut hasher = Sha256::new();
    hasher.update(password.as_bytes());
    format!("{:x}", hasher.finalize())
}

// ─── Tables ──────────────────────────────────────────────────────────────────

/// Wiki user — admin, member, or viewer
#[table(accessor = user, public)]
#[derive(Debug, Clone)]
pub struct User {
    #[primary_key]
    pub id: String,              // user_<uuid8>
    pub name: String,            // display name
    pub email: String,           // login email
    pub password_hash: String,   // sha256 hash
    pub role: String,            // "admin" | "member" | "viewer"
    pub avatar_url: String,      // "" if none
    pub created_at: u64,
    pub updated_at: u64,
}

/// Collection — groups pages (like Outline collections)
#[table(accessor = collection, public)]
#[derive(Debug, Clone)]
pub struct Collection {
    #[primary_key]
    pub id: String,              // col_<uuid8>
    pub name: String,            // display name
    pub slug: String,            // URL-friendly identifier
    pub description: String,     // optional description
    pub parent_id: String,       // "" if root-level
    pub icon: String,            // emoji or "" 
    pub color: String,           // hex color or ""
    pub sort_order: u32,         // manual ordering
    pub created_by: String,      // user_id
    pub created_at: u64,
    pub updated_at: u64,
}

/// Page — the core document
#[table(accessor = page, public)]
#[derive(Debug, Clone)]
pub struct Page {
    #[primary_key]
    pub id: String,              // page_<uuid8>
    pub title: String,           // human-readable title
    pub slug: String,            // URL-friendly identifier (auto from title)
    pub content: String,         // Tiptap/Prosemirror JSON
    pub text_content: String,    // plain-text extraction for search
    pub collection_id: String,   // parent collection
    pub parent_page_id: String,  // "" if top-level; enables nested pages
    pub status: String,          // "draft" | "published" | "archived" | "deleted"
    pub icon: String,            // emoji or ""
    pub color: String,           // accent color or ""
    pub full_width: bool,        // full-width layout
    pub is_template: bool,       // mark as reusable template
    pub template_id: String,     // which template this was created from; "" if none
    pub sort_order: u32,         // manual ordering within collection
    pub created_by: String,      // user_id
    pub updated_by: String,      // last editor user_id
    pub created_at: u64,
    pub updated_at: u64,
    pub published_at: u64,       // 0 if draft
    pub deleted_at: u64,         // 0 if not deleted (30-day recycle)
}

/// Page revision — version history
#[table(accessor = page_revision, public)]
#[derive(Debug, Clone)]
pub struct PageRevision {
    #[primary_key]
    pub id: String,              // rev_<uuid8>
    pub page_id: String,
    pub title: String,
    pub content: String,
    pub edited_by: String,       // user_id
    pub created_at: u64,
    pub revision_number: u32,
}

/// Comment on a page
#[table(accessor = comment, public)]
#[derive(Debug, Clone)]
pub struct Comment {
    #[primary_key]
    pub id: String,              // com_<uuid8>
    pub page_id: String,
    pub parent_comment_id: String, // "" if top-level; enables threading
    pub user_id: String,
    pub body: String,            // markdown
    pub is_resolved: bool,
    pub created_at: u64,
    pub updated_at: u64,
}

/// File attachment
#[table(accessor = attachment, public)]
#[derive(Debug, Clone)]
pub struct Attachment {
    #[primary_key]
    pub id: String,              // att_<uuid8>
    pub page_id: String,
    pub filename: String,
    pub mime_type: String,
    pub size_bytes: u64,
    pub storage_key: String,     // S3 key or local path
    pub uploaded_by: String,     // user_id
    pub created_at: u64,
}

/// Tag / label on a page
#[table(accessor = page_tag, public)]
#[derive(Debug, Clone)]
pub struct PageTag {
    #[primary_key]
    pub id: String,              // tag_<uuid8>
    pub page_id: String,
    pub name: String,            // tag name (lowercase, trimmed)
    pub value: String,           // optional value; "" if none
}

/// Starred / favorited page by user
#[table(accessor = favorite, public)]
#[derive(Debug, Clone)]
pub struct Favorite {
    #[primary_key]
    pub id: String,              // fav_<uuid8>
    pub user_id: String,
    pub page_id: String,
    pub created_at: u64,
}

// ─── Users ───────────────────────────────────────────────────────────────────

#[reducer]
pub fn register_user(ctx: &ReducerContext, name: String, email: String, password: String) -> Result<String, String> {
    let existing = ctx.db.user().iter().find(|u| u.email == email);
    if existing.is_some() {
        return Err("email already registered".into());
    }
    let id = make_id("user");
    let now = now_ms();
    ctx.db.user().insert(User {
        id: id.clone(),
        name,
        email,
        password_hash: hash_password(&password),
        role: "member".into(),
        avatar_url: String::new(),
        created_at: now,
        updated_at: now,
    });
    Ok(id)
}

#[reducer]
pub fn login_user(ctx: &ReducerContext, email: String, password: String) -> Result<String, String> {
    let hash = hash_password(&password);
    let found = ctx.db.user().iter().find(|u| u.email == email && u.password_hash == hash);
    match found {
        Some(u) => Ok(u.id),
        None => Err("invalid email or password".into()),
    }
}

// ─── Collections ─────────────────────────────────────────────────────────────

#[reducer]
pub fn create_collection(
    ctx: &ReducerContext,
    name: String,
    description: String,
    parent_id: String,
    icon: String,
    color: String,
    created_by: String,
) -> Result<String, String> {
    let id = make_id("col");
    let slug = name.to_lowercase().replace(' ', "-");
    let now = now_ms();
    let max_order = ctx.db.collection().iter()
        .filter(|c| c.parent_id == parent_id)
        .map(|c| c.sort_order)
        .max()
        .unwrap_or(0);
    ctx.db.collection().insert(Collection {
        id: id.clone(),
        name,
        slug,
        description,
        parent_id,
        icon,
        color,
        sort_order: max_order + 1,
        created_by,
        created_at: now,
        updated_at: now,
    });
    Ok(id)
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
    let mut col = ctx.db.collection().iter().find(|c| c.id == id)
        .ok_or("collection not found")?;
    col.name = name;
    col.slug = col.name.to_lowercase().replace(' ', "-");
    col.description = description;
    col.icon = icon;
    col.color = color;
    col.updated_at = now_ms();
    ctx.db.collection().update(col.id.clone(), col);
    Ok(())
}

#[reducer]
pub fn delete_collection(ctx: &ReducerContext, id: String) -> Result<(), String> {
    ctx.db.collection().delete(id.clone());
    // Also archive all pages in this collection
    for mut page in ctx.db.page().iter().filter(|p| p.collection_id == id) {
        page.status = "archived".into();
        page.updated_at = now_ms();
        ctx.db.page().update(page.id.clone(), page);
    }
    Ok(())
}

#[reducer]
pub fn reorder_collections(ctx: &ReducerContext, ordered_ids: Vec<String>) -> Result<(), String> {
    for (i, id) in ordered_ids.iter().enumerate() {
        if let Some(mut col) = ctx.db.collection().iter().find(|c| &c.id == id) {
            col.sort_order = i as u32;
            col.updated_at = now_ms();
            ctx.db.collection().update(col.id.clone(), col);
        }
    }
    Ok(())
}

// ─── Pages ───────────────────────────────────────────────────────────────────

#[reducer]
pub fn create_page(
    ctx: &ReducerContext,
    title: String,
    content: String,
    collection_id: String,
    parent_page_id: String,
    created_by: String,
) -> Result<String, String> {
    let id = make_id("page");
    let slug = title.to_lowercase()
        .replace(' ', "-")
        .chars()
        .filter(|c| c.is_alphanumeric() || *c == '-')
        .collect::<String>();
    let now = now_ms();
    let max_order = ctx.db.page().iter()
        .filter(|p| p.collection_id == collection_id && p.parent_page_id == parent_page_id)
        .map(|p| p.sort_order)
        .max()
        .unwrap_or(0);

    // Plain-text extraction (strip JSON for simple search)
    let text_content = content.chars()
        .filter(|c| !r#"{}[]",:"#.contains(*c))
        .take(2000)
        .collect::<String>();

    ctx.db.page().insert(Page {
        id: id.clone(),
        title: title.clone(),
        slug,
        content: content.clone(),
        text_content,
        collection_id,
        parent_page_id,
        status: "draft".into(),
        icon: String::new(),
        color: String::new(),
        full_width: false,
        is_template: false,
        template_id: String::new(),
        sort_order: max_order + 1,
        created_by: created_by.clone(),
        updated_by: created_by.clone(),
        created_at: now,
        updated_at: now,
        published_at: 0,
        deleted_at: 0,
    });

    // Create initial revision
    let rev_id = make_id("rev");
    ctx.db.page_revision().insert(PageRevision {
        id: rev_id,
        page_id: id.clone(),
        title: title.clone(),
        content,
        edited_by: created_by,
        created_at: now,
        revision_number: 1,
    });

    Ok(id)
}

#[reducer]
pub fn update_page(
    ctx: &ReducerContext,
    id: String,
    title: String,
    content: String,
    updated_by: String,
) -> Result<(), String> {
    let mut page = ctx.db.page().iter().find(|p| p.id == id)
        .ok_or("page not found")?;
    let slug = title.to_lowercase()
        .replace(' ', "-")
        .chars()
        .filter(|c| c.is_alphanumeric() || *c == '-')
        .collect::<String>();
    let text_content = content.chars()
        .filter(|c| !r#"{}[]",:"#.contains(*c))
        .take(2000)
        .collect::<String>();
    let now = now_ms();

    page.title = title.clone();
    page.slug = slug;
    page.content = content.clone();
    page.text_content = text_content;
    page.updated_by = updated_by.clone();
    page.updated_at = now;

    ctx.db.page().update(page.id.clone(), page);

    // Create revision
    let max_rev = ctx.db.page_revision().iter()
        .filter(|r| r.page_id == id)
        .map(|r| r.revision_number)
        .max()
        .unwrap_or(0);
    ctx.db.page_revision().insert(PageRevision {
        id: make_id("rev"),
        page_id: id,
        title,
        content,
        edited_by: updated_by,
        created_at: now,
        revision_number: max_rev + 1,
    });

    Ok(())
}

#[reducer]
pub fn set_page_status(ctx: &ReducerContext, id: String, status: String) -> Result<(), String> {
    let mut page = ctx.db.page().iter().find(|p| p.id == id)
        .ok_or("page not found")?;
    let now = now_ms();
    page.status = status;
    page.updated_at = now;
    if page.status == "published" && page.published_at == 0 {
        page.published_at = now;
    }
    if page.status == "deleted" {
        page.deleted_at = now;
    }
    ctx.db.page().update(page.id.clone(), page);
    Ok(())
}

#[reducer]
pub fn delete_page_permanent(ctx: &ReducerContext, id: String) -> Result<(), String> {
    // Delete page and all related data
    ctx.db.page().delete(id.clone());
    for rev in ctx.db.page_revision().iter().filter(|r| r.page_id == id) {
        ctx.db.page_revision().delete(rev.id.clone());
    }
    for com in ctx.db.comment().iter().filter(|c| c.page_id == id) {
        ctx.db.comment().delete(com.id.clone());
    }
    for att in ctx.db.attachment().iter().filter(|a| a.page_id == id) {
        ctx.db.attachment().delete(att.id.clone());
    }
    for tag in ctx.db.page_tag().iter().filter(|t| t.page_id == id) {
        ctx.db.page_tag().delete(tag.id.clone());
    }
    for fav in ctx.db.favorite().iter().filter(|f| f.page_id == id) {
        ctx.db.favorite().delete(fav.id.clone());
    }
    Ok(())
}

#[reducer]
pub fn duplicate_page(ctx: &ReducerContext, id: String, created_by: String) -> Result<String, String> {
    let page = ctx.db.page().iter().find(|p| p.id == id)
        .ok_or("page not found")?;
    let new_title = format!("{} (copy)", page.title);
    create_page(ctx, new_title, page.content.clone(), page.collection_id.clone(), page.parent_page_id.clone(), created_by)
}

#[reducer]
pub fn move_page(ctx: &ReducerContext, id: String, new_collection_id: String, new_parent_page_id: String) -> Result<(), String> {
    let mut page = ctx.db.page().iter().find(|p| p.id == id)
        .ok_or("page not found")?;
    page.collection_id = new_collection_id;
    page.parent_page_id = new_parent_page_id;
    page.updated_at = now_ms();
    ctx.db.page().update(page.id.clone(), page);
    Ok(())
}

#[reducer]
pub fn reorder_pages(ctx: &ReducerContext, ordered_ids: Vec<String>) -> Result<(), String> {
    for (i, id) in ordered_ids.iter().enumerate() {
        if let Some(mut page) = ctx.db.page().iter().find(|p| &p.id == id) {
            page.sort_order = i as u32;
            page.updated_at = now_ms();
            ctx.db.page().update(page.id.clone(), page);
        }
    }
    Ok(())
}

// ─── Comments ────────────────────────────────────────────────────────────────

#[reducer]
pub fn add_comment(ctx: &ReducerContext, page_id: String, parent_comment_id: String, user_id: String, body: String) -> Result<String, String> {
    let id = make_id("com");
    let now = now_ms();
    ctx.db.comment().insert(Comment {
        id: id.clone(),
        page_id,
        parent_comment_id,
        user_id,
        body,
        is_resolved: false,
        created_at: now,
        updated_at: now,
    });
    Ok(id)
}

#[reducer]
pub fn resolve_comment(ctx: &ReducerContext, id: String) -> Result<(), String> {
    let mut com = ctx.db.comment().iter().find(|c| c.id == id)
        .ok_or("comment not found")?;
    com.is_resolved = true;
    com.updated_at = now_ms();
    ctx.db.comment().update(com.id.clone(), com);
    Ok(())
}

#[reducer]
pub fn delete_comment(ctx: &ReducerContext, id: String) -> Result<(), String> {
    ctx.db.comment().delete(id);
    Ok(())
}

// ─── Tags ────────────────────────────────────────────────────────────────────

#[reducer]
pub fn add_tag(ctx: &ReducerContext, page_id: String, name: String, value: String) -> Result<String, String> {
    let id = make_id("tag");
    let name_lower = name.to_lowercase().trim().to_string();
    ctx.db.page_tag().insert(PageTag {
        id: id.clone(),
        page_id,
        name: name_lower,
        value,
    });
    Ok(id)
}

#[reducer]
pub fn remove_tag(ctx: &ReducerContext, id: String) -> Result<(), String> {
    ctx.db.page_tag().delete(id);
    Ok(())
}

// ─── Favorites ───────────────────────────────────────────────────────────────

#[reducer]
pub fn toggle_favorite(ctx: &ReducerContext, user_id: String, page_id: String) -> Result<String, String> {
    let existing = ctx.db.favorite().iter()
        .find(|f| f.user_id == user_id && f.page_id == page_id);
    if let Some(fav) = existing {
        ctx.db.favorite().delete(fav.id.clone());
        Ok("removed".into())
    } else {
        let id = make_id("fav");
        ctx.db.favorite().insert(Favorite {
            id: id.clone(),
            user_id,
            page_id,
            created_at: now_ms(),
        });
        Ok("added".into())
    }
}

// ─── Attachments ─────────────────────────────────────────────────────────────

#[reducer]
pub fn add_attachment(
    ctx: &ReducerContext,
    page_id: String,
    filename: String,
    mime_type: String,
    size_bytes: u64,
    storage_key: String,
    uploaded_by: String,
) -> Result<String, String> {
    let id = make_id("att");
    ctx.db.attachment().insert(Attachment {
        id: id.clone(),
        page_id,
        filename,
        mime_type,
        size_bytes,
        storage_key,
        uploaded_by,
        created_at: now_ms(),
    });
    Ok(id)
}

#[reducer]
pub fn delete_attachment(ctx: &ReducerContext, id: String) -> Result<(), String> {
    ctx.db.attachment().delete(id);
    Ok(())
}
