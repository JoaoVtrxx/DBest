"use client";

import React, { useState } from "react";
import { useTablesStore, DBTable, TableType, TABLE_TYPE_META } from "@/store/useTablesStore";
import TableEntry from "./TableEntry";
import RenameInline from "./RenameInline";

// ── Section header ─────────────────────────────────────────────────────────────
function SectionHeader({ label, count }: { label: string; count: number }) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        padding: "10px 12px 4px",
      }}
    >
      <span
        style={{
          fontSize: "10px",
          fontWeight: 700,
          letterSpacing: "0.08em",
          textTransform: "uppercase",
          color: "var(--text-muted)",
        }}
      >
        {label}
      </span>
      {count > 0 && (
        <span
          style={{
            fontSize: "10px",
            fontWeight: 600,
            color: "var(--text-muted)",
            background: "var(--bg-tertiary)",
            padding: "1px 6px",
            borderRadius: "99px",
          }}
        >
          {count}
        </span>
      )}
    </div>
  );
}

// ── Filter pill ────────────────────────────────────────────────────────────────
function FilterPill({
  type,
  active,
  onClick,
}: {
  type: TableType | "all";
  active: boolean;
  onClick: () => void;
}) {
  const meta = type === "all" ? null : TABLE_TYPE_META[type];
  return (
    <button
      onClick={onClick}
      style={{
        padding: "2px 9px",
        borderRadius: "99px",
        border: `1px solid ${active ? (meta?.color ?? "var(--accent)") : "var(--border-default)"}`,
        background: active ? (meta?.bgColor ?? "var(--accent-dim)") : "transparent",
        color: active ? (meta?.color ?? "var(--accent)") : "var(--text-muted)",
        fontSize: "10px",
        fontWeight: 600,
        cursor: "pointer",
        fontFamily: "var(--font-sans)",
        transition: "all var(--transition-fast)",
        flexShrink: 0,
      }}
    >
      {type === "all" ? "All" : meta!.label}
    </button>
  );
}

// ── Main SidebarLeft ───────────────────────────────────────────────────────────
export default function SidebarLeft() {
  const { tables, selectedTableId, selectTable, removeTable, renameTable } =
    useTablesStore();

  const [searchQuery, setSearchQuery] = useState("");
  const [filterType, setFilterType] = useState<TableType | "all">("all");
  const [renamingId, setRenamingId] = useState<string | null>(null);

  // Filter & search
  const filteredTables = tables.filter((t) => {
    const matchesType = filterType === "all" || t.type === filterType;
    const matchesSearch = t.name.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesType && matchesSearch;
  });

  const handleDragStart = (e: React.DragEvent, table: DBTable) => {
    e.dataTransfer.setData("application/dbest-table", JSON.stringify(table));
    e.dataTransfer.effectAllowed = "copy";
  };

  const renamingTable = tables.find((t) => t.id === renamingId);

  const filterTypes: (TableType | "all")[] = ["all", "csv", "xml", "fyi", "memory"];
  const availableTypes = filterTypes.filter(
    (type) => type === "all" || tables.some((t) => t.type === type)
  );

  return (
    <>
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          height: "100%",
          overflow: "hidden",
        }}
      >
        {/* ─── Panel header ─── */}
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
              Tables
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
              {tables.length}
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
              placeholder="Search tables…"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{
                width: "100%",
                padding: "5px 8px 5px 26px",
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
          </div>
        </div>

        {/* ─── Type filter pills ─── */}
        {availableTypes.length > 2 && (
          <div
            style={{
              display: "flex",
              gap: "4px",
              padding: "6px 10px",
              overflowX: "auto",
              flexShrink: 0,
              borderBottom: "1px solid var(--border-subtle)",
            }}
          >
            {availableTypes.map((type) => (
              <FilterPill
                key={type}
                type={type}
                active={filterType === type}
                onClick={() => setFilterType(type)}
              />
            ))}
          </div>
        )}

        {/* ─── Table list ─── */}
        <div
          style={{
            flex: 1,
            overflowY: "auto",
            overflowX: "hidden",
            paddingBottom: "8px",
          }}
        >
          {filteredTables.length === 0 ? (
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
              <span style={{ fontSize: "24px", opacity: 0.35 }}>🗂️</span>
              <span style={{ fontSize: "11px" }}>
                {searchQuery ? `No tables matching "${searchQuery}"` : "No tables loaded"}
              </span>
            </div>
          ) : (
            <>
              <SectionHeader
                label={filterType === "all" ? "Loaded Tables" : TABLE_TYPE_META[filterType].label}
                count={filteredTables.length}
              />
              {filteredTables.map((table) => (
                <TableEntry
                  key={table.id}
                  table={table}
                  selected={selectedTableId === table.id}
                  onSelect={() => selectTable(table.id === selectedTableId ? null : table.id)}
                  onRename={() => setRenamingId(table.id)}
                  onRemove={() => removeTable(table.id)}
                  onDragStart={handleDragStart}
                />
              ))}
            </>
          )}
        </div>

        {/* ─── Selected table info strip ─── */}
        {selectedTableId && (() => {
          const t = tables.find((x) => x.id === selectedTableId);
          if (!t) return null;
          const meta = TABLE_TYPE_META[t.type];
          return (
            <div
              style={{
                borderTop: "1px solid var(--border-subtle)",
                padding: "6px 10px",
                background: meta.bgColor,
                flexShrink: 0,
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                <span
                  style={{
                    width: "6px",
                    height: "6px",
                    borderRadius: "50%",
                    background: meta.color,
                  }}
                />
                <span
                  className="truncate"
                  style={{ fontSize: "11px", fontWeight: 600, color: meta.color }}
                >
                  {t.name}
                </span>
                {t.columns && (
                  <span style={{ fontSize: "10px", color: "var(--text-muted)", marginLeft: "auto" }}>
                    {t.columns.length} cols
                  </span>
                )}
              </div>
            </div>
          );
        })()}
      </div>

      {/* Rename dialog */}
      {renamingId && renamingTable && (
        <RenameInline
          currentName={renamingTable.name}
          onConfirm={(newName) => {
            renameTable(renamingId, newName);
            setRenamingId(null);
          }}
          onCancel={() => setRenamingId(null)}
        />
      )}
    </>
  );
}
