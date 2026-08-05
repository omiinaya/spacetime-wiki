import { test, expect } from './fixtures';

test.describe('Sidebar navigation', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('load');
    await page.getByPlaceholder('Search...').waitFor({ state: 'visible', timeout: 20000 });
  });

  test('shows sidebar with app title', async ({ page }) => {
    const aside = page.locator('aside');
    await expect(aside.getByText('Spacetime Wiki')).toBeVisible();
  });

  test('sidebar has search input', async ({ page }) => {
    await expect(page.getByPlaceholder('Search...')).toBeVisible();
  });

  test('sidebar has core navigation buttons', async ({ page }) => {
    const aside = page.locator('aside');
    await expect(aside.getByRole('button', { name: 'New page' })).toBeVisible();
    await expect(aside.getByRole('button', { name: 'New collection' })).toBeVisible();
    await expect(aside.getByRole('button', { name: 'Activity' })).toBeVisible();
    await expect(aside.getByRole('button', { name: 'Graph' })).toBeVisible();
    await expect(aside.getByRole('button', { name: 'Trash' })).toBeVisible();
  });

  test('sidebar has Templates button', async ({ page }) => {
    await expect(page.locator('aside').getByRole('button', { name: 'Templates' })).toBeVisible();
  });

  test('sidebar has Admin button', async ({ page }) => {
    await expect(page.locator('aside').getByRole('button', { name: 'Admin' })).toBeVisible();
  });

  test('sidebar has AI Assistant button', async ({ page }) => {
    await expect(page.locator('aside').getByRole('button', { name: 'AI Assistant' })).toBeVisible();
  });

  test('theme toggle and keyboard shortcuts buttons exist', async ({ page }) => {
    await expect(
      page.locator('aside').getByRole('button', { name: /Light mode|Dark mode/i }),
    ).toBeVisible();
    await expect(
      page.locator('aside').getByRole('button', { name: /Keyboard shortcuts/i }),
    ).toBeVisible();
  });

  test('sidebar shows Sign in button', async ({ page }) => {
    await expect(page.locator('aside').getByRole('button', { name: 'Sign in' })).toBeVisible();
  });

  test('clicking Activity navigates to /activity', async ({ page }) => {
    await page.locator('aside').getByRole('button', { name: 'Activity' }).click();
    await expect(page).toHaveURL(/\/activity/);
    await expect(page.getByRole('heading', { name: 'Activity' })).toBeVisible({ timeout: 10000 });
  });

  test('clicking Graph navigates to /graph', async ({ page }) => {
    await page.locator('aside').getByRole('button', { name: 'Graph' }).click();
    await expect(page).toHaveURL(/\/graph/);
    await expect(page.getByText('Graph').first()).toBeVisible({ timeout: 10000 });
  });

  test('clicking Trash navigates to /trash', async ({ page }) => {
    await page.locator('aside').getByRole('button', { name: 'Trash' }).click();
    await expect(page).toHaveURL(/\/trash/);
  });

  test('clicking Admin renders admin panels', async ({ page }) => {
    await page.locator('aside').getByRole('button', { name: 'Admin' }).click();
    await expect(page).toHaveURL(/\/admin/);
    await expect(page.getByText('Admin').first()).toBeVisible({ timeout: 10000 });
  });

  test('clicking AI Assistant opens the assistant panel', async ({ page }) => {
    await page.locator('aside').getByRole('button', { name: 'AI Assistant' }).click();
    await expect(page.getByText('AI Assistant').first()).toBeVisible({ timeout: 5000 });
  });

  test('theme toggle toggles between light and dark mode', async ({ page }) => {
    const themeButton = page
      .locator('aside')
      .getByRole('button', { name: /Light mode|Dark mode/i });

    // The button has no aria-label/title — its accessible name comes from its
    // text content ("Light mode" / "Dark mode"). Read that instead, which is
    // consistent across chromium/firefox/webkit.
    const initialLabel =
      ((await themeButton.textContent()) || '').trim();
    expect(initialLabel).toMatch(/Light mode|Dark mode/i);

    await themeButton.click();
    await page.waitForTimeout(500);

    // Button label should flip to the opposite theme.
    const newLabel =
      ((await themeButton.textContent()) || '').trim();
    expect(newLabel).not.toBe(initialLabel);
    expect(newLabel).toMatch(/Light mode|Dark mode/i);
  });

  test('keyboard shortcuts button opens modal', async ({ page }) => {
    await page
      .locator('aside')
      .getByRole('button', { name: /Keyboard shortcuts/i })
      .click();
    await expect(page.getByRole('heading', { name: 'Keyboard Shortcuts' })).toBeVisible({
      timeout: 5000,
    });
  });
});

test.describe('Import buttons', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('load');
  });

  test('sidebar has Import buttons', async ({ page }) => {
    const aside = page.locator('aside');
    // These may be in a submenu or dropdown — check loosely. Combine the
    // locators so Playwright waits once for ANY of them instead of running
    // three sequential 2s timeouts (which raced under load).
    const anyImport = aside
      .getByRole('button', { name: /Import.*MD|Import.*Markdown/i })
      .or(aside.getByRole('button', { name: /Import.*Wiki/i }))
      .or(aside.getByRole('button', { name: /Import.*Confluence/i }));
    await expect(anyImport.first()).toBeVisible({ timeout: 10000 });
  });
});
