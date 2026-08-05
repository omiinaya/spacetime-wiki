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

/**
 * STDB endpoint for direct SQL probes from specs. Mirrors playwright.config.ts
 * env handling — Vite-only `import.meta.env` is undefined in Playwright's Node
 * runtime, so specs must use `process.env` (never import from src/lib/api).
 */
export const E2E_STDB_HOST = process.env.STDB_HOST || 'localhost:3001';
export const E2E_STDB_DB =
  process.env.STDB_DATABASE || process.env.STDB_DB || 'spacetime-wiki-e2e';

/**
 * Run a raw SQL query against STDB from a spec. Rows come back as positional
 * arrays (`unknown[][]`), indexed by column position in the SELECT clause.
 */
export async function sqlQuery(sql: string): Promise<unknown[][]> {
  const res = await fetch(
    `http://${E2E_STDB_HOST}/v1/database/${E2E_STDB_DB}/sql`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain' },
      body: sql,
    },
  );
  if (!res.ok) throw new Error(`STDB query failed: ${res.status}`);
  const data = await res.json();
  return (data[0]?.rows || []) as unknown[][];
}

/** Render a string as a SQL literal for safe interpolation. */
export function sqlLit(value: string): string {
  return `'${value.replace(/\\/g, '\\\\').replace(/'/g, "''")}'`;
}

/** Default admin credentials from global seed */
export const ADMIN_EMAIL = 'admin@spacetimewiki.local';
// Default matches the password used by global-setup.ts / seed-e2e-data.py so
// tests are hermetic with zero environment setup. Override via ADMIN_PASSWORD
// when the seed is customized. (login.spec.ts already hardcodes 'admin123'.)
export const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'admin123';

/**
 * Sign in as the admin user. Navigates to /login, fills credentials,
 * and waits for redirect to home.
 */
export async function signInAsAdmin(page: Page): Promise<void> {
  await page.goto('/login');
  await page.waitForLoadState('load');

  // The login form renders async under accumulated test data — wait for it.
  await page.getByLabel('Email').waitFor({ state: 'visible', timeout: 30000 });
  await page.getByLabel('Email').fill(ADMIN_EMAIL);
  await page.getByLabel('Password').fill(ADMIN_PASSWORD);
  await page.locator('form').getByRole('button', { name: 'Sign in', exact: true }).click();

  // Wait for redirect
  await expect(page).toHaveURL('/', { timeout: 30000 });

  // Wait for the app shell to mount (sidebar search input) — guards the
  // cold-start race where the page still shows "Loading..." and the sidebar
  // buttons aren't in the DOM yet.
  await expect(page.getByPlaceholder('Search...')).toBeVisible({ timeout: 30000 });
}

/**
 * Navigate to the first available page from the home page.
 * Creates a test page if none exist.
 */
export async function navigateToFirstPage(page: Page): Promise<string | null> {
  await page.goto('/');
  await page.waitForLoadState('load');

  // Try to find and click an existing page. The recent-pages list is
  // populated via an STDB subscription, so wait for it to sync before
  // concluding there are no pages (avoids needless createPage fallbacks).
  const pageEntries = page.locator('main button').filter({ hasText: /Updated/ });
  try {
    await pageEntries.first().waitFor({ state: 'visible', timeout: 10000 });
  } catch {
    // Fall through to page creation below.
  }
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

  // Save the page — the Save button creates the page (for a new page) and
  // navigates to the view route /page/{id}. Without this the editor stays on
  // /new and page-view-only elements (e.g. the Share button) never appear.
  const saveBtn = page.getByRole('button', { name: 'Save', exact: true });
  if (await isVisible(saveBtn, 3000)) {
    await saveBtn.click();
  }

  // Wait for navigation to the created page view
  await page.waitForURL(/\/page\/[a-zA-Z0-9_]+$/, { timeout: 20000 });
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
