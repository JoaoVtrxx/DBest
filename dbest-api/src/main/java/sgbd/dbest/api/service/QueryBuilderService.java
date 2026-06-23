package sgbd.dbest.api.service;

import ibd.query.Operation;
import ibd.query.binaryop.join.*;
import ibd.query.binaryop.set.*;
import ibd.query.lookup.*;
import ibd.query.unaryop.*;
import ibd.query.unaryop.filter.Filter;
import ibd.query.unaryop.sort.Sort;
import ibd.query.unaryop.aggregation.*;
import ibd.table.ComparisonTypes;
import org.springframework.stereotype.Service;
import sgbd.dbest.api.dto.ExecuteGraphRequest.EdgeDto;
import sgbd.dbest.api.dto.ExecuteGraphRequest.NodeDto;

import java.util.*;

/**
 * Translates a JSON operator graph (from the frontend) into a dbest-core
 * {@link Operation} tree that can be executed by TuplesExtractor.
 *
 * <p>Graph conventions (mirrors querySerializer.ts):
 * <ul>
 *   <li>Edges are directed: {@code source → target}, meaning the <em>source</em>
 *       node feeds data INTO the <em>target</em> node.</li>
 *   <li>Root node: the node identified by {@code rootNodeId} — no outgoing edges
 *       from it lead further up.</li>
 *   <li>Binary operators (joins/sets) must have exactly two incoming edges;
 *       the first edge found is treated as the LEFT child, the second as RIGHT.</li>
 * </ul>
 */
@Service
public class QueryBuilderService {

    // ── Public entry point ─────────────────────────────────────────────────────

    /**
     * Build an {@link Operation} tree from the given graph.
     *
     * @param rootNodeId  ID of the root (output) node
     * @param nodes       all graph nodes
     * @param edges       all directed edges (source → target)
     * @param tableService used to resolve table-type leaf nodes
     * @return the fully constructed (but not yet opened) root {@link Operation}
     * @throws Exception if any node configuration is invalid
     */
    public Operation buildOperation(String rootNodeId,
                                    List<NodeDto> nodes,
                                    List<EdgeDto> edges,
                                    TableService tableService) throws Exception {

        // Index nodes by id for quick lookup
        Map<String, NodeDto> nodeMap = new HashMap<>();
        for (NodeDto n : nodes) {
            nodeMap.put(n.id, n);
        }

        // Build a map: targetNodeId → list of source node IDs (children)
        // An edge "source → target" means source is a CHILD of target.
        Map<String, List<String>> childrenMap = new HashMap<>();
        for (EdgeDto e : edges) {
            childrenMap.computeIfAbsent(e.target, k -> new ArrayList<>()).add(e.source);
        }

        return buildNode(rootNodeId, nodeMap, childrenMap, tableService);
    }

    // ── Recursive builder ──────────────────────────────────────────────────────

