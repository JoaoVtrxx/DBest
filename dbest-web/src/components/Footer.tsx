"use client";

import React, { useState, useEffect } from "react";
import IconButton from "./ui/IconButton";
import { api } from "@/lib/api";

export type ActiveMode =
  | "none"
  | "import"
  | "create_table"
  | "add_edge"
  | "remove"
  | "remove_all"
  | "screenshot"
  | "console"
  | "text_editor"
  | "comparator";

interface FooterProps {
  activeMode?: ActiveMode;
  onModeChange?: (mode: ActiveMode) => void;
}

interface ToolbarButton {
  icon: string;
  label: string;
  shortcut?: string;
  mode: ActiveMode;
  variant?: "default" | "ghost" | "danger";
}

const TOOLBAR_BUTTONS: ToolbarButton[] = [
  { icon: "📥", label: "Import Table", shortcut: "(i)", mode: "import" },
  { icon: "➕", label: "Create Table", shortcut: "(c)", mode: "create_table" },
  { icon: "🔗", label: "Add Edge", shortcut: "(e)", mode: "add_edge" },
  { icon: "🗑️", label: "Remove", shortcut: "(del)", mode: "remove", variant: "danger" },
  { icon: "💣", label: "Remove All", mode: "remove_all", variant: "danger" },
  { icon: "📷", label: "Screenshot", mode: "screenshot" },
  { icon: "💻", label: "Console", mode: "console" },
  { icon: "📝", label: "Text Editor", mode: "text_editor" },
  { icon: "⚖️", label: "Comparator", mode: "comparator" },
];

// Groups separated by visual dividers
const BUTTON_GROUPS: ActiveMode[][] = [
  ["import", "create_table"],
  ["add_edge"],
  ["remove", "remove_all"],
  ["screenshot", "console", "text_editor", "comparator"],
];

export default function Footer({ activeMode = "none", onModeChange }: FooterProps) {
  const handleClick = (mode: ActiveMode) => {
    if (onModeChange) {
      onModeChange(activeMode === mode ? "none" : mode);
    }
  };

  const buttonMap = Object.fromEntries(TOOLBAR_BUTTONS.map((b) => [b.mode, b]));

  // Connection Status Polling
  const [status, setStatus] = useState<"checking" | "connected" | "disconnected">("checking");

  useEffect(() => {
    let active = true;
    const checkStatus = async () => {
      try {
        await api.status();
        if (active) setStatus("connected");
      } catch {
        if (active) setStatus("disconnected");
      }
    };

    checkStatus();
    const interval = setInterval(checkStatus, 8000);

    return () => {
      active = false;
      clearInterval(interval);
    };
  }, []);

  const getStatusColor = () => {
    if (status === "connected") return "var(--color-success)";
    if (status === "disconnected") return "var(--color-error)";
    return "var(--color-warning)";
  };

  const getStatusLabel = () => {
    if (status === "connected") return "Connected";
    if (status === "disconnected") return "Disconnected";
    return "Connecting...";
  };

  return (
    <footer
      style={{
        height: "var(--footer-height)",
        background: "var(--bg-secondary)",
        borderTop: "1px solid var(--border-subtle)",
        display: "flex",
        alignItems: "center",
        padding: "0 10px",
        gap: "2px",
        flexShrink: 0,
        overflowX: "auto",
        overflowY: "hidden",
      }}
    >
      {BUTTON_GROUPS.map((group, gi) => (
        <React.Fragment key={gi}>
          {gi > 0 && <div className="separator" />}
          {group.map((mode) => {
            const btn = buttonMap[mode];
            return (
              <IconButton
                key={mode}
                icon={btn.icon}
                label={btn.label}
                shortcut={btn.shortcut}
                active={activeMode === mode}
                variant={btn.variant}
                onClick={() => handleClick(mode)}
                tooltip={btn.label}
              />
            );
          })}
        </React.Fragment>
      ))}

      {/* Right side: status indicator */}
      <div style={{ flex: 1 }} />
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: "6px",
          paddingLeft: "10px",
          borderLeft: "1px solid var(--border-subtle)",
          color: "var(--text-muted)",
          fontSize: "11px",
          flexShrink: 0,
        }}
      >
        <span
          style={{
            width: "6px",
            height: "6px",
            borderRadius: "50%",
            background: getStatusColor(),
            display: "inline-block",
            boxShadow: `0 0 6px ${getStatusColor()}`,
            transition: "all var(--transition-base)",
          }}
        />
        {getStatusLabel()}
      </div>
    </footer>
  );
}
