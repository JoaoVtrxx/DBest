"use client";

import React, { useRef } from "react";
import { OperatorDef } from "@/data/operators";

interface OperatorButtonProps {
  operator: OperatorDef;
  groupColor: string;
  onAdd?: (operator: OperatorDef) => void;
}

export default function OperatorButton({ operator, groupColor, onAdd }: OperatorButtonProps) {
  const hintRef = useRef<HTMLSpanElement>(null);

  const handleDragStart = (e: React.DragEvent) => {
    e.dataTransfer.setData(
      "application/dbest-operator",
      JSON.stringify({
        operatorType: operator.operatorType,
        displayName: operator.displayName,
      })
    );
    e.dataTransfer.effectAllowed = "copy";
  };

  const showHint = () => { if (hintRef.current) hintRef.current.style.opacity = "1"; };
  const hideHint = () => { if (hintRef.current) hintRef.current.style.opacity = "0"; };

  return (
    <div
      draggable
      onDragStart={handleDragStart}
      onClick={() => onAdd?.(operator)}
      title={operator.description}
      style={{
        display: "flex",
        alignItems: "center",
        gap: "8px",
        padding: "5px 10px 5px 8px",
        borderRadius: "var(--radius-sm)",
        cursor: "grab",
        userSelect: "none",
        transition: "all var(--transition-fast)",
        border: "1px solid transparent",
      }}
      onMouseEnter={(e) => {
        const el = e.currentTarget as HTMLDivElement;
        el.style.background = "var(--bg-hover)";
        el.style.borderColor = "var(--border-subtle)";
        showHint();
      }}
      onMouseLeave={(e) => {
        const el = e.currentTarget as HTMLDivElement;
        el.style.background = "transparent";
        el.style.borderColor = "transparent";
        hideHint();
      }}
      onMouseDown={(e) => { (e.currentTarget as HTMLDivElement).style.cursor = "grabbing"; }}
      onMouseUp={(e) => { (e.currentTarget as HTMLDivElement).style.cursor = "grab"; }}
    >
      {/* Symbol badge */}
      <span
        style={{
          display: "inline-flex",
          alignItems: "center",
          justifyContent: "center",
          minWidth: "22px",
          height: "20px",
          borderRadius: "3px",
          background: `${groupColor}18`,
          color: groupColor,
          fontSize: "11px",
          fontWeight: 700,
          fontFamily: "var(--font-mono, monospace)",
          flexShrink: 0,
          padding: "0 3px",
        }}
      >
        {operator.symbol}
      </span>

      {/* Name */}
      <span
        className="truncate"
        style={{
          fontSize: "11.5px",
          color: "var(--text-secondary)",
          flex: 1,
          lineHeight: 1.3,
        }}
      >
        {operator.displayName}
      </span>

      {/* Drag hint — shown via ref on hover, no inline <style> needed */}
      <span
        ref={hintRef}
        style={{
          fontSize: "9px",
          color: "var(--text-disabled)",
          opacity: 0,
          transition: "opacity 120ms ease",
          flexShrink: 0,
        }}
      >
        ⠿
      </span>
    </div>
  );
}
