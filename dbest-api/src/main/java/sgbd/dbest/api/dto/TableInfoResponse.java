package sgbd.dbest.api.dto;

import java.util.List;

/**
 * Detailed statistics and metadata about a loaded table.
 */
public class TableInfoResponse {
    public String tableId;
    public String tableName;
    public String type; // csv, fyi, xml, memory, jdbc
    public String filePath;
    public long rowCount;
    public List<ColumnDto> columns;

    public static class ColumnDto {
        public String name;
        public String type;
        public boolean isPrimaryKey;

        public ColumnDto(String name, String type, boolean isPrimaryKey) {
            this.name = name;
            this.type = type;
            this.isPrimaryKey = isPrimaryKey;
        }
    }
}
