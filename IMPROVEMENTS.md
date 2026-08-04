# SpacetimeWiki — Improvement Backlog

Living queue managed by the continuous-improvement cron. The cron reads this file,
cleans up completed items, researches new improvement opportunities, adds them,
and works the top pending item each tick.

---

## PENDING

| Priority | Item                                                                                                                                                                                                                |
| -------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| P5       | **Rust: reduce repetitive struct-construction tests** — ~2,000 lines of test code are repetitive `default_*()` tests. Consolidate into parameterized tests.                                                         |
| P5       | **New: MCP server tests** — Add unit tests for the MCP server's 6 tools and resource handlers. _(STALE — 118 tests exist across test_config.py, test_stdb_client.py, test_tools.py as of 2026-08-04; see ROADMAP.)_ |

---

## Recently Completed

| Date       | Item                                                                                                                                                                                                                                                                                              | Commit           |
| ---------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------- |
| 2026-08-04 | **Perf — editor bundle removed from initial load** — lazy SharedPageView + `advancedChunks` groups move React out of the editor chunk; eager load 920 kB → 314 kB.                                                                                                                                | 665f6d9          |
| 2026-08-04 | **Fix — zero clippy warnings** — removed 9 dead credential/bridge test helpers, literal unwrap, useless vec/format/contains.                                                                                                                                                                      | 1deb976          |
| 2026-07-05 | **P3 — Remove stale deps: `@vitejs/plugin-react-swc` + `optimizeDeps.include`** — SWC plugin removed from package.json + lockfile. Vite config cleaned.                                                                                                                                           | 8958319          |
| 2026-07-02 | **P4 + P5 — Rust reducer integration tests + CI `cargo test`/clippy** — Created `server/tests/` with pytest-asyncio test suite (14 tests) exercising core reducers via STDB HTTP API. Added Dockerfile + docker-compose test service. Added `cargo test --lib` and `clippy` steps to CI pipeline. | _(working tree)_ |
| 2026-07-02 | **P1 — MCP server error handling** — Added try/except + logging to all 6 tool handlers, both resource handlers, and STDB client. Added retry logic (3 attempts, exponential backoff) to STDB SQL operations.                                                                                      | _(staged)_       |
| 2026-07-02 | **P4 — Frontend: reduce `any` types in Tiptap code** — 138 `any` removed across helpers.ts (46→0), Transclusion.tsx (27→0), PageEditor.tsx (34→5), PageView.tsx (36→0). New `prosemirror-types.ts` type definitions created.                                                                      | d4d308b5         |
| 2026-07-01 | **P3-SEC — SQL injection surface audit — MCP server had 8 f-string SQL queries**                                                                                                                                                                                                                  | e3e4895b         |
| 2026-07-01 | **P4 — Fix 44 Rust `dead_code` warnings**                                                                                                                                                                                                                                                         | 0f716e40         |
| 2026-07-01 | **P3 — Make ~15 non-idempotent reducers safe on retry**                                                                                                                                                                                                                                           | ed3bfcb0         |
