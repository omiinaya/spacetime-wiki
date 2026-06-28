import type { Page } from "@playwright/test";

// ─── STDB response helpers ───────────────────────────────────────────────────

/** STDB SQL endpoint returns: [{ columns: [...], rows: [...] }, ...] */
export function stdbResponse(rows: unknown[][]) {
  return [
    {
      columns: rows.length > 0 ? Object.keys(rows[0] as any).map((_, i) => ({ name: `col${i}` })) : [],
      rows,
    },
  ];
}

/** Single-row STDB response */
export function stdbRow(row: unknown[]) {
  return stdbResponse([row]);
}

// ─── Sample data ─────────────────────────────────────────────────────────────

export const samplePages = [
  ["page_1", "Getting Started", "getting-started", '{"type":"doc","content":[]}', "Welcome to the wiki", "", "", "published", "", "", false, false, false, "", 0, "user_1", "user_1", 1719000000000, 1719100000000, 0, "ltr"],
  ["page_2", "Architecture Overview", "architecture", '{"type":"doc","content":[]}', "System architecture docs", "col_1", "", "published", "", "", false, true, false, "", 1, "user_1", "user_2", 1718900000000, 1719050000000, 0, "ltr"],
  ["page_3", "Draft Notes", "draft-notes", '{"type":"doc","content":[]}', "Some draft content", "", "", "draft", "", "", false, false, false, "", 2, "user_2", "user_2", 1718800000000, 1719000000000, 0, "ltr"],
];

export const sampleCollections = [
  ["col_1", "Engineering", "engineering", "Engineering documentation", "", "⚙️", "#3b82f6", 0, "user_1", 1719000000000, 1719000000000],
  ["col_2", "Design", "design", "Design system docs", "", "🎨", "#ec4899", 1, "user_1", 1719000000000, 1719000000000],
];

export const sampleTrending = [
  { page_id: "page_1", views: 42 },
  { page_id: "page_2", views: 18 },
];

export const sampleUsers = [
  ["user_1", "Alice", "alice@example.com", "", "admin", "", 1718000000000],
  ["user_2", "Bob", "bob@example.com", "", "editor", "", 1718000000000],
];

export const sampleNotifications = [
  ["notif_1", "user_1", "page_update", "page_1", "Page updated", "Getting Started was updated", "user_2", "", false, 1719100000000],
];

export const sampleActivity = [
  { id: "act_1", event_type: "page_create", target_id: "page_1", actor_id: "user_1", created_at: 1719100000000, metadata: '{"title":"Getting Started"}' },
  { id: "act_2", event_type: "page_update", target_id: "page_2", actor_id: "user_2", created_at: 1719050000000, metadata: '{"title":"Architecture Overview"}' },
];

export const sampleFavorites = [
  { id: "fav_1", page_id: "page_2", user_id: "user_1", created_at: 1719000000000 },
];

// ─── Request URL matchers ────────────────────────────────────────────────────

export function isSqlQuery(url: string): boolean {
  return url.includes("/v1/database/") && url.includes("/sql");
}

export function isReducerCall(url: string): boolean {
  return url.includes("/v1/database/") && url.includes("/call/");
}

export function isSearchApi(url: string): boolean {
  return url.includes("/api/v1/search");
}

export function isAuthApi(url: string): boolean {
  return url.includes("/api/v1/auth");
}

export function isFileUpload(url: string): boolean {
  return url.includes("/api/v1/upload");
}

// ─── Route setup ─────────────────────────────────────────────────────────────

type MockConfig = {
  /** Override default pages list */
  pages?: unknown[][];
  /** Override default collections */
  collections?: unknown[][];
  /** Override default trending */
  trending?: { page_id: string; views: number }[];
  /** Override default users */
  users?: unknown[][];
  /** Enable auth endpoints (default: mock as anonymous) */
  authAs?: "anonymous" | "admin" | "editor";
};

export async function setupMocks(page: Page, config: MockConfig = {}) {
  const pages = config.pages ?? samplePages;
  const collections = config.collections ?? sampleCollections;
  const trending = config.trending ?? sampleTrending;
  const users = config.users ?? sampleUsers;

  // Intercept STDB WebSocket connections — prevent hanging
  await page.routeWebSocket("**/*", (ws) => {
    ws.close();
  });

  function stdbJson(rows: unknown[][]) {
    return [{ columns: rows.length > 0 ? rows[0].map((_, i) => ({ name: `col${i}` })) : [], rows }];
  }

  await page.route("**/v1/database/**", async (route) => {
    const url = route.request().url();
    const method = route.request().method();

    if (method === "POST" && url.includes("/sql")) {
      const body = route.request().postData() || "";
      const rows = body.includes("FROM page")
        ? pages
        : body.includes("FROM collection")
          ? collections
          : body.includes("FROM `user`") || body.includes("FROM user")
            ? users
            : body.includes("FROM notification")
              ? [sampleNotifications[0]]
              : [];
      await route.fulfill({ json: stdbJson(rows) });
    } else if (method === "POST" && url.includes("/call/")) {
      await route.fulfill({ status: 200, json: {} });
    } else {
      await route.fulfill({ status: 200, json: {} });
    }
  });

  // Mock Python API search endpoint
  await page.route("**/api/v1/search*", async (route) => {
    await route.fulfill({ json: { results: [], total: 0 } });
  });

  // Mock auth endpoints
  if (config.authAs) {
    await page.route("**/api/v1/auth/**", async (route) => {
      const url = route.request().url();
      if (url.includes("/me")) {
        await route.fulfill({
          json: {
            id: config.authAs === "admin" ? "user_1" : config.authAs === "editor" ? "user_2" : "anon",
            name: config.authAs === "admin" ? "Alice" : config.authAs === "editor" ? "Bob" : "Anonymous",
            email: "",
            role: config.authAs,
            avatar_url: "",
          },
        });
      } else {
        await route.fulfill({ status: 200, json: {} });
      }
    });
  }
}
