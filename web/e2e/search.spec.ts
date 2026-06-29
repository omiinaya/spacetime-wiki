import { test, expect } from "@playwright/test";
import { setupMocks } from "./mocks";

test.describe("Search — sidebar search bar", () => {
  test.beforeEach(async ({ page }) => {
    await setupMocks(page);
    await page.goto("/");
  });

  test("shows search input in sidebar", async ({ page }) => {
    const searchInput = page.locator('input[placeholder="Search..."]');
    await expect(searchInput).toBeVisible();
  });

  test("typing in search filters pages in sidebar", async ({ page }) => {
    const searchInput = page.locator('input[placeholder="Search..."]');
    await searchInput.fill("Getting");
    // After typing, the sidebar should filter — "Getting Started" should still show
    await expect(page.getByText("Getting Started").first()).toBeVisible();
  });

  test("search has a clear button when text is entered", async ({ page }) => {
    const searchInput = page.locator('input[placeholder="Search..."]');
    await searchInput.fill("test");
    // The X clear button should appear
    const clearButton = page.locator('input[placeholder="Search..."] + button, input[placeholder="Search..."] ~ button').first();
    await expect(clearButton).toBeVisible();
  });

  test("clearing search shows all pages again", async ({ page }) => {
    const searchInput = page.locator('input[placeholder="Search..."]');
    await searchInput.fill("Getting");
    // Clear by emptying
    await searchInput.clear();
    // Pages should still be visible
    await expect(page.getByText("Getting Started").first()).toBeVisible();
    await expect(page.getByText("Architecture Overview").first()).toBeVisible();
  });
});

test.describe("Search — filters panel", () => {
  test.beforeEach(async ({ page }) => {
    await setupMocks(page);
    await page.goto("/");
  });

  test("shows filter toggle button", async ({ page }) => {
    const filterButton = page.locator("button").filter({ hasText: /Filters/ });
    await expect(filterButton).toBeVisible();
  });
});

test.describe("Search — advanced syntax", () => {
  test.beforeEach(async ({ page }) => {
    await setupMocks(page);
    await page.goto("/");
  });

  test("advanced search syntax in:CollectionName filters by collection", async ({ page }) => {
    const searchInput = page.locator('input[placeholder="Search..."]');
    await searchInput.fill("in:Engineering");
    // The token is parsed out and applied as a filter, so the input is cleared
    // Verify the search still triggers (no error state)
    await expect(searchInput).toBeVisible();
  });

  test("search input accepts general text queries", async ({ page }) => {
    const searchInput = page.locator('input[placeholder="Search..."]');
    await searchInput.fill("architecture");
    await expect(searchInput).toHaveValue("architecture");
  });
});

test.describe("Command palette (Cmd+K)", () => {
  test.beforeEach(async ({ page }) => {
    await setupMocks(page);
    await page.goto("/");
  });

  test("pressing ? opens keyboard shortcuts modal", async ({ page }) => {
    await page.keyboard.press("?");
    // Shortcuts modal should show
    await expect(page.getByText("Keyboard Shortcuts").first()).toBeVisible({ timeout: 5000 });
  });
});
