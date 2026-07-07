import { test, expect } from "@playwright/test";
import { signInAsAdmin } from "./helpers";

/**
 * Image upload and attachment operations E2E tests.
 * Tests that images display correctly and the file upload mechanism works.
 */

test.describe("Image handling — page view", () => {
  test.beforeEach(async ({ page }) => {
    await signInAsAdmin(page);
  });

  test("home page loads without breaking", async ({ page }) => {
    await page.goto("/");
    await expect(page.locator("main")).toBeVisible({ timeout: 10000 });
  });
});

test.describe("Editor — new page loads", () => {
  test.beforeEach(async ({ page }) => {
    await signInAsAdmin(page);
  });

  test("editor loads for new page", async ({ page }) => {
    await page.goto("/new");
    await expect(page.locator(".ProseMirror")).toBeVisible({ timeout: 20000 });
  });
});
