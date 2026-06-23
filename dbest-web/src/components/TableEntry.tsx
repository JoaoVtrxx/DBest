"use client";

import React, { useState } from "react";
import { DBTable, TABLE_TYPE_META } from "@/store/useTablesStore";
import TableContextMenu from "./TableContextMenu";

interface TableEntryProps {
  table: DBTable;
  selected: boolean;
  onSelect: () => void;
  onRename: () => void;
  onRemove: () => void;
  onDragStart?: (e: React.DragEvent, table: DBTable) => void;
}

export default function TableEntry({
  table,
  selected,
  onSelect,
  onRename,
  onRemove,
  onDragStart,
}: TableEntryProps) {
  const [ctxMenu, setCtxMenu] = useState<{ x: number; y: number } | null>(null);
  const [expanded, setExpanded] = useState(false);
  const meta = TABLE_TYPE_META[table.type];

  const handleContextMenu = (e: React.MouseEvent) => {
    e.preventDefault();
    setCtxMenu({ x: e.clientX, y: e.clientY });
  };

  const contextItems = [
    {
      icon: "✏️",
      label: "Rename Table",
      onClick: onRename,
    },
    {
      icon: "🗑️",
      label: "Remove Table",
      onClick: onRemove,
      divider: true,
      danger: true,
    },
  ];

  return (
    <>
      <div
        data-testid={`table-entry-${table.name}`}
        draggable
        onDragStart={(e) => onDragStart?.(e, table)}
        onClick={onSelect}
        onContextMenu={handleContextMenu}
        style={{
          display: "flex",
          flexDirection: "column",
          cursor: "grab",
          userSelect: "none",
          borderRadius: "var(--radius-sm)",
          border: `1px solid ${selected ? "var(--accent)" : "transparent"}`,
          background: selected ? "var(--accent-dim)" : "transparent",
          transition: "all var(--transition-fast)",
          margin: "1px 6px",
        }}
        onMouseEnter={(e) => {
          if (!selected) {
            (e.currentTarget as HTMLDivElement).style.background = "var(--bg-hover)";
          }
        }}
        onMouseLeave={(e) => {
          if (!selected) {
            (e.currentTarget as HTMLDivElement).style.background = "transparent";
          }
        }}
      >
        {/* Main row */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "7px",
            padding: "5px 8px",
          }}
        >
          {/* Color indicator bar */}
          <div
            style={{
              width: "3px",
              height: "18px",
              borderRadius: "2px",
              background: meta.color,
              flexShrink: 0,
            }}
          />

          {/* Table icon */}
          <span style={{ fontSize: "13px", flexShrink: 0 }}>{meta.icon}</span>

          {/* Name */}
          <span
            className="truncate"
            style={{
              flex: 1,
              fontSize: "12px",
              fontWeight: 500,
              color: selected ? "var(--accent)" : "var(--text-primary)",
            }}
          >
            {table.name}
          </span>

          {/* Type badge */}
          <span
            style={{
              fontSize: "9px",
              fontWeight: 700,
              letterSpacing: "0.04em",
              padding: "1px 5px",
              borderRadius: "3px",
              background: meta.bgColor,
              color: meta.color,
              flexShrink: 0,
            }}
          >
            {meta.label}
          </span>

          {/* Expand toggle if has columns */}
          {table.columns && table.columns.length > 0 && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                setExpanded((v) => !v);
              }}
              style={{
                background: "none",
                border: "none",
                cursor: "pointer",
                padding: "0 2px",
                color: "var(--text-muted)",
                fontSize: "10px",
                display: "flex",
                alignItems: "center",
                flexShrink: 0,
                transform: expanded ? "rotate(90deg)" : "rotate(0deg)",
                transition: "transform var(--transition-fast)",
              }}
            >
              ▶
            </button>
          )}
        </div>

        {/* Columns sub-list */}
        {expanded && table.columns && (
          <div style={{ paddingBottom: "4px" }}>
            {table.columns.map((col) => (
              <div
                key={col}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "6px",
                  padding: "2px 8px 2px 28px",
                  color: "var(--text-muted)",
                  fontSize: "11px",
                }}
              >
                <span
                  style={{
                    width: "4px",
                    height: "4px",
                    borderRadius: "50%",
                    background: "var(--border-default)",
                    flexShrink: 0,
                  }}
                />
                <span className="truncate">{col}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Right-click context menu */}
      {ctxMenu && (
        <TableContextMenu
          x={ctxMenu.x}
          y={ctxMenu.y}
          items={contextItems}
          onClose={() => setCtxMenu(null)}
        />
      )}
    </>
  );
}
