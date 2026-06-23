"use client";

import React, { useEffect, useRef } from "react";
import { Node as FlowNode } from "@xyflow/react";

interface NodeContextMenuProps {
  x: number;
  y: number;
  node: FlowNode;
  onClose: () => void;
  onRunQuery: (node: FlowNode) => void;
  onEdit: (node: FlowNode) => void;
  onInfo: (node: FlowNode) => void;
  onRename: (node: FlowNode) => void;
  onMark: (node: FlowNode, marked: boolean) => void;
  onRemove: (node: FlowNode) => void;
  onExportTable: (node: FlowNode) => void;
  onRedistribute: (node: FlowNode) => void;
}

export default function NodeContextMenu({
  x, y, node, onClose,
  onRunQuery, onEdit, onInfo, onRename, onMark, onRemove, onExportTable, onRedistribute,
}: NodeContextMenuProps) {
  const menuRef = useRef<HTMLDivElement>(null);
  const isMarked = (node.data as Record<string, unknown>).isMarked as boolean | undefined;
  const isOperator = node.type === "operatorNode";

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Element)) onClose();
    };
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("mousedown", handleClick);
    document.addEventListener("keydown", handleKey);
    return () => {
      document.removeEventListener("mousedown", handleClick);
      document.removeEventListener("keydown", handleKey);
    };
  }, [onClose]);

  // Clamp to viewport
  const adjustedX = Math.min(x, window.innerWidth - 210);
  const adjustedY = Math.min(y, window.innerHeight - 280);

  type MenuItem =
    | { type: "divider" }
    | {
        type: "item";
        icon: string;
        label: string;
        shortcut?: string;
        danger?: boolean;
        onClick: () => void;
      };

  const items: MenuItem[] = [
    {
      type: "item",
      icon: "▶",
      label: "Run Query",
      shortcut: "Enter",
      onClick: () => { onRunQuery(node); onClose(); },
    },
    ...(isOperator
      ? [
          {
            type: "item" as const,
            icon: "✏️",
            label: "Edit",
            onClick: () => { onEdit(node); onClose(); },
          },
        ]
      : []),
    {
      type: "item",
      icon: "ℹ️",
      label: "Information",
      onClick: () => { onInfo(node); onClose(); },
    },
    {
      type: "item",
      icon: "🔤",
      label: "Rename",
      onClick: () => { onRename(node); onClose(); },
    },
    { type: "divider" },
    {
      type: "item",
      icon: isMarked ? "★" : "☆",
      label: isMarked ? "Unmark" : "Mark",
      onClick: () => { onMark(node, !isMarked); onClose(); },
    },
    {
      type: "item",
      icon: "📤",
      label: "Export Table",
      onClick: () => { onExportTable(node); onClose(); },
    },
    {
      type: "item",
      icon: "↕️",
      label: "Redistribute Nodes",
      onClick: () => { onRedistribute(node); onClose(); },
    },
    { type: "divider" },
    {
      type: "item",
      icon: "🗑️",
      label: "Remove",
      shortcut: "Del",
      danger: true,
      onClick: () => { onRemove(node); onClose(); },
    },
  ];

  return (
    <div
      ref={menuRef}
      style={{
        position: "fixed",
        top: adjustedY,
        left: adjustedX,
        minWidth: "200px",
        background: "var(--bg-elevated)",
        border: "1px solid var(--border-default)",
        borderRadius: "var(--radius-md)",
        boxShadow: "var(--shadow-lg)",
        zIndex: 9999,
        padding: "4px 0",
        animation: "fadeIn 100ms ease forwards",
      }}
    >
      {/* Node label header */}
      <div
        style={{
          padding: "6px 12px 5px",
          borderBottom: "1px solid var(--border-subtle)",
          marginBottom: "3px",
        }}
      >
        <span
          style={{
            fontSize: "11px",
            fontWeight: 700,
            color: "var(--text-primary)",
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
            display: "block",
          }}
        >
          {String((node.data as Record<string, unknown>).label ?? node.id)}
        </span>
        <span style={{ fontSize: "10px", color: "var(--text-muted)" }}>
          {node.type === "tableNode" ? "Table" : "Operator"}
        </span>
      </div>

      {items.map((item, i) => {
        if (item.type === "divider") {
          return (
            <div
              key={i}
              style={{
                height: "1px",
                background: "var(--border-subtle)",
                margin: "3px 0",
              }}
            />
          );
        }
        return (
          <button
            key={i}
            onClick={item.onClick}
            data-testid={"context-menu-" + item.label.toLowerCase().replace(/\s+/g, "-")}
            style={{
              display: "flex",
              alignItems: "center",
              gap: "8px",
              width: "100%",
              padding: "6px 12px",
              background: "transparent",
              border: "none",
              color: item.danger ? "var(--color-error)" : "var(--text-secondary)",
              fontSize: "12px",
              fontFamily: "var(--font-sans)",
              cursor: "pointer",
              textAlign: "left",
              transition: "all var(--transition-fast)",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = item.danger
                ? "rgba(220,38,38,0.08)"
                : "var(--bg-hover)";
              e.currentTarget.style.color = item.danger
                ? "var(--color-error)"
                : "var(--text-primary)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = "transparent";
              e.currentTarget.style.color = item.danger
                ? "var(--color-error)"
                : "var(--text-secondary)";
            }}
          >
            <span style={{ width: "16px", textAlign: "center", fontSize: "12px" }}>
              {item.icon}
            </span>
            <span style={{ flex: 1 }}>{item.label}</span>
            {item.shortcut && (
              <span style={{ fontSize: "10px", color: "var(--text-muted)", marginLeft: "auto" }}>
                {item.shortcut}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}
