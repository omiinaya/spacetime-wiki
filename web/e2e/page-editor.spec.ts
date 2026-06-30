import { test, expect } from "@playwright/test";

test.describe("Page editor — new page", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/new");
  });

  test("renders the ProseMirror editor", async ({ page }) => {
    await expect(page.locator(".ProseMirror")).toBeVisible({ timeout: 20000 });
  });

  test("shows title input for the page", async ({ page }) => {
    await expect(page.getByPlaceholder("Untitled")).toBeVisible({ timeout: 15000 });
  });

  test("allows typing in the editor", async ({ page }) => {
    await expect(page.locator(".ProseMirror")).toBeVisible({ timeout: 20000 });
    const editor = page.locator(".ProseMirror");
    await editor.fill("Hello, this is a real E2E test page!");
    await expect(editor).toContainText("Hello, this is a real E2E test page!");
  });

  test("allows setting a page title", async ({ page }) => {
    const titleInput = page.getByPlaceholder("Untitled");
    await expect(titleInput).toBeVisible({ timeout: 15000 });
    await titleInput.fill("E2E Test Page Title");
    await expect(titleInput).toHaveValue("E2E Test Page Title");
  });
});

test.describe("Page editor — edit existing page via URL", () => {
  test("navigating to /page/:id/edit loads the editor", async ({ page }) => {
    // Navigate to the first page first to get its ID
    await page.goto("/");
    const firstPage = page.locator("main button").filter({ hasText: /Updated/ }).first();
    await expect(firstPage).toBeVisible({ timeout: 15000 });
    await firstPage.click();
    await page.waitForURL(/\/page\/[a-zA-Z0-9_]+/);
    const pageUrl = page.url();
    const pageId = pageUrl.match(/\/page\/([a-zA-Z0-9_]+)/)?.[1];

    // Navigate directly to edit URL
    if (pageId) {
      await page.goto(`/page/${pageId}/edit`);
      await expect(page.locator(".ProseMirror")).toBeVisible({ timeout: 20000 });
      await expect(page.getByPlaceholder("Untitled")).toBeVisible({ timeout: 10000 });
    }
  });
});
