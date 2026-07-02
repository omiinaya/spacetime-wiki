import { test, expect } from "@playwright/test";

/**
 * Template operations E2E tests.
 * Tests the template picker and template-based page creation.
 */

test.describe("Templates — picker and usage", () => {
  test.beforeEach(async ({ page }) => {
    // Sign in as admin
    await page.goto("/login");
    await page.getByLabel("Email").fill("admin@spacetimewiki.local");
    await page.getByLabel("Password").fill("admin123");
    await page.getByRole("button", { name: "Sign in" }).click();
    await expect(page).toHaveURL("/", { timeout: 15000 });
  });

  test("New page opens template picker", async ({ page }) => {
    await page.goto("/");
    await page.locator("aside").getByRole("button", { name: "New page" }).first().click();
    await page.waitForTimeout(500);

    // Template picker modal should appear
    await expect(page.getByRole("heading", { name: /New page from template|template/i })).toBeVisible({ timeout: 5000 });
  });

  test("template picker shows Blank page option", async ({ page }) => {
    await page.goto("/");
    await page.locator("aside").getByRole("button", { name: "New page" }).first().click();
    await page.waitForTimeout(500);

    await expect(page.getByRole("button", { name: /Blank page/i })).toBeVisible({ timeout: 5000 });
  });

  test("clicking Blank page navigates to editor", async ({ page }) => {
    await page.goto("/");
    await page.locator("aside").getByRole("button", { name: "New page" }).first().click();
    await page.waitForTimeout(500);

    await page.getByRole("button", { name: /Blank page/i }).click();
    await expect(page).toHaveURL(/\/new/);
    await expect(page.locator(".ProseMirror")).toBeVisible({ timeout: 15000 });
  });

  test("Templates link in sidebar is visible", async ({ page }) => {
    await page.goto("/");
    await expect(page.locator("aside").getByRole("button", { name: "Templates" })).toBeVisible();
  });
});

test.describe("Creating a page from a template", () => {
  test.beforeEach(async ({ page }) => {
    // Sign in
    await page.goto("/login");
    await page.getByLabel("Email").fill("admin@spacetimewiki.local");
    await page.getByLabel("Password").fill("admin123");
    await page.getByRole("button", { name: "Sign in" }).click();
    await expect(page).toHaveURL("/", { timeout: 15000 });
  });

  test("can navigate to /new and see the editor", async ({ page }) => {
    await page.goto("/new");
    await expect(page.locator(".ProseMirror")).toBeVisible({ timeout: 20000 });
    await expect(page.getByPlaceholder("Untitled")).toBeVisible({ timeout: 15000 });
  });

  test("can type content in the new page editor", async ({ page }) => {
    await page.goto("/new");
    await expect(page.locator(".ProseMirror")).toBeVisible({ timeout: 20000 });

    const editor = page.locator(".ProseMirror");
    await editor.fill("E2E template test content");
    await expect(editor).toContainText("E2E template test content");
  });

  test("title input accepts text", async ({ page }) => {
    await page.goto("/new");
    await expect(page.getByPlaceholder("Untitled")).toBeVisible({ timeout: 15000 });

    const titleInput = page.getByPlaceholder("Untitled");
    await titleInput.fill("E2E Template Page Title");
    await expect(titleInput).toHaveValue("E2E Template Page Title");
  });
});
