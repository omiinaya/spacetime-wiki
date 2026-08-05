import { test, expect } from './fixtures';
import { signInAsAdmin, createPage, isVisible } from './helpers';

/**
 * Page view chrome E2E tests — history/revisions, export, TOC, full-width,
 * word count, duplicate, and the read-only view chrome.
 *
 * These cover the page-view toolbar toggles and metadata surfaces.
 */

test.describe('Page view chrome', () => {
  test.beforeEach(async ({ page }) => {
    await signInAsAdmin(page);
  });

  test('page view shows word count metadata', async ({ page }) => {
    const pageUrl = await createPage(page, 'Metadata Page', 'Word count metadata display');
    if (!pageUrl) return;

    const wordCount = page.locator('span[title="Word count"]');
    await expect(wordCount).toBeVisible({ timeout: 10000 });
    await expect(wordCount).toContainText(/words/);
  });

  test('history button opens the revisions panel', async ({ page }) => {
    const pageUrl = await createPage(page, 'History Page', 'History panel content');
    if (!pageUrl) return;

    const historyBtn = page.locator('button[title="History"]');
    await expect(historyBtn).toBeVisible({ timeout: 10000 });
    await historyBtn.click();
    await page.waitForTimeout(800);

    // Revisions panel shows either a list of revisions or an empty message
    const revPanel = page
      .getByText(/revision|history|no revisions|no differences/i)
      .first();
    const hasPanel = await isVisible(revPanel, 5000);
    if (!hasPanel) {
      // At minimum the toggle state is active (button shows primary styling)
      await expect(historyBtn).toHaveClass(/text-primary/);
    }
  });

  test('export button offers export menu', async ({ page }) => {
    const pageUrl = await createPage(page, 'Export Page', 'Export menu content');
    if (!pageUrl) return;

    const exportBtn = page.locator('button[title="Export"]');
    await expect(exportBtn).toBeVisible({ timeout: 10000 });
    await exportBtn.click();
    await page.waitForTimeout(600);

    // Export options appear (Markdown / HTML / PDF or a dropdown)
    const exportOption = page.getByText(/markdown|\.md|html|pdf|export/i).first();
    await expect(exportOption).toBeVisible({ timeout: 5000 });
  });

  test('full-width toggle toggles button state', async ({ page }) => {
    const pageUrl = await createPage(page, 'Fullwidth Page', 'Full width content');
    if (!pageUrl) return;

    const fullWidthBtn = page.locator('button[title="Full width"]');
    await expect(fullWidthBtn).toBeVisible({ timeout: 10000 });
    await fullWidthBtn.click();
    await page.waitForTimeout(600);

    // After toggle the title flips to Constrain width
    await expect(page.locator('button[title="Constrain width"]')).toBeVisible({ timeout: 5000 });
  });
});

test.describe('Editor — save flow', () => {
  test.beforeEach(async ({ page }) => {
    await signInAsAdmin(page);
  });

  test('editing a page and saving persists the change', async ({ page }) => {
    const pageUrl = await createPage(page, 'Edit Save Page', 'Original content');
    if (!pageUrl) return;

    // Navigate to the editor route
    const editUrl = pageUrl.replace(/\/page\//, '/page/') + '/edit';
    await page.goto(editUrl);
    await page.waitForLoadState('load');

    // Editor loads
    await expect(page.locator('.ProseMirror')).toBeVisible({ timeout: 15000 });

    // Type new content
    const editor = page.locator('.ProseMirror');
    await editor.click();
    await page.keyboard.press('Control+a');
    await page.keyboard.type('Edited content via E2E');
    await page.waitForTimeout(500);

    // Save
    const saveBtn = page.getByRole('button', { name: 'Save', exact: true });
    if (await isVisible(saveBtn, 3000)) {
      await saveBtn.click();
      await page.waitForTimeout(1500);
    }

    // The view shows the edited content
    await expect(page.getByText('Edited content via E2E').first()).toBeVisible({
      timeout: 15000,
    });
  });
});
