import { test, expect } from './fixtures';
import { signInAsAdmin } from './helpers';

/**
 * Notification bell + admin Settings panel E2E tests.
 *
 * The notification bell opens a dropdown (empty state or list). The admin
 * Settings panel contains the language switcher.
 */

test.describe('Notification bell', () => {
  test.beforeEach(async ({ page }) => {
    await signInAsAdmin(page);
    await page.goto('/');
    await page.waitForLoadState('load');
    await page.getByPlaceholder('Search...').waitFor({ state: 'visible', timeout: 20000 });
  });

  test('bell button is visible in the sidebar', async ({ page }) => {
    const bell = page.locator('button[title="Notifications"]');
    await expect(bell).toBeVisible({ timeout: 10000 });
  });

  test('clicking the bell opens the notifications dropdown', async ({ page }) => {
    const bell = page.locator('button[title="Notifications"]');
    await bell.click();
    await page.waitForTimeout(800);

    // Either the empty state or a list with a "Notifications" heading
    const heading = page.getByRole('heading', { name: /Notifications/i });
    await expect(heading).toBeVisible({ timeout: 5000 });
  });
});

test.describe('Admin Settings panel — language switcher', () => {
  test.beforeEach(async ({ page }) => {
    await signInAsAdmin(page);
    await page.goto('/');
    await page.waitForLoadState('load');
  });

  test('Settings tab shows the language switcher', async ({ page }) => {
    await page.locator('aside').getByRole('button', { name: 'Admin' }).click();
    await page.waitForTimeout(1000);

    const settingsTab = page.getByRole('button').filter({ hasText: /^Settings$/ }).first();
    await settingsTab.click();
    await page.waitForTimeout(1000);

    // Language switcher select with aria-label from i18n
    const langSelect = page.locator('select[aria-label]').first();
    await expect(langSelect).toBeVisible({ timeout: 10000 });
    // It offers at least English (options are not 'visible' — assert value)
    const options = await langSelect.locator('option').allTextContents();
    expect(options.some((o) => /English/i.test(o))).toBe(true);
  });
});
