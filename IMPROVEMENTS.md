# SpacetimeWiki — Improvement Backlog

Living queue managed by the continuous-improvement cron. The cron reads this file,
cleans up completed items, researches new improvement opportunities, adds them,
and works the top pending item each tick.

---

## PENDING

| Priority | Item | Notes |
|----------|------|-------|
| P4 | **Replace manual SQL mappers with STDB SDK typed bindings** — api mappers.ts has 33 manual row mappers that duplicate auto-generated `module_bindings/` | Tech debt reduction — would change data flow deeply |
| P4 | **Further extract lib.rs into domain modules** — 3500 lines remain in lib.rs across ~28 sections | Refactor for maintainability |

---

## Recently Completed

| Date | Item | Commit |
|------|------|--------|
| 2026-06-28 | **P5 — Add Rust unit tests!** 12 tests: hash_password, base32_decode, verify_totp_code, and more added to helpers.rs | efd60f8a |
| 2026-06-28 | **P5 — Complete .env.example!** 88 lines documenting all env vars across all 4 services (STDB, API server, frontend, module publisher) | fe2ed807 |
| 2026-06-28 | **P4 — Split App.tsx layout from routes!** 6232→3268 lines (48% reduction). 10 admin panels + tiptap helpers extracted. Duplicate login page components removed. | 1e360f28 |
| 2026-06-28 | **P4 — Split lib.rs into Rust modules!** 4555-line lib.rs → tables.rs (50 structs) + helpers.rs (10 functions) + lib.rs (reducers). 0 errors, 0 warnings. | 718b231a |
| 2026-06-28 | **P4 — Split api.ts into 21 domain modules!** 1874-line api.ts → types/mappers/client/pages/collections/users/auth/groups/comments/shares/tags/attachments/webhooks/search/subscriptions/transclusions/audit/access-requests/collaboration/settings/index. Barrel re-export preserves all imports. | 862bfe2d |
| 2026-06-28 | **P5 — Fix Rust compiler warnings!** Removed dead TOTP/MFA functions + unused imports + unused params + unused `now`. Clean Rust build — 0 warnings, 0 errors. | c5897ebd |
| 2026-06-28 | **P5 — Dependency audit!** Checked npm, Cargo, Python. TS 6.0 and Tailwind 4 are major upgrades available. Documented recommendations. | fe2ed807 |
| 2026-06-28 | **P4 — Split App.tsx admin panels!** 5382-line App.tsx → 3249 lines. Extracted all 11 inline admin components + duplicate LoginView to separate files under components/admin/. 0 TS errors, pre-commit hooks pass. | 4843986e |
