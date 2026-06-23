"use client";

import React, { useState } from "react";
import { Node as FlowNode } from "@xyflow/react";
import ModalBase, { FieldGroup } from "./ModalBase";
import { useColumnsBySide } from "@/hooks/useNodeInputColumns";
import { useCanvasStore } from "@/store/useCanvasStore";

interface ProjectionModalProps {
  node: FlowNode;
  onClose: () => void;
}

export default function ProjectionModal({ node, onClose }: ProjectionModalProps) {
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

  const toggleAll = () =>
    setSelected(selected.size === allNames.length ? new Set() : new Set(allNames));

  const handleConfirm = () => {
    const args = Array.from(selected);
    updateNodeData(node.id, { arguments: args, isConfigured: args.length > 0 });
    onClose();
  };

  const hasColumns = allNames.length > 0;

  return (
    <ModalBase
      title="Projection — Select Columns"
      subtitle={`Choose which columns to keep in ${String((node.data as Record<string, unknown>).label ?? node.id)}`}
      icon="π"
      accentColor="#6366f1"
      onClose={onClose}
      onConfirm={handleConfirm}
      confirmLabel={`Apply (${selected.size} col${selected.size !== 1 ? "s" : ""})`}
      confirmDisabled={selected.size === 0}
    >
      {!hasColumns ? (
        <div style={{ textAlign: "center", padding: "24px 0", color: "var(--text-muted)", fontSize: "12px" }}>
          <div style={{ fontSize: "28px", marginBottom: "10px", opacity: 0.4 }}>🔗</div>
          Connect this node to a table or operator to see available columns.
        </div>
      ) : (
        <>
          {/* Select all toggle */}
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "10px" }}>
            <span style={{ fontSize: "11px", color: "var(--text-muted)" }}>
              {selected.size} of {allNames.length} selected
            </span>
            <button
              onClick={toggleAll}
              style={{
                background: "none", border: "none", cursor: "pointer",
                fontSize: "11px", color: "var(--accent)", fontFamily: "var(--font-sans)",
              }}
            >
              {selected.size === allNames.length ? "Deselect all" : "Select all"}
            </button>
          </div>

          <FieldGroup>
            <div style={{ display: "flex", flexDirection: "column", gap: "3px", maxHeight: "280px", overflowY: "auto" }}>
              {allNames.map((col) => {
                const isSelected = selected.has(col);
                return (
                  <label
                    key={col}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "10px",
                      padding: "7px 10px",
                      borderRadius: "var(--radius-sm)",
                      border: `1px solid ${isSelected ? "#6366f130" : "transparent"}`,
                      background: isSelected ? "#6366f108" : "transparent",
                      cursor: "pointer",
                      transition: "all var(--transition-fast)",
                      userSelect: "none",
                    }}
                    onMouseEnter={(e) => { if (!isSelected) (e.currentTarget as HTMLLabelElement).style.background = "var(--bg-hover)"; }}
                    onMouseLeave={(e) => { if (!isSelected) (e.currentTarget as HTMLLabelElement).style.background = "transparent"; }}
                  >
                    <input
                      type="checkbox"
                      checked={isSelected}
                      onChange={() => toggleCol(col)}
                      style={{ accentColor: "#6366f1", width: 14, height: 14, cursor: "pointer", flexShrink: 0 }}
                    />
                    <span style={{ fontSize: "12px", fontFamily: "var(--font-mono, monospace)", color: isSelected ? "#6366f1" : "var(--text-secondary)" }}>
                      {col}
                    </span>
                  </label>
                );
              })}
            </div>
          </FieldGroup>

          {/* Preview */}
          {selected.size > 0 && (
            <div style={{ background: "var(--bg-tertiary)", borderRadius: "var(--radius-md)", padding: "8px 12px", fontSize: "11px", color: "var(--text-muted)" }}>
              <span style={{ color: "#6366f1", fontFamily: "var(--font-mono, monospace)", fontWeight: 600 }}>π</span>
              {" "}
              <code style={{ color: "var(--text-secondary)", fontFamily: "var(--font-mono, monospace)" }}>
                {Array.from(selected).join(", ")}
              </code>
            </div>
          )}
        </>
      )}
    </ModalBase>
  );
}
