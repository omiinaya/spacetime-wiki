import { test, expect } from './fixtures';
import { signInAsAdmin, createPage } from './helpers';

/**
 * Slug + permalink route E2E tests.
 *
 * Covers:
 *   - /p/:slug — SlugView resolves a page by its slug and redirects
 *   - /permalink/:id — PermalinkRedirect resolves by page id and redirects
 *   - Error surfaces: missing page shows "Page not found"
 */

test.describe('Slug route — /p/:slug', () => {
  test.beforeEach(async ({ page }) => {
    await signInAsAdmin(page);
  });

  test('slug of an existing page redirects to its view', async ({ page }) => {
    const pageUrl = await createPage(page, 'Slug Redirect Target', 'Content for slug redirect');
    if (!pageUrl) return;

    // Navigate to the slug route. The page view URL is /page/{id}; the slug
    // route resolves the id → /page/{id} redirect.
    await page.goto('/p/slug-redirect-target');
    await page.waitForLoadState('load');

    // SlugView resolves the page id then redirects to /page/{id}
    await expect(page).toHaveURL(/\/page\/[a-zA-Z0-9_]+/, { timeout: 20000 });
    await expect(page.getByRole('heading', { name: /Slug Redirect Target/i })).toBeVisible({
      timeout: 10000,
    });
  });

  test('slug of a missing page shows Page not found', async ({ page }) => {
    await page.goto('/p/this-slug-does-not-exist-xyz');
    await page.waitForLoadState('load');

    await expect(page.getByText('Page not found')).toBeVisible({ timeout: 10000 });
  });
});

test.describe('Permalink route — /permalink/:id', () => {
  test.beforeEach(async ({ page }) => {
    await signInAsAdmin(page);
  });

  test('permalink of an existing page redirects to its view', async ({ page }) => {
    const pageUrl = await createPage(page, 'Permalink Target', 'Content for permalink');
    if (!pageUrl) return;

    const id = pageUrl.split('/page/')[1];
    await page.goto(`/permalink/${id}`);
    await page.waitForLoadState('load');

    await expect(page).toHaveURL(new RegExp(`/page/${id}`), { timeout: 20000 });
    await expect(page.getByRole('heading', { name: /Permalink Target/i })).toBeVisible({
      timeout: 10000,
    });
  });

  test('permalink of a missing page shows Page not found', async ({ page }) => {
    await page.goto('/permalink/nonexistent_page_123');
    await page.waitForLoadState('load');

    await expect(page.getByText('Page not found')).toBeVisible({ timeout: 10000 });
  });
});
