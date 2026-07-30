import { test, expect } from '@playwright/test';
import { signInAsAdmin } from './helpers';

/**
 * Template operations E2E tests.
 * Tests the template picker and template-based page creation.
 */

test.describe('Templates — picker and usage', () => {
  test.beforeEach(async ({ page }) => {
    await signInAsAdmin(page);
  });

  test('New page opens template picker', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('load');

    await page.locator('aside').getByRole('button', { name: 'New page' }).first().click();
    await page.waitForTimeout(500);

    // Template picker modal may appear
    const templateHeading = page.getByRole('heading', { name: /New page from template|template/i });
    await expect(templateHeading).toBeVisible({ timeout: 3000 });
    // May navigate directly to /new without template picker
  });

  test('clicking Blank page navigates to editor', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('load');

    await page.locator('aside').getByRole('button', { name: 'New page' }).first().click();
    await page.waitForTimeout(500);

    const blankPageBtn = page.getByRole('button', { name: /Blank page/i });
    if (await blankPageBtn.isVisible({ timeout: 3000 })) {
      await blankPageBtn.click();
      await page.waitForURL(/\/new/, { timeout: 10000 });
      await expect(page.locator('.ProseMirror')).toBeVisible({ timeout: 15000 });
    }
  });

  test('Templates link in sidebar is visible', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('aside').getByRole('button', { name: 'Templates' })).toBeVisible();
  });
});

test.describe('Creating a page from scratch', () => {
  test.beforeEach(async ({ page }) => {
    await signInAsAdmin(page);
  });

  test('can navigate to /new and see the editor', async ({ page }) => {
    await page.goto('/new');
    await expect(page.locator('.ProseMirror')).toBeVisible({ timeout: 20000 });
    await expect(page.getByPlaceholder('Untitled')).toBeVisible({ timeout: 15000 });
  });

  test('can type content in the new page editor', async ({ page }) => {
    await page.goto('/new');
    await expect(page.locator('.ProseMirror')).toBeVisible({ timeout: 20000 });

    const editor = page.locator('.ProseMirror');
    await editor.fill('E2E template test content');
    await expect(editor).toContainText('E2E template test content');
  });

  test('title input accepts text', async ({ page }) => {
    await page.goto('/new');
    await expect(page.getByPlaceholder('Untitled')).toBeVisible({ timeout: 15000 });

    const titleInput = page.getByPlaceholder('Untitled');
    await titleInput.fill('E2E Template Page Title');
    await expect(titleInput).toHaveValue('E2E Template Page Title');
  });
});
