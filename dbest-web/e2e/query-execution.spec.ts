import { test, expect } from "@playwright/test";
import path from "path";

test.describe("E2E Query Execution", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/");
  });

  test("should import CSV, build a tree with FILTER, and execute it", async ({ page }) => {
    // 1. Import CSV Table
    const importCsvBtn = page.getByTestId("import-csv-btn");
    await expect(importCsvBtn).toBeVisible();
    await importCsvBtn.click();

    // Fill the modal
    await page.locator('input[placeholder="Defaults to filename without extension"]').fill("students");
    
    // Set file
    const fileInput = page.locator('input[type="file"]');
    await fileInput.setInputFiles(path.join(__dirname, "fixtures", "mock_students.csv"));
    
    // Click Import button in modal
    await page.getByRole("button", { name: "Import", exact: true }).click();

    // Verify table appears in sidebar
    const tableItem = page.getByTestId("table-entry-students");
    await expect(tableItem).toBeVisible({ timeout: 10000 });

    // 2. Drag Table to Canvas
    const canvas = page.getByTestId("query-canvas");
    await tableItem.dragTo(canvas);

    // Verify Table node appears on canvas
    const tableNode = page.locator('.react-flow__node-tableNode');
    await expect(tableNode).toBeVisible();

    // 3. Drag FILTER operator to canvas
    const filterBtn = page.locator("text=FILTER").first();
    await filterBtn.dragTo(canvas, { targetPosition: { x: 200, y: 200 } });

    // Verify Filter node appears on canvas
    const filterNode = page.locator('.react-flow__node-operatorNode:has-text("FILTER")');
    await expect(filterNode).toBeVisible();

    // 4. Connect Table to Filter
    const sourceHandle = tableNode.locator('.react-flow__handle.source').first();
    const targetHandle = filterNode.locator('.react-flow__handle.target').first();
    await sourceHandle.dragTo(targetHandle);

    // 5. Configure Filter: age > 20 via FilterModal
    await filterNode.dblclick();
    await page.locator('select').first().selectOption('column');
    await page.locator('select').nth(1).selectOption('age');
    await page.locator('button:has-text(">")').click();
    await page.locator('select').nth(2).selectOption('number');
    await page.locator('input[placeholder="0"]').fill("20");
    await page.locator('button:has-text("Apply Filter")').click();

    // 6. Run Query
    await filterNode.click({ button: 'right' });
    await page.getByTestId("context-menu-run-query").click();

    // 7. Assert Results
    // We expect Alice (20) - no, Bob (22), Diana (21), Eve (23) -> 3 rows
    const resultsTable = page.getByTestId("results-table");
    await expect(resultsTable).toBeVisible({ timeout: 15000 });

    // Check row count (excluding header)
    const rows = resultsTable.locator("tbody tr");
    await expect(rows).toHaveCount(3);
    
    // Verify Bob is in the result
    await expect(resultsTable).toContainText("Bob");
  });
});
