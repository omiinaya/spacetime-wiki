import { describe, it, expect } from 'vitest';
import { fromStdbRow } from '../lib/api/typed-sql';

/**
 * Tests for the typed-sql mapping layer (getElements + fromStdbRow).
 *
 * fromStdbRow turns a positional STDB row array into a typed object using
 * the auto-generated module_binding row schema. It is used by typedQuery()
 * for page/collection/user/revision reads. These tests pin the coercion
 * and column-order behavior so the mapping layer can't silently drift.
 */

function makeSchema(
  fields: { name: string; jsName: string; tag: string }[],
  rowMeta?: Record<string, unknown>,
) {
  return {
    algebraicType: {
      value: {
        elements: fields.map((f) => ({
          name: f.jsName,
          algebraicType: { tag: f.tag, value: {} },
        })),
      },
    },
    row: rowMeta ?? {},
  } as object;
}

describe('fromStdbRow', () => {
  it('maps positional rows to objects by schema field order', () => {
    const schema = makeSchema([
      { name: 'id', jsName: 'id', tag: 'String' },
      { name: 'title', jsName: 'title', tag: 'String' },
      { name: 'sort_order', jsName: 'sortOrder', tag: 'U32' },
    ]);
    const mapper = fromStdbRow<{ id: string; title: string; sort_order: number }>(schema);
    // Without row columnMetadata, keys use the JS field name (jsName)
    expect(mapper(['p1', 'Hello', 3])).toEqual({ id: 'p1', title: 'Hello', sortOrder: 3 });
  });

  it('uses columnMetadata.name (snake_case) when present, else JS field name', () => {
    const schema = makeSchema([{ name: 'sort_order', jsName: 'sortOrder', tag: 'U32' }], {
      sortOrder: { columnMetadata: { name: 'sort_order' } },
    });
    const mapper = fromStdbRow<{ sort_order: number }>(schema);
    expect(mapper([7])).toEqual({ sort_order: 7 });
  });

  it('coerces numerics and bools', () => {
    const schema = makeSchema([
      { name: 'n', jsName: 'n', tag: 'U64' },
      { name: 'b', jsName: 'b', tag: 'Bool' },
      { name: 'f', jsName: 'f', tag: 'F64' },
      { name: 's', jsName: 's', tag: 'String' },
    ]);
    const mapper = fromStdbRow<{ n: number; b: boolean; f: number; s: string }>(schema);
    expect(mapper([42, true, 2.5, 'x'])).toEqual({ n: 42, b: true, f: 2.5, s: 'x' });
  });

  it('coerces null / missing numerics to 0 and strings to empty', () => {
    const schema = makeSchema([
      { name: 'n', jsName: 'n', tag: 'U64' },
      { name: 's', jsName: 's', tag: 'String' },
    ]);
    const mapper = fromStdbRow<{ n: number; s: string }>(schema);
    expect(mapper([null, null])).toEqual({ n: 0, s: '' });
    // shorter row than schema — missing trailing fields are dropped
    expect(mapper([5])).toEqual({ n: 5 });
  });

  it('throws if the schema has no algebraicType.value.elements', () => {
    expect(() => fromStdbRow({} as object)).toThrow(/elements/);
  });

  it('returns empty objects for empty rows', () => {
    const schema = makeSchema([{ name: 'id', jsName: 'id', tag: 'String' }]);
    const mapper = fromStdbRow(schema);
    expect(mapper([])).toEqual({});
  });

  it('passes through unknown tags (arrays/tables) unchanged', () => {
    const schema = makeSchema([{ name: 'tags', jsName: 'tags', tag: 'Array' }]);
    const mapper = fromStdbRow<{ tags: unknown }>(schema);
    expect(mapper([['a', 'b']])).toEqual({ tags: ['a', 'b'] });
  });
});
