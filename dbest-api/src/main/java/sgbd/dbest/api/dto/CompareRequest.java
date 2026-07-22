package sgbd.dbest.api.dto;

import java.util.List;

/**
 * DTO for POST /api/query/compare.
 * Carries the marked query plans the user wants to compare side by side, each one
 * an operator graph rooted at the marked node (same shape as {@link ExecuteGraphRequest}).
 */
public class CompareRequest {

    /** The plans to compare — one column per plan in the comparison table. */
    public List<PlanDto> plans;

    /**
     * Max tuples to read per plan while measuring (0 = read all). Reading all
     * gives the full cost of producing the result, like the desktop's ">>".
     */
    public int limit = 0;

    public static class PlanDto {
        public String id;
        public String label;
        public String rootNodeId;
        public List<ExecuteGraphRequest.NodeDto> nodes;
        public List<ExecuteGraphRequest.EdgeDto> edges;
    }
}
