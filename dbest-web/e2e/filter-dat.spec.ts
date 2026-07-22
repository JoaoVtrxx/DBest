import { test, expect } from "@playwright/test";
import path from "path";

// Regression coverage for the "filter on a .dat/btree table returns 0 rows" bug.
// btree tables expose INTEGER columns (CSV auto-detects LONG), and a literal was
// being boxed as Long, so Integer.compareTo(Long) threw and was swallowed → 0 rows
// even for `pk = value`. The fix (QueryBuilderService.collectColumnTypes +
// type-aware parseValueElement) boxes the literal to the column's declared type.
// This test imports the class movie.dat (movie_id/title/release_year, all with an
// INTEGER key) and filters on the INTEGER column, expecting a large, non-empty
// result. See BACKLOG.md (Filtro) and PLANO_FEATURES.md (#1).
test.describe("E2E Filter on .dat (btree, INTEGER column)", () => {
  test("imports movie.dat and filters release_year > 1990 with non-empty result", async ({ page }) => {
    await page.goto("/");

    // 1. Import the BTree .dat (self-describing — no .head needed), via the File menu
    await page.getByTestId("menu-file-btn").click();
    await page.getByTestId("menu-import-dat").click();
    // The modal has two file inputs (.dat, optional .head); the first is the .dat.
    await page.locator('input[type="file"]').first()
      .setInputFiles(path.join(__dirname, "fixtures", "movie.dat"));
    await page.getByRole("button", { name: "Open", exact: true }).click();

    // The table name comes from the .dat's embedded schema → "movie".
    const tableItem = page.getByTestId("table-entry-movie");
    await expect(tableItem).toBeVisible({ timeout: 15000 });

    // 2. Drag the table to the canvas
    const canvas = page.getByTestId("query-canvas");
    await tableItem.dragTo(canvas);
    const tableNode = page.locator('.react-flow__node-tableNode:has-text("movie")');
    await expect(tableNode).toBeVisible();

    // 3. Add a FILTER operator and connect table → filter
    const filterBtn = page.locator("text=FILTER").first();
    await filterBtn.dragTo(canvas, { targetPosition: { x: 220, y: 220 } });
    const filterNode = page.locator('.react-flow__node-operatorNode:has-text("FILTER")');
    await expect(filterNode).toBeVisible();

    await tableNode.locator(".react-flow__handle.source").first()
      .dragTo(filterNode.locator(".react-flow__handle.target").first());

    // 4. Configure filter: release_year > 1990 (INTEGER column)
    await filterNode.dblclick();
    await page.locator("select").first().selectOption("column");
    await page.locator("select").nth(1).selectOption("release_year");
    await page.locator('button:has-text(">")').click();
    await page.locator("select").nth(2).selectOption("number");
    await page.locator('input[placeholder="0"]').fill("1990");
    await page.locator('button:has-text("Apply Filter")').click();

    // 5. Run the query from the filter node
    await filterNode.click({ button: "right" });
    await page.getByTestId("context-menu-run-query").click();

    // 6. The regression assertion: the result is NOT empty (the bug returned 0).
    const resultsTable = page.getByTestId("results-table");
    await expect(resultsTable).toBeVisible({ timeout: 20000 });
    // A full first page of rows proves the filter matched (bug produced zero).
    await expect(resultsTable.locator("tbody tr")).toHaveCount(50);
    // The total row count is reported in the modal subtitle (locale-tolerant match).
    await expect(page.locator("text=/4[.,]243 rows/")).toBeVisible();
    // And the projected schema still carries the INTEGER column we filtered on.
    await expect(resultsTable.locator("thead")).toContainText("release_year");
  });
});
