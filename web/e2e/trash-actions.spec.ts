import { test, expect } from './fixtures';
import { signInAsAdmin, createPage, isVisible } from './helpers';

/**
 * Trash actions E2E tests — restore, permanent delete.
 *
 * The real delete flow: page → Archive (status banner) → archived banner
 * shows the Delete (trash) button → confirm → page moves to trash.
 * Then Trash dialog: Restore brings it back; Delete removes it forever.
 */

/** Archive then delete the current page via the UI. */
async function deleteCurrentPage(page: import('@playwright/test').Page): Promise<void> {
  // 1. Archive (only published pages show Archive in the status banner)
  const archiveBtn = page.getByRole('button', { name: /Archive/i }).first();
  if (await isVisible(archiveBtn, 5000)) {
    await archiveBtn.click();
    await page.waitForTimeout(500);
    const confirmBtn = page.getByRole('button', { name: /^Archive$/ }).last();
    if (await isVisible(confirmBtn, 3000)) {
      await confirmBtn.click();
      await page.waitForTimeout(1200);
    }
  }

  // 2. Archived banner now shows the Delete (trash icon) button
  const deleteBtn = page
    .locator('button')
    .filter({ has: page.locator('svg.lucide-trash-2, svg.lucide-trash2') })
    .last();
  if (!(await isVisible(deleteBtn, 3000))) {
    throw new Error('Delete (trash) button not found in archived banner');
  }
  await deleteBtn.click();
  await page.waitForTimeout(500);

  // 3. Confirm permanent delete
  const confirmDelete = page.getByRole('button', { name: /^Delete$/ }).last();
  if (await isVisible(confirmDelete, 3000)) {
    await confirmDelete.click();
    await page.waitForTimeout(1500);
  }
}

test.describe('Trash — restore lifecycle', () => {
  test.beforeEach(async ({ page }) => {
    await signInAsAdmin(page);
  });

  test('delete a page, restore it from trash, verify it returns', async ({ page }) => {
    const pageUrl = await createPage(page, 'Restore Me From Trash', 'Restore content');
    if (!pageUrl) return;

    // ── 1. Archive → Delete → trash ────────────────────────────────────────
    await deleteCurrentPage(page);

    // ── 2. Open Trash — the deleted page should be listed ──────────────────
    await page.goto('/');
    await page.waitForLoadState('load');
    await page.locator('aside').getByRole('button', { name: 'Trash' }).click();
    await page.waitForTimeout(1500);

    const trashEmpty = page.getByText(/Trash is empty/i);
    if (await isVisible(trashEmpty, 2000)) {
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

    // ── 1. Archive → Delete → trash ────────────────────────────────────────
    await deleteCurrentPage(page);

    // ── 2. Open Trash → permanent Delete ───────────────────────────────────
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
