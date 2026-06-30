import { test, expect } from "@playwright/test";

/**
 * Page view tests — real data, real app, no mocks.
 * Navigate from home to the first available page, then verify structure.
 */
test.describe("Page view", () => {
  async function navigateToFirstPage(page: any) {
    await page.goto("/");
    const firstPage = page.locator("main button").filter({ hasText: /Updated/ }).first();
    await expect(firstPage).toBeVisible({ timeout: 15000 });
    await firstPage.click();
    await expect(page).toHaveURL(/\/page\/[a-zA-Z0-9_]+/);
    await expect(page.locator("main")).toBeVisible({ timeout: 10000 });
  }

  test.beforeEach(async ({ page }) => {
    await navigateToFirstPage(page);
  });

  test("shows page title as a heading", async ({ page }) => {
    await expect(page.locator("main h1, main h2").first()).toBeVisible({ timeout: 5000 });
  });

  test("shows Edit button in page toolbar", async ({ page }) => {
    await expect(page.locator('button[title="Edit"]')).toBeVisible({ timeout: 5000 });
  });

  test("shows History button in page toolbar", async ({ page }) => {
    await expect(page.locator('button[title="History"]')).toBeVisible({ timeout: 5000 });
  });

  test("shows Share button in page toolbar", async ({ page }) => {
    await expect(page.locator('button[title="Share"]')).toBeVisible({ timeout: 5000 });
  });

  test("shows Permissions button in page toolbar", async ({ page }) => {
    await expect(page.locator('button[title="Permissions"]')).toBeVisible({ timeout: 5000 });
  });

  test("shows Duplicate button in page toolbar", async ({ page }) => {
    await expect(page.locator('button[title="Duplicate"]')).toBeVisible({ timeout: 5000 });
  });

  test("shows Export button in page toolbar", async ({ page }) => {
    await expect(page.locator('button[title="Export"]')).toBeVisible({ timeout: 5000 });
  });

  test("shows word count and reading time", async ({ page }) => {
    await expect(page.getByText(/words?/i)).toBeVisible({ timeout: 5000 });
    await expect(page.getByText(/min read/i)).toBeVisible({ timeout: 5000 });
  });

  test("shows revision count", async ({ page }) => {
    await expect(page.getByText(/revisions?/i)).toBeVisible({ timeout: 5000 });
  });

  test("shows comments section", async ({ page }) => {
    await expect(page.getByText(/Comments/).first()).toBeVisible({ timeout: 5000 });
  });

  test("clicking Edit navigates to editor", async ({ page }) => {
    await page.locator('button[title="Edit"]').click();
    await expect(page).toHaveURL(/\/edit/);
  });
});

test.describe("Page view — draft lifecycle", () => {
  test("draft page shows Publish button and Draft badge", async ({ page }) => {
    await page.goto("/");
    const draftEntry = page.locator("main button").filter({ hasText: "Draft" }).first();
    if (await draftEntry.isVisible().catch(() => false)) {
      await draftEntry.click();
      await page.waitForURL(/\/page\/[a-zA-Z0-9_]+/);
      await expect(page.getByText("Draft").first()).toBeVisible({ timeout: 10000 });
      await expect(page.locator("button").filter({ hasText: "Publish" })).toBeVisible();
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
