"use client";

import React, { useState, useEffect } from "react";
import ModalBase from "./ModalBase";
import { api, CompareResult } from "@/lib/api";
import { ComparePlan } from "@/store/useModalsStore";

interface ComparatorModalProps {
  plans: ComparePlan[];
  onClose: () => void;
}

// The metrics shown by the desktop's Comparator window, in the same order.
// `tuplesLoaded` is a top-level field on each plan; the rest come from the
// core's CellStats map (keyed by its Java field names). "lowerIsBetter" marks
// cost metrics where the smallest value across plans is the "winner" — that's
// the whole point of comparing plans in class.
const METRIC_ROWS: { label: string; key: string; lowerIsBetter: boolean }[] = [
  { label: "Tuples loaded",        key: "tuplesLoaded",    lowerIsBetter: false },
  { label: "Loaded blocks",        key: "BLOCKS_LOADED",   lowerIsBetter: true },
  { label: "Accessed blocks",      key: "BLOCKS_ACCESSED", lowerIsBetter: true },
  { label: "Saved blocks",         key: "BLOCKS_SAVED",    lowerIsBetter: true },
  { label: "Filter comparisons",   key: "COMPARE_FILTER",  lowerIsBetter: true },
  { label: "Memory used",          key: "MEMORY_USED",     lowerIsBetter: true },
  { label: "Next calls",           key: "NEXT_CALLS",      lowerIsBetter: true },
  { label: "Primary key searches", key: "PK_SEARCH",       lowerIsBetter: true },
  { label: "Records read",         key: "RECORDS_READ",    lowerIsBetter: true },
  { label: "Sorted tuples",        key: "SORT_TUPLES",     lowerIsBetter: true },
];

type LoadState =
  | { status: "loading" }
  | { status: "error"; error: string }
  | { status: "done"; result: CompareResult };

export default function ComparatorModal({ plans, onClose }: ComparatorModalProps) {
  const [state, setState] = useState<LoadState>({ status: "loading" });

  useEffect(() => {
    if (plans.length === 0) return;
    let active = true;
    setState({ status: "loading" });
    api.query
      .compare(plans.map((p) => ({ ...p.graph, id: p.id, label: p.label })))
      .then((result) => { if (active) setState({ status: "done", result }); })
      .catch((e) => {
        if (active) setState({ status: "error", error: e instanceof Error ? e.message : "Comparison failed." });
      });
    return () => { active = false; };
  }, [plans]);

  // ── Empty state: no marked plans ─────────────────────────────────────────────
  if (plans.length === 0) {
    return (
      <ModalBase
        title="Query Plan Comparator"
        subtitle="Nothing marked yet"
        icon="⚖️"
        accentColor="#f59e0b"
        onClose={onClose}
        width={460}
      >
        <div style={{ fontSize: "12px", color: "var(--text-secondary)", lineHeight: 1.8 }}>
          To compare query plans, first build them on the canvas and <strong>mark</strong> the
          output node of each plan:
          <ol style={{ margin: "10px 0 0", paddingLeft: "20px" }}>
            <li>Right-click the last operator (or a table) of a plan.</li>
            <li>Choose <strong>☆ Mark</strong> — the node turns amber.</li>
            <li>Mark a second plan the same way.</li>
            <li>Click <strong>Comparator</strong> again to compare them side by side.</li>
          </ol>
        </div>
      </ModalBase>
    );
  }

  const width = Math.min(280 + plans.length * 170, 1100);

  return (
    <ModalBase
      title="Query Plan Comparator"
      subtitle={`Execution cost of ${plans.length} marked plan${plans.length !== 1 ? "s" : ""}`}
      icon="⚖️"
      accentColor="#f59e0b"
      onClose={onClose}
      width={width}
    >
      {state.status === "loading" && (
        <div style={{ fontSize: "12px", color: "var(--text-muted)", padding: "20px 0", textAlign: "center" }}>
          ⏳ Executing plans and measuring…
        </div>
      )}

      {state.status === "error" && (
        <div style={{ fontSize: "12px", color: "#dc2626", background: "#dc262610", border: "1px solid #dc262630", padding: "10px 12px", borderRadius: "var(--radius-sm)" }}>
          ⚠️ {state.error}
        </div>
      )}

      {state.status === "done" && renderTable(state.result)}
    </ModalBase>
  );
}

function renderTable(result: CompareResult) {
  const statsById = new Map(result.plans.map((p) => [p.id, p]));
  const plans = result.plans;

  const valueFor = (planId: string, key: string): number | null => {
    const p = statsById.get(planId);
    if (!p || !p.ok) return null;
    if (key === "tuplesLoaded") return p.tuplesLoaded;
    return p.metrics?.[key] ?? 0;
  };

  return (
    <div style={{ overflowX: "auto", border: "1px solid var(--border-default)", borderRadius: "var(--radius-md)" }}>
      <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "12px" }}>
        <thead>
          <tr style={{ background: "var(--bg-tertiary)", borderBottom: "2px solid var(--border-default)" }}>
            <th style={{ ...thStyle, minWidth: 150 }}>Metric</th>
            {plans.map((p) => (
              <th key={p.id} style={thStyle} title={p.label}>
                {p.label}
                {!p.ok && <div style={{ color: "#dc2626", fontWeight: 400, fontSize: "10px" }}>⚠️ error</div>}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {METRIC_ROWS.map((m) => {
            // Which plans tie for best on this row (only highlight with 2+ plans).
            const values = plans.map((p) => valueFor(p.id, m.key)).filter((v): v is number => v != null);
            let best: number | null = null;
            if (plans.length > 1 && values.length > 0) {
              best = m.lowerIsBetter ? Math.min(...values) : Math.max(...values);
            }
            return (
              <tr key={m.key} style={{ borderBottom: "1px solid var(--border-subtle)" }}>
                <td style={{ ...tdStyle, fontWeight: 600, color: "var(--text-secondary)" }}>{m.label}</td>
                {plans.map((p) => {
                  const v = valueFor(p.id, m.key);
                  const isBest = best != null && v === best && values.length > 1 && new Set(values).size > 1;
                  return (
                    <td
                      key={p.id}
                      style={{
                        ...tdStyle,
                        fontVariantNumeric: "tabular-nums",
                        fontWeight: isBest ? 700 : 400,
                        color: isBest ? "#16a34a" : v == null ? "var(--text-muted)" : "var(--text-primary)",
                      }}
                    >
                      {v == null ? "—" : v.toLocaleString()}
                      {isBest ? " 🏆" : ""}
                    </td>
                  );
                })}
              </tr>
            );
          })}
        </tbody>
      </table>
      {plans.some((p) => !p.ok) && (
        <div style={{ padding: "8px 12px", fontSize: "10px", color: "#dc2626", borderTop: "1px solid var(--border-subtle)" }}>
          {plans.filter((p) => !p.ok).map((p) => (
            <div key={p.id}>⚠️ {p.label}: {p.error}</div>
          ))}
        </div>
      )}
    </div>
  );
}

const thStyle: React.CSSProperties = { padding: "8px 12px", textAlign: "left", fontWeight: 700, fontSize: "11px", color: "var(--text-secondary)", whiteSpace: "nowrap", maxWidth: 200, overflow: "hidden", textOverflow: "ellipsis" };
const tdStyle: React.CSSProperties = { padding: "7px 12px", color: "var(--text-primary)", whiteSpace: "nowrap" };
