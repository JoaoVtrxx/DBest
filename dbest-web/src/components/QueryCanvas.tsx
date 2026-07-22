"use client";

import React, { useCallback, useRef, useState } from "react";
import {
  ReactFlow,
  ReactFlowProvider,
  Controls,
  Background,
  BackgroundVariant,
  MiniMap,
  NodeTypes,
  ReactFlowInstance,
  Node as FlowNode,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";

import { useCanvasStore, TableNodeData, generateNodeId } from "@/store/useCanvasStore";
import { useModalsStore } from "@/store/useModalsStore";
import { DBTable } from "@/store/useTablesStore";
import { serializeCanvasToQuery } from "@/lib/querySerializer";
import TableNode from "./canvas/TableNode";
import OperatorNode from "./canvas/OperatorNode";
import NodeContextMenu from "./canvas/NodeContextMenu";

// Register custom node types
const nodeTypes: NodeTypes = {
  tableNode: TableNode,
  operatorNode: OperatorNode,
};

interface ContextMenuState {
  x: number;
  y: number;
  node: FlowNode;
}

export default function QueryCanvas() {
  const {
    nodes, edges,
    onNodesChange, onEdgesChange, onConnect,
    addNode, removeNode, markNode, redistributeNodes,
  } = useCanvasStore();

  const { openEdit, openDataViewer, openNodeInfo, openExport } = useModalsStore();

  const reactFlowWrapper = useRef<HTMLDivElement>(null);
  const [rfInstance, setRfInstance] = useState<ReactFlowInstance | null>(null);
  const [contextMenu, setContextMenu] = useState<ContextMenuState | null>(null);

  // ── Drop from SidebarLeft (table) ──────────────────────────────────────────
  const onDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "copy";
  }, []);

  const onDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      const tableJson = e.dataTransfer.getData("application/dbest-table");
      const operatorJson = e.dataTransfer.getData("application/dbest-operator");

      if (!reactFlowWrapper.current || !rfInstance) return;

      const bounds = reactFlowWrapper.current.getBoundingClientRect();
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
        addNode({
          id: generateNodeId(),
          type: "tableNode",
          position,
          data: nodeData,
          dragHandle: ".react-flow__node",
        });
      } else if (operatorJson) {
        const op = JSON.parse(operatorJson);
        addNode({
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
        });
      }
    },
    [rfInstance, addNode]
  );

  // ── Node context menu ───────────────────────────────────────────────────────
  const onNodeContextMenu = useCallback(
    (e: React.MouseEvent, node: FlowNode) => {
      e.preventDefault();
      setContextMenu({ x: e.clientX, y: e.clientY, node });
    },
    []
  );

  const onPaneClick = useCallback(() => {
    setContextMenu(null);
  }, []);

  // ── Double-click to open edit modal ────────────────────────────────────────
  const onNodeDoubleClick = useCallback(
    (_e: React.MouseEvent, node: FlowNode) => {
      if (node.type === "operatorNode") openEdit(node);
      else if (node.type === "tableNode") {
        const d = node.data as Record<string, unknown>;
        openDataViewer(node, { tableId: d.tableId as string | undefined });
      }
    },
    [openEdit, openDataViewer]
  );

  // ── Key handler for Delete key ──────────────────────────────────────────────
  const onKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === "Delete" || e.key === "Backspace") {
        const selected = nodes.filter((n) => n.selected);
        selected.forEach((n) => removeNode(n.id));
      }
    },
    [nodes, removeNode]
  );

  return (
    <ReactFlowProvider>
    <div
      ref={reactFlowWrapper}
      style={{ width: "100%", height: "100%", position: "relative" }}
      onKeyDown={onKeyDown}
      tabIndex={0}
      data-testid="query-canvas"
    >
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        onInit={setRfInstance}
        onDragOver={onDragOver}
        onDrop={onDrop}
        onNodeContextMenu={onNodeContextMenu}
        onNodeDoubleClick={onNodeDoubleClick}
        onPaneClick={onPaneClick}
        nodeTypes={nodeTypes}
        fitView
        snapToGrid
        snapGrid={[16, 16]}
        deleteKeyCode={null}          // handled manually
        multiSelectionKeyCode="Shift"
        defaultEdgeOptions={{
          style: { stroke: "#94a3b8", strokeWidth: 2 },
          animated: false,
        }}
        connectionLineStyle={{ stroke: "#3b82f6", strokeWidth: 2, strokeDasharray: "6 3" }}
        style={{ background: "var(--bg-primary)" }}
      >
        {/* Controls (zoom, fit) */}
        <Controls
          style={{
            background: "var(--bg-elevated)",
            border: "1px solid var(--border-default)",
            borderRadius: "var(--radius-md)",
            boxShadow: "var(--shadow-sm)",
          }}
        />

        {/* Background dots */}
        <Background
          variant={BackgroundVariant.Dots}
          gap={24}
          size={1.5}
          color="var(--border-default)"
        />

        {/* Mini-map */}
        <MiniMap
          nodeColor={(n) => {
            if (n.type === "tableNode") {
              const d = n.data as TableNodeData;
              const colors: Record<string, string> = {
                csv: "#16a34a", fyi: "#ca8a04", xml: "#db2777",
                memory: "#2563eb",
              };
              return colors[d.tableType] ?? "#94a3b8";
            }
            return "#64748b";
          }}
          style={{
            background: "var(--bg-secondary)",
            border: "1px solid var(--border-default)",
            borderRadius: "var(--radius-md)",
          }}
          maskColor="rgba(0,0,0,0.05)"
        />

        {/* Empty state overlay */}
        {nodes.length === 0 && (
          <div
            style={{
              position: "absolute",
              inset: 0,
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              pointerEvents: "none",
              userSelect: "none",
              gap: "10px",
            }}
          >
            <div style={{ fontSize: "42px", opacity: 0.15 }}>🔷</div>
            <p style={{ color: "var(--text-muted)", fontSize: "13px", fontWeight: 500 }}>
              Query Canvas
            </p>
            <p style={{ color: "var(--text-disabled)", fontSize: "11px", maxWidth: 280, textAlign: "center", lineHeight: 1.7 }}>
              Drag tables from the left panel or operators from the right panel to start building your query
            </p>
          </div>
        )}
      </ReactFlow>

      {/* Node context menu */}
      {contextMenu && (
        <NodeContextMenu
          x={contextMenu.x}
          y={contextMenu.y}
          node={contextMenu.node}
          onClose={() => setContextMenu(null)}
          onRunQuery={(n) => {
              const d = n.data as Record<string, unknown>;
              if (n.type === "tableNode") {
                // Simple scan
                openDataViewer(n, { tableId: d.tableId as string | undefined });
              } else {
                // Operator node — serialize the subgraph and execute it
                const graphData = serializeCanvasToQuery(n.id, nodes, edges);
                openDataViewer(n, { graphData });
              }
              setContextMenu(null);
            }}
          onEdit={(n) => { openEdit(n); setContextMenu(null); }}
          onInfo={(n) => { openNodeInfo(n); setContextMenu(null); }}
          onRename={(n) => {
              // Dispatch a custom event on the node DOM element to trigger inline rename
              const el = document.querySelector(`[data-id="${n.id}"]`);
              if (el) el.dispatchEvent(new Event("dbest:rename", { bubbles: false }));
              setContextMenu(null);
            }}
          onMark={(n, marked) => markNode(n.id, marked)}
          onRemove={(n) => removeNode(n.id)}
          onExportTable={(n) => { openExport(n); setContextMenu(null); }}
          onRedistribute={(n) => { redistributeNodes(n.id); setContextMenu(null); }}
        />
      )}
    </div>
    </ReactFlowProvider>
  );
}
