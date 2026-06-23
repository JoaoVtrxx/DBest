/**
 * Session serializer — saves and restores the full canvas + tables state.
 * Uses browser localStorage for simple persistence (no server roundtrip needed).
 */

import { DBTable } from "@/store/useTablesStore";
import { Node as FlowNode, Edge } from "@xyflow/react";

const STORAGE_KEY = "dbest_session";

export interface SavedSession {
  version: 1;
  savedAt: string;
  tables: DBTable[];
  canvasNodes: FlowNode[];
  canvasEdges: Edge[];
}

export function saveSessionToStorage(
  tables: DBTable[],
  nodes: FlowNode[],
  edges: Edge[]
): void {
  if (typeof window === "undefined") return;
  const session: SavedSession = {
    version: 1,
    savedAt: new Date().toISOString(),
    tables,
    canvasNodes: nodes,
    canvasEdges: edges,
  };
  localStorage.setItem(STORAGE_KEY, JSON.stringify(session));
}

export function loadSessionFromStorage(): SavedSession | null {
  if (typeof window === "undefined") return null;
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) return null;
  try {
    const session = JSON.parse(raw) as SavedSession;
    if (session.version !== 1) return null;
    return session;
  } catch {
    return null;
  }
}

export function clearSession(): void {
  if (typeof window === "undefined") return;
  localStorage.removeItem(STORAGE_KEY);
}

/** Download session as a .dbest.json file */
export function downloadSession(
  tables: DBTable[],
  nodes: FlowNode[],
  edges: Edge[]
): void {
  const session: SavedSession = {
    version: 1,
    savedAt: new Date().toISOString(),
    tables,
    canvasNodes: nodes,
    canvasEdges: edges,
  };
  const blob = new Blob([JSON.stringify(session, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `dbest_session_${new Date().toISOString().slice(0, 10)}.json`;
  a.click();
  URL.revokeObjectURL(url);
}

/** Upload a .dbest.json file and return the parsed session */
export function uploadSession(): Promise<SavedSession> {
  return new Promise((resolve, reject) => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = ".json,.dbest.json";
    input.onchange = async () => {
      const file = input.files?.[0];
      if (!file) { reject(new Error("No file selected")); return; }
      try {
        const text = await file.text();
        const session = JSON.parse(text) as SavedSession;
        if (session.version !== 1) { reject(new Error("Incompatible session file")); return; }
        resolve(session);
      } catch (e) {
        reject(e);
      }
    };
    input.oncancel = () => reject(new Error("Cancelled"));
    input.click();
  });
}
