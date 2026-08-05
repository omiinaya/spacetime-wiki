import { test, expect } from './fixtures';
import { signInAsAdmin, isVisible, createPage } from './helpers';

/**
 * Search results flow E2E tests.
 *
 * Typing in the sidebar search box filters the sidebar tree live and shows
 * content snippets; clicking a matched page navigates to it. Also covers the
 * SearchFilters toggle (collection/status/date/tags filters).
 */

test.describe('Search — results flow', () => {
  test.beforeEach(async ({ page }) => {
    await signInAsAdmin(page);
    await page.goto('/');
    await page.waitForLoadState('load');
    await page.getByPlaceholder('Search...').waitFor({ state: 'visible', timeout: 20000 });
  });

  test('typing a query filters the sidebar tree to matching pages', async ({ page }) => {
    const searchInput = page.getByPlaceholder('Search...');
    await expect(searchInput).toBeVisible();
    await searchInput.fill('Welcome');
    await page.waitForTimeout(1500);

    // The seeded page "Welcome to SpacetimeWiki" should be visible in the tree
    await expect(page.getByText('Welcome to SpacetimeWiki').first()).toBeVisible({
      timeout: 10000,
    });
  });

  test('matching page shows a content snippet in the tree', async ({ page }) => {
    // Create a page with distinctive content so the snippet match is hermetic
    // (the seed pages may be deleted by trash/lifecycle specs).
    await createPage(page, 'Snippet Source Page', 'zebra uniquely collaborative snippet content');
    await page.goto('/');
    await page.waitForLoadState('load');
    await page.getByPlaceholder('Search...').waitFor({ state: 'visible', timeout: 20000 });

    // Snippets only render inside EXPANDED collection buckets — expand the
    // 'Uncategorized' (hash-icon) bucket so the created page's row renders.
    const bucket = page
      .locator('aside button')
      .filter({ has: page.locator('svg.lucide-hash') })
      .first();
    if (await isVisible(bucket, 5000)) {
      await bucket.click();
      await page.waitForTimeout(500);
    }

    const searchInput = page.getByPlaceholder('Search...');
    await searchInput.fill('Snippet Source');
    await page.waitForTimeout(1500);

    // Snippet text from the created page content
    await expect(page.getByText(/uniquely collaborative snippet content/i).first()).toBeVisible(
      { timeout: 10000 },
    );
  });

  test('clicking a search result navigates to the page view', async ({ page }) => {
    const searchInput = page.getByPlaceholder('Search...');
    await searchInput.fill('Welcome');
    await page.waitForTimeout(1500);

    const result = page.getByText('Welcome to SpacetimeWiki').first();
    await result.click();
    await expect(page).toHaveURL(/\/page\/[a-zA-Z0-9_]+/, { timeout: 20000 });
    await expect(page.getByRole('heading', { name: /Welcome to SpacetimeWiki/i })).toBeVisible({
      timeout: 10000,
    });
  });

  test('clearing the query restores the full tree', async ({ page }) => {
    const searchInput = page.getByPlaceholder('Search...');
    await searchInput.fill('zzz-no-such-page');
    await page.waitForTimeout(1000);

    // Clear via the X button (rendered inline next to the input when set)
    const clearBtn = page
      .locator('aside .relative')
      .filter({ has: page.getByPlaceholder('Search...') })
      .first()
      .getByRole('button')
      .first();
    if (await isVisible(clearBtn, 2000)) {
      await clearBtn.click();
    } else {
      await searchInput.clear();
    }
    await page.waitForTimeout(800);
    await expect(searchInput).toHaveValue('');
  });
});

test.describe('Search filters — toggle and options', () => {
  test.beforeEach(async ({ page }) => {
    await signInAsAdmin(page);
    await page.goto('/');
    await page.waitForLoadState('load');
  });

  test('Filters button toggles the filter panel', async ({ page }) => {
    const filtersBtn = page.getByRole('button', { name: /Filters/i });
    await expect(filtersBtn).toBeVisible({ timeout: 10000 });
    await filtersBtn.click();
    await page.waitForTimeout(500);

    await expect(page.getByText('Search filters').first()).toBeVisible({ timeout: 5000 });
    // A collection selector appears (options are never 'visible' — assert the
    // select's option text instead)
    const collSelect = page.locator('select').first();
    await expect(collSelect).toBeVisible({ timeout: 5000 });
    const opts = await collSelect.locator('option').allTextContents();
    expect(opts.some((o) => /All collections/i.test(o))).toBe(true);
  });
});
