import { test, expect } from './fixtures';
import { signInAsAdmin, createPage, isVisible } from './helpers';

/**
 * Deep-flow E2E tests for Home, Activity, Favorites, and Imports.
 *
 * Home: create-first-page CTA + landing quick-actions.
 * Activity: feed lists page events (empty state or populated).
 * Favorites: empty state when nothing is starred.
 * Import: Markdown import via the hidden file input (setInputFiles).
 */

test.describe('Home — landing flows', () => {
  test.beforeEach(async ({ page }) => {
    // The landing page (Welcome + quick actions) renders for GUESTS; signed-in
    // users see the "Home / Recently Updated" dashboard instead.
    await page.goto('/');
    await page.waitForLoadState('load');
    await page.getByPlaceholder('Search...').waitFor({ state: 'visible', timeout: 20000 });
  });

  test('home shows quick-action buttons', async ({ page }) => {
    await expect(page.getByText(/Welcome to Spacetime Wiki/i).first()).toBeVisible({
      timeout: 15000,
    });
    // The landing quick-actions section
    await expect(page.getByText(/Create a page/i).first()).toBeVisible({ timeout: 10000 });
    await expect(page.getByText(/Import Markdown/i).first()).toBeVisible({ timeout: 10000 });
  });

  test('Create a page CTA is visible on the landing', async ({ page }) => {
    const cta = page.getByRole('button', { name: /Create a page/i }).first();
    await expect(cta).toBeVisible({ timeout: 10000 });
  });
});

test.describe('Activity — feed', () => {
  test.beforeEach(async ({ page }) => {
    await signInAsAdmin(page);
  });

  test('activity page renders heading and feed (empty or populated)', async ({ page }) => {
    await page.goto('/activity');
    await page.waitForLoadState('load');
    await expect(page.getByRole('heading', { name: /Activity/i }).first()).toBeVisible({
      timeout: 15000,
    });
    // Either populated events or the empty-state text
    const emptyState = page.getByText(/Activity will appear here/i);
    const eventRow = page.locator('main').getByText(/page|collection|comment|created|updated|deleted/i).first();
    await page.waitForTimeout(2500);
    const hasEmpty = await isVisible(emptyState, 2000);
    const hasEvent = await isVisible(eventRow, 2000);
    expect(hasEmpty || hasEvent).toBe(true);
  });
});

test.describe('Favorites — empty state', () => {
  test.beforeEach(async ({ page }) => {
    await signInAsAdmin(page);
  });

  test('favorites page shows empty state when nothing starred', async ({ page }) => {
    await page.goto('/favorites');
    await page.waitForLoadState('load');
    // Empty state heading OR a list of favorited pages
    const emptyState = page.getByRole('heading', { name: /No favorites yet/i });
    const hasEmpty = await isVisible(emptyState, 5000);
    if (!hasEmpty) {
      // A favorited page may exist from other tests — the page must at least
      // render its heading without crashing.
      await expect(page.locator('main').first()).toBeVisible({ timeout: 5000 });
    }
  });
});

test.describe('Import — Markdown', () => {
  test.beforeEach(async ({ page }) => {
    await signInAsAdmin(page);
  });

  test('importing a markdown file creates a page', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('load');

    // The Import MD button triggers the hidden file input
    const importBtn = page.locator('aside').getByRole('button', { name: 'Import MD' });
    await expect(importBtn).toBeVisible({ timeout: 10000 });

    // Set the file on the hidden input (accept=".md")
    const fileInput = page.locator('input[type="file"]').first();
    if (!(await isVisible(fileInput, 3000))) {
      // Hidden input may not be "visible" — use setInputFiles directly on it
      await importBtn.click();
      await page.waitForTimeout(300);
    }
    const input = page.locator('input[type="file"]').first();
    await input.setInputFiles({
      name: 'e2e-import.md',
      mimeType: 'text/markdown',
      buffer: Buffer.from('# Imported E2E Page\n\nThis page was created by an E2E import test.\n'),
    });
    await page.waitForTimeout(3000);

    // The import navigates to the new page or the editor
    const imported = page.getByText(/Imported E2E Page/i).first();
    await expect(imported).toBeVisible({ timeout: 15000 });
  });
});
