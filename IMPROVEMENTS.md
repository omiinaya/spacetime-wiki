# SpacetimeWiki — Improvement Backlog

Living queue managed by the continuous-improvement cron. The cron reads this file,
cleans up completed items, researches new improvement opportunities, adds them,
and works the top pending item each tick.

---

## PENDING

| Priority | Item |
|----------|------|
| P4 | **Rust reducer integration tests** — Only ~20% of reducer logic is covered by unit tests. Add tests that exercise reducers against a live STDB instance. |
| P5 | **Rust: reduce repetitive struct-construction tests** — ~2,000 lines of test code are repetitive `default_*()` tests. Consolidate into parameterized tests. |
| P5 | **New: MCP server tests** — Add unit tests for the MCP server's 6 tools and resource handlers. Currently untested. |
| P5 | **New: CI pipeline — add Rust test step** — CI currently runs tsc + vitest + cargo check but doesn't run Rust unit tests (201 tests). Add `cargo test` to `.github/workflows/ci.yml`. |

---

## Recently Completed

| Date | Item | Commit |
|------|------|--------|
| 2026-07-02 | **P4 — Frontend: reduce `any` types in Tiptap code** — 138 `any` removed across helpers.ts (46→0), Transclusion.tsx (27→0), PageEditor.tsx (34→5), PageView.tsx (36→0). New `prosemirror-types.ts` type definitions created. | d4d308b5 |
| 2026-07-01 | **P3-SEC — SQL injection surface audit — MCP server had 8 f-string SQL queries** | e3e4895b |
| 2026-07-01 | **P4 — Fix 44 Rust `dead_code` warnings** | 0f716e40 |
| 2026-07-01 | **P3 — Make ~15 non-idempotent reducers safe on retry** | ed3bfcb0 |
| 2026-07-01 | **P3 — Replace SHA-256 password hashing with Argon2** | 1176880c |
| 2026-07-01 | P4 — Seed wiki content — Admin user, 4 collections, 10 pages | 16747b0b |
| 2026-07-01 | **P4 — Tailwind v4 migration** | a73b4886 |
| 2026-07-01 | P5 — Fix WASM release build + regenerate TS bindings | fde6dc6c / d42463b9 |
