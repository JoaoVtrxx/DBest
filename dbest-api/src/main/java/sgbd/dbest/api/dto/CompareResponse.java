package sgbd.dbest.api.dto;

import java.util.List;
import java.util.Map;

/**
 * DTO for POST /api/query/compare.
 * One {@link PlanStats} per compared plan, each carrying the same execution-cost
 * metrics the desktop's Comparator window shows (see {@code entities.cells.CellStats}).
 */
public class CompareResponse {

    public List<PlanStats> plans;

    public CompareResponse(List<PlanStats> plans) {
        this.plans = plans;
    }

    public static class PlanStats {
        public String id;
        public String label;
        /** Whether this plan executed without error. */
        public boolean ok;
        /** Error message when {@code ok} is false. */
        public String error;
        /** Number of tuples produced (the desktop's "tuples loaded"). */
        public long tuplesLoaded;
        /**
         * The cost counters this plan spent, keyed by the core's CellStats field
         * names: PK_SEARCH, SORT_TUPLES, COMPARE_FILTER, RECORDS_READ, NEXT_CALLS,
         * MEMORY_USED, BLOCKS_ACCESSED, BLOCKS_LOADED, BLOCKS_SAVED.
         */
        public Map<String, Long> metrics;
    }
}
