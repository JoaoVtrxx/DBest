/**
 * Central HTTP client for the DBest API (Spring Boot at localhost:8080).
 * All API calls go through here so the base URL is easily configurable.
 */

/**
 * Resolves the API base URL at runtime (in the browser), so the same build works
 * both ways without any build-time configuration:
 *  - bundled in the Spring Boot jar, the UI is served from the API's own origin →
 *    use a same-origin relative "/api";
 *  - under `next dev` the UI runs on :3000 while the API runs on :8080 → point at
 *    the API on :8080.
 * An explicit NEXT_PUBLIC_API_URL always wins if set.
 */
function resolveApiBase(): string {
  if (process.env.NEXT_PUBLIC_API_URL) return process.env.NEXT_PUBLIC_API_URL;
  if (typeof window !== "undefined" && window.location.port === "3000") {
    return "http://localhost:8080/api";
  }
  return "/api";
}

export class ApiError extends Error {
  constructor(
    public status: number,
    message: string
  ) {
    super(message);
    this.name = "ApiError";
  }
}

async function request<T>(
  path: string,
  options: RequestInit = {}
): Promise<T> {
  const url = `${resolveApiBase()}${path}`;
  const isFormData = options.body instanceof FormData;
  const headers = { ...options.headers } as Record<string, string>;
  if (!isFormData && !headers["Content-Type"]) {
    headers["Content-Type"] = "application/json";
  }

  const res = await fetch(url, {
    headers,
    ...options,
  });
  if (!res.ok) {
    const text = await res.text().catch(() => res.statusText);
    throw new ApiError(res.status, text);
  }
  // Some endpoints return plain text
  const contentType = res.headers.get("Content-Type") ?? "";
  if (contentType.includes("application/json")) {
    return res.json() as Promise<T>;
  }
  return res.text() as unknown as Promise<T>;
}

// ── Types ──────────────────────────────────────────────────────────────────────

export type TableType = "csv" | "fyi" | "xml" | "memory";

export interface ColumnSchema {
  name: string;
  type: string; // "String" | "Integer" | "Double" | "Date" etc.
}

export interface TableSchema {
  tableId: string;
  tableName: string;
  type: TableType;
  columns: ColumnSchema[];
  filePath?: string;
}

export interface TableBackendInfo {
  tableId: string;
  tableName: string;
  type: string;
  filePath: string | null;
  rowCount: number;
  columns: {
    name: string;
    dataType: string;
    primaryKey: boolean;
  }[];
}

export interface ImportCSVRequest {
  filePath: string;
  separator: string;
  hasHeader: boolean;
  charset?: string;
  tableName?: string;
}

export interface ImportXMLRequest {
  filePath: string;
  tableName?: string;
}

export interface ImportFYIRequest {
  filePath: string;
  tableName?: string;
}

export interface ImportMemoryRequest {
  tableName: string;
  columns: string[];
}

// ── Graph serialization ────────────────────────────────────────────────────────

export type NodeType = "table" | "operator" | "tableNode" | "operatorNode";

export interface GraphNode {
  id: string;
  type: NodeType;
  // Table nodes
  tableId?: string;
  tableName?: string;
  // Operator nodes
  operatorType?: string;
  arguments?: Record<string, string>;
}

export interface GraphEdge {
  source: string;
  target: string;
  /** Which input handle of the target this edge connects to, for binary
   *  operators: "target-left" or "target-right". Lets the backend tell the
   *  left child from the right child. Undefined for unary operators. */
  targetHandle?: string | null;
}

export interface QueryGraph {
  rootNodeId: string;
  nodes: GraphNode[];
  edges: GraphEdge[];
}

export interface QueryResult {
  jobId: string;
  columns: string[];
  totalRows: number;
  executionTimeMs: number;
}

export interface ResultPage {
  rows: Record<string, string>[];
  page: number;
  pageSize: number;
  totalRows: number;
  totalPages: number;
}

/** Response from GET /api/query/table/{tableId} — includes first page + metadata */
export interface ScanResult extends ResultPage {
  jobId: string;
  columns: string[];
  executionTimeMs: number;
}

// ── Comparator ───────────────────────────────────────────────────────────────

/** One plan to compare (an operator graph rooted at a marked node). */
export interface ComparePlanRequest extends QueryGraph {
  id: string;
  label: string;
}

/** Per-plan execution-cost metrics returned by POST /api/query/compare.
 *  `metrics` is keyed by the core's CellStats field names (PK_SEARCH,
 *  SORT_TUPLES, COMPARE_FILTER, RECORDS_READ, NEXT_CALLS, MEMORY_USED,
 *  BLOCKS_ACCESSED, BLOCKS_LOADED, BLOCKS_SAVED). */
