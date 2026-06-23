"use client";

import React, { useState, useMemo } from "react";
import { OPERATOR_GROUPS, OperatorDef } from "@/data/operators";
import OperatorGroup from "./OperatorGroup";
import { useCanvasStore, generateNodeId } from "@/store/useCanvasStore";

export default function SidebarRight() {
  const [searchQuery, setSearchQuery] = useState("");
  const [expandAll, setExpandAll] = useState(false);

  const { addNode } = useCanvasStore();

  // Total operator count
  const totalOperators = useMemo(
    () => OPERATOR_GROUPS.reduce((acc, g) => acc + g.operators.length, 0),
    []
  );

  // Filtered count when searching
  const filteredCount = useMemo(() => {
    if (!searchQuery) return totalOperators;
    return OPERATOR_GROUPS.reduce(
      (acc, g) =>
        acc +
        g.operators.filter(
          (op) =>
            op.displayName.toLowerCase().includes(searchQuery.toLowerCase()) ||
            op.description.toLowerCase().includes(searchQuery.toLowerCase())
        ).length,
      0
    );
  }, [searchQuery, totalOperators]);

  // Add operator to canvas center (click-to-add)
  const handleAdd = (operator: OperatorDef) => {
    addNode({
      id: generateNodeId(),
      type: "operatorNode",
      // Place near center; exact position will be adjusted by the user
      position: { x: 300 + Math.random() * 200, y: 150 + Math.random() * 200 },
      data: {
        label: operator.displayName,
        operatorType: operator.operatorType,
        displayName: operator.displayName,
        arguments: [],
        isConfigured: false,
        hasError: false,
      },
    });
  };

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        height: "100%",
        overflow: "hidden",
      }}
    >
      {/* ─── Header ─── */}
      <div
        style={{
          padding: "10px 10px 8px",
          borderBottom: "1px solid var(--border-subtle)",
          flexShrink: 0,
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            marginBottom: "8px",
          }}
        >
          <span
            style={{
              fontSize: "12px",
              fontWeight: 700,
              color: "var(--text-primary)",
              letterSpacing: "0.01em",
            }}
          >
            Operators
          </span>
          <span
            style={{
              fontSize: "10px",
              color: "var(--text-muted)",
              background: "var(--bg-tertiary)",
              padding: "1px 7px",
              borderRadius: "99px",
              fontWeight: 600,
            }}
          >
            {searchQuery ? `${filteredCount} / ${totalOperators}` : totalOperators}
          </span>
        </div>

        {/* Search box */}
        <div style={{ position: "relative" }}>
          <span
            style={{
              position: "absolute",
              left: "8px",
              top: "50%",
              transform: "translateY(-50%)",
              fontSize: "11px",
              color: "var(--text-muted)",
              pointerEvents: "none",
            }}
          >
            🔍
          </span>
          <input
            type="text"
            placeholder="Search operators…"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={{
              width: "100%",
              padding: "5px 28px 5px 26px",
              background: "var(--bg-tertiary)",
              border: "1px solid var(--border-subtle)",
              borderRadius: "var(--radius-sm)",
              color: "var(--text-primary)",
              fontSize: "11px",
              fontFamily: "var(--font-sans)",
              outline: "none",
              boxSizing: "border-box",
              transition: "border-color var(--transition-fast)",
            }}
            onFocus={(e) => (e.target.style.borderColor = "var(--accent)")}
            onBlur={(e) => (e.target.style.borderColor = "var(--border-subtle)")}
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery("")}
              style={{
                position: "absolute",
                right: "6px",
                top: "50%",
                transform: "translateY(-50%)",
                background: "none",
                border: "none",
                cursor: "pointer",
                color: "var(--text-muted)",
                fontSize: "12px",
                padding: "2px",
                lineHeight: 1,
              }}
            >
              ✕
            </button>
          )}
        </div>
      </div>

      {/* ─── Expand/Collapse all ─── */}
      {!searchQuery && (
        <div
          style={{
            display: "flex",
            justifyContent: "flex-end",
            padding: "4px 10px",
            borderBottom: "1px solid var(--border-subtle)",
            flexShrink: 0,
          }}
        >
          <button
            onClick={() => setExpandAll((v) => !v)}
            style={{
              background: "none",
              border: "none",
              cursor: "pointer",
              fontSize: "10px",
              color: "var(--accent)",
              fontFamily: "var(--font-sans)",
              padding: "2px 4px",
              borderRadius: "var(--radius-sm)",
              transition: "background var(--transition-fast)",
            }}
            onMouseEnter={(e) =>
              ((e.currentTarget as HTMLButtonElement).style.background = "var(--accent-dim)")
            }
            onMouseLeave={(e) =>
              ((e.currentTarget as HTMLButtonElement).style.background = "transparent")
            }
          >
            {expandAll ? "Collapse all" : "Expand all"}
          </button>
        </div>
      )}

      {/* ─── Usage hint ─── */}
      {!searchQuery && (
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "5px",
            padding: "5px 10px",
            background: "var(--accent-dim)",
            flexShrink: 0,
          }}
        >
          <span style={{ fontSize: "10px", color: "var(--accent)", opacity: 0.8 }}>
            ⠿ Drag to canvas · Click to add
          </span>
        </div>
      )}

      {/* ─── Operator groups list ─── */}
      <div
        style={{
          flex: 1,
          overflowY: "auto",
          overflowX: "hidden",
        }}
      >
        {filteredCount === 0 ? (
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              padding: "32px 12px",
              gap: "8px",
              color: "var(--text-muted)",
              textAlign: "center",
            }}
          >
            <span style={{ fontSize: "24px", opacity: 0.35 }}>⚙️</span>
            <span style={{ fontSize: "11px" }}>
              No operators matching &ldquo;{searchQuery}&rdquo;
            </span>
          </div>
        ) : (
          OPERATOR_GROUPS.map((group) => (
            <OperatorGroup
              key={group.id}
              group={
                expandAll
                  ? { ...group, defaultOpen: true }
                  : group
              }
              searchQuery={searchQuery}
              onAdd={handleAdd}
            />
          ))
        )}
      </div>

      {/* ─── Bottom: keyboard tip ─── */}
      <div
        style={{
          borderTop: "1px solid var(--border-subtle)",
          padding: "5px 10px",
          flexShrink: 0,
          display: "flex",
          alignItems: "center",
          gap: "6px",
        }}
      >
        <span style={{ fontSize: "10px", color: "var(--text-muted)" }}>
          {OPERATOR_GROUPS.length} groups · {totalOperators} operators total
        </span>
      </div>
    </div>
  );
}
