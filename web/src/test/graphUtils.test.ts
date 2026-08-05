import { describe, it, expect } from 'vitest';
import { getColor, extractPageLinks, buildGraph } from '../components/graphUtils';
import type { Page, Collection } from '../lib/api';

function makePage(overrides: Partial<Page> & { id: string }): Page {
  return {
    title: 'Page',
    slug: 'page',
    content: '',
    text_content: '',
    collection_id: '',
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
    created_at: 100,
    updated_at: 100,
    published_at: 100,
    deleted_at: null,
    direction: 'ltr',
    ...overrides,
  };
}

function makeCollection(overrides: Partial<Collection> & { id: string }): Collection {
  return {
    name: 'C',
    slug: 'c',
    description: '',
    icon: '',
    color: '',
    parent_id: '',
    sort_order: 0,
    created_by: 'u1',
    created_at: 100,
    updated_at: 100,
    ...overrides,
  };
}

describe('getColor', () => {
  it('cycles through the palette by index', () => {
    expect(getColor(0)).toBe('#3b82f6');
    expect(getColor(1)).toBe('#ef4444');
    expect(getColor(15)).toBe(getColor(0)); // wraps
  });
});

describe('extractPageLinks', () => {
  it('extracts /page/ ids from text', () => {
    expect(extractPageLinks('see /page/abc and /page/xyz_1 now')).toEqual(['abc', 'xyz_1']);
  });

  it('returns [] when no page links', () => {
    expect(extractPageLinks('no links here')).toEqual([]);
    expect(extractPageLinks('')).toEqual([]);
  });

  it('matches hyphenated ids', () => {
    expect(extractPageLinks('/page/my-page-2')).toEqual(['my-page-2']);
  });
});

describe('buildGraph', () => {
  const colA = makeCollection({ id: 'a', name: 'Docs', color: '#111111' });
  const colB = makeCollection({ id: 'b', name: 'Manual' });

  const parent = makePage({
    id: 'p1',
    title: 'Parent',
    collection_id: 'a',
    text_content: 'See /page/p2 for details',
  });
  const child = makePage({
    id: 'p2',
    title: 'Child',
    collection_id: 'a',
    parent_page_id: 'p1',
    text_content: 'Back to /page/p1',
  });
  const solo = makePage({
    id: 'p3',
    title: 'Solo',
    collection_id: 'b',
    parent_page_id: 'p1',
  });
  const deleted = makePage({ id: 'p9', title: 'Gone', collection_id: 'a', status: 'deleted' });

  it('creates one node per collection and per non-deleted page', () => {
    const { nodes } = buildGraph([parent, child, solo, deleted], [colA, colB]);
    expect(nodes).toHaveLength(2 + 3); // 2 collections + 3 active pages
    expect(nodes.some((n) => n.id === 'col:a' && n.isCollection)).toBe(true);
    expect(nodes.some((n) => n.id === 'p9')).toBe(false);
  });

  it('uses the collection color for pages and fallback for missing', () => {
    const { nodes } = buildGraph([parent, child], [colA]);
    const pageNode = nodes.find((n) => n.id === 'p1');
    expect(pageNode?.color).toBe('#111111');
    const colNode = nodes.find((n) => n.id === 'col:a');
    expect(colNode?.color).toBe('#111111');
  });

  it('labels pages in missing collections as Uncategorized', () => {
    const { nodes } = buildGraph([solo], []);
    const pageNode = nodes.find((n) => n.id === 'p3');
    expect(pageNode?.collectionName).toBe('Uncategorized');
  });

  it('creates parent-child links when the parent node exists', () => {
    const { links } = buildGraph([parent, child, solo], [colA, colB]);
    expect(links).toContainEqual({ source: 'p2', target: 'p1', type: 'parent-child' });
    // p3's parent p1 exists too
    expect(links).toContainEqual({ source: 'p3', target: 'p1', type: 'parent-child' });
  });

  it('skips parent-child links to missing parents', () => {
    const orphan = makePage({ id: 'p4', title: 'Orphan', parent_page_id: 'nope' });
    const { links } = buildGraph([orphan], []);
    expect(links.filter((l) => l.type === 'parent-child')).toHaveLength(0);
  });

  it('creates collection-membership links', () => {
    const { links } = buildGraph([parent, child, solo], [colA, colB]);
    expect(links).toContainEqual({ source: 'p1', target: 'col:a', type: 'collection' });
    expect(links).toContainEqual({ source: 'p3', target: 'col:b', type: 'collection' });
  });

  it('creates backlinks from text_content page URLs and dedupes', () => {
    const dup = makePage({
      id: 'p5',
      title: 'Dup',
      collection_id: 'b',
      text_content: '/page/p1 and /page/p1 again',
    });
    const { links } = buildGraph([parent, dup], [colA, colB]);
    const backlinks = links.filter((l) => l.type === 'backlink');
    expect(backlinks).toContainEqual({ source: 'p5', target: 'p1', type: 'backlink' });
    expect(backlinks).toHaveLength(1); // deduped
  });

  it('does not create self-backlinks or links to missing pages', () => {
    const selfy = makePage({
      id: 'p6',
      title: 'Self',
      text_content: '/page/p6 and /page/ghost',
    });
    const { links } = buildGraph([selfy], []);
    expect(links.filter((l) => l.type === 'backlink')).toHaveLength(0);
  });
});