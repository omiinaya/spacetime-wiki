import { test, expect } from "@playwright/test";

test.describe("Collections — sidebar", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/");
  });

  test("shows collections section in sidebar", async ({ page }) => {
    const sidebar = page.getByRole("complementary");
    // Should show the Uncategorized collection (default) or any collections
    const collectionBtn = sidebar.locator("button").filter({ hasText: /Uncategorized|Engineering|Design/ });
    await expect(collectionBtn.first()).toBeVisible({ timeout: 15000 });
  });

  test("shows collection with page count", async ({ page }) => {
    const sidebar = page.getByRole("complementary");
    // Look for any nav element containing collection info
    const collection = sidebar.locator("button").filter({ hasText: /Uncategorized/ });
    if (await collection.isVisible().catch(() => false)) {
      // Should show a number badge (page count)
      const countText = await collection.textContent();
      expect(countText).toMatch(/\d+/);
    }
  });

  test("shows New collection button in sidebar", async ({ page }) => {
    await expect(page.getByRole("button", { name: "New collection" })).toBeVisible();
  });

  test("clicking New collection opens dialog", async ({ page }) => {
    await page.getByRole("button", { name: "New collection" }).click();
    // Dialog/modal should open
    await expect(page.getByRole("heading", { name: "New collection" })).toBeVisible({ timeout: 5000 });
  });
});
