# SpacetimeWiki — Improvement Backlog

Living queue managed by the continuous-improvement cron. The cron reads this file,
cleans up completed items, researches new improvement opportunities, adds them,
and works the top pending item each tick.

---

## PENDING

| Priority | Item | Notes |
|----------|------|-------|
| P4 | **Update npm dependencies (minor/patch safe)** — lucide-react 1.21.0→1.22.0, mermaid 11.15.0→11.16.0, postcss 8.5.15→8.5.16, react-router-dom 7.18.0→7.18.1, @types/jszip 3.4.0→3.4.1, typescript-eslint 8.61.1→8.62.1 | |
| P4 | **Add TypeScript tests for PageView.tsx** — Core page view component, no unit tests yet | |
| P4 | **Add TypeScript tests for PageEditor.tsx** — Core page editor component, no unit tests yet | |
| P5 | **Add TypeScript tests for admin components (15 files)** — All admin panel components untested | |
| P5 | **Add TypeScript tests for Tiptap extensions (6 files)** — Math.tsx, Mermaid.tsx, Drawio.tsx, PlantUML.tsx, Transclusion.tsx, SyncedBlock.tsx, DatabaseBase.tsx, ImageEnhanced.tsx | |
| P5 | **Add TypeScript tests for lib/ utility modules (5 files)** — api.ts, helpers.ts, subscriptions.ts, tiptap-helpers.ts, useCollaboration.ts, yjs-stdb-provider.ts | |

---

## Recently Completed

| Date | Item | Commit |
|------|------|--------|
| 2026-06-29 | **P1 — PageView.tsx StarterKit crash** — Import StarterKit from @tiptap/starter-kit | 873614dd |
| 2026-06-29 | **P1 — Vite proxy wrong port (8722→8711)** — Fixed vite.config.ts proxy target | 873614dd |
| 2026-06-29 | **P3 — Light mode toggle doesn't work** — Synced Tailwind 'dark' class with theme state | 7aa2946f |
| 2026-06-29 | **P3 — API Docs broken URL** — Used relative /docs path, proxy in vite.config.ts | d0a37fe5 |
| 2026-06-29 | **P4 — Session lost on full page nav** — Fixed: `useEffect` reads `sw_user_id` from localStorage on pathname change | 97f6fc83 |
| 2026-06-29 | **P4 — TypeScript tests for 6 uncovered components** — LanguageSwitcher, MediaManager, MentionInput, PagePermissions, RevisionDiff, WebhookSettings (129 total tests) | eaea2704 |
| 2026-06-29 | **E2E: 59/59 tests passing** — Fixed anchorData.text.slice crash. All 59 Playwright tests pass. | 0e2aedab |
| 2026-06-29 | **P3 — Performance: lazy-load 6 route pages, dynamic mermaid, code-split typed-sql** — React.lazy for 6 routes, dynamic mermaid import, manual vendor/editor chunks | 9d15ee5f |
| 2026-06-29 | **E2E browser test of all features** — 25 features tested, 17 pass, 8 bugs found. BUG-1 (StarterKit crash) and BUG-2 (Vite proxy) fixed. | 873614dd |
| 2026-06-29 | **P4 — Complete admin panels extraction from App.tsx into AdminPanels.tsx** — 5 sub-components extracted | 20e6775c |
