import type { Page, Locator } from '@playwright/test';
import { expect } from '@playwright/test';

/**
 * E2E test helpers for SpacetimeWiki.
 *
 * Provides reusable utilities for:
 * - Signing in as admin
 * - Getting the first available page
 * - Creating a page on the fly
 * - Creating a collection
 * - Waiting for STDB sync
 */

/** Default admin credentials from global seed */
export const ADMIN_EMAIL = 'admin@spacetimewiki.local';
export const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || '';

/**
 * Sign in as the admin user. Navigates to /login, fills credentials,
 * and waits for redirect to home.
 */
export async function signInAsAdmin(page: Page): Promise<void> {
  await page.goto('/login');
  await page.waitForLoadState('load');

  await page.getByLabel('Email').fill(ADMIN_EMAIL);
  await page.getByLabel('Password').fill(ADMIN_PASSWORD);
  await page.locator('form').getByRole('button', { name: 'Sign in', exact: true }).click();

  // Wait for redirect
  await expect(page).toHaveURL('/', { timeout: 20000 });
}

/**
 * Navigate to the first available page from the home page.
 * Creates a test page if none exist.
 */
export async function navigateToFirstPage(page: Page): Promise<string | null> {
  await page.goto('/');
  await page.waitForLoadState('load');

  // Try to find and click an existing page
  const pageEntries = page.locator('main button').filter({ hasText: /Updated/ });
  const count = await pageEntries.count();

  if (count > 0) {
    await pageEntries.first().click();
    await expect(page).toHaveURL(/\/page\/[a-zA-Z0-9_]+/);
    await expect(page.locator('main')).toBeVisible({ timeout: 10000 });
    return page.url();
  }

  // No pages exist — create one via the seed process
  return await createPage(page, 'E2E Test Page', 'This is a test page for E2E testing.');
}

/**
 * Create a page with the given title and content via the UI.
 * Uses the "New page" → "Blank page" flow.
 * Returns the page URL if successful, null otherwise.
 */
export async function createPage(
  page: Page,
  title: string,
  content: string,
): Promise<string | null> {
  // Click "New page" in sidebar
  const newPageBtn = page.locator('aside').getByRole('button', { name: 'New page' }).first();
  if (!(await isVisible(newPageBtn, 3000))) {
    return null;
  }
  await newPageBtn.click();
  await page.waitForTimeout(500);

  // Template picker — choose "Blank page"
  const blankPageBtn = page.getByRole('button', { name: /Blank page/i });
  if (await isVisible(blankPageBtn, 3000)) {
    await blankPageBtn.click();
  }

  // Wait for editor to load
  try {
    await expect(page.locator('.ProseMirror')).toBeVisible({ timeout: 20000 });
  } catch {
    return null;
  }

  // Set title
  const titleInput = page.getByPlaceholder('Untitled');
  if (await isVisible(titleInput, 3000)) {
    await titleInput.fill(title);
  }

  // Set content
  const editor = page.locator('.ProseMirror');
  await editor.fill(content);
  await page.waitForTimeout(1000);

  // Get the page URL
  await page.waitForURL(/\/page\/[a-zA-Z0-9_]+|\/new/);
  return page.url();
}

/**
 * Create a collection with the given name via the UI.
 */
export async function createCollection(page: Page, name: string): Promise<boolean> {
  const newColBtn = page.locator('aside').getByRole('button', { name: 'New collection' });
  if (!(await isVisible(newColBtn, 3000))) {
    return false;
  }
  await newColBtn.click();
  await page.waitForTimeout(500);

  const nameInput = page.getByPlaceholder(/name|title/i);
  if (await isVisible(nameInput, 2000)) {
    await nameInput.fill(name);
    const submitBtn = page.getByRole('button', { name: /create|save|add/i }).first();
    if (await isVisible(submitBtn)) {
      await submitBtn.click();
      await page.waitForTimeout(1000);
      return true;
    }
  }
  return false;
}

/**
 * Get count of visible page entries on the home page.
 */
export async function getPageEntryCount(page: Page): Promise<number> {
  return await page
    .locator('main button')
    .filter({ hasText: /Updated/ })
    .count();
}

/**
 * Wait for STDB to sync changes. Use after operations that modify data.
 */
export async function waitForSync(page: Page, ms = 1500): Promise<void> {
  await page.waitForTimeout(ms);
}

/**
 * Check if a locator is visible (non-throwing).
 */
export async function isVisible(locator: Locator, timeout = 3000): Promise<boolean> {
  try {
    await locator.waitFor({ state: 'visible', timeout });
    return true;
  } catch {
    return false;
  }
}
