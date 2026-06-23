"use client";

import React, { useState, useRef, useEffect } from "react";

interface RenameInlineProps {
  currentName: string;
  onConfirm: (newName: string) => void;
  onCancel: () => void;
}

export default function RenameInline({ currentName, onConfirm, onCancel }: RenameInlineProps) {
  const [value, setValue] = useState(currentName);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
    inputRef.current?.select();
  }, []);

  const handleKey = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && value.trim()) {
      onConfirm(value.trim());
    } else if (e.key === "Escape") {
      onCancel();
    }
  };

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 9998,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "rgba(0,0,0,0.25)",
      }}
      onClick={onCancel}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          background: "var(--bg-elevated)",
          border: "1px solid var(--border-default)",
          borderRadius: "var(--radius-lg)",
          boxShadow: "var(--shadow-lg)",
          padding: "20px 24px",
          width: "320px",
          animation: "fadeIn 120ms ease forwards",
        }}
      >
        <p
          style={{
            fontSize: "13px",
            fontWeight: 600,
            color: "var(--text-primary)",
            marginBottom: "12px",
          }}
        >
          Rename Table
        </p>
        <input
          ref={inputRef}
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={handleKey}
          style={{
            width: "100%",
            padding: "7px 10px",
            background: "var(--bg-tertiary)",
            border: "1px solid var(--border-default)",
            borderRadius: "var(--radius-sm)",
            color: "var(--text-primary)",
            fontSize: "13px",
            fontFamily: "var(--font-sans)",
            outline: "none",
            boxSizing: "border-box",
          }}
          onFocus={(e) => (e.target.style.borderColor = "var(--accent)")}
          onBlur={(e) => (e.target.style.borderColor = "var(--border-default)")}
        />
        <div style={{ display: "flex", gap: "8px", marginTop: "14px", justifyContent: "flex-end" }}>
          <button
            onClick={onCancel}
            style={{
              padding: "5px 14px",
              background: "transparent",
              border: "1px solid var(--border-default)",
              borderRadius: "var(--radius-sm)",
              color: "var(--text-secondary)",
              fontSize: "12px",
              cursor: "pointer",
              fontFamily: "var(--font-sans)",
            }}
          >
            Cancel
          </button>
          <button
            onClick={() => value.trim() && onConfirm(value.trim())}
            style={{
              padding: "5px 14px",
              background: "var(--accent)",
              border: "none",
              borderRadius: "var(--radius-sm)",
              color: "#fff",
              fontSize: "12px",
              fontWeight: 600,
              cursor: "pointer",
              fontFamily: "var(--font-sans)",
            }}
          >
            Rename
          </button>
        </div>
      </div>
    </div>
  );
}
