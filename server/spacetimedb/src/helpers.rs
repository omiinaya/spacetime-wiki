use crate::*;
use argon2::{password_hash::SaltString, Argon2, PasswordHash, PasswordHasher, PasswordVerifier};
use sha2::{Digest, Sha256};

// ─── Helpers ─────────────────────────────────────────────────────────────────

pub(crate) fn now_ms(ctx: &ReducerContext) -> u64 {
    ctx.timestamp.to_micros_since_unix_epoch() as u64 / 1000
}

pub(crate) fn make_id(prefix: &str, ctx: &ReducerContext) -> String {
    let ts = now_ms(ctx);
    let rand: u32 = (ts as u32).wrapping_mul(1103515245).wrapping_add(12345);
    // The pure-LCG of the timestamp alone collides when a reducer inserts
    // several rows within the same millisecond (e.g. search_pages writing a
    // SearchResult per matching page in one call) → insert panic. Add a
    // per-process monotonic counter so IDs are unique even within one ms.
    use std::sync::atomic::{AtomicU32, Ordering};
    static COUNTER: AtomicU32 = AtomicU32::new(0);
    let seq = COUNTER.fetch_add(1, Ordering::Relaxed);
    format!("{}_{:x}_{:x}", prefix, rand, seq)
}

/// Hash a password using Argon2id (PHC string format).
/// Produces a string like `$argon2id$v=19$m=19456,t=2,p=1$<salt>$<hash>`.
/// Automatically used for all new registrations and password changes.
/// Returns Err instead of panicking (Argon2 only fails on >4 GB input, but a
/// panic would abort the reducer transaction — surface as a reducer error).
pub(crate) fn hash_password(password: &str) -> Result<String, String> {
    let salt = SaltString::generate(&mut rand::rngs::OsRng);
    let argon2 = Argon2::default();
    argon2
        .hash_password(password.as_bytes(), &salt)
        .map(|h| h.to_string())
        .map_err(|e| format!("password hashing failed: {e}"))
}

/// Verify a password against a stored hash (supports both Argon2 PHC strings
/// and legacy SHA-256 hex strings for backward compatibility).
pub(crate) fn verify_password(password: &str, stored_hash: &str) -> bool {
    // Argon2 PHC strings start with $argon2 — detect format
    if stored_hash.starts_with("$argon2") {
        match PasswordHash::new(stored_hash) {
            Ok(parsed_hash) => Argon2::default()
                .verify_password(password.as_bytes(), &parsed_hash)
                .is_ok(),
            Err(_) => false,
        }
    } else {
        // Legacy SHA-256 fallback
        use hex::encode;

        let mut hasher = Sha256::new();
        hasher.update(password.as_bytes());
        let computed = encode(hasher.finalize());
        computed == stored_hash
    }
}

// ─── Audit Event Log ─────────────────────────────────────────────────────────

