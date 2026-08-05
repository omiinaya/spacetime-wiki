import { describe, it, expect } from 'vitest';
import {
  renderCellValue,
  parseSelectOptions,
  selectInitialValues,
  toggleMultiChoice,
  joinMultiChoice,
  getCellValue,
  applyCellWrite,
  kanbanGroupRows,
  orderKanbanGroups,
  type DbCell,
} from '../extensions/databaseUtils';

function cell(id: string, rowId: string, colId: string, value: string): DbCell {
  return { id, row_id: rowId, column_id: colId, value, created_at: 1, updated_at: 1 };
}

describe('renderCellValue', () => {
  it('renders checkbox true as ✓ and false as empty', () => {
    expect(renderCellValue('true', 'checkbox')).toBe('✓');
    expect(renderCellValue('false', 'checkbox')).toBe('');
    expect(renderCellValue('', 'checkbox')).toBe('');
  });

  it('renders number with empty placeholder', () => {
    expect(renderCellValue('42', 'number')).toBe('42');
    expect(renderCellValue('0', 'number')).toBe('0');
    expect(renderCellValue('', 'number')).toBe('—');
  });

  it('passes through text values', () => {
    expect(renderCellValue('hello', 'text')).toBe('hello');
    expect(renderCellValue('', 'text')).toBe('');
  });
});

describe('parseSelectOptions', () => {
  it('parses choices JSON', () => {
    expect(parseSelectOptions('{"choices":["a","b"]}')).toEqual(['a', 'b']);
  });

  it('returns [] for malformed or empty JSON', () => {
    expect(parseSelectOptions('not json')).toEqual([]);
    expect(parseSelectOptions('')).toEqual([]);
    expect(parseSelectOptions('{"foo":1}')).toEqual([]);
    expect(parseSelectOptions('null')).toEqual([]);
  });
});

describe('selectInitialValues / toggleMultiChoice / joinMultiChoice', () => {
  it('single-select uses the full value', () => {
    expect(selectInitialValues('alpha', false)).toEqual(['alpha']);
    expect(selectInitialValues('', false)).toEqual([]);
  });

  it('multi-select splits on commas and trims', () => {
    expect(selectInitialValues('a, b ,c', true)).toEqual(['a', 'b', 'c']);
    expect(selectInitialValues('', true)).toEqual([]);
  });

  it('toggleMultiChoice adds/removes choices', () => {
    expect(toggleMultiChoice(['a'], 'b')).toEqual(['a', 'b']);
    expect(toggleMultiChoice(['a', 'b'], 'a')).toEqual(['b']);
  });

  it('toggleMultiChoice does not mutate the input array', () => {
    const input = ['a'];
    const out = toggleMultiChoice(input, 'b');
    expect(input).toEqual(['a']);
    expect(out).toEqual(['a', 'b']);
  });

  it('joinMultiChoice joins with comma-space', () => {
    expect(joinMultiChoice(['a', 'b'])).toBe('a, b');
    expect(joinMultiChoice([])).toBe('');
  });
});

describe('getCellValue', () => {
  const cells = [
    cell('1', 'r1', 'c1', 'x'),
    cell('2', 'r1', 'c2', 'y'),
    cell('3', 'r2', 'c1', 'z'),
  ];

  it('finds the cell by row + col', () => {
    expect(getCellValue(cells, 'r1', 'c1')).toBe('x');
    expect(getCellValue(cells, 'r2', 'c1')).toBe('z');
  });

  it('returns "" when no matching cell', () => {
    expect(getCellValue(cells, 'r9', 'c1')).toBe('');
    expect(getCellValue(cells, 'r1', 'c9')).toBe('');
  });
});

describe('applyCellWrite', () => {
  it('updates an existing cell value without changing cell id', () => {
    const prev = [cell('id1', 'r1', 'c1', 'old')];
    const next = applyCellWrite(prev, 'r1', 'c1', 'new', 500);
    expect(next).toHaveLength(1);
    expect(next[0]).toMatchObject({ id: 'id1', value: 'new', updated_at: 500 });
  });

  it('appends a new cell when the pair is absent', () => {
    const prev = [cell('id1', 'r1', 'c1', 'old')];
    const next = applyCellWrite(prev, 'r2', 'c2', 'fresh', 700);
    expect(next).toHaveLength(2);
    expect(next[0]).toMatchObject({ row_id: 'r1', column_id: 'c1' });
    expect(next[1]).toMatchObject({ row_id: 'r2', column_id: 'c2', value: 'fresh', created_at: 700 });
  });

  it('does not mutate the input array', () => {
    const prev = [cell('id1', 'r1', 'c1', 'old')];
    const next = applyCellWrite(prev, 'r1', 'c1', 'new');
    expect(prev[0].value).toBe('old');
    expect(next[0].value).toBe('new');
  });
});

describe('kanbanGroupRows', () => {
  const rows = [{ id: 'r1' }, { id: 'r2' }, { id: 'r3' }];
  const cells = [
    cell('a', 'r1', 'col', 'Done'),
    cell('b', 'r2', 'col', 'Todo'),
  ];
  const kanbanCol = { id: 'col', options: '{"choices":["Todo","Done"]}' };

  it('groups rows by cell value', () => {
    const groups = kanbanGroupRows(rows, cells, kanbanCol);
    expect(groups.Done.map((r) => r.id)).toEqual(['r1']);
    expect(groups.Todo.map((r) => r.id)).toEqual(['r2']);
  });

  it('puts rows without a value in "No status"', () => {
    const groups = kanbanGroupRows(rows, cells, kanbanCol);
    expect(groups['No status'].map((r) => r.id)).toEqual(['r3']);
  });
});

describe('orderKanbanGroups', () => {
  const kanbanCol = { id: 'col', options: '{"choices":["Todo","Done","Blocked"]}' };

  it('orders groups by the column choice order', () => {
    const groups = {
      Blocked: [{ id: 'b' }],
      Todo: [{ id: 't' }],
      Done: [{ id: 'd' }],
    };
    expect(orderKanbanGroups(groups, kanbanCol).map(([k]) => k)).toEqual([
      'Todo',
      'Done',
      'Blocked',
    ]);
  });

  it('keeps unknown groups and sorts them alphabetically after known ones', () => {
    const groups = {
      Zebra: [{ id: 'z' }],
      Todo: [{ id: 't' }],
      Alpha: [{ id: 'a' }],
    };
    const keys = orderKanbanGroups(groups, kanbanCol).map(([k]) => k);
    expect(keys[0]).toBe('Todo');
    expect(keys.slice(1).sort()).toEqual(['Alpha', 'Zebra']);
  });

  it('returns sorted [key, rows] entries usable for rendering', () => {
    const groups = { Todo: [{ id: 't' }], Alpha: [{ id: 'a' }] };
    const entries = orderKanbanGroups(groups, kanbanCol);
    expect(entries[0]).toEqual(['Todo', [{ id: 't' }]]);
  });
});