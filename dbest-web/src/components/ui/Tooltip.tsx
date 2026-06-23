"use client";

import React, { ReactNode, useState, useRef } from "react";

interface TooltipProps {
  content: string;
  children: ReactNode;
  position?: "top" | "bottom" | "left" | "right";
  delay?: number;
}

export default function Tooltip({
  content,
  children,
  position = "top",
  delay = 300,
}: TooltipProps) {
  const [visible, setVisible] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const show = () => {
    timerRef.current = setTimeout(() => setVisible(true), delay);
  };
  const hide = () => {
    if (timerRef.current) clearTimeout(timerRef.current);
    setVisible(false);
  };

  const positionStyle: React.CSSProperties = {
    top: position === "bottom" ? "calc(100% + 6px)" : position === "top" ? "auto" : "50%",
    bottom: position === "top" ? "calc(100% + 6px)" : "auto",
    left:
      position === "right"
        ? "calc(100% + 6px)"
        : position === "left"
        ? "auto"
        : "50%",
    right: position === "left" ? "calc(100% + 6px)" : "auto",
    transform:
      position === "top" || position === "bottom"
        ? "translateX(-50%)"
        : "translateY(-50%)",
  };

  return (
    <div
      style={{ position: "relative", display: "inline-flex" }}
      onMouseEnter={show}
      onMouseLeave={hide}
    >
      {children}
      {visible && content && (
        <div
          style={{
            position: "absolute",
            ...positionStyle,
            background: "var(--bg-elevated)",
            border: "1px solid var(--border-default)",
            borderRadius: "var(--radius-sm)",
            padding: "4px 8px",
            fontSize: "11px",
            color: "var(--text-secondary)",
            whiteSpace: "nowrap",
            zIndex: 9999,
            pointerEvents: "none",
            animation: "fadeIn 120ms ease forwards",
            boxShadow: "var(--shadow-md)",
          }}
        >
          {content}
        </div>
      )}
    </div>
  );
}