pub(crate) fn log_event(
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

// ─── Helper: sort orders ────────────────────────────────────────────────────

pub(crate) fn next_sort_order(
    ctx: &ReducerContext,
    collection_id: &str,
    parent_page_id: &str,
) -> u32 {
    ctx.db
        .page()
        .iter()
        .filter(|p| p.collection_id == collection_id && p.parent_page_id == parent_page_id)
        .map(|p| p.sort_order)
        .max()
        .unwrap_or(0)
        + 1
}

pub(crate) fn next_col_sort_order(ctx: &ReducerContext, parent_id: &str) -> u32 {
    ctx.db
        .collection()
        .iter()
        .filter(|c| c.parent_id == parent_id)
        .map(|c| c.sort_order)
        .max()
        .unwrap_or(0)
        + 1
}

/// Simple RFC 4648 base32 decoding (no padding required)
pub(crate) fn base32_decode(input: &str) -> Option<Vec<u8>> {
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

/// Verify a TOTP code using HMAC-SHA1 (RFC 6238).
/// Checks the current 30-second window and adjacent windows (±1) for clock drift.
pub(crate) fn verify_totp_code(secret: &[u8], code: u32, now_ms: u64) -> bool {
    use hmac::{Hmac, KeyInit, Mac};
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

/// Notify all watchers of a page about an event (page.update, comment.create, etc.).
/// Skips the actor who triggered the event.
pub(crate) fn notify_page_watchers(
    ctx: &ReducerContext,
    page_id: &str,
    event_type: &str,
    actor_id: &str,
    title: &str,
    message: &str,
    icon: &str,
) {
    for watcher in ctx
        .db
        .watch()
        .iter()
        .filter(|w| w.target_type == "page" && w.target_id == page_id && w.user_id != actor_id)
    {
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

// ─── Pure helper: slug generation ────────────────────────────────────────────

pub(crate) fn make_slug(title: &str) -> String {
    title
        .to_lowercase()
        .replace(' ', "-")
        .chars()
        .filter(|c| c.is_alphanumeric() || *c == '-')
        .collect()
}

// ─── Pure helper: extract text content (strip JSON tokens) ──────────────────

pub(crate) fn extract_text_content(content: &str) -> String {
    content
        .chars()
        .filter(|c| !r#""{}[],:"#.contains(*c))
        .take(2000)
        .collect()
}

// ─── Pure helper: role validation ────────────────────────────────────────────

/// Validate a required text field: non-empty after trim, within max chars.
/// Returns an error message when invalid. Centralizes the length caps so all
/// mutating reducers apply the same input discipline (empty names/bodies and
/// multi-MB strings must not reach the tables).
pub(crate) fn validate_required_str(
    field: &str,
    label: &str,
    max_chars: usize,
) -> Result<(), String> {
    let trimmed = field.trim();
    if trimmed.is_empty() {
        return Err(format!("{label} cannot be empty"));
    }
    if field.chars().count() > max_chars {
        return Err(format!("{label} exceeds {max_chars} characters"));
    }
    Ok(())
}

pub(crate) fn is_valid_user_role(role: &str) -> bool {
    ["admin", "member", "viewer"].contains(&role)
}

pub(crate) fn sanitize_user_role(role: &str) -> String {
    if is_valid_user_role(role) {
        role.to_string()
    } else {
        "member".to_string()
    }
}

pub(crate) fn is_valid_collection_role(role: &str) -> bool {
    ["admin", "editor", "viewer"].contains(&role)
}

pub(crate) fn sanitize_collection_role(role: &str) -> String {
    if is_valid_collection_role(role) {
        role.to_string()
    } else {
        "viewer".to_string()
    }
}

// ─── Pure helper: expiry calculation ─────────────────────────────────────────

pub(crate) fn calc_expiry_ms(now: u64, expires_days: u32) -> u64 {
    if expires_days > 0 {
        now + (expires_days as u64) * 86_400_000
    } else {
        0
    }
}

// ─── Pure helper: comment body excerpt ───────────────────────────────────────

pub(crate) fn make_comment_excerpt(user_id: &str, page_title: &str, body: &str) -> String {
    let excerpt: String = body.chars().take(80).collect();
    if excerpt.len() < body.len() {
        format!(
            "{} commented on \"{}\": \"{}...\"",
            user_id, page_title, excerpt
        )
    } else {
        format!(
            "{} commented on \"{}\": \"{}\"",
            user_id, page_title, excerpt
        )
    }
}

/// Notify collection watchers when a new page is created in that collection.
/// Skips the creator.
pub(crate) fn notify_collection_watchers_new_page(
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

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_hash_password_argon2_format() {
        let hash = hash_password("hello").unwrap();
        // Argon2 PHC strings start with $argon2id$v=19$m=...
        assert!(
            hash.starts_with("$argon2id$"),
            "Hash should be Argon2 PHC format, got: {}",
            hash
        );
        // PHC string has 5 segments: $argon2id$v=19$m=...,t=...,p=...$<salt>$<hash>
        let parts: Vec<&str> = hash.split('$').collect();
        assert_eq!(parts.len(), 6, "PHC string should have 5 $ segments");
        assert!(
            parts[3].starts_with("m="),
            "Should contain memory cost param"
        );
    }

    #[test]
    fn test_hash_password_empty() {
        let hash = hash_password("").unwrap();
        assert!(
            hash.starts_with("$argon2id$"),
            "Empty password should also produce Argon2 PHC"
        );
    }

    #[test]
    fn test_hash_password_different() {
        assert_ne!(hash_password("a"), hash_password("b"));
    }

    #[test]
    fn test_verify_password_argon2_roundtrip() {
        let password = format!(
            "test-{}",
            std::time::SystemTime::now()
                .duration_since(std::time::UNIX_EPOCH)
                .unwrap()
                .as_nanos()
        );
        let hash = hash_password(&password).unwrap();
        assert!(
            verify_password(&password, &hash),
            "Should verify correct password against Argon2 hash"
        );
        assert!(
            !verify_password("wrong-password", &hash),
            "Should reject wrong password against Argon2 hash"
        );
    }

    #[test]
    fn test_verify_password_sha256_backward_compat() {
        // Legacy SHA-256 hash format — must still work
        let legacy_hash = "2cf24dba5fb0a30e26e83b2ac5b9e29e1b161e5c1fa7425e73043362938b9824";
        assert!(
            verify_password("hello", legacy_hash),
            "Should verify correct password against legacy SHA-256"
        );
        assert!(
            !verify_password("wrong", legacy_hash),
            "Should reject wrong password against legacy SHA-256"
        );
    }

    #[test]
    fn test_hash_produces_unique_per_call() {
        // Argon2 uses random salts, so two hashes of the same password differ
        let h1 = hash_password("same_password").unwrap();
        let h2 = hash_password("same_password").unwrap();
        assert_ne!(h1, h2, "Argon2 hashes should be unique due to random salt");
        // But both should verify against the password
        assert!(verify_password("same_password", &h1));
        assert!(verify_password("same_password", &h2));
    }

    #[test]
    fn test_base32_decode_standard() {
        let result = base32_decode("NBSWY3DP").unwrap();
        assert_eq!(result, b"hello");
    }

    #[test]
    fn test_base32_decode_with_spaces() {
        // Spaces should be stripped before decoding
        let without_spaces = base32_decode("NBSWY3DP").unwrap();
        let with_spaces = base32_decode("NBSW Y3DP").unwrap();
        assert_eq!(without_spaces, with_spaces);
    }

    #[test]
    fn test_base32_decode_empty() {
        assert!(base32_decode("").is_none());
    }

    #[test]
    fn test_base32_decode_lowercase() {
        assert_eq!(base32_decode("nbswy3dp").unwrap(), b"hello");
    }

    #[test]
    fn test_base32_decode_invalid_char() {
        assert!(base32_decode("NBSWY3D!").is_none());
    }

    #[test]
    fn test_verify_totp_rfc6238() {
        assert!(verify_totp_code(b"12345678901234567890", 755224, 0));
    }

    #[test]
    fn test_verify_totp_wrong_code() {
        assert!(!verify_totp_code(b"12345678901234567890", 123456, 0));
    }

    #[test]
    fn test_verify_totp_empty_secret() {
        assert!(!verify_totp_code(&[], 755224, 0));
    }

    #[test]
    fn test_verify_totp_clock_drift() {
        assert!(verify_totp_code(b"12345678901234567890", 287082, 30000));
    }

    // ── make_slug tests ──────────────────────────────────────────────────────

    #[test]
    fn test_make_slug_basic() {
        assert_eq!(make_slug("Hello World"), "hello-world");
    }

    #[test]
    fn test_make_slug_special_chars() {
        assert_eq!(make_slug("Hello, World! #2024"), "hello-world-2024");
    }

    #[test]
    fn test_make_slug_multi_spaces() {
        assert_eq!(make_slug("a   b   c"), "a---b---c");
    }

    #[test]
    fn test_make_slug_alphanum_only() {
        assert_eq!(make_slug("Test123"), "test123");
    }

    #[test]
    fn test_make_slug_unicode_stripped() {
        // Rust's is_alphanumeric() includes unicode letters
        assert_eq!(make_slug("Café Münster"), "café-münster");
    }

    // ── extract_text_content tests ───────────────────────────────────────────

    #[test]
    fn test_extract_text_content_strips_json_tokens() {
        let input = r#"{"hello":"world"}"#;
        let result = extract_text_content(input);
        assert!(!result.contains('{'));
        assert!(!result.contains('"'));
    }

    #[test]
    fn test_extract_text_content_truncates() {
        let long = "a".repeat(3000);
        let result = extract_text_content(&long);
        assert_eq!(result.len(), 2000);
    }

    #[test]
    fn test_extract_text_content_short() {
        let result = extract_text_content("hello");
        assert_eq!(result, "hello");
    }

    // ── role validation tests ─────────────────────────────────────────────────

    #[test]
    fn test_is_valid_user_role_admin() {
        assert!(is_valid_user_role("admin"));
    }

    #[test]
    fn test_is_valid_user_role_member() {
        assert!(is_valid_user_role("member"));
    }

    #[test]
    fn test_is_valid_user_role_viewer() {
        assert!(is_valid_user_role("viewer"));
    }

    #[test]
    fn test_is_valid_user_role_invalid() {
        assert!(!is_valid_user_role("editor"));
        assert!(!is_valid_user_role(""));
        assert!(!is_valid_user_role("superadmin"));
    }

    #[test]
    fn test_sanitize_user_role_valid() {
        assert_eq!(sanitize_user_role("admin"), "admin");
        assert_eq!(sanitize_user_role("member"), "member");
        assert_eq!(sanitize_user_role("viewer"), "viewer");
    }

    #[test]
    fn test_sanitize_user_role_invalid_defaults_to_member() {
        assert_eq!(sanitize_user_role("superadmin"), "member");
        assert_eq!(sanitize_user_role("editor"), "member");
        assert_eq!(sanitize_user_role(""), "member");
    }

    #[test]
    fn test_is_valid_collection_role_admin() {
        assert!(is_valid_collection_role("admin"));
    }

    #[test]
    fn test_is_valid_collection_role_editor() {
        assert!(is_valid_collection_role("editor"));
    }

    #[test]
    fn test_is_valid_collection_role_viewer() {
        assert!(is_valid_collection_role("viewer"));
    }

    #[test]
    fn test_is_valid_collection_role_invalid() {
        assert!(!is_valid_collection_role("member"));
        assert!(!is_valid_collection_role(""));
        assert!(!is_valid_collection_role("owner"));
    }

    #[test]
    fn test_sanitize_collection_role_valid() {
        assert_eq!(sanitize_collection_role("admin"), "admin");
        assert_eq!(sanitize_collection_role("editor"), "editor");
        assert_eq!(sanitize_collection_role("viewer"), "viewer");
    }

    #[test]
    fn test_sanitize_collection_role_invalid_defaults_to_viewer() {
        assert_eq!(sanitize_collection_role("member"), "viewer");
        assert_eq!(sanitize_collection_role("owner"), "viewer");
        assert_eq!(sanitize_collection_role(""), "viewer");
    }

    // ── calc_expiry_ms tests ──────────────────────────────────────────────────

    #[test]
    fn test_calc_expiry_zero_days() {
        assert_eq!(calc_expiry_ms(1000, 0), 0);
    }

    #[test]
    fn test_calc_expiry_positive_days() {
        assert_eq!(calc_expiry_ms(1000, 1), 1000 + 86_400_000);
    }

    #[test]
    fn test_calc_expiry_30_days() {
        assert_eq!(calc_expiry_ms(0, 30), 30 * 86_400_000);
    }

    // ── make_comment_excerpt tests ────────────────────────────────────────────

    #[test]
    fn test_comment_excerpt_short_body() {
        let result = make_comment_excerpt("user1", "My Page", "Hi");
        assert_eq!(result, "user1 commented on \"My Page\": \"Hi\"");
    }

    #[test]
    fn test_comment_excerpt_long_body_truncated() {
        let long = "a".repeat(100);
        let result = make_comment_excerpt("user1", "My Page", &long);
        assert!(result.ends_with("...\""));
        assert_eq!(
            result.chars().count(),
            "user1 commented on \"My Page\": \"".len() + 80 + "...\"".len()
        );
    }

    #[test]
    fn test_comment_excerpt_exactly_80() {
        let body = "x".repeat(80);
        let result = make_comment_excerpt("user1", "My Page", &body);
        assert_eq!(
            result.len(),
            "user1 commented on \"My Page\": \"".len() + 80 + "\"".len()
        );
        assert!(!result.ends_with("...\""));
    }
}
