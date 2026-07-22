"use client";

import React, { memo, useState, useRef, useCallback, useEffect } from "react";
import { Handle, Position, NodeProps } from "@xyflow/react";
import { TableNodeData, useCanvasStore } from "@/store/useCanvasStore";
import { TABLE_TYPE_META } from "@/store/useTablesStore";

const TABLE_TYPE_COLORS = {
  csv:    { bg: "#f0fdf4", border: "#16a34a", text: "#15803d" },
  fyi:    { bg: "#fefce8", border: "#ca8a04", text: "#a16207" },
  xml:    { bg: "#fdf2f8", border: "#db2777", text: "#be185d" },
  memory: { bg: "#eff6ff", border: "#2563eb", text: "#1d4ed8" },
};

const TableNode = memo(({ id, data, selected }: NodeProps) => {
  const nodeData = data as TableNodeData;
  const meta = TABLE_TYPE_META[nodeData.tableType] ?? TABLE_TYPE_META.csv;
  const colors = TABLE_TYPE_COLORS[nodeData.tableType] ?? TABLE_TYPE_COLORS.csv;

  const { updateNodeData } = useCanvasStore();
  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState(nodeData.tableName);
  const inputRef = useRef<HTMLInputElement>(null);

  // Keep editValue in sync if tableName changes externally
  useEffect(() => {
    if (!isEditing) setEditValue(nodeData.tableName);
  }, [nodeData.tableName, isEditing]);

  const startEditing = useCallback(() => {
    setIsEditing(true);
    setTimeout(() => inputRef.current?.select(), 30);
  }, []);

  useEffect(() => {
    const el = document.querySelector(`[data-id="${id}"]`);
    if (!el) return;
    const handler = () => startEditing();
    el.addEventListener("dbest:rename", handler);
    return () => el.removeEventListener("dbest:rename", handler);
  }, [id, startEditing]);

  const confirmEdit = useCallback(() => {
    const newName = editValue.trim();
    if (newName && newName !== nodeData.tableName) {
      updateNodeData(id, { label: newName, tableName: newName });
    }
    setIsEditing(false);
  }, [editValue, nodeData.tableName, id, updateNodeData]);

  const cancelEdit = useCallback(() => {
    setEditValue(nodeData.tableName);
    setIsEditing(false);
  }, [nodeData.tableName]);

  const onKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === "Enter") { e.stopPropagation(); confirmEdit(); }
    if (e.key === "Escape") { e.stopPropagation(); cancelEdit(); }
  }, [confirmEdit, cancelEdit]);

  return (
    <div
      style={{
        background: colors.bg,
        border: `2px solid ${selected ? "#3b82f6" : colors.border}`,
        borderRadius: "8px",
        minWidth: "130px",
        maxWidth: "200px",
        boxShadow: selected
          ? `0 0 0 3px rgba(59,130,246,0.25), 0 4px 12px rgba(0,0,0,0.12)`
          : "0 2px 8px rgba(0,0,0,0.10)",
        transition: "box-shadow 150ms ease, border-color 150ms ease",
        cursor: "grab",
        position: "relative",
        overflow: "hidden",
      }}
    >
      {/* Top accent bar */}
      <div style={{ height: "3px", background: colors.border, borderRadius: "6px 6px 0 0", position: "absolute", top: 0, left: 0, right: 0 }} />

      {/* Content */}
      <div style={{ padding: "10px 12px 8px" }}>
        {/* Header row */}
        <div style={{ display: "flex", alignItems: "center", gap: "6px", marginBottom: "5px" }}>
          <span style={{ fontSize: "14px" }}>{meta.icon}</span>
          {isEditing ? (
            <input
              ref={inputRef}
              value={editValue}
              onChange={(e) => setEditValue(e.target.value)}
              onBlur={confirmEdit}
              onKeyDown={onKeyDown}
              style={{
                fontSize: "12px", fontWeight: 700, color: colors.text,
                border: `1px solid ${colors.border}`, borderRadius: "3px",
                padding: "1px 4px", flex: 1, background: "white",
                outline: "none", fontFamily: "inherit",
              }}
              autoFocus
            />
          ) : (
            <span
              style={{ fontSize: "12px", fontWeight: 700, color: colors.text, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", flex: 1, cursor: "text" }}
              onDoubleClick={(e) => { e.stopPropagation(); startEditing(); }}
              title="Double-click to rename"
            >
              {nodeData.tableName}
            </span>
          )}
        </div>

        {/* Type + columns badge row */}
        <div style={{ display: "flex", alignItems: "center", gap: "4px" }}>
          <span style={{ fontSize: "9px", fontWeight: 700, letterSpacing: "0.06em", padding: "1px 6px", borderRadius: "3px", background: colors.border, color: "#fff" }}>
            {meta.label}
          </span>
          {nodeData.columns && nodeData.columns.length > 0 && (
            <span style={{ fontSize: "10px", color: colors.text, opacity: 0.7 }}>
              {nodeData.columns.length} cols
            </span>
          )}
        </div>
      </div>

      {/* Handles */}
      <Handle type="source" position={Position.Top} style={{ background: colors.border, width: 10, height: 10, border: "2px solid #fff", boxShadow: "0 1px 3px rgba(0,0,0,0.2)" }} />
      <Handle type="target" position={Position.Bottom} style={{ background: "#94a3b8", width: 8, height: 8, border: "2px solid #fff", opacity: 0.6 }} />
    </div>
  );
});

TableNode.displayName = "TableNode";
export default TableNode;
