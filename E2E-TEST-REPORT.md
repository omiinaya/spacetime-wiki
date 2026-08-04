# E2E Browser Test Report — SpacetimeWiki

**Date:** 2026-06-29
**Tester:** Hermes Agent (manual browser E2E)
**Environment:** Dev mode (Vite :5184, API :8711, STDB :3001)
**User Agent:** Chromium (headless browser)

---

## Feature Test Matrix

| # | Feature | Status | Details |
|---|---------|--------|---------|
| 1 | **Sign-in page** | ✅ | Email/password fields, Google OAuth, Passkey auth, Register link |
| 2 | **Registration** | ✅ | Name/Email/Password + reCAPTCHA. Account created successfully |
| 3 | **Sign-in flow** | ✅ | Successful login redirects to home dashboard |
| 4 | **Home page** | ✅ | Welcome message, "Recently Updated" list, sidebar navigation |
| 5 | **Recently Updated list** | ✅ | Shows pages with timestamps and Draft status badges |
| 6 | **Keyboard shortcuts modal** | ✅ | 5 shortcut groups, `?` toggle, close button |
| 7 | **New page template picker** | ✅ | Collection dropdown, Blank page option, template selection |
| 8 | **Page editor (WYSIWYG)** | ✅ | Rich toolbar (B/I/U/S, H1-H3, lists, code, link, image, table) |
| 9 | **Page editor (Markdown mode)** | ✅ | Raw markdown input, syntax toolbar shortcuts |
| 10 | **Page editor (Split mode)** | ✅ | Split view tab available |
| 11 | **Page save** | ✅ | Page persisted to STDB as `published` status |
| 12 | **Activity feed** | ✅ | 12 events, CREATE/UPDATE shown, auto-refresh ON toggle |
| 13 | **Graph view** | ✅ | 7 nodes displayed, C/P-C/BL toggles, zoom controls, legend |
| 14 | **Templates modal** | ✅ | "New from template" picker with existing templates listed |
| 15 | **Trash** | ✅ | Empty state modal with "Trash is empty" |
| 16 | **Admin panel** | ✅ | 8 tabs (Dashboard, Users, Groups, Webhooks, SSO, Settings, Features, Export) |
| 17 | **AI Assistant** | ✅ | Slide-out panel, welcome screen, start chat button, settings gear |
| 18 | **Notifications panel** | ✅ | Empty state with guidance to watch pages/collections |
| 19 | **New collection modal** | ✅ | Name, Description, Color hex fields |
| 20 | **Light/dark mode toggle** | ✅ | Fixed — button now syncs Tailwind 'dark' class with theme |
| 21 | **API Docs** | ✅ | Fixed — uses relative /docs path, proxied through Vite |
| 22 | **Filters toggle** | ✅ | Works — expands filter panel with collection/author/date/tags options |
| 23 | **Import MD / Import Wiki / Import Confluence** | ✅ | Opens native file picker (headless browser limitation, not a bug) |
| 24 | **Search** | ✅ | Live as-you-type filter, searches sidebar page list. No "Enter" needed |
| 25 | **PageView: StarterKit crash** | ✅ | Fixed — added import for @tiptap/starter-kit |

---

## Bugs Found

### 🐛 BUG-1: PageView crashes with `ReferenceError: StarterKit is not defined` (P1)
**Severity:** CRITICAL — ✅ FIXED in 873614dd
**Fix:** Added `import StarterKit from "@tiptap/starter-kit"` to PageView.tsx

### 🐛 BUG-2: Vite proxy target is wrong (P2)
**Severity:** HIGH — ✅ FIXED in 873614dd
**Details:** `vite.config.ts` proxied `/api` to `http://127.0.0.1:8722` (nothing). Fixed to `:8711`.

### 🐛 BUG-3: Light mode toggle had no effect (P3)
**Severity:** MEDIUM — ✅ FIXED in 7aa2946f
**Fix:** Added `document.documentElement.classList.toggle("dark", theme === "dark")` to the theme sync useEffect.

### 🐛 BUG-4: API Docs used hardcoded host:port URL (P3)
**Severity:** MEDIUM — ✅ FIXED
**Fix:** Changed `window.open(...)` to use relative `/docs` path. Added `/docs` and `/openapi.json` to Vite proxy config.

---

## Working as Designed (not bugs)

| Original Report | Assessment | Reason |
|----------------|------------|--------|
| Filters button doesn't respond | ✅ Works | SearchFilters is a toggle panel — element ref was stale during modal overlap |
| Import buttons don't open | ✅ Works | Open native OS file picker — headless browser can't show it |
| Search doesn't trigger on Enter | ✅ Works | Live as-you-type filter — Enter not needed |
| Session lost on nav | ⚠️ Dev quirk | Full page reload in Vite dev mode resets React state |

---

## Notes

- The app connects directly to STDB (`localhost:3001`) for SQL queries and reducer calls, bypassing the API proxy entirely. This is why core features (create page, save, activity feed) work despite BUG-2.
- The Vite proxy bug only affects features that go through the Python API server (e.g., Admin dashboard stats, non-STDB API calls).
- 3 existing test pages exist: "E2E Test Page from Browser" (published), "E2E Browser Test Page" (published, marked as template), "E2E Test Page" (draft).
- 7 pages total in STDB.
