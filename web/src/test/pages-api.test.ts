import { describe, it, expect, vi, beforeEach } from 'vitest';
import { getPageFromCache, setPageCache, clearPageCache } from '../lib/api/pages';

const mockTypedQuery = vi.fn();
const mockTypedQueryOne = vi.fn();
const mockCallReducer = vi.fn();
vi.mock('../lib/api/client', () => ({
  typedQuery: (...a: unknown[]) => mockTypedQuery(...a),
  typedQueryOne: (...a: unknown[]) => mockTypedQueryOne(...a),
  callReducer: (...a: unknown[]) => mockCallReducer(...a),
  genId: (prefix: string) => `${prefix}_test123`,
  sqlLit: (v: unknown) => `'${String(v).replace(/'/g, "''")}'`,
}));

import { listPages, listDeletedPages, getPage, getPageBySlug } from '../lib/api/pages';

function page(id: string, title: string) {
  return { id, title, slug: id };
}

describe('page cache', () => {
  it('stores and retrieves pages by id', () => {
    setPageCache('p1', page('p1', 'Alpha') as never);
    expect(getPageFromCache('p1')?.title).toBe('Alpha');
    expect(getPageFromCache('missing')).toBeUndefined();
  });

  it('clearPageCache empties the cache', () => {
    setPageCache('p1', page('p1', 'Alpha') as never);
    clearPageCache();
    expect(getPageFromCache('p1')).toBeUndefined();
  });
});

describe('page SQL builders (injection hardening)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockTypedQuery.mockResolvedValue([]);
    mockTypedQueryOne.mockResolvedValue(null);
    mockCallReducer.mockResolvedValue(undefined);
  });

  it('listPages builds WHERE with collection and non-deleted status', async () => {
    await listPages('col_1');
    expect(mockTypedQuery).toHaveBeenCalledTimes(1);
    const [sql] = mockTypedQuery.mock.calls[0];
    expect(sql).toContain("collection_id = 'col_1'");
    expect(sql).toContain("status != 'deleted'");
  });

  it('listPages escapes quotes in collection id (no raw interpolation)', async () => {
    await listPages("evil' OR '1'='1");
    const [sql] = mockTypedQuery.mock.calls[0];
    expect(sql).not.toContain("evil' OR '1'='1");
    expect(sql).toContain("''");
  });

  it('listPages with status filters by that status only', async () => {
    await listPages(undefined, 'archived');
    const [sql] = mockTypedQuery.mock.calls[0];
    expect(sql).toContain("status = 'archived'");
    expect(sql).not.toContain('deleted');
  });

  it('listDeletedPages queries deleted pages', async () => {
    await listDeletedPages();
    const [sql] = mockTypedQuery.mock.calls[0];
    expect(sql).toContain("status = 'deleted'");
  });

  it('getPage tries id then slug fallback', async () => {
    mockTypedQueryOne.mockResolvedValueOnce(null).mockResolvedValueOnce(page('p1', 'Alpha'));
    const result = await getPage('alpha-slug');
    expect(mockTypedQueryOne).toHaveBeenCalledTimes(2);
    const [first] = mockTypedQueryOne.mock.calls[0];
    const [second] = mockTypedQueryOne.mock.calls[1];
    expect(first).toContain('WHERE id =');
    expect(second).toContain('WHERE slug =');
    expect(result?.id).toBe('p1');
  });

  it('getPage returns null when neither id nor slug matches', async () => {
    mockTypedQueryOne.mockResolvedValue(null);
    expect(await getPage('nope')).toBeNull();
    expect(mockTypedQueryOne).toHaveBeenCalledTimes(2);
  });

  it('getPageBySlug escapes slug input (quote doubled, payload inert)', async () => {
    await getPageBySlug("x'; DROP TABLE page;--");
    const [sql] = mockTypedQueryOne.mock.calls[0];
    // the attacker's quote is doubled, so the payload cannot terminate the literal
    expect(sql).toContain("''");
    expect(sql).toMatch(/slug = 'x''; DROP TABLE page;--'/);
  });
});
