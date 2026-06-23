"use client";

import React, { useState } from "react";
import { Node as FlowNode } from "@xyflow/react";
import ModalBase, { StyledSelect } from "./ModalBase";
import { useColumnsBySide } from "@/hooks/useNodeInputColumns";
import { useCanvasStore } from "@/store/useCanvasStore";

interface JoinCriteria {
  leftCol: string;
  rightCol: string;
}

interface JoinModalProps {
  node: FlowNode;
  onClose: () => void;
}

export default function JoinModal({ node, onClose }: JoinModalProps) {
  const { updateNodeData } = useCanvasStore();
  const { leftNames, rightNames, allNames } = useColumnsBySide(node.id);

  const leftCols = leftNames.length > 0 ? leftNames : allNames;
  const rightCols = rightNames.length > 0 ? rightNames : allNames;

  const existing = (node.data as Record<string, unknown>).arguments as string[] | undefined;
  const parseExisting = (): JoinCriteria[] => {
    if (!existing || existing.length === 0) return [{ leftCol: "", rightCol: "" }];
    const rows: JoinCriteria[] = [];
    for (let i = 0; i < existing.length; i += 2) {
      rows.push({ leftCol: existing[i], rightCol: existing[i + 1] ?? "" });
    }
    return rows;
  };

  const [criteria, setCriteria] = useState<JoinCriteria[]>(parseExisting);

  const updateRow = (i: number, patch: Partial<JoinCriteria>) =>
    setCriteria((prev) => prev.map((r, idx) => (idx === i ? { ...r, ...patch } : r)));
  const addRow = () => setCriteria((prev) => [...prev, { leftCol: "", rightCol: "" }]);
  const removeRow = (i: number) => setCriteria((prev) => prev.filter((_, idx) => idx !== i));

  const handleConfirm = () => {
    const valid = criteria.filter((c) => c.leftCol && c.rightCol);
    const args = valid.flatMap((c) => [c.leftCol, c.rightCol]);
    updateNodeData(node.id, { arguments: args, isConfigured: args.length > 0 });
    onClose();
  };

  const isValid = criteria.some((c) => c.leftCol && c.rightCol);
  const opName = String((node.data as Record<string, unknown>).displayName ?? "Join");

  return (
    <ModalBase
      title={`${opName} — Join Criteria`}
      subtitle="Match columns from the left and right inputs"
      icon="⋈"
      accentColor="#06b6d4"
      onClose={onClose}
      onConfirm={handleConfirm}
      confirmLabel="Apply Join"
      confirmDisabled={!isValid}
      width={520}
    >
      <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
        {/* Column headers */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 36px 1fr 32px", gap: "8px", paddingBottom: "4px", borderBottom: "1px solid var(--border-subtle)" }}>
          <span style={{ fontSize: "10px", fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase" }}>Left Input</span>
          <span />
          <span style={{ fontSize: "10px", fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase" }}>Right Input</span>
          <span />
        </div>

        {criteria.map((row, i) => (
          <div key={i} style={{ display: "grid", gridTemplateColumns: "1fr 36px 1fr 32px", gap: "8px", alignItems: "center" }}>
            <StyledSelect value={row.leftCol} onChange={(v) => updateRow(i, { leftCol: v })} placeholder="Left column…">
              {leftCols.length === 0 && <option value="" disabled>No columns</option>}
              {leftCols.map((c) => <option key={c} value={c}>{c}</option>)}
            </StyledSelect>
            <div style={{ textAlign: "center", fontSize: "14px", color: "var(--text-muted)", fontWeight: 700 }}>=</div>
            <StyledSelect value={row.rightCol} onChange={(v) => updateRow(i, { rightCol: v })} placeholder="Right column…">
              {rightCols.length === 0 && <option value="" disabled>No columns</option>}
              {rightCols.map((c) => <option key={c} value={c}>{c}</option>)}
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
            >✕</button>
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
          + Add join condition
        </button>

        {isValid && (
          <div style={{ background: "var(--bg-tertiary)", borderRadius: "var(--radius-md)", padding: "8px 12px", fontSize: "11px" }}>
            <span style={{ color: "#06b6d4", fontFamily: "var(--font-mono)", fontWeight: 700 }}>ON </span>
            <code style={{ color: "var(--text-secondary)", fontFamily: "var(--font-mono, monospace)" }}>
              {criteria.filter((c) => c.leftCol && c.rightCol).map((c) => `${c.leftCol} = ${c.rightCol}`).join(" AND ")}
            </code>
          </div>
        )}
      </div>
    </ModalBase>
  );
}
