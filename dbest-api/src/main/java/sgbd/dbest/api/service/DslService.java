package sgbd.dbest.api.service;

import dsl.entities.*;
import dsl.utils.DslUtils;
import entities.Coordinates;
import enums.OperationType;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import sgbd.dbest.api.dto.*;
import sgbd.dbest.api.dto.ExecuteGraphRequest.EdgeDto;
import sgbd.dbest.api.dto.ExecuteGraphRequest.NodeDto;

import java.io.File;
import java.util.*;

@Service
public class DslService {

    @Autowired
    private TableService tableService;

    public static class ParseResult {
        public List<TableSchemaResponse> importedTables = new ArrayList<>();
        public GraphResponse graph = new GraphResponse();
    }

    public static class GraphResponse {
        public String rootNodeId;
        public List<NodeResponse> nodes = new ArrayList<>();
        public List<EdgeDto> edges = new ArrayList<>();
    }

    public static class NodeResponse {
        public String id;
        public String type; // "tableNode" | "operatorNode"
        public Position position;
        public Map<String, Object> data = new HashMap<>();

        public static class Position {
            public double x;
            public double y;
            public Position(double x, double y) {
                this.x = x;
                this.y = y;
            }
        }
    }

    /**
     * Parses DSL query text into React Flow nodes, edges, and a list of imported tables.
     */
    public ParseResult parse(String dslText) throws Exception {
        ParseResult result = new ParseResult();
        
        // Clear previous declarations in DslController static map
        try {
            java.lang.reflect.Field field = dsl.DslController.class.getDeclaredField("declarations");
            field.setAccessible(true);
            Map<?, ?> declarations = (Map<?, ?>) field.get(null);
            declarations.clear();
        } catch (Exception ignored) {}

        String[] commands = dslText.split(";");
        List<String> expressions = new ArrayList<>();

        for (String command : commands) {
            command = command.trim();
            if (command.isEmpty()) continue;

            var cmdType = DslUtils.commandRecognizer(command);
            if (cmdType == dsl.enums.CommandType.IMPORT_STATEMENT) {
                // Parse import: "import path;"
                String path = command.substring(6).trim();
                File file = new File(path);
                TableSchemaResponse schema;
                if (path.toLowerCase().endsWith(".dat")) {
                    ImportDatRequest reqDat = new ImportDatRequest();
                    reqDat.datFilePath = path;
                    schema = tableService.importDat(reqDat);
                } else {
                    ImportFYIRequest reqFyi = new ImportFYIRequest();
                    reqFyi.filePath = path;
                    schema = tableService.importFYI(reqFyi);
                }
                result.importedTables.add(schema);
            } else if (cmdType == dsl.enums.CommandType.VARIABLE_DECLARATION) {
                // Register declaration in DslController using reflection
                String varName = command.substring(0, command.indexOf("=")).trim();
                String expr = command.substring(command.indexOf("=") + 1).trim();
                
                try {
                    java.lang.reflect.Field field = dsl.DslController.class.getDeclaredField("declarations");
                    field.setAccessible(true);
                    @SuppressWarnings("unchecked")
                    Map<String, VariableDeclaration> declarations = (Map<String, VariableDeclaration>) field.get(null);
                    declarations.put(varName, new VariableDeclaration(command));
                } catch (Exception e) {
                    throw new RuntimeException("Failed to register DSL variable: " + e.getMessage(), e);
                }
            } else {
                expressions.add(command);
            }
        }

        if (expressions.isEmpty()) {
            throw new IllegalArgumentException("No relational algebra expression found in the DSL text.");
        }

        // Parse the last expression as the main output
        String mainExprText = expressions.get(expressions.size() - 1);
        Expression<?> rootExpr = DslUtils.expressionRecognizer(mainExprText, null);

        // Recursively convert Expression tree to React Flow nodes/edges
        Map<String, NodeResponse> nodeMap = new LinkedHashMap<>();
        List<EdgeDto> edges = new ArrayList<>();
        NodeResponse rootNode = convertExpression(rootExpr, nodeMap, edges);

        result.graph.rootNodeId = rootNode.id;
        result.graph.nodes = new ArrayList<>(nodeMap.values());
        result.graph.edges = edges;

        // Apply a layout if coordinates were not specified
        applyLayoutIfNecessary(rootNode.id, nodeMap, edges);

        return result;
    }

