package sgbd.dbest.api.service;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import sgbd.dbest.api.dto.*;
import entities.cells.TableCell;
import java.nio.file.Path;
import java.util.List;
import java.util.ArrayList;

import static org.junit.jupiter.api.Assertions.*;

public class TableServiceTest {

    private TableService tableService;

    @BeforeEach
    void setUp() {
        tableService = new TableService();
    }

    @Test
    void testImportCSVAutoDetect() throws Exception {
        ImportCSVRequest req = new ImportCSVRequest();
        req.filePath = Path.of("src/test/resources/data/mock_students.csv").toAbsolutePath().toString();
        req.separator = ',';
        req.stringDelimiter = '"';
        req.beginRow = 1;
        req.tableName = "students";

        TableSchemaResponse response = tableService.importCSV(req);

        assertNotNull(response);
        assertEquals("students", response.tableName);
        assertEquals("csv", response.type);
        assertEquals(4, response.columns.size());

        // Verify it was added to openTables
        TableCell cell = tableService.get(response.tableId);
        assertNotNull(cell);
        assertEquals("students", cell.getName());
    }

    @Test
    void testImportXMLAutoDetect() throws Exception {
        ImportXMLRequest req = new ImportXMLRequest();
        req.filePath = Path.of("src/test/resources/data/mock_employees.xml").toAbsolutePath().toString();
        req.tableName = "employees";

        TableSchemaResponse response = tableService.importXML(req);

        assertNotNull(response);
        assertEquals("employees", response.tableName);
        assertEquals("xml", response.type);
        assertTrue(response.columns.size() >= 4);

        TableCell cell = tableService.get(response.tableId);
        assertNotNull(cell);
        assertEquals("employees", cell.getName());
    }

    @Test
    void testImportMemoryTable() throws Exception {
        ImportMemoryRequest req = new ImportMemoryRequest();
        req.tableName = "memory_table";
        req.columns = new ArrayList<>();
        
        ColumnRequest col1 = new ColumnRequest();
        col1.name = "id";
        col1.dataType = "INTEGER";
        col1.isPrimaryKey = true;
        req.columns.add(col1);

        ColumnRequest col2 = new ColumnRequest();
        col2.name = "name";
        col2.dataType = "STRING";
        col2.isPrimaryKey = false;
        req.columns.add(col2);

        TableSchemaResponse response = tableService.importMemory(req);

        assertNotNull(response);
        assertEquals("memory_table", response.tableName);
        assertEquals("fyi", response.type);

        TableCell cell = tableService.get(response.tableId);
        assertNotNull(cell);
        assertEquals("memory_table", cell.getName());
    }

    @Test
    void testRemoveAndListTables() throws Exception {
        ImportCSVRequest req = new ImportCSVRequest();
        req.filePath = Path.of("src/test/resources/data/mock_students.csv").toAbsolutePath().toString();
        req.tableName = "students_temp";
        TableSchemaResponse response = tableService.importCSV(req);

        List<TableSchemaResponse> listBefore = tableService.listAll();
        assertTrue(listBefore.stream().anyMatch(t -> t.tableId.equals(response.tableId)));

        tableService.remove(response.tableId);

        List<TableSchemaResponse> listAfter = tableService.listAll();
        assertFalse(listAfter.stream().anyMatch(t -> t.tableId.equals(response.tableId)));
    }

    @Test
    void testImportFYITable() throws Exception {
        // 1. Create a BTree table using importMemory
        ImportMemoryRequest req = new ImportMemoryRequest();
        req.tableName = "memory_table_fyi";
        req.columns = new ArrayList<>();
        
        ColumnRequest col1 = new ColumnRequest();
        col1.name = "id";
        col1.dataType = "INTEGER";
        col1.isPrimaryKey = true;
        req.columns.add(col1);

        tableService.importMemory(req);

        // The file should be created at "memory_table_fyi.head"
        java.io.File headFile = new java.io.File("memory_table_fyi.head");
        java.io.File datFile = new java.io.File("memory_table_fyi.dat");
        assertTrue(headFile.exists(), "Header file should be created");

        // 2. Load it back using importFYI
        ImportFYIRequest fyiReq = new ImportFYIRequest();
        fyiReq.filePath = headFile.getAbsolutePath();
        fyiReq.tableName = "fyi_loaded";

        TableSchemaResponse response = tableService.importFYI(fyiReq);

        assertNotNull(response);
        assertEquals("memory_table_fyi", response.tableName);
        assertEquals("fyi", response.type);

        // 3. Clean up files
        try {
            headFile.delete();
            datFile.delete();
        } catch (Exception ignored) {}
    }
}
