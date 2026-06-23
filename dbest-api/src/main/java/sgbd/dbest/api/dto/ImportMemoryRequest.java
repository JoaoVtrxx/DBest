package sgbd.dbest.api.dto;

import java.util.List;

/** Request body for POST /api/tables/memory */
public class ImportMemoryRequest {
    public String tableName;
    public List<ColumnRequest> columns;
}
