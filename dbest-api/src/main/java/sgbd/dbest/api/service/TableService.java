package sgbd.dbest.api.service;

import database.TableCreator;
import entities.Column;
import entities.cells.CSVTableCell;
import entities.cells.FYITableCell;
import entities.cells.TableCell;
import entities.cells.XMLTableCell;
import enums.ColumnDataType;
import files.csv.CSVInfo;
import files.xml.XMLInfo;
import sources.xml.XMLAnalysisResult;
import sources.xml.XMLRecognizer;
import org.springframework.stereotype.Service;
import sgbd.dbest.api.dto.*;
import ibd.query.Operation;

import java.io.File;
import java.nio.file.Path;
import java.util.*;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.atomic.AtomicInteger;

/**
 * Manages the set of tables open in the current session.
 * Tables are keyed by a generated tableId string.
 */
@Service
public class TableService {

    // In-memory session registry: tableId → TableCell
    private final ConcurrentHashMap<String, TableCell> openTables = new ConcurrentHashMap<>();
    private final AtomicInteger idCounter = new AtomicInteger(1);

    // ── Public API ─────────────────────────────────────────────────────────────

    public List<TableSchemaResponse> listAll() {
        return openTables.entrySet().stream()
                .map(e -> cellToSchema(e.getKey(), e.getValue()))
                .toList();
    }

    public TableCell get(String tableId) {
        TableCell cell = openTables.get(tableId);
        if (cell == null) throw new IllegalArgumentException("Unknown table: " + tableId);
        return cell;
    }

    public void remove(String tableId) {
        TableCell cell = openTables.remove(tableId);
        if (cell != null) {
            controllers.MainController.getTables().remove(cell.getName());
            try { cell.getTable().close(); } catch (Exception ignored) {}
        }
    }

    public TableInfoResponse getTableInfo(String tableId) throws Exception {
        TableCell cell = get(tableId);
        TableInfoResponse info = new TableInfoResponse();
        info.tableId = tableId;
        info.tableName = cell.getName();
        info.type = cell.getStyle();
        info.filePath = cell.getHeaderFile() != null ? cell.getHeaderFile().getAbsolutePath() : null;
        
        Operation op = cell.getOperator();
        op.open();
        long count = 0;
        while (op.hasNext()) {
            op.next();
            count++;
        }
        op.close();
        info.rowCount = count;
        
        List<TableInfoResponse.ColumnDto> columns = new ArrayList<>();
        for (Column col : cell.getColumns()) {
            columns.add(new TableInfoResponse.ColumnDto(
                col.NAME,
                col.DATA_TYPE.name(),
                col.IS_PRIMARY_KEY
            ));
        }
        info.columns = columns;
        return info;
    }

    // ── CSV Import ─────────────────────────────────────────────────────────────

    public TableSchemaResponse importCSV(ImportCSVRequest req) throws Exception {
        Path filePath = Path.of(req.filePath);
        String tableName = req.tableName != null && !req.tableName.isBlank()
                ? req.tableName
                : fileBaseName(req.filePath);

        List<Column> columns;
        if (req.columns != null && !req.columns.isEmpty()) {
            columns = toColumns(req.columns, tableName);
        } else {
            // Auto-detect columns from CSV header
            columns = detectCSVColumns(filePath, req.separator, req.stringDelimiter, tableName);
        }

        CSVInfo info = new CSVInfo(req.separator, req.stringDelimiter, req.beginRow,
                filePath, tableName, columns);
        CSVTableCell cell = TableCreator.createCSVTable(tableName, columns, info, true);

        String id = "csv_" + idCounter.getAndIncrement();
        openTables.put(id, cell);
        controllers.MainController.getTables().put(tableName, cell);
        return cellToSchema(id, cell);
    }

    // ── XML Import ─────────────────────────────────────────────────────────────

    public TableSchemaResponse importXML(ImportXMLRequest req) throws Exception {
        Path filePath = Path.of(req.filePath);
        String tableName = req.tableName != null && !req.tableName.isBlank()
                ? req.tableName
                : fileBaseName(req.filePath);

        // If no columns provided, auto-analyze XML
        List<Column> columns;
        String rootEl = req.rootElement;
        String recordEl = req.recordElement;

        if (req.columns != null && !req.columns.isEmpty()) {
            columns = toColumns(req.columns, tableName);
        } else {
            XMLRecognizer recognizer = new XMLRecognizer(req.filePath);
            XMLAnalysisResult analysis = recognizer.analyzeStructure();
            columns = analysis.getColumns().stream()
                    .map(c -> new Column(c.NAME, tableName, c.DATA_TYPE))
                    .toList();
            // Auto-detect root/record element if not provided
            if (rootEl == null) rootEl = analysis.getRootElement();
            if (recordEl == null) recordEl = analysis.getRecordElement();
        }

        XMLRecognizer.FlatteningStrategy strategy;
        try {
            strategy = XMLRecognizer.FlatteningStrategy.valueOf(
                    req.flatteningStrategy != null ? req.flatteningStrategy : "NESTED_COLUMNS");
        } catch (IllegalArgumentException e) {
            strategy = XMLRecognizer.FlatteningStrategy.NESTED_COLUMNS;
        }

        XMLInfo info = new XMLInfo(rootEl, recordEl, strategy, filePath, tableName, columns);
        XMLTableCell cell = TableCreator.createXMLTable(tableName, columns, info, true);

        String id = "xml_" + idCounter.getAndIncrement();
        openTables.put(id, cell);
        controllers.MainController.getTables().put(tableName, cell);
        return cellToSchema(id, cell);
    }

    // ── FYI / BTree Import via .head ───────────────────────────────────────────

