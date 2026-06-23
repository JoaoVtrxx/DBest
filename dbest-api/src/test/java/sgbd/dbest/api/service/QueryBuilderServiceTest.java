package sgbd.dbest.api.service;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import sgbd.dbest.api.dto.*;
import ibd.query.Operation;
import ibd.query.lookup.*;
import java.nio.file.Path;
import java.util.*;

import static org.junit.jupiter.api.Assertions.*;

public class QueryBuilderServiceTest {

    private TableService tableService;
    private QueryBuilderService queryBuilderService;
    private String tableId;

    @BeforeEach
    void setUp() throws Exception {
        tableService = new TableService();
        queryBuilderService = new QueryBuilderService();

        // Load mock table
        ImportCSVRequest req = new ImportCSVRequest();
        req.filePath = Path.of("src/test/resources/data/mock_students.csv").toAbsolutePath().toString();
        req.tableName = "students";
        req.columns = new ArrayList<>();

        ColumnRequest colId = new ColumnRequest();
        colId.name = "id";
        colId.dataType = "INTEGER";
        colId.isPrimaryKey = true;
        req.columns.add(colId);

        ColumnRequest colName = new ColumnRequest();
        colName.name = "name";
        colName.dataType = "STRING";
        colName.isPrimaryKey = false;
        req.columns.add(colName);

        ColumnRequest colAge = new ColumnRequest();
        colAge.name = "age";
        colAge.dataType = "LONG";
        colAge.isPrimaryKey = false;
        req.columns.add(colAge);

        ColumnRequest colGrade = new ColumnRequest();
        colGrade.name = "grade";
        colGrade.dataType = "STRING";
        colGrade.isPrimaryKey = false;
        req.columns.add(colGrade);

        TableSchemaResponse res = tableService.importCSV(req);
        tableId = res.tableId;
    }

    @Test
    void testParsePredicateComparison() throws Exception {
        LookupFilter filter = queryBuilderService.parsePredicate("age > 20");
        assertNotNull(filter);
        assertTrue(filter instanceof SingleColumnLookupFilter);

        LookupFilter filterEq = queryBuilderService.parsePredicate("name = 'Alice'");
        assertNotNull(filterEq);
        assertTrue(filterEq instanceof SingleColumnLookupFilter);

        LookupFilter filterNull = queryBuilderService.parsePredicate("age IS NULL");
        assertNotNull(filterNull);
        assertTrue(filterNull instanceof SingleColumnLookupFilter);

        LookupFilter filterNotNull = queryBuilderService.parsePredicate("age IS NOT NULL");
        assertNotNull(filterNotNull);
        assertTrue(filterNotNull instanceof SingleColumnLookupFilter);
    }

    @Test
    void testParsePredicateComposite() throws Exception {
        LookupFilter filter = queryBuilderService.parsePredicate("age > 20 AND grade = 'A'");
        assertNotNull(filter);
        assertTrue(filter instanceof CompositeLookupFilter);
    }

    @Test
    void testBuildFilterOperation() throws Exception {
        List<ExecuteGraphRequest.NodeDto> nodes = new ArrayList<>();
        
        ExecuteGraphRequest.NodeDto tableNode = new ExecuteGraphRequest.NodeDto();
        tableNode.id = "n_table";
        tableNode.type = "table";
        tableNode.tableId = tableId;
        nodes.add(tableNode);

        ExecuteGraphRequest.NodeDto filterNode = new ExecuteGraphRequest.NodeDto();
        filterNode.id = "n_filter";
        filterNode.type = "operator";
        filterNode.operatorType = "FILTER";
        filterNode.arguments = Map.of("predicate", "age > 20");
        nodes.add(filterNode);

        List<ExecuteGraphRequest.EdgeDto> edges = new ArrayList<>();
        ExecuteGraphRequest.EdgeDto edge = new ExecuteGraphRequest.EdgeDto();
        edge.source = "n_table";
        edge.target = "n_filter";
        edges.add(edge);

        Operation root = queryBuilderService.buildOperation("n_filter", nodes, edges, tableService);
        assertNotNull(root);
        assertTrue(root instanceof ibd.query.unaryop.filter.Filter);

        root.open();
        int count = 0;
        while (root.hasNext()) {
            root.next();
            count++;
        }
        root.close();
        assertEquals(2, count); // Bob (22) and David (21)
    }

    @Test
    void testBuildLimitOperation() throws Exception {
        List<ExecuteGraphRequest.NodeDto> nodes = new ArrayList<>();
        
        ExecuteGraphRequest.NodeDto tableNode = new ExecuteGraphRequest.NodeDto();
        tableNode.id = "n_table";
        tableNode.type = "table";
        tableNode.tableId = tableId;
        nodes.add(tableNode);

        ExecuteGraphRequest.NodeDto limitNode = new ExecuteGraphRequest.NodeDto();
        limitNode.id = "n_limit";
        limitNode.type = "operator";
        limitNode.operatorType = "LIMIT";
        limitNode.arguments = Map.of("count", "3", "offset", "0");
        nodes.add(limitNode);

        List<ExecuteGraphRequest.EdgeDto> edges = new ArrayList<>();
        ExecuteGraphRequest.EdgeDto edge = new ExecuteGraphRequest.EdgeDto();
        edge.source = "n_table";
        edge.target = "n_limit";
        edges.add(edge);

        Operation root = queryBuilderService.buildOperation("n_limit", nodes, edges, tableService);
        assertNotNull(root);
        assertTrue(root instanceof ibd.query.unaryop.Limit);

        root.open();
        int count = 0;
        while (root.hasNext()) {
            root.next();
            count++;
        }
        root.close();
        assertEquals(3, count);
    }

    @Test
    void testBuildSortOperation() throws Exception {
        List<ExecuteGraphRequest.NodeDto> nodes = new ArrayList<>();
        
        ExecuteGraphRequest.NodeDto tableNode = new ExecuteGraphRequest.NodeDto();
        tableNode.id = "n_table";
        tableNode.type = "table";
        tableNode.tableId = tableId;
        nodes.add(tableNode);

        ExecuteGraphRequest.NodeDto sortNode = new ExecuteGraphRequest.NodeDto();
        sortNode.id = "n_sort";
        sortNode.type = "operator";
        sortNode.operatorType = "SORT";
        sortNode.arguments = Map.of("column", "age", "ascending", "true");
        nodes.add(sortNode);

        List<ExecuteGraphRequest.EdgeDto> edges = new ArrayList<>();
        ExecuteGraphRequest.EdgeDto edge = new ExecuteGraphRequest.EdgeDto();
        edge.source = "n_table";
        edge.target = "n_sort";
        edges.add(edge);

        Operation root = queryBuilderService.buildOperation("n_sort", nodes, edges, tableService);
        assertNotNull(root);
        assertTrue(root instanceof ibd.query.unaryop.sort.Sort);
    }
}
