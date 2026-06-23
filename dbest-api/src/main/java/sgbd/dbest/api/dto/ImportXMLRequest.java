package sgbd.dbest.api.dto;

import java.util.List;

/** Request body for POST /api/tables/xml */
public class ImportXMLRequest {
    public String filePath;
    public String tableName;
    public String rootElement;
    public String recordElement;
    public String flatteningStrategy = "NESTED_COLUMNS";
    public boolean removeCommonPrefixes = true;
    public List<ColumnRequest> columns;
}