    private Operation buildNode(String nodeId,
                                Map<String, NodeDto> nodeMap,
                                Map<String, List<String>> childrenMap,
                                TableService tableService) throws Exception {

        NodeDto node = nodeMap.get(nodeId);
        if (node == null) {
            throw new IllegalArgumentException("Node not found: " + nodeId);
        }

        List<String> children = childrenMap.getOrDefault(nodeId, Collections.emptyList());

        if ("table".equalsIgnoreCase(node.type)) {
            // Leaf node — resolve directly from TableService
            return buildTableNode(node, tableService);
        }

        // Operator node
        String opType = node.operatorType == null ? "" : node.operatorType.toUpperCase();
        Map<String, String> args = node.arguments != null ? node.arguments : Collections.emptyMap();

        return switch (opType) {

            // ── Unary operators ───────────────────────────────────────────────
            case "FILTER" -> {
                Operation child = buildSingleChild(nodeId, children, nodeMap, childrenMap, tableService);
                String pred = args.get("predicate");
                if (pred == null || pred.isBlank()) {
                    throw new IllegalArgumentException("Filter operator predicate is not configured.");
                }
                LookupFilter filter = parsePredicate(pred);
                yield new Filter(child, filter);
            }

            case "SCAN" -> {
                Operation child = buildSingleChild(nodeId, children, nodeMap, childrenMap, tableService);
                yield new ibd.query.unaryop.Scan(child);
            }

            case "HASH_GROUP" -> {
                Operation child = buildSingleChild(nodeId, children, nodeMap, childrenMap, tableService);
                List<String> groupOrdered = getOrderedArgs(args);
                String groupByCol = groupOrdered.isEmpty() ? "" : groupOrdered.get(0);
                yield new ibd.query.unaryop.aggregation.HashAggregation(child, "", groupByCol, new ArrayList<>(), true);
            }

            case "AGGREGATION" -> {
                Operation childOp;
                String groupByCol = null;
                if (!children.isEmpty()) {
                    String childId = children.get(0);
                    NodeDto childNode = nodeMap.get(childId);
                    if (childNode != null && "HASH_GROUP".equalsIgnoreCase(childNode.operatorType)) {
                        Map<String, String> groupArgs = childNode.arguments != null ? childNode.arguments : Collections.emptyMap();
                        List<String> groupOrdered = getOrderedArgs(groupArgs);
                        if (!groupOrdered.isEmpty()) {
                            groupByCol = groupOrdered.get(0);
                        }
                        List<String> grandChildren = childrenMap.getOrDefault(childId, Collections.emptyList());
                        childOp = buildSingleChild(childId, grandChildren, nodeMap, childrenMap, tableService);
                    } else {
                        childOp = buildSingleChild(nodeId, children, nodeMap, childrenMap, tableService);
                    }
                } else {
                    throw new IllegalArgumentException("Aggregation operator has no children");
                }
                
                List<String> aggOrdered = getOrderedArgs(args);
                List<AggregationType> aggregations = new ArrayList<>();
                for (int i = 0; i < aggOrdered.size(); i += 3) {
                    if (i + 2 >= aggOrdered.size()) break;
                    String func = aggOrdered.get(i);
                    String col = aggOrdered.get(i + 1);
                    
                    int aggTypeVal;
                    if (func.equalsIgnoreCase("COUNT") && col.equals("*")) {
                        aggTypeVal = AggregationType.COUNT_ALL;
                    } else {
                        aggTypeVal = switch (func.toUpperCase()) {
                            case "MAX" -> AggregationType.MAX;
                            case "MIN" -> AggregationType.MIN;
                            case "AVG" -> AggregationType.AVG;
                            case "SUM" -> AggregationType.SUM;
                            case "COUNT" -> AggregationType.COUNT;
                            case "FIRST" -> AggregationType.FIRST;
                            case "LAST" -> AggregationType.LAST;
                            case "COUNT_NULL" -> AggregationType.COUNT_NULL;
                            default -> throw new IllegalArgumentException("Unknown aggregation function: " + func);
                        };
                    }
                    aggregations.add(new AggregationType(col, aggTypeVal));
                }
                
                if (aggregations.isEmpty()) {
                    throw new IllegalArgumentException("Aggregation operator has no functions configured.");
                }
                
                if (groupByCol != null) {
                    yield new ibd.query.unaryop.aggregation.HashAggregation(childOp, "", groupByCol, aggregations, true);
                } else {
                    yield new ibd.query.unaryop.aggregation.AllAggregation(childOp, "", aggregations);
                }
            }

            case "PROJECTION" -> {
                Operation child = buildSingleChild(nodeId, children, nodeMap, childrenMap, tableService);
                String colsStr = args.get("columns");
                if (colsStr == null || colsStr.isBlank()) {
                    throw new IllegalArgumentException("Projection operator columns are not configured.");
                }
                String[] cols = splitColumns(colsStr);
                yield new Projection(child, cols);
            }

            case "SORT" -> {
                Operation child = buildSingleChild(nodeId, children, nodeMap, childrenMap, tableService);
                String colArg = args.get("column");
                if (colArg == null || colArg.isBlank()) {
                    throw new IllegalArgumentException("Sort operator column is not configured.");
                }
                boolean asc = !"false".equalsIgnoreCase(args.getOrDefault("ascending", "true"));
                if (colArg.contains(",")) {
                    String[] cols = splitColumns(colArg);
                    yield new Sort(child, cols, asc);
                } else {
                    yield new Sort(child, colArg.trim(), asc);
                }
            }

            case "LIMIT" -> {
                Operation child = buildSingleChild(nodeId, children, nodeMap, childrenMap, tableService);
                int count  = Integer.parseInt(args.getOrDefault("count", "100"));
                int offset = Integer.parseInt(args.getOrDefault("offset", "0"));
                yield new Limit(child, count, offset);
            }

            case "DUPLICATE_REMOVAL" -> {
                Operation child = buildSingleChild(nodeId, children, nodeMap, childrenMap, tableService);
                yield new DuplicateRemoval(child);
            }

            case "SOURCE_RENAME" -> {
                Operation child = buildSingleChild(nodeId, children, nodeMap, childrenMap, tableService);
                String oldAlias = args.getOrDefault("oldAlias", "");
                String newAlias = args.getOrDefault("newAlias", "");
                yield new SourceRename(child, oldAlias, newAlias);
            }

            // ── Binary join operators ─────────────────────────────────────────
            case "NESTED_LOOP_JOIN" -> {
                Operation[] lr = buildTwoChildren(nodeId, children, nodeMap, childrenMap, tableService);
                JoinPredicate pred = parseJoinPredicate(args);
                yield new NestedLoopJoin(lr[0], lr[1], pred);
            }

            case "HASH_JOIN", "HASH_INNER_JOIN" -> {
                Operation[] lr = buildTwoChildren(nodeId, children, nodeMap, childrenMap, tableService);
                JoinPredicate pred = parseJoinPredicate(args);
                yield new HashInnerJoin(lr[0], lr[1], pred);
            }

            case "MERGE_JOIN" -> {
                Operation[] lr = buildTwoChildren(nodeId, children, nodeMap, childrenMap, tableService);
                JoinPredicate pred = parseJoinPredicate(args);
                yield new MergeJoin(lr[0], lr[1], pred);
            }

            case "CROSS_JOIN" -> {
                Operation[] lr = buildTwoChildren(nodeId, children, nodeMap, childrenMap, tableService);
                yield new CrossJoin(lr[0], lr[1]);
            }

            // ── Set operators ─────────────────────────────────────────────────
            case "APPEND", "UNION_ALL" -> {
                Operation[] lr = buildTwoChildren(nodeId, children, nodeMap, childrenMap, tableService);
                yield new Append(lr[0], lr[1]);
            }

            case "UNION" -> {
                Operation[] lr = buildTwoChildren(nodeId, children, nodeMap, childrenMap, tableService);
                yield new HashUnion(lr[0], lr[1]);
            }

            case "INTERSECTION" -> {
                Operation[] lr = buildTwoChildren(nodeId, children, nodeMap, childrenMap, tableService);
                yield new HashIntersection(lr[0], lr[1]);
            }

            case "DIFFERENCE" -> {
                Operation[] lr = buildTwoChildren(nodeId, children, nodeMap, childrenMap, tableService);
                yield new HashDifference(lr[0], lr[1]);
            }

            default ->
                throw new IllegalArgumentException(
                    "Unknown operator type: '" + opType + "' on node " + nodeId);
        };
    }

