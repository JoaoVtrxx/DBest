import { test, expect } from "@playwright/test";

test.describe("DBest Web Comparator E2E Tests", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/");
    
    // Switch to Comparator Mode
    const comparatorBtn = page.locator('button:has-text("Comparator")');
    await expect(comparatorBtn).toBeVisible();
    await comparatorBtn.click();
  });

  test("should load comparator split layout", async ({ page }) => {
    // Verify Comparator headers
    const headerTitle = page.locator("text=Query Plan Comparator");
    await expect(headerTitle).toBeVisible();

    const planATitle = page.locator("text=Plan A").first();
    await expect(planATitle).toBeVisible();

    const planBTitle = page.locator("text=Plan B").first();
    await expect(planBTitle).toBeVisible();

    // Verify both local canvases exist
    const canvasA = page.getByTestId("comparator-canvas-a");
    await expect(canvasA).toBeVisible();

    const canvasB = page.getByTestId("comparator-canvas-b");
    await expect(canvasB).toBeVisible();
  });

  test("should check Clone and Sync buttons exist", async ({ page }) => {
    const cloneMainA = page.locator('button:has-text("Clone Main")').first();
    await expect(cloneMainA).toBeVisible();

    const syncDslA = page.locator('button:has-text("Sync DSL")').first();
    await expect(syncDslA).toBeVisible();

    const clearA = page.locator('button:has-text("Clear")').first();
    await expect(clearA).toBeVisible();
  });
});
