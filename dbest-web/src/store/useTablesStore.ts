import { create } from "zustand";

export type TableType = "csv" | "fyi" | "xml" | "memory";

export interface DBTable {
  id: string;
  name: string;
  type: TableType;
  path?: string;          // file path for CSV/XML/BTree
  columns?: string[];
  rowCount?: number;
}

interface TablesState {
  tables: DBTable[];
  selectedTableId: string | null;
  // Actions
  addTable: (table: DBTable) => void;
  removeTable: (id: string) => void;
  renameTable: (id: string, newName: string) => void;
  selectTable: (id: string | null) => void;
}

export const useTablesStore = create<TablesState>((set) => ({
  tables: [],   // starts empty — tables are loaded from the real API
  selectedTableId: null,

  addTable: (table) =>
    set((state) => {
      if (state.tables.some((t) => t.id === table.id)) {
        return { tables: state.tables.map((t) => (t.id === table.id ? table : t)) };
      }
      return { tables: [...state.tables, table] };
    }),

  removeTable: (id) =>
    set((state) => ({
      tables: state.tables.filter((t) => t.id !== id),
      selectedTableId: state.selectedTableId === id ? null : state.selectedTableId,
    })),

  renameTable: (id, newName) =>
    set((state) => ({
      tables: state.tables.map((t) => (t.id === id ? { ...t, name: newName } : t)),
    })),

  selectTable: (id) => set({ selectedTableId: id }),
}));

// ── Helpers ──────────────────────────────────────────────────────────────────
export const TABLE_TYPE_META: Record<
  TableType,
  { label: string; color: string; bgColor: string; icon: string }
> = {
  csv:    { label: "CSV",    color: "var(--color-csv)",    bgColor: "rgba(22,163,74,0.10)",  icon: "📄" },
  fyi:    { label: "FYI",    color: "var(--color-fyi)",    bgColor: "rgba(202,138,4,0.10)",  icon: "⭐" },
  xml:    { label: "XML",    color: "var(--color-xml)",    bgColor: "rgba(219,39,119,0.10)", icon: "🗂️" },
  memory: { label: "MEM",    color: "var(--color-memory)", bgColor: "rgba(2,132,199,0.10)",  icon: "💾" },
};
