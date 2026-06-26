/** SpacetimeWiki REST API client. */

const API_BASE = import.meta.env.VITE_API_BASE || "/api/v1";

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(options.headers as Record<string, string>),
  };

  const apiKey = import.meta.env.VITE_API_KEY;
  if (apiKey) {
    headers["X-API-Key"] = apiKey;
  }

  const res = await fetch(`${API_BASE}${path}`, { ...options, headers });
  if (!res.ok) {
    const detail = await res.text().catch(() => "Unknown error");
    throw new Error(`API ${res.status}: ${detail}`);
  }
  return res.json();
}

// ─── Pages ────────────────────────────────────────────────────────────────────

export interface Page {
  id: string;
  title: string;
  slug: string;
  content?: string;
  text_content?: string;
  collection_id?: string;
  parent_page_id?: string;
  status: string;
  icon?: string;
  color?: string;
  full_width?: boolean;
  is_template?: boolean;
  template_id?: string;
  sort_order?: number;
  created_by?: string;
  updated_by?: string;
  created_at: number;
  updated_at: number;
  deleted_at?: number;
}

export async function listPages(collectionId?: string) {
  const params = collectionId ? `?collection_id=${collectionId}` : "";
  return request<Page[]>(`/pages${params}`);
}

export async function getPage(pageId: string) {
  return request<Page>(`/pages/${pageId}`);
}

export async function createPage(
  title: string,
  collectionId?: string,
  content = "",
  icon = "",
  isTemplate = false
) {
  return request("/pages", {
    method: "POST",
    body: JSON.stringify({ title, collection_id: collectionId, content, icon, is_template: isTemplate }),
  });
}

export async function updatePage(pageId: string, data: { title?: string; content?: string }) {
  return request(`/pages/${pageId}`, {
    method: "PUT",
    body: JSON.stringify(data),
  });
}

export async function deletePage(pageId: string) {
  return request(`/pages/${pageId}`, { method: "DELETE" });
}

// ─── Collections ──────────────────────────────────────────────────────────────

export interface Collection {
  id: string;
  name: string;
  slug: string;
  description?: string;
  parent_id?: string;
  icon?: string;
  color?: string;
  sort_order: number;
  created_at: number;
}

export async function listCollections() {
  return request<Collection[]>("/collections");
}

export async function getCollection(collectionId: string) {
  return request<Collection>(`/collections/${collectionId}`);
}

export async function createCollection(name: string, description = "", icon = "", color = "") {
  return request("/collections", {
    method: "POST",
    body: JSON.stringify({ name, description, icon, color }),
  });
}

// ─── Search ───────────────────────────────────────────────────────────────────

export async function searchPages(query: string, limit = 20) {
  return request<Page[]>(`/search?q=${encodeURIComponent(query)}&limit=${limit}`);
}

export async function autocomplete(query: string, limit = 10) {
  return request<{ id: string; title: string; slug: string }[]>(
    `/search/autocomplete?q=${encodeURIComponent(query)}&limit=${limit}`
  );
}

// ─── Auth ─────────────────────────────────────────────────────────────────────

export async function registerApiKey(name: string) {
  return request<{ api_key: string; key_prefix: string }>("/auth/register-key", {
    method: "POST",
    body: JSON.stringify({ name }),
  });
}
