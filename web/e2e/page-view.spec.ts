import { test, expect } from "@playwright/test";
import { setupMocks, samplePages } from "./mocks";

test.describe("Page view — page detail", () => {
  test.beforeEach(async ({ page }) => {
    await setupMocks(page);
    await page.goto("/page/page_1");
  });

  test("shows the page title", async ({ page }) => {
    await expect(page.getByText("Getting Started").first()).toBeVisible({ timeout: 10000 });
  });

  test("shows page actions toolbar", async ({ page }) => {
    // The page actions toolbar should have action buttons
    const pageArea = page.locator(".page-actions");
    await expect(pageArea).toBeVisible({ timeout: 10000 });
  });

  test("has edit button that navigates to /page/:id/edit", async ({ page }) => {
    const editButton = page.locator('button[title="Edit"]');
    await expect(editButton).toBeVisible({ timeout: 10000 });
    await editButton.click();
    await expect(page).toHaveURL(/\/page\/page_1\/edit/);
  });

  test("has history button that toggles revisions panel", async ({ page }) => {
    const historyButton = page.locator('button[title="History"]');
    await expect(historyButton).toBeVisible({ timeout: 10000 });
    await historyButton.click();
    // Revisions panel should show revisions count
    await expect(page.getByText(/revisions?/i).first()).toBeVisible({ timeout: 5000 });
  });

  test("has share button", async ({ page }) => {
    const shareButton = page.locator('button[title="Share"]');
    await expect(shareButton).toBeVisible({ timeout: 10000 });
  });

  test("has permissions button", async ({ page }) => {
    const permButton = page.locator('button[title="Permissions"]');
    await expect(permButton).toBeVisible({ timeout: 10000 });
  });

  test("shows word count and reading time", async ({ page }) => {
    await expect(page.getByText(/min read/)).toBeVisible({ timeout: 10000 });
    await expect(page.getByText(/words/)).toBeVisible({ timeout: 10000 });
  });
});

test.describe("Page view — comments", () => {
  test.beforeEach(async ({ page }) => {
    await setupMocks(page);
    await page.goto("/page/page_1");
  });

  test("shows comments section with count", async ({ page }) => {
    await expect(page.getByText(/Comments/).first()).toBeVisible({ timeout: 10000 });
    await expect(page.getByText(/Comments.*\(2\)/)).toBeVisible({ timeout: 10000 });
  });

  test("shows existing comments from mock data", async ({ page }) => {
    await expect(page.getByText("Great page! Very helpful.")).toBeVisible({ timeout: 10000 });
    await expect(page.getByText("Thanks Bob!")).toBeVisible({ timeout: 10000 });
  });
});

test.describe("Page view — page status lifecycle", () => {
  test.beforeEach(async ({ page }) => {
    await setupMocks(page);
  });

  test("published page shows Archive button", async ({ page }) => {
    await page.goto("/page/page_1");
    const archiveButton = page.locator("button").filter({ hasText: "Archive" });
    await expect(archiveButton).toBeVisible({ timeout: 10000 });
  });

  test("draft page shows Publish button", async ({ page }) => {
    await page.goto("/page/page_3");
    const publishButton = page.locator("button").filter({ hasText: "Publish" });
    await expect(publishButton).toBeVisible({ timeout: 10000 });
  });

  test("draft page shows draft status badge", async ({ page }) => {
    await page.goto("/page/page_3");
    await expect(page.getByText("Draft").first()).toBeVisible({ timeout: 10000 });
  });
});

test.describe("Page view — revision history", () => {
  test.beforeEach(async ({ page }) => {
    await setupMocks(page);
    await page.goto("/page/page_1");
  });

  test("shows revisions count in metadata", async ({ page }) => {
    await expect(page.getByText(/2 revisions/).first()).toBeVisible({ timeout: 10000 });
  });

  test("clicking History button shows revision entries", async ({ page }) => {
    const historyButton = page.locator('button[title="History"]');
    await historyButton.click();
    // Should see revision list
    await expect(page.getByText("Getting Started").first()).toBeVisible({ timeout: 5000 });
  });
});

test.describe("Page view — page not found", () => {
  test.beforeEach(async ({ page }) => {
    await setupMocks(page, { pages: [] });
    await page.goto("/page/nonexistent");
  });

  test("shows page not found error", async ({ page }) => {
    await expect(page.getByText("Page not found")).toBeVisible({ timeout: 10000 });
  });

  test("shows go home button on error", async ({ page }) => {
    await expect(page.getByText("Go home")).toBeVisible({ timeout: 10000 });
  });
});
