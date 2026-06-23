import { useMemo } from "react";
import { useCanvasStore, TableNodeData, OperatorNodeData } from "@/store/useCanvasStore";
import { Node as FlowNode, Edge as FlowEdge } from "@xyflow/react";

export interface ColumnInfo {
  name: string;
  sourceNodeId: string;
  sourceLabel: string;
  side: "left" | "right" | "single"; // which input position
}

/**
 * Recursively resolves the output columns flowing out of a given node in the graph.
 */
export function getOutColumns(nodeId: string, nodes: FlowNode[], edges: FlowEdge[]): string[] {
  const node = nodes.find((n) => n.id === nodeId);
  if (!node) return [];

  if (node.type === "tableNode") {
    const data = node.data as TableNodeData;
    return data.columns ?? [];
  }

  // Operator node
  const data = node.data as OperatorNodeData;
  const operatorType = data.operatorType?.toUpperCase();

  // Find incoming nodes to this operator (edges: source = child/input, target = parent/current)
  const incoming = edges
    .filter((e) => e.target === nodeId)
    .map((e) => e.source);

  if (operatorType === "PROJECTION" || operatorType === "SELECT_COLUMNS") {
    // Columns are explicitly chosen by the arguments of the PROJECTION
    return data.arguments ?? [];
  }

  if (operatorType === "RENAME") {
    // In DBest Desktop, RENAME might map old_name to new_name, but for schema propagation,
    // it flows columns. If arguments have columns renamed, we can map them,
    // otherwise fallback to input columns.
    return incoming.length > 0 ? getOutColumns(incoming[0], nodes, edges) : [];
  }

  // Joins combine columns from left (input 0) and right (input 1)
  if (
    operatorType?.endsWith("_JOIN") ||
    operatorType === "HASH_INNER_JOIN" ||
    operatorType === "CARTESIAN_PRODUCT"
  ) {
    const leftCols = incoming.length > 0 ? getOutColumns(incoming[0], nodes, edges) : [];
    const rightCols = incoming.length > 1 ? getOutColumns(incoming[1], nodes, edges) : [];
    return Array.from(new Set([...leftCols, ...rightCols]));
  }

  if (
    operatorType === "AGGREGATION" ||
    operatorType === "GROUP"
  ) {
    // Aggregation/Grouping outputs the grouping columns + aggregated attributes.
    // If configured, use those. Otherwise, flow input columns as placeholder.
    return data.arguments && data.arguments.length > 0
      ? data.arguments
      : incoming.length > 0
      ? getOutColumns(incoming[0], nodes, edges)
      : [];
  }

  // Filter, Sort, Limit, Union, etc. preserve the incoming columns of the first input
  if (incoming.length > 0) {
    return getOutColumns(incoming[0], nodes, edges);
  }

  return [];
}

/**
 * Given a node ID, returns all columns available from its connected source nodes.
 * Traverses recursively through previous operator and table nodes.
 */
export function useNodeInputColumns(nodeId: string | undefined): ColumnInfo[] {
  const { nodes, edges } = useCanvasStore();

  return useMemo(() => {
    if (!nodeId) return [];

    // Find all edges whose target is this node
    const incomingEdges = edges.filter((e) => e.target === nodeId);

    const columns: ColumnInfo[] = [];

    incomingEdges.forEach((edge, idx) => {
      const sourceNode = nodes.find((n) => n.id === edge.source);
      if (!sourceNode) return;

      const side: "left" | "right" | "single" =
        incomingEdges.length === 1 ? "single" : idx === 0 ? "left" : "right";

      const sourceCols = getOutColumns(sourceNode.id, nodes, edges);
      const sourceLabel =
        sourceNode.type === "tableNode"
          ? (sourceNode.data as TableNodeData).tableName
          : String((sourceNode.data as OperatorNodeData).displayName ?? sourceNode.id);

      sourceCols.forEach((col) => {
        columns.push({
          name: col,
          sourceNodeId: sourceNode.id,
          sourceLabel,
          side,
        });
      });
    });

    return columns;
  }, [nodeId, nodes, edges]);
}

/** Returns columns as simple string arrays, split by side */
export function useColumnsBySide(nodeId: string | undefined) {
  const all = useNodeInputColumns(nodeId);
  const left = all.filter((c) => c.side === "left" || c.side === "single");
  const right = all.filter((c) => c.side === "right");
  const allNames = Array.from(new Set(all.map((c) => c.name)));
  const leftNames = Array.from(new Set(left.map((c) => c.name)));
  const rightNames = Array.from(new Set(right.map((c) => c.name)));
  return { all, allNames, left, right, leftNames, rightNames };
}
