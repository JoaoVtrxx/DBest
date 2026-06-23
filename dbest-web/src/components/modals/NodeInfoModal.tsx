"use client";

import React, { useState, useEffect } from "react";
import { Node as FlowNode } from "@xyflow/react";
import ModalBase from "./ModalBase";
import { useCanvasStore, TableNodeData, OperatorNodeData } from "@/store/useCanvasStore";
import { TABLE_TYPE_META } from "@/store/useTablesStore";
import { api, TableBackendInfo } from "@/lib/api";

interface NodeInfoModalProps {
  node: FlowNode;
  onClose: () => void;
}

export default function NodeInfoModal({ node, onClose }: NodeInfoModalProps) {
  const { nodes, edges } = useCanvasStore();

  const isTable = node.type === "tableNode";
  const data = node.data as Record<string, unknown>;

  // Get connected nodes
  const outgoing = edges
    .filter((e) => e.source === node.id)
    .map((e) => nodes.find((n) => n.id === e.target))
    .filter(Boolean) as FlowNode[];
  const incoming = edges
    .filter((e) => e.target === node.id)
    .map((e) => nodes.find((n) => n.id === e.source))
    .filter(Boolean) as FlowNode[];

  const tableData = isTable ? (node.data as TableNodeData) : null;
  const opData = !isTable ? (node.data as OperatorNodeData) : null;
  const meta = tableData ? TABLE_TYPE_META[tableData.tableType] : null;

  // Real table statistics from backend
  const [stats, setStats] = useState<TableBackendInfo | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isTable && tableData?.tableId) {
      setLoading(true);
      setError(null);
      api.tables
        .getInfo(tableData.tableId)
        .then((res) => {
          setStats(res);
        })
        .catch((err) => {
          console.error("Failed to fetch table info:", err);
          setError(err instanceof Error ? err.message : String(err));
        })
        .finally(() => {
          setLoading(false);
        });
    }
  }, [isTable, tableData?.tableId]);

  return (
    <ModalBase
      title="Node Information"
      subtitle={`Details and stats for ${String(data.label ?? node.id)}`}
      icon="ℹ️"
      accentColor="#64748b"
      onClose={onClose}
      width={460}
      footer={
        <div
          style={{
            padding: "12px 18px",
            borderTop: "1px solid var(--border-subtle)",
            display: "flex",
            justifyContent: "flex-end",
          }}
        >
          <button
            onClick={onClose}
            style={{
              padding: "6px 18px",
              background: "var(--bg-tertiary)",
              border: "1px solid var(--border-default)",
              borderRadius: "var(--radius-sm)",
              color: "var(--text-secondary)",
              fontSize: "12px",
              cursor: "pointer",
              fontFamily: "var(--font-sans)",
            }}
          >
            Close
          </button>
        </div>
      }
    >
      <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
        {/* Identity */}
        <InfoSection title="Identity">
          <InfoRow label="ID" value={node.id} mono />
          <InfoRow label="Type" value={isTable ? `Table` : `Operator`} />
          <InfoRow label="Name" value={String(data.label ?? "—")} />
          {opData && <InfoRow label="Operator" value={opData.operatorType} mono />}
          {meta && <InfoRow label="Format" value={meta.label} />}
        </InfoSection>

        {/* Real Backend Stats for Tables */}
        {isTable && (
          <InfoSection title="Table Statistics (Backend)">
            {loading && (
              <div style={{ fontSize: "11px", color: "var(--text-muted)", padding: "4px 0" }}>
                ⏳ Loading statistics from backend…
              </div>
            )}
            {error && (
              <div style={{ fontSize: "11px", color: "#dc2626", padding: "4px 0" }}>
                ⚠️ Failed to load statistics: {error}
              </div>
            )}
            {!loading && !error && stats && (
              <>
                <InfoRow label="Row Count" value={stats.rowCount.toLocaleString()} mono />
                <InfoRow label="File Path" value={stats.filePath ?? "In-Memory"} mono />
              </>
            )}
          </InfoSection>
        )}

        {/* Canvas Position */}
        <InfoSection title="Canvas Position">
          <InfoRow label="X" value={Math.round(node.position.x).toString()} mono />
          <InfoRow label="Y" value={Math.round(node.position.y).toString()} mono />
        </InfoSection>

        {/* Columns with data types if stats loaded, otherwise fallback to simple list */}
        {isTable && (
          <InfoSection title="Columns Schema">
            {stats && stats.columns.length > 0 ? (
              <div
                style={{
                  maxHeight: "150px",
                  overflowY: "auto",
                  border: "1px solid var(--border-default)",
                  borderRadius: "var(--radius-sm)",
                  background: "var(--bg-tertiary)",
                }}
              >
                <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "11px" }}>
                  <thead>
                    <tr style={{ background: "var(--bg-secondary)", borderBottom: "1px solid var(--border-default)" }}>
                      <th style={thStyle}>Column</th>
                      <th style={thStyle}>Type</th>
                      <th style={thStyle}>PK</th>
                    </tr>
                  </thead>
                  <tbody>
                    {stats.columns.map((c) => (
                      <tr key={c.name} style={{ borderBottom: "1px solid var(--border-subtle)" }}>
                        <td style={tdStyle}>{c.name}</td>
                        <td style={{ ...tdStyle, color: "var(--text-muted)", fontFamily: "var(--font-mono)" }}>
                          {c.dataType}
                        </td>
                        <td style={tdStyle}>{c.primaryKey ? "🔑 Yes" : "—"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : tableData?.columns && tableData.columns.length > 0 ? (
              <div style={{ display: "flex", flexWrap: "wrap", gap: "4px" }}>
                {tableData.columns.map((col) => (
                  <span
                    key={col}
                    style={{
                      background: "var(--bg-tertiary)",
                      border: "1px solid var(--border-default)",
                      borderRadius: "var(--radius-sm)",
                      padding: "2px 8px",
                      fontSize: "11px",
                      fontFamily: "var(--font-mono, monospace)",
                      color: "var(--text-secondary)",
                    }}
                  >
                    {col}
                  </span>
                ))}
              </div>
            ) : (
              <div style={{ fontSize: "11px", color: "var(--text-muted)", fontStyle: "italic" }}>
                No columns defined
              </div>
            )}
          </InfoSection>
        )}

        {/* Operator config */}
        {opData && opData.arguments.length > 0 && (
          <InfoSection title="Configuration">
            <div style={{ display: "flex", flexWrap: "wrap", gap: "4px" }}>
              {opData.arguments.map((arg, i) => (
                <span
                  key={i}
                  style={{
                    background: opData.isConfigured ? "#16a34a12" : "var(--bg-tertiary)",
                    border: `1px solid ${opData.isConfigured ? "#16a34a30" : "var(--border-default)"}`,
                    borderRadius: "var(--radius-sm)",
                    padding: "2px 8px",
                    fontSize: "11px",
                    fontFamily: "var(--font-mono, monospace)",
                    color: opData.isConfigured ? "#16a34a" : "var(--text-secondary)",
                  }}
                >
                  {arg}
                </span>
              ))}
            </div>
          </InfoSection>
        )}

        {/* Error */}
        {opData?.hasError && (
          <InfoSection title="Error">
            <div
              style={{
                background: "#dc262612",
                border: "1px solid #dc262630",
                borderRadius: "var(--radius-sm)",
                padding: "8px 12px",
                fontSize: "12px",
                color: "#dc2626",
              }}
            >
              {opData.errorMessage ?? "Unknown error"}
            </div>
          </InfoSection>
        )}

        {/* Connections */}
        <InfoSection title="Connections">
          <InfoRow
            label="Inputs"
            value={
              incoming.length === 0
                ? "None"
                : incoming.map((n) => String((n.data as Record<string, unknown>).label ?? n.id)).join(", ")
            }
          />
          <InfoRow
            label="Outputs"
            value={
              outgoing.length === 0
                ? "None"
                : outgoing.map((n) => String((n.data as Record<string, unknown>).label ?? n.id)).join(", ")
            }
          />
        </InfoSection>
      </div>
    </ModalBase>
  );
}

function InfoSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <div
        style={{
          fontSize: "10px",
          fontWeight: 700,
          color: "var(--text-muted)",
          textTransform: "uppercase",
          letterSpacing: "0.06em",
          marginBottom: "6px",
          paddingBottom: "4px",
          borderBottom: "1px solid var(--border-subtle)",
        }}
      >
        {title}
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: "3px" }}>{children}</div>
    </div>
  );
}

function InfoRow({ label, value, mono = false }: { label: string; value: string; mono?: boolean }) {
  return (
    <div style={{ display: "flex", gap: "8px", alignItems: "baseline" }}>
      <span style={{ fontSize: "11px", color: "var(--text-muted)", minWidth: "90px", flexShrink: 0 }}>
        {label}
      </span>
      <span
        style={{
          fontSize: "12px",
          color: "var(--text-primary)",
          fontFamily: mono ? "var(--font-mono, monospace)" : "var(--font-sans)",
          wordBreak: "break-all",
        }}
      >
        {value}
      </span>
    </div>
  );
}

const thStyle: React.CSSProperties = {
  padding: "4px 8px",
  textAlign: "left",
  fontWeight: 700,
  color: "var(--text-secondary)",
  borderRight: "1px solid var(--border-subtle)",
};

const tdStyle: React.CSSProperties = {
  padding: "4px 8px",
  borderRight: "1px solid var(--border-subtle)",
};
