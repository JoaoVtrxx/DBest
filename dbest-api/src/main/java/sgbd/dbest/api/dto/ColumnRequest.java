package sgbd.dbest.api.dto;

/** Shared column descriptor used in import requests */
public class ColumnRequest {
    public String name;
    public String source;          // table/alias name (optional — defaults to tableName)
    public String dataType = "STRING";  // INTEGER | LONG | FLOAT | DOUBLE | STRING | BOOLEAN | CHARACTER
    public boolean isPrimaryKey = false;
}
