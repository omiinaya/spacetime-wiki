import { test, expect } from "@playwright/test";
import { setupMocks, samplePages } from "./mocks";

test.describe("Page view", () => {
  test.beforeEach(async ({ page }) => {
    await setupMocks(page);
  });

  test("navigates to a page from home", async ({ page }) => {
    await page.goto("/");
    await page.getByText("Getting Started").first().click();
    await expect(page).toHaveURL(/\/page\/page_1/);
  });
});

test.describe("Page creation", () => {
  test.beforeEach(async ({ page }) => {
    await setupMocks(page);
    await page.goto("/new");
  });

  test("renders the page editor with ProseMirror", async ({ page }) => {
    await expect(page.locator(".ProseMirror")).toBeVisible({ timeout: 10000 });
  });
});
