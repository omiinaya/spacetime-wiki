import { test, expect } from "@playwright/test";

test.describe("Page features", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/");
  });

  test("keyboard shortcuts button opens modal via sidebar click", async ({ page }) => {
    // Use the sidebar button (already verified in navigation.spec.ts)
    await page.locator("aside").getByRole("button", { name: /Keyboard shortcuts/i }).click();
    await expect(page.getByRole("heading", { name: "Keyboard Shortcuts" })).toBeVisible({ timeout: 5000 });
  });

  test("keyboard shortcuts modal can be closed with Escape after opening via button", async ({ page }) => {
    await page.locator("aside").getByRole("button", { name: /Keyboard shortcuts/i }).click();
    await expect(page.getByRole("heading", { name: "Keyboard Shortcuts" })).toBeVisible({ timeout: 5000 });
    await page.keyboard.press("Escape");
    const modalHeading = page.getByRole("heading", { name: "Keyboard Shortcuts" });
    await expect(modalHeading).not.toBeVisible({ timeout: 3000 });
  });

  test("sidebar shows Uncategorized collection with page count", async ({ page }) => {
    const aside = page.locator("aside");
    const uncategorized = aside.locator("button").filter({ hasText: "Uncategorized" });
    await expect(uncategorized).toBeVisible({ timeout: 15000 });
    const text = await uncategorized.textContent();
    const countMatch = text?.match(/(\d+)/);
    expect(countMatch).not.toBeNull();
    expect(parseInt(countMatch![1], 10)).toBeGreaterThan(0);
  });

  test("Filters button exists and is clickable", async ({ page }) => {
    const filtersButton = page.locator("aside").getByRole("button", { name: "Filters" });
    await expect(filtersButton).toBeVisible();
    await filtersButton.click();
    await page.waitForTimeout(500);
  });
});

test.describe("Graph view", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/graph");
  });

  test("graph page renders", async ({ page }) => {
    await expect(page.getByText("Graph").first()).toBeVisible({ timeout: 10000 });
  });
});

test.describe("Activity page", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/activity");
  });

  test("activity page renders with heading", async ({ page }) => {
    await expect(page.getByRole("heading", { name: "Activity" })).toBeVisible({ timeout: 10000 });
  });
});

test.describe("Favorites page", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/favorites");
  });

  test("favorites page renders without crashing", async ({ page }) => {
    await expect(page.getByText("Favorites").first()).toBeVisible({ timeout: 10000 });
  });
});

test.describe("Login page", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/login");
  });

  test("login page renders", async ({ page }) => {
    await expect(page.locator("body")).toBeVisible({ timeout: 10000 });
  });
});

test.describe("New page creation flow", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/");
  });

  test("clicking New page in sidebar opens template picker, then Blank page navigates to /new", async ({ page }) => {
    // Click "New page" in sidebar
    await page.locator("aside").getByRole("button", { name: "New page" }).first().click();
    await page.waitForTimeout(500);

    // Template picker modal should appear
    await expect(page.getByRole("heading", { name: "New page from template" })).toBeVisible({ timeout: 5000 });

    // Click "Blank page" to start with empty document
    await page.getByRole("button", { name: /Blank page/i }).click();
    await expect(page).toHaveURL(/\/new/);

    // Editor should load
    await expect(page.locator(".ProseMirror")).toBeVisible({ timeout: 15000 });
  });

  test("clicking New Page in main area also navigates to /new", async ({ page }) => {
    await page.locator("main").getByRole("button", { name: "New Page" }).click();
    await expect(page).toHaveURL(/\/new/);
    await page.waitForTimeout(2000);
    const editorReady = await page.locator(".ProseMirror").isVisible().catch(() => false);
    expect(editorReady).toBeTruthy();
  });
});