    public TableSchemaResponse importFYI(ImportFYIRequest req) throws Exception {
        File file = new File(req.filePath);
        TableCell cell = TableCreator.createTable(file);
        String id = "fyi_" + idCounter.getAndIncrement();
        openTables.put(id, cell);
        controllers.MainController.getTables().put(cell.getName(), cell);
        return cellToSchema(id, cell);
    }

    // ── BTree Import via .dat (auto-discovers .head) ───────────────────────────

    public TableSchemaResponse importDat(ImportDatRequest req) throws Exception {
        String datPath = req.datFilePath;
        // The .head file has the same name but with .head extension
        String headPath = datPath.replaceAll("(?i)\\.dat$", ".head");
        File headFile = new File(headPath);
        TableCell cell;
        if (headFile.exists()) {
            cell = TableCreator.createTable(headFile);
        } else {
            ibd.table.Table table = TableCreator.openBTreeTable(datPath);
            table.open();
            String tableName = fileBaseName(datPath);
            cell = new FYITableCell(tableName, table, new File(datPath));
        }
        String id = "fyi_" + idCounter.getAndIncrement();
        openTables.put(id, cell);
        controllers.MainController.getTables().put(cell.getName(), cell);
        return cellToSchema(id, cell);
    }

    // ── Memory Table ───────────────────────────────────────────────────────────

    public TableSchemaResponse importMemory(ImportMemoryRequest req) throws Exception {
        List<Column> columns = new ArrayList<>();
        if (req.columns != null) {
            for (ColumnRequest cr : req.columns) {
                columns.add(new Column(
                        cr.name,
                        req.tableName,
                        parseDataType(cr.dataType),
                        cr.isPrimaryKey
                ));
            }
        }
        // Ensure at least an id primary key column if none provided
        if (columns.isEmpty()) {
            columns.add(new Column("id", req.tableName, ColumnDataType.INTEGER, true));
        }

        // Create empty memory table (empty data map = no rows initially)
        FYITableCell cell = TableCreator.createIndex(req.tableName, columns, new java.util.HashMap<>(),
                new java.io.File(req.tableName + ".head"), true, false);

        String id = "mem_" + idCounter.getAndIncrement();
        openTables.put(id, cell);
        controllers.MainController.getTables().put(cell.getName(), cell);
        return cellToSchema(id, cell);
    }

    // ── Helpers ────────────────────────────────────────────────────────────────

    private TableSchemaResponse cellToSchema(String id, TableCell cell) {
        List<TableSchemaResponse.ColumnResponse> cols = cell.getColumns().stream()
                .map(c -> new TableSchemaResponse.ColumnResponse(c.NAME, c.DATA_TYPE.name()))
                .toList();

        String type = switch (cell.getStyle()) {
            case "csv"    -> "csv";
            case "xml"    -> "xml";
            case "fyi"    -> "fyi";
            case "memory" -> "memory";
            default       -> "fyi";
        };

        return new TableSchemaResponse(id, cell.getName(), type, cols,
                cell.getHeaderFile() != null ? cell.getHeaderFile().getAbsolutePath() : null);
    }

    private List<Column> toColumns(List<ColumnRequest> reqs, String tableName) {
        return reqs.stream().map(cr ->
                new Column(cr.name,
                        cr.source != null ? cr.source : tableName,
                        parseDataType(cr.dataType),
                        cr.isPrimaryKey)
        ).toList();
    }

    private ColumnDataType parseDataType(String dt) {
        if (dt == null) return ColumnDataType.STRING;
        return switch (dt.toUpperCase()) {
            case "INTEGER" -> ColumnDataType.INTEGER;
            case "LONG"    -> ColumnDataType.LONG;
            case "FLOAT"   -> ColumnDataType.FLOAT;
            case "DOUBLE"  -> ColumnDataType.DOUBLE;
            case "BOOLEAN" -> ColumnDataType.BOOLEAN;
            case "CHARACTER" -> ColumnDataType.CHARACTER;
            default -> ColumnDataType.STRING;
        };
    }

    private String fileBaseName(String path) {
        String name = Path.of(path).getFileName().toString();
        int dot = name.lastIndexOf('.');
        return dot > 0 ? name.substring(0, dot) : name;
    }

    /** Auto-detect CSV columns by reading the first line of the file and inferring types from first data row */
    private List<Column> detectCSVColumns(Path path, char separator, char delim, String tableName)
            throws Exception {
        try (var reader = new java.io.BufferedReader(new java.io.FileReader(path.toFile()))) {
            String headerLine = reader.readLine();
            if (headerLine == null) return List.of(new Column("value", tableName, ColumnDataType.STRING));
            String[] headerParts = headerLine.split(String.valueOf(separator));
            
            String dataLine = reader.readLine();
            String[] dataParts = dataLine != null ? dataLine.split(String.valueOf(separator)) : null;
            
            List<Column> cols = new ArrayList<>();
            for (int i = 0; i < headerParts.length; i++) {
                String colName = headerParts[i].trim().replace("\"", "").replace("'", "");
                if (colName.isBlank()) colName = "col" + (cols.size() + 1);
                
                ColumnDataType dt = ColumnDataType.STRING;
                if (dataParts != null && i < dataParts.length) {
                    String val = dataParts[i].trim().replace("\"", "").replace("'", "");
                    try {
                        Long.parseLong(val);
                        dt = ColumnDataType.LONG;
                    } catch (NumberFormatException e) {
                        try {
                            Double.parseDouble(val);
                            dt = ColumnDataType.DOUBLE;
                        } catch (NumberFormatException e2) {
                            if (val.equalsIgnoreCase("true") || val.equalsIgnoreCase("false")) {
                                dt = ColumnDataType.BOOLEAN;
                            }
                        }
                    }
                }
                cols.add(new Column(colName, tableName, dt));
            }
            return cols;
        }
    }
}
