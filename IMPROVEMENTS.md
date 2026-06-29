# SpacetimeWiki — Improvement Backlog

Living queue managed by the continuous-improvement cron. The cron reads this file,
cleans up completed items, researches new improvement opportunities, adds them,
and works the top pending item each tick.

---

## PENDING

| Priority | Item | Notes |
|----------|------|-------|
| P4 | **Add TypeScript tests for 6 uncovered components** — LanguageSwitcher, MediaManager, MentionInput, PagePermissions, RevisionDiff, WebhookSettings — 32% of components still untested. | |
| P4 | **Write Playwright E2E tests for critical flows** — attachments, permissions, search, collections, user management. Only 3 E2E specs exist. | |
| P4 | **Extract lib.rs further** — 68 pub fn still in lib.rs (1945 lines). Targets: table create/seed logic, search reducers. AGENTS.md claims 4500 lines — needs updating. | |
| P5 | **Fix 6 clippy warnings** — unwrap, sort_by_key, doc comment issues in Rust module. | |
| P5 | **Update AGENTS.md** — fix lib.rs line count (1945 not 4500), add collaboration.rs to module list, verify port numbers. | |

---

## Recently Completed

| Date | Item | Commit |
|------|------|--------|
| 2026-06-29 | **P5 — Add Rust unit tests for collaboration.rs** — 21 tests. | a71df205 |
| 2026-06-29 | **P5 — Add TypeScript tests for SidebarTree component** — 63 tests. | 9bc425bb |
| 2026-06-29 | **P5 — Add TypeScript tests for ActivityFeed component** — 45 tests. | 3d378dc3 |
| 2026-06-29 | **P5 — Add TypeScript tests for GraphView component** — 20 tests. | 3d378dc3 |
| 2026-06-29 | **P5 — Add TypeScript tests for AiAssistant component** — 30 tests. | 3d378dc3 |
| 2026-06-29 | **P3 — Code-split ImageLightbox (987K→7K)** — React.lazy() in PageView.tsx and PageEditor.tsx. | 9e64d448 |
| 2026-06-29 | **P3 — Lazy-load katex (129K) via dynamic import** — Replaced static import with dynamic import() in Math.tsx. Shared KatexRenderer component. MathInline lazily rendered via ReactNodeViewRenderer. katex loads only when a math node is first encountered. +clippy auto-fixes (27 issues), +providerReady state. | bb55fe26 |
| 2026-06-29 | **P4 — Extract collaboration from lib.rs into collaboration.rs** | a5263be9 |
| 2026-06-29 | **P4 — Extract App.tsx sidebar tree into SidebarTree.tsx** | 84c4f472 |
| 2026-06-29 | **P4 — Remove 507 lines of dead admin code from App.tsx** | a4510c47 |
| 2026-06-29 | **P4 — Complete admin panels extraction from App.tsx into AdminPanels.tsx** | 20e6775c |
