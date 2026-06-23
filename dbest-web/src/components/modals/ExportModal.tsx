"use client";

import React, { useState } from "react";
import { Node as FlowNode } from "@xyflow/react";
import ModalBase, { FieldGroup, StyledInput } from "./ModalBase";
import { useCanvasStore } from "@/store/useCanvasStore";
import { useTablesStore } from "@/store/useTablesStore";
import { serializeCanvasToQuery } from "@/lib/querySerializer";
import { api } from "@/lib/api";
import { getOutColumns } from "@/hooks/useNodeInputColumns";

interface ExportModalProps {
  node: FlowNode;
  onClose: () => void;
}

type ExportType = "csv" | "sql" | "fyi";

export default function ExportModal({ node, onClose }: ExportModalProps) {
  const { nodes, edges } = useCanvasStore();
  const { addTable } = useTablesStore();

  const data = node.data as Record<string, unknown>;
  const defaultName = String(data.label ?? data.tableName ?? "exported_table")
    .toLowerCase()
    .replace(/[^a-z0-9_]/g, "_");

  const [exportType, setExportType] = useState<ExportType>("csv");
  const [tableName, setTableName] = useState(defaultName);
  
  // FYI specific settings
  const [outputFilePath, setOutputFilePath] = useState("");
  const [unique, setUnique] = useState(false);

  // PK Columns selection
  const [primaryKeys, setPrimaryKeys] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Recursively fetch all columns flowing into this node
  const availableColumns = React.useMemo(() => {
    return getOutColumns(node.id, nodes, edges);
  }, [node.id, nodes, edges]);

  const togglePK = (col: string) => {
    setPrimaryKeys((prev) =>
      prev.includes(col) ? prev.filter((c) => c !== col) : [...prev, col]
    );
  };

  const handleExport = async () => {
    setLoading(true);
    setError(null);
    setSuccessMsg(null);

    try {
      const graph = serializeCanvasToQuery(node.id, nodes, edges);
      const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8080/api";

      if (exportType === "csv") {
        const response = await fetch(`${API_BASE}/export/csv`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ ...graph, tableName }),
        });
        if (!response.ok) {
          const errText = await response.text();
          throw new Error(errText || "Export to CSV failed");
        }
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `${tableName}.csv`;
        document.body.appendChild(a);
        a.click();
        a.remove();
        window.URL.revokeObjectURL(url);
        onClose();
      } else if (exportType === "sql") {
        const response = await fetch(`${API_BASE}/export/sql`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ ...graph, tableName, primaryKeys }),
        });
        if (!response.ok) {
          const errText = await response.text();
          throw new Error(errText || "Export to SQL failed");
        }
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `${tableName}.sql`;
        document.body.appendChild(a);
        a.click();
        a.remove();
        window.URL.revokeObjectURL(url);
        onClose();
      } else if (exportType === "fyi") {
        if (!outputFilePath.trim()) {
          throw new Error("Output file path is required for FYI export.");
        }
        if (primaryKeys.length === 0) {
          throw new Error("At least one Primary Key column must be selected for FYI export.");
        }
        // FYI Export returns JSON TableSchema
        const schema = await api.export.fyi(
          graph,
          tableName,
          primaryKeys,
          outputFilePath.trim(),
          unique
        );
        addTable({
          id: schema.tableId,
          name: schema.tableName,
          type: "fyi",
          columns: schema.columns.map((c) => c.name),
        });
        setSuccessMsg(`BTree index exported and registered successfully! Path: ${outputFilePath}`);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "An error occurred during export");
    } finally {
      setLoading(false);
    }
  };

  return (
    <ModalBase
      title="Export Table / Operator"
      subtitle={`Export contents of node: ${String(data.label ?? node.id)}`}
      icon="📤"
      accentColor="#10b981"
      onClose={onClose}
      onConfirm={successMsg ? onClose : handleExport}
      confirmLabel={successMsg ? "Done" : loading ? "Exporting…" : "Export"}
      confirmDisabled={loading}
      width={520}
    >
      <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
        {error && (
          <div style={{ background: "#dc262612", border: "1px solid #dc262630", borderRadius: "var(--radius-sm)", padding: "10px 12px", fontSize: "12px", color: "#dc2626" }}>
            ⚠️ {error}
          </div>
        )}

        {successMsg && (
          <div style={{ background: "#10b98112", border: "1px solid #10b98130", borderRadius: "var(--radius-sm)", padding: "12px 14px", fontSize: "12px", color: "#10b981" }}>
            ✅ {successMsg}
          </div>
        )}

        {!successMsg && (
          <>
            {/* Format Selection */}
            <FieldGroup label="Export Format">
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "10px" }}>
                {(["csv", "sql", "fyi"] as ExportType[]).map((type) => {
                  const isActive = exportType === type;
                  return (
                    <button
                      key={type}
                      type="button"
                      onClick={() => setExportType(type)}
                      style={{
                        padding: "10px",
                        borderRadius: "var(--radius-md)",
                        border: `1px solid ${isActive ? "var(--accent)" : "var(--border-default)"}`,
                        background: isActive ? "var(--accent-dim)" : "var(--bg-tertiary)",
                        color: isActive ? "var(--accent)" : "var(--text-secondary)",
                        cursor: "pointer",
                        fontWeight: 600,
                        fontSize: "12px",
                        textAlign: "center",
                        transition: "all var(--transition-fast)",
                      }}
                    >
                      {type === "csv" && "CSV (Download)"}
                      {type === "sql" && "SQL (Download)"}
                      {type === "fyi" && "BTree Index (.dat)"}
                    </button>
                  );
                })}
              </div>
            </FieldGroup>

            {/* Target Table Name */}
            <FieldGroup label="Table Name">
              <StyledInput value={tableName} onChange={setTableName} placeholder="e.g. users_filtered" />
            </FieldGroup>

            {/* FYI file path destination */}
            {exportType === "fyi" && (
              <FieldGroup label="Output File Path (on Server)">
                <StyledInput
                  value={outputFilePath}
                  onChange={setOutputFilePath}
                  placeholder="e.g. C:\data\users_filtered.dat"
                />
                <p style={{ fontSize: "10px", color: "var(--text-muted)", marginTop: "4px" }}>
                  The directory must be writable by the DBest server. The .head file will be automatically created alongside the .dat.
                </p>
              </FieldGroup>
            )}

            {/* Primary Key Columns selection for SQL and FYI */}
            {exportType !== "csv" && (
              <FieldGroup label="Select Primary Key Column(s)">
                {availableColumns.length === 0 ? (
                  <div style={{ fontSize: "11px", color: "var(--text-muted)", fontStyle: "italic" }}>
                    No source columns detected.
                  </div>
                ) : (
                  <div
                    style={{
                      maxHeight: "120px",
                      overflowY: "auto",
                      border: "1px solid var(--border-default)",
                      borderRadius: "var(--radius-sm)",
                      padding: "8px",
                      background: "var(--bg-tertiary)",
                      display: "flex",
                      flexDirection: "column",
                      gap: "6px",
                    }}
                  >
                    {availableColumns.map((col) => {
                      const isChecked = primaryKeys.includes(col);
                      return (
                        <label
                          key={col}
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: "8px",
                            fontSize: "12px",
                            color: "var(--text-primary)",
                            cursor: "pointer",
                            fontFamily: "var(--font-mono)",
                          }}
                        >
                          <input
                            type="checkbox"
                            checked={isChecked}
                            onChange={() => togglePK(col)}
                            style={{ cursor: "pointer" }}
                          />
                          {col}
                        </label>
                      );
                    })}
                  </div>
                )}
              </FieldGroup>
            )}

            {/* Unique Key checkbox for FYI */}
            {exportType === "fyi" && (
              <label
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "8px",
                  fontSize: "12px",
                  color: "var(--text-primary)",
                  cursor: "pointer",
                  marginTop: "-8px",
                  marginBottom: "8px",
                }}
              >
                <input
                  type="checkbox"
                  checked={unique}
                  onChange={(e) => setUnique(e.target.checked)}
                />
                Primary Key is Unique
              </label>
            )}
          </>
        )}
      </div>
    </ModalBase>
  );
}
