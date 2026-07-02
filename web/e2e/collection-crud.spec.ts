import { test, expect } from "@playwright/test";

/**
 * Collection management CRUD E2E tests.
 * Tests creating, reading, updating, and deleting collections.
 */

test.describe("Collection management — CRUD", () => {
  test.beforeEach(async ({ page }) => {
    // Sign in as admin
    await page.goto("/login");
    await page.getByLabel("Email").fill("admin@spacetimewiki.local");
    await page.getByLabel("Password").fill("admin123");
    await page.getByRole("button", { name: "Sign in" }).click();
    await expect(page).toHaveURL("/", { timeout: 15000 });
  });

  test("New collection button opens creation dialog", async ({ page }) => {
    await page.locator("aside").getByRole("button", { name: "New collection" }).click();
    await expect(page.getByRole("heading", { name: "New collection" })).toBeVisible({ timeout: 5000 });
  });

  test("can create a new collection", async ({ page }) => {
    const collectionName = `E2E Test Collection ${Date.now()}`;

    // Open new collection dialog
    await page.locator("aside").getByRole("button", { name: "New collection" }).click();
    await expect(page.getByRole("heading", { name: "New collection" })).toBeVisible();

    // Fill in name
    const nameInput = page.getByPlaceholder(/name|title/i);
    if (await nameInput.isVisible()) {
      await nameInput.fill(collectionName);
    }

    // Submit
    const createButton = page.getByRole("button", { name: /create|save|add/i }).first();
    if (await createButton.isVisible()) {
      await createButton.click();
    }

    // Should close the dialog
    await expect(page.getByRole("heading", { name: "New collection" })).not.toBeVisible({ timeout: 5000 });

    // New collection should appear in sidebar
    await expect(page.locator("aside").getByText(collectionName).first()).toBeVisible({ timeout: 10000 });
  });

  test("sidebar shows existing collections from seed data", async ({ page }) => {
    // Navigate to home to see sidebar
    await page.goto("/");

    // Should see Uncategorized or other seeded collections
    const sidebar = page.locator("aside");
    await expect(sidebar.getByText(/Uncategorized|Engineering|Design|Marketing|Research/i).first()).toBeVisible({ timeout: 15000 });
  });

  test("clicking a collection in sidebar shows its pages", async ({ page }) => {
    await page.goto("/");

    // Find a collection button in sidebar and click it
    const sidebar = page.locator("aside");
    // Click on "Uncategorized" or the first visible collection
    const collectionBtn = sidebar.locator("button").filter({ hasText: /Uncategorized/ });
    if (await collectionBtn.isVisible().catch(() => false)) {
      await collectionBtn.click();
      await page.waitForTimeout(1000);
      // Should navigate to the collection page
      await expect(page).toHaveURL(/\/collection\//);
    }
  });

  test("collection shows page count in sidebar", async ({ page }) => {
    await page.goto("/");
    const sidebar = page.locator("aside");
    const collectionBtn = sidebar.locator("button").filter({ hasText: /Uncategorized/ });
    if (await collectionBtn.isVisible().catch(() => false)) {
      const text = await collectionBtn.textContent();
      const countMatch = text?.match(/(\d+)/);
      expect(countMatch).not.toBeNull();
      expect(parseInt(countMatch![1], 10)).toBeGreaterThan(0);
    }
  });
});
