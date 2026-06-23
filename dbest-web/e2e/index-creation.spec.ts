import { test, expect } from "@playwright/test";
import path from "path";

test.describe("E2E Index Creation", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/");
  });

  test("should export a table as a BTree Index (FYI) and import it back", async ({ page }) => {
    // 1. Import CSV
    const importCsvBtn = page.getByTestId("import-csv-btn");
    await expect(importCsvBtn).toBeVisible();
    await importCsvBtn.click();

    await page.locator('input[placeholder="Defaults to filename without extension"]').fill("students_for_index");
    await page.locator('input[type="file"]').setInputFiles(path.join(__dirname, "fixtures", "mock_students.csv"));
    await page.getByRole("button", { name: "Import", exact: true }).click();

    const tableItem = page.getByTestId("table-entry-students_for_index");
    await expect(tableItem).toBeVisible({ timeout: 10000 });

    // 2. Drag to canvas
    const canvas = page.getByTestId("query-canvas");
    await tableItem.dragTo(canvas);
    const tableNode = page.locator('.react-flow__node-tableNode:has-text("students_for_index")');
    await expect(tableNode).toBeVisible();

    // 3. Open Context Menu and click Export
    await tableNode.click({ button: 'right' });
    const exportOption = page.locator('button:has-text("Export Table")');
    await expect(exportOption).toBeVisible();
    await exportOption.click();

    // 4. Fill Export Modal for BTree
    const exportModal = page.locator('text=Export Table / Operator');
    await expect(exportModal).toBeVisible();
    
    // Select type FYI
    await page.locator('button:has-text("BTree Index (.dat)")').click();
    
    // Fill Table Name
    await page.locator('input[placeholder="e.g. users_filtered"]').fill("students_index");

    // Fill Output File Path
    const outputFilePath = path.resolve(__dirname, "../../dbest-api/uploads/students_index.dat");
    await page.locator('input[placeholder*="users_filtered.dat"]').fill(outputFilePath);

    // Fill Primary Keys
    await page.locator('label', { hasText: 'id' }).locator('input[type="checkbox"]').check();

    // Submit Export
    await page.getByRole("button", { name: "Export" }).click();

    // Wait for the new indexed table to appear in the sidebar
    const indexTableItem = page.getByTestId("table-entry-students_index");
    await expect(indexTableItem).toBeVisible({ timeout: 15000 });

    // 5. Test executing from the index table
    // Clear canvas by selecting the table node and pressing Delete
    await tableNode.click();
    await page.keyboard.press("Delete");
    await expect(tableNode).not.toBeVisible();
    
    // Drag the newly created index table
    await indexTableItem.dragTo(canvas);
    const newTableNode = page.locator('.react-flow__node-tableNode:has-text("students_index")');
    await expect(newTableNode).toBeVisible();

    // Run query to see if the index is valid and returns data
    await newTableNode.click({ button: 'right' });
    await page.getByTestId("context-menu-run-query").click();

    const resultsTable = page.getByTestId("results-table");
    await expect(resultsTable).toBeVisible({ timeout: 15000 });
    const rows = resultsTable.locator("tbody tr");
    // Depending on unique constraint or just general export, it should have the same rows as the original csv
    await expect(rows).toHaveCount(5); // 5 rows in mock_students.csv
  });
});
