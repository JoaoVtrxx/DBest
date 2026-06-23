import { test, expect } from "@playwright/test";
import path from "path";

test.describe("E2E Group By and Aggregation", () => {
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

  test("should import XML, group by department, aggregate average salary and count", async ({ page }) => {
    // 1. Import XML
    const importXmlBtn = page.getByTestId("import-xml-btn");
    await expect(importXmlBtn).toBeVisible();
    await importXmlBtn.click();

    await page.locator('input[placeholder="Defaults to filename"]').fill("xml_employees");
    await page.locator('input[type="file"]').setInputFiles(path.join(__dirname, "fixtures", "mock_employees.xml"));
    await page.getByRole("button", { name: "Import", exact: true }).click();

    const tableItem = page.getByTestId("table-entry-xml_employees");
    await expect(tableItem).toBeVisible({ timeout: 10000 });

    // 2. Drag to canvas
    const canvas = page.getByTestId("query-canvas");
    await tableItem.dragTo(canvas);

    const tableNode = page.locator('.react-flow__node-tableNode:has-text("xml_employees")');
    await expect(tableNode).toBeVisible();

    // 3. Add operators: Hash Group and Aggregation by dragging to avoid overlap
    const groupBtn = page.locator('span.truncate', { hasText: 'Hash Group' }).first();
    await groupBtn.dragTo(canvas, { targetPosition: { x: 200, y: 150 } });

    const aggBtn = page.locator('span.truncate', { hasText: 'Aggregation' }).first();
    await aggBtn.dragTo(canvas, { targetPosition: { x: 350, y: 300 } });

    const groupNode = page.locator('.react-flow__node-operatorNode:has-text("Hash Group")');
    const aggNode = page.locator('.react-flow__node-operatorNode:has-text("Aggregation")');

    await expect(groupNode).toBeVisible();
    await expect(aggNode).toBeVisible();

    // 4. Connect Table -> Hash Group -> Aggregation
    const tableSource = tableNode.locator('.react-flow__handle.source').first();
    const groupTarget = groupNode.locator('.react-flow__handle.target').first();
    await tableSource.dragTo(groupTarget);

    const groupSource = groupNode.locator('.react-flow__handle.source').first();
    const aggTarget = aggNode.locator('.react-flow__handle.target').first();
    await groupSource.dragTo(aggTarget);

    // 5. Configure Hash Group: group by department
    await groupNode.dblclick();
    await page.locator('label:has-text("department") input[type="checkbox"]').check();
    await page.locator('button:has-text("Apply")').click();
    await expect(groupNode).toContainText("1 arg");

    // 6. Configure Aggregation: AVG(salary) as avg_sal, COUNT(*) as emp_cnt
    await aggNode.dblclick();
    
    // Row 1: AVG, salary, avg_sal
    await page.locator('select').first().selectOption('AVG');
    await page.locator('select').nth(1).selectOption('salary');
    await page.locator('input[placeholder="avg_result"]').fill("avg_sal");

    // Add another row
    await page.locator('button:has-text("+ Add aggregation")').click();

    // Row 2: COUNT, *, emp_cnt
    await page.locator('select').nth(2).selectOption('COUNT');
    await page.locator('select').nth(3).selectOption('*');
    await page.locator('input[placeholder="count_result"]').fill("emp_cnt");

    await page.locator('button:has-text("Apply")').click();
    await expect(aggNode).toContainText("6 args"); // [AVG, salary, avg_sal, COUNT, *, emp_cnt]

    // 7. Run query from Aggregation node
    await aggNode.click({ button: 'right' });
    await page.locator('button:has-text("Run Query")').click();

    // 8. Assertions
    const resultsTable = page.getByTestId("results-table");
    await expect(resultsTable).toBeVisible({ timeout: 15000 });

    // Engineering group: 2 employees, salaries 85000 and 95000 (avg = 90000)
    // Marketing group: 1 employee, salary 75000 (avg = 75000)
    await expect(resultsTable).toContainText("Engineering");
    await expect(resultsTable).toContainText("90000");
    await expect(resultsTable).toContainText("Marketing");
    await expect(resultsTable).toContainText("75000");
  });
});
