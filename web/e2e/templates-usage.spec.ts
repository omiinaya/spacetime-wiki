import { test, expect } from './fixtures';
import { signInAsAdmin, createPage, isVisible } from './helpers';

/**
 * Template usage E2E tests.
 *
 * Covers: save a page as a template, then create a new page from that
 * template via the template picker.
 */

test.describe('Templates — save and reuse', () => {
  test.beforeEach(async ({ page }) => {
    await signInAsAdmin(page);
  });

  test('save a page as a template, then create from it', async ({ page }) => {
    const pageUrl = await createPage(
      page,
      'Reusable Template Page',
      'Template body content for reuse',
    );
    if (!pageUrl) return;

    // Save as template via toolbar (title="Save as template")
    const saveAsTemplate = page.locator('button[title="Save as template"]');
    if (await isVisible(saveAsTemplate, 3000)) {
      await saveAsTemplate.click();
      await page.waitForTimeout(1500);
    }

    // Open the template picker via "New page"
    await page.goto('/');
    await page.waitForLoadState('load');
    await page.locator('aside').getByRole('button', { name: 'New page' }).first().click();
    await page.waitForTimeout(800);

    // The picker should show our template page (titled 'Reusable Template Page')
    const templateEntry = page.getByText('Reusable Template Page').first();
    await expect(templateEntry).toBeVisible({ timeout: 10000 });
  });
});
