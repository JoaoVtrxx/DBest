"use client";

import React, { useState, useCallback } from "react";
import dynamic from "next/dynamic";
import MainLayout from "@/components/MainLayout";
import { ActiveMode } from "@/components/Footer";
import SidebarLeft from "@/components/SidebarLeft";
import SidebarRight from "@/components/SidebarRight";
import ModalManager from "@/components/modals/ModalManager";
import { useCanvasStore } from "@/store/useCanvasStore";
import { useModalsStore } from "@/store/useModalsStore";
import { useTablesStore } from "@/store/useTablesStore";
import { api } from "@/lib/api";
import DslEditor from "@/components/DslEditor";

// Canvas must be client-only — @xyflow/react has no SSR support
const QueryCanvas = dynamic(() => import("@/components/QueryCanvas"), { ssr: false });
const Comparator = dynamic(() => import("@/components/Comparator"), { ssr: false });

// ── Page ──────────────────────────────────────────────────────────────────────
export default function Home() {
  const [activeMode, setActiveMode] = useState<ActiveMode>("none");

  // Connect undo/redo state from canvas store to header buttons
  const { canUndo, canRedo, undo, redo, loadSession } = useCanvasStore();
  const { openImport } = useModalsStore();
  const { addTable } = useTablesStore();

  const handleModeChange = useCallback((mode: ActiveMode) => {
    setActiveMode(mode);
  }, []);

  const handleOpenQuery = useCallback(() => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = ".txt";
    input.onchange = async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) return;
      try {
        const text = await file.text();
        const result = await api.dsl.parse(text);
        
        result.importedTables.forEach((t) => {
          addTable({
            id: t.tableId,
            name: t.tableName,
            type: t.type,
            columns: t.columns.map((c) => c.name),
          });
        });
        
        loadSession(result.graph.nodes, result.graph.edges);
      } catch (err) {
        alert("Failed to parse query file: " + (err instanceof Error ? err.message : String(err)));
      }
    };
    input.click();
  }, [addTable, loadSession]);

  return (
    <>
      <MainLayout
        leftPanel={<SidebarLeft />}
        canvas={
          <div style={{ display: "flex", flexDirection: "column", width: "100%", height: "100%" }}>
            {activeMode === "comparator" ? (
              <div style={{ flex: 1, position: "relative", minHeight: 0 }}>
                <Comparator />
              </div>
            ) : (
              <>
                <div style={{ flex: activeMode === "console" || activeMode === "text_editor" ? 0.6 : 1, position: "relative", minHeight: 0 }}>
                  <QueryCanvas />
                </div>
                {(activeMode === "console" || activeMode === "text_editor") && (
                  <div style={{ height: "40%", borderTop: "1px solid var(--border-subtle)", background: "var(--bg-secondary)", display: "flex", flexDirection: "column", minHeight: 180 }}>
                    <DslEditor mode={activeMode} />
                  </div>
                )}
              </>
            )}
          </div>
        }
        rightPanel={<SidebarRight />}
        canUndo={canUndo}
        canRedo={canRedo}
        onUndo={undo}
        onRedo={redo}
        activeMode={activeMode}
        onModeChange={handleModeChange}
        onOpenQuery={handleOpenQuery}
        onOpenDatabaseConnection={() => openImport("jdbc")}
        onOpenCsvTable={() => openImport("csv")}
        onOpenBTreeTable={() => openImport("dat")}
        onOpenHeadFileTable={() => openImport("head")}
      />
      <ModalManager />
    </>
  );
}
