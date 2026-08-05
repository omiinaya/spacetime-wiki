import { test, expect } from './fixtures';
import { signInAsAdmin, createPage } from './helpers';

/**
 * Page tags E2E tests.
 *
 * Tag editing lives in the EDITOR (page view renders tags read-only, and
 * the tag input only appears when editing an existing page: !isNew &&
 * !preview). These tests drive the editor tag input directly.
 */

async function openEditorWithTags(page: import('@playwright/test').Page): Promise<void> {
  const pageUrl = await createPage(page, 'Tag Editor Page', 'Tag editor content');
  if (!pageUrl) return;
  // Navigate to the edit route (tag input renders for existing pages)
  await page.goto(`${pageUrl}/edit`);
  await page.waitForLoadState('load');
  // Editor loads
  await expect(page.locator('.ProseMirror')).toBeVisible({ timeout: 20000 });
  // Tag input: placeholder is 'Add tags...' when no tags, '+ tag' otherwise
  await expect(page.getByPlaceholder(/Add tags|tag/i).first()).toBeVisible({ timeout: 10000 });
}

test.describe('Page tags', () => {
  test.beforeEach(async ({ page }) => {
    await signInAsAdmin(page);
  });

  test('adds a tag to a page', async ({ page }) => {
    await openEditorWithTags(page);

    const tagInput = page.getByPlaceholder(/Add tags|tag/i).first();
    await tagInput.fill('e2e-tag');
    await tagInput.press('Enter');
    await page.waitForTimeout(1200);

    await expect(page.getByText('e2e-tag').first()).toBeVisible({ timeout: 8000 });
  });

  test('removes a tag from a page', async ({ page }) => {
    await openEditorWithTags(page);

    // Add a tag first
    const tagInput = page.getByPlaceholder(/Add tags|tag/i).first();
    await tagInput.fill('remove-me-tag');
    await tagInput.press('Enter');
    await page.waitForTimeout(1200);
    await expect(page.getByText('remove-me-tag').first()).toBeVisible({ timeout: 8000 });

    // Remove via the tag chip's × button — scope to the chip row (the span
    // containing the tag text) to avoid matching the sidebar Close button.
    const chip = page.locator('span', { hasText: 'remove-me-tag' }).first();
    await expect(chip).toBeVisible({ timeout: 5000 });
    const removeBtn = chip.locator('button').first();
    await removeBtn.click();

    // Auto-retrying: the tag chip disappears after the STDB round trip.
    await expect(page.locator('span', { hasText: 'remove-me-tag' })).not.toBeVisible({
      timeout: 10000,
    });
  });
});
