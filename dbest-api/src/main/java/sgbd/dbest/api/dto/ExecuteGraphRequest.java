package sgbd.dbest.api.dto;

import java.util.List;
import java.util.Map;

/**
 * DTO for POST /api/query/execute.
 * Represents the operator graph sent by the frontend querySerializer.ts.
 */
public class ExecuteGraphRequest {

    /** ID of the root node (top of the operator tree). */
    public String rootNodeId;

    /** All nodes in the graph. */
    public List<NodeDto> nodes;

    /** All directed edges: source → target (source feeds into target). */
    public List<EdgeDto> edges;

    // ── Pagination ─────────────────────────────────────────────────────────────
    public int page     = 0;
    public int pageSize = 50;

    // ── Nested DTOs ────────────────────────────────────────────────────────────

    public static class NodeDto {
        /** Unique node identifier (UUID or similar). */
        public String id;

        /**
         * High-level node category: "table" or "operator".
         * - "table"    → leaf node that reads a table via TableService
         * - "operator" → any transformation (Filter, Sort, Join, …)
         */
        public String type;

        /** For type="table": the tableId registered in TableService. */
        public String tableId;

        /**
         * For type="operator": the operator kind.
         * Expected values: FILTER, PROJECTION, SORT, LIMIT,
         *   DUPLICATE_REMOVAL, SOURCE_RENAME,
         *   NESTED_LOOP_JOIN, HASH_JOIN, MERGE_JOIN, CROSS_JOIN,
         *   APPEND, UNION, INTERSECTION, DIFFERENCE
         */
        public String operatorType;

        /**
         * Free-form map of arguments that depend on the operatorType, e.g.:
         * FILTER      → { "predicate": "age > 30" }
         * PROJECTION  → { "columns": "name,age" }
         * SORT        → { "column": "age", "ascending": "true" }
         * LIMIT       → { "count": "10", "offset": "0" }
         * SOURCE_RENAME → { "oldAlias": "t1", "newAlias": "employees" }
         * *_JOIN      → { "leftColumn": "t1.id", "rightColumn": "t2.id" }
         *               (comma-separated pairs supported: "t1.id=t2.id,t1.dept=t2.dept")
         */
        public Map<String, String> arguments;
        
        /** For type="table": the table name (optional). */
        public String tableName;
        
        /** Position of the node in the canvas (optional). */
        public PositionDto position;

        public static class PositionDto {
            public double x;
            public double y;
        }
    }

    public static class EdgeDto {
        /** Node that produces tuples (child/input). */
        public String source;
        /** Node that consumes tuples (parent/output). */
        public String target;
    }
}
