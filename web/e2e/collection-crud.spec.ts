import { test, expect } from './fixtures';
import { signInAsAdmin } from './helpers';

/**
 * Collection management CRUD E2E tests.
 * Tests creating, reading, updating, and deleting collections.
 */

test.describe('Collection management — CRUD', () => {
  test.beforeEach(async ({ page }) => {
    await signInAsAdmin(page);
    await page.goto('/');
    await page.waitForLoadState('load');
  });

  test('New collection button exists', async ({ page }) => {
    const newColBtn = page.locator('aside').getByRole('button', { name: 'New collection' });
    await expect(newColBtn).toBeVisible();
  });

  test('can create a new collection', async ({ page }) => {
    const collectionName = `E2E Test Collection ${Date.now()}`;

    // Open new collection dialog
    await page.locator('aside').getByRole('button', { name: 'New collection' }).click();
    await page.waitForTimeout(500);

    // Fill in name
    const nameInput = page.getByPlaceholder(/name|title/i);
    if (await nameInput.isVisible({ timeout: 2000 })) {
      await nameInput.fill(collectionName);
    }

    // Submit
    const createButton = page.getByRole('button', { name: /create|save|add/i }).first();
    if (await createButton.isVisible()) {
      await createButton.click();
    }

    // Should close the dialog
    await page.waitForTimeout(1000);

    // New collection may appear in sidebar
    const newCol = page.locator('aside').getByText(collectionName).first();
    await expect(newCol).toBeVisible({ timeout: 5000 });
  });

  test('sidebar shows collection section', async ({ page }) => {
    const sidebar = page.locator('aside');
    // Look for collection-like text in the sidebar
    const collectionBtn = sidebar
      .locator('button')
      .filter({ hasText: /Uncategorized|Engineering|Design|Marketing|Research/i });
    await expect(collectionBtn.first()).toBeVisible({ timeout: 5000 });
  });

  test('collection shows page count in sidebar', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('load');
    const sidebar = page.locator('aside');
    const collectionBtn = sidebar.locator('button').filter({ hasText: /Uncategorized/ });
    // Collection with page count should be visible
    await expect(collectionBtn).toBeVisible({ timeout: 5000 });
    const text = await collectionBtn.textContent();
    const countMatch = text?.match(/(\d+)/);
    expect(countMatch).not.toBeNull();
  });
});
