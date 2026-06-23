import { create } from "zustand";
import {
  Node,
  Edge,
  applyNodeChanges,
  applyEdgeChanges,
  addEdge,
  NodeChange,
  EdgeChange,
  Connection,
} from "@xyflow/react";
import { computeTreeLayout, findRootNode } from "@/lib/autoLayout";

export type OperatorType =
  | "SORT" | "PROJECTION" | "FILTER" | "AGGREGATION" | "GROUP" | "HASH_GROUP"
  | "CARTESIAN_PRODUCT" | "NESTED_LOOP_JOIN" | "MERGE_JOIN" | "HASH_JOIN"
  | "NESTED_LOOP_LEFT_OUTER_JOIN" | "NESTED_LOOP_RIGHT_OUTER_JOIN"
  | "MERGE_LEFT_OUTER_JOIN" | "HASH_LEFT_OUTER_JOIN"
  | "MERGE_RIGHT_OUTER_JOIN" | "HASH_RIGHT_OUTER_JOIN"
  | "MERGE_FULL_OUTER_JOIN" | "HASH_FULL_OUTER_JOIN"
  | "NESTED_LOOP_LEFT_SEMI_JOIN" | "MERGE_LEFT_SEMI_JOIN" | "HASH_LEFT_SEMI_JOIN"
  | "MERGE_RIGHT_SEMI_JOIN" | "HASH_RIGHT_SEMI_JOIN"
  | "NESTED_LOOP_LEFT_ANTI_JOIN" | "MERGE_LEFT_ANTI_JOIN" | "HASH_LEFT_ANTI_JOIN"
  | "MERGE_RIGHT_ANTI_JOIN" | "HASH_RIGHT_ANTI_JOIN"
  | "UNION" | "HASH_UNION" | "INTERSECTION" | "HASH_INTERSECTION"
  | "DIFFERENCE" | "HASH_DIFFERENCE" | "APPEND"
  | "DUPLICATE_REMOVAL" | "HASH_DUPLICATE_REMOVAL" | "LIMIT" | "SELECT_COLUMNS"
  | "EXPLODE" | "AUTO_INCREMENT" | "HASH" | "MEMOIZE" | "MATERIALIZATION"
  | "AND" | "OR" | "XOR" | "CONDITION" | "IF"
  | "SCAN" | "RENAME" | "REFERENCE";

export interface TableNodeData {
  label: string;
  tableId: string;
  tableName: string;
  tableType: "csv" | "fyi" | "xml" | "memory" | "jdbc";
  columns?: string[];
  [key: string]: unknown;
}

export interface OperatorNodeData {
  label: string;
  operatorType: OperatorType;
  displayName: string;
  arguments: string[];
  isConfigured: boolean;
  hasError: boolean;
  errorMessage?: string;
  isMarked?: boolean;
  [key: string]: unknown;
}

interface HistoryEntry {
  nodes: Node[];
  edges: Edge[];
}

const MAX_HISTORY = 50;

let nodeIdCounter = 1;
export const generateNodeId = () => `node_${Date.now()}_${nodeIdCounter++}`;

interface CanvasState {
  nodes: Node[];
  edges: Edge[];
  history: HistoryEntry[];
  historyIndex: number;
  canUndo: boolean;
  canRedo: boolean;

  // Node/edge mutations
  onNodesChange: (changes: NodeChange[]) => void;
  onEdgesChange: (changes: EdgeChange[]) => void;
  onConnect: (connection: Connection) => void;
  addNode: (node: Node) => void;
  removeNode: (id: string) => void;
  updateNodeData: (id: string, data: Partial<TableNodeData | OperatorNodeData>) => void;
  markNode: (id: string, marked: boolean) => void;
  clearAll: () => void;

  // History
  pushHistory: () => void;
  undo: () => void;
  redo: () => void;

  // Session
  loadSession: (nodes: Node[], edges: Edge[]) => void;

  // Auto-layout
  redistributeNodes: (rootId?: string) => void;
}

