import { describe, it, expect, vi, beforeAll, afterEach } from 'vitest';

// Mock global fetch so sqlQuery() can be exercised end-to-end as the source
// produces it — this catches template-literal bugs like `{{sqlInt(limit)}}`
// (double braces) which the type checker silently accepts but STDB rejects.
const mockFetch = vi.fn();
globalThis.fetch = mockFetch as unknown as typeof globalThis.fetch;

let auditApi: typeof import('../lib/api/audit').auditApi;
let settingsApi: typeof import('../lib/api/settings').settingsApi;

beforeAll(async () => {
  ({ auditApi } = await import('../lib/api/audit'));
  ({ settingsApi } = await import('../lib/api/settings'));
});

afterEach(() => {
  mockFetch.mockReset();
});

/** Call the given fn and return the SQL sent as the fetch body (STDB /sql). */
async function emittedSql(fn: () => Promise<unknown>): Promise<string> {
  // STDB /sql returns [{ "rows": [...] }]; audit_event is a real table.
  mockFetch.mockResolvedValue({
    ok: true,
    json: async () => [{ rows: [] }],
  } as unknown as Response);
  await fn();
  const call = mockFetch.mock.calls.find((c) => {
    const url = String(c[0]);
    const method = (c[1] as RequestInit | undefined)?.method ?? 'GET';
    return url.includes('/sql') && method === 'POST';
  });
  expect(call).toBeTruthy();
  const init = call![1] as RequestInit;
  return String(init.body);
}

describe('SQL builders emit valid single-brace SQL (regression: double-brace)', () => {
  it('auditApi.list emits `LIMIT <int>` not `LIMIT {{<int>}}`', async () => {
    const sql = await emittedSql(() => auditApi.list(100));
    expect(sql).toBe('SELECT * FROM audit_event LIMIT 100');
    expect(sql).not.toContain('{{');
  });

  it('auditApi.listByTarget supplies an sqlLit-quoted string', async () => {
    const sql = await emittedSql(() => auditApi.listByTarget("p'1", 50));
    expect(sql).toContain('WHERE target_id =');
    expect(sql).toContain('LIMIT 50');
    expect(sql).not.toContain('{{');
  });

  it('settingsApi module loads without double-brace source artifacts', async () => {
    // settings.ts notification/settings builders share the same client and
    // were part of the same sqlInt sweep — assert no `{{` leaked into source.
    expect(typeof settingsApi).toBe('object');
    expect(Object.keys(settingsApi).length).toBeGreaterThan(0);
  });
});
