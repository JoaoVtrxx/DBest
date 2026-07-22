"use client";

import React, { useState, useCallback } from "react";
import dynamic from "next/dynamic";
import MainLayout from "@/components/MainLayout";
import { ActiveMode } from "@/components/Footer";
import SidebarLeft from "@/components/SidebarLeft";
import SidebarRight from "@/components/SidebarRight";
import ModalManager from "@/components/modals/ModalManager";
import { useCanvasStore, OperatorNodeData } from "@/store/useCanvasStore";
import { useModalsStore, ComparePlan } from "@/store/useModalsStore";
import { serializeCanvasToQuery } from "@/lib/querySerializer";

// Canvas must be client-only — @xyflow/react has no SSR support
const QueryCanvas = dynamic(() => import("@/components/QueryCanvas"), { ssr: false });

// ── Page ──────────────────────────────────────────────────────────────────────
export default function Home() {
  const [activeMode, setActiveMode] = useState<ActiveMode>("none");

  // Connect undo/redo state from canvas store to header buttons
  const { canUndo, canRedo, undo, redo } = useCanvasStore();
  const { openComparator } = useModalsStore();

  const handleModeChange = useCallback(
    (mode: ActiveMode) => {
      if (mode === "comparator") {
        // Desktop-style comparison: gather the plans the user marked on the main
        // canvas (right-click → Mark), serialize each from its node as a root, and
        // open the comparison window. Comparator is a one-shot action, not a mode.
        const { nodes, edges } = useCanvasStore.getState();
        const plans: ComparePlan[] = nodes
          .filter((n) => (n.data as OperatorNodeData).isMarked)
          .map((n) => {
            const d = n.data as Record<string, unknown>;
            return {
              id: n.id,
              label: String(d.label ?? d.tableName ?? n.id),
              graph: serializeCanvasToQuery(n.id, nodes, edges),
            };
          });
        openComparator(plans);
        return;
      }
      setActiveMode(mode);
    },
    [openComparator]
  );

  return (
    <>
      <MainLayout
        leftPanel={<SidebarLeft />}
        canvas={
          <div style={{ display: "flex", flexDirection: "column", width: "100%", height: "100%" }}>
            <div style={{ flex: 1, position: "relative", minHeight: 0 }}>
              <QueryCanvas />
            </div>
          </div>
        }
        rightPanel={<SidebarRight />}
        canUndo={canUndo}
        canRedo={canRedo}
        onUndo={undo}
        onRedo={redo}
        activeMode={activeMode}
        onModeChange={handleModeChange}
      />
      <ModalManager />
    </>
  );
}
