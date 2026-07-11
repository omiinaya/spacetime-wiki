// SPDX-License-Identifier: ISC

import { API_BASE } from "./client";

export interface SearchResult {
  data: Array<{
    id: string;
    search_token: string;
    page_id: string;
    title: string;
    slug: string;
    excerpt: string;
    match_type: string;
  }>;
  query: string;
  filters: unknown;
  total: number;
}

export async function searchPages(params: {
  q: string;
  collection_id?: string;
  author_id?: string;
  from?: string;
  to?: string;
  tags?: string;
  limit?: number;
}): Promise<SearchResult> {
  const queryParams = new URLSearchParams();
  queryParams.set("q", params.q);
  if (params.collection_id) queryParams.set("collection_id", params.collection_id);
  if (params.author_id) queryParams.set("author_id", params.author_id);
  if (params.from) queryParams.set("from", params.from);
  if (params.to) queryParams.set("to", params.to);
  if (params.tags) queryParams.set("tags", params.tags);
  if (params.limit) queryParams.set("limit", String(params.limit));
  return fetch(`${API_BASE}/api/v1/search?${queryParams.toString()}`).then(async (res) => {
    if (!res.ok) throw new Error(`Search failed: ${res.status}`);
    return res.json();
  });
}

export async function cleanupSearchResults(): Promise<void> {
  // Placeholder for any search result cleanup (STDB handles this)
}
