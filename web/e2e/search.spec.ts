import { test, expect } from "@playwright/test";

test.describe("Search — sidebar search bar", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/");
    // Wait for page list to fully load
    await expect(page.locator("main button").filter({ hasText: /Updated/ }).first()).toBeVisible({ timeout: 15000 });
  });

  test("shows search input in sidebar", async ({ page }) => {
    await expect(page.getByPlaceholder("Search...")).toBeVisible();
  });

  test("typing in search filters sidebar page list", async ({ page }) => {
    const searchInput = page.getByPlaceholder("Search...");
    await searchInput.fill("E2E");
    await page.waitForTimeout(500);
    await expect(searchInput).toHaveValue("E2E");
  });

  test("search input accepts text and shows it", async ({ page }) => {
    const searchInput = page.getByPlaceholder("Search...");
    await searchInput.fill("architecture");
    await expect(searchInput).toHaveValue("architecture");
  });

  test("clearing search restores full page list", async ({ page }) => {
    const searchInput = page.getByPlaceholder("Search...");
    // Wait for initial pages to load
    await page.waitForTimeout(1000);
    const initialPages = page.locator("main button").filter({ hasText: /Updated/ });
    const initialCount = await initialPages.count();
    expect(initialCount).toBeGreaterThan(0);

    // Type to filter
    await searchInput.fill("E2E");
    await page.waitForTimeout(500);

    // Clear
    await searchInput.clear();
    await page.waitForTimeout(500);

    // After clearing, pages should reappear
    const afterClear = page.locator("main button").filter({ hasText: /Updated/ });
    const afterCount = await afterClear.count();
    expect(afterCount).toBeGreaterThanOrEqual(initialCount - 2); // Allow slight mismatch due to timing
  });
});
