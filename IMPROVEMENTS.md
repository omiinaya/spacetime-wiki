# SpacetimeWiki — Improvement Backlog

Living queue managed by the continuous-improvement cron. The cron reads this file,
cleans up completed items, researches new improvement opportunities, adds them,
and works the top pending item each tick.

---

## Status: PENDING

### P3 — SAML 2.0 SSO
Add SAML 2.0 identity provider support alongside existing OIDC. Requires SAML library for handling SAML assertions, metadata XML, and callback endpoints. Admin panel SSO tab to include SAML provider configuration.
Files: server/spacetimedb/src/lib.rs, web/src/lib/api.ts, web/src/App.tsx
Difficulty: Hard
Est: 3h

---

## Recently Completed

| Date | Item | Commit | 
|------|------|--------|
| 2026-06-25 | P3 — Multiple editor modes (Markdown ↔ WYSIWYG toggle) | 67fb0da |
| 2026-06-24 | P3 — Comment @mentions | — |
| 2026-06-24 | P3 — PlantUML diagrams | b84a9df |
| 2026-06-24 | P3 — ZIP export (pages + assets) | — |
| 2026-06-24 | P3 — Comment reactions (emoji) | 98ef06d |
| 2026-06-24 | P3 — PDF export via window.print() | f7fa047 |
| 2026-06-24 | P2 — Responsive/mobile-friendly layout | 5330ead |
| 2026-06-24 | P3 — Draw.io/diagrams.net integration | 73afd15 |
| 2026-06-24 | P2 — Pinned documents | 4763aeb |
| 2026-06-24 | P2 — Page color accent | 9a55462 |
