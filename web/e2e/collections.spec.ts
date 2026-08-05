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
    // Collection tree buttons render inside the <nav> landmark. Match ANY
    // collection row (icon + name) — seed names can be renamed by other
    // specs. Use .first() to avoid strict-mode violations.
    const nav = page.getByRole('navigation');
    const collectionBtn = nav
      .locator('button')
      .filter({ hasText: /[📁📄🗂️📂]/ })
      .first();
    await expect(collectionBtn).toBeVisible({ timeout: 10000 });
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
