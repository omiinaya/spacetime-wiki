import { test, expect } from "@playwright/test";

/**
 * Login and registration flow E2E tests.
 * These tests need a running dev server and STDB instance with seed data.
 */

test.describe("Login page — unauthenticated state", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/login");
  });

  test("renders the sign-in form with email and password fields", async ({ page }) => {
    await expect(page.getByRole("heading", { name: "Sign in" })).toBeVisible({ timeout: 10000 });
    await expect(page.getByLabel("Email")).toBeVisible();
    await expect(page.getByLabel("Password")).toBeVisible();
    await expect(page.getByRole("button", { name: "Sign in" })).toBeVisible();
  });

  test("shows a link to switch to registration mode", async ({ page }) => {
    await expect(page.getByRole("button", { name: "Register" })).toBeVisible();
  });

  test("shows SSO provider buttons when configured", async ({ page }) => {
    // Google sign-in button is always shown (may error if not configured)
    await expect(page.getByRole("button", { name: /Sign in with Google/i })).toBeVisible();
  });

  test("shows an error for empty form submission", async ({ page }) => {
    await page.getByRole("button", { name: "Sign in" }).click();
    // Browser validation should prevent submission for empty required fields
    // The email input should show validation message
    const emailInput = page.getByLabel("Email");
    const validity = await emailInput.evaluate((el: HTMLInputElement) => el.validationMessage);
    expect(validity).toBeTruthy();
  });
});

test.describe("Registration flow", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/login");
  });

  test("switching to register mode shows the name field", async ({ page }) => {
    await page.getByRole("button", { name: "Register" }).click();
    await expect(page.getByRole("heading", { name: "Create account" })).toBeVisible();
    await expect(page.getByLabel("Name")).toBeVisible();
    await expect(page.getByLabel("Email")).toBeVisible();
    await expect(page.getByLabel("Password")).toBeVisible();
    await expect(page.getByRole("button", { name: "Create account" })).toBeVisible();
  });

  test("can register a new user with valid credentials", async ({ page }) => {
    const testEmail = `e2e_test_${Date.now()}@example.com`;
    const testPassword = "TestPass123!";

    // Switch to register
    await page.getByRole("button", { name: "Register" }).click();
    await expect(page.getByRole("heading", { name: "Create account" })).toBeVisible();

    // Fill form
    await page.getByLabel("Name").fill("E2E Test User");
    await page.getByLabel("Email").fill(testEmail);
    await page.getByLabel("Password").fill(testPassword);

    // Submit
    await page.getByRole("button", { name: "Create account" }).click();

    // After successful registration+login, should redirect to home
    await expect(page).toHaveURL("/", { timeout: 15000 });
    // Sidebar should show user is signed in (no "Sign in" button)
    await expect(page.locator("aside").getByRole("button", { name: "Sign in" })).not.toBeVisible({ timeout: 5000 });
  });

  test("registration with duplicate email shows error", async ({ page }) => {
    // Use an already-registered email (admin user from seed)
    await page.getByRole("button", { name: "Register" }).click();
    await page.getByLabel("Name").fill("Duplicate User");
    await page.getByLabel("Email").fill("admin@spacetimewiki.local");
    await page.getByLabel("Password").fill("TestPass123!");
    await page.getByRole("button", { name: "Create account" }).click();
    // Should show error message
    await expect(page.getByText(/already exists|duplicate|error/i).first()).toBeVisible({ timeout: 10000 });
  });
});

test.describe("Login flow", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/login");
  });

  test("signs in with valid admin credentials", async ({ page }) => {
    await page.getByLabel("Email").fill("admin@spacetimewiki.local");
    await page.getByLabel("Password").fill("admin123");
    await page.getByRole("button", { name: "Sign in" }).click();

    // Should redirect to home
    await expect(page).toHaveURL("/", { timeout: 15000 });
    // Sign in button should no longer be visible
    await expect(page.locator("aside").getByRole("button", { name: "Sign in" })).not.toBeVisible({ timeout: 5000 });
  });

  test("shows error for invalid credentials", async ({ page }) => {
    await page.getByLabel("Email").fill("admin@spacetimewiki.local");
    await page.getByLabel("Password").fill("wrong_password_123");
    await page.getByRole("button", { name: "Sign in" }).click();

    // Should show error message
    await expect(page.getByText(/error|invalid|failed|incorrect/i).first()).toBeVisible({ timeout: 10000 });
    // Should stay on login page
    await expect(page).toHaveURL(/\/login/);
  });

  test("signs out and sign-in button reappears", async ({ page, context }) => {
    // First sign in
    await page.getByLabel("Email").fill("admin@spacetimewiki.local");
    await page.getByLabel("Password").fill("admin123");
    await page.getByRole("button", { name: "Sign in" }).click();
    await expect(page).toHaveURL("/", { timeout: 15000 });

    // Clear localStorage to simulate sign-out
    await page.evaluate(() => localStorage.removeItem("sw_user_id"));
    await page.reload();

    // Sign-in button should reappear
    await expect(page.locator("aside").getByRole("button", { name: "Sign in" })).toBeVisible({ timeout: 10000 });
  });
});
