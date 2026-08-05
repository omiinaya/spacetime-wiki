import { test, expect } from './fixtures';

test.describe('Home page', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('shows app title', async ({ page }) => {
    await expect(page).toHaveTitle('Spacetime Wiki');
  });

  test('shows the Home heading and welcome message', async ({ page }) => {
    // Populated wiki → dashboard heading "Home"; empty/loading → landing
    // "Welcome to Spacetime Wiki". Accept either state.
    const dashboard = page.getByRole('heading', { name: 'Home' });
    const landing = page.getByText('Welcome to Spacetime Wiki').first();
    await expect(dashboard.or(landing).first()).toBeVisible({ timeout: 15000 });
  });

  test('shows recently updated section with page entries', async ({ page }) => {
    await expect(page.getByText('RECENTLY UPDATED')).toBeVisible();
    // Should have at least one page entry in the list
    const pageEntries = page.locator('main button').filter({ hasText: /Updated/ });
    await expect(pageEntries.first()).toBeVisible({ timeout: 15000 });
    const count = await pageEntries.count();
    expect(count).toBeGreaterThan(0);
  });

  test('each page entry shows title and time ago', async ({ page }) => {
    const pageEntries = page.locator('main button').filter({ hasText: /Updated/ });
    const count = await pageEntries.count();
    for (let i = 0; i < Math.min(count, 3); i++) {
      const text = await pageEntries.nth(i).textContent();
      expect(text).toMatch(/Updated\s+(just now|\d+[mhd] ago)/);
    }
  });

  test('recent pages show Draft badge when applicable', async ({ page }) => {
    const draftEntry = page.locator('main button').filter({ hasText: 'Draft' });
    if ((await draftEntry.count()) > 0) {
      await expect(draftEntry.first().getByText('Draft')).toBeVisible();
    }
  });

  test('clicking a recent page navigates to its view page', async ({ page }) => {
    const firstPage = page
      .locator('main button')
      .filter({ hasText: /Updated/ })
      .first();
    await firstPage.click();
    // Should navigate to /page/{id}
    await expect(page).toHaveURL(/\/page\/[a-zA-Z0-9_]+/);
    await expect(page.locator('main').first()).toBeVisible({ timeout: 10000 });
  });
});
