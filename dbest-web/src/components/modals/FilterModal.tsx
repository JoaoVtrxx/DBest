"use client";

import React, { useState } from "react";
import { Node as FlowNode } from "@xyflow/react";
import ModalBase, { FieldGroup, StyledSelect, StyledInput } from "./ModalBase";
import { useColumnsBySide } from "@/hooks/useNodeInputColumns";
import { useCanvasStore } from "@/store/useCanvasStore";

const RELATIONAL_OPERATORS = ["=", "≠", "<", ">", "≤", "≥", "LIKE", "IS NULL", "IS NOT NULL"];
type ValueType = "column" | "number" | "string" | "null";

interface FilterModalProps {
  node: FlowNode;
  onClose: () => void;
}

export default function FilterModal({ node, onClose }: FilterModalProps) {
  const { updateNodeData } = useCanvasStore();
  const { allNames } = useColumnsBySide(node.id);

  const existing = (node.data as Record<string, unknown>).arguments as string[] | undefined;
  const [left, setLeft] = useState(existing?.[0] ?? "");
  const [leftType, setLeftType] = useState<ValueType>("column");
  const [operator, setOperator] = useState(existing?.[1] ?? "=");
  const [right, setRight] = useState(existing?.[2] ?? "");
  const [rightType, setRightType] = useState<ValueType>("column");

  const isNullOp = operator === "IS NULL" || operator === "IS NOT NULL";

  const handleConfirm = () => {
    const args = isNullOp ? [left, operator] : [left, operator, right];
    updateNodeData(node.id, { arguments: args, isConfigured: true });
    onClose();
  };

  const isValid = left.trim() !== "" && (!isNullOp ? right.trim() !== "" : true);

  return (
    <ModalBase
      title="Filter — Condition"
      subtitle={`Configure a row filter condition for ${String((node.data as Record<string, unknown>).label ?? node.id)}`}
      icon="σ"
      accentColor="#3b82f6"
      onClose={onClose}
      onConfirm={handleConfirm}
      confirmLabel="Apply Filter"
      confirmDisabled={!isValid}
    >
      <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
        {/* Left operand */}
        <FieldGroup label="Left Operand">
          <div style={{ display: "flex", gap: "8px" }}>
            <div style={{ width: 110, flexShrink: 0 }}>
              <StyledSelect value={leftType} onChange={(v) => setLeftType(v as ValueType)}>
                <option value="column">Column</option>
                <option value="number">Number</option>
                <option value="string">String</option>
                <option value="null">NULL</option>
              </StyledSelect>
            </div>
            <div style={{ flex: 1 }}>
              {leftType === "column" ? (
                <StyledSelect value={left} onChange={setLeft} placeholder="Select column…">
                  {allNames.length === 0 && <option value="" disabled>No columns — connect a table first</option>}
                  {allNames.map((c) => <option key={c} value={c}>{c}</option>)}
                </StyledSelect>
              ) : leftType === "null" ? (
                <div style={{ padding: "7px 10px", background: "var(--bg-tertiary)", borderRadius: "var(--radius-sm)", border: "1px solid var(--border-default)", fontSize: "12px", color: "var(--text-muted)" }}>NULL</div>
              ) : (
                <StyledInput value={left} onChange={setLeft} placeholder={leftType === "string" ? '"value"' : "0"} />
              )}
            </div>
          </div>
        </FieldGroup>

        {/* Operator */}
        <FieldGroup label="Relational Operator">
          <div style={{ display: "flex", gap: "6px", flexWrap: "wrap" }}>
            {RELATIONAL_OPERATORS.map((op) => (
              <button
                key={op}
                onClick={() => setOperator(op)}
                style={{
                  padding: "5px 12px",
                  borderRadius: "var(--radius-sm)",
                  border: `1px solid ${operator === op ? "var(--accent)" : "var(--border-default)"}`,
                  background: operator === op ? "var(--accent-dim)" : "var(--bg-tertiary)",
                  color: operator === op ? "var(--accent)" : "var(--text-secondary)",
                  fontSize: "13px",
                  fontFamily: "var(--font-mono, monospace)",
                  fontWeight: 600,
                  cursor: "pointer",
                  transition: "all var(--transition-fast)",
                }}
              >
                {op}
              </button>
            ))}
          </div>
        </FieldGroup>

        {/* Right operand */}
        {!isNullOp && (
          <FieldGroup label="Right Operand">
            <div style={{ display: "flex", gap: "8px" }}>
              <div style={{ width: 110, flexShrink: 0 }}>
                <StyledSelect value={rightType} onChange={(v) => setRightType(v as ValueType)}>
                  <option value="column">Column</option>
                  <option value="number">Number</option>
                  <option value="string">String</option>
                  <option value="null">NULL</option>
                </StyledSelect>
              </div>
              <div style={{ flex: 1 }}>
                {rightType === "column" ? (
                  <StyledSelect value={right} onChange={setRight} placeholder="Select column…">
                    {allNames.length === 0 && <option value="" disabled>No columns — connect a table first</option>}
                    {allNames.map((c) => <option key={c} value={c}>{c}</option>)}
                  </StyledSelect>
                ) : rightType === "null" ? (
                  <div style={{ padding: "7px 10px", background: "var(--bg-tertiary)", borderRadius: "var(--radius-sm)", border: "1px solid var(--border-default)", fontSize: "12px", color: "var(--text-muted)" }}>NULL</div>
                ) : (
                  <StyledInput value={right} onChange={setRight} placeholder={rightType === "string" ? '"value"' : "0"} />
                )}
              </div>
            </div>
          </FieldGroup>
        )}

        {/* Preview */}
        {left && (
          <div style={{ background: "var(--bg-tertiary)", border: "1px solid var(--border-subtle)", borderRadius: "var(--radius-md)", padding: "10px 14px" }}>
            <div style={{ fontSize: "10px", color: "var(--text-muted)", marginBottom: "4px", textTransform: "uppercase", letterSpacing: "0.06em" }}>Preview</div>
            <code style={{ fontSize: "13px", color: "var(--accent)", fontFamily: "var(--font-mono, monospace)" }}>
              {left} {operator} {isNullOp ? "" : right || "?"}
            </code>
          </div>
        )}
      </div>
    </ModalBase>
  );
}