    private NodeResponse convertExpression(Expression<?> expr, Map<String, NodeResponse> nodeMap, List<EdgeDto> edges) {
        String nodeId = "node_" + UUID.randomUUID().toString().substring(0, 8);
        NodeResponse node = new NodeResponse();
        node.id = nodeId;

        Coordinates coords = expr.getCoordinates().orElse(null);
        if (coords != null) {
            node.position = new NodeResponse.Position(coords.x(), coords.y());
        }

        if (expr instanceof Relation rel) {
            node.type = "tableNode";
            node.data.put("label", rel.getFirstName());
            node.data.put("tableName", rel.getFirstName());
            node.data.put("tableType", "fyi"); // default
            
            // Resolve tableId and columns from TableService
            String tableId = findTableIdByName(rel.getFirstName());
            if (tableId != null) {
                node.data.put("tableId", tableId);
                var cell = tableService.get(tableId);
                node.data.put("tableType", cell.getStyle());
                node.data.put("columns", cell.getColumns().stream().map(c -> c.NAME).toList());
            } else {
                node.data.put("tableId", rel.getFirstName());
                node.data.put("columns", List.of());
            }
            nodeMap.put(nodeId, node);
        } else if (expr instanceof OperationExpression opExpr) {
            node.type = "operatorNode";
            String opTypeName = opExpr.getType().name();
            node.data.put("operatorType", opTypeName);
            node.data.put("displayName", opExpr.getType().displayName);
            node.data.put("label", opExpr.getType().displayName);
            node.data.put("isConfigured", true);

            List<String> args = opExpr.getArguments();
            node.data.put("arguments", args);

            nodeMap.put(nodeId, node);

            if (opExpr instanceof UnaryExpression unary) {
                NodeResponse child = convertExpression(unary.getSource(), nodeMap, edges);
                EdgeDto edge = new EdgeDto();
                edge.source = child.id;
                edge.target = nodeId;
                edges.add(edge);
            } else if (opExpr instanceof BinaryExpression binary) {
                NodeResponse left = convertExpression(binary.getSource(), nodeMap, edges);
                EdgeDto edge1 = new EdgeDto();
                edge1.source = left.id;
                edge1.target = nodeId;
                edges.add(edge1);

                NodeResponse right = convertExpression(binary.getSource2(), nodeMap, edges);
                EdgeDto edge2 = new EdgeDto();
                edge2.source = right.id;
                edge2.target = nodeId;
                edges.add(edge2);
            }
        }

        return node;
    }

    private String findTableIdByName(String name) {
        for (TableSchemaResponse table : tableService.listAll()) {
            if (table.tableName.equalsIgnoreCase(name)) {
                return table.tableId;
            }
        }
        return null;
    }

    /**
     * If some nodes have no position, compute a BFS tree layout.
     */
    private void applyLayoutIfNecessary(String rootId, Map<String, NodeResponse> nodeMap, List<EdgeDto> edges) {
        boolean hasMissingPosition = nodeMap.values().stream().anyMatch(n -> n.position == null);
        if (!hasMissingPosition) return;

        // Build adjacency map: parent -> children
        Map<String, List<String>> childrenOf = new HashMap<>();
        for (EdgeDto edge : edges) {
            childrenOf.computeIfAbsent(edge.target, k -> new ArrayList<>()).add(edge.source);
        }

        // BFS traversal to determine level/depth of each node
        List<List<String>> levels = new ArrayList<>();
        Set<String> visited = new HashSet<>();
        List<String> currentLevel = new ArrayList<>();
        currentLevel.add(rootId);

        while (!currentLevel.isEmpty()) {
            levels.add(currentLevel);
            currentLevel.forEach(visited::add);
            List<String> nextLevel = new ArrayList<>();
            for (String id : currentLevel) {
                List<String> children = childrenOf.getOrDefault(id, List.of());
                for (String childId : children) {
                    if (!visited.contains(childId)) {
                        nextLevel.add(childId);
                    }
                }
            }
            currentLevel = nextLevel;
        }

        // Assign positions
        double horizontalGap = 200;
        double verticalGap = 120;
        double startX = 250;
        double startY = 50;

        for (int levelIdx = 0; levelIdx < levels.size(); levelIdx++) {
            List<String> levelNodes = levels.get(levelIdx);
            double totalWidth = (levelNodes.size() - 1) * horizontalGap;
            double levelStartX = startX - totalWidth / 2;

            for (int colIdx = 0; colIdx < levelNodes.size(); colIdx++) {
                String id = levelNodes.get(colIdx);
                NodeResponse node = nodeMap.get(id);
                if (node != null && node.position == null) {
                    node.position = new NodeResponse.Position(
                        levelStartX + colIdx * horizontalGap,
                        startY + levelIdx * verticalGap
                    );
                }
            }
        }

        // Fallback for disconnected nodes
        for (NodeResponse node : nodeMap.values()) {
            if (node.position == null) {
                node.position = new NodeResponse.Position(startX, startY);
            }
        }
    }

