# E2E Coverage Matrix — SpacetimeWiki Frontend

> **Goal: Playwright E2E coverage of the WHOLE frontend = 100%.**
> This document is the source of truth for what "100%" means: every route,
> every page component, every user-facing feature/flow, and every admin panel
> must have at least one Playwright spec that exercises it against live STDB
> + API + Vite preview. A route that renders but has no assertions on its
> interactions is NOT covered — it must be marked with the flow it tests.
>
> Status legend: ✅ covered · 🔶 partial (renders, missing flows) · ❌ not covered

## 1. Routes

| Route | Page | Spec file | Status |
|---|---|---|---|
| `/` | HomeView | `home.spec.ts` | ✅ |
| `/new` | PageEditor (create) | `page-editor.spec.ts`, `templates.spec.ts` | ✅ |
| `/page/:id` | PageViewWrapper | `page-view.spec.ts`, `comments.spec.ts`, `public-sharing.spec.ts` | ✅ |
| `/page/:id/edit` | PageEditor (edit) | `page-view.spec.ts` (Edit nav) | 🔶 editor save flow via edit route |
| `/p/:slug` | SlugView | `slug-permalink.spec.ts` | ✅ |
| `/activity` | ActivityView | `pages.spec.ts` | 🔶 renders heading only |
| `/favorites` | FavoritesView | `pages.spec.ts`, `page-lifecycle.spec.ts` | ✅ |
| `/graph` | GraphView | `pages.spec.ts` | 🔶 renders only |
| `/permalink/:id` | PermalinkRedirect | `slug-permalink.spec.ts` | ✅ |
| `/login` | LoginView | `login.spec.ts` | ✅ |
| `/shared/:token` | SharedPageView | `public-sharing.spec.ts`, `share-link-flow.spec.ts` | ✅ |
| `/trash` | TrashDialog | `trash.spec.ts`, `trash-actions.spec.ts` | ✅ |
| `/admin` | AdminPanels | `navigation.spec.ts`, `admin-panels.spec.ts` | ✅ |
| `/templates` | redirect to `/` | `templates.spec.ts` | ✅ |
| `/oauth/google/callback` | GoogleCallback | `auth-callbacks.spec.ts` | ✅ |
| `/oauth/callback` | OAuthCallback | `auth-callbacks.spec.ts` | ✅ |
| `/oauth/oidc/callback` | OidcCallback | `auth-callbacks.spec.ts` | ✅ |
| `/auth/saml/callback` | SamlCallback | `auth-callbacks.spec.ts` | ✅ |

## 2. Admin panels (16 tabs inside AdminPanels)

| Tab | Panel component | Spec | Status |
|---|---|---|---|
| dashboard | AdminDashboard | `admin-panels.spec.ts` | ✅ |
| users | UsersPanel | `admin-panels.spec.ts` | ✅ |
| groups | GroupsPanel | `admin-panels.spec.ts` | ✅ |
| webhooks | WebhookSettings | `admin-panels.spec.ts` | ✅ |
| sso | SsoPanel | `admin-panels.spec.ts` | ✅ |
| settings | SettingsPanel | `admin-panels.spec.ts` | ✅ |
| features | FeatureFlags | `admin-panels.spec.ts` | ✅ |
| export | BulkExport | `admin-panels.spec.ts` | ✅ |
| scim | ScimSettings | `admin-panels.spec.ts` | ✅ |
| passkeys | PasskeySettings | `admin-panels.spec.ts` | ✅ |
| invitations | InvitationSettings | `admin-panels.spec.ts` | ✅ |
| access_requests | AccessRequestPanel | `admin-panels.spec.ts` | ✅ |
| mfa | MfaSettings | `admin-panels.spec.ts` | ✅ |
| oauth | OAuthSettings | `admin-panels.spec.ts` | ✅ |
| ldap | LdapSettings | `admin-panels.spec.ts` | ✅ |
| agent_access | AgentAccessPanel | `admin-panels.spec.ts` | ✅ |

## 3. Page-level features (flows on existing pages)

