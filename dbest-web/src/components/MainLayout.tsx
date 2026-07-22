"use client";

import React, { ReactNode } from "react";
import Header from "./Header";
import Footer, { ActiveMode } from "./Footer";

interface MainLayoutProps {
  leftPanel: ReactNode;
  canvas: ReactNode;
  rightPanel: ReactNode;
  // Header props
  canUndo?: boolean;
  canRedo?: boolean;
  onUndo?: () => void;
  onRedo?: () => void;
  // Footer props
  activeMode?: ActiveMode;
  onModeChange?: (mode: ActiveMode) => void;
}

export default function MainLayout({
  leftPanel,
  canvas,
  rightPanel,
  canUndo,
  canRedo,
  onUndo,
  onRedo,
  activeMode,
  onModeChange,
}: MainLayoutProps) {
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        height: "100%",
        width: "100%",
        background: "var(--bg-primary)",
        overflow: "hidden",
      }}
    >
      {/* ─── Top Bar ─── */}
      <Header
        canUndo={canUndo}
        canRedo={canRedo}
        onUndo={onUndo}
        onRedo={onRedo}
      />

      {/* ─── Main Content Row ─── */}
      <div
        style={{
          flex: 1,
          display: "flex",
          overflow: "hidden",
          minHeight: 0,
        }}
      >
        {/* Left Sidebar — Tables */}
        <aside
          style={{
            width: "var(--sidebar-left-width)",
            flexShrink: 0,
            background: "var(--bg-secondary)",
            borderRight: "1px solid var(--border-subtle)",
            display: "flex",
            flexDirection: "column",
            overflowY: "auto",
            overflowX: "hidden",
          }}
        >
          {leftPanel}
        </aside>

        {/* Canvas Area */}
        <main
          style={{
            flex: 1,
            position: "relative",
            overflow: "hidden",
            background: "var(--bg-primary)",
            minWidth: 0,
          }}
        >
          {canvas}
        </main>

        {/* Right Sidebar — Operators */}
        <aside
          style={{
            width: "var(--sidebar-right-width)",
            flexShrink: 0,
            background: "var(--bg-secondary)",
            borderLeft: "1px solid var(--border-subtle)",
            display: "flex",
            flexDirection: "column",
            overflowY: "auto",
            overflowX: "hidden",
          }}
        >
          {rightPanel}
        </aside>
      </div>

      {/* ─── Bottom Bar ─── */}
      <Footer activeMode={activeMode} onModeChange={onModeChange} />
    </div>
  );
}
