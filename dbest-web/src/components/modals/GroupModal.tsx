"use client";

import React, { useState } from "react";
import { Node as FlowNode } from "@xyflow/react";
import ModalBase from "./ModalBase";
import { useColumnsBySide } from "@/hooks/useNodeInputColumns";
import { useCanvasStore } from "@/store/useCanvasStore";

interface GroupModalProps {
  node: FlowNode;
  onClose: () => void;
}

export default function GroupModal({ node, onClose }: GroupModalProps) {
  const { updateNodeData } = useCanvasStore();
  const { allNames } = useColumnsBySide(node.id);
  const existing = (node.data as Record<string, unknown>).arguments as string[] | undefined;
  const [selected, setSelected] = useState<Set<string>>(new Set(existing ?? []));

  const toggleCol = (col: string) =>
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(col)) {
        next.delete(col);
      } else {
        next.add(col);
      }
      return next;
    });

  const handleConfirm = () => {
    const args = Array.from(selected);
    updateNodeData(node.id, { arguments: args, isConfigured: args.length > 0 });
    onClose();
  };

  const opName = String((node.data as Record<string, unknown>).displayName ?? "Group");

  return (
    <ModalBase
      title={opName}
      subtitle="Select columns to group by"
      icon="⬡"
      accentColor="#8b5cf6"
      onClose={onClose}
      onConfirm={handleConfirm}
      confirmLabel={`Apply (${selected.size} col${selected.size !== 1 ? "s" : ""})`}
      confirmDisabled={selected.size === 0}
    >
      {allNames.length === 0 ? (
        <div style={{ textAlign: "center", padding: "24px 0", color: "var(--text-muted)", fontSize: "12px" }}>
          <div style={{ fontSize: "28px", marginBottom: "10px", opacity: 0.4 }}>🔗</div>
          Connect this node to a table or operator to see available columns.
        </div>
      ) : (
        <>
          <div style={{ display: "flex", flexDirection: "column", gap: "3px", maxHeight: "300px", overflowY: "auto" }}>
            {allNames.map((col) => {
              const isSelected = selected.has(col);
              return (
                <label
                  key={col}
                  style={{
                    display: "flex", alignItems: "center", gap: "10px",
                    padding: "7px 10px", borderRadius: "var(--radius-sm)",
                    border: `1px solid ${isSelected ? "#8b5cf630" : "transparent"}`,
                    background: isSelected ? "#8b5cf608" : "transparent",
                    cursor: "pointer", userSelect: "none",
                    transition: "all var(--transition-fast)",
                  }}
                >
                  <input
                    type="checkbox"
                    checked={isSelected}
                    onChange={() => toggleCol(col)}
                    style={{ accentColor: "#8b5cf6", width: 14, height: 14, cursor: "pointer", flexShrink: 0 }}
                  />
                  <span style={{ fontSize: "12px", fontFamily: "var(--font-mono, monospace)", color: isSelected ? "#8b5cf6" : "var(--text-secondary)" }}>
                    {col}
                  </span>
                </label>
              );
            })}
          </div>

          {selected.size > 0 && (
            <div style={{ marginTop: "12px", background: "var(--bg-tertiary)", borderRadius: "var(--radius-md)", padding: "8px 12px", fontSize: "11px" }}>
              <code style={{ fontFamily: "var(--font-mono, monospace)", color: "var(--text-secondary)" }}>
                GROUP BY <span style={{ color: "#8b5cf6" }}>{Array.from(selected).join(", ")}</span>
              </code>
            </div>
          )}
        </>
      )}
    </ModalBase>
  );
}
