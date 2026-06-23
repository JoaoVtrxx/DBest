import type { Node as FlowNode, Edge } from "@xyflow/react";
import type { TableNodeData, OperatorNodeData } from "@/store/useCanvasStore";
import type { GraphNode, GraphEdge, QueryGraph } from "@/lib/api";

/**
 * Converts the React Flow canvas state into the JSON graph format
 * that the Spring Boot backend expects for query execution.
 *
 * The `rootNodeId` is the node the user clicked "Run Query" on —
 * the backend will traverse from this node downward to collect
 * all its source nodes recursively.
 */
export function serializeCanvasToQuery(
  rootNodeId: string,
  nodes: FlowNode[],
  edges: Edge[]
): QueryGraph {
  // Collect all nodes reachable upstream from rootNodeId
  const visited = new Set<string>();
  const queue = [rootNodeId];

  while (queue.length > 0) {
    const current = queue.shift()!;
    if (visited.has(current)) continue;
    visited.add(current);

    // Follow incoming edges (sources feed into current)
    const incomingSourceIds = edges
      .filter((e) => e.target === current)
      .map((e) => e.source);

    queue.push(...incomingSourceIds);
  }

  // Build graph nodes for visited nodes only
  const graphNodes: GraphNode[] = nodes
    .filter((n) => visited.has(n.id))
    .map((n): GraphNode => {
      if (n.type === "tableNode") {
        const d = n.data as TableNodeData;
        return {
          id: n.id,
          type: "table",
          tableId: d.tableId,
          tableName: d.tableName,
        };
      } else {
        const d = n.data as OperatorNodeData;
        return {
          id: n.id,
          type: "operator",
          operatorType: d.operatorType,
          arguments: mapArgumentsToRecord(d.operatorType, d.arguments),
        };
      }
    });

  // Build edges for visited subgraph only
  const graphEdges: GraphEdge[] = edges
    .filter((e) => visited.has(e.source) && visited.has(e.target))
    .map((e): GraphEdge => ({ source: e.source, target: e.target }));

  return {
    rootNodeId,
    nodes: graphNodes,
    edges: graphEdges,
  };
}

function mapArgumentsToRecord(operatorType: string, args: string[]): Record<string, string> {
  const record: Record<string, string> = {};
  if (!args || args.length === 0) return record;

  const type = operatorType.toUpperCase();
  if (type === "FILTER") {
    const left = args[0] || "";
    let op = args[1] || "";
    const right = args[2] || "";
    if (op === "≠") op = "!=";
    if (op === "≤") op = "<=";
    if (op === "≥") op = ">=";
    record["predicate"] = (left + " " + op + " " + right).trim();
  } else if (type === "PROJECTION") {
    record["columns"] = args.join(",");
  } else if (type === "SORT") {
    const cols: string[] = [];
    for (let i = 0; i < args.length; i += 2) {
      if (args[i]) cols.push(args[i]);
    }
    record["column"] = cols.join(",");
    const firstDir = args[1] || "ASC";
    record["ascending"] = firstDir === "DESC" ? "false" : "true";
  } else if (type === "LIMIT") {
    record["count"] = args[0] || "100";
    record["offset"] = "0";
  } else if (type === "SOURCE_RENAME") {
    record["oldAlias"] = args[0] || "";
    record["newAlias"] = args[1] || "";
  } else if (
    type.endsWith("_JOIN") ||
    type === "HASH_INNER_JOIN"
  ) {
    const pairs: string[] = [];
    for (let i = 0; i < args.length; i += 2) {
      if (args[i] && args[i + 1]) {
        pairs.push(`${args[i]} = ${args[i + 1]}`);
      }
    }
    record["predicate"] = pairs.join(",");
  } else {
    args.forEach((val, idx) => {
      record[String(idx)] = val;
    });
  }

  return record;
}