export interface ComparePlanStats {
  id: string;
  label: string;
  ok: boolean;
  error?: string;
  tuplesLoaded: number;
  metrics: Record<string, number>;
}

export interface CompareResult {
  plans: ComparePlanStats[];
}

// ── API Methods ────────────────────────────────────────────────────────────────

export const api = {
  // Status
  status: () => request<{ status: string }>("/status"),

  // Tables
  tables: {
    list: () => request<TableSchema[]>("/tables"),
    remove: (tableId: string) => request<void>(`/tables/${tableId}`, { method: "DELETE" }),
    getInfo: (tableId: string) => request<TableBackendInfo>(`/tables/${tableId}/info`),

    // Scan a table and return its rows (calls GET /api/query/table/{tableId})
    scan: (tableId: string, page = 0, pageSize = 50) =>
      request<ScanResult>(`/query/table/${tableId}?page=${page}&size=${pageSize}`),

    importCSV: (body: ImportCSVRequest) =>
      request<TableSchema>("/tables/csv", { method: "POST", body: JSON.stringify(body) }),

    importXML: (body: ImportXMLRequest) =>
      request<TableSchema>("/tables/xml", { method: "POST", body: JSON.stringify(body) }),

    importFYI: (body: ImportFYIRequest) =>
      request<TableSchema>("/tables/fyi", { method: "POST", body: JSON.stringify(body) }),

    importMemory: (body: ImportMemoryRequest) =>
      request<TableSchema>("/tables/memory", { method: "POST", body: JSON.stringify(body) }),

    /** Import BTree from .dat file path (backend auto-discovers .head) */
    importDat: (datFilePath: string) =>
      request<TableSchema>("/tables/dat", { method: "POST", body: JSON.stringify({ datFilePath }) }),

    /** Import BTree / CSV from .head file path */
    importHead: (filePath: string) =>
      request<TableSchema>("/tables/head", { method: "POST", body: JSON.stringify({ filePath }) }),

    /** Upload a file directly and let the backend handle the import based on extension */
    upload: (file: File, options?: { tableName?: string; separator?: string; hasHeader?: boolean }) => {
      const formData = new FormData();
      formData.append("file", file);
      if (options?.tableName) formData.append("tableName", options.tableName);
      if (options?.separator !== undefined) formData.append("separator", options.separator);
      if (options?.hasHeader !== undefined) formData.append("hasHeader", String(options.hasHeader));
      return request<TableSchema>("/tables/upload", {
        method: "POST",
        body: formData,
      });
    },

    /** Upload a BTree table's two files together (.dat + .head). A BTree table
     *  cannot be read from the .dat alone. Either file may be omitted, but both
     *  together is the reliable path. */
    uploadBtree: (files: { dat?: File | null; head?: File | null }) => {
      const formData = new FormData();
      if (files.dat) formData.append("files", files.dat);
      if (files.head) formData.append("files", files.head);
      return request<TableSchema>("/tables/upload-btree", {
        method: "POST",
        body: formData,
      });
    },
  },

  // Query execution
  query: {
    execute: (graph: QueryGraph & { page?: number; pageSize?: number }) =>
      request<QueryResult & ResultPage>("/query/execute", { method: "POST", body: JSON.stringify(graph) }),

    result: (jobId: string, page = 0, pageSize = 50) =>
      request<ResultPage>(`/query/result/${jobId}?page=${page}&size=${pageSize}`),

    /** Compare marked query plans, returning the desktop's execution-cost metrics
     *  per plan. `limit` caps tuples read per plan (0 = read all). */
    compare: (plans: ComparePlanRequest[], limit = 0) =>
      request<CompareResult>("/query/compare", {
        method: "POST",
        body: JSON.stringify({ plans, limit }),
      }),
  },

  // Export a query plan's result as a new table (BTree/FYI), CSV or SQL.
  export: {
    csv: (graph: QueryGraph, tableName: string) =>
      request<string>("/export/csv", { method: "POST", body: JSON.stringify({ ...graph, tableName }) }),

    sql: (graph: QueryGraph, tableName: string, primaryKeys?: string[]) =>
      request<string>("/export/sql", { method: "POST", body: JSON.stringify({ ...graph, tableName, primaryKeys }) }),

    fyi: (graph: QueryGraph, tableName: string, primaryKeys: string[], outputFilePath: string, unique?: boolean) =>
      request<TableSchema>("/export/fyi", { method: "POST", body: JSON.stringify({ ...graph, tableName, primaryKeys, outputFilePath, unique }) }),
  },
};
