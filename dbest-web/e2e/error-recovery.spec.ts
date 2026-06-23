import { test, expect } from "@playwright/test";
import path from "path";

test.describe("E2E Error Handling and Recovery", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/");
  });

  test("should handle execution errors and recover by configuring nodes correctly", async ({ page }) => {
    // 1. Import CSV
    const importCsvBtn = page.getByTestId("import-csv-btn");
    await expect(importCsvBtn).toBeVisible();
    await importCsvBtn.click();
    await page.locator('input[placeholder="Defaults to filename without extension"]').fill("err_students");
    await page.locator('input[type="file"]').setInputFiles(path.join(__dirname, "fixtures", "mock_students.csv"));
    await page.getByRole("button", { name: "Import", exact: true }).click();
    await expect(page.getByTestId("table-entry-err_students")).toBeVisible({ timeout: 10000 });

    // 2. Drag Table to Canvas
    const canvas = page.getByTestId("query-canvas");
    const tableItem = page.getByTestId("table-entry-err_students");
    await tableItem.dragTo(canvas);

    const tableNode = page.locator('.react-flow__node-tableNode:has-text("err_students")');
    await expect(tableNode).toBeVisible();

    // 3. Add Filter Operator via drag to avoid overlap
    const filterBtn = page.locator('span.truncate', { hasText: 'Filter' }).first();
    await filterBtn.dragTo(canvas, { targetPosition: { x: 200, y: 200 } });

    const filterNode = page.locator('.react-flow__node-operatorNode:has-text("Filter")');
    await expect(filterNode).toBeVisible();

    const tableSource = tableNode.locator('.react-flow__handle.source').first();
    const filterTarget = filterNode.locator('.react-flow__handle.target').first();
    await tableSource.dragTo(filterTarget);

    // 4. Try to Run Query without configuring Filter (unconfigured nodes are invalid)
    await filterNode.click({ button: 'right' });
    await page.locator('button:has-text("Run Query")').click();

    // Verify Error modal opens with the error message
    const errorTitle = page.locator('text=Could not load data');
    await expect(errorTitle).toBeVisible({ timeout: 10000 });
    
    // Close the error data viewer modal
    const closeBtn = page.locator('button:has-text("Close")');
    await closeBtn.click();
    await expect(errorTitle).not.toBeVisible();

    // 5. Configure Filter properly: age > 20
    await filterNode.dblclick();
    await page.locator('select').first().selectOption('column');
    await page.locator('select').nth(1).selectOption('age');
    await page.locator('button:has-text(">")').click();
    await page.locator('select').nth(2).selectOption('number');
    await page.locator('input[placeholder="0"]').fill("20");
    await page.locator('button:has-text("Apply Filter")').click();

    // Assert status dot is green / configured
    await expect(filterNode).toContainText("3 args");

    // 6. Run query again
    await filterNode.click({ button: 'right' });
    await page.locator('button:has-text("Run Query")').click();

    // Assert results table is now shown
    const resultsModalTitle = page.locator('text=Data Viewer — Filter');
    await expect(resultsModalTitle).toBeVisible({ timeout: 15000 });
    
    const rows = page.locator('table tbody tr');
    await expect(rows).toHaveCount(3); // Bob, Diana, Eve (age > 20)

    // Close results
    await page.locator('button:has-text("Close")').click();

    // 7. Test canvas clearing: select and delete both nodes
    await tableNode.click();
    await page.keyboard.press("Delete");
    await expect(tableNode).not.toBeVisible();

    await filterNode.click();
    await page.keyboard.press("Delete");
    await expect(filterNode).not.toBeVisible();

    // Verify canvas is empty and displays the empty state overlay
    const emptyState = page.locator("text=Query Canvas");
    await expect(emptyState).toBeVisible();
  });
});
