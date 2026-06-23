"use client";

import React, { useState } from "react";
import ModalBase, { FieldGroup, StyledInput, StyledSelect, StyledFileInput } from "./ModalBase";
import { api } from "@/lib/api";
import { useTablesStore } from "@/store/useTablesStore";

interface ImportCSVModalProps {
  onClose: () => void;
}

const SEPARATORS = [
  { label: "Comma (,)", value: "," },
  { label: "Semicolon (;)", value: ";" },
  { label: "Tab (\\t)", value: "\t" },
  { label: "Pipe (|)", value: "|" },
];

export default function ImportCSVModal({ onClose }: ImportCSVModalProps) {
  const { addTable } = useTablesStore();

  const [file, setFile] = useState<File | null>(null);
  const [separator, setSeparator] = useState(",");
  const [customSep, setCustomSep] = useState("");
  const [hasHeader, setHasHeader] = useState(true);
  const [tableName, setTableName] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const effectiveSep = separator === "custom" ? customSep : separator;
  const isValid = file !== null && effectiveSep.trim() !== "";

  const handleConfirm = async () => {
    if (!isValid || !file) return;
    setLoading(true);
    setError(null);
    try {
      const schema = await api.tables.upload(file, {
        separator: effectiveSep,
        hasHeader,
        tableName: tableName.trim() || undefined,
      });
      addTable({
        id: schema.tableId,
        name: schema.tableName,
        type: "csv",
        columns: schema.columns.map((c) => c.name),
      });
      onClose();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to import table");
    } finally {
      setLoading(false);
    }
  };

  return (
    <ModalBase
      title="Import CSV Table"
      subtitle="Load a comma-separated values file as a table"
      icon="📄"
      accentColor="#16a34a"
      onClose={onClose}
      onConfirm={handleConfirm}
      confirmLabel={loading ? "Importing…" : "Import"}
      confirmDisabled={!isValid || loading}
      width={480}
    >
      <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
        {error && (
          <div style={{ background: "#dc262612", border: "1px solid #dc262630", borderRadius: "var(--radius-sm)", padding: "10px 12px", fontSize: "12px", color: "#dc2626" }}>
            ⚠️ {error}
          </div>
        )}

        <FieldGroup label="CSV File">
          <StyledFileInput onChange={setFile} accept=".csv" />
          <p style={{ fontSize: "10px", color: "var(--text-muted)", marginTop: "4px" }}>
            The file will be uploaded to the server and imported as a DBest table.
          </p>
        </FieldGroup>

        <FieldGroup label="Separator">
          <StyledSelect value={separator} onChange={setSeparator}>
            {SEPARATORS.map((s) => (
              <option key={s.value} value={s.value}>{s.label}</option>
            ))}
            <option value="custom">Custom…</option>
          </StyledSelect>
          {separator === "custom" && (
            <div style={{ marginTop: "6px" }}>
              <StyledInput value={customSep} onChange={setCustomSep} placeholder="Enter separator character" />
            </div>
          )}
        </FieldGroup>

        <FieldGroup label="Options">
          <label style={{ display: "flex", alignItems: "center", gap: "10px", cursor: "pointer", fontSize: "12px", color: "var(--text-secondary)" }}>
            <input
              type="checkbox"
              checked={hasHeader}
              onChange={(e) => setHasHeader(e.target.checked)}
              style={{ accentColor: "#16a34a", width: 14, height: 14 }}
            />
            First row is the header (column names)
          </label>
        </FieldGroup>

        <FieldGroup label="Table Name (optional)">
          <StyledInput
            value={tableName}
            onChange={setTableName}
            placeholder="Defaults to filename without extension"
          />
        </FieldGroup>
      </div>
    </ModalBase>
  );
}
