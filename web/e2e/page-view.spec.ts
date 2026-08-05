import { test, expect } from './fixtures';

/**
 * Page view tests — work with any DB state (fresh or seeded).
 * Navigate from home to the first available page, then verify structure.
 */
test.describe('Page view', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('load');
    // Wait for the app shell, then navigate to the first available page or
    // create one. Guest home may show the landing on a fresh DB — wait longer
    // for the 'Updated' recent-pages buttons under accumulated data.
    await page.getByPlaceholder('Search...').waitFor({ state: 'visible', timeout: 20000 });
    const firstPage = page
      .locator('main button')
      .filter({ hasText: /Updated/ })
      .first();
    await expect(firstPage).toBeVisible({ timeout: 15000 });
    await firstPage.click();
    await expect(page).toHaveURL(/\/page\/[a-zA-Z0-9_]+/);
    await expect(page.locator('main')).toBeVisible({ timeout: 10000 });
  });

  test('main content renders', async ({ page }) => {
    await expect(page.locator('main')).toBeVisible({ timeout: 5000 });
  });

  test('shows Edit button in page toolbar', async ({ page }) => {
    const editBtn = page.locator('button[title="Edit"]');
    await expect(editBtn).toBeVisible({ timeout: 3000 });
  });

  test('shows toolbar buttons', async ({ page }) => {
    const toolbarButtons = [
      'button[title="Edit"]',
      'button[title="History"]',
      'button[title="Share"]',
      'button[title="Duplicate"]',
      'button[title="Export"]',
    ];

    for (const selector of toolbarButtons) {
      const btn = page.locator(selector);
      await expect(btn).toBeVisible({ timeout: 10000 });
    }
  });

  test('shows metadata (word count or reading time)', async ({ page }) => {
    const wordCount = page.getByText(/words?/i);
    const readTime = page.getByText(/min read/i);
    await expect(wordCount.or(readTime).first()).toBeVisible({ timeout: 3000 });
  });

  test('clicking Edit navigates to editor', async ({ page }) => {
    const editBtn = page.locator('button[title="Edit"]');
    await expect(editBtn).toBeVisible({ timeout: 3000 });
    await editBtn.click();
    await expect(page).toHaveURL(/\/edit/);
  });
});

test.describe('Page view — page not found', () => {
  test('shows page not found for nonexistent page', async ({ page }) => {
    await page.goto('/page/nonexistent_page_xyz');
    await expect(page.getByText(/Page not found|Not found|404/).first()).toBeVisible({
      timeout: 10000,
    });
  });

  test('shows go home link on error', async ({ page }) => {
    await page.goto('/page/nonexistent_page_xyz');
    await expect(page.getByText(/Go home|Back to home|Home/).first()).toBeVisible({
      timeout: 10000,
    });
  });
});
