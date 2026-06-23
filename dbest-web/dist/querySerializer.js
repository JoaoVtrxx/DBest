"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.serializeCanvasToQuery = serializeCanvasToQuery;
/**
 * Converts the React Flow canvas state into the JSON graph format
 * that the Spring Boot backend expects for query execution.
 *
 * The `rootNodeId` is the node the user clicked "Run Query" on —
 * the backend will traverse from this node downward to collect
 * all its source nodes recursively.
 */
function serializeCanvasToQuery(rootNodeId, nodes, edges) {
    // Collect all nodes reachable upstream from rootNodeId
    const visited = new Set();
    const queue = [rootNodeId];
    while (queue.length > 0) {
        const current = queue.shift();
        if (visited.has(current))
            continue;
        visited.add(current);
        // Follow incoming edges (sources feed into current)
        const incomingSourceIds = edges
            .filter((e) => e.target === current)
            .map((e) => e.source);
        queue.push(...incomingSourceIds);
    }
    // Build graph nodes for visited nodes only
    const graphNodes = nodes
        .filter((n) => visited.has(n.id))
        .map((n) => {
        if (n.type === "tableNode") {
            const d = n.data;
            return {
                id: n.id,
                type: "table",
                tableId: d.tableId,
                tableName: d.tableName,
            };
        }
        else {
            const d = n.data;
            return {
                id: n.id,
                type: "operator",
                operatorType: d.operatorType,
                arguments: mapArgumentsToRecord(d.operatorType, d.arguments),
            };
        }
    });
    // Build edges for visited subgraph only
    const graphEdges = edges
        .filter((e) => visited.has(e.source) && visited.has(e.target))
        .map((e) => ({ source: e.source, target: e.target }));
    return {
        rootNodeId,
        nodes: graphNodes,
        edges: graphEdges,
    };
}
function mapArgumentsToRecord(operatorType, args) {
    const record = {};
    if (!args || args.length === 0)
        return record;
    const type = operatorType.toUpperCase();
    if (type === "FILTER") {
        const left = args[0] || "";
        let op = args[1] || "";
        const right = args[2] || "";
        if (op === "≠")
            op = "!=";
        if (op === "≤")
            op = "<=";
        if (op === "≥")
            op = ">=";
        record["predicate"] = (left + " " + op + " " + right).trim();
    }
    else if (type === "PROJECTION") {
        record["columns"] = args.join(",");
    }
    else if (type === "SORT") {
        const cols = [];
        for (let i = 0; i < args.length; i += 2) {
            if (args[i])
                cols.push(args[i]);
        }
        record["column"] = cols.join(",");
        const firstDir = args[1] || "ASC";
        record["ascending"] = firstDir === "DESC" ? "false" : "true";
    }
    else if (type === "LIMIT") {
        record["count"] = args[0] || "100";
        record["offset"] = "0";
    }
    else if (type === "SOURCE_RENAME") {
        record["oldAlias"] = args[0] || "";
        record["newAlias"] = args[1] || "";
    }
    else if (type.endsWith("_JOIN") ||
        type === "HASH_INNER_JOIN") {
        const pairs = [];
        for (let i = 0; i < args.length; i += 2) {
            if (args[i] && args[i + 1]) {
                pairs.push(`${args[i]} = ${args[i + 1]}`);
            }
        }
        record["predicate"] = pairs.join(",");
    }
    else {
        args.forEach((val, idx) => {
            record[String(idx)] = val;
        });
    }
    return record;
}
