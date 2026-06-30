# SpacetimeWiki — Improvement Backlog

Living queue managed by the continuous-improvement cron. The cron reads this file,
cleans up completed items, researches new improvement opportunities, adds them,
and works the top pending item each tick.

---

## PENDING

| Priority | Item | Notes |
|----------|------|-------|
| P5 | **Add TypeScript tests for more Tiptap extensions** — Mermaid.tsx, Math.tsx, Transclusion.tsx, SyncedBlock.tsx, DatabaseBase.tsx, ImageEnhanced.tsx | Drawio.tsx, PlantUML.tsx done |

---

## Recently Completed

| Date | Item | Commit |
|------|------|--------|
| 2026-06-30 | **P5 — TypeScript tests for lib/tiptap-helpers.ts** — 40 tests (tiptapToMarkdown complete impl, tiptapToHTML with callouts, htmlToProseMirror, markdownToProseMirror, arrayBufferToBase64Url). Suite now 1022/1022 clean. | 34381e54 |
| 2026-06-30 | **P5 — TypeScript tests for lib/ utility modules (5 files)** — helpers.ts (38), subscriptions.ts (23), yjs-stdb-provider.ts (18), useCollaboration.ts (12). Total 91 new tests. Full suite now 982/982 clean. | 668d0966 |
| 2026-06-30 | **P5 — TypeScript tests for admin components (15 files)** — 136 tests across all admin panels (AdminPanels, ApiKeySettings, UsersPanel, GroupsPanel, SettingsPanel, SsoPanel, OAuthSettings, LdapSettings, MfaSettings, PasskeySettings, ScimSettings, FeatureFlags, BulkExport, TrashSettings, InvitationSettings). All 23 test issues fixed — suite now 891/891 clean. | 89fc9502 |
| 2026-06-29 | **P4 — TypeScript tests for PageView.tsx** — 38 tests (loading, error, loaded, actions, comments, export, share, TOC, color picker, attachments, word count, revisions, a11y). Fixed 5 a11y violations (back button, emoji picker, send button, file input, editor aria-label) and heading level hierarchy. | 16ea81cb |
| 2026-06-29 | **P1 — PageView.tsx StarterKit crash** — Import StarterKit from @tiptap/starter-kit | 873614dd |
| 2026-06-29 | **P1 — Vite proxy wrong port (8722→8711)** — Fixed vite.config.ts proxy target | 873614dd |
| 2026-06-29 | **P3 — Light mode toggle doesn't work** — Synced Tailwind 'dark' class with theme state | 7aa2946f |
| 2026-06-29 | **P3 — API Docs broken URL** — Used relative /docs path, proxy in vite.config.ts | d0a37fe5 |
| 2026-06-29 | **P4 — Session lost on full page nav** — Fixed: `useEffect` reads `sw_user_id` from localStorage on pathname change | 97f6fc83 |
| 2026-06-29 | **P4 — TypeScript tests for 6 uncovered components** — LanguageSwitcher, MediaManager, MentionInput, PagePermissions, RevisionDiff, WebhookSettings (129 total tests) | eaea2704 |
| 2026-06-29 | **E2E: 59/59 tests passing** — Fixed anchorData.text.slice crash. All 59 Playwright tests pass. | 0e2aedab |
