# SpacetimeWiki — Improvement Backlog

Living queue managed by the continuous-improvement cron. The cron reads this file,
cleans up completed items, researches new improvement opportunities, adds them,
and works the top pending item each tick.

---

## PENDING

| Priority | Item |
|----------|------|
| P3 | **Remove stale deps: `@vitejs/plugin-react-swc` + `optimizeDeps.include`** — SWC plugin installed but unused (~2MB waste). Vite 8 auto-pre-bundles highlight.js/lowlight — stale `optimizeDeps.include` entries. 10 min effort. |
| P3 | **Fix 4 Rust clippy warnings** — `map_or(false, |u| ...)` → `.is_some_and(|u| ...)` patterns in users.rs and lib.rs. 10 min effort. |
| P5 | **Rust: reduce repetitive struct-construction tests** — ~2,000 lines of test code are repetitive `default_*()` tests. Consolidate into parameterized tests. |
| P5 | **New: MCP server tests** — Add unit tests for the MCP server's 6 tools and resource handlers. Currently untested. |

---

## Recently Completed

| Date | Item | Commit |
|------|------|--------|
| 2026-07-02 | **P4 + P5 — Rust reducer integration tests + CI `cargo test`/clippy** — Created `server/tests/` with pytest-asyncio test suite (14 tests) exercising core reducers via STDB HTTP API. Added Dockerfile + docker-compose test service. Added `cargo test --lib` and `clippy` steps to CI pipeline. | *(working tree)* |
| 2026-07-02 | **P1 — MCP server error handling** — Added try/except + logging to all 6 tool handlers, both resource handlers, and STDB client. Added retry logic (3 attempts, exponential backoff) to STDB SQL operations. | *(staged)* |
| 2026-07-02 | **P4 — Frontend: reduce `any` types in Tiptap code** — 138 `any` removed across helpers.ts (46→0), Transclusion.tsx (27→0), PageEditor.tsx (34→5), PageView.tsx (36→0). New `prosemirror-types.ts` type definitions created. | d4d308b5 |
| 2026-07-01 | **P3-SEC — SQL injection surface audit — MCP server had 8 f-string SQL queries** | e3e4895b |
| 2026-07-01 | **P4 — Fix 44 Rust `dead_code` warnings** | 0f716e40 |
| 2026-07-01 | **P3 — Make ~15 non-idempotent reducers safe on retry** | ed3bfcb0 |
