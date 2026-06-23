package sgbd.dbest.api.dto;

import java.util.List;

/** Response for table schema (used by all import endpoints) */
public class TableSchemaResponse {
    public String tableId;
    public String tableName;
    public String type;                    // csv | fyi | xml | memory | jdbc
    public List<ColumnResponse> columns;
    public String filePath;

    public static class ColumnResponse {
        public String name;
        public String type;
        public ColumnResponse(String name, String type) {
            this.name = name;
            this.type = type;
        }
    }

    public TableSchemaResponse(String tableId, String tableName, String type,
                               List<ColumnResponse> columns, String filePath) {
        this.tableId = tableId;
        this.tableName = tableName;
        this.type = type;
        this.columns = columns;
        this.filePath = filePath;
    }
}
