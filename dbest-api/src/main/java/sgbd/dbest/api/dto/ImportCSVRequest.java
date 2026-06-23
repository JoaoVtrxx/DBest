package sgbd.dbest.api.dto;

import java.util.List;

/** Request body for POST /api/tables/csv */
public class ImportCSVRequest {
    public String filePath;
    public char separator = ',';
    public char stringDelimiter = '"';
    public int beginRow = 1;
    public String tableName;
    public List<ColumnRequest> columns; // optional — if absent, auto-detect from file
}
