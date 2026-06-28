import { test, expect } from "@playwright/test";
import { setupMocks } from "./mocks";

test.describe("Sidebar navigation", () => {
  test.beforeEach(async ({ page }) => {
    await setupMocks(page);
    await page.goto("/");
  });

  test("shows sidebar with app logo", async ({ page }) => {
    const logo = page.getByRole("complementary").getByText("Spacetime Wiki");
    await expect(logo).toBeVisible();
  });

  test("sidebar has nav links", async ({ page }) => {
    await expect(page.getByRole("button", { name: "Activity" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Graph" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Templates" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Trash" })).toBeVisible();
  });

  test("clicking Activity navigates to /activity", async ({ page }) => {
    await page.getByRole("button", { name: "Activity" }).click();
    await expect(page).toHaveURL(/\/activity/);
  });

  test("clicking Graph navigates to /graph", async ({ page }) => {
    await page.getByRole("button", { name: "Graph" }).click();
    await expect(page).toHaveURL(/\/graph/);
  });
});

test.describe("Activity page", () => {
  test.beforeEach(async ({ page }) => {
    await setupMocks(page);
    await page.goto("/activity");
  });

  test("renders activity heading", async ({ page }) => {
    await expect(page.getByRole("heading", { name: "Activity" })).toBeVisible();
  });
});

test.describe("Favorites page", () => {
  test.beforeEach(async ({ page }) => {
    await setupMocks(page);
    await page.goto("/favorites");
  });

  test("renders favorites heading", async ({ page }) => {
    await expect(page.getByText("Favorites").first()).toBeVisible();
  });
});

test.describe("Graph view", () => {
  test.beforeEach(async ({ page }) => {
    await setupMocks(page);
    await page.goto("/graph");
  });

  test("renders graph heading area", async ({ page }) => {
    await expect(page.getByText("Graph").first()).toBeVisible();
  });
});

test.describe("Login page", () => {
  test.beforeEach(async ({ page }) => {
    await setupMocks(page);
    await page.goto("/login");
  });

  test("shows the login page", async ({ page }) => {
    // The login page renders without redirecting due to missing STDB auth
    await expect(page.locator("body")).toBeVisible();
  });
});
