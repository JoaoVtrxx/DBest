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

export const OPERATOR_GROUPS: OperatorGroupDef[] = [
  {
    id: "sort",
    label: "Sort",
    color: "#6366f1",
    defaultOpen: true,
    operators: [
      { operatorType: "SORT", displayName: "Sort", symbol: "⇅", description: "Sort tuples by one or more columns" },
    ],
  },
  {
    id: "relational",
    label: "Rel. Algebra Operators",
    color: "#3b82f6",
    defaultOpen: true,
    operators: [
      { operatorType: "PROJECTION",        displayName: "Projection",         symbol: "π",  description: "Select specific columns" },
      { operatorType: "FILTER",            displayName: "Filter",             symbol: "σ",  description: "Filter rows by condition" },
      { operatorType: "AGGREGATION",       displayName: "Aggregation",        symbol: "Σ",  description: "Aggregate functions (SUM, COUNT…)" },
      { operatorType: "HASH_GROUP",        displayName: "Hash Group",         symbol: "⬡",  description: "Group by using hash" },
      { operatorType: "CARTESIAN_PRODUCT", displayName: "Cartesian Product",  symbol: "×",  description: "Cross product of two relations" },
      { operatorType: "HASH_JOIN",         displayName: "Join",               symbol: "⋈",  description: "Equi-join (hash strategy)" },
      { operatorType: "HASH_LEFT_OUTER_JOIN",  displayName: "L. Outer Join",  symbol: "⟕",  description: "Left outer join" },
      { operatorType: "HASH_RIGHT_OUTER_JOIN", displayName: "R. Outer Join",  symbol: "⟖",  description: "Right outer join" },
      { operatorType: "HASH_LEFT_SEMI_JOIN",   displayName: "L. Semi Join",   symbol: "⋉",  description: "Left semi join" },
      { operatorType: "HASH_RIGHT_SEMI_JOIN",  displayName: "R. Semi Join",   symbol: "⋊",  description: "Right semi join" },
      { operatorType: "HASH_LEFT_ANTI_JOIN",   displayName: "L. Anti Join",   symbol: "▷",  description: "Left anti join" },
      { operatorType: "HASH_RIGHT_ANTI_JOIN",  displayName: "R. Anti Join",   symbol: "◁",  description: "Right anti join" },
      { operatorType: "HASH_UNION",        displayName: "Hash Union",         symbol: "∪",  description: "Set union (hash strategy)" },
      { operatorType: "HASH_INTERSECTION", displayName: "Hash Intersection",  symbol: "∩",  description: "Set intersection (hash strategy)" },
      { operatorType: "HASH_DIFFERENCE",   displayName: "Hash Difference",    symbol: "−",  description: "Set difference (hash strategy)" },
    ],
  },
  {
    id: "remove",
    label: "Remove Operators",
    color: "#ef4444",
    operators: [
      { operatorType: "PROJECTION",           displayName: "Projection",          symbol: "π",  description: "Project columns" },
      { operatorType: "SELECT_COLUMNS",       displayName: "Select Columns",      symbol: "⊏",  description: "Select specific columns" },
      { operatorType: "FILTER",               displayName: "Filter",              symbol: "σ",  description: "Filter rows" },
      { operatorType: "DUPLICATE_REMOVAL",    displayName: "Duplicate Removal",   symbol: "◎",  description: "Remove duplicate rows" },
      { operatorType: "HASH_DUPLICATE_REMOVAL", displayName: "Hash Dup. Removal", symbol: "◎",  description: "Remove duplicates using hash" },
      { operatorType: "LIMIT",                displayName: "Limit",               symbol: "↧",  description: "Limit number of output tuples" },
    ],
  },
  {
    id: "etl",
    label: "ETL Operators",
    color: "#f59e0b",
    operators: [
      { operatorType: "EXPLODE",        displayName: "Explode",        symbol: "💥", description: "Explode array column into rows" },
      { operatorType: "AUTO_INCREMENT", displayName: "Auto Increment", symbol: "1+", description: "Add auto-increment column" },
    ],
  },
  {
    id: "index",
    label: "Index Operators",
    color: "#10b981",
    operators: [
      { operatorType: "HASH",            displayName: "Hash",            symbol: "#",  description: "Build a hash index" },
      { operatorType: "MEMOIZE",         displayName: "Memoize",         symbol: "📌", description: "Cache intermediate results" },
      { operatorType: "MATERIALIZATION", displayName: "Materialization", symbol: "💾", description: "Materialize intermediate results" },
    ],
  },
  {
    id: "aggregation",
    label: "Aggregation Operators",
    color: "#8b5cf6",
    operators: [
      { operatorType: "AGGREGATION", displayName: "Aggregation", symbol: "Σ", description: "Apply aggregate function" },
      { operatorType: "GROUP",       displayName: "Group",       symbol: "⬡", description: "Group tuples by column(s)" },
      { operatorType: "HASH_GROUP",  displayName: "Hash Group",  symbol: "⬡", description: "Group using hash strategy" },
    ],
  },
  {
    id: "inner_join",
    label: "Inner Join Operators",
    color: "#06b6d4",
    operators: [
      { operatorType: "NESTED_LOOP_JOIN", displayName: "Nested Loop Join", symbol: "⋈", description: "Nested loop join" },
      { operatorType: "MERGE_JOIN",       displayName: "Merge Join",        symbol: "⋈", description: "Sort-merge join" },
      { operatorType: "HASH_JOIN",        displayName: "Hash Join",         symbol: "⋈", description: "Hash join" },
    ],
  },
  {
    id: "outer_join",
    label: "Outer Join Operators",
    color: "#0ea5e9",
    operators: [
      { operatorType: "NESTED_LOOP_LEFT_OUTER_JOIN",  displayName: "NL L. Outer",    symbol: "⟕", description: "Nested loop left outer join" },
      { operatorType: "MERGE_LEFT_OUTER_JOIN",         displayName: "Merge L. Outer", symbol: "⟕", description: "Merge sort left outer join" },
      { operatorType: "HASH_LEFT_OUTER_JOIN",          displayName: "Hash L. Outer",  symbol: "⟕", description: "Hash left outer join" },
      { operatorType: "MERGE_RIGHT_OUTER_JOIN",        displayName: "Merge R. Outer", symbol: "⟖", description: "Merge sort right outer join" },
      { operatorType: "HASH_RIGHT_OUTER_JOIN",         displayName: "Hash R. Outer",  symbol: "⟖", description: "Hash right outer join" },
      { operatorType: "MERGE_FULL_OUTER_JOIN",         displayName: "Merge Full",     symbol: "⟗", description: "Merge sort full outer join" },
      { operatorType: "HASH_FULL_OUTER_JOIN",          displayName: "Hash Full",      symbol: "⟗", description: "Hash full outer join" },
    ],
  },
  {
    id: "semi_join",
    label: "Semi Join Operators",
    color: "#14b8a6",
    operators: [
      { operatorType: "NESTED_LOOP_LEFT_SEMI_JOIN", displayName: "NL L. Semi",    symbol: "⋉", description: "Nested loop left semi join" },
      { operatorType: "MERGE_LEFT_SEMI_JOIN",        displayName: "Merge L. Semi", symbol: "⋉", description: "Merge left semi join" },
      { operatorType: "HASH_LEFT_SEMI_JOIN",         displayName: "Hash L. Semi",  symbol: "⋉", description: "Hash left semi join" },
      { operatorType: "MERGE_RIGHT_SEMI_JOIN",       displayName: "Merge R. Semi", symbol: "⋊", description: "Merge right semi join" },
      { operatorType: "HASH_RIGHT_SEMI_JOIN",        displayName: "Hash R. Semi",  symbol: "⋊", description: "Hash right semi join" },
    ],
  },
  {
    id: "anti_join",
    label: "Anti Join Operators",
    color: "#f97316",
    operators: [
      { operatorType: "NESTED_LOOP_LEFT_ANTI_JOIN", displayName: "NL L. Anti",    symbol: "▷", description: "Nested loop left anti join" },
      { operatorType: "MERGE_LEFT_ANTI_JOIN",        displayName: "Merge L. Anti", symbol: "▷", description: "Merge left anti join" },
      { operatorType: "HASH_LEFT_ANTI_JOIN",         displayName: "Hash L. Anti",  symbol: "▷", description: "Hash left anti join" },
      { operatorType: "MERGE_RIGHT_ANTI_JOIN",       displayName: "Merge R. Anti", symbol: "◁", description: "Merge right anti join" },
      { operatorType: "HASH_RIGHT_ANTI_JOIN",        displayName: "Hash R. Anti",  symbol: "◁", description: "Hash right anti join" },
    ],
  },
  {
    id: "set",
    label: "Set Operators",
    color: "#ec4899",
    operators: [
      { operatorType: "APPEND",           displayName: "Append",           symbol: "++", description: "Append two relations" },
      { operatorType: "UNION",            displayName: "Union",            symbol: "∪",  description: "Set union (nested loop)" },
      { operatorType: "HASH_UNION",       displayName: "Hash Union",       symbol: "∪",  description: "Set union (hash)" },
      { operatorType: "INTERSECTION",     displayName: "Intersection",     symbol: "∩",  description: "Set intersection (nested loop)" },
      { operatorType: "HASH_INTERSECTION",displayName: "Hash Intersection",symbol: "∩",  description: "Set intersection (hash)" },
      { operatorType: "DIFFERENCE",       displayName: "Difference",       symbol: "−",  description: "Set difference (nested loop)" },
      { operatorType: "HASH_DIFFERENCE",  displayName: "Hash Difference",  symbol: "−",  description: "Set difference (hash)" },
    ],
  },
  {
    id: "logical",
    label: "Logical Operators",
    color: "#a855f7",
    operators: [
      { operatorType: "AND",       displayName: "AND",       symbol: "∧", description: "Logical AND" },
      { operatorType: "OR",        displayName: "OR",        symbol: "∨", description: "Logical OR" },
      { operatorType: "XOR",       displayName: "XOR",       symbol: "⊕", description: "Logical XOR" },
      { operatorType: "CONDITION", displayName: "Condition", symbol: "?", description: "Conditional expression" },
      { operatorType: "IF",        displayName: "IF",        symbol: "if", description: "If-then-else branching" },
    ],
  },
  {
    id: "other",
    label: "Other Operators",
    color: "#64748b",
    operators: [
      { operatorType: "SCAN",              displayName: "Scan",             symbol: "→",  description: "Full scan of a relation" },
      { operatorType: "CARTESIAN_PRODUCT", displayName: "Cartesian Product",symbol: "×",  description: "Cross product" },
      { operatorType: "RENAME",            displayName: "Rename",           symbol: "✏",  description: "Rename columns" },
      { operatorType: "REFERENCE",         displayName: "Reference",        symbol: "⤴",  description: "Reference another node" },
    ],
  },
];

// Flat lookup by operatorType
export const OPERATOR_LOOKUP = new Map(
  OPERATOR_GROUPS.flatMap((g) => g.operators.map((op) => [op.operatorType, op]))
);
