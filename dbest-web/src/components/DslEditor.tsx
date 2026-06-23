"use client";

import React, { useState } from "react";
import { api } from "@/lib/api";
import { useCanvasStore } from "@/store/useCanvasStore";
import { useTablesStore } from "@/store/useTablesStore";
import { serializeCanvasToQuery } from "@/lib/querySerializer";
import { findRootNode } from "@/lib/autoLayout";

interface DslEditorProps {
  mode: "console" | "text_editor";
}

export default function DslEditor({ mode }: DslEditorProps) {
  const { nodes, edges, loadSession } = useCanvasStore();
  const { addTable } = useTablesStore();

  const [dslText, setDslText] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  // Auto-generate DSL if the canvas changes and the editor was empty or we want to sync
  const handleSyncFromCanvas = async () => {
    if (nodes.length === 0) {
      setDslText("");
      return;
    }
    try {
      const rootId = findRootNode(nodes, edges);
      if (!rootId) return;
      const graph = serializeCanvasToQuery(rootId, nodes, edges);
      const res = await api.dsl.generate(graph);
      setDslText(res.dslText);
      setError(null);
    } catch (e) {
      console.warn("Failed to generate DSL from canvas:", e);
    }
  };

  const handleRun = async () => {
    if (!dslText.trim()) return;
    setLoading(true);
    setError(null);
    setSuccessMsg(null);
    try {
      const res = await api.dsl.parse(dslText);
      
      // 1. Import any new tables returned from parse
      res.importedTables.forEach((t) => {
        addTable({
          id: t.tableId,
          name: t.tableName,
          type: t.type,
          columns: t.columns.map((c) => c.name),
        });
      });

      // 2. Load the nodes and edges onto the canvas
      loadSession(res.graph.nodes, res.graph.edges);

      setSuccessMsg("Query plan parsed and loaded successfully!");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to parse DSL query");
    } finally {
      setLoading(false);
    }
  };

  const handleSave = () => {
    const blob = new Blob([dslText], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "query_plan.txt";
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        height: "100%",
        width: "100%",
        background: "var(--bg-secondary)",
        boxSizing: "border-box",
      }}
    >
      {/* Toolbar */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: "8px",
          padding: "6px 12px",
          borderBottom: "1px solid var(--border-subtle)",
          flexShrink: 0,
          background: "var(--bg-tertiary)",
        }}
      >
        <span style={{ fontSize: "11px", fontWeight: 700, color: "var(--text-secondary)" }}>
          {mode === "console" ? "💻 DSL Console" : "📝 DSL Text Editor"}
        </span>

        <div style={{ flex: 1 }} />

        <button
          onClick={handleSyncFromCanvas}
          title="Convert current canvas nodes into DSL"
          style={btnStyle}
        >
          🔄 Sync from Canvas
        </button>

        <button
          onClick={handleSave}
          disabled={!dslText.trim()}
          style={{ ...btnStyle, opacity: dslText.trim() ? 1 : 0.5 }}
        >
          💾 Save to file (.txt)
        </button>

        <button
          onClick={handleRun}
          disabled={loading || !dslText.trim()}
          style={{
            ...btnStyle,
            background: "var(--accent)",
            color: "#fff",
            border: "none",
            opacity: loading || !dslText.trim() ? 0.6 : 1,
            fontWeight: 700,
          }}
        >
          {loading ? "Running…" : "▶ Run Query"}
        </button>
      </div>

      {/* Editor Body */}
      <div style={{ display: "flex", flex: 1, minHeight: 0, position: "relative" }}>
        <textarea
          value={dslText}
          onChange={(e) => setDslText(e.target.value)}
          placeholder={`import C:\\data\\students.head;\n\nfilter[age > 18](students)<100,200>;`}
          style={{
            flex: 1,
            border: "none",
            outline: "none",
            resize: "none",
            background: "var(--bg-secondary)",
            color: "var(--text-primary)",
            fontFamily: "var(--font-mono, monospace)",
            fontSize: "12px",
            lineHeight: 1.6,
            padding: "12px",
            boxSizing: "border-box",
          }}
        />

        {/* Status Messages */}
        {(error || successMsg) && (
          <div
            style={{
              position: "absolute",
              bottom: "12px",
              right: "12px",
              maxWidth: "380px",
              borderRadius: "var(--radius-sm)",
              padding: "8px 12px",
              fontSize: "11px",
              boxShadow: "var(--shadow-md)",
              zIndex: 10,
              animation: "fadeIn 0.2s ease forwards",
              border: "1px solid",
              background: error ? "#fef2f2" : "#f0fdf4",
              borderColor: error ? "#fee2e2" : "#dcfce7",
              color: error ? "#991b1b" : "#166534",
            }}
          >
            <div style={{ display: "flex", gap: "6px", alignItems: "flex-start" }}>
              <span>{error ? "⚠️" : "✅"}</span>
              <div style={{ whiteSpace: "pre-wrap" }}>{error || successMsg}</div>
              <button
                onClick={() => {
                  setError(null);
                  setSuccessMsg(null);
                }}
                style={{
                  background: "none",
                  border: "none",
                  cursor: "pointer",
                  color: "inherit",
                  marginLeft: "auto",
                  padding: 0,
                  fontSize: "12px",
                }}
              >
                ✕
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

const btnStyle: React.CSSProperties = {
  padding: "4px 10px",
  background: "transparent",
  border: "1px solid var(--border-default)",
  borderRadius: "var(--radius-sm)",
  color: "var(--text-secondary)",
  fontSize: "11px",
  cursor: "pointer",
  fontFamily: "var(--font-sans)",
  transition: "all var(--transition-fast)",
};
