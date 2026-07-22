"use client";

import React, { useState, useRef, useEffect } from "react";
import IconButton from "./ui/IconButton";
import { downloadSession, uploadSession } from "@/lib/sessionSerializer";
import { useTablesStore } from "@/store/useTablesStore";
import { useCanvasStore } from "@/store/useCanvasStore";
import { useModalsStore } from "@/store/useModalsStore";

interface HeaderProps {
  canUndo?: boolean;
  canRedo?: boolean;
  onUndo?: () => void;
  onRedo?: () => void;
}

// ── Dropdown Menu component ──────────────────────────────────────────────────
interface DropdownItem {
  label: string;
  icon?: string;
  onClick: () => void;
  divider?: boolean;
  testId?: string;
}
interface DropdownProps {
  label: string;
  items: DropdownItem[];
}

function Dropdown({ label, items }: DropdownProps) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handle = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handle);
    return () => document.removeEventListener("mousedown", handle);
  }, []);

  return (
    <div ref={ref} style={{ position: "relative" }}>
      <button
        data-testid={"menu-" + label.toLowerCase() + "-btn"}
        onClick={() => setOpen((v) => !v)}
        style={{
          display: "flex",
          alignItems: "center",
          gap: "4px",
          padding: "4px 10px",
          background: open ? "var(--bg-hover)" : "transparent",
          border: "1px solid " + (open ? "var(--border-default)" : "transparent"),
          borderRadius: "var(--radius-sm)",
          color: open ? "var(--text-primary)" : "var(--text-secondary)",
          fontSize: "12px",
          fontFamily: "var(--font-sans)",
          cursor: "pointer",
          transition: "all var(--transition-fast)",
          userSelect: "none",
        }}
        onMouseEnter={(e) => {
          if (!open) {
            e.currentTarget.style.background = "var(--bg-hover)";
            e.currentTarget.style.color = "var(--text-primary)";
          }
        }}
        onMouseLeave={(e) => {
          if (!open) {
            e.currentTarget.style.background = "transparent";
            e.currentTarget.style.color = "var(--text-secondary)";
          }
        }}
      >
        {label}
        <span
          style={{
            fontSize: "9px",
            opacity: 0.6,
            transform: open ? "rotate(180deg)" : "rotate(0deg)",
            transition: "transform var(--transition-fast)",
            display: "inline-block",
          }}
        >
          ▼
        </span>
      </button>

      {open && (
        <div
          style={{
            position: "absolute",
            top: "calc(100% + 4px)",
            left: 0,
            minWidth: "210px",
            background: "var(--bg-elevated)",
            border: "1px solid var(--border-default)",
            borderRadius: "var(--radius-md)",
            boxShadow: "var(--shadow-lg)",
            zIndex: 1000,
            animation: "slideDown var(--transition-fast) ease forwards",
            overflow: "hidden",
          }}
        >
          {items.map((item, i) => (
            <React.Fragment key={i}>
              {item.divider && (
                <div
                  style={{
                    height: "1px",
                    background: "var(--border-subtle)",
                    margin: "4px 0",
                  }}
                />
              )}
              <button
                data-testid={item.testId}
                onClick={() => {
                  item.onClick();
                  setOpen(false);
                }}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "8px",
                  width: "100%",
                  padding: "7px 12px",
                  background: "transparent",
                  border: "none",
                  color: "var(--text-secondary)",
                  fontSize: "12px",
                  fontFamily: "var(--font-sans)",
                  cursor: "pointer",
                  textAlign: "left",
                  transition: "all var(--transition-fast)",
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = "var(--bg-hover)";
                  e.currentTarget.style.color = "var(--text-primary)";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = "transparent";
                  e.currentTarget.style.color = "var(--text-secondary)";
                }}
              >
                {item.icon && <span style={{ fontSize: "13px" }}>{item.icon}</span>}
                {item.label}
              </button>
            </React.Fragment>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Header ───────────────────────────────────────────────────────────────────
export default function Header({
  canUndo = false,
  canRedo = false,
  onUndo,
  onRedo,
}: HeaderProps) {
  const { tables, addTable } = useTablesStore();
  const { nodes, edges, loadSession } = useCanvasStore();
  const { openImport } = useModalsStore();

  const handleSave = () => downloadSession(tables, nodes, edges);
  const handleOpen = async () => {
    try {
      const session = await uploadSession();
      // Restore tables
      session.tables.forEach(t => addTable(t));
      // Restore canvas
      loadSession(session.canvasNodes, session.canvasEdges);
    } catch (e) {
      console.error("Failed to load session:", e);
    }
  };
  const fileItems: DropdownItem[] = [
    {
      label: "Open CSV Table",
      icon: "📄",
      onClick: () => openImport("csv"),
      testId: "menu-import-csv",
    },
    {
      label: "Open Indexed Data (BTree)",
      icon: "🌲",
      onClick: () => openImport("dat"),
      testId: "menu-import-dat",
    },
    {
      label: "Open XML Table",
      icon: "🗂️",
      onClick: () => openImport("xml"),
      testId: "menu-import-xml",
    },
    {
      label: "New In-Memory Table",
      icon: "🧱",
      onClick: () => openImport("memory"),
      testId: "menu-import-memory",
    },
    {
      label: "Save Session",
      icon: "💾",
      divider: true,
      onClick: handleSave,
    },
    {
      label: "Load Session",
      icon: "📤",
      onClick: handleOpen,
    },
  ];

  return (
    <header
      style={{
        height: "var(--header-height)",
        background: "var(--bg-secondary)",
        borderBottom: "1px solid var(--border-subtle)",
        display: "flex",
        alignItems: "center",
        padding: "0 12px",
        gap: "4px",
        flexShrink: 0,
        zIndex: 100,
      }}
    >
      {/* Logo */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: "7px",
          marginRight: "12px",
          paddingRight: "12px",
          borderRight: "1px solid var(--border-subtle)",
        }}
      >
        <span style={{ fontSize: "16px" }}>🗄️</span>
        <span
          style={{
            fontSize: "13px",
            fontWeight: 600,
            color: "var(--accent)",
            letterSpacing: "0.02em",
          }}
        >
          DBest
        </span>
      </div>

      {/* Menus */}
      <Dropdown label="File" items={fileItems} />
      {/* Appearance menu removed — the dark/light toggle was a no-op. */}

      {/* Spacer */}
      <div style={{ flex: 1 }} />

      {/* Undo / Redo */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: "2px",
          paddingLeft: "8px",
          borderLeft: "1px solid var(--border-subtle)",
        }}
      >
        <IconButton
          icon="↩"
          label="Undo"
          shortcut="Ctrl+Z"
          disabled={!canUndo}
          onClick={onUndo}
          tooltip="Undo last action"
        />
        <IconButton
          icon="↪"
          label="Redo"
          shortcut="Ctrl+Y"
          disabled={!canRedo}
          onClick={onRedo}
          tooltip="Redo last undone action"
        />
      </div>
    </header>
  );
}
