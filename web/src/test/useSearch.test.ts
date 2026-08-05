import { describe, it, expect } from 'vitest';
import { act, renderHook } from '@testing-library/react';
import { useSearch } from '../hooks/useSearch';
import type { Page } from '../lib/api';

const pages: Page[] = [
  {
    id: 'p1',
    title: 'Alpha Docs',
    slug: 'alpha',
    content: '',
    text_content: 'setup guide',
    collection_id: 'c1',
    parent_page_id: '',
    status: 'published',
    icon: '',
    color: '',
    full_width: false,
    is_pinned: false,
    is_template: false,
    template_id: '',
    sort_order: 0,
    created_by: 'u1',
    updated_by: 'u1',
    created_at: 1700000000000,
    updated_at: 1700000000000,
    published_at: 1700000000000,
    deleted_at: null,
    direction: 'ltr',
  },
  {
    id: 'p2',
    title: 'Beta Manual',
    slug: 'beta',
    content: '',
    text_content: 'network config',
    collection_id: 'c2',
    parent_page_id: '',
    status: 'published',
    icon: '',
    color: '',
    full_width: false,
    is_pinned: false,
    is_template: false,
    template_id: '',
    sort_order: 1,
    created_by: 'u2',
    updated_by: 'u2',
    created_at: 1701000000000,
    updated_at: 1701000000000,
    published_at: 1701000000000,
    deleted_at: null,
    direction: 'ltr',
  },
  {
    id: 'p3',
    title: 'Gamma Notes',
    slug: 'gamma',
    content: '',
    text_content: 'personal scratch',
    collection_id: 'c1',
    parent_page_id: '',
    status: 'draft',
    icon: '',
    color: '',
    full_width: false,
    is_pinned: false,
    is_template: false,
    template_id: '',
    sort_order: 2,
    created_by: 'u1',
    updated_by: 'u2',
    created_at: 1702000000000,
    updated_at: 1702000000000,
    published_at: 0,
    deleted_at: null,
    direction: 'ltr',
  },
];

const collections = [
  { id: 'c1', name: 'Docs' },
  { id: 'c2', name: 'Manual' },
];
const allUsers = [
  { id: 'u1', name: 'Alice', email: 'alice@x.io' },
  { id: 'u2', name: 'Bob', email: 'bob@x.io' },
];
const allPageTags = new Map<string, Set<string>>([
  ['p1', new Set(['guide', 'setup'])],
  ['p3', new Set(['draft'])],
]);

const defaultProps = { pages, collections, allUsers, allPageTags };

function input(value: string) {
  return { target: { value } } as React.ChangeEvent<HTMLInputElement>;
}

describe('useSearch', () => {
  it('returns all pages when no query', () => {
    const { result } = renderHook(() => useSearch(pages, collections, allUsers, allPageTags));
    expect(result.current.filteredPages).toHaveLength(3);
  });

  it('filters by title substring (case-insensitive)', () => {
    const { result } = renderHook(() => useSearch(pages, collections, allUsers, allPageTags));
    act(() => result.current.handleSearchInput(input('alpha')));
    expect(result.current.filteredPages.map((p) => p.id)).toEqual(['p1']);
  });

  it('filters by text_content substring', () => {
    const { result } = renderHook(() => useSearch(pages, collections, allUsers, allPageTags));
    act(() => result.current.handleSearchInput(input('network')));
    expect(result.current.filteredPages.map((p) => p.id)).toEqual(['p2']);
  });

  it('parses in:collection syntax and filters by collection', () => {
    const { result } = renderHook(() => useSearch(pages, collections, allUsers, allPageTags));
    act(() => result.current.handleSearchInput(input('in:Docs')));
    expect(result.current.searchQuery).toBe('');
    expect(result.current.searchFilters.collectionId).toBe('c1');
    expect(result.current.filteredPages.map((p) => p.id).sort()).toEqual(['p1', 'p3']);
  });

  it('parses author:name syntax and filters by author', () => {
    const { result } = renderHook(() => useSearch(pages, collections, allUsers, allPageTags));
    act(() => result.current.handleSearchInput(input('author:Bob')));
    expect(result.current.searchFilters.authorId).toBe('u2');
    expect(result.current.filteredPages.map((p) => p.id)).toEqual(['p2']);
  });

  it('parses by:email as an author alias', () => {
    const { result } = renderHook(() => useSearch(pages, collections, allUsers, allPageTags));
    act(() => result.current.handleSearchInput(input('by:alice@x.io')));
    expect(result.current.searchFilters.authorId).toBe('u1');
    expect(result.current.filteredPages.map((p) => p.id).sort()).toEqual(['p1', 'p3']);
  });

  it('parses tag: syntax and filters pages carrying that tag', () => {
    const { result } = renderHook(() => useSearch(pages, collections, allUsers, allPageTags));
    act(() => result.current.handleSearchInput(input('tag:guide')));
    expect(result.current.searchFilters.tags).toBe('guide');
    expect(result.current.filteredPages.map((p) => p.id)).toEqual(['p1']);
  });

  it('keeps free text alongside syntax tokens', () => {
    const { result } = renderHook(() => useSearch(pages, collections, allUsers, allPageTags));
    act(() => result.current.handleSearchInput(input('config in:Manual')));
    expect(result.current.searchQuery).toBe('config');
    expect(result.current.searchFilters.collectionId).toBe('c2');
    expect(result.current.filteredPages.map((p) => p.id)).toEqual(['p2']);
  });

  it('parses from:/to:/date: date ranges', () => {
    const { result } = renderHook(() => useSearch(pages, collections, allUsers, allPageTags));
    act(() => result.current.handleSearchInput(input('from:2023-11-15')));
    expect(result.current.searchFilters.dateFrom).toBe('2023-11-15');
    // all updated_at are 2023-11-14..15 in ms — from 2023-11-15 (0000 UTC) excludes p1
    expect(result.current.filteredPages.map((p) => p.id)).toEqual(['p2', 'p3']);
  });

  it('does not set filters when syntax target is unknown', () => {
    const { result } = renderHook(() => useSearch(pages, collections, allUsers, allPageTags));
    act(() => result.current.handleSearchInput(input('in:NoSuchCollection')));
    expect(result.current.searchFilters.collectionId).toBe('');
    // the token is consumed (removed from query) even when unmatched
    expect(result.current.searchQuery).toBe('');
    expect(result.current.filteredPages).toHaveLength(3);
  });

  it('setSearchQuery updates the query string directly', () => {
    const { result } = renderHook(() => useSearch(pages, collections, allUsers, allPageTags));
    act(() => result.current.setSearchQuery('beta'));
    expect(result.current.searchQuery).toBe('beta');
    expect(result.current.filteredPages.map((p) => p.id)).toEqual(['p2']);
  });
});
