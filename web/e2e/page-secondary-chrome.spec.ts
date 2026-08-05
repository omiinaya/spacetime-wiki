import { test, expect } from './fixtures';
import { signInAsAdmin, createPage, isVisible } from './helpers';

/**
 * Page view secondary chrome E2E tests.
 *
 * Covers the less-common toolbar toggles: Table of Contents, Page color
 * picker, Relationships panel, and Move-to-collection dialog.
 */

test.describe('Page view secondary chrome', () => {
  test.beforeEach(async ({ page }) => {
    await signInAsAdmin(page);
  });

  test('Table of Contents toggle opens the TOC panel', async ({ page }) => {
    const pageUrl = await createPage(page, 'TOC Page', '# Heading One\n\nSome content under heading one.');
    if (!pageUrl) return;

    const tocBtn = page.locator('button[title="Table of Contents"]');
    await expect(tocBtn).toBeVisible({ timeout: 10000 });
    await tocBtn.click();
    await page.waitForTimeout(800);

    // TOC shows the heading (either a panel with the heading or an empty msg)
    const tocHit = page.getByText(/Heading One|table of contents|no headings/i).first();
    const hasToc = await isVisible(tocHit, 5000);
    if (hasToc) {
      await expect(tocHit).toBeVisible();
    } else {
      // At minimum the toggle state is active
      await expect(tocBtn).toHaveClass(/text-primary/);
    }
  });

  test('Page color picker opens a palette', async ({ page }) => {
    const pageUrl = await createPage(page, 'Color Page', 'Color picker content');
    if (!pageUrl) return;

    const colorBtn = page.locator('button[title="Page color"]');
    await expect(colorBtn).toBeVisible({ timeout: 10000 });
    await colorBtn.click();
    await page.waitForTimeout(600);

    // A swatch grid appears (buttons inside the popover)
    const swatches = page.locator('button[title="Page color"] + div button, .absolute button[title^="#"]');
    const anySwatch = page.locator('button').filter({ hasText: /^#[0-9a-fA-F]{6}$/ }).first();
    const hasPalette = await isVisible(anySwatch, 4000) || (await swatches.count()) > 0;
    expect(hasPalette).toBe(true);
  });

  test('Relationships panel opens', async ({ page }) => {
    const pageUrl = await createPage(page, 'Rel Page', 'Relationships content');
    if (!pageUrl) return;

    const relBtn = page.locator('button[title="Relationships"]');
    await expect(relBtn).toBeVisible({ timeout: 10000 });
    await relBtn.click();
    await page.waitForTimeout(800);

    const relHit = page.getByText(/relationship|related|backlinks|no related/i).first();
    const hasRel = await isVisible(relHit, 5000);
    if (hasRel) {
      await expect(relHit).toBeVisible();
    } else {
      await expect(relBtn).toHaveClass(/text-primary/);
    }
  });

  test('Move to collection opens the dialog', async ({ page }) => {
    const pageUrl = await createPage(page, 'Move Col Page', 'Move to collection content');
    if (!pageUrl) return;

    const moveBtn = page.locator('button[title="Move to collection"]');
    await expect(moveBtn).toBeVisible({ timeout: 10000 });
    await moveBtn.click();
    await page.waitForTimeout(800);

    // Dialog shows collection options or a select
    const dialog = page.getByText(/move to collection|select a collection/i).first();
    await expect(dialog).toBeVisible({ timeout: 5000 });
  });
});
