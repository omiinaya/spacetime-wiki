import { test, expect } from './fixtures';
import { signInAsAdmin } from './helpers';

/**
 * Command palette E2E tests.
 *
 * The palette opens via Cmd/Ctrl+K and lets the user search pages,
 * collections, and actions.
 */

test.describe('Command palette', () => {
  test.beforeEach(async ({ page }) => {
    await signInAsAdmin(page);
    await page.goto('/');
    await page.waitForLoadState('load');
    // Wait for React to mount + attach the keydown listener (Ctrl+K handler
    // lives in useAppLayout's useEffect). The sidebar search input proves the
    // app is interactive; pressing Ctrl+K before this races the effect.
    await expect(page.getByPlaceholder('Search...')).toBeVisible({ timeout: 15000 });
  });

  test('opens with Ctrl+K and shows the search input', async ({ page }) => {
    await page.keyboard.press('Control+k');
    await page.waitForTimeout(800);

    const paletteInput = page.getByPlaceholder(/Search pages, collections, or actions/i);
    await expect(paletteInput).toBeVisible({ timeout: 10000 });
  });

  test('typing in the palette filters results', async ({ page }) => {
    await page.keyboard.press('Control+k');
    await page.waitForTimeout(800);

    const paletteInput = page.getByPlaceholder(/Search pages, collections, or actions/i);
    await paletteInput.fill('Welcome');
    await page.waitForTimeout(1200);

    // Seeded page should be offered as a result
    await expect(page.getByText('Welcome to SpacetimeWiki').first()).toBeVisible({
      timeout: 10000,
    });
  });

  test('selecting a page result navigates to it', async ({ page }) => {
    await page.keyboard.press('Control+k');
    await page.waitForTimeout(800);

    const paletteInput = page.getByPlaceholder(/Search pages, collections, or actions/i);
    await paletteInput.fill('Welcome');
    await page.waitForTimeout(1200);

    const result = page.getByText('Welcome to SpacetimeWiki').first();
    await result.click();
    await page.waitForTimeout(1200);

    await expect(page).toHaveURL(/\/page\/[a-zA-Z0-9_]+/, { timeout: 20000 });
    await expect(page.getByRole('heading', { name: /Welcome to SpacetimeWiki/i })).toBeVisible({
      timeout: 10000,
    });
  });

  test('closes palette with Escape', async ({ page }) => {
    await page.keyboard.press('Control+k');
    await page.waitForTimeout(800);
    const paletteInput = page.getByPlaceholder(/Search pages, collections, or actions/i);
    await expect(paletteInput).toBeVisible({ timeout: 5000 });

    await page.keyboard.press('Escape');
    await page.waitForTimeout(500);
    await expect(paletteInput).not.toBeVisible();
  });
});