import { create } from "zustand";
import { Node as FlowNode } from "@xyflow/react";
import { OperatorType } from "./useCanvasStore";

export type ModalKind =
  | "filter"
  | "projection"
  | "sort"
  | "join"
  | "aggregation"
  | "group"
  | "limit"
  | "rename_columns"
  | "data_viewer"
  | "node_info"
  | "export"
  | "import_csv"
  | "import_xml"
  | "import_fyi"
  | "import_memory"
  | "import_jdbc"
  | "import_dat"
  | "import_head"
  | null;

// Map operator types to their modal kind
export const OPERATOR_TO_MODAL: Partial<Record<OperatorType, ModalKind>> = {
  FILTER:                       "filter",
  PROJECTION:                   "projection",
  SELECT_COLUMNS:               "projection",
  SORT:                         "sort",
  NESTED_LOOP_JOIN:             "join",
  MERGE_JOIN:                   "join",
  HASH_JOIN:                    "join",
  NESTED_LOOP_LEFT_OUTER_JOIN:  "join",
  NESTED_LOOP_RIGHT_OUTER_JOIN: "join",
  MERGE_LEFT_OUTER_JOIN:        "join",
  HASH_LEFT_OUTER_JOIN:         "join",
  MERGE_RIGHT_OUTER_JOIN:       "join",
  HASH_RIGHT_OUTER_JOIN:        "join",
  MERGE_FULL_OUTER_JOIN:        "join",
  HASH_FULL_OUTER_JOIN:         "join",
  NESTED_LOOP_LEFT_SEMI_JOIN:   "join",
  MERGE_LEFT_SEMI_JOIN:         "join",
  HASH_LEFT_SEMI_JOIN:          "join",
  MERGE_RIGHT_SEMI_JOIN:        "join",
  HASH_RIGHT_SEMI_JOIN:         "join",
  NESTED_LOOP_LEFT_ANTI_JOIN:   "join",
  MERGE_LEFT_ANTI_JOIN:         "join",
  HASH_LEFT_ANTI_JOIN:          "join",
  MERGE_RIGHT_ANTI_JOIN:        "join",
  HASH_RIGHT_ANTI_JOIN:         "join",
  AGGREGATION:                  "aggregation",
  GROUP:                        "group",
  HASH_GROUP:                   "group",
  LIMIT:                        "limit",
  DUPLICATE_REMOVAL:            "limit",
  HASH_DUPLICATE_REMOVAL:       "limit",
  RENAME:                       "rename_columns",
};

/** Context passed to DataViewerModal to fetch real data */
export interface DataViewerContext {
  tableId?: string;   // fetch from /api/query/table/{tableId}
  jobId?: string;     // fetch pages from /api/query/result/{jobId}
  graphData?: import("@/lib/api").QueryGraph; // execute an operator graph
}

interface ModalsState {
  openModal: ModalKind;
  targetNode: FlowNode | null;
  dataViewerCtx: DataViewerContext | null;
  // Actions
  openForNode: (node: FlowNode) => void;
  openDataViewer: (node: FlowNode, ctx?: DataViewerContext) => void;
  openNodeInfo: (node: FlowNode) => void;
  openEdit: (node: FlowNode) => void;
  openImport: (kind: "csv" | "xml" | "fyi" | "memory" | "jdbc" | "dat" | "head") => void;
  openExport: (node: FlowNode) => void;
  close: () => void;
}

export const useModalsStore = create<ModalsState>((set) => ({
  openModal: null,
  targetNode: null,
  dataViewerCtx: null,

  openForNode: (node) => {
    const data = node.data as Record<string, unknown>;
    const operatorType = data.operatorType as OperatorType | undefined;
    if (!operatorType) return;
    const kind = OPERATOR_TO_MODAL[operatorType] ?? null;
    set({ openModal: kind, targetNode: node });
  },

  openEdit: (node) => {
    const data = node.data as Record<string, unknown>;
    const operatorType = data.operatorType as OperatorType | undefined;
    if (!operatorType) return;
    const kind = OPERATOR_TO_MODAL[operatorType] ?? null;
    set({ openModal: kind, targetNode: node });
  },

  openDataViewer: (node, ctx) =>
    set({ openModal: "data_viewer", targetNode: node, dataViewerCtx: ctx ?? null }),

  openNodeInfo: (node) =>
    set({ openModal: "node_info", targetNode: node }),

  openImport: (kind) =>
    set({ openModal: `import_${kind}` as ModalKind, targetNode: null, dataViewerCtx: null }),

  openExport: (node) =>
    set({ openModal: "export", targetNode: node, dataViewerCtx: null }),

  close: () => set({ openModal: null, targetNode: null, dataViewerCtx: null }),
}));
