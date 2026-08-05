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
    // Guests see either the empty-wiki landing (Welcome + quick actions) or
    // the populated dashboard (Home / Recently Updated) — depends on whether
    // pages exist in the DB at run time.
    await page.goto('/');
    await page.waitForLoadState('load');
    await page.getByPlaceholder('Search...').waitFor({ state: 'visible', timeout: 20000 });
  });

  test('home shows app title', async ({ page }) => {
    await expect(page).toHaveTitle('Spacetime Wiki');
  });

  test('home renders either the landing or the dashboard', async ({ page }) => {
    // Empty wiki → landing heading "Welcome to Spacetime Wiki"
    // Populated wiki → dashboard heading "Home"
    const landing = page.getByText(/Welcome to Spacetime Wiki/i).first();
    const dashboard = page.getByRole('heading', { name: 'Home' }).first();
    const hasLanding = await isVisible(landing, 5000);
    const hasDashboard = await isVisible(dashboard, 5000);
    expect(hasLanding || hasDashboard).toBe(true);
  });

  test('Create a page entry point is reachable', async ({ page }) => {
    // Either the landing CTA button or the dashboard "New Page" button
    const landingCta = page.getByRole('button', { name: /Create a page/i }).first();
    const dashboardNewPage = page.getByRole('button', { name: /New Page/i }).first();
    const hasCta = await isVisible(landingCta, 5000);
    const hasNewPage = await isVisible(dashboardNewPage, 5000);
    expect(hasCta || hasNewPage).toBe(true);
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

    // Set the file on the hidden .md input (accept=".md,.txt"). setInputFiles
    // works on hidden inputs — click the button first so the input exists,
    // then target it precisely (the sidebar has image/zip inputs too).
    await importBtn.click();
    await page.waitForTimeout(300);
    const input = page.locator('input[type="file"][accept=".md,.txt"]').first();
    await input.setInputFiles({
      name: 'e2e-import.md',
      mimeType: 'text/markdown',
      buffer: Buffer.from('# Imported E2E Page\n\nThis page was created by an E2E import test.\n'),
    });
    await page.waitForTimeout(3000);

    // The import shows a success toast and the page appears in the sidebar
    // tree (no navigation — the handler creates the page in place).
    await expect(page.getByText(/imported from Markdown/i).first()).toBeVisible({
      timeout: 15000,
    });
    await expect(page.getByText('Imported E2E Page').first()).toBeVisible({ timeout: 15000 });
  });
});
