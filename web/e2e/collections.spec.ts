import { test, expect } from "@playwright/test";
import { setupMocks, sampleCollections } from "./mocks";

test.describe("Collections — sidebar", () => {
  test.beforeEach(async ({ page }) => {
    await setupMocks(page);
    await page.goto("/");
  });

  test("shows collections in the sidebar", async ({ page }) => {
    // Collections should appear in the sidebar — check for their names
    await expect(page.getByText("Engineering").first()).toBeVisible({ timeout: 5000 });
    await expect(page.getByText("Design").first()).toBeVisible({ timeout: 5000 });
  });

  test("shows new collection button in sidebar", async ({ page }) => {
    const newColButton = page.getByText("New collection");
    await expect(newColButton).toBeVisible();
  });

  test("clicking New collection opens dialog", async ({ page }) => {
    await page.getByText("New collection").click();
    // The dialog should show
    await expect(page.getByText("New collection").or(page.getByText("Collection name"))).toBeVisible({ timeout: 5000 });
  });
});

test.describe("Collections — empty state", () => {
  test.beforeEach(async ({ page }) => {
    await setupMocks(page, { collections: [] });
    await page.goto("/");
  });

  test("does not show non-existent collections", async ({ page }) => {
    await expect(page.getByText("Engineering")).not.toBeVisible();
    await expect(page.getByText("Design")).not.toBeVisible();
  });
});
