import { test, expect } from './fixtures';
import { signInAsAdmin, createPage, isVisible } from './helpers';

/**
 * Page toolbar actions E2E tests — watch, pin, duplicate, permissions.
 *
 * Exercises the page view toolbar buttons that mutate page state:
 *   - Watch / unwatch (bell icon)
 *   - Pin / unpin (pin icon)
 *   - Duplicate a page
 *   - Permissions dialog opens
 */

test.describe('Page toolbar actions', () => {
  test.beforeEach(async ({ page }) => {
    await signInAsAdmin(page);
  });

  /** Create a page and wait for the view toolbar to be interactive. */
  async function createPageWithToolbar(
    page: import('@playwright/test').Page,
    title: string,
    content: string,
  ): Promise<string | null> {
    const pageUrl = await createPage(page, title, content);
    if (!pageUrl) return null;
    // Toolbar renders after page data loads — wait for a stable toolbar
    // button before interacting.
    await page
      .locator('button[title="Favorite"], button[title="Share"]')
      .first()
      .waitFor({ state: 'visible', timeout: 15000 });
    return pageUrl;
  }

  test('watch toggle changes the button state', async ({ page }) => {
    const pageUrl = await createPageWithToolbar(page, 'Watch Toggle Page', 'Watch content');
    if (!pageUrl) return;

    const watchBtn = page.locator('button[title="Watch page for changes"]');
    await expect(watchBtn).toBeVisible({ timeout: 15000 });
    await watchBtn.click();
    await page.waitForTimeout(1200);

    // After watching, the button title flips to Unwatch
    await expect(page.locator('button[title="Unwatch page"]')).toBeVisible({ timeout: 10000 });
  });

  test('pin toggle changes the button state', async ({ page }) => {
    const pageUrl = await createPageWithToolbar(page, 'Pin Toggle Page', 'Pin content');
    if (!pageUrl) return;

    const pinBtn = page.locator('button[title="Pin to top"]');
    await expect(pinBtn).toBeVisible({ timeout: 15000 });
    await pinBtn.click();
    await page.waitForTimeout(1200);

    await expect(page.locator('button[title="Unpin"]')).toBeVisible({ timeout: 10000 });
  });

  test('duplicate creates a copy of the page', async ({ page }) => {
    const pageUrl = await createPageWithToolbar(page, 'Duplicate Source Page', 'Duplicate me');
    if (!pageUrl) return;

    const dupBtn = page.locator('button[title="Duplicate"]');
    await expect(dupBtn).toBeVisible({ timeout: 15000 });
    await dupBtn.click();
    await page.waitForTimeout(2000);

    // Duplicate navigates to the COPY's EDITOR route (/page/{id}/edit) with
    // the title bearing a ' (copy)' suffix (in the editor title input).
    await expect(page).toHaveURL(/\/page\/[a-zA-Z0-9_]+(?:\/edit)?$/, { timeout: 20000 });
    await expect(page.locator('.ProseMirror')).toBeVisible({ timeout: 15000 });
    const titleInput = page.getByPlaceholder('Untitled');
    await expect(titleInput).toHaveValue(/Duplicate Source Page.*copy/i, { timeout: 10000 });
  });

  test('permissions dialog opens and shows the heading', async ({ page }) => {
    const pageUrl = await createPageWithToolbar(page, 'Permissions Page', 'Permission content');
    if (!pageUrl) return;

    const permsBtn = page.locator('button[title="Permissions"]');
    await expect(permsBtn).toBeVisible({ timeout: 15000 });
    await permsBtn.click();
    await page.waitForTimeout(800);

    await expect(page.getByRole('heading', { name: /Page Permissions/i })).toBeVisible({
      timeout: 5000,
    });
  });
});
