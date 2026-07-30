import { test, expect } from '@playwright/test';

/**
 * Search E2E tests.
 * Tests that the sidebar search input works correctly.
 */

test.describe('Search — sidebar search bar', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('load');
  });

  test('shows search input in sidebar', async ({ page }) => {
    await expect(page.getByPlaceholder('Search...')).toBeVisible();
  });

  test('typing in search shows the text', async ({ page }) => {
    const searchInput = page.getByPlaceholder('Search...');
    await searchInput.fill('E2E');
    await page.waitForTimeout(500);
    await expect(searchInput).toHaveValue('E2E');
  });

  test('search input accepts text and shows it', async ({ page }) => {
    const searchInput = page.getByPlaceholder('Search...');
    await searchInput.fill('architecture');
    await expect(searchInput).toHaveValue('architecture');
  });

  test('can clear search input', async ({ page }) => {
    const searchInput = page.getByPlaceholder('Search...');
    await searchInput.fill('E2E');
    await page.waitForTimeout(500);
    await searchInput.clear();
    await page.waitForTimeout(500);
    await expect(searchInput).toHaveValue('');
  });
});
