"use client";

import React, { useState, useCallback, useRef } from "react";
import {
  ReactFlow,
  ReactFlowProvider,
  Controls,
  Background,
  addEdge,
  useNodesState,
  useEdgesState,
  Connection,
  Edge,
  Node as FlowNode,
  ReactFlowInstance,
  NodeTypes,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";

import { useCanvasStore, TableNodeData, generateNodeId } from "@/store/useCanvasStore";
import { useTablesStore, DBTable } from "@/store/useTablesStore";
import { serializeCanvasToQuery } from "@/lib/querySerializer";
import { api, QueryResult, ResultPage } from "@/lib/api";
import TableNode from "./canvas/TableNode";
import OperatorNode from "./canvas/OperatorNode";

const nodeTypes: NodeTypes = {
  tableNode: TableNode,
  operatorNode: OperatorNode,
};

function findRootNode(nodes: FlowNode[], edges: Edge[]): FlowNode | null {
  const sourceNodeIds = new Set(edges.map((e) => e.source));
  const rootNodes = nodes.filter((n) => !sourceNodeIds.has(n.id));
  return rootNodes.length > 0 ? rootNodes[0] : null;
}

export default function Comparator() {
  const mainCanvas = useCanvasStore();
  const { addTable } = useTablesStore();

  // Canvas 1 local state
  const [nodes1, setNodes1, onNodesChange1] = useNodesState<FlowNode>([]);
  const [edges1, setEdges1, onEdgesChange1] = useEdgesState<Edge>([]);
  const [rfInstance1, setRfInstance1] = useState<ReactFlowInstance | null>(null);
  const [dsl1, setDsl1] = useState("");
  const reactFlowWrapper1 = useRef<HTMLDivElement>(null);

  // Canvas 2 local state
  const [nodes2, setNodes2, onNodesChange2] = useNodesState<FlowNode>([]);
  const [edges2, setEdges2, onEdgesChange2] = useEdgesState<Edge>([]);
  const [rfInstance2, setRfInstance2] = useState<ReactFlowInstance | null>(null);
  const [dsl2, setDsl2] = useState("");
  const reactFlowWrapper2 = useRef<HTMLDivElement>(null);

  // Comparison execution states
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result1, setResult1] = useState<(QueryResult & ResultPage) | null>(null);
  const [result2, setResult2] = useState<(QueryResult & ResultPage) | null>(null);

  // ── Connection Event Handlers ──────────────────────────────────────────────
  const onConnect1 = useCallback(
    (params: Connection) => setEdges1((eds) => addEdge(params, eds)),
    [setEdges1]
  );
  const onConnect2 = useCallback(
    (params: Connection) => setEdges2((eds) => addEdge(params, eds)),
    [setEdges2]
  );

  // ── Drag and Drop Handlers ──────────────────────────────────────────────────
  const onDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "copy";
  }, []);

  const handleDrop = (
    e: React.DragEvent,
    wrapper: HTMLDivElement | null,
    rfInstance: ReactFlowInstance | null,
    setNodes: React.Dispatch<React.SetStateAction<FlowNode[]>>
  ) => {
    e.preventDefault();
    const tableJson = e.dataTransfer.getData("application/dbest-table");
    const operatorJson = e.dataTransfer.getData("application/dbest-operator");

    if (!wrapper || !rfInstance) return;

    const bounds = wrapper.getBoundingClientRect();
    const position = rfInstance.screenToFlowPosition({
      x: e.clientX - bounds.left,
      y: e.clientY - bounds.top,
    });

    if (tableJson) {
      const table: DBTable = JSON.parse(tableJson);
      const nodeData: TableNodeData = {
        label: table.name,
        tableId: table.id,
        tableName: table.name,
        tableType: table.type,
        columns: table.columns,
      };
      setNodes((prev) => [
        ...prev,
        {
          id: generateNodeId(),
          type: "tableNode",
          position,
          data: nodeData,
          dragHandle: ".react-flow__node",
        },
      ]);
    } else if (operatorJson) {
      const op = JSON.parse(operatorJson);
      setNodes((prev) => [
        ...prev,
        {
          id: generateNodeId(),
          type: "operatorNode",
          position,
          data: {
            label: op.displayName,
            operatorType: op.operatorType,
            displayName: op.displayName,
            arguments: [],
            isConfigured: false,
            hasError: false,
          },
        },
      ]);
    }
  };

  // ── Double Click Inline Configuration ───────────────────────────────────────
  const handleDoubleClick = (
    node: FlowNode,
    setNodes: React.Dispatch<React.SetStateAction<FlowNode[]>>
  ) => {
    if (node.type !== "operatorNode") return;
    const existing = (node.data.arguments as string[]) ?? [];
    const val = prompt(
      `Configure arguments for ${String(node.data.displayName)} (comma-separated):`,
      existing.join(", ")
    );
    if (val !== null) {
      const args = val
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean);
      setNodes((nds) =>
        nds.map((n) =>
          n.id === node.id
            ? { ...n, data: { ...n.data, arguments: args, isConfigured: args.length > 0 } }
            : n
        )
      );
    }
  };

  // ── Clone actions ──────────────────────────────────────────────────────────
  const cloneFromMain = (side: 1 | 2) => {
    const mainNodes = JSON.parse(JSON.stringify(mainCanvas.nodes));
    const mainEdges = JSON.parse(JSON.stringify(mainCanvas.edges));
    if (side === 1) {
      setNodes1(mainNodes);
      setEdges1(mainEdges);
    } else {
      setNodes2(mainNodes);
      setEdges2(mainEdges);
    }
  };

  // ── DSL Actions ────────────────────────────────────────────────────────────
  const syncFromCanvas = async (side: 1 | 2) => {
    const nodes = side === 1 ? nodes1 : nodes2;
    const edges = side === 1 ? edges1 : edges2;
    if (nodes.length === 0) return;
    const root = findRootNode(nodes, edges);
    if (!root) return;
    try {
      const graph = serializeCanvasToQuery(root.id, nodes, edges);
      const res = await api.dsl.generate(graph);
      if (side === 1) setDsl1(res.dslText);
      else setDsl2(res.dslText);
    } catch (e) {
      alert("Failed to generate DSL: " + (e instanceof Error ? e.message : String(e)));
    }
  };

  const parseDslText = async (side: 1 | 2) => {
    const text = side === 1 ? dsl1 : dsl2;
    if (!text.trim()) return;
    try {
      const res = await api.dsl.parse(text);
      res.importedTables.forEach((t) => {
        addTable({
          id: t.tableId,
          name: t.tableName,
          type: t.type,
          columns: t.columns.map((c) => c.name),
        });
      });
      if (side === 1) {
        setNodes1(res.graph.nodes);
        setEdges1(res.graph.edges);
      } else {
        setNodes2(res.graph.nodes);
        setEdges2(res.graph.edges);
      }
    } catch (e) {
      alert("Parse error: " + (e instanceof Error ? e.message : String(e)));
    }
  };

  // ── Execute Comparison ──────────────────────────────────────────────────────
  const handleCompare = async () => {
    setLoading(true);
    setError(null);
    setResult1(null);
    setResult2(null);

    const root1 = findRootNode(nodes1, edges1);
    const root2 = findRootNode(nodes2, edges2);

    if (!root1 || !root2) {
      setError("Please ensure both plans have a configured query tree and a valid root operator.");
      setLoading(false);
      return;
    }

    try {
      const graph1 = serializeCanvasToQuery(root1.id, nodes1, edges1);
      const graph2 = serializeCanvasToQuery(root2.id, nodes2, edges2);

      // Execute side-by-side
      const [res1, res2] = await Promise.all([
        api.query.execute({ ...graph1, page: 0, pageSize: 10 }),
        api.query.execute({ ...graph2, page: 0, pageSize: 10 }),
      ]);

      setResult1(res1);
      setResult2(res2);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Query execution failed.");
    } finally {
      setLoading(false);
    }
  };

  // Comparative helper message
  const getSpeedComparison = () => {
    if (!result1 || !result2) return null;
    const t1 = result1.executionTimeMs;
    const t2 = result2.executionTimeMs;
    if (t1 === t2) return "Both queries ran in exactly the same time.";
    if (t1 < t2) {
      const times = t2 / (t1 || 1);
      return `Plan A is ${times.toFixed(1)}x faster than Plan B (${t1}ms vs ${t2}ms).`;
    } else {
      const times = t1 / (t2 || 1);
      return `Plan B is ${times.toFixed(1)}x faster than Plan A (${t2}ms vs ${t1}ms).`;
    }
  };

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        height: "100%",
        width: "100%",
        background: "var(--bg-primary)",
        color: "var(--text-primary)",
        overflow: "hidden",
      }}
    >
      {/* Top action bar */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: "12px",
          padding: "8px 16px",
          background: "var(--bg-secondary)",
          borderBottom: "1px solid var(--border-subtle)",
          zIndex: 100,
        }}
      >
        <span style={{ fontSize: "14px", fontWeight: 700 }}>⚖️ Query Plan Comparator</span>
        <div style={{ flex: 1 }} />
        <button
          onClick={handleCompare}
          disabled={loading || nodes1.length === 0 || nodes2.length === 0}
          data-testid="compare-btn"
          style={{
            padding: "6px 20px",
            background: "var(--accent)",
            border: "none",
            borderRadius: "var(--radius-sm)",
            color: "#fff",
            fontSize: "12px",
            fontWeight: 700,
            cursor: "pointer",
            boxShadow: "var(--shadow-sm)",
            opacity: loading || nodes1.length === 0 || nodes2.length === 0 ? 0.6 : 1,
          }}
        >
          {loading ? "Comparing…" : "Compare Query Plans"}
        </button>
      </div>

      {/* Main split work area */}
      <div style={{ display: "flex", flex: 1, minHeight: 0 }}>
        {/* Left Side: Plan A */}
        <div
          style={{
            flex: 1,
            display: "flex",
            flexDirection: "column",
            borderRight: "1px solid var(--border-subtle)",
            minWidth: 0,
          }}
        >
          <div style={panelHeaderStyle}>
            <span style={{ fontWeight: 600 }}>Plan A</span>
            <div style={{ display: "flex", gap: "6px" }}>
              <button style={miniBtnStyle} onClick={() => cloneFromMain(1)}>
                📋 Clone Main
              </button>
              <button style={miniBtnStyle} onClick={() => syncFromCanvas(1)}>
                🔄 Sync DSL
              </button>
              <button style={miniBtnStyle} onClick={() => { setNodes1([]); setEdges1([]); }}>
                🗑️ Clear
              </button>
            </div>
          </div>

          <div
            ref={reactFlowWrapper1}
            onDragOver={onDragOver}
            onDrop={(e) => handleDrop(e, reactFlowWrapper1.current, rfInstance1, setNodes1)}
            data-testid="comparator-canvas-a"
            style={{ flex: 2, background: "var(--bg-tertiary)", position: "relative", minHeight: 200 }}
          >
            <ReactFlowProvider>
              <ReactFlow
                nodes={nodes1}
                edges={edges1}
                onNodesChange={onNodesChange1}
                onEdgesChange={onEdgesChange1}
                onConnect={onConnect1}
                nodeTypes={nodeTypes}
                onInit={setRfInstance1}
                onNodeDoubleClick={(_, n) => handleDoubleClick(n, setNodes1)}
                fitView
              >
                <Background color="var(--border-default)" gap={16} />
                <Controls />
              </ReactFlow>
            </ReactFlowProvider>
          </div>

          <div style={dslContainerStyle}>
            <div style={dslHeaderStyle}>
              <span>Plan A DSL Editor</span>
              <button style={miniBtnStyle} onClick={() => parseDslText(1)}>
                ▶ Parse DSL
              </button>
            </div>
            <textarea
              value={dsl1}
              onChange={(e) => setDsl1(e.target.value)}
              placeholder="import students.head; filter[age > 20](students);"
              style={textareaStyle}
            />
          </div>
        </div>

        {/* Right Side: Plan B */}
        <div style={{ flex: 1, display: "flex", flexDirection: "column", minWidth: 0 }}>
          <div style={panelHeaderStyle}>
            <span style={{ fontWeight: 600 }}>Plan B</span>
            <div style={{ display: "flex", gap: "6px" }}>
              <button style={miniBtnStyle} onClick={() => cloneFromMain(2)}>
                📋 Clone Main
              </button>
              <button style={miniBtnStyle} onClick={() => syncFromCanvas(2)}>
                🔄 Sync DSL
              </button>
              <button style={miniBtnStyle} onClick={() => { setNodes2([]); setEdges2([]); }}>
                🗑️ Clear
              </button>
            </div>
          </div>

          <div
            ref={reactFlowWrapper2}
            onDragOver={onDragOver}
            onDrop={(e) => handleDrop(e, reactFlowWrapper2.current, rfInstance2, setNodes2)}
            data-testid="comparator-canvas-b"
            style={{ flex: 2, background: "var(--bg-tertiary)", position: "relative", minHeight: 200 }}
          >
            <ReactFlowProvider>
              <ReactFlow
                nodes={nodes2}
                edges={edges2}
                onNodesChange={onNodesChange2}
                onEdgesChange={onEdgesChange2}
                onConnect={onConnect2}
                nodeTypes={nodeTypes}
                onInit={setRfInstance2}
                onNodeDoubleClick={(_, n) => handleDoubleClick(n, setNodes2)}
                fitView
              >
                <Background color="var(--border-default)" gap={16} />
                <Controls />
              </ReactFlow>
            </ReactFlowProvider>
          </div>

          <div style={dslContainerStyle}>
            <div style={dslHeaderStyle}>
              <span>Plan B DSL Editor</span>
              <button style={miniBtnStyle} onClick={() => parseDslText(2)}>
                ▶ Parse DSL
              </button>
            </div>
            <textarea
              value={dsl2}
              onChange={(e) => setDsl2(e.target.value)}
              placeholder="import students.head; filter[age > 20](students);"
              style={textareaStyle}
            />
          </div>
        </div>
      </div>

      {/* Comparison results drawer */}
      {(loading || error || result1 || result2) && (
        <div
          style={{
            height: "280px",
            borderTop: "1px solid var(--border-subtle)",
            background: "var(--bg-secondary)",
            display: "flex",
            flexDirection: "column",
            overflow: "hidden",
            boxSizing: "border-box",
            zIndex: 10,
          }}
        >
          <div
            style={{
              padding: "8px 16px",
              background: "var(--bg-tertiary)",
              borderBottom: "1px solid var(--border-subtle)",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
            }}
          >
            <span style={{ fontSize: "11px", fontWeight: 700, textTransform: "uppercase", color: "var(--text-secondary)" }}>
              Comparison Metrics & Results
            </span>
            <button
              onClick={() => {
                setResult1(null);
                setResult2(null);
                setError(null);
              }}
              style={{ background: "none", border: "none", cursor: "pointer", color: "var(--text-muted)", fontSize: "12px" }}
            >
              ✕ Close
            </button>
          </div>

          <div style={{ flex: 1, overflowY: "auto", padding: "16px" }}>
            {loading && (
              <div style={{ display: "flex", justifyContent: "center", padding: "40px", color: "var(--text-muted)" }}>
                ⏳ Executing queries on the backend server side-by-side…
              </div>
            )}

            {error && (
              <div style={{ color: "#dc2626", background: "#dc262612", border: "1px solid #dc262630", padding: "12px", borderRadius: "var(--radius-sm)" }}>
                ⚠️ Error: {error}
              </div>
            )}

            {!loading && !error && (result1 || result2) && (
              <div style={{ display: "flex", flexDirection: "column", gap: "16px", height: "100%" }}>
                {/* Speed indicator banner */}
                {getSpeedComparison() && (
                  <div
                    data-testid="speed-comparison-banner"
                    style={{
                      background: "var(--accent-dim)",
                      border: "1px solid var(--accent)",
                      borderRadius: "var(--radius-sm)",
                      padding: "10px 14px",
                      color: "var(--accent)",
                      fontWeight: 600,
                      fontSize: "13px",
                    }}
                  >
                    🏆 {getSpeedComparison()}
                  </div>
                )}

                {/* Side-by-side grid */}
                <div style={{ display: "flex", gap: "16px", flex: 1 }}>
                  {/* Results A */}
                  <div style={{ flex: 1, display: "flex", flexDirection: "column", minWidth: 0 }}>
                    <div data-testid="plan-a-stats" style={{ fontSize: "12px", fontWeight: 700, marginBottom: "6px" }}>
                      Plan A Stats: {result1 ? `${result1.executionTimeMs}ms · ${result1.totalRows} rows` : "No results"}
                    </div>
                    {result1 && renderResultPreview(result1)}
                  </div>

                  {/* Results B */}
                  <div style={{ flex: 1, display: "flex", flexDirection: "column", minWidth: 0 }}>
                    <div data-testid="plan-b-stats" style={{ fontSize: "12px", fontWeight: 700, marginBottom: "6px" }}>
                      Plan B Stats: {result2 ? `${result2.executionTimeMs}ms · ${result2.totalRows} rows` : "No results"}
                    </div>
                    {result2 && renderResultPreview(result2)}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function renderResultPreview(res: QueryResult & ResultPage) {
  if (res.rows.length === 0) {
    return <div style={{ fontSize: "11px", color: "var(--text-muted)" }}>Empty dataset returned.</div>;
  }
  return (
    <div style={{ flex: 1, overflow: "auto", border: "1px solid var(--border-default)", borderRadius: "var(--radius-sm)", background: "var(--bg-primary)" }}>
      <table data-testid="results-table" style={{ width: "100%", borderCollapse: "collapse", fontSize: "10px" }}>
        <thead>
          <tr style={{ background: "var(--bg-tertiary)", borderBottom: "1px solid var(--border-default)" }}>
            {res.columns.map((c) => (
              <th key={c} style={{ padding: "4px 8px", textAlign: "left", fontWeight: 700, borderRight: "1px solid var(--border-subtle)" }}>
                {c}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {res.rows.slice(0, 10).map((row, rIdx) => (
            <tr key={rIdx} style={{ borderBottom: "1px solid var(--border-subtle)", background: rIdx % 2 === 0 ? "transparent" : "var(--bg-tertiary)" }}>
              {res.columns.map((col) => (
                <td key={col} style={{ padding: "4px 8px", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", maxWidth: "120px", borderRight: "1px solid var(--border-subtle)" }}>
                  {row[col]}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

const panelHeaderStyle: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  padding: "6px 12px",
  background: "var(--bg-secondary)",
  borderBottom: "1px solid var(--border-subtle)",
};

const dslContainerStyle: React.CSSProperties = {
  height: "120px",
  borderTop: "1px solid var(--border-subtle)",
  display: "flex",
  flexDirection: "column",
};

const dslHeaderStyle: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  padding: "4px 12px",
  background: "var(--bg-tertiary)",
  borderBottom: "1px solid var(--border-subtle)",
  fontSize: "11px",
};

const miniBtnStyle: React.CSSProperties = {
  padding: "2px 6px",
  background: "transparent",
  border: "1px solid var(--border-default)",
  borderRadius: "var(--radius-sm)",
  color: "var(--text-secondary)",
  fontSize: "10px",
  cursor: "pointer",
};

const textareaStyle: React.CSSProperties = {
  flex: 1,
  background: "var(--bg-primary)",
  color: "var(--text-primary)",
  border: "none",
  outline: "none",
  resize: "none",
  fontFamily: "var(--font-mono, monospace)",
  fontSize: "11px",
  padding: "8px",
  lineHeight: 1.4,
};