    // ── Helper: resolve a table-type leaf node ─────────────────────────────────

    private Operation buildTableNode(NodeDto node, TableService tableService) {
        if (node.tableId == null || node.tableId.isBlank()) {
            throw new IllegalArgumentException(
                "Table node '" + node.id + "' has no tableId");
        }
        return tableService.get(node.tableId).getOperator();
    }

    // ── Helper: single-child operators ────────────────────────────────────────

    private Operation buildSingleChild(String nodeId,
                                       List<String> children,
                                       Map<String, NodeDto> nodeMap,
                                       Map<String, List<String>> childrenMap,
                                       TableService tableService) throws Exception {
        if (children.isEmpty()) {
            throw new IllegalArgumentException(
                "Unary operator '" + nodeId + "' has no child.");
        }
        // Use first child (if multiple, warn)
        return buildNode(children.get(0), nodeMap, childrenMap, tableService);
    }

    // ── Helper: two-child (binary) operators ──────────────────────────────────

    private Operation[] buildTwoChildren(String nodeId,
                                         List<String> children,
                                         Map<String, NodeDto> nodeMap,
                                         Map<String, List<String>> childrenMap,
                                         TableService tableService) throws Exception {
        if (children.size() < 2) {
            throw new IllegalArgumentException(
                "Binary operator '" + nodeId + "' needs 2 children, found " + children.size());
        }
        Operation left  = buildNode(children.get(0), nodeMap, childrenMap, tableService);
        Operation right = buildNode(children.get(1), nodeMap, childrenMap, tableService);
        return new Operation[]{left, right};
    }

