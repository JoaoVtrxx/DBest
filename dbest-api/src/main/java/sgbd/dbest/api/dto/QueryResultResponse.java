package sgbd.dbest.api.dto;

import java.util.List;
import java.util.Map;

/** Response for query execution result (paginated) */
public class QueryResultResponse {
    public String jobId;
    public List<String> columns;
    public long totalRows;
    public long executionTimeMs;
    public List<Map<String, String>> rows;  // current page rows
    public int page;
    public int pageSize;
    public int totalPages;

    public QueryResultResponse(String jobId, List<String> columns, long totalRows,
                               long executionTimeMs, List<Map<String, String>> rows,
                               int page, int pageSize) {
        this.jobId = jobId;
        this.columns = columns;
        this.totalRows = totalRows;
        this.executionTimeMs = executionTimeMs;
        this.rows = rows;
        this.page = page;
        this.pageSize = pageSize;
        this.totalPages = (int) Math.ceil((double) totalRows / Math.max(pageSize, 1));
    }
}
