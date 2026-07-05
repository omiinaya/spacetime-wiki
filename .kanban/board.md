# Kanban — SpacetimeWiki Improvement Tracker

This file tracks improvements being worked on by the continuous-improvement cron.
Created as a local kanban board.

---

## ✅ Done

| Date | Item | Notes |
|------|------|-------|
| 2026-07-02 | P4 — Rust reducer integration tests | Created `server/tests/` with pytest-asyncio test suite (14 tests) exercising core reducers via STDB HTTP API. Added Dockerfile, docker-compose test service, and Docker-based runner. Added CI steps for `cargo test --lib` and `clippy`. |
| 2026-07-05 | P3 — Fix E2E tests to work with fresh DB | Created `web/e2e/global-setup.ts` seed data fixture (creates admin user, Uncategorized collection, 3 sample pages). Added `globalSetup` to Playwright config. Fixed time regex in home.spec.ts to accept "just now"/"Xm ago". SHA: 924f0b1 |

## 🔄 In Progress

*(none)*

## 📋 Backlog

| # | Priority | Item | 
|---|----------|------|
| 1 | P4 | Rust reducer integration tests (DONE) |
| 2 | P5 | Reduce repetitive struct-construction tests |
| 3 | P5 | MCP server tests |
| 4 | P5 | CI pipeline — add Rust test step (DONE) |
