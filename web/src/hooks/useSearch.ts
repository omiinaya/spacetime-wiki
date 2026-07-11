import { useState, useCallback } from "react";
import { Page } from "../lib/api";
import { SearchFilterState, EMPTY_FILTERS } from "../components/SearchFilters";

export interface SearchResult {
  searchQuery: string;
  setSearchQuery: (q: string) => void;
  searchFilters: SearchFilterState;
  setSearchFilters: (f: SearchFilterState) => void;
  filteredPages: Page[];
  handleSearchInput: (e: React.ChangeEvent<HTMLInputElement>) => void;
}

export function useSearch(
  pages: Page[],
  collections: { id: string; name: string }[],
  allUsers: { id: string; name: string; email: string }[],
  allPageTags: Map<string, Set<string>>,
): SearchResult {
  const [searchQuery, setSearchQuery] = useState("");
  const [searchFilters, setSearchFilters] = useState<SearchFilterState>(EMPTY_FILTERS);

  const handleSearchInput = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value;
    let clean = raw;
    let collId = searchFilters.collectionId;
    let authId = searchFilters.authorId;
    let dateFrom = searchFilters.dateFrom;
    let dateTo = searchFilters.dateTo;
    let tagFilters = searchFilters.tags || "";

    const patterns = [
      { regex: /\bin:("[^"]+"|\S+)/gi, apply: (match: string) => {
        const name = match.replace(/^in:/i, "").replace(/"/g, "").trim();
        const found = collections.find(c => c.name.toLowerCase() === name.toLowerCase());
        if (found) collId = found.id;
        return "";
      }},
      { regex: /\bauthor:("[^"]+"|\S+)/gi, apply: (match: string) => {
        const name = match.replace(/^author:/i, "").replace(/"/g, "").trim();
        const found = allUsers.find(u => (u.name || u.email).toLowerCase() === name.toLowerCase());
        if (found) authId = found.id;
        return "";
      }},
      { regex: /\bby:("[^"]+"|\S+)/gi, apply: (match: string) => {
        const name = match.replace(/^by:/i, "").replace(/"/g, "").trim();
        const found = allUsers.find(u => (u.name || u.email).toLowerCase() === name.toLowerCase());
        if (found) authId = found.id;
        return "";
      }},
      { regex: /\bfrom:(\d{4}-\d{2}(?:-\d{2})?)/gi, apply: (match: string) => {
        dateFrom = match.replace(/^from:/i, "").trim();
        return "";
      }},
      { regex: /\bto:(\d{4}-\d{2}(?:-\d{2})?)/gi, apply: (match: string) => {
        dateTo = match.replace(/^to:/i, "").trim();
        return "";
      }},
      { regex: /\bdate:(\d{4}-\d{2}(?:-\d{2})?)/gi, apply: (match: string) => {
        dateFrom = dateTo = match.replace(/^date:/i, "").trim();
        return "";
      }},
      { regex: /\btag:("[^"]+"|\S+)/gi, apply: (match: string) => {
        const spec = match.replace(/^tag:/i, "").replace(/"/g, "").trim();
        if (spec) {
          const existing = tagFilters ? tagFilters.split(",") : [];
          if (!existing.some(s => s.trim().toLowerCase() === spec.toLowerCase())) {
            existing.push(spec);
          }
          tagFilters = existing.join(",");
        }
        return "";
      }},
    ];

    for (const p of patterns) {
      clean = clean.replace(p.regex, p.apply as unknown);
    }

    clean = clean.replace(/\s+/g, " ").trim();
    setSearchQuery(clean);

    const filtersChanged = collId !== searchFilters.collectionId ||
      authId !== searchFilters.authorId ||
      dateFrom !== searchFilters.dateFrom ||
      dateTo !== searchFilters.dateTo ||
      tagFilters !== searchFilters.tags;
    if (filtersChanged) {
      setSearchFilters({
        collectionId: collId,
        authorId: authId,
        dateFrom,
        dateTo,
        tags: tagFilters,
      });
    }
  }, [searchFilters, collections, allUsers]);

  const filteredPages = pages.filter((p) => {
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      const matchTitle = p.title.toLowerCase().includes(q);
      const matchContent = p.text_content?.toLowerCase().includes(q);
      if (!matchTitle && !matchContent) return false;
    }
    if (searchFilters.collectionId && p.collection_id !== searchFilters.collectionId) {
      return false;
    }
    if (searchFilters.authorId && p.created_by !== searchFilters.authorId) {
      return false;
    }
    if (searchFilters.dateFrom) {
      const fromMs = new Date(searchFilters.dateFrom).getTime();
      if (p.updated_at < fromMs) return false;
    }
    if (searchFilters.dateTo) {
      const toMs = new Date(searchFilters.dateTo).getTime() + 86_400_000;
      if (p.updated_at > toMs) return false;
    }
    if (searchFilters.tags) {
      const pageTags = allPageTags.get(p.id);
      if (!pageTags || pageTags.size === 0) return false;
      const filterTags = searchFilters.tags.split(",").map((t) => t.trim().toLowerCase()).filter(Boolean);
      const matchesTag = filterTags.some((t) => [...pageTags].some((pt) => pt.toLowerCase() === t));
      if (!matchesTag) return false;
    }
    return true;
  });

  return {
    searchQuery, setSearchQuery,
    searchFilters, setSearchFilters,
    filteredPages, handleSearchInput,
  };
}
