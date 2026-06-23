"use client";

import React, { useState } from "react";
import { Node as FlowNode } from "@xyflow/react";
import ModalBase, { FieldGroup, StyledInput } from "./ModalBase";
import { useCanvasStore } from "@/store/useCanvasStore";

interface LimitModalProps {
  node: FlowNode;
  onClose: () => void;
}

export default function LimitModal({ node, onClose }: LimitModalProps) {
  const { updateNodeData } = useCanvasStore();
  const existing = (node.data as Record<string, unknown>).arguments as string[] | undefined;
  const [limitValue, setLimitValue] = useState(existing?.[0] ?? "100");

  const handleConfirm = () => {
    const num = parseInt(limitValue, 10);
    if (isNaN(num) || num < 1) return;
    updateNodeData(node.id, { arguments: [String(num)], isConfigured: true });
    onClose();
  };

  const num = parseInt(limitValue, 10);
  const isValid = !isNaN(num) && num >= 1;

  return (
    <ModalBase
      title="Limit"
      subtitle="Set the maximum number of output tuples"
      icon="↧"
      accentColor="#f59e0b"
      onClose={onClose}
      onConfirm={handleConfirm}
      confirmLabel="Apply Limit"
      confirmDisabled={!isValid}
      width={360}
    >
      <FieldGroup label="Maximum Tuples">
        <StyledInput
          value={limitValue}
          onChange={setLimitValue}
          placeholder="e.g. 100"
          type="number"
        />
        {!isValid && limitValue !== "" && (
          <p style={{ fontSize: "11px", color: "var(--color-error)", marginTop: "5px" }}>
            Must be a positive integer
          </p>
        )}
      </FieldGroup>

      {/* Quick presets */}
      <div style={{ display: "flex", gap: "6px", flexWrap: "wrap", marginTop: "4px" }}>
        {[10, 50, 100, 500, 1000].map((v) => (
          <button
            key={v}
            onClick={() => setLimitValue(String(v))}
            style={{
              padding: "4px 12px",
              borderRadius: "var(--radius-sm)",
              border: `1px solid ${limitValue === String(v) ? "#f59e0b" : "var(--border-default)"}`,
              background: limitValue === String(v) ? "#f59e0b18" : "var(--bg-tertiary)",
              color: limitValue === String(v) ? "#f59e0b" : "var(--text-secondary)",
              fontSize: "11px",
              cursor: "pointer",
              fontFamily: "var(--font-sans)",
              fontWeight: 600,
              transition: "all var(--transition-fast)",
            }}
          >
            {v.toLocaleString()}
          </button>
        ))}
      </div>

      {isValid && (
        <div style={{ marginTop: "16px", background: "var(--bg-tertiary)", borderRadius: "var(--radius-md)", padding: "8px 12px", fontSize: "11px" }}>
          <code style={{ fontFamily: "var(--font-mono, monospace)", color: "var(--text-secondary)" }}>
            LIMIT <span style={{ color: "#f59e0b", fontWeight: 700 }}>{num.toLocaleString()}</span>
          </code>
        </div>
      )}
    </ModalBase>
  );
}
