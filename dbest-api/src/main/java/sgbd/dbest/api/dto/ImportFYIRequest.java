package sgbd.dbest.api.dto;

/** Request body for POST /api/tables/fyi — load existing .head file */
public class ImportFYIRequest {
    public String filePath;   // path to .head or .dat file
    public String tableName;  // optional override
}
