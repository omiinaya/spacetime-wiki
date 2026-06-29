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
| 20 | **Light/dark mode toggle** | ❌ | Button click does not switch theme (stays dark) |
| 21 | **API Docs** | ❌ | Navigates to broken URL (`/api-docs`), "This site can't be reached" |
| 22 | **Filters** | ❌ | Button click has no visible effect |
| 23 | **Import MD / Import Wiki / Import Confluence** | ❌ | Button highlights in sidebar but no modal/page opens |
| 24 | **Search** | ❌ | Typing + Enter does not trigger search results |
| 25 | **PageView: StarterKit crash** | ❌ | `ReferenceError: StarterKit is not defined` — page crashes |

---

## Bugs Found

### 🐛 BUG-1: PageView crashes with `ReferenceError: StarterKit is not defined` (P1)
**Severity:** CRITICAL — page rendering is completely broken
**Steps:**
1. Navigate to home
2. Click any page in "Recently Updated"
3. ❌ Page shows React error overlay: `ReferenceError: StarterKit is not defined`
**Root cause:** `StarterKit` is used in `PageView.tsx` but not imported. It's likely `@tiptap/starter-kit` or a local `StarterKit.ts` file.
**File:** `web/src/pages/PageView.tsx`

### 🐛 BUG-2: Vite proxy target is wrong (P2)
**Severity:** HIGH — API calls from frontend fail silently
**Details:** `vite.config.ts` proxies `/api` to `http://127.0.0.1:8722` but the wiki API server is on port 8711. Port 8722 is not running (Spacetime-TV uses 8720).
**File:** `web/vite.config.ts` line 11

### 🐛 BUG-3: API Docs button navigates to broken URL (P3)
**Severity:** MEDIUM
**Details:** Clicking "API Docs" in sidebar navigates to `/api-docs` which resolves to a broken external URL. Should either open the FastAPI `/docs` endpoint or an in-app documentation page.

### 🐛 BUG-4: Light mode toggle has no effect (P3)
**Severity:** MEDIUM
**Details:** Clicking "Light mode" button does not switch the theme. The CSS class on `<html>` stays `dark`. The button text remains "Light mode" (should toggle to "Dark mode").

### 🐛 BUG-5: Filters button does not respond (P3)
**Severity:** MEDIUM
**Details:** Clicking the Filters button in the sidebar has no visible effect. No modal, dropdown, or panel appears.

### 🐛 BUG-6: Import buttons (MD/Wiki/Confluence) don't open anything (P4)
**Severity:** LOW
**Details:** Clicking "Import MD", "Import Wiki", or "Import Confluence" highlights the sidebar item but doesn't open any modal, file picker, or page.

### 🐛 BUG-7: Search does not trigger on Enter (P4)
**Severity:** LOW
**Details:** Typing a query in the search bar and pressing Enter does not navigate to search results. Search might only work when the user is logged in or via a different UI pattern.

### 🐛 BUG-8: Session lost on page navigation (P4)
**Severity:** LOW (dev mode only)
**Details:** Full page reloads/SPA navigations in dev mode lose the auth session. The user needs to sign in again.

---

## Notes

- The app connects directly to STDB (`192.168.1.10:3001`) for SQL queries and reducer calls, bypassing the API proxy entirely. This is why core features (create page, save, activity feed) work despite BUG-2.
- The Vite proxy bug only affects features that go through the Python API server (e.g., Admin dashboard stats, non-STDB API calls).
- 3 existing test pages exist: "E2E Test Page from Browser" (published), "E2E Browser Test Page" (published, marked as template), "E2E Test Page" (draft).
- 7 pages total in STDB.