| Feature | Component(s) | Spec | Status |
|---|---|---|---|
| Create page (full save flow) | PageEditor | `page-editor.spec.ts` (via helpers) | ✅ |
| Edit existing page → save | PageEditor | — | 🔶 |
| Publish / draft status toggle | PageView toolbar | `page-lifecycle.spec.ts` | ✅ |
| Favorite / unfavorite a page | PageView toolbar | `page-lifecycle.spec.ts` | ✅ |
| Share dialog open + create link | ShareDialog | `public-sharing.spec.ts`, `share-link-flow.spec.ts` | ✅ |
| Password-protected share access | ShareDialog / SharedPageView | `share-link-flow.spec.ts` | ✅ |
| Page tags add/remove | PageTags | `tags.spec.ts` | ✅ |
| Page permissions dialog | PagePermissions | — | ❌ |
| Comments create | comments.spec.ts | ✅ | |
| Comments reply / resolve / react / delete | comments-extended.spec.ts | ✅ | |
| Revision history / diff | RevisionDiff | — | ❌ |
| Page context menu | PageContextMenu | — | ❌ |
| Page status dropdown (draft/published) | PageView | `page-lifecycle.spec.ts` | ✅ |
| Collection CRUD (create/rename/delete) | CollectionDialog | `collection-crud.spec.ts`, `collection-edit.spec.ts` | ✅ |
| Collection members | — | — | ❌ |
| Import Markdown / Notion / Confluence | Sidebar import buttons | `navigation.spec.ts` | 🔶 button presence only |
| Template picker → save page as template / create from template | TemplatePicker | `templates.spec.ts`, `templates-usage.spec.ts` | ✅ |
| Search: type → results → navigate | SearchFilters | `search.spec.ts`, `search-flow.spec.ts` | ✅ |
| Search filters (collection/status/date) | SearchFilters | `search-flow.spec.ts` | ✅ |
| Command palette | CommandPalette | `command-palette.spec.ts` | ✅ |
| Keyboard shortcuts modal | KeyboardShortcuts | `navigation.spec.ts`, `pages.spec.ts` | ✅ |
| AI Assistant panel open + config | AiAssistant | `ai-assistant.spec.ts` | ✅ |
| Notification bell | NotificationBell | `notifications-settings.spec.ts` | ✅ |
| Language switcher | LanguageSwitcher | `notifications-settings.spec.ts` | ✅ |
| Theme toggle | Sidebar | `navigation.spec.ts` | ✅ |
| Sidebar tree filtering / collapse | SidebarTree | `search-flow.spec.ts` | 🔶 tree filtering covered; collapse missing |
| Media manager / image upload | MediaManager | `image-upload.spec.ts` | 🔶 loads only |
| Image lightbox | ImageLightbox | — | ❌ |
| Trash restore page | TrashDialog | `trash-actions.spec.ts` | ✅ |
| Trash delete-forever | TrashDialog | `trash-actions.spec.ts` | ✅ |
| Empty trash | TrashDialog | — | ❌ |
| Sign out | LoginView | `login.spec.ts` | ✅ |
| Registration flow | LoginView | `login.spec.ts` | ✅ |

## 4. Auth / SSO callback error surfaces

| Flow | Expected render | Status |
|---|---|---|
| Google callback missing code | "Authentication failed: No authorization code" | ✅ |
| OAuth callback missing code | "Authentication failed: No authorization code" | ✅ |
| OIDC callback missing code | "Authentication failed: No authorization code" | ✅ |
| SAML callback missing response | "No SAMLResponse received." | ✅ |
| Permalink to existing page | redirects to `/page/:id` | ✅ |
| Permalink to missing page | "Page not found" | ✅ |
| Slug to existing page | redirects to `/page/:id` | ✅ |
| Slug to missing page | "Page not found" | ✅ |

## 5. Acceptance for "100%"

Every row above must be ✅ before this goal is complete. When a row is marked
✅, the spec file listed must assert BOTH the render AND at least one
interaction/flow specific to that feature (not just "page loads without
crashing"). The full suite (chromium + firefox + webkit, CI=1 hermetic path)
must pass 100%.

Remaining ❌/🔶 rows (next work items, in priority order):
1. Page permissions dialog — open dialog, toggle member/group access, save
2. Revision history / diff — view revisions, diff render
3. Page context menu — rename/duplicate/move actions
4. Empty trash — "Empty trash" confirm flow
5. `/page/:id/edit` — edit existing page → save → verify content persists
6. Collection members — add/remove members
7. Image lightbox — open lightbox from media manager
8. Import buttons — actual import flow (not just presence)
9. Sidebar collapse — collapse/expand the tree
