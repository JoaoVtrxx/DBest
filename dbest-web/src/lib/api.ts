/**
 * Central HTTP client for the DBest API (Spring Boot at localhost:8080).
 * All API calls go through here so the base URL is easily configurable.
 */

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8080/api";

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
  const url = `${API_BASE}${path}`;
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

export type TableType = "csv" | "fyi" | "xml" | "memory" | "jdbc";

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

export interface ImportJDBCRequest {
  url: string;
  user: string;
  password: string;
  tableName: string;
  schema?: string;
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

// ── Session ────────────────────────────────────────────────────────────────────

export interface SessionData {
  tables: TableSchema[];
  canvasNodes: unknown[];
  canvasEdges: unknown[];
  savedAt: string;
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

    importJDBC: (body: ImportJDBCRequest) =>
      request<TableSchema>("/tables/jdbc", { method: "POST", body: JSON.stringify(body) }),

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
  },

  // Query execution
  query: {
    execute: (graph: QueryGraph & { page?: number; pageSize?: number }) =>
      request<QueryResult & ResultPage>("/query/execute", { method: "POST", body: JSON.stringify(graph) }),

    result: (jobId: string, page = 0, pageSize = 50) =>
      request<ResultPage>(`/query/result/${jobId}?page=${page}&size=${pageSize}`),
  },

  // DSL
  dsl: {
    parse: (dslText: string) =>
      request<{
        importedTables: TableSchema[];
        graph: { rootNodeId: string; nodes: import("@xyflow/react").Node[]; edges: import("@xyflow/react").Edge[] };
      }>("/dsl/parse", { method: "POST", body: JSON.stringify({ dslText }) }),

    generate: (graph: QueryGraph) =>
      request<{ dslText: string }>("/dsl/generate", { method: "POST", body: JSON.stringify(graph) }),
  },

  // Export
  export: {
    csv: (graph: QueryGraph, tableName: string) =>
      request<string>("/export/csv", { method: "POST", body: JSON.stringify({ ...graph, tableName }) }),

    sql: (graph: QueryGraph, tableName: string, primaryKeys?: string[]) =>
      request<string>("/export/sql", { method: "POST", body: JSON.stringify({ ...graph, tableName, primaryKeys }) }),

    fyi: (graph: QueryGraph, tableName: string, primaryKeys: string[], outputFilePath: string, unique?: boolean) =>
      request<TableSchema>("/export/fyi", { method: "POST", body: JSON.stringify({ ...graph, tableName, primaryKeys, outputFilePath, unique }) }),
  },

  // Session
  session: {
    save: (path: string, data: SessionData) =>
      request<void>("/session/save", {
        method: "POST",
        body: JSON.stringify({ path, ...data }),
      }),

    load: (path: string) =>
      request<SessionData>(`/session/load?path=${encodeURIComponent(path)}`),
  },
};
