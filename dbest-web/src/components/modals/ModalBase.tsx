"use client";

import React, { ReactNode, useEffect } from "react";

interface ModalBaseProps {
  title: string;
  subtitle?: string;
  icon?: string;
  accentColor?: string;
  onClose: () => void;
  onConfirm?: () => void;
  confirmLabel?: string;
  confirmDisabled?: boolean;
  width?: number;
  children: ReactNode;
  footer?: ReactNode; // custom footer override
}

export default function ModalBase({
  title,
  subtitle,
  icon = "⚙️",
  accentColor = "var(--accent)",
  onClose,
  onConfirm,
  confirmLabel = "Apply",
  confirmDisabled = false,
  width = 480,
  children,
  footer,
}: ModalBaseProps) {
  // Close on Escape
  useEffect(() => {
    const handle = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      if (e.key === "Enter" && onConfirm && !confirmDisabled) onConfirm();
    };
    document.addEventListener("keydown", handle);
    return () => document.removeEventListener("keydown", handle);
  }, [onClose, onConfirm, confirmDisabled]);

  return (
    // Backdrop
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 9000,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "rgba(0,0,0,0.35)",
        backdropFilter: "blur(3px)",
        animation: "fadeIn 120ms ease",
      }}
      onClick={onClose}
    >
      {/* Modal container */}
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          width,
          maxWidth: "calc(100vw - 32px)",
          maxHeight: "calc(100vh - 60px)",
          background: "var(--bg-elevated)",
          border: "1px solid var(--border-default)",
          borderRadius: "var(--radius-lg)",
          boxShadow: "var(--shadow-lg)",
          display: "flex",
          flexDirection: "column",
          animation: "slideDown 140ms ease",
          overflow: "hidden",
        }}
      >
        {/* Header */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "10px",
            padding: "14px 18px 12px",
            borderBottom: "1px solid var(--border-subtle)",
            flexShrink: 0,
          }}
        >
          {/* Icon circle */}
          <div
            style={{
              width: 32,
              height: 32,
              borderRadius: "8px",
              background: `${accentColor}15`,
              border: `1px solid ${accentColor}30`,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: "15px",
              flexShrink: 0,
            }}
          >
            {icon}
          </div>

          {/* Title area */}
          <div style={{ flex: 1, minWidth: 0 }}>
            <div
              style={{
                fontSize: "13px",
                fontWeight: 700,
                color: "var(--text-primary)",
                overflow: "hidden",
                textOverflow: "ellipsis",
                whiteSpace: "nowrap",
              }}
            >
              {title}
            </div>
            {subtitle && (
              <div style={{ fontSize: "11px", color: "var(--text-muted)", marginTop: "1px" }}>
                {subtitle}
              </div>
            )}
          </div>

          {/* Close button */}
          <button
            onClick={onClose}
            style={{
              width: 26,
              height: 26,
              border: "1px solid var(--border-default)",
              borderRadius: "var(--radius-sm)",
              background: "transparent",
              color: "var(--text-muted)",
              cursor: "pointer",
              fontSize: "14px",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              flexShrink: 0,
              transition: "all var(--transition-fast)",
            }}
            onMouseEnter={(e) => {
              (e.currentTarget as HTMLButtonElement).style.background = "var(--bg-hover)";
              (e.currentTarget as HTMLButtonElement).style.color = "var(--text-primary)";
            }}
            onMouseLeave={(e) => {
              (e.currentTarget as HTMLButtonElement).style.background = "transparent";
              (e.currentTarget as HTMLButtonElement).style.color = "var(--text-muted)";
            }}
          >
            ✕
          </button>
        </div>

        {/* Content */}
        <div
          style={{
            flex: 1,
            overflowY: "auto",
            padding: "16px 18px",
          }}
        >
          {children}
        </div>

        {/* Footer */}
        {footer ?? (
          <div
            style={{
              display: "flex",
              justifyContent: "flex-end",
              gap: "8px",
              padding: "12px 18px",
              borderTop: "1px solid var(--border-subtle)",
              flexShrink: 0,
            }}
          >
            <button
              onClick={onClose}
              style={{
                padding: "6px 16px",
                background: "transparent",
                border: "1px solid var(--border-default)",
                borderRadius: "var(--radius-sm)",
                color: "var(--text-secondary)",
                fontSize: "12px",
                cursor: "pointer",
                fontFamily: "var(--font-sans)",
                transition: "all var(--transition-fast)",
              }}
              onMouseEnter={(e) => {
                (e.currentTarget as HTMLButtonElement).style.background = "var(--bg-hover)";
                (e.currentTarget as HTMLButtonElement).style.color = "var(--text-primary)";
              }}
              onMouseLeave={(e) => {
                (e.currentTarget as HTMLButtonElement).style.background = "transparent";
                (e.currentTarget as HTMLButtonElement).style.color = "var(--text-secondary)";
              }}
            >
              Cancel
            </button>
            {onConfirm && (
              <button
                onClick={onConfirm}
                disabled={confirmDisabled}
                style={{
                  padding: "6px 18px",
                  background: confirmDisabled ? "var(--bg-tertiary)" : accentColor,
                  border: "none",
                  borderRadius: "var(--radius-sm)",
                  color: confirmDisabled ? "var(--text-disabled)" : "#fff",
                  fontSize: "12px",
                  fontWeight: 600,
                  cursor: confirmDisabled ? "not-allowed" : "pointer",
                  fontFamily: "var(--font-sans)",
                  transition: "all var(--transition-fast)",
                }}
              >
                {confirmLabel}
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

// ── Shared sub-components ──────────────────────────────────────────────────────

export function FieldLabel({ children }: { children: ReactNode }) {
  return (
    <div
      style={{
        fontSize: "11px",
        fontWeight: 600,
        color: "var(--text-secondary)",
        marginBottom: "5px",
        textTransform: "uppercase",
        letterSpacing: "0.05em",
      }}
    >
      {children}
    </div>
  );
}

export function FieldGroup({
  label,
  children,
  style,
}: {
  label?: string;
  children: ReactNode;
  style?: React.CSSProperties;
}) {
  return (
    <div style={{ marginBottom: "16px", ...style }}>
      {label && <FieldLabel>{label}</FieldLabel>}
      {children}
    </div>
  );
}

export function StyledSelect({
  value,
  onChange,
  children,
  placeholder,
}: {
  value: string;
  onChange: (v: string) => void;
  children: ReactNode;
  placeholder?: string;
}) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      style={{
        width: "100%",
        padding: "7px 10px",
        background: "var(--bg-tertiary)",
        border: "1px solid var(--border-default)",
        borderRadius: "var(--radius-sm)",
        color: value ? "var(--text-primary)" : "var(--text-muted)",
        fontSize: "12px",
        fontFamily: "var(--font-sans)",
        outline: "none",
        cursor: "pointer",
        appearance: "auto",
      }}
      onFocus={(e) => (e.target.style.borderColor = "var(--accent)")}
      onBlur={(e) => (e.target.style.borderColor = "var(--border-default)")}
    >
      {placeholder && (
        <option value="" disabled>
          {placeholder}
        </option>
      )}
      {children}
    </select>
  );
}

export function StyledInput({
  value,
  onChange,
  placeholder,
  type = "text",
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  type?: string;
}) {
  return (
    <input
      type={type}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      style={{
        width: "100%",
        padding: "7px 10px",
        background: "var(--bg-tertiary)",
        border: "1px solid var(--border-default)",
        borderRadius: "var(--radius-sm)",
        color: "var(--text-primary)",
        fontSize: "12px",
        fontFamily: "var(--font-sans)",
        outline: "none",
        boxSizing: "border-box",
      }}
      onFocus={(e) => (e.target.style.borderColor = "var(--accent)")}
      onBlur={(e) => (e.target.style.borderColor = "var(--border-default)")}
    />
  );
}

export function StyledFileInput({
  onChange,
  accept,
}: {
  onChange: (file: File | null) => void;
  accept?: string;
}) {
  return (
    <input
      type="file"
      accept={accept}
      onChange={(e) => {
        const file = e.target.files?.[0] || null;
        onChange(file);
      }}
      style={{
        width: "100%",
        padding: "7px 10px",
        background: "var(--bg-tertiary)",
        border: "1px dashed var(--border-default)",
        borderRadius: "var(--radius-sm)",
        color: "var(--text-primary)",
        fontSize: "12px",
        fontFamily: "var(--font-sans)",
        outline: "none",
        boxSizing: "border-box",
        cursor: "pointer",
      }}
      onFocus={(e) => (e.target.style.borderColor = "var(--accent)")}
      onBlur={(e) => (e.target.style.borderColor = "var(--border-default)")}
    />
  );
}

