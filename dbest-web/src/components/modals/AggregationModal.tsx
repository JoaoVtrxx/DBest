"use client";

import React, { useState } from "react";
import { Node as FlowNode } from "@xyflow/react";
import ModalBase, { StyledSelect, StyledInput } from "./ModalBase";
import { useColumnsBySide } from "@/hooks/useNodeInputColumns";
import { useCanvasStore } from "@/store/useCanvasStore";

const AGG_FUNCTIONS = ["COUNT", "SUM", "AVG", "MIN", "MAX", "COUNT_DISTINCT"];

interface AggRow {
  func: string;
  column: string;
  alias: string;
}

interface AggregationModalProps {
  node: FlowNode;
  onClose: () => void;
}

export default function AggregationModal({ node, onClose }: AggregationModalProps) {
  const { updateNodeData } = useCanvasStore();
  const { allNames } = useColumnsBySide(node.id);

  const existing = (node.data as Record<string, unknown>).arguments as string[] | undefined;
  const parseExisting = (): AggRow[] => {
    if (!existing || existing.length === 0) return [{ func: "COUNT", column: "*", alias: "" }];
    const rows: AggRow[] = [];
    for (let i = 0; i < existing.length; i += 3) {
      rows.push({ func: existing[i] ?? "COUNT", column: existing[i + 1] ?? "*", alias: existing[i + 2] ?? "" });
    }
    return rows;
  };

  const [rows, setRows] = useState<AggRow[]>(parseExisting);

  const updateRow = (i: number, patch: Partial<AggRow>) =>
    setRows((prev) => prev.map((r, idx) => (idx === i ? { ...r, ...patch } : r)));
  const addRow = () => setRows((prev) => [...prev, { func: "COUNT", column: "*", alias: "" }]);
  const removeRow = (i: number) => setRows((prev) => prev.filter((_, idx) => idx !== i));

  const handleConfirm = () => {
    const args = rows.flatMap((r) => [r.func, r.column, r.alias]);
    updateNodeData(node.id, { arguments: args, isConfigured: args.length > 0 });
    onClose();
  };

  return (
    <ModalBase
      title="Aggregation"
      subtitle="Define aggregate functions to apply"
      icon="Σ"
      accentColor="#8b5cf6"
      onClose={onClose}
      onConfirm={handleConfirm}
      confirmLabel="Apply"
      width={560}
    >
      <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
        <div style={{ display: "grid", gridTemplateColumns: "110px 1fr 1fr 30px", gap: "8px", paddingBottom: "4px", borderBottom: "1px solid var(--border-subtle)" }}>
          {["Function", "Column", "Alias (optional)", ""].map((h) => (
            <span key={h} style={{ fontSize: "10px", fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.05em" }}>{h}</span>
          ))}
        </div>

        {rows.map((row, i) => (
          <div key={i} style={{ display: "grid", gridTemplateColumns: "110px 1fr 1fr 30px", gap: "8px", alignItems: "center" }}>
            <StyledSelect value={row.func} onChange={(v) => updateRow(i, { func: v })}>
              {AGG_FUNCTIONS.map((f) => <option key={f} value={f}>{f}</option>)}
            </StyledSelect>
            <StyledSelect value={row.column} onChange={(v) => updateRow(i, { column: v })}>
              <option value="*">* (all)</option>
              {allNames.map((c) => <option key={c} value={c}>{c}</option>)}
            </StyledSelect>
            <StyledInput value={row.alias} onChange={(v) => updateRow(i, { alias: v })} placeholder={`${row.func.toLowerCase()}_result`} />
            <button
              onClick={() => removeRow(i)}
              disabled={rows.length === 1}
              style={{
                width: 28, height: 28, borderRadius: "var(--radius-sm)",
                border: "1px solid var(--border-default)", background: "transparent",
                color: "var(--color-error)", cursor: rows.length === 1 ? "not-allowed" : "pointer",
                fontSize: "13px", opacity: rows.length === 1 ? 0.3 : 1,
              }}
            >✕</button>
          </div>
        ))}

        <button
          onClick={addRow}
          style={{
            padding: "6px", borderRadius: "var(--radius-sm)",
            border: "1px dashed var(--border-default)", background: "transparent",
            color: "var(--accent)", fontSize: "11px", cursor: "pointer",
            fontFamily: "var(--font-sans)", width: "100%",
            transition: "all var(--transition-fast)",
          }}
          onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.background = "var(--accent-dim)"; }}
          onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.background = "transparent"; }}
        >
          + Add aggregation
        </button>

        {/* Preview */}
        <div style={{ background: "var(--bg-tertiary)", borderRadius: "var(--radius-md)", padding: "8px 12px", fontSize: "11px" }}>
          <code style={{ color: "var(--text-secondary)", fontFamily: "var(--font-mono, monospace)" }}>
            SELECT {rows.map((r) => `${r.func}(${r.column})${r.alias ? ` AS ${r.alias}` : ""}`).join(", ")}
          </code>
        </div>
      </div>
    </ModalBase>
  );
}