    // ── Filter predicate parsing ───────────────────────────────────────────────

    /**
     * Parses a simple predicate string into a {@link LookupFilter}.
     *
     * <p>Supported formats:
     * <ul>
     *   <li>{@code col op value}  — e.g. {@code age > 30}, {@code name = 'Alice'}</li>
     *   <li>{@code table.col op value} — e.g. {@code t1.age >= 18}</li>
     *   <li>{@code col IS NULL} / {@code col IS NOT NULL}</li>
     *   <li>AND/OR composite: {@code age > 18 AND city = 'NY'}</li>
     * </ul>
     *
     * <p>For column-to-column comparisons in joins, use {@link #parseJoinPredicate}.
     */
    public LookupFilter parsePredicate(String predicate) throws Exception {
        if (predicate == null || predicate.isBlank()) {
            return new NoLookupFilter();
        }

        String trimmed = predicate.trim();

        // Handle AND / OR composites (split on top-level AND/OR, not inside parens)
        String upper = trimmed.toUpperCase();

        // Try to split on " AND " first
        List<String> andParts = splitOnKeyword(trimmed, " AND ");
        if (andParts.size() > 1) {
            CompositeLookupFilter composite = new CompositeLookupFilter(CompositeLookupFilter.AND);
            for (String part : andParts) {
                composite.addFilter(parseSingleCondition(part.trim()));
            }
            return composite;
        }

        // Try to split on " OR "
        List<String> orParts = splitOnKeyword(trimmed, " OR ");
        if (orParts.size() > 1) {
            CompositeLookupFilter composite = new CompositeLookupFilter(CompositeLookupFilter.OR);
            for (String part : orParts) {
                composite.addFilter(parseSingleCondition(part.trim()));
            }
            return composite;
        }

        return parseSingleCondition(trimmed);
    }

    /** Parses a single condition like {@code age > 30} or {@code name IS NULL}. */
    private LookupFilter parseSingleCondition(String condition) throws Exception {
        String upper = condition.toUpperCase();

        // IS NOT NULL
        int isNotNullIdx = upper.indexOf(" IS NOT NULL");
        if (isNotNullIdx >= 0) {
            String colPart = condition.substring(0, isNotNullIdx).trim();
            return new SingleColumnLookupFilter(
                new ColumnElement(colPart),
                ComparisonTypes.IS_NOT_NULL,
                new LiteralElement(null));
        }

        // IS NULL
        int isNullIdx = upper.indexOf(" IS NULL");
        if (isNullIdx >= 0) {
            String colPart = condition.substring(0, isNullIdx).trim();
            return new SingleColumnLookupFilter(
                new ColumnElement(colPart),
                ComparisonTypes.IS_NULL,
                new LiteralElement(null));
        }

        // Detect operator token (longest first to avoid ambiguity)
        String[] OPS = {"<>", "!=", ">=", "<=", "=", ">", "<"};
        for (String op : OPS) {
            int idx = condition.indexOf(op);
            if (idx > 0) {
                String left  = condition.substring(0, idx).trim();
                String right = condition.substring(idx + op.length()).trim();
                int cmpType  = operatorToComparisonType(op);

                Element elem1 = new ColumnElement(left);
                Element elem2 = parseValueElement(right);
                return new SingleColumnLookupFilter(elem1, cmpType, elem2);
            }
        }

        throw new IllegalArgumentException("Cannot parse predicate: " + condition);
    }

    /** Determines if a value string is a column reference or a literal. */
    private Element parseValueElement(String value) throws Exception {
        // Strip surrounding quotes → string literal
        if ((value.startsWith("'") && value.endsWith("'"))
                || (value.startsWith("\"") && value.endsWith("\""))) {
            return new LiteralElement(value.substring(1, value.length() - 1));
        }
        // Try numeric literal
        try {
            if (value.contains(".")) {
                return new LiteralElement(Double.parseDouble(value));
            } else {
                return new LiteralElement(Long.parseLong(value));
            }
        } catch (NumberFormatException ignored) {
            // Not a number — treat as column reference (e.g. t2.id)
            return new ColumnElement(value);
        }
    }

