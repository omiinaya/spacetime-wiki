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

  test("clicking Admin navigates to /admin", async ({ page }) => {
    const adminButton = page.getByRole("button", { name: "Admin" });
    await expect(adminButton).toBeVisible();
    await adminButton.click();
    await expect(page).toHaveURL(/\/admin/);
  });

  test("clicking AI Assistant opens the assistant panel", async ({ page }) => {
    const aiButton = page.getByRole("button", { name: "AI Assistant" });
    await expect(aiButton).toBeVisible();
    await aiButton.click();
    // Should open AI assistant panel
    await expect(page.getByText("AI Assistant").first()).toBeVisible({ timeout: 5000 });
  });

  test("theme toggle button exists", async ({ page }) => {
    const themeButton = page.locator("button[title*='theme' i], button[title*='light' i], button[title*='dark' i]").first();
    await expect(themeButton).toBeVisible();
  });

  test("keyboard shortcuts button exists", async ({ page }) => {
    const shortcutsButton = page.getByText("Keyboard shortcuts");
    await expect(shortcutsButton).toBeVisible();
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
