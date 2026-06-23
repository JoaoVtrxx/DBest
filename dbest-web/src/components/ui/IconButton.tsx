"use client";

import React, { ReactNode } from "react";

interface IconButtonProps {
  icon: string | ReactNode;
  label?: string;
  onClick?: () => void;
  active?: boolean;
  disabled?: boolean;
  tooltip?: string;
  variant?: "default" | "ghost" | "danger";
  shortcut?: string;
  className?: string;
}

export default function IconButton({
  icon,
  label,
  onClick,
  active = false,
  disabled = false,
  tooltip,
  variant = "default",
  shortcut,
  className = "",
}: IconButtonProps) {
  const baseStyle: React.CSSProperties = {
    display: "inline-flex",
    alignItems: "center",
    gap: "6px",
    padding: "4px 9px",
    borderRadius: "var(--radius-sm)",
    border: "1px solid transparent",
    background: "transparent",
    color: disabled
      ? "var(--text-disabled)"
      : active
      ? "var(--accent)"
      : "var(--text-secondary)",
    fontSize: "12px",
    fontFamily: "var(--font-sans)",
    cursor: disabled ? "not-allowed" : "pointer",
    transition: "all var(--transition-fast)",
    opacity: disabled ? 0.5 : 1,
    userSelect: "none",
    whiteSpace: "nowrap",
    flexShrink: 0,
    ...(active && {
      background: "var(--accent-dim)",
      borderColor: "var(--accent)",
      color: "var(--accent)",
    }),
    ...(variant === "danger" && !disabled && {
      color: "var(--color-error)",
    }),
  };

  return (
    <button
      title={tooltip ?? label}
      style={baseStyle}
      onClick={disabled ? undefined : onClick}
      disabled={disabled}
      className={`icon-btn${active ? " active" : ""}${disabled ? " disabled" : ""} ${className}`}
      onMouseEnter={(e) => {
        if (disabled) return;
        const el = e.currentTarget;
        if (!active) {
          el.style.background = "var(--bg-hover)";
          el.style.borderColor = "var(--border-default)";
          el.style.color =
            variant === "danger" ? "var(--color-error)" : "var(--text-primary)";
        }
      }}
      onMouseLeave={(e) => {
        if (disabled) return;
        const el = e.currentTarget;
        if (!active) {
          el.style.background = "transparent";
          el.style.borderColor = "transparent";
          el.style.color =
            variant === "danger"
              ? "var(--color-error)"
              : "var(--text-secondary)";
        }
      }}
    >
      <span style={{ fontSize: "14px", lineHeight: 1 }}>{icon}</span>
      {label && <span>{label}</span>}
      {shortcut && (
        <span
          style={{
            fontSize: "10px",
            color: "var(--text-muted)",
            marginLeft: "2px",
          }}
        >
          {shortcut}
        </span>
      )}
    </button>
  );
}
