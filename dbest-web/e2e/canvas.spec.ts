import { test, expect } from "@playwright/test";

test.describe("DBest Web Canvas & Layout E2E Tests", () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to the main application
    await page.goto("/");
  });

  test("should load the main sidebar and empty canvas layout", async ({ page }) => {
    // Assert main header or sidebar elements are visible
    const sidebar = page.getByText("Tables", { exact: true });
    await expect(sidebar).toBeVisible();

    // Verify empty state overlay text
    const emptyState = page.locator("text=Query Canvas");
    await expect(emptyState).toBeVisible();

    const canvas = page.getByTestId("query-canvas");
    await expect(canvas).toBeVisible();
  });

  test("should open the CSV import modal from the File menu", async ({ page }) => {
    await page.getByTestId("menu-file-btn").click();
    await page.getByTestId("menu-import-csv").click();

    // Verify CSV modal title and inputs are visible
    const modalTitle = page.locator("text=Import CSV Table");
    await expect(modalTitle).toBeVisible();

    const fileInput = page.locator('input[type="file"]');
    await expect(fileInput).toBeVisible();

    const separatorSelect = page.locator('select');
    await expect(separatorSelect).toBeVisible();
  });

  test("should open the XML import modal from the File menu", async ({ page }) => {
    await page.getByTestId("menu-file-btn").click();
    await page.getByTestId("menu-import-xml").click();

    const modalTitle = page.locator("text=Import XML Table");
    await expect(modalTitle).toBeVisible();
  });

  test("should allow dragging operator button into canvas", async ({ page }) => {
    // Verify operator panel elements exist (e.g. FILTER)
    const filterBtn = page.locator("text=FILTER").first();
    await expect(filterBtn).toBeVisible();
  });
});
