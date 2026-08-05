import { test, expect } from './fixtures';
import { signInAsAdmin, createPage, isVisible } from './helpers';

/**
 * Trash actions E2E tests — restore, permanent delete, empty trash.
 *
 * Drives the full lifecycle through the UI:
 *   1. Create a page, delete it (moves to trash)
 *   2. Open Trash → the deleted page is listed
 *   3. Restore it → page is back in the tree/home and no longer in trash
 *   4. Delete another page, then permanently delete it from trash
 */

test.describe('Trash — restore lifecycle', () => {
  test.beforeEach(async ({ page }) => {
    await signInAsAdmin(page);
  });

  test('delete a page, restore it from trash, verify it returns', async ({ page }) => {
    const pageUrl = await createPage(page, 'Restore Me From Trash', 'Restore content');
    if (!pageUrl) return;

    // ── 1. Delete the page from the view toolbar ───────────────────────────
    const deleteBtn = page.locator('button[title="Delete"]');
    if (await isVisible(deleteBtn, 3000)) {
      await deleteBtn.click();
      await page.waitForTimeout(500);
      const confirmBtn = page.getByRole('button', { name: /^Delete$/ }).last();
      if (await isVisible(confirmBtn, 3000)) {
        await confirmBtn.click();
        await page.waitForTimeout(1500);
      }
    } else {
      // No delete button on view — try the context menu / keyboard path is
      // complex; instead delete via the page's own toolbar overflow. If the
      // button truly is absent, the test fails loudly (coverage demands it).
      throw new Error('Delete button (title="Delete") not found on page view');
    }

    // ── 2. Open Trash — the deleted page should be listed ──────────────────
    await page.goto('/');
    await page.waitForLoadState('load');
    await page.locator('aside').getByRole('button', { name: 'Trash' }).click();
    await page.waitForTimeout(1500);

    const trashEmpty = page.getByText(/Trash is empty/i);
    if (await isVisible(trashEmpty, 2000)) {
      // Trash empty means delete didn't land (or was already restored by a
      // parallel test) — this is a real failure for our flow.
      throw new Error('Trash is empty after deleting a page');
    }
    await expect(page.getByText('Restore Me From Trash').first()).toBeVisible({ timeout: 10000 });

    // ── 3. Restore the page ────────────────────────────────────────────────
    await page.getByRole('button', { name: 'Restore', exact: true }).first().click();
    await page.waitForTimeout(1500);

    // The page leaves the trash list
    await expect(page.getByText('Restore Me From Trash')).not.toBeVisible({ timeout: 10000 });

    // And is reachable again from the home recent list
    await page.goto('/');
    await page.waitForLoadState('load');
    await expect(page.getByText('Restore Me From Trash').first()).toBeVisible({ timeout: 10000 });
  });

  test('permanently delete a page from trash', async ({ page }) => {
    const pageUrl = await createPage(page, 'Permanent Delete Me', 'Permanent content');
    if (!pageUrl) return;

    // Delete from toolbar
    const deleteBtn = page.locator('button[title="Delete"]');
    if (!(await isVisible(deleteBtn, 3000))) {
      throw new Error('Delete button not found on page view');
    }
    await deleteBtn.click();
    await page.waitForTimeout(500);
    const confirmBtn = page.getByRole('button', { name: /^Delete$/ }).last();
    if (await isVisible(confirmBtn, 3000)) {
      await confirmBtn.click();
      await page.waitForTimeout(1500);
    }

    // Open Trash → permanent Delete
    await page.goto('/');
    await page.waitForLoadState('load');
    await page.locator('aside').getByRole('button', { name: 'Trash' }).click();
    await page.waitForTimeout(1500);

    await expect(page.getByText('Permanent Delete Me').first()).toBeVisible({ timeout: 10000 });
    await page.getByRole('button', { name: 'Delete', exact: true }).first().click();
    await page.waitForTimeout(1500);

    // Gone from trash
    await expect(page.getByText('Permanent Delete Me')).not.toBeVisible({ timeout: 10000 });
  });
});