    private int operatorToComparisonType(String op) {
        return switch (op) {
            case "="  -> ComparisonTypes.EQUAL;
            case "<>" , "!=" -> ComparisonTypes.DIFF;
            case ">"  -> ComparisonTypes.GREATER_THAN;
            case ">=" -> ComparisonTypes.GREATER_EQUAL_THAN;
            case "<"  -> ComparisonTypes.LOWER_THAN;
            case "<=" -> ComparisonTypes.LOWER_EQUAL_THAN;
            default   -> throw new IllegalArgumentException("Unknown operator: " + op);
        };
    }

    /**
     * Splits a string on a keyword (case-insensitive), ignoring occurrences
     * inside parentheses.
     */
    private List<String> splitOnKeyword(String text, String keyword) {
        List<String> parts = new ArrayList<>();
        String upper = text.toUpperCase();
        String kwUpper = keyword.toUpperCase();
        int depth = 0;
        int start = 0;
        for (int i = 0; i < text.length(); i++) {
            char c = text.charAt(i);
            if (c == '(') depth++;
            else if (c == ')') depth--;
            else if (depth == 0 && upper.startsWith(kwUpper, i)) {
                parts.add(text.substring(start, i));
                start = i + keyword.length();
                i = start - 1;
            }
        }
        parts.add(text.substring(start));
        return parts;
    }

    // ── Join predicate parsing ─────────────────────────────────────────────────

    /**
     * Parses join arguments into a {@link JoinPredicate}.
     *
     * <p>Argument keys (in {@code args}):
     * <ul>
     *   <li>{@code predicate} — shorthand: {@code "t1.id = t2.id, t1.dept = t2.dept"}</li>
     *   <li>{@code leftColumn} / {@code rightColumn} — single-term join:
     *       {@code "t1.id"} / {@code "t2.id"}</li>
     * </ul>
     */
    private JoinPredicate parseJoinPredicate(Map<String, String> args) {
        JoinPredicate pred = new JoinPredicate();

        // Full predicate string: "t1.id = t2.id, t1.dept = t2.dept"
        String predStr = args.get("predicate");
        if (predStr != null && !predStr.isBlank()) {
            for (String term : predStr.split(",")) {
                term = term.trim();
                // each term: "t1.id = t2.id"  or  "leftCol = rightCol"
                String[] parts = term.split("=");
                if (parts.length == 2) {
                    String left  = parts[0].trim();
                    String right = parts[1].trim();
                    // Decompose "table.col" or just "col"
                    String[] lp = left.split("\\.");
                    String[] rp = right.split("\\.");
                    if (lp.length == 2 && rp.length == 2) {
                        pred.addTerm(lp[0], lp[1], rp[0], rp[1]);
                    } else {
                        try {
                            pred.addTerm(left, right);
                        } catch (Exception ignored) {}
                    }
                }
            }
            return pred;
        }

        // Simple leftColumn / rightColumn args
        String leftCol  = args.get("leftColumn");
        String rightCol = args.get("rightColumn");
        if (leftCol != null && rightCol != null) {
            String[] lp = leftCol.trim().split("\\.");
            String[] rp = rightCol.trim().split("\\.");
            if (lp.length == 2 && rp.length == 2) {
                pred.addTerm(lp[0], lp[1], rp[0], rp[1]);
            } else {
                try {
                    pred.addTerm(leftCol.trim(), rightCol.trim());
                } catch (Exception ignored) {}
            }
        }

        return pred;
    }

    // ── Utility ───────────────────────────────────────────────────────────────

    /** Splits a comma-separated column string into a trimmed array. */
    private String[] splitColumns(String columns) {
        if (columns == null || columns.isBlank()) return new String[0];
        return Arrays.stream(columns.split(","))
                     .map(String::trim)
                     .filter(s -> !s.isEmpty())
                     .toArray(String[]::new);
    }

    private List<String> getOrderedArgs(Map<String, String> args) {
        List<String> list = new ArrayList<>();
        int i = 0;
        while (true) {
            String val = args.get(String.valueOf(i));
            if (val == null) break;
            list.add(val);
            i++;
        }
        if (list.isEmpty() && !args.isEmpty()) {
            list.addAll(args.values());
        }
        return list;
    }
}
