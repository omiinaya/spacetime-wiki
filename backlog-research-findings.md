# SpacetimeWiki — Improvement Opportunity Research (2026-06-29)

## Checks Performed & Results

### 1. Clippy Warnings ❌ 6 remaining
- Auto-fixed **27 issues** across 6 files (19 in lib.rs, 2 pages.rs, 2 app_settings.rs, 1 comments.rs, 1 share_links.rs, 2 templates.rs)
- **6 warnings still open:**
  - `empty_line_after_doc_comments` (lib.rs:1603)
  - `unnecessary_unwrap` (comments.rs:97, lib.rs:941)
  - `unnecessary_sort_by` — 3 occurrences (lib.rs:181, 188, 195)

### 2. TODO/FIXME/HACK/XXX ✅ None
- Zero actual code debt markers. The one match (`XXXX XXXX`) was a placeholder string for an MFA input.

### 3. cargo check Warnings ✅ Clean
- Zero warnings from `cargo check` — compiles clean.

### 4. lib.rs Size: 1,945 lines
- The AGENTS.md (outdated) claimed ~4,500. Actual: **1,945 lines** with **68 pub functions**.
- Largest files: lib.rs (1,945), tables.rs (849), helpers.rs (485), sso.rs (474), permissions.rs (387), pages.rs (352), collaboration.rs (310).

### 5. Dead Exports: 170 pub functions
- 170 `pub fn`/`pub(crate) fn` in the Rust source. Some may be dead code.

### 6. Component Test Coverage 🔴 6/19 without tests
- **13 with tests** (AccessRequestPanel, ActivityFeed, AdminDashboard, AiAssistant, GraphView, ImageLightbox, KeyboardShortcuts, NotificationBell, PageTags, SearchFilters, SidebarTree, TemplatePicker, Toast)
- **6 missing tests:** LanguageSwitcher (68 lines), MediaManager (390), MentionInput (223), PagePermissions (246), RevisionDiff (232), WebhookSettings (410)
- E2E tests: 3 specs (home, navigation, pages) in `web/e2e/`.

### 7. Frontend Build ⚠️ Build OK, 2 warnings
- Build succeeds in 3.14s.
- **Large chunk warnings:** ImageLightbox (988 kB), chunk-NNHCCRGN (594 kB), App (468 kB) — all over 500 kB threshold.
- **INEFFECTIVE_DYNAMIC_IMPORT** for `typed-sql.ts` — static + dynamic imports conflict.

### 8. npm audit ✅ 0 vulnerabilities
- Clean.

### Additional Discovery
- `collaboration.rs` (310 lines, 10 pub fn) exists but is undocumented in AGENTS.md.

---

## Synthesized Backlog Items

### Item 1: Fix Remaining Clippy Warnings
**Priority: P5** · Skill: `rust`
**What:** Address the 6 remaining clippy warnings: fix `empty_line_after_doc_comments` (1), replace `unwrap` with `if let` pattern (2 cases), and replace `sort_by` with `sort_by_key` for reversed sorts (3 cases).
**Why:** Clean build output, enforce Rust best practices, eliminate potential panic paths in the `unwrap` calls.

### Item 2: Add Unit Tests for 6 Untested Components
**Priority: P4** · Skill: `typescript,react`
**What:** Write Vitest component tests for LanguageSwitcher, MediaManager, MentionInput, PagePermissions, RevisionDiff, and WebhookSettings. These range from 68–410 lines and cover: language selection UI, file media browser/uploader, @-mention autocomplete, permission ACL editor, revision history diff viewer, and webhook CRUD admin.
**Why:** These are functional UI components with non-trivial user interaction; untested code is a risk surface for regressions. Brings coverage from 68% to 100% of components.

### Item 3: Code-Split Large Frontend Chunks to Reduce Bundle Size
**Priority: P3** · Skill: `typescript,vite`
**What:** Investigate and fix the 3 chunks over 500 kB after minification (ImageLightbox at 988 kB, chunk-NNHCCRGN at 594 kB, App at 468 kB). Use dynamic `import()` for heavy dependencies (e.g., image viewer libs, diagram renderers, large utility modules). Also fix the `INEFFECTIVE_DYNAMIC_IMPORT` warning where `typed-sql.ts` is both statically and dynamically imported.
**Why:** Reduces initial page load time and improves perceived performance. The ImageLightbox chunk alone is nearly 1 MB — likely loading image viewer libraries eagerly on every page.

### Item 4: Review lib.rs for Further Module Extraction
**Priority: P4** · Skill: `rust`
**What:** Audit the 68 public functions in lib.rs (1,945 lines) to identify candidates for extraction into domain-specific modules. The file still contains mixed concerns (search reducers, collection management, notification logic, MFA verification, etc.). Also update AGENTS.md to reflect the actual lib.rs size and the undocumented `collaboration.rs` module.
**Why:** lib.rs is still the largest file in the crate at ~2K lines. Further extraction improves maintainability, makes module boundaries explicit, and aligns with the existing pattern of topic modules (pages.rs, users.rs, etc.).

### Item 5: Dead Code Audit for Rust Public Functions
**Priority: P5** · Skill: `rust`
**What:** Run `cargo +nightly deadlinks` or manual audit of the 170 `pub fn`/`pub(crate) fn` exports to identify genuinely unused functions. Focus especially on the 68 in lib.rs and the 18 in helpers.rs.
**Why:** Dead code increases maintenance surface, confuses new contributors, and may give false confidence about API stability. Removing unused exports is cheap and improves clarity.

### Item 6: Add E2E Tests for Critical User Flows
**Priority: P4** · Skill: `typescript,playwright`
**What:** Extend the existing 3 E2E spec files with flows for: page CRUD (create/edit/delete), media attachment upload, user permission changes, collection management, and search. The current 3 specs (home, navigation, pages) cover basics only.
**Why:** E2E coverage is thin (3 specs) compared to 19 UI components and multiple backend features. Critical paths like attachments, permissions, and search have no E2E validation.

### Item 7: Update AGENTS.md with Accurate Module Map
**Priority: P5** · Skill: `documentation`
**What:** Correct the lib.rs line count (currently ~4,500, actual 1,945), add `collaboration.rs` to the module index, and ensure the file structure section matches the actual source tree. Also verify the ports listed match docker-compose.yml.
**Why:** The AGENTS.md is the primary onboarding doc for AI agents — inaccurate information causes wasted time and wrong tool selections.
