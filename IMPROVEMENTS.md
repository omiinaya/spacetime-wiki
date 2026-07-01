# SpacetimeWiki — Improvement Backlog

Living queue managed by the continuous-improvement cron. The cron reads this file,
cleans up completed items, researches new improvement opportunities, adds them,
and works the top pending item each tick.

---

## PENDING

| Priority | Item |
|----------|------|
| P4 | **Backup code placeholder "XXXX XXXX" → proper MFA backup code label** — Replace placeholder text in `LoginView.tsx` (line 194) and test files with appropriate label (e.g. "Backup code" or "XXXX-XXXX"). |

---

## Recently Completed

| Date | Item | Commit |
|------|------|--------|
| 2026-07-01 | **P4 — Fix `tsc -b` build errors (18 total)** — Fixed all `tsc -b` errors: (1) `client.ts` schema param widened from `object & Record<string, unknown>` to `object` (RowBuilder from module_bindings doesn't satisfy `Record<string, unknown>`) — 7 errors. (2) `Transclusion.tsx` JSX namespace → `React.ElementType` — 3 errors. (3) `PageEditor.tsx` removed Typography.configure({...true}) — Tiptap v3.27 deprecated boolean config — 7 errors. (4) `PageView.tsx` removed unused `@ts-expect-error` — 1 error. `tsc --noEmit` and `tsc -b` both clean. All 1191 tests pass. Rust `cargo check` clean. | 35ea2855 |
