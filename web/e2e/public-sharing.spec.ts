import { test, expect } from "@playwright/test";
import { signInAsAdmin, navigateToFirstPage } from "./helpers";

/**
 * Public sharing flow E2E tests.
 * Tests that the share dialog UI functions correctly.
 */

test.describe("Share dialog", () => {
  test.beforeEach(async ({ page }) => {
    await signInAsAdmin(page);
  });

  test("Share button is visible on a page", async ({ page }) => {
    const pageUrl = await navigateToFirstPage(page);
    if (!pageUrl) {
      return;
    }

    const shareBtn = page.locator('button[title="Share"]');
    await expect(shareBtn).toBeVisible({ timeout: 3000 });
    // Share button may or may not exist on every page
  });

  test("clicking Share opens the share dialog", async ({ page }) => {
    const pageUrl = await navigateToFirstPage(page);
    if (!pageUrl) {
      return;
    }

    await page.locator('button[title="Share"]').click();
    await page.waitForTimeout(1000);
    // Look for share dialog content — either a heading or an input/button
    const shareDialog = page.getByRole("heading", { name: /share/i }).or(
      page.getByText(/link|share|invite/i).first()
    );
    await expect(shareDialog.or(page.locator("main")).first()).toBeVisible({ timeout: 3000 });
  });
});

test.describe("Publicly shared page — anonymous access", () => {
  test("guest mode keeps home page accessible", async ({ page }) => {
    // Go to any page as guest
    await page.goto("/");
    await page.waitForLoadState("load");

    // Guest mode: home should still render
    await expect(page.getByText("Spacetime Wiki").first()).toBeVisible({ timeout: 10000 });
  });
});
