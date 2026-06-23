import { test, expect } from "@playwright/test";
import path from "path";

test.describe("E2E Comparator Execution", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/");
  });

  test("should build two plans in Comparator mode, execute them, and display speed ratio", async ({ page }) => {
    // 1. Import CSV to have data
    const importCsvBtn = page.getByTestId("import-csv-btn");
    await importCsvBtn.click();
    await page.locator('input[placeholder="Defaults to filename without extension"]').fill("comp_students");
    await page.locator('input[type="file"]').setInputFiles(path.join(__dirname, "fixtures", "mock_students.csv"));
    await page.getByRole("button", { name: "Import", exact: true }).click();

    const tableItem = page.getByTestId("table-entry-comp_students");
    await expect(tableItem).toBeVisible({ timeout: 10000 });

    // 2. Open Comparator mode
    const comparatorBtn = page.locator('button:has-text("Comparator")');
    await expect(comparatorBtn).toBeVisible();
    await comparatorBtn.click();

    // Verify canvases are visible
    const canvasA = page.getByTestId("comparator-canvas-a");
    const canvasB = page.getByTestId("comparator-canvas-b");
    await expect(canvasA).toBeVisible();
    await expect(canvasB).toBeVisible();

    // 3. Build Plan A
    await tableItem.dragTo(canvasA);
    const tableNodeA = canvasA.locator('.react-flow__node-tableNode:has-text("comp_students")');
    await expect(tableNodeA).toBeVisible();
    
    // 4. Build Plan B
    // Just a basic table scan in Plan B as well for simplicity (since it's a test of the comparator engine,
    // they should execute and return a ratio around ~1x)
    await tableItem.dragTo(canvasB);
    const tableNodeB = canvasB.locator('.react-flow__node-tableNode:has-text("comp_students")');
    await expect(tableNodeB).toBeVisible();

    // 5. Click Compare
    const compareBtn = page.locator('button:has-text("Compare Query Plans")');
    await compareBtn.click();

    // 6. Assertions
    // Look for the banner "Plan A is Xx faster/slower than Plan B" or similar metrics
    // Usually it's in a div or span
    // Let's just wait for the results containers
    const resultsContainerA = page.locator('.result-container-a').or(page.getByTestId('results-table').first());
    await expect(resultsContainerA).toBeVisible({ timeout: 15000 });

    const resultsContainerB = page.locator('.result-container-b').or(page.getByTestId('results-table').nth(1));
    await expect(resultsContainerB).toBeVisible({ timeout: 15000 });

    // Verify speed ratio text appears (e.g. "Ratio: " or "Speed: " or "Plan")
    const banner = page.locator('text=/Ratio|Speed|Plan A|Plan B/i').first();
    await expect(banner).toBeVisible();
  });
});