    /**
     * Generates DSL text from a query graph.
     */
    public String generate(ExecuteGraphRequest req) {
        StringBuilder sb = new StringBuilder();
        
        // 1. Generate Imports
        Set<String> importedPaths = new LinkedHashSet<>();
        for (NodeDto node : req.nodes) {
            if ("tableNode".equalsIgnoreCase(node.type) || "table".equalsIgnoreCase(node.type)) {
                if (node.tableId != null) {
                    try {
                        var cell = tableService.get(node.tableId);
                        if (cell.getHeaderFile() != null) {
                            importedPaths.add(cell.getHeaderFile().getAbsolutePath());
                        }
                    } catch (Exception ignored) {}
                }
            }
        }

        for (String path : importedPaths) {
            sb.append("import ").append(path).append(";\n");
        }
        if (!importedPaths.isEmpty()) {
            sb.append("\n");
        }

        // 2. Generate Expression recursively from the root node
        if (req.rootNodeId != null) {
            Map<String, NodeDto> nodeMap = new HashMap<>();
            for (NodeDto n : req.nodes) nodeMap.put(n.id, n);

            Map<String, List<String>> childrenMap = new HashMap<>();
            for (EdgeDto edge : req.edges) {
                childrenMap.computeIfAbsent(edge.target, k -> new ArrayList<>()).add(edge.source);
            }

            sb.append(generateNodeDsl(req.rootNodeId, nodeMap, childrenMap)).append(";");
        }

        return sb.toString();
    }

    private String generateNodeDsl(String nodeId, Map<String, NodeDto> nodeMap, Map<String, List<String>> childrenMap) {
        NodeDto node = nodeMap.get(nodeId);
        if (node == null) return "";

        String positionSuffix = "";
        if (node.position != null) {
            positionSuffix = String.format("<%d,%d>", (int) node.position.x, (int) node.position.y);
        }

        if ("tableNode".equalsIgnoreCase(node.type) || "table".equalsIgnoreCase(node.type)) {
            return node.tableName + positionSuffix;
        }

        // Operator node
        OperationType type;
        try {
            type = OperationType.valueOf(node.operatorType.toUpperCase());
        } catch (Exception e) {
            return "";
        }

        String dslSyntax = type.dslSyntax;
        
        // Replace args
        String argsString = "";
        if (node.arguments != null && !node.arguments.isEmpty()) {
            if (type == OperationType.FILTER) {
                argsString = node.arguments.getOrDefault("predicate", "");
            } else if (type == OperationType.PROJECTION) {
                argsString = node.arguments.getOrDefault("columns", "");
            } else if (type == OperationType.SORT) {
                String asc = node.arguments.getOrDefault("ascending", "true");
                argsString = node.arguments.getOrDefault("column", "") + ( "false".equalsIgnoreCase(asc) ? ",false" : "" );
            } else if (type == OperationType.LIMIT) {
                argsString = node.arguments.getOrDefault("count", "100") + "," + node.arguments.getOrDefault("offset", "0");
            } else {
                argsString = String.join(",", node.arguments.values());
            }
        }
        dslSyntax = dslSyntax.replace("[args]", argsString.isEmpty() ? "" : argsString);

        // Recurse children
        List<String> children = childrenMap.getOrDefault(nodeId, List.of());
        if (type.arity == enums.OperationArity.UNARY) {
            String childDsl = children.isEmpty() ? "" : generateNodeDsl(children.get(0), nodeMap, childrenMap);
            dslSyntax = dslSyntax.replace("source", childDsl);
        } else if (type.arity == enums.OperationArity.BINARY && children.size() >= 2) {
            String leftDsl = generateNodeDsl(children.get(0), nodeMap, childrenMap);
            String rightDsl = generateNodeDsl(children.get(1), nodeMap, childrenMap);
            dslSyntax = dslSyntax.replace("source1", leftDsl).replace("source2", rightDsl);
        }

        return dslSyntax + positionSuffix;
    }
}
