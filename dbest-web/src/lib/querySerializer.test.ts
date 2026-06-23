import { test } from "node:test";
import assert from "node:assert";
import { serializeCanvasToQuery } from "./querySerializer.ts";

test("serializeCanvasToQuery - serializes a simple Table node and Filter operator", () => {
  const nodes = [
    {
      id: "node_table_students",
      type: "tableNode",
      position: { x: 100, y: 100 },
      data: {
        label: "students",
        tableId: "csv_1",
        tableName: "students",
        tableType: "csv",
        columns: ["id", "name", "age"],
      },
    },
    {
      id: "node_filter",
      type: "operatorNode",
      position: { x: 100, y: 200 },
      data: {
        label: "Filter",
        operatorType: "FILTER",
        displayName: "Filter",
        arguments: ["age", ">", "20"],
        isConfigured: true,
      },
    },
  ];

  const edges = [
    {
      id: "edge_1",
      source: "node_table_students",
      target: "node_filter",
    },
  ];

  const graph = serializeCanvasToQuery("node_filter", nodes, edges);

  assert.strictEqual(graph.rootNodeId, "node_filter");
  assert.strictEqual(graph.nodes.length, 2);
  assert.strictEqual(graph.edges.length, 1);

  const tableNode = graph.nodes.find((n) => n.id === "node_table_students");
  assert.ok(tableNode);
  assert.strictEqual(tableNode.type, "table");
  assert.strictEqual(tableNode.tableId, "csv_1");
  assert.strictEqual(tableNode.tableName, "students");

  const filterNode = graph.nodes.find((n) => n.id === "node_filter");
  assert.ok(filterNode);
  assert.strictEqual(filterNode.type, "operator");
  assert.strictEqual(filterNode.operatorType, "FILTER");
  assert.deepStrictEqual(filterNode.arguments, { predicate: "age > 20" });
});

test("serializeCanvasToQuery - serializes LIMIT and SORT operators correctly", () => {
  const nodes = [
    {
      id: "node_table",
      type: "tableNode",
      data: { tableId: "csv_1", tableName: "students" },
    },
    {
      id: "node_sort",
      type: "operatorNode",
      data: {
        operatorType: "SORT",
        arguments: ["age", "DESC"],
      },
    },
    {
      id: "node_limit",
      type: "operatorNode",
      data: {
        operatorType: "LIMIT",
        arguments: ["10"],
      },
    },
  ];

  const edges = [
    { source: "node_table", target: "node_sort" },
    { source: "node_sort", target: "node_limit" },
  ];

  const graph = serializeCanvasToQuery("node_limit", nodes, edges);

  const sortNode = graph.nodes.find((n) => n.id === "node_sort");
  assert.ok(sortNode);
  assert.deepStrictEqual(sortNode.arguments, { column: "age", ascending: "false" });

  const limitNode = graph.nodes.find((n) => n.id === "node_limit");
  assert.ok(limitNode);
  assert.deepStrictEqual(limitNode.arguments, { count: "10", offset: "0" });
});

test("serializeCanvasToQuery - excludes nodes that are not connected upstream of root", () => {
  const nodes = [
    {
      id: "node_table_a",
      type: "tableNode",
      data: { tableId: "csv_1", tableName: "students" },
    },
    {
      id: "node_filter_a",
      type: "operatorNode",
      data: { operatorType: "FILTER", arguments: ["age", ">", "20"] },
    },
    {
      id: "node_table_unconnected",
      type: "tableNode",
      data: { tableId: "csv_2", tableName: "grades" },
    },
  ];

  const edges = [
    { source: "node_table_a", target: "node_filter_a" },
  ];

  const graph = serializeCanvasToQuery("node_filter_a", nodes, edges);

  assert.strictEqual(graph.nodes.length, 2);
  assert.ok(graph.nodes.some((n) => n.id === "node_table_a"));
  assert.ok(graph.nodes.some((n) => n.id === "node_filter_a"));
  assert.ok(!graph.nodes.some((n) => n.id === "node_table_unconnected"));
});
