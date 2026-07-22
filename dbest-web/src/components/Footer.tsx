"use client";

import { useState, useEffect } from "react";
import IconButton from "./ui/IconButton";
import { api } from "@/lib/api";

// The Comparator is the only bottom-bar tool. The desktop toolbar has more
// (Import, Create Table, Add Edge, Remove, Remove All, Screenshot, Console/Text
// Editor DSL), but on the web each of those is either done elsewhere — importing
// from the tables sidebar, creating a Memory table there, removing a node with
// Delete or its context menu, connecting by dragging between handles — or has no
// web backing (Screenshot, DSL tools). So they were dropped instead of shipping
// buttons that do nothing.
export type ActiveMode = "none" | "comparator";

interface FooterProps {
  activeMode?: ActiveMode;
  onModeChange?: (mode: ActiveMode) => void;
}

interface ToolbarButton {
  icon: string;
  label: string;
  mode: ActiveMode;
}

const TOOLBAR_BUTTONS: ToolbarButton[] = [
  { icon: "⚖️", label: "Comparator", mode: "comparator" },
];

export default function Footer({ activeMode = "none", onModeChange }: FooterProps) {
  const handleClick = (mode: ActiveMode) => {
    if (onModeChange) {
      onModeChange(activeMode === mode ? "none" : mode);
    }
  };

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
      {TOOLBAR_BUTTONS.map((btn) => (
        <IconButton
          key={btn.mode}
          icon={btn.icon}
          label={btn.label}
          active={activeMode === btn.mode}
          onClick={() => handleClick(btn.mode)}
          tooltip={btn.label}
        />
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
