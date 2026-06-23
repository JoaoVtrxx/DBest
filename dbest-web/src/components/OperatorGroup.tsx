"use client";

import React, { useState } from "react";
import { OperatorGroupDef, OperatorDef } from "@/data/operators";
import OperatorButton from "./OperatorButton";

interface OperatorGroupProps {
  group: OperatorGroupDef;
  searchQuery: string;
  onAdd?: (operator: OperatorDef) => void;
}

export default function OperatorGroup({ group, searchQuery, onAdd }: OperatorGroupProps) {
  const [open, setOpen] = useState(group.defaultOpen ?? false);

  React.useEffect(() => {
    setOpen(group.defaultOpen ?? false);
  }, [group.defaultOpen]);

  // Filter operators by search query
  const filtered = group.operators.filter(
    (op) =>
      op.displayName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      op.description.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // If searching and no matches in this group, hide the whole group
  if (searchQuery && filtered.length === 0) return null;

  // If searching and there are matches, force open
  const isOpen = searchQuery ? true : open;

  return (
    <div style={{ borderBottom: "1px solid var(--border-subtle)" }}>
      {/* Group header */}
      <button
        onClick={() => !searchQuery && setOpen((v) => !v)}
        style={{
          display: "flex",
          alignItems: "center",
          width: "100%",
          padding: "7px 10px 7px 8px",
          background: "transparent",
          border: "none",
          cursor: searchQuery ? "default" : "pointer",
          textAlign: "left",
          gap: "7px",
          transition: "background var(--transition-fast)",
        }}
        onMouseEnter={(e) => {
          if (!searchQuery)
            (e.currentTarget as HTMLButtonElement).style.background = "var(--bg-hover)";
        }}
        onMouseLeave={(e) => {
          (e.currentTarget as HTMLButtonElement).style.background = "transparent";
        }}
      >
        {/* Color dot */}
        <span
          style={{
            width: "7px",
            height: "7px",
            borderRadius: "50%",
            background: group.color,
            flexShrink: 0,
            boxShadow: `0 0 4px ${group.color}60`,
          }}
        />

        {/* Label */}
        <span
          style={{
            flex: 1,
            fontSize: "10.5px",
            fontWeight: 600,
            color: "var(--text-primary)",
            letterSpacing: "0.01em",
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
          }}
        >
          {group.label}
        </span>

        {/* Count badge */}
        <span
          style={{
            fontSize: "9px",
            fontWeight: 700,
            color: group.color,
            background: `${group.color}15`,
            padding: "1px 5px",
            borderRadius: "99px",
            flexShrink: 0,
          }}
        >
          {filtered.length}
        </span>

        {/* Chevron */}
        {!searchQuery && (
          <span
            style={{
              fontSize: "10px",
              color: "var(--text-muted)",
              transform: isOpen ? "rotate(90deg)" : "rotate(0deg)",
              transition: "transform var(--transition-base)",
              display: "inline-block",
              flexShrink: 0,
            }}
          >
            ▶
          </span>
        )}
      </button>

      {/* Operator list */}
      {isOpen && (
        <div
          style={{
            paddingBottom: "4px",
            animation: "slideDown var(--transition-base) ease forwards",
          }}
        >
          {filtered.map((op) => (
            <OperatorButton
              key={`${group.id}-${op.operatorType}`}
              operator={op}
              groupColor={group.color}
              onAdd={onAdd}
            />
          ))}
        </div>
      )}
    </div>
  );
}
