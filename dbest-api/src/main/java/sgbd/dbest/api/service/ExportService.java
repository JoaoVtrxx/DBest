package sgbd.dbest.api.service;

import database.TableCreator;
import database.TuplesExtractor;
import entities.Column;
import entities.cells.TableCell;
import enums.ColumnDataType;
import ibd.query.Operation;
import ibd.query.Tuple;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import sgbd.dbest.api.dto.ImportFYIRequest;
import sgbd.dbest.api.dto.TableSchemaResponse;

import java.io.File;
import java.util.*;

@Service
public class ExportService {

    @Autowired
    private TableService tableService;

    /**
     * Exports query results to CSV.
     */
    public String exportToCSV(Operation op) throws Exception {
        StringBuilder csv = new StringBuilder();
        boolean columnsPut = false;

        op.open();
        try {
            Tuple tuple = op.next();
            while (tuple != null) {
                Map<String, String> row = TuplesExtractor.getRow_(tuple, op, true);
                if (!columnsPut) {
                    boolean repeatedColumnName = false;
                    Set<String> columnNames = new HashSet<>();
                    for (String column : row.keySet()) {
                        if (!columnNames.add(Column.removeSource(column))) {
                            repeatedColumnName = true;
                        }
                    }

                    int i = 0;
                    for (String inf : row.keySet()) {
                        if (i++ != 0) csv.append(",");
                        String columnName = repeatedColumnName ? inf : Column.removeSource(inf);
                        csv.append(columnName);
                    }
                    csv.append("\n");
                    columnsPut = true;
                }

                int i = 0;
                for (String inf : row.values()) {
                    if (i++ != 0) csv.append(",");
                    csv.append(inf != null ? inf : "");
                }
                csv.append("\n");
                tuple = op.next();
            }
        } finally {
            op.close();
        }

        return csv.toString();
    }

    /**
     * Exports query results to a MySQL compatible SQL Script.
     */
    public String exportToSQL(Operation op, String tableName, List<String> pkColumns) throws Exception {
        StringBuilder sql = new StringBuilder();
        
        List<Map<String, String>> allRows = TuplesExtractor.getAllRowsList(op, false);
        
        // Resolve columns from operator content info
        List<Column> columns = new ArrayList<>();
        try {
            for (Map.Entry<String, List<String>> entry : op.getContentInfo().entrySet()) {
                String sourceName = entry.getKey();
                for (String colName : entry.getValue()) {
                    // Default to STRING type
                    columns.add(new Column(colName, sourceName, ColumnDataType.STRING));
                }
            }
        } catch (Exception ignored) {
            if (!allRows.isEmpty()) {
                for (String colName : allRows.get(0).keySet()) {
                    columns.add(new Column(Column.removeSource(colName), Column.removeName(colName), ColumnDataType.STRING));
                }
            }
        }

        String dbName = "dbest_database";
        sql.append(String.format("CREATE DATABASE IF NOT EXISTS %s;%n", dbName));
        sql.append(String.format("USE %s;%n%n", dbName));
        sql.append(String.format("DROP TABLE IF EXISTS %s;%n%n", tableName));
        sql.append(String.format("CREATE TABLE %s (%n", tableName));

        int colIdx = 0;
        for (Column col : columns) {
            if (colIdx++ > 0) sql.append(",\n");
            
            String colName = col.NAME;
            String sqlType = switch (col.DATA_TYPE) {
                case INTEGER, LONG -> "INT";
                case FLOAT -> "FLOAT";
                case DOUBLE -> "DOUBLE";
                case CHARACTER -> "VARCHAR(1)";
                case BOOLEAN -> "BOOLEAN";
                default -> "TEXT";
            };
            sql.append(String.format("\t`%s` %s NULL", colName, sqlType));
        }

        if (pkColumns != null && !pkColumns.isEmpty()) {
            sql.append(",\n\tPRIMARY KEY (");
            for (int i = 0; i < pkColumns.size(); i++) {
                if (i > 0) sql.append(", ");
                sql.append("`").append(Column.removeSource(pkColumns.get(i))).append("`");
            }
            sql.append(")");
        }

        sql.append("\n);\n\n");

        for (Map<String, String> row : allRows) {
            sql.append(String.format("INSERT INTO %s VALUES (", tableName));
            int cellIdx = 0;
            for (Column col : columns) {
                if (cellIdx++ > 0) sql.append(", ");
                
                String rawVal = row.get(col.getSourceAndName());
                if (rawVal == null) {
                    rawVal = row.get(col.NAME); // fallback
                }

                if (rawVal == null || rawVal.equalsIgnoreCase("null")) {
                    sql.append("NULL");
                } else {
                    boolean isNumeric = col.DATA_TYPE == ColumnDataType.INTEGER || 
                                        col.DATA_TYPE == ColumnDataType.LONG || 
                                        col.DATA_TYPE == ColumnDataType.FLOAT || 
                                        col.DATA_TYPE == ColumnDataType.DOUBLE ||
                                        col.DATA_TYPE == ColumnDataType.BOOLEAN;
                    if (isNumeric) {
                        sql.append(rawVal);
                    } else {
                        sql.append("'").append(rawVal.replace("'", "''")).append("'");
                    }
                }
            }
            sql.append(");\n");
        }

        return sql.toString();
    }

    /**
     * Exports query results to a new FYI BTree index on the server.
     */
    public TableSchemaResponse exportToFYI(Operation op, String tableName, List<String> pkColumns, String outputFilePath, boolean unique) throws Exception {
        Map<Integer, Map<String, String>> rows = new HashMap<>();
        
        op.open();
        try {
            int idx = 0;
            while (op.hasNext()) {
                Tuple tuple = op.next();
                Map<String, String> row = TuplesExtractor.getRow_(tuple, op, false);
                if (row != null) {
                    rows.put(idx++, row);
                }
            }
        } finally {
            op.close();
        }

        // Get columns from the operation
        List<Column> allCols = new ArrayList<>();
        try {
            for (Map.Entry<String, List<String>> entry : op.getContentInfo().entrySet()) {
                String sourceName = entry.getKey();
                for (String colName : entry.getValue()) {
                    allCols.add(new Column(colName, sourceName, ColumnDataType.STRING));
                }
            }
        } catch (Exception ignored) {
            if (!rows.isEmpty()) {
                for (String colName : rows.get(0).keySet()) {
                    allCols.add(new Column(Column.removeSource(colName), Column.removeName(colName), ColumnDataType.STRING));
                }
            }
        }

        List<Column> columnsWithPrimaryKey = new ArrayList<>();
        for (String pkColName : pkColumns) {
            Column baseCol = allCols.stream()
                    .filter(c -> c.getSourceAndName().equalsIgnoreCase(pkColName) || c.NAME.equalsIgnoreCase(pkColName))
                    .findFirst()
                    .orElse(new Column(pkColName, tableName, ColumnDataType.STRING));
            columnsWithPrimaryKey.add(new Column(baseCol, true));
        }

        for (Column c : allCols) {
            if (columnsWithPrimaryKey.stream().anyMatch(x -> x.getSourceAndName().equalsIgnoreCase(c.getSourceAndName()))) {
                continue;
            }
            columnsWithPrimaryKey.add(new Column(c, false));
        }

        File headFile = new File(outputFilePath);
        TableCell createdCell = TableCreator.createIndex(tableName, columnsWithPrimaryKey, rows, headFile, true, unique);

        // Register the new table in the session TableService
        ImportFYIRequest importReq = new ImportFYIRequest();
        importReq.filePath = headFile.getAbsolutePath();
        importReq.tableName = tableName;
        return tableService.importFYI(importReq);
    }
}
