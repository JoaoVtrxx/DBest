"use client";

import React, { memo, useState, useRef, useCallback, useEffect } from "react";
import { Handle, Position, NodeProps } from "@xyflow/react";
import { OperatorNodeData, useCanvasStore } from "@/store/useCanvasStore";

// Icons for operator categories
const OPERATOR_ICONS: Record<string, string> = {
  SORT: "⇅",
  PROJECTION: "📐",
  FILTER: "🔽",
  AGGREGATION: "Σ",
  GROUP: "⬡",
  HASH_GROUP: "⬡",
  NESTED_LOOP_JOIN: "⋈",
  MERGE_JOIN: "⋈",
  HASH_JOIN: "⋈",
  NESTED_LOOP_LEFT_OUTER_JOIN: "⟕",
  NESTED_LOOP_RIGHT_OUTER_JOIN: "⟖",
  MERGE_LEFT_OUTER_JOIN: "⟕",
  HASH_LEFT_OUTER_JOIN: "⟕",
  MERGE_RIGHT_OUTER_JOIN: "⟖",
  HASH_RIGHT_OUTER_JOIN: "⟖",
  MERGE_FULL_OUTER_JOIN: "⟗",
  HASH_FULL_OUTER_JOIN: "⟗",
  NESTED_LOOP_LEFT_SEMI_JOIN: "⋉",
  HASH_LEFT_SEMI_JOIN: "⋉",
  MERGE_LEFT_SEMI_JOIN: "⋉",
  MERGE_RIGHT_SEMI_JOIN: "⋊",
  HASH_RIGHT_SEMI_JOIN: "⋊",
  NESTED_LOOP_LEFT_ANTI_JOIN: "▷",
  MERGE_LEFT_ANTI_JOIN: "▷",
  HASH_LEFT_ANTI_JOIN: "▷",
  MERGE_RIGHT_ANTI_JOIN: "◁",
  HASH_RIGHT_ANTI_JOIN: "◁",
  CARTESIAN_PRODUCT: "×",
  UNION: "∪",
  HASH_UNION: "∪",
  INTERSECTION: "∩",
  HASH_INTERSECTION: "∩",
  DIFFERENCE: "−",
  HASH_DIFFERENCE: "−",
  APPEND: "++",
  DUPLICATE_REMOVAL: "◎",
  HASH_DUPLICATE_REMOVAL: "◎",
  LIMIT: "↧",
  SELECT_COLUMNS: "⊏",
  EXPLODE: "💥",
  AUTO_INCREMENT: "1,2,3",
  HASH: "#",
  MEMOIZE: "📌",
  MATERIALIZATION: "💾",
  AND: "∧",
  OR: "∨",
  XOR: "⊕",
  CONDITION: "?",
  IF: "if",
  SCAN: "→",
  RENAME: "✏",
  REFERENCE: "⤴",
};

// Operators that take two inputs (left/right). Everything else is unary and
// gets a single input handle. These binary operators are not in the current
// palette (kept for the continuation work described in the README).
const BINARY_OPERATORS = new Set<string>([
  "NESTED_LOOP_JOIN", "MERGE_JOIN", "HASH_JOIN", "HASH_INNER_JOIN", "CROSS_JOIN",
  "CARTESIAN_PRODUCT", "APPEND", "UNION", "UNION_ALL", "HASH_UNION",
  "INTERSECTION", "HASH_INTERSECTION", "DIFFERENCE", "HASH_DIFFERENCE",
]);

