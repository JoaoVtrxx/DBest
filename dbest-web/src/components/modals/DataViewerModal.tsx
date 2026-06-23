"use client";

import React, { useState, useEffect, useCallback } from "react";
import { Node as FlowNode } from "@xyflow/react";
import ModalBase from "./ModalBase";
import { api } from "@/lib/api";
import { DataViewerContext } from "@/store/useModalsStore";

interface DataViewerModalProps {
  node: FlowNode;
  onClose: () => void;
  ctx?: DataViewerContext | null;
}

const PAGE_SIZE = 50;
type FetchStatus = "idle" | "loading" | "success" | "error";

export default function DataViewerModal({ node, onClose, ctx }: DataViewerModalProps) {
  const data = node.data as Record<string, unknown>;
  const label = String(data.label ?? data.tableName ?? node.id);

  const [page, setPage] = useState(0);
  const [columns, setColumns] = useState<string[]>([]);
  const [rows, setRows] = useState<Record<string, string>[]>([]);
  const [totalRows, setTotalRows] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [executionMs, setExecutionMs] = useState<number | null>(null);
  const [jobId, setJobId] = useState<string | null>(ctx?.jobId ?? null);
  const [status, setStatus] = useState<FetchStatus>("idle");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const fetchPage = useCallback(async (targetPage: number, currentJobId?: string) => {
    setStatus("loading");
    setErrorMsg(null);
    try {
      const jid = currentJobId ?? jobId;

      if (jid) {
        // Subsequent pages — result already cached on backend
        const result = await api.query.result(jid, targetPage, PAGE_SIZE);
        setRows(result.rows);
        setTotalRows(result.totalRows);
        setTotalPages(result.totalPages);
        setPage(targetPage);
      } else if (ctx?.graphData) {
        // Operator query — execute the full graph
        const scan = await api.query.execute({ ...ctx.graphData, page: targetPage, pageSize: PAGE_SIZE });
        setJobId(scan.jobId);
        setExecutionMs(scan.executionTimeMs);
        setColumns(scan.columns);
        setRows(scan.rows);
        setTotalRows(scan.totalRows);
        setTotalPages(scan.totalPages);
        setPage(targetPage);
      } else if (ctx?.tableId) {
        // First scan — response includes columns, jobId, and executionTimeMs
        const scan = await api.tables.scan(ctx.tableId, targetPage, PAGE_SIZE);
        setJobId(scan.jobId);
        setExecutionMs(scan.executionTimeMs);
        setColumns(scan.columns);
        setRows(scan.rows);
        setTotalRows(scan.totalRows);
        setTotalPages(scan.totalPages);
        setPage(targetPage);
      } else {
        setStatus("error");
        setErrorMsg("No table context provided. Import a table first and connect this node.");
        return;
      }

      setStatus("success");
    } catch (e) {
      setStatus("error");
      setErrorMsg(e instanceof Error ? e.message : "Failed to fetch data from the backend.");
    }
  }, [ctx, jobId]);

  useEffect(() => { fetchPage(0); }, []); // eslint-disable-line

  const goToPage = (p: number) => {
    if (p < 0 || p >= totalPages || status === "loading") return;
    fetchPage(p);
  };

  const renderBody = () => {
    if (status === "loading") {
      return (
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "56px 24px", gap: "14px", color: "var(--text-muted)" }}>
          <div style={{ fontSize: "32px", animation: "spin 1.2s linear infinite" }}>⏳</div>
          <span style={{ fontSize: "12px" }}>Executing query on the backend…</span>
          <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
        </div>
      );
    }

    if (status === "error") {
      return (
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "40px 24px", gap: "12px", textAlign: "center" }}>
          <div style={{ fontSize: "32px" }}>⚠️</div>
          <div style={{ fontSize: "13px", fontWeight: 700, color: "var(--text-primary)" }}>Could not load data</div>
          <div style={{ fontSize: "11px", color: "var(--text-muted)", maxWidth: 380, lineHeight: 1.7 }}>{errorMsg}</div>
          <button onClick={() => fetchPage(0)} style={{ padding: "6px 18px", background: "var(--accent)", border: "none", borderRadius: "var(--radius-sm)", color: "#fff", fontSize: "12px", cursor: "pointer", fontFamily: "var(--font-sans)", fontWeight: 600 }}>
            Retry
          </button>
        </div>
      );
    }

    return (
      <div style={{ overflowX: "auto", borderRadius: "var(--radius-md)", border: "1px solid var(--border-default)" }}>
        <table data-testid="results-table" style={{ width: "100%", borderCollapse: "collapse", fontSize: "12px" }}>
          <thead>
            <tr style={{ background: "var(--bg-tertiary)", borderBottom: "2px solid var(--border-default)" }}>
              <th style={thStyle}>#</th>
              {columns.map((col) => <th key={col} style={thStyle}>{col}</th>)}
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr><td colSpan={columns.length + 1} style={{ textAlign: "center", padding: "24px", color: "var(--text-muted)", fontSize: "11px" }}>No rows returned</td></tr>
            ) : rows.map((row, i) => (
              <tr
                key={i}
                style={{ borderBottom: "1px solid var(--border-subtle)", background: i % 2 === 0 ? "transparent" : "var(--bg-tertiary)" }}
                onMouseEnter={(e) => { (e.currentTarget as HTMLTableRowElement).style.background = "var(--bg-hover)"; }}
                onMouseLeave={(e) => { (e.currentTarget as HTMLTableRowElement).style.background = i % 2 === 0 ? "transparent" : "var(--bg-tertiary)"; }}
              >
                <td style={{ ...tdStyle, color: "var(--text-muted)", fontSize: "10px" }}>{page * PAGE_SIZE + i + 1}</td>
                {columns.map((col) => <td key={col} style={tdStyle}>{row[col] ?? ""}</td>)}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  };

  return (
    <ModalBase
      title={`Data Viewer — ${label}`}
      subtitle={
        status === "success"
          ? `${totalRows.toLocaleString()} rows · ${columns.length} columns${executionMs != null ? ` · ${executionMs}ms` : ""}`
          : status === "loading" ? "Fetching from backend…" : "Data viewer"
      }
      icon="📊"
      accentColor="#3b82f6"
      onClose={onClose}
      width={780}
      footer={
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "10px 18px", borderTop: "1px solid var(--border-subtle)", gap: "12px", flexWrap: "wrap" }}>
          {/* Stats row */}
          {status === "success" ? (
            <div style={{ display: "flex", gap: "20px" }}>
              {[
                { label: "Rows", value: totalRows.toLocaleString() },
                { label: "Columns", value: String(columns.length) },
                { label: "Page", value: `${page + 1} / ${totalPages || 1}` },
                ...(executionMs != null ? [{ label: "Time", value: `${executionMs}ms` }] : []),
              ].map((s) => (
                <div key={s.label} style={{ textAlign: "center" }}>
                  <div style={{ fontSize: "13px", fontWeight: 700, color: "var(--text-primary)" }}>{s.value}</div>
                  <div style={{ fontSize: "10px", color: "var(--text-muted)" }}>{s.label}</div>
                </div>
              ))}
            </div>
          ) : <div />}

          {/* Pagination */}
          {status === "success" && totalPages > 1 ? (
            <div style={{ display: "flex", gap: "4px", alignItems: "center" }}>
              {[["«", 0], ["‹", page - 1]].map(([lbl, target]) => (
                <button key={String(lbl)} onClick={() => goToPage(Number(target))} disabled={page === 0} style={navBtnStyle(page === 0)}>{lbl}</button>
              ))}
              {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                const p = Math.max(0, Math.min(page - 2, totalPages - 5)) + i;
                return (
                  <button key={p} onClick={() => goToPage(p)} style={{ ...navBtnStyle(false), background: page === p ? "var(--accent)" : "transparent", color: page === p ? "#fff" : "var(--text-secondary)", borderColor: page === p ? "var(--accent)" : "var(--border-default)" }}>
                    {p + 1}
                  </button>
                );
              })}
              {[["›", page + 1], ["»", totalPages - 1]].map(([lbl, target]) => (
                <button key={String(lbl)} onClick={() => goToPage(Number(target))} disabled={page >= totalPages - 1} style={navBtnStyle(page >= totalPages - 1)}>{lbl}</button>
              ))}
            </div>
          ) : <div />}

          <button onClick={onClose} style={{ padding: "6px 16px", background: "transparent", border: "1px solid var(--border-default)", borderRadius: "var(--radius-sm)", color: "var(--text-secondary)", fontSize: "12px", cursor: "pointer", fontFamily: "var(--font-sans)" }}>
            Close
          </button>
        </div>
      }
    >
      {renderBody()}
    </ModalBase>
  );
}

const thStyle: React.CSSProperties = { padding: "8px 12px", textAlign: "left", fontWeight: 700, fontSize: "11px", color: "var(--text-secondary)", whiteSpace: "nowrap", textTransform: "uppercase", letterSpacing: "0.04em" };
const tdStyle: React.CSSProperties = { padding: "7px 12px", color: "var(--text-primary)", whiteSpace: "nowrap", maxWidth: "200px", overflow: "hidden", textOverflow: "ellipsis" };
function navBtnStyle(disabled: boolean): React.CSSProperties {
  return { width: 28, height: 28, borderRadius: "var(--radius-sm)", border: "1px solid var(--border-default)", background: "transparent", color: disabled ? "var(--text-disabled)" : "var(--text-secondary)", fontSize: "13px", cursor: disabled ? "not-allowed" : "pointer", fontFamily: "var(--font-sans)" };
}
