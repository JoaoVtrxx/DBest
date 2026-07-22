import { test, expect } from "@playwright/test";
import path from "path";

// Desktop-style comparison: build plans on the main canvas, mark their output
// nodes, then click Comparator to open the comparison window. Requires the API
// running on :8080.
test.describe("E2E Comparator (mark + compare)", () => {
  test("marks two plans and compares them side by side", async ({ page }) => {
    await page.goto("/");

    // 1. Import the students CSV (via the File menu)
    await page.getByTestId("menu-file-btn").click();
    await page.getByTestId("menu-import-csv").click();
    await page.locator('input[placeholder="Defaults to filename without extension"]').fill("cmp_students");
    await page.locator('input[type="file"]').setInputFiles(path.join(__dirname, "fixtures", "mock_students.csv"));
    await page.getByRole("button", { name: "Import", exact: true }).click();

    const tableItem = page.getByTestId("table-entry-cmp_students");
    await expect(tableItem).toBeVisible({ timeout: 10000 });

    // 2. Drag the table to the canvas
    const canvas = page.getByTestId("query-canvas");
    await tableItem.dragTo(canvas);
    const tableNode = page.locator(".react-flow__node-tableNode");
    await expect(tableNode).toBeVisible();

    // 3. Add a LIMIT operator as a second, distinct plan
    const limitBtn = page.locator("text=Limit").first();
    await limitBtn.dragTo(canvas, { targetPosition: { x: 260, y: 220 } });
    const limitNode = page.locator('.react-flow__node-operatorNode:has-text("Limit")');
    await expect(limitNode).toBeVisible();

    // Connect table → limit
    await tableNode.locator(".react-flow__handle.source").first()
      .dragTo(limitNode.locator(".react-flow__handle.target").first());

    // Configure the limit (count = 2)
    await limitNode.dblclick();
    await page.locator('input[type="number"]').first().fill("2");
    await page.getByRole("button", { name: /Apply/i }).click();

    // 4. Mark both plans: the raw table (full scan) and the limited plan
    await tableNode.click({ button: "right" });
    await page.getByTestId("context-menu-mark").click();
    await limitNode.click({ button: "right" });
    await page.getByTestId("context-menu-mark").click();

    // 5. Open the Comparator
    await page.locator('button:has-text("Comparator")').click();

    // 6. Comparison window shows both plans with the desktop-style cost metrics
    await expect(page.locator("text=Query Plan Comparator")).toBeVisible();
    // Subtitle reports how many plans are being compared.
    await expect(page.locator("text=Execution cost of 2 marked plans")).toBeVisible({ timeout: 15000 });
    // The metrics table mirrors the desktop Comparator (not wall-clock time).
    await expect(page.locator("text=Tuples loaded")).toBeVisible();
    await expect(page.locator("text=Filter comparisons")).toBeVisible();
  });
});
