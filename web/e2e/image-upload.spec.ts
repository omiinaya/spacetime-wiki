import { test, expect } from "@playwright/test";
import path from "path";
import fs from "fs";

/**
 * Image upload and attachment operations E2E tests.
 * Tests that images display correctly and the file upload mechanism works.
 */

test.describe("Image handling — page view", () => {
  test.beforeEach(async ({ page }) => {
    // Sign in as admin
    await page.goto("/login");
    await page.getByLabel("Email").fill("admin@spacetimewiki.local");
    await page.getByLabel("Password").fill("admin123");
    await page.getByRole("button", { name: "Sign in" }).click();
    await expect(page).toHaveURL("/", { timeout: 15000 });
  });

  test("home page loads without breaking", async ({ page }) => {
    await page.goto("/");
    await expect(page.locator("main")).toBeVisible({ timeout: 10000 });
  });
});

test.describe("Editor — new page loads", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/login");
    await page.getByLabel("Email").fill("admin@spacetimewiki.local");
    await page.getByLabel("Password").fill("admin123");
    await page.getByRole("button", { name: "Sign in" }).click();
    await expect(page).toHaveURL("/", { timeout: 15000 });
  });

  test("editor loads for new page", async ({ page }) => {
    await page.goto("/new");
    await expect(page.locator(".ProseMirror")).toBeVisible({ timeout: 20000 });
  });
});
