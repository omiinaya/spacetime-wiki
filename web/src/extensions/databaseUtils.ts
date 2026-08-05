/**
 * Pure logic for the inline database (DatabaseBase extension).
 *
 * All functions here are side-effect free and unit-testable without React or
 * STDB. DatabaseBase.tsx imports them for cell rendering, select-option
 * parsing, cell-value lookup, and kanban grouping.
 */

export interface DbCell {
  id: string;
  row_id: string;
  column_id: string;
  value: string;
  created_at: number;
  updated_at: number;
}

export interface DbRow {
  id: string;
}

export interface DbColumn {
  id: string;
  name: string;
  field_type: string;
  options: string;
}

/** Render a cell value for a given field type (checkbox/number/plain). */
export function renderCellValue(value: string, fieldType: string): string {
  if (fieldType === 'checkbox') {
    return value === 'true' ? '✓' : '';
  }
  if (fieldType === 'number') {
    return value || '—';
  }
  return value || '';
}

/** Parse a select column's options JSON into a choices list. */
export function parseSelectOptions(options: string): string[] {
  try {
    const parsed = JSON.parse(options);
    return Array.isArray(parsed?.choices) ? parsed.choices : [];
  } catch {
    return [];
  }
}

/** Compute the initial selected values for the select editor. */
export function selectInitialValues(value: string, multi: boolean): string[] {
  if (!value) return [];
  return multi ? value.split(',').map((v) => v.trim()) : [value];
}

/** Toggle a choice for a multi-select (returns the next selection). */
export function toggleMultiChoice(prev: string[], choice: string): string[] {
  return prev.includes(choice) ? prev.filter((c) => c !== choice) : [...prev, choice];
}

/** Join multi-select values for storage. */
export function joinMultiChoice(selected: string[]): string {
  return selected.join(', ');
}

/** Look up a cell value by row + column id ('' when absent). */
export function getCellValue(cells: DbCell[], rowId: string, colId: string): string {
  return cells.find((c) => c.row_id === rowId && c.column_id === colId)?.value || '';
}

/**
 * Optimistic cell write: update an existing cell or prepend a new one.
 * Mirrors DatabaseBase's handleCellSave state update.
 */
export function applyCellWrite(
  cells: DbCell[],
  rowId: string,
  colId: string,
  value: string,
  now = Date.now(),
): DbCell[] {
  const idx = cells.findIndex((c) => c.row_id === rowId && c.column_id === colId);
  if (idx >= 0) {
    const updated = [...cells];
    updated[idx] = { ...updated[idx], value, updated_at: now };
    return updated;
  }
  return [
    ...cells,
    { id: '', row_id: rowId, column_id: colId, value, created_at: now, updated_at: now },
  ];
}

export interface KanbanColumn {
  id: string;
  options: string;
}

export interface KanbanGroup {
  key: string;
  rows: DbRow[];
}

/**
 * Group rows into kanban columns by the grouping column's cell value.
 */
export function kanbanGroupRows(
  rows: DbRow[],
  cells: DbCell[],
  kanbanCol: KanbanColumn,
): Record<string, DbRow[]> {
  const groups: Record<string, DbRow[]> = {};
  for (const row of rows) {
    const val = getCellValue(cells, row.id, kanbanCol.id) || 'No status';
    if (!groups[val]) groups[val] = [];
    groups[val].push(row);
  }
  return groups;
}

/**
 * Order kanban groups: follow the column's choice order first, then any
 * groups not in the choices alphabetically. Faithful to DatabaseBase's
 * original sort. Returns sorted [key, rows] entries (like Object.entries).
 */
export function orderKanbanGroups(
  groups: Record<string, DbRow[]>,
  kanbanCol: KanbanColumn,
): [string, DbRow[]][] {
  const columnOrder = parseSelectOptions(kanbanCol.options);
  return Object.entries(groups).sort(([a], [b]) => {
    const ai = columnOrder.indexOf(a);
    const bi = columnOrder.indexOf(b);
    if (ai >= 0 && bi >= 0) return ai - bi;
    if (ai >= 0) return -1;
    if (bi >= 0) return 1;
    return a.localeCompare(b);
  });
}