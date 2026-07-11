import React, { useState, useEffect, useCallback, useRef } from "react";
import { Node, mergeAttributes } from "@tiptap/core";
import { ReactNodeViewRenderer } from "@tiptap/react";
import type { NodeViewProps } from "@tiptap/react";
import { api, DbBase, DbColumn, DbRow, DbCell } from "../lib/api";

// ─── Options ─────────────────────────────────────────────────────────────────

export interface DatabaseBaseOptions {
  HTMLAttributes: Record<string, unknown>;
}

declare module "@tiptap/core" {
  interface Commands<ReturnType> {
    databaseBase: {
      setDatabaseBase: (options: { baseId: string }) => ReturnType;
    };
  }
}

// ─── Inline cell edit popover ────────────────────────────────────────────────

const CellEditor: React.FC<{
  value: string;
  fieldType: string;
  onSave: (val: string) => void;
  onCancel: () => void;
}> = ({ value, fieldType, onSave, onCancel }) => {
  const [editValue, setEditValue] = useState(value || "");
  const inputRef = useRef<HTMLInputElement | HTMLTextAreaElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      onSave(editValue);
    }
    if (e.key === "Escape") {
      onCancel();
    }
  };

  if (fieldType === "number") {
    return (
      <input
        ref={inputRef as any}
        type="number"
        value={editValue}
        onChange={(e) => setEditValue(e.target.value)}
        onKeyDown={handleKeyDown}
        onBlur={() => onSave(editValue)}
        className="w-full bg-transparent border border-indigo-500/50 rounded px-2 py-1 text-sm outline-hidden"
      />
    );
  }

  if (fieldType === "checkbox") {
    return (
      <input
        ref={inputRef as any}
        type="checkbox"
        checked={editValue === "true"}
        onChange={(e) => {
          onSave(e.target.checked ? "true" : "false");
        }}
        className="w-4 h-4 cursor-pointer"
      />
    );
  }

  return (
    <input
      ref={inputRef as any}
      type="text"
      value={editValue}
      onChange={(e) => setEditValue(e.target.value)}
      onKeyDown={handleKeyDown}
      onBlur={() => onSave(editValue)}
      className="w-full bg-transparent border border-indigo-500/50 rounded px-2 py-1 text-sm outline-hidden"
      placeholder="Enter value..."
    />
  );
};

// ─── Render cell value based on field type ───────────────────────────────────

function renderCellValue(value: string, fieldType: string): React.ReactNode {
  if (fieldType === "checkbox") {
    return value === "true" ? "✓" : "";
  }
  if (fieldType === "number") {
    return value || "—";
  }
  return value || "";
}

// ─── Select field editor ─────────────────────────────────────────────────────

const SelectCellEditor: React.FC<{
  value: string;
  options: string; // JSON: { "choices": ["a","b","c"] }
  multi: boolean;
  onSave: (val: string) => void;
  onCancel: () => void;
}> = ({ value, options, multi, onSave, onCancel }) => {
  let choices: string[] = [];
  try {
    const parsed = JSON.parse(options);
    choices = parsed.choices || [];
  } catch { /* ignore */ }

  const selectedValues = value ? (multi ? value.split(",").map(v => v.trim()) : [value]) : [];
  const [localSelected, setLocalSelected] = useState<string[]>(selectedValues);

  const toggle = (choice: string) => {
    if (multi) {
      setLocalSelected(prev =>
        prev.includes(choice) ? prev.filter(c => c !== choice) : [...prev, choice]
      );
    } else {
      onSave(choice);
    }
  };

  const handleDone = () => {
    onSave(multi ? localSelected.join(", ") : localSelected[0] || "");
  };

  return (
    <div className="p-2 bg-gray-800 border border-gray-700 rounded-lg shadow-xl min-w-[160px]">
      {choices.map((choice) => (
        <button
          key={choice}
          onClick={() => toggle(choice)}
          className={`block w-full text-left px-3 py-1.5 text-sm rounded transition-colors ${
            localSelected.includes(choice)
              ? "bg-indigo-600/30 text-indigo-300"
              : "text-gray-300 hover:bg-gray-700"
          }`}
        >
          {multi && (
            <span className="mr-2">{localSelected.includes(choice) ? "✓" : ""}</span>
          )}
          {choice}
        </button>
      ))}
      {multi && (
        <button
          onClick={handleDone}
          className="mt-2 w-full px-3 py-1.5 text-xs font-medium bg-indigo-600 hover:bg-indigo-500 text-white rounded"
        >
          Done
        </button>
      )}
    </div>
  );
};

// ─── Database Base Node View ─────────────────────────────────────────────────

const DatabaseBaseNodeView: React.FC<NodeViewProps> = ({
  node,
  updateAttributes,
  selected,
  editor,
}) => {
  const { baseId } = node.attrs;

  // Data state
  const [dbBase, setDbBase] = useState<DbBase | null>(null);
  const [columns, setColumns] = useState<DbColumn[]>([]);
  const [rows, setRows] = useState<DbRow[]>([]);
  const [cells, setCells] = useState<DbCell[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // UI state
  const [viewType, setViewType] = useState<string>("table");
  const [editingCell, setEditingCell] = useState<{ rowId: string; colId: string } | null>(null);
  const [addingColumn, setAddingColumn] = useState(false);
  const [newColumnName, setNewColumnName] = useState("");
  const [newColumnType, setNewColumnType] = useState("text");
  const [showSelectEditor, setShowSelectEditor] = useState<{
    rowId: string; colId: string; fieldType: string; options: string; multi: boolean;
  } | null>(null);

  // ─── Load data ───────────────────────────────────────────────────────────────

  const loadData = useCallback(async () => {
    if (!baseId) { setLoading(false); return; }
    setLoading(true);
    setError("");
    try {
      const [base, cols, rs] = await Promise.all([
        api.databases.get(baseId),
        api.databases.columns.list(baseId),
        api.databases.rows.list(baseId),
      ]);
      if (!base) { setError("Database not found"); setLoading(false); return; }
      setDbBase(base);
      setColumns(cols);
      setRows(rs);
      setViewType(base.view_type);

      // Load all cells
      const allCells = await api.databases.cells.listForBase(baseId);
      setCells(allCells);
    } catch (err: unknown) {
      setError(String(err));
    }
    setLoading(false);
  }, [baseId]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // ─── Cell helpers ────────────────────────────────────────────────────────────

  const getCellValue = (rowId: string, colId: string): string => {
    return cells.find(c => c.row_id === rowId && c.column_id === colId)?.value || "";
  };

  const handleCellSave = async (rowId: string, colId: string, value: string) => {
    try {
      await api.databases.cells.update(rowId, colId, value);
      // Optimistic update
      setCells(prev => {
        const idx = prev.findIndex(c => c.row_id === rowId && c.column_id === colId);
        if (idx >= 0) {
          const updated = [...prev];
          updated[idx] = { ...updated[idx], value, updated_at: Date.now() };
          return updated;
        }
        return [...prev, { id: "", row_id: rowId, column_id: colId, value, created_at: Date.now(), updated_at: Date.now() }];
      });
    } catch (err: unknown) {
      setError(String(err));
    }
    setEditingCell(null);
    setShowSelectEditor(null);
  };

  // ─── Add row ─────────────────────────────────────────────────────────────────

  const handleAddRow = async () => {
    if (!baseId) return;
    try {
      const newRowId = await api.databases.rows.create(baseId, rows.length, "editor");
      // Reload to get fresh data
      await loadData();
    } catch (err: unknown) {
      setError(String(err));
    }
  };

  // ─── Delete row ──────────────────────────────────────────────────────────────

  const handleDeleteRow = async (rowId: string) => {
    try {
      await api.databases.rows.delete(rowId);
      setRows(prev => prev.filter(r => r.id !== rowId));
      setCells(prev => prev.filter(c => c.row_id !== rowId));
    } catch (err: unknown) {
      setError(String(err));
    }
  };

  // ─── Add column ──────────────────────────────────────────────────────────────

  const handleAddColumn = async () => {
    if (!baseId || !newColumnName.trim()) return;
    try {
      const colId = await api.databases.columns.create(baseId, newColumnName.trim(), newColumnType);
      setNewColumnName("");
      setNewColumnType("text");
      setAddingColumn(false);
      await loadData();
    } catch (err: unknown) {
      setError(String(err));
    }
  };

  // ─── Switch view type ────────────────────────────────────────────────────────

  const handleToggleView = () => {
    const newType = viewType === "table" ? "kanban" : "table";
    setViewType(newType);
  };

  // ─── Loading ─────────────────────────────────────────────────────────────────

  if (loading) {
    return (
      <div className="my-4 p-6 bg-gray-900/60 border border-gray-800 rounded-xl flex items-center justify-center">
        <div className="flex items-center gap-3 text-gray-400">
          <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
          </svg>
          <span className="text-sm">Loading database...</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="my-4 p-6 bg-red-900/20 border border-red-800/40 rounded-xl">
        <p className="text-red-400 text-sm">{error}</p>
      </div>
    );
  }

  if (!dbBase) {
    return (
      <div className="my-4 p-6 bg-gray-900/60 border border-gray-800 rounded-xl">
        <p className="text-gray-500 text-sm">Database not found</p>
      </div>
    );
  }

  // ─── Identify the "status" column for kanban grouping ────────────────────────
  // Kanban view groups rows by a "status" or "select" column
  const kanbanCol = viewType === "kanban"
    ? columns.find(c => c.field_type === "select" || c.name.toLowerCase() === "status")
    : null;

  // ─── Render: Table View ──────────────────────────────────────────────────────

  const renderTableView = () => (
    <div className="overflow-x-auto">
      <table className="w-full border-collapse">
        {/* Header */}
        <thead>
          <tr className="border-b border-gray-700">
            <th className="text-left px-3 py-2 text-xs font-medium text-gray-400 uppercase tracking-wider w-8">#</th>
            {columns.map((col) => (
              <th
                key={col.id}
                className="text-left px-3 py-2 text-xs font-medium text-gray-400 uppercase tracking-wider whitespace-nowrap"
              >
                <span className="flex items-center gap-2">
                  {col.name}
                  <span className="text-gray-600 text-[10px]">({col.field_type})</span>
                </span>
              </th>
            ))}
            <th className="w-12" />
          </tr>
        </thead>
        {/* Body */}
        <tbody>
          {rows.map((row, idx) => (
            <tr
              key={row.id}
              className="border-b border-gray-800 hover:bg-gray-800/40 transition-colors group"
            >
              <td className="px-3 py-2 text-xs text-gray-600">{idx + 1}</td>
              {columns.map((col) => (
                <td
                  key={`${row.id}-${col.id}`}
                  className="px-3 py-2 text-sm text-gray-300 cursor-pointer"
                  onClick={() => {
                    if (col.field_type === "select" || col.field_type === "multi_select") {
                      setShowSelectEditor({
                        rowId: row.id,
                        colId: col.id,
                        fieldType: col.field_type,
                        options: col.options,
                        multi: col.field_type === "multi_select",
                      });
                    } else {
                      setEditingCell({ rowId: row.id, colId: col.id });
                    }
                  }}
                >
                  {editingCell?.rowId === row.id && editingCell?.colId === col.id ? (
                    <CellEditor
                      value={getCellValue(row.id, col.id)}
                      fieldType={col.field_type}
                      onSave={(val) => handleCellSave(row.id, col.id, val)}
                      onCancel={() => setEditingCell(null)}
                    />
                  ) : showSelectEditor?.rowId === row.id && showSelectEditor?.colId === col.id ? (
                    <SelectCellEditor
                      value={getCellValue(row.id, col.id)}
                      options={col.options}
                      multi={col.field_type === "multi_select"}
                      onSave={(val) => handleCellSave(row.id, col.id, val)}
                      onCancel={() => setShowSelectEditor(null)}
                    />
                  ) : (
                    <div className="min-h-[24px] flex items-center group/cell">
                      <span className="truncate max-w-[200px]">{renderCellValue(getCellValue(row.id, col.id), col.field_type)}</span>
                      <span className="opacity-0 group-hover/cell:opacity-40 ml-2 text-gray-600 text-xs">✎</span>
                    </div>
                  )}
                </td>
              ))}
              <td className="px-2 py-2">
                <button
                  onClick={() => handleDeleteRow(row.id)}
                  className="opacity-0 group-hover:opacity-60 hover:opacity-100 text-gray-500 hover:text-red-400 transition-all text-xs"
                  title="Delete row"
                >
                  ✕
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {/* Add row */}
      <button
        onClick={handleAddRow}
        className="mt-2 w-full py-2 text-sm text-gray-500 hover:text-indigo-400 hover:bg-gray-800/40 rounded-lg transition-colors border border-dashed border-gray-800 hover:border-indigo-800/40"
      >
        + Add row
      </button>

      {/* Add column */}
      {addingColumn ? (
        <div className="mt-3 flex items-center gap-2">
          <input
            type="text"
            value={newColumnName}
            onChange={(e) => setNewColumnName(e.target.value)}
            placeholder="Column name"
            className="flex-1 bg-gray-800 border border-gray-700 rounded px-2 py-1.5 text-sm outline-hidden focus:border-indigo-500"
            autoFocus
            onKeyDown={(e) => {
              if (e.key === "Enter") handleAddColumn();
              if (e.key === "Escape") setAddingColumn(false);
            }}
          />
          <select
            value={newColumnType}
            onChange={(e) => setNewColumnType(e.target.value)}
            className="bg-gray-800 border border-gray-700 rounded px-2 py-1.5 text-sm outline-hidden"
          >
            <option value="text">Text</option>
            <option value="number">Number</option>
            <option value="select">Select</option>
            <option value="multi_select">Multi-select</option>
            <option value="date">Date</option>
            <option value="checkbox">Checkbox</option>
            <option value="url">URL</option>
          </select>
          <button
            onClick={handleAddColumn}
            className="px-3 py-1.5 text-xs font-medium bg-indigo-600 hover:bg-indigo-500 text-white rounded"
          >
            Add
          </button>
          <button
            onClick={() => { setAddingColumn(false); setNewColumnName(""); }}
            className="px-3 py-1.5 text-xs text-gray-400 hover:text-gray-300"
          >
            Cancel
          </button>
        </div>
      ) : (
        <button
          onClick={() => setAddingColumn(true)}
          className="mt-2 text-sm text-gray-500 hover:text-indigo-400 transition-colors"
        >
          + Add column
        </button>
      )}
    </div>
  );

  // ─── Render: Kanban View ─────────────────────────────────────────────────────

  const renderKanbanView = () => {
    if (!kanbanCol) {
      // Fall back to table if no suitable column for kanban
      return (
        <div className="p-4 text-center text-gray-500 text-sm">
          <p className="mb-2">Kanban view needs a "select" column to group by.</p>
          <p className="text-xs text-gray-600">Add a column with type "Select" and name it "Status" to enable kanban grouping.</p>
          {renderTableView()}
        </div>
      );
    }

    // Group rows by the kanban column's value
    const groups: Record<string, DbRow[]> = {};
    for (const row of rows) {
      const val = getCellValue(row.id, kanbanCol.id) || "No status";
      if (!groups[val]) groups[val] = [];
      groups[val].push(row);
    }

    // Get choices from column options for ordering
    let columnOrder: string[] = [];
    try {
      const opts = JSON.parse(kanbanCol.options);
      columnOrder = opts.choices || [];
    } catch { /* ignore */ }

    // Sort groups by the column order, then alphabetically
    const sortedGroups = Object.entries(groups).sort(([a], [b]) => {
      const ai = columnOrder.indexOf(a);
      const bi = columnOrder.indexOf(b);
      if (ai >= 0 && bi >= 0) return ai - bi;
      if (ai >= 0) return -1;
      if (bi >= 0) return 1;
      return a.localeCompare(b);
    });

    return (
      <div className="flex gap-4 overflow-x-auto pb-4">
        {sortedGroups.map(([status, groupRows]) => (
          <div key={status} className="shrink-0 w-72 bg-gray-900/80 border border-gray-800 rounded-xl">
            {/* Column header */}
            <div className="px-4 py-3 border-b border-gray-800">
              <div className="flex items-center justify-between">
                <h4 className="font-medium text-sm text-gray-300">{status}</h4>
                <span className="text-xs text-gray-500 bg-gray-800 px-2 py-0.5 rounded-full">{groupRows.length}</span>
              </div>
            </div>
            {/* Cards */}
            <div className="p-3 space-y-2">
              {groupRows.map((row) => (
                <div
                  key={row.id}
                  className="bg-gray-800 border border-gray-700/60 rounded-lg p-3 hover:border-gray-600 transition-colors group/card"
                >
                  {/* Row fields rendered as card details */}
                  {columns.filter(c => c.id !== kanbanCol.id).slice(0, 3).map((col) => (
                    <div key={col.id} className="mb-1 last:mb-0">
                      <span className="text-[10px] text-gray-500 uppercase">{col.name}: </span>
                      <span
                        className="text-xs text-gray-300 cursor-pointer hover:text-indigo-400"
                        onClick={() => {
                          if (col.field_type === "select" || col.field_type === "multi_select") {
                            setShowSelectEditor({ rowId: row.id, colId: col.id, fieldType: col.field_type, options: col.options, multi: col.field_type === "multi_select" });
                          } else {
                            setEditingCell({ rowId: row.id, colId: col.id });
                          }
                        }}
                      >
                        {renderCellValue(getCellValue(row.id, col.id), col.field_type) || "—"}
                      </span>
                    </div>
                  ))}
                  <button
                    onClick={() => handleDeleteRow(row.id)}
                    className="opacity-0 group-hover/card:opacity-60 hover:opacity-100 text-gray-500 hover:text-red-400 transition-all text-xs mt-2"
                  >
                    ✕ Remove
                  </button>
                </div>
              ))}
              {/* Add card */}
              <button
                onClick={handleAddRow}
                className="w-full py-2 text-xs text-gray-500 hover:text-indigo-400 hover:bg-gray-800/60 rounded-lg border border-dashed border-gray-700/50 transition-colors"
              >
                + Add card
              </button>
            </div>
          </div>
        ))}
      </div>
    );
  };

  // ─── Main render ─────────────────────────────────────────────────────────────

  return (
    <div className={`my-4 bg-gray-900/40 border border-gray-800/60 rounded-xl overflow-hidden ${selected ? "ring-2 ring-indigo-500/50" : ""}`}>
      {/* Toolbar */}
      <div className="flex items-center justify-between px-4 py-2.5 bg-gray-900/80 border-b border-gray-800">
        <div className="flex items-center gap-3">
          <svg className="w-4 h-4 text-indigo-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M4 7v10c0 2 1 3 3 3h10c2 0 3-1 3-3V7c0-2-1-3-3-3H7C5 4 4 5 4 7z" />
          </svg>
          <span className="text-sm font-medium text-gray-300">{dbBase.title || "Database"}</span>
          <span className="text-[10px] text-gray-600 bg-gray-800 px-2 py-0.5 rounded-full uppercase">{viewType}</span>
        </div>
        <div className="flex items-center gap-2">
          {/* View toggle */}
          <button
            onClick={handleToggleView}
            className={`px-2.5 py-1 text-xs rounded-md transition-colors ${
              viewType === "table"
                ? "bg-indigo-600/20 text-indigo-400"
                : "bg-gray-800 text-gray-400 hover:text-gray-300"
            }`}
            title="Switch to table view"
          >
            <svg className="w-3.5 h-3.5 inline mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M3 10h18M3 14h18m-9-4v8" />
            </svg>
            Table
          </button>
          <button
            onClick={handleToggleView}
            className={`px-2.5 py-1 text-xs rounded-md transition-colors ${
              viewType === "kanban"
                ? "bg-indigo-600/20 text-indigo-400"
                : "bg-gray-800 text-gray-400 hover:text-gray-300"
            }`}
            title="Switch to kanban view"
          >
            <svg className="w-3.5 h-3.5 inline mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 17V7m0 10a2 2 0 01-2 2H5a2 2 0 01-2-2V7a2 2 0 012-2h2a2 2 0 012 2m0 10a2 2 0 002 2h2a2 2 0 002-2M9 7a2 2 0 012-2h2a2 2 0 012 2m0 10V7m0 10a2 2 0 002 2h2a2 2 0 002-2V7a2 2 0 00-2-2h-2a2 2 0 00-2 2" />
            </svg>
            Kanban
          </button>
          {/* Reload */}
          <button
            onClick={loadData}
            className="p-1.5 text-gray-500 hover:text-gray-300 transition-colors rounded hover:bg-gray-800"
            title="Reload data"
          >
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="p-4">
        {viewType === "kanban" ? renderKanbanView() : renderTableView()}
      </div>

      {/* Row count */}
      <div className="px-4 py-2 bg-gray-900/60 border-t border-gray-800 text-[10px] text-gray-600 flex items-center gap-3">
        <span>{rows.length} row{rows.length !== 1 ? "s" : ""}</span>
        <span>{columns.length} column{columns.length !== 1 ? "s" : ""}</span>
        <span className="text-gray-700">•</span>
        <span className="text-gray-700">Click any cell to edit</span>
      </div>
    </div>
  );
};

// ─── Tiptap Node Definition ─────────────────────────────────────────────────

export const DatabaseBase = Node.create<DatabaseBaseOptions>({
  name: "databaseBase",

  group: "block",

  atom: true,

  draggable: true,

  addAttributes() {
    return {
      baseId: {
        default: "",
        parseHTML: (el) => el.getAttribute("data-base-id") || "",
        renderHTML: (attrs) => {
          if (!attrs.baseId) return {};
          return { "data-base-id": attrs.baseId as string };
        },
      },
    };
  },

  parseHTML() {
    return [{ tag: "div[data-base-id]" }];
  },

  renderHTML({ HTMLAttributes }) {
    return ["div", mergeAttributes(HTMLAttributes)];
  },

  addNodeView() {
    return ReactNodeViewRenderer(DatabaseBaseNodeView);
  },

  addCommands() {
    return {
      setDatabaseBase:
        (options: { baseId: string }) =>
        ({ commands }) => {
          return commands.insertContent({
            type: this.name,
            attrs: { baseId: options.baseId },
          });
        },
    };
  },
});


