import { OperatorType } from "@/store/useCanvasStore";

export interface OperatorDef {
  operatorType: OperatorType;
  displayName: string;
  symbol: string;      // math/text symbol
  description: string;
}

export interface OperatorGroupDef {
  id: string;
  label: string;
  color: string;       // accent color for the group header
  operators: OperatorDef[];
  defaultOpen?: boolean;
}

// Beta: the palette is intentionally limited to the operators that are
// verified to work end-to-end (frontend → dbest-api → dbest-core). All other
// operators (joins, set ops, aggregation, duplicate removal, ETL, index,
// logical, etc.) are either not implemented in the backend
// (QueryBuilderService throws "Unknown operator type") or return wrong results.
// They should be re-added here only after being validated end-to-end (see the
// README's Continuation section). Do NOT expose an operator here until it works.
export const OPERATOR_GROUPS: OperatorGroupDef[] = [
  {
    id: "unary",
    label: "Operators",
    color: "#3b82f6",
    defaultOpen: true,
    operators: [
      { operatorType: "FILTER",     displayName: "Filter",     symbol: "σ", description: "Filter rows by condition" },
      { operatorType: "PROJECTION", displayName: "Projection", symbol: "π", description: "Select specific columns" },
      { operatorType: "SORT",       displayName: "Sort",       symbol: "⇅", description: "Sort tuples by one or more columns" },
      { operatorType: "LIMIT",      displayName: "Limit",      symbol: "↧", description: "Limit number of output tuples" },
    ],
  },
];

// Flat lookup by operatorType
export const OPERATOR_LOOKUP = new Map(
  OPERATOR_GROUPS.flatMap((g) => g.operators.map((op) => [op.operatorType, op]))
);