export const useCanvasStore = create<CanvasState>((set, get) => ({
  nodes: [],
  edges: [],
  history: [{ nodes: [], edges: [] }],
  historyIndex: 0,
  canUndo: false,
  canRedo: false,

  pushHistory: () => {
    const { nodes, edges, history, historyIndex } = get();
    // Clone nodes and edges to prevent React Flow in-place mutations from leaking into history snapshots
    const clonedNodes = nodes.map((n) => ({
      ...n,
      position: { ...n.position },
      data: { ...n.data },
    }));
    const clonedEdges = edges.map((e) => ({ ...e }));
    const newEntry = { nodes: clonedNodes, edges: clonedEdges };

    // Truncate forward history
    const newHistory = [...history.slice(0, historyIndex + 1), newEntry].slice(-MAX_HISTORY);
    set({
      history: newHistory,
      historyIndex: newHistory.length - 1,
      canUndo: newHistory.length > 1,
      canRedo: false,
    });
  },

  undo: () => {
    const { history, historyIndex } = get();
    if (historyIndex <= 0) return;
    const prev = history[historyIndex - 1];
    set({
      nodes: prev.nodes,
      edges: prev.edges,
      historyIndex: historyIndex - 1,
      canUndo: historyIndex - 1 > 0,
      canRedo: true,
    });
  },

  redo: () => {
    const { history, historyIndex } = get();
    if (historyIndex >= history.length - 1) return;
    const next = history[historyIndex + 1];
    set({
      nodes: next.nodes,
      edges: next.edges,
      historyIndex: historyIndex + 1,
      canUndo: true,
      canRedo: historyIndex + 1 < history.length - 1,
    });
  },

  onNodesChange: (changes) => {
    set((state) => ({ nodes: applyNodeChanges(changes, state.nodes) }));
  },

  onEdgesChange: (changes) => {
    set((state) => ({ edges: applyEdgeChanges(changes, state.edges) }));
  },

  onConnect: (connection) => {
    const { pushHistory } = get();
    set((state) => ({
      edges: addEdge(
        {
          ...connection,
          animated: false,
          style: { stroke: "var(--border-default)", strokeWidth: 2 },
        },
        state.edges
      ),
    }));
    pushHistory();
  },

  addNode: (node) => {
    const { pushHistory } = get();
    set((state) => ({ nodes: [...state.nodes, node] }));
    pushHistory();
  },

  removeNode: (id) => {
    const { pushHistory } = get();
    set((state) => ({
      nodes: state.nodes.filter((n) => n.id !== id),
      edges: state.edges.filter((e) => e.source !== id && e.target !== id),
    }));
    pushHistory();
  },

  updateNodeData: (id, data) => {
    const { pushHistory } = get();
    set((state) => ({
      nodes: state.nodes.map((n) =>
        n.id === id ? { ...n, data: { ...n.data, ...data } } : n
      ),
    }));
    pushHistory();
  },

  markNode: (id, marked) => {
    set((state) => ({
      nodes: state.nodes.map((n) =>
        n.id === id ? { ...n, data: { ...n.data, isMarked: marked } } : n
      ),
    }));
  },

  clearAll: () => {
    const { pushHistory } = get();
    set({ nodes: [], edges: [] });
    pushHistory();
  },

  loadSession: (nodes, edges) => {
    set({ nodes, edges, history: [{ nodes, edges }], historyIndex: 0, canUndo: false, canRedo: false });
  },

  redistributeNodes: (rootId?: string) => {
    const { nodes, edges, pushHistory } = get();
    if (nodes.length === 0) return;
    const resolvedRoot = rootId ?? findRootNode(nodes, edges);
    if (!resolvedRoot) return;
    const positions = computeTreeLayout(resolvedRoot, nodes, edges);
    set({
      nodes: nodes.map((n) => {
        const pos = positions.get(n.id);
        return pos ? { ...n, position: pos } : n;
      }),
    });
    pushHistory();
  },
}));
