import { test, expect } from "@playwright/test";
import { setupMocks, samplePages } from "./mocks";

test.describe("Home page — empty state", () => {
  test.beforeEach(async ({ page }) => {
    await setupMocks(page, { pages: [] });
    await page.goto("/");
  });

  test("shows welcome message when no pages exist", async ({ page }) => {
    await expect(page.getByText("Welcome to Spacetime Wiki")).toBeVisible();
  });

  test("shows create page button", async ({ page }) => {
    await expect(page.getByText("Create a page")).toBeVisible();
  });

  test("shows import markdown button", async ({ page }) => {
    await expect(page.getByText("Import Markdown")).toBeVisible();
  });

  test("shows keyboard shortcuts card", async ({ page }) => {
    await expect(page.getByRole("button", { name: "Keyboard shortcuts Press ? to" })).toBeVisible();
  });

  test("shows feature cards", async ({ page }) => {
    await expect(page.getByText("Rich editing")).toBeVisible();
    await expect(page.getByText("Full-text search")).toBeVisible();
    await expect(page.getByText("Collections & tags")).toBeVisible();
    await expect(page.getByText("Comments & history")).toBeVisible();
    await expect(page.getByText("Permissions & sharing")).toBeVisible();
    await expect(page.getByText("Import/export")).toBeVisible();
    await expect(page.getByText("Favorites & pinning")).toBeVisible();
    await expect(page.getByText("Templates & embeds")).toBeVisible();
  });

  test("clicking create navigates to /new", async ({ page }) => {
    await page.getByText("Create a page").click();
    await expect(page).toHaveURL(/\/new/);
  });
});

test.describe("Home page — with pages", () => {
  test.beforeEach(async ({ page }) => {
    await setupMocks(page, { pages: samplePages });
    await page.goto("/");
  });

  test("shows 'Home' heading", async ({ page }) => {
    await expect(page.getByText("Home")).toBeVisible();
  });

  test("shows recently updated section", async ({ page }) => {
    await expect(page.getByText("Recently Updated")).toBeVisible();
  });

  test("shows page titles from API", async ({ page }) => {
    await expect(page.getByText("Getting Started").first()).toBeVisible();
    await expect(page.getByText("Architecture Overview")).toBeVisible();
    await expect(page.getByText("Draft Notes")).toBeVisible();
  });

  test("shows draft badge for draft pages", async ({ page }) => {
    await expect(page.getByText("· Draft")).toBeVisible();
  });

  test("shows trending section", async ({ page }) => {
    await expect(page.getByText("Trending")).toBeVisible();
  });

  test("clicking a recent page navigates to its view page", async ({ page }) => {
    await page.getByText("Getting Started").first().click();
    await expect(page).toHaveURL(/\/page\/page_1/);
  });
});
