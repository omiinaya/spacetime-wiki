# SpacetimeWiki — Improvement Backlog

Living queue managed by the continuous-improvement cron. The cron reads this file,
cleans up completed items, researches new improvement opportunities, adds them,
and works the top pending item each tick.

---

## PENDING

| Priority | Item | Notes |
|----------|------|-------|
| P1 | **PageView.tsx StarterKit crash** — ✅ FIXED in 873614dd (import StarterKit from @tiptap/starter-kit) | |
| P1 | **Vite proxy wrong port (8722→8711)** — ✅ FIXED in 873614dd | |
| P3 | **Light mode toggle doesn't work** — ✅ FIXED in 7aa2946f (sync Tailwind 'dark' class) | |
| P3 | **API Docs broken URL** — ✅ FIXED in (use relative /docs path, proxy in vite.config.ts) | |
| P4 | **Session lost on full page nav** — dev mode issue, persists localStorage but React re-mount resets auth | |
| P4 | **Add TypeScript tests for 6 uncovered components** — LanguageSwitcher, MediaManager, MentionInput, PagePermissions, RevisionDiff, WebhookSettings — 32% of components still untested. | |

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
| 2026-06-29 | **E2E browser test of all features** — 25 features tested, 17 pass, 8 bugs found. BUG-1 (StarterKit crash) and BUG-2 (Vite proxy) fixed. Full report in E2E-TEST-REPORT.md | 873614dd |
| 2026-06-29 | **P3 — Performance: lazy-load 6 route pages, dynamic mermaid import, code-split typed-sql** — Converted HomeView, ActivityView, FavoritesView, PageViewWrapper, SlugView, LoginView to React.lazy. Dynamic import mermaid (~800KB) only on first diagram render. Fixed ineffective dynamic import of typed-sql.ts (was pulled into main bundle by pages.ts). Added manual vendor/editor chunk splitting. | 9d15ee5f |
| 2026-06-29 | **E2E: 59/59 tests passing** — Fixed anchorData.text.slice crash in PageView comments. Fixed 7 pre-existing E2E test bugs (strict mode violations, getByDisplayValue, webSocket fallback timing, advanced search syntax assertion). All 59 Playwright tests pass. | 0e2aedab |
