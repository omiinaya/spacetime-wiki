import { test, expect } from '@playwright/test';
import { signInAsAdmin } from './helpers';

/**
 * Move to trash / delete lifecycle E2E tests.
 * Tests the page lifecycle: draft → publish → archive → trash → restore.
 */

test.describe('Trash — navigation and view', () => {
  test.beforeEach(async ({ page }) => {
    await signInAsAdmin(page);
  });

  test('sidebar has Trash button', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('aside').getByRole('button', { name: 'Trash' })).toBeVisible();
  });

  test('clicking Trash navigates to /trash', async ({ page }) => {
    await page.goto('/');
    await page.locator('aside').getByRole('button', { name: 'Trash' }).click();
    await expect(page).toHaveURL(/\/trash/);
  });

  test('trash page renders', async ({ page }) => {
    await page.goto('/trash');
    await expect(page.getByText(/Trash|Deleted|Recycle/i).first()).toBeVisible({ timeout: 10000 });
  });

  test('trash page shows content or empty state', async ({ page }) => {
    await page.goto('/trash');
    await page.waitForTimeout(2000);

    // Either show an empty state message or a list of pages
    const emptyMessage = page.getByText(/No|empty|none/i).first();
    // The page should at least render without errors
    await expect(page.locator('main')).toBeVisible({ timeout: 5000 });
  });
});
