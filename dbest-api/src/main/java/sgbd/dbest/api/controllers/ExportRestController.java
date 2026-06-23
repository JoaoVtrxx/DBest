package sgbd.dbest.api.controllers;

import ibd.query.Operation;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import sgbd.dbest.api.dto.ExecuteGraphRequest;
import sgbd.dbest.api.dto.TableSchemaResponse;
import sgbd.dbest.api.service.ExportService;
import sgbd.dbest.api.service.QueryBuilderService;
import sgbd.dbest.api.service.TableService;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/export")
@CrossOrigin(origins = {"http://localhost:3000", "http://127.0.0.1:3000"})
public class ExportRestController {

    @Autowired
    private ExportService exportService;

    @Autowired
    private QueryBuilderService queryBuilderService;

    @Autowired
    private TableService tableService;

    public static class ExportRequest extends ExecuteGraphRequest {
        public String tableName = "exported_table";
        public List<String> primaryKeys;
        public String outputFilePath;
        public boolean unique = false;
    }

    @PostMapping("/csv")
    public ResponseEntity<?> exportCSV(@RequestBody ExportRequest req) {
        try {
            Operation op = queryBuilderService.buildOperation(
                    req.rootNodeId, req.nodes, req.edges, tableService);
            String csvContent = exportService.exportToCSV(op);
            
            byte[] bytes = csvContent.getBytes("UTF-8");
            return ResponseEntity.ok()
                    .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=\"" + req.tableName + ".csv\"")
                    .contentType(MediaType.parseMediaType("text/csv"))
                    .contentLength(bytes.length)
                    .body(bytes);
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(Map.of("error", e.getMessage() != null ? e.getMessage() : e.toString()));
        }
    }

    @PostMapping("/sql")
    public ResponseEntity<?> exportSQL(@RequestBody ExportRequest req) {
        try {
            Operation op = queryBuilderService.buildOperation(
                    req.rootNodeId, req.nodes, req.edges, tableService);
            String sqlContent = exportService.exportToSQL(op, req.tableName, req.primaryKeys);
            
            byte[] bytes = sqlContent.getBytes("UTF-8");
            return ResponseEntity.ok()
                    .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=\"" + req.tableName + ".sql\"")
                    .contentType(MediaType.parseMediaType("application/sql"))
                    .contentLength(bytes.length)
                    .body(bytes);
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(Map.of("error", e.getMessage() != null ? e.getMessage() : e.toString()));
        }
    }

    @PostMapping("/fyi")
    public ResponseEntity<?> exportFYI(@RequestBody ExportRequest req) {
        try {
            if (req.outputFilePath == null || req.outputFilePath.trim().isEmpty()) {
                return ResponseEntity.badRequest().body(Map.of("error", "outputFilePath is required for FYI export"));
            }
            Operation op = queryBuilderService.buildOperation(
                    req.rootNodeId, req.nodes, req.edges, tableService);
            TableSchemaResponse schema = exportService.exportToFYI(
                    op, req.tableName, req.primaryKeys, req.outputFilePath, req.unique);
            return ResponseEntity.ok(schema);
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(Map.of("error", e.getMessage() != null ? e.getMessage() : e.toString()));
        }
    }
}
