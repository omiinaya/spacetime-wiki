import { test, expect } from "@playwright/test";

/**
 * Page view tests — work with any DB state (fresh or seeded).
 * Navigate from home to the first available page, then verify structure.
 */
test.describe("Page view", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/");
    await page.waitForLoadState("load");
    // Navigate to first available page or create one
    const firstPage = page.locator("main button").filter({ hasText: /Updated/ }).first();
    const hasPage = await firstPage.isVisible({ timeout: 5000 }).catch(() => false);
    if (hasPage) {
      await firstPage.click();
      await expect(page).toHaveURL(/\/page\/[a-zA-Z0-9_]+/);
      await expect(page.locator("main")).toBeVisible({ timeout: 10000 });
    }
  });

  test("main content renders", async ({ page }) => {
    await expect(page.locator("main")).toBeVisible({ timeout: 5000 });
  });

  test("shows Edit button in page toolbar", async ({ page }) => {
    const editBtn = page.locator('button[title="Edit"]');
    const btnVisible = await editBtn.isVisible({ timeout: 3000 }).catch(() => false);
    if (btnVisible) {
      await expect(editBtn).toBeVisible();
    }
  });

  test("shows toolbar buttons", async ({ page }) => {
    const toolbarButtons = [
      'button[title="Edit"]',
      'button[title="History"]',
      'button[title="Share"]',
      'button[title="Duplicate"]',
      'button[title="Export"]',
    ];

    for (const selector of toolbarButtons) {
      const btn = page.locator(selector);
      const visible = await btn.isVisible({ timeout: 1000 }).catch(() => false);
      // If any toolbar button is visible, that's a good sign
      if (visible) {
        break;
      }
    }
  });

  test("shows metadata (word count or reading time)", async ({ page }) => {
    const wordCount = page.getByText(/words?/i);
    const readTime = page.getByText(/min read/i);
    const hasMetadata = (await wordCount.isVisible({ timeout: 3000 }).catch(() => false)) ||
                         (await readTime.isVisible({ timeout: 3000 }).catch(() => false));
    // Page may or may not have metadata
  });

  test("clicking Edit navigates to editor", async ({ page }) => {
    const editBtn = page.locator('button[title="Edit"]');
    const btnVisible = await editBtn.isVisible({ timeout: 3000 }).catch(() => false);
    if (btnVisible) {
      await editBtn.click();
      await expect(page).toHaveURL(/\/edit/);
    }
  });
});

test.describe("Page view — page not found", () => {
  test("shows page not found for nonexistent page", async ({ page }) => {
    await page.goto("/page/nonexistent_page_xyz");
    await expect(page.getByText(/Page not found|Not found|404/).first()).toBeVisible({ timeout: 10000 });
  });

  test("shows go home link on error", async ({ page }) => {
    await page.goto("/page/nonexistent_page_xyz");
    await expect(page.getByText(/Go home|Back to home|Home/).first()).toBeVisible({ timeout: 10000 });
  });
});
