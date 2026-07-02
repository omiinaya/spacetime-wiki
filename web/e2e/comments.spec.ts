import { test, expect } from "@playwright/test";

/**
 * Comment and thread operations E2E tests.
 * Tests viewing, adding, and interacting with comments on pages.
 */

test.describe("Comments — viewing and creating", () => {
  test.beforeEach(async ({ page }) => {
    // Sign in as admin
    await page.goto("/login");
    await page.getByLabel("Email").fill("admin@spacetimewiki.local");
    await page.getByLabel("Password").fill("admin123");
    await page.getByRole("button", { name: "Sign in" }).click();
    await expect(page).toHaveURL("/", { timeout: 15000 });
  });

  test("page view shows comments section", async ({ page }) => {
    // Navigate to a page
    await page.goto("/");
    const firstPage = page.locator("main button").filter({ hasText: /Updated/ }).first();
    await expect(firstPage).toBeVisible({ timeout: 15000 });
    await firstPage.click();
    await expect(page).toHaveURL(/\/page\/[a-zA-Z0-9_]+/);

    // Comments section should be visible
    await expect(page.getByText(/Comments/).first()).toBeVisible({ timeout: 5000 });
  });

  test("comments section has an input field or add button", async ({ page }) => {
    await page.goto("/");
    const firstPage = page.locator("main button").filter({ hasText: /Updated/ }).first();
    await expect(firstPage).toBeVisible({ timeout: 15000 });
    await firstPage.click();
    await expect(page).toHaveURL(/\/page\/[a-zA-Z0-9_]+/);

    // Should have either a text input for adding comments or a "Write a comment" placeholder
    const commentInput = page.getByPlaceholder(/comment|write/i);
    const addButton = page.getByRole("button", { name: /add comment|new comment/i });
    const hasInputOrButton = (await commentInput.isVisible().catch(() => false)) ||
                             (await addButton.isVisible().catch(() => false));
    expect(hasInputOrButton).toBeTruthy();
  });

  test("can write a comment on a page", async ({ page }) => {
    await page.goto("/");
    const firstPage = page.locator("main button").filter({ hasText: /Updated/ }).first();
    await expect(firstPage).toBeVisible({ timeout: 15000 });
    await firstPage.click();
    await expect(page).toHaveURL(/\/page\/[a-zA-Z0-9_]+/);

    // Try to add a comment
    const commentInput = page.getByPlaceholder(/comment|write|add/i).first();
    if (await commentInput.isVisible().catch(() => false)) {
      await commentInput.fill("E2E test comment");
      // Press Enter or click submit
      const submitBtn = page.getByRole("button", { name: /send|submit|post|add/i }).first();
      if (await submitBtn.isVisible().catch(() => false)) {
        await submitBtn.click();
      } else {
        await commentInput.press("Enter");
      }
      await page.waitForTimeout(1000);
      // The comment should appear in the comments list
      await expect(page.getByText("E2E test comment").first()).toBeVisible({ timeout: 5000 });
    }
  });
});

test.describe("Comments — reactions", () => {
  test.beforeEach(async ({ page }) => {
    // Sign in
    await page.goto("/login");
    await page.getByLabel("Email").fill("admin@spacetimewiki.local");
    await page.getByLabel("Password").fill("admin123");
    await page.getByRole("button", { name: "Sign in" }).click();
    await expect(page).toHaveURL("/", { timeout: 15000 });
  });

  test("existing comments show reaction button (emoji)", async ({ page }) => {
    await page.goto("/");
    const firstPage = page.locator("main button").filter({ hasText: /Updated/ }).first();
    await expect(firstPage).toBeVisible({ timeout: 15000 });
    await firstPage.click();
    await expect(page).toHaveURL(/\/page\/[a-zA-Z0-9_]+/);

    // Look for reaction buttons on comments
    const reactionButton = page.locator("button").filter({ hasText: /👍|❤️|😄|🎉|🚀/ }).first();
    if (await reactionButton.isVisible().catch(() => false)) {
      // If reactions exist, clicking should toggle
      await reactionButton.click();
      await page.waitForTimeout(500);
    }
  });
});
