import { test, expect } from './fixtures';
import { signInAsAdmin } from './helpers';

test.describe('Collections — sidebar', () => {
  test.beforeEach(async ({ page }) => {
    // Collections render in the sidebar for authenticated users; guest mode
    // shows the landing page without the sidebar tree.
    await signInAsAdmin(page);
    await page.getByPlaceholder('Search...').waitFor({ state: 'visible', timeout: 20000 });
  });

  test('shows collections section in sidebar', async ({ page }) => {
    const sidebar = page.getByRole('complementary');
    // May show collections or an empty state
    const collectionBtn = sidebar
      .locator('button')
      .filter({ hasText: /Uncategorized|Engineering|Design/ });
    await expect(collectionBtn.first()).toBeVisible({ timeout: 5000 });
    // Collections may not exist yet - soft check
  });

  test('shows New collection button in sidebar', async ({ page }) => {
    await expect(page.getByRole('button', { name: 'New collection' })).toBeVisible();
  });

  test('clicking New collection opens dialog', async ({ page }) => {
    await page.getByRole('button', { name: 'New collection' }).click();
    // Dialog/modal should open
    await expect(page.getByRole('heading', { name: 'New collection' })).toBeVisible({
      timeout: 5000,
    });
  });
});
