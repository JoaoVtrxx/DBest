import { test, expect } from "@playwright/test";
import path from "path";

test.describe("E2E Join Execution", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/");
  });

  test("should import two CSV tables, join them on course name, and execute", async ({ page }) => {
    // 1. Import Students CSV
    const importCsvBtn = page.getByTestId("import-csv-btn");
    await expect(importCsvBtn).toBeVisible();
    await importCsvBtn.click();
    await page.locator('input[placeholder="Defaults to filename without extension"]').fill("join_students");
    await page.locator('input[type="file"]').setInputFiles(path.join(__dirname, "fixtures", "mock_students.csv"));
    await page.getByRole("button", { name: "Import", exact: true }).click();
    await expect(page.getByTestId("table-entry-join_students")).toBeVisible({ timeout: 10000 });

    // 2. Import Courses CSV
    await importCsvBtn.click();
    await page.locator('input[placeholder="Defaults to filename without extension"]').fill("join_courses");
    await page.locator('input[type="file"]').setInputFiles(path.join(__dirname, "fixtures", "mock_courses.csv"));
    await page.getByRole("button", { name: "Import", exact: true }).click();
    await expect(page.getByTestId("table-entry-join_courses")).toBeVisible({ timeout: 10000 });

    // 3. Drag both to Canvas
    const canvas = page.getByTestId("query-canvas");
    
    const studentsEntry = page.getByTestId("table-entry-join_students");
    await studentsEntry.dragTo(canvas);
    const studentsNode = page.locator('.react-flow__node-tableNode:has-text("join_students")');
    await expect(studentsNode).toBeVisible();

    const coursesEntry = page.getByTestId("table-entry-join_courses");
    // Drag to canvas with a different offset to avoid overlaying
    await coursesEntry.dragTo(canvas, { targetPosition: { x: 300, y: 100 } });
    const coursesNode = page.locator('.react-flow__node-tableNode:has-text("join_courses")');
    await expect(coursesNode).toBeVisible();

    // 4. Add Join Operator via drag to avoid overlap
    const joinBtn = page.locator('span.truncate', { hasText: /^Join$/ }).first();
    await joinBtn.dragTo(canvas, { targetPosition: { x: 200, y: 300 } });
    const joinNode = page.locator('.react-flow__node-operatorNode:has-text("Join")');
    await expect(joinNode).toBeVisible();

    // 5. Connect Table Nodes to Join input ports (target-left & target-right)
    const studentsSource = studentsNode.locator('.react-flow__handle.source').first();
    const leftTargetHandle = joinNode.locator('[data-handleid="target-left"]');
    await studentsSource.dragTo(leftTargetHandle);

    const coursesSource = coursesNode.locator('.react-flow__handle.source').first();
    const rightTargetHandle = joinNode.locator('[data-handleid="target-right"]');
    await coursesSource.dragTo(rightTargetHandle);

    // 6. Configure Join criteria: course = course_name
    await joinNode.dblclick();
    
    // Select Left column: course
    await page.locator('select').first().selectOption('course');
    // Select Right column: course_name
    await page.locator('select').nth(1).selectOption('course_name');

    await page.locator('button:has-text("Apply Join")').click();
    await expect(joinNode).toContainText("2 args"); // ["course", "course_name"]

    // 7. Run query from Join node
    await joinNode.click({ button: 'right' });
    await page.locator('button:has-text("Run Query")').click();

    // 8. Assertions
    const resultsTable = page.getByTestId("results-table");
    await expect(resultsTable).toBeVisible({ timeout: 15000 });

    // Validate rows joined correctly:
    // Alice (Computer Science) -> Room 101, Dr. Alan Turing
    // Bob (Mathematics) -> Room 202, Dr. Ada Lovelace
    // Charlie (Physics) -> Room 303, Dr. Albert Einstein
    // Diana (Computer Science) -> Room 101, Dr. Alan Turing
    // Total 4 rows of matching equi-join.
    const rows = resultsTable.locator("tbody tr");
    await expect(rows).toHaveCount(4);

    await expect(resultsTable).toContainText("Alice");
    await expect(resultsTable).toContainText("Dr. Alan Turing");
    await expect(resultsTable).toContainText("Bob");
    await expect(resultsTable).toContainText("Dr. Ada Lovelace");
  });
});
