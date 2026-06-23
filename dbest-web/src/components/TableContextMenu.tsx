"use client";

import React, { useEffect, useRef } from "react";

interface ContextMenuItem {
  label: string;
  icon?: string;
  onClick: () => void;
  danger?: boolean;
  divider?: boolean;
}

interface TableContextMenuProps {
  x: number;
  y: number;
  items: ContextMenuItem[];
  onClose: () => void;
}

export default function TableContextMenu({
  x,
  y,
  items,
  onClose,
}: TableContextMenuProps) {
  const menuRef = useRef<HTMLDivElement>(null);

  // Close on outside click or Escape
  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        onClose();
      }
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

  // Adjust position so it never goes off-screen
  const adjustedX = Math.min(x, window.innerWidth - 200);
  const adjustedY = Math.min(y, window.innerHeight - items.length * 36 - 16);

  return (
    <div
      ref={menuRef}
      style={{
        position: "fixed",
        top: adjustedY,
        left: adjustedX,
        minWidth: "180px",
        background: "var(--bg-elevated)",
        border: "1px solid var(--border-default)",
        borderRadius: "var(--radius-md)",
        boxShadow: "var(--shadow-lg)",
        zIndex: 9999,
        padding: "4px 0",
        animation: "fadeIn 100ms ease forwards",
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
            onClick={() => {
              item.onClick();
              onClose();
            }}
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
            {item.icon && (
              <span style={{ fontSize: "13px", width: "16px", textAlign: "center" }}>
                {item.icon}
              </span>
            )}
            {item.label}
          </button>
        </React.Fragment>
      ))}
    </div>
  );
}
