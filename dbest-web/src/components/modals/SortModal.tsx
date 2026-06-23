"use client";

import React, { useState } from "react";
import { Node as FlowNode } from "@xyflow/react";
import ModalBase, { StyledSelect } from "./ModalBase";
import { useColumnsBySide } from "@/hooks/useNodeInputColumns";
import { useCanvasStore } from "@/store/useCanvasStore";

interface SortCriteria {
  column: string;
  direction: "ASC" | "DESC";
}

interface SortModalProps {
  node: FlowNode;
  onClose: () => void;
}

export default function SortModal({ node, onClose }: SortModalProps) {
  const { updateNodeData } = useCanvasStore();
  const { allNames } = useColumnsBySide(node.id);

  const existing = (node.data as Record<string, unknown>).arguments as string[] | undefined;
  const parseExisting = (): SortCriteria[] => {
    if (!existing || existing.length === 0) return [{ column: "", direction: "ASC" }];
    const rows: SortCriteria[] = [];
    for (let i = 0; i < existing.length; i += 2) {
      rows.push({ column: existing[i], direction: (existing[i + 1] as "ASC" | "DESC") ?? "ASC" });
    }
    return rows;
  };

  const [criteria, setCriteria] = useState<SortCriteria[]>(parseExisting);

  const updateRow = (i: number, patch: Partial<SortCriteria>) =>
    setCriteria((prev) => prev.map((r, idx) => (idx === i ? { ...r, ...patch } : r)));

  const addRow = () => setCriteria((prev) => [...prev, { column: "", direction: "ASC" }]);

  const removeRow = (i: number) =>
    setCriteria((prev) => prev.filter((_, idx) => idx !== i));

  const handleConfirm = () => {
    const valid = criteria.filter((c) => c.column.trim() !== "");
    const args = valid.flatMap((c) => [c.column, c.direction]);
    updateNodeData(node.id, { arguments: args, isConfigured: args.length > 0 });
    onClose();
  };

  const isValid = criteria.some((c) => c.column.trim() !== "");

  return (
    <ModalBase
      title="Sort"
      subtitle="Define sort order by one or more columns"
      icon="⇅"
      accentColor="#6366f1"
      onClose={onClose}
      onConfirm={handleConfirm}
      confirmLabel="Apply Sort"
      confirmDisabled={!isValid}
    >
      <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
        {/* Header row */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 100px 32px", gap: "8px", paddingBottom: "4px", borderBottom: "1px solid var(--border-subtle)" }}>
          <span style={{ fontSize: "10px", fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.05em" }}>Column</span>
          <span style={{ fontSize: "10px", fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.05em" }}>Direction</span>
          <span />
        </div>

        {criteria.map((row, i) => (
          <div key={i} style={{ display: "grid", gridTemplateColumns: "1fr 100px 32px", gap: "8px", alignItems: "center" }}>
            <StyledSelect value={row.column} onChange={(v) => updateRow(i, { column: v })} placeholder="Select column…">
              {allNames.length === 0 && <option value="" disabled>Connect a node first</option>}
              {allNames.map((c) => <option key={c} value={c}>{c}</option>)}
            </StyledSelect>
            <StyledSelect value={row.direction} onChange={(v) => updateRow(i, { direction: v as "ASC" | "DESC" })}>
              <option value="ASC">↑ ASC</option>
              <option value="DESC">↓ DESC</option>
            </StyledSelect>
            <button
              onClick={() => removeRow(i)}
              disabled={criteria.length === 1}
              style={{
                width: 30, height: 30, borderRadius: "var(--radius-sm)",
                border: "1px solid var(--border-default)", background: "transparent",
                color: "var(--color-error)", cursor: criteria.length === 1 ? "not-allowed" : "pointer",
                fontSize: "14px", opacity: criteria.length === 1 ? 0.3 : 1,
              }}
            >
              ✕
            </button>
          </div>
        ))}

        <button
          onClick={addRow}
          style={{
            display: "flex", alignItems: "center", gap: "6px",
            padding: "6px 10px", borderRadius: "var(--radius-sm)",
            border: "1px dashed var(--border-default)", background: "transparent",
            color: "var(--accent)", fontSize: "11px", cursor: "pointer",
            fontFamily: "var(--font-sans)", width: "100%", justifyContent: "center",
            transition: "all var(--transition-fast)",
          }}
          onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.background = "var(--accent-dim)"; }}
          onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.background = "transparent"; }}
        >
          + Add sort column
        </button>

        {/* Preview */}
        {isValid && (
          <div style={{ background: "var(--bg-tertiary)", borderRadius: "var(--radius-md)", padding: "8px 12px", fontSize: "11px" }}>
            <span style={{ color: "#6366f1", fontFamily: "var(--font-mono, monospace)", fontWeight: 600 }}>ORDER BY </span>
            <code style={{ color: "var(--text-secondary)", fontFamily: "var(--font-mono, monospace)" }}>
              {criteria.filter((c) => c.column).map((c) => `${c.column} ${c.direction}`).join(", ")}
            </code>
          </div>
        )}
      </div>
    </ModalBase>
  );
}