const OperatorNode = memo(({ id, data, selected }: NodeProps) => {
  const nodeData = data as OperatorNodeData;
  const icon = OPERATOR_ICONS[nodeData.operatorType] ?? "⚙";
  const isConfigured = nodeData.isConfigured;
  const hasError = nodeData.hasError;
  const isMarked = nodeData.isMarked;

  const { updateNodeData } = useCanvasStore();
  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState(nodeData.displayName);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => { if (!isEditing) setEditValue(nodeData.displayName); }, [nodeData.displayName, isEditing]);

  const startEditing = useCallback(() => { setIsEditing(true); setTimeout(() => inputRef.current?.select(), 30); }, []);
  const confirmEdit = useCallback(() => {
    const v = editValue.trim();
    if (v) updateNodeData(id, { label: v, displayName: v });
    setIsEditing(false);
  }, [editValue, id, updateNodeData]);
  const cancelEdit = useCallback(() => { setEditValue(nodeData.displayName); setIsEditing(false); }, [nodeData.displayName]);
  const onKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === "Enter") { e.stopPropagation(); confirmEdit(); }
    if (e.key === "Escape") { e.stopPropagation(); cancelEdit(); }
  }, [confirmEdit, cancelEdit]);

  // Listen for context-menu triggered rename (must be after startEditing is defined)
  useEffect(() => {
    const el = document.querySelector(`[data-id="${id}"]`);
    if (!el) return;
    const handler = () => startEditing();
    el.addEventListener("dbest:rename", handler);
    return () => el.removeEventListener("dbest:rename", handler);
  }, [id, startEditing]);

  let borderColor = selected ? "#3b82f6" : "#d4d4e0";
  if (hasError) borderColor = "#dc2626";
  else if (isMarked) borderColor = "#f59e0b";
  else if (selected) borderColor = "#3b82f6";

  let bgColor = "#ffffff";
  if (hasError) bgColor = "#fef2f2";
  else if (isMarked) bgColor = "#fffbeb";

  return (
    <div
      style={{
        background: bgColor,
        border: `2px solid ${borderColor}`,
        borderRadius: "8px",
        minWidth: "130px",
        maxWidth: "180px",
        boxShadow: selected
          ? "0 0 0 3px rgba(59,130,246,0.22), 0 4px 12px rgba(0,0,0,0.12)"
          : "0 2px 8px rgba(0,0,0,0.08)",
        transition: "all 150ms ease",
        cursor: "grab",
        position: "relative",
      }}
    >
      {/* Mark indicator (left bar) */}
      {isMarked && (
        <div
          style={{
            position: "absolute",
            left: 0,
            top: 0,
            bottom: 0,
            width: "3px",
            background: "#f59e0b",
            borderRadius: "6px 0 0 6px",
          }}
        />
      )}

      {/* Content */}
      <div style={{ padding: "8px 12px 7px" }}>
        {/* Header */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "6px",
            marginBottom: "4px",
          }}
        >
          {/* Operator symbol */}
          <span
            style={{
              fontSize: "13px",
              fontWeight: 700,
              color: hasError ? "#dc2626" : "#64748b",
              minWidth: "16px",
              textAlign: "center",
              fontFamily: "var(--font-mono, monospace)",
            }}
          >
            {icon}
          </span>
          {/* Display name — editable on double-click */}
          {isEditing ? (
            <input
              ref={inputRef}
              value={editValue}
              onChange={(e) => setEditValue(e.target.value)}
              onBlur={confirmEdit}
              onKeyDown={onKeyDown}
              style={{ fontSize: "11px", fontWeight: 600, flex: 1, border: "1px solid #3b82f6", borderRadius: "3px", padding: "1px 4px", outline: "none", fontFamily: "inherit", color: "#1a1a2e" }}
              autoFocus
            />
          ) : (
            <span
              style={{ fontSize: "11px", fontWeight: 600, color: hasError ? "#dc2626" : "#1a1a2e", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", flex: 1, lineHeight: 1.3, cursor: "text" }}
              onDoubleClick={(e) => { e.stopPropagation(); startEditing(); }}
              title="Double-click to rename"
            >
              {nodeData.displayName}
            </span>
          )}
        </div>

        {/* Status row */}
        <div style={{ display: "flex", alignItems: "center", gap: "5px" }}>
          {/* Status dot */}
          <span
            style={{
              width: "6px",
              height: "6px",
              borderRadius: "50%",
              background: hasError
                ? "#dc2626"
                : isConfigured
                ? "#16a34a"
                : "#94a3b8",
              flexShrink: 0,
              boxShadow: hasError ? "0 0 4px rgba(220,38,38,0.5)" : isConfigured ? "0 0 4px rgba(22,163,74,0.4)" : "none",
            }}
          />
          <span
            style={{
              fontSize: "10px",
              color: hasError ? "#dc2626" : isConfigured ? "#16a34a" : "#94a3b8",
            }}
          >
            {hasError
              ? nodeData.errorMessage ?? "Error"
              : isConfigured
              ? `${nodeData.arguments.length} arg${nodeData.arguments.length !== 1 ? "s" : ""}`
              : "Not configured"}
          </span>
        </div>
      </div>

      {/* Target handles (inputs — bottom).
          Binary operators get two handles (left/right); unary operators get a
          single centered handle. The beta palette only exposes unary operators,
          so in practice this renders one handle — but the binary path is kept
          for when joins/set ops are re-enabled. */}
      {BINARY_OPERATORS.has(nodeData.operatorType) ? (
        <>
          <Handle id="target-left" type="target" position={Position.Bottom}
            style={{ left: "35%", background: "#94a3b8", width: 9, height: 9, border: "2px solid #fff" }} />
          <Handle id="target-right" type="target" position={Position.Bottom}
            style={{ left: "65%", background: "#94a3b8", width: 9, height: 9, border: "2px solid #fff" }} />
        </>
      ) : (
        <Handle id="target-left" type="target" position={Position.Bottom}
          style={{ left: "50%", background: "#94a3b8", width: 9, height: 9, border: "2px solid #fff" }} />
      )}

      {/* Source handle (output — bottom) */}
      <Handle
        type="source"
        position={Position.Top}
        style={{
          background: hasError ? "#dc2626" : "#3b82f6",
          width: 10,
          height: 10,
          border: "2px solid #fff",
          boxShadow: "0 1px 3px rgba(0,0,0,0.2)",
        }}
      />
    </div>
  );
});

OperatorNode.displayName = "OperatorNode";
export default OperatorNode;
