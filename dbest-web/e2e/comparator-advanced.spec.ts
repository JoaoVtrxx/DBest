import { test, expect } from "@playwright/test";
import path from "path";

test.describe("E2E Advanced Comparator and DSL Parser", () => {
  test.beforeEach(async ({ page }) => {
    page.on("console", (msg) => {
      console.log(`BROWSER CONSOLE: [${msg.type()}] ${msg.text()}`);
    });
    page.on("pageerror", (err) => {
      console.log(`BROWSER ERROR: ${err.message}`);
      if (err.stack) console.log(err.stack);
    });
    page.on("requestfailed", (request) => {
      console.log(`BROWSER REQUEST FAILED: ${request.url()} - ${request.failure()?.errorText}`);
    });
    page.on("response", async (response) => {
      if (response.url().includes("/api/")) {
        try {
          console.log(`API RESPONSE: ${response.url()} -> Status ${response.status()} -> Body: ${await response.text()}`);
        } catch (e) {}
      }
    });
    await page.goto("/");
  });

  test("should use DSL parser to build and compare query plans side-by-side", async ({ page }) => {
    // 1. Import CSV to make data available for query planning
    const importCsvBtn = page.getByTestId("import-csv-btn");
    await expect(importCsvBtn).toBeVisible();
    await importCsvBtn.click();
    await page.locator('input[placeholder="Defaults to filename without extension"]').fill("comp_adv_students");
    await page.locator('input[type="file"]').setInputFiles(path.join(__dirname, "fixtures", "mock_students.csv"));
    await page.getByRole("button", { name: "Import", exact: true }).click();
    await expect(page.getByTestId("table-entry-comp_adv_students")).toBeVisible({ timeout: 10000 });

    // 2. Open Comparator mode
    const comparatorBtn = page.locator('button:has-text("Comparator")');
    await expect(comparatorBtn).toBeVisible();
    await comparatorBtn.click();

    // 3. Write DSL in Plan A (e.g. Table Scan)
    // Locate textareas (first is Plan A, second is Plan B)
    const textareaA = page.locator('textarea').first();
    const textareaB = page.locator('textarea').nth(1);

    await textareaA.fill("scan(comp_adv_students);");
    await page.locator('button:has-text("Parse DSL")').first().click();

    // Verify nodes appear in Canvas A
    const canvasA = page.getByTestId("comparator-canvas-a");
    const tableNodeA = canvasA.locator('.react-flow__node-tableNode:has-text("comp_adv_students")');
    await expect(tableNodeA).toBeVisible();

    // 4. Write DSL in Plan B (e.g. Scan + Filter)
    await textareaB.fill("filter[age > 21](scan(comp_adv_students));");
    await page.locator('button:has-text("Parse DSL")').nth(1).click();

    // Verify nodes appear in Canvas B
    const canvasB = page.getByTestId("comparator-canvas-b");
    const tableNodeB = canvasB.locator('.react-flow__node-tableNode:has-text("comp_adv_students")');
    const filterNodeB = canvasB.locator('.react-flow__node-operatorNode:has-text("Filter")');
    await expect(tableNodeB).toBeVisible();
    await expect(filterNodeB).toBeVisible();

    // 5. Run Compare
    const compareBtn = page.getByTestId("compare-btn");
    await expect(compareBtn).toBeVisible();
    await compareBtn.click();

    // 6. Verify Results drawer contents
    const speedBanner = page.getByTestId("speed-comparison-banner");
    await expect(speedBanner).toBeVisible({ timeout: 15000 });
    
    // Plan A is a full scan (5 rows)
    const statsA = page.getByTestId("plan-a-stats");
    await expect(statsA).toContainText("5 rows");

    // Plan B is a filtered scan (2 rows: Eve 23, Bob 22)
    const statsB = page.getByTestId("plan-b-stats");
    await expect(statsB).toContainText("2 rows");
  });
});
