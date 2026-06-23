package sgbd.dbest.api.controllers;

import database.TuplesExtractor;
import ibd.query.Operation;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import sgbd.dbest.api.dto.*;
import sgbd.dbest.api.service.QueryBuilderService;
import sgbd.dbest.api.service.TableService;

import java.util.*;
import java.util.concurrent.ConcurrentHashMap;

/**
 * REST controller for the DBest API.
 * All endpoints are under /api and accept cross-origin requests from localhost:3000.
 */
@RestController
@RequestMapping("/api")
@CrossOrigin(origins = {"http://localhost:3000", "http://127.0.0.1:3000"})
public class QueryController {

    @Autowired
    private TableService tableService;

    @Autowired
    private QueryBuilderService queryBuilderService;

    // In-memory cache for executed query results (jobId → rows)
    private final ConcurrentHashMap<String, List<Map<String, String>>> resultCache =
            new ConcurrentHashMap<>();
    private final ConcurrentHashMap<String, List<String>> resultColumns =
            new ConcurrentHashMap<>();

    // ── Health ─────────────────────────────────────────────────────────────────

    @GetMapping("/status")
    public Map<String, String> status() {
        return Map.of("status", "DBest API is running");
    }

    // ── Tables ─────────────────────────────────────────────────────────────────

    @GetMapping("/tables")
    public List<TableSchemaResponse> listTables() {
        return tableService.listAll();
    }

    @PostMapping("/tables/csv")
    public ResponseEntity<?> importCSV(@RequestBody ImportCSVRequest req) {
        try {
            return ResponseEntity.ok(tableService.importCSV(req));
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                    .body(Map.of("error", e.getMessage()));
        }
    }

    @PostMapping("/tables/xml")
    public ResponseEntity<?> importXML(@RequestBody ImportXMLRequest req) {
        try {
            return ResponseEntity.ok(tableService.importXML(req));
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                    .body(Map.of("error", e.getMessage()));
        }
    }

    @PostMapping("/tables/fyi")
    public ResponseEntity<?> importFYI(@RequestBody ImportFYIRequest req) {
        try {
            return ResponseEntity.ok(tableService.importFYI(req));
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                    .body(Map.of("error", e.getMessage()));
        }
    }

    /** Import a BTree table from a .dat file path (auto-discovers .head) */
    @PostMapping("/tables/dat")
    public ResponseEntity<?> importDat(@RequestBody ImportDatRequest req) {
        try {
            return ResponseEntity.ok(tableService.importDat(req));
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                    .body(Map.of("error", e.getMessage()));
        }
    }

    /** Alias: import from .head file path (same as /tables/fyi) */
    @PostMapping("/tables/head")
    public ResponseEntity<?> importHead(@RequestBody ImportFYIRequest req) {
        try {
            return ResponseEntity.ok(tableService.importFYI(req));
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                    .body(Map.of("error", e.getMessage()));
        }
    }

    @PostMapping("/tables/memory")
    public ResponseEntity<?> importMemory(@RequestBody ImportMemoryRequest req) {
        try {
            return ResponseEntity.ok(tableService.importMemory(req));
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                    .body(Map.of("error", e.getMessage()));
        }
    }

    @DeleteMapping("/tables/{tableId}")
    public ResponseEntity<?> removeTable(@PathVariable String tableId) {
        try {
            tableService.remove(tableId);
            return ResponseEntity.ok(Map.of("removed", tableId));
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND)
                    .body(Map.of("error", e.getMessage()));
        }
    }

    @GetMapping("/tables/{tableId}/info")
    public ResponseEntity<?> getTableInfo(@PathVariable String tableId) {
        try {
            return ResponseEntity.ok(tableService.getTableInfo(tableId));
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND)
                    .body(Map.of("error", e.getMessage()));
        }
    }

    // ── Query Execution ────────────────────────────────────────────────────────

    /**
     * Executes an operator graph sent by the frontend.
     * POST /api/query/execute
     *
     * Body: { rootNodeId, nodes: [{id, type, tableId?, operatorType?, arguments?}],
     *         edges: [{source, target}], page?, pageSize? }
     */
    @PostMapping("/query/execute")
    public ResponseEntity<?> executeGraph(@RequestBody ExecuteGraphRequest req) {
        try {
            Operation rootOp = queryBuilderService.buildOperation(
                    req.rootNodeId, req.nodes, req.edges, tableService);

            long start = System.currentTimeMillis();
            List<Map<String, String>> allRows = TuplesExtractor.getAllRowsList(rootOp, false);
            long elapsed = System.currentTimeMillis() - start;

            // Derive column names from the root operation's content info
            List<String> columns = new ArrayList<>();
            try {
                for (Map.Entry<String, List<String>> entry : rootOp.getContentInfo().entrySet()) {
                    columns.addAll(entry.getValue());
                }
            } catch (Exception ignored) {
                // Fall back to keys from the first row if available
                if (!allRows.isEmpty()) {
                    columns.addAll(allRows.get(0).keySet());
                }
            }

            int page     = req.page;
            int pageSize = req.pageSize > 0 ? req.pageSize : 50;
            String jobId = "job_" + System.currentTimeMillis();
            resultCache.put(jobId, allRows);
            resultColumns.put(jobId, columns);

            int from = Math.min(page * pageSize, allRows.size());
            int to   = Math.min(from + pageSize, allRows.size());

            return ResponseEntity.ok(new QueryResultResponse(
                    jobId, columns, allRows.size(), elapsed,
                    allRows.subList(from, to), page, pageSize));
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(Map.of("error", e.getMessage() != null ? e.getMessage() : e.toString()));
        }
    }

    /**
     * Executes a simple scan on a single table (no operators).
     * POST /api/query/table/{tableId}?page=0&size=50
     */
    @GetMapping("/query/table/{tableId}")
    public ResponseEntity<?> queryTable(
            @PathVariable String tableId,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "50") int size) {
        try {
            var cell = tableService.get(tableId);
            Operation op = cell.getOperator();

            long start = System.currentTimeMillis();
            List<Map<String, String>> allRows = TuplesExtractor.getAllRowsList(op, false);
            long elapsed = System.currentTimeMillis() - start;

            List<String> columns = cell.getColumns().stream()
                    .map(c -> c.NAME).toList();

            String jobId = "job_" + System.currentTimeMillis();
            resultCache.put(jobId, allRows);
            resultColumns.put(jobId, columns);

            int from = Math.min(page * size, allRows.size());
            int to   = Math.min(from + size, allRows.size());
            List<Map<String, String>> pageRows = allRows.subList(from, to);

            return ResponseEntity.ok(new QueryResultResponse(
                    jobId, columns, allRows.size(), elapsed, pageRows, page, size));
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(Map.of("error", e.getMessage()));
        }
    }

    /**
     * Returns a page from a previously executed query result.
     * GET /api/query/result/{jobId}?page=0&size=50
     */
    @GetMapping("/query/result/{jobId}")
    public ResponseEntity<?> getResultPage(
            @PathVariable String jobId,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "50") int size) {
        List<Map<String, String>> allRows = resultCache.get(jobId);
        List<String> columns = resultColumns.get(jobId);
        if (allRows == null) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND)
                    .body(Map.of("error", "Job not found or expired: " + jobId));
        }
        int from = Math.min(page * size, allRows.size());
        int to   = Math.min(from + size, allRows.size());
        return ResponseEntity.ok(new QueryResultResponse(
                jobId, columns, allRows.size(), 0, allRows.subList(from, to), page, size));
    }
}
