"use client";

import React, { useState } from "react";
import ModalBase, { FieldGroup, StyledInput, StyledFileInput } from "./ModalBase";
import { api } from "@/lib/api";
import { useTablesStore } from "@/store/useTablesStore";

export function ImportXMLModal({ onClose }: { onClose: () => void }) {
  const { addTable } = useTablesStore();
  const [file, setFile] = useState<File | null>(null);
  const [tableName, setTableName] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleConfirm = async () => {
    if (!file) return;
    setLoading(true); setError(null);
    try {
      const schema = await api.tables.upload(file, { tableName: tableName.trim() || undefined });
      addTable({ id: schema.tableId, name: schema.tableName, type: "xml", columns: schema.columns.map((c) => c.name) });
      onClose();
    } catch (e) { setError(e instanceof Error ? e.message : "Failed"); }
    finally { setLoading(false); }
  };

  return (
    <ModalBase title="Import XML Table" subtitle="Load an XML file as a table using DBest's XMLRecognizer" icon="🗂️" accentColor="#db2777" onClose={onClose} onConfirm={handleConfirm} confirmLabel={loading ? "Importing…" : "Import"} confirmDisabled={!file || loading} width={480}>
      <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
        {error && <div style={{ background: "#dc262612", border: "1px solid #dc262630", borderRadius: "var(--radius-sm)", padding: "10px 12px", fontSize: "12px", color: "#dc2626" }}>⚠️ {error}</div>}
        <FieldGroup label="XML File">
          <StyledFileInput onChange={setFile} accept=".xml" />
        </FieldGroup>
        <FieldGroup label="Table Name (optional)">
          <StyledInput value={tableName} onChange={setTableName} placeholder="Defaults to filename" />
        </FieldGroup>
      </div>
    </ModalBase>
  );
}

export function ImportMemoryModal({ onClose }: { onClose: () => void }) {
  const { addTable } = useTablesStore();
  const [tableName, setTableName] = useState("");
  const [columns, setColumns] = useState<string[]>(["id", "name"]);
  const [newCol, setNewCol] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const addCol = () => {
    const trimmed = newCol.trim();
    if (trimmed && !columns.includes(trimmed)) {
      setColumns((prev) => [...prev, trimmed]);
      setNewCol("");
    }
  };

  const removeCol = (col: string) => setColumns((prev) => prev.filter((c) => c !== col));

  const handleConfirm = async () => {
    if (!tableName.trim() || columns.length === 0) return;
    setLoading(true); setError(null);
    try {
      const schema = await api.tables.importMemory({ tableName: tableName.trim(), columns });
      addTable({ id: schema.tableId, name: schema.tableName, type: "memory", columns });
      onClose();
    } catch (e) { setError(e instanceof Error ? e.message : "Failed"); }
    finally { setLoading(false); }
  };

  return (
    <ModalBase title="Create Memory Table" subtitle="Create an in-memory B-Tree table with custom schema" icon="🌲" accentColor="#2563eb" onClose={onClose} onConfirm={handleConfirm} confirmLabel={loading ? "Creating…" : "Create"} confirmDisabled={!tableName.trim() || columns.length === 0 || loading} width={460}>
      <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
        {error && <div style={{ background: "#dc262612", border: "1px solid #dc262630", borderRadius: "var(--radius-sm)", padding: "10px 12px", fontSize: "12px", color: "#dc2626" }}>⚠️ {error}</div>}
        <FieldGroup label="Table Name">
          <StyledInput value={tableName} onChange={setTableName} placeholder="e.g. my_table" />
        </FieldGroup>
        <FieldGroup label="Columns">
          <div style={{ display: "flex", flexWrap: "wrap", gap: "4px", marginBottom: "8px" }}>
            {columns.map((col) => (
              <span key={col} style={{ display: "flex", alignItems: "center", gap: "4px", background: "#eff6ff", border: "1px solid #2563eb30", borderRadius: "var(--radius-sm)", padding: "2px 8px", fontSize: "11px", fontFamily: "var(--font-mono, monospace)", color: "#2563eb" }}>
                {col}
                <button onClick={() => removeCol(col)} style={{ background: "none", border: "none", cursor: "pointer", color: "#2563eb", fontSize: "12px", lineHeight: 1, padding: 0 }}>✕</button>
              </span>
            ))}
          </div>
          <div style={{ display: "flex", gap: "6px" }}>
            <div style={{ flex: 1 }}>
              <StyledInput value={newCol} onChange={setNewCol} placeholder="New column name" />
            </div>
            <button onClick={addCol} style={{ padding: "7px 12px", background: "var(--accent)", border: "none", borderRadius: "var(--radius-sm)", color: "#fff", fontSize: "12px", cursor: "pointer", fontFamily: "var(--font-sans)", fontWeight: 600 }}>Add</button>
          </div>
        </FieldGroup>
      </div>
    </ModalBase>
  );
}

// ── Import BTree (.dat + .head) ─────────────────────────────────────────────────
export function ImportDatModal({ onClose }: { onClose: () => void }) {
  const { addTable } = useTablesStore();
  const [datFile, setDatFile] = useState<File | null>(null);
  const [headFile, setHeadFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // A BTree .dat file is self-describing (it embeds its own schema), so the .dat
  // alone is enough. The .head is optional and only used when it carries a fuller
  // schema.
  const handleConfirm = async () => {
    if (!datFile) return;
    setLoading(true); setError(null);
    try {
      const schema = await api.tables.uploadBtree({ dat: datFile, head: headFile });
      addTable({ id: schema.tableId, name: schema.tableName, type: "fyi", columns: schema.columns.map((c) => c.name) });
      onClose();
    } catch (e) { setError(e instanceof Error ? e.message : "Failed to import BTree table"); }
    finally { setLoading(false); }
  };

  return (
    <ModalBase
      title="Open BTree Table (.dat)"
      subtitle="Import a BTree table file — the .head is optional"
      icon="💾"
      accentColor="#7c3aed"
      onClose={onClose}
      onConfirm={handleConfirm}
      confirmLabel={loading ? "Importing…" : "Open"}
      confirmDisabled={!datFile || loading}
      width={520}
    >
      <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
        {error && <div style={{ background: "#dc262612", border: "1px solid #dc262630", borderRadius: "var(--radius-sm)", padding: "10px 12px", fontSize: "12px", color: "#dc2626" }}>⚠️ {error}</div>}
        <FieldGroup label="Data File (.dat)">
          <StyledFileInput onChange={setDatFile} accept=".dat" />
          <p style={{ fontSize: "10px", color: "var(--text-muted)", marginTop: "4px" }}>
            The BTree file carries its own schema, so this is usually all you need.
          </p>
        </FieldGroup>
        <FieldGroup label="Header File (.head) — optional">
          <StyledFileInput onChange={setHeadFile} accept=".head" />
          <p style={{ fontSize: "10px", color: "var(--text-muted)", marginTop: "4px" }}>
            Only needed if your <strong>.dat</strong> came with a matching <strong>.head</strong> that
            defines the columns.
          </p>
        </FieldGroup>
      </div>
    </ModalBase>
  );
}
