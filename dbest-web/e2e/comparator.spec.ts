import { test, expect } from "@playwright/test";

// The Comparator is now a desktop-style flow: mark plan output nodes on the main
// canvas, then click Comparator to open a comparison window. With nothing marked,
// the button opens a modal that explains how to mark plans.
test.describe("DBest Web Comparator E2E Tests", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/");
  });

  test("Comparator button opens the comparison window with guidance when nothing is marked", async ({ page }) => {
    const comparatorBtn = page.locator('button:has-text("Comparator")');
    await expect(comparatorBtn).toBeVisible();
    await comparatorBtn.click();

    // Empty-state comparison modal
    await expect(page.locator("text=Query Plan Comparator")).toBeVisible();
    await expect(page.locator("text=Mark").first()).toBeVisible();
  });
});
