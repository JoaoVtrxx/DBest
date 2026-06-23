import { test, expect } from "@playwright/test";
import path from "path";

test.describe("E2E Multi-Operator Pipeline", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/");
  });

  test("should execute a pipeline: Table -> Filter -> Projection -> Limit", async ({ page }) => {
    // 1. Import CSV
    const importCsvBtn = page.getByTestId("import-csv-btn");
    await expect(importCsvBtn).toBeVisible();
    await importCsvBtn.click();

    await page.locator('input[placeholder="Defaults to filename without extension"]').fill("multi_students");
    await page.locator('input[type="file"]').setInputFiles(path.join(__dirname, "fixtures", "mock_students.csv"));
    await page.getByRole("button", { name: "Import", exact: true }).click();

    const tableItem = page.getByTestId("table-entry-multi_students");
    await expect(tableItem).toBeVisible({ timeout: 10000 });

    // 2. Drag Table to Canvas
    const canvas = page.getByTestId("query-canvas");
    await tableItem.dragTo(canvas);

    const tableNode = page.locator('.react-flow__node-tableNode:has-text("multi_students")');
    await expect(tableNode).toBeVisible();

    // Expand all categories in the operators sidebar
    const expandAllBtn = page.locator('button:has-text("Expand all")');
    if (await expandAllBtn.isVisible()) {
      await expandAllBtn.click();
    }

    // 3. Add Operators via drag to canvas to avoid overlap
    const filterBtn = page.locator('span.truncate', { hasText: 'Filter' }).first();
    await filterBtn.dragTo(canvas, { targetPosition: { x: 150, y: 150 } });
    
    const projectionBtn = page.locator('span.truncate', { hasText: 'Projection' }).first();
    await projectionBtn.dragTo(canvas, { targetPosition: { x: 300, y: 300 } });

    const limitBtn = page.locator('span.truncate', { hasText: 'Limit' }).first();
    await limitBtn.dragTo(canvas, { targetPosition: { x: 450, y: 450 } });

    // Locators for newly created operator nodes
    const filterNode = page.locator('.react-flow__node-operatorNode:has-text("Filter")');
    const projectionNode = page.locator('.react-flow__node-operatorNode:has-text("Projection")');
    const limitNode = page.locator('.react-flow__node-operatorNode:has-text("Limit")');

    await expect(filterNode).toBeVisible();
    await expect(projectionNode).toBeVisible();
    await expect(limitNode).toBeVisible();

    // 4. Connect nodes: Table -> Filter -> Projection -> Limit
    // Table (source) -> Filter (target-left or target)
    const tableSource = tableNode.locator('.react-flow__handle.source').first();
    const filterTarget = filterNode.locator('.react-flow__handle.target').first(); // target-left
    await tableSource.dragTo(filterTarget);

    // Filter (source) -> Projection (target)
    const filterSource = filterNode.locator('.react-flow__handle.source').first();
    const projectionTarget = projectionNode.locator('.react-flow__handle.target').first();
    await filterSource.dragTo(projectionTarget);

    // Projection (source) -> Limit (target)
    const projectionSource = projectionNode.locator('.react-flow__handle.source').first();
    const limitTarget = limitNode.locator('.react-flow__handle.target').first();
    await projectionSource.dragTo(limitTarget);

    // 5. Configure Filter: age > 20
    await filterNode.dblclick();
    await page.locator('select').first().selectOption('column');
    await page.locator('select').nth(1).selectOption('age');
    await page.locator('button:has-text(">")').click();
    await page.locator('select').nth(2).selectOption('number');
    await page.locator('input[placeholder="0"]').fill("20");
    await page.locator('button:has-text("Apply Filter")').click();

    // Verify filter node shows 3 args (age, >, 20)
    await expect(filterNode).toContainText("3 args");

    // 6. Configure Projection: select name, course
    await projectionNode.dblclick();
    // Select column name
    await page.locator('label:has-text("name") input[type="checkbox"]').check();
    // Select column course
    await page.locator('label:has-text("course") input[type="checkbox"]').check();
    await page.locator('button:has-text("Apply")').click();

    // Verify projection node shows 2 args
    await expect(projectionNode).toContainText("2 args");

    // 7. Configure Limit: 2
    await limitNode.dblclick();
    await page.locator('input[placeholder="e.g. 100"]').fill("2");
    await page.locator('button:has-text("Apply Limit")').click();

    // Verify limit node shows 1 arg
    await expect(limitNode).toContainText("1 arg");

    // 8. Run Query from the Limit node (right-click -> Run Query)
    await limitNode.click({ button: 'right' });
    await page.locator('button:has-text("Run Query")').click();

    // 9. Assertions
    const resultsTable = page.getByTestId("results-table");
    await expect(resultsTable).toBeVisible({ timeout: 15000 });

    // Validate table headers (should be name, course)
    const headers = resultsTable.locator("thead th");
    await expect(headers).toHaveCount(2);
    await expect(headers.first()).toHaveText("name");
    await expect(headers.nth(1)).toHaveText("course");

    // Validate row count (excluding header)
    const rows = resultsTable.locator("tbody tr");
    await expect(rows).toHaveCount(2); // limited to 2
  });
});
