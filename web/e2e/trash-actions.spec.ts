import { test, expect } from './fixtures';
import { signInAsAdmin, createPage, isVisible } from './helpers';
import type { Page } from '@playwright/test';

/**
 * Trash actions E2E tests — restore, permanent delete.
 *
 * The real move-to-trash flow (verified against the app):
 *   sidebar tree → right-click the page row → context menu "Move to trash"
 *   → native confirm dialog → batchSetStatus('deleted') → page appears in
 *   the Trash dialog (/trash).
 *
 * NOTE: the archived-banner trash icon in the page view is a PERMANENT
 * delete (delete_page_permanent) — it never lands in trash. The sidebar
 * context menu is the correct "move to trash" path.
 */

/** Expand the "Uncategorized" (hash-icon) bucket in the sidebar tree. */
async function expandUncategorized(page: Page): Promise<void> {
  const bucket = page
    .locator('aside button')
    .filter({ has: page.locator('svg.lucide-hash') })
    .first();
  if (await isVisible(bucket, 5000)) {
    await bucket.click();
    await page.waitForTimeout(400);
  }
}

/** Move a page to trash via the sidebar context menu (right-click → Move to trash). */
async function moveToTrash(page: Page, title: string): Promise<void> {
  await page.goto('/');
  await page.waitForLoadState('load');
  await expandUncategorized(page);

  const row = page.locator('aside').getByText(title, { exact: true }).first();
  if (!(await isVisible(row, 5000))) {
    throw new Error(`Page row not found in sidebar tree: ${title}`);
  }
  await row.click({ button: 'right' });
  await page.waitForTimeout(400);

  // Native confirm('Move this page to trash?') — must accept it.
  page.once('dialog', (d) => d.accept());
  await page.getByRole('button', { name: 'Move to trash', exact: true }).click();
  await page.waitForTimeout(1500);
}

/** Open the Trash dialog from the sidebar. */
async function openTrash(page: Page): Promise<void> {
  await page.locator('aside').getByRole('button', { name: 'Trash', exact: true }).click();
  await page.waitForTimeout(1500);
}

test.describe('Trash — restore lifecycle', () => {
  test.beforeEach(async ({ page }) => {
    await signInAsAdmin(page);
  });

  test('delete a page, restore it from trash, verify it returns', async ({ page }) => {
    const pageUrl = await createPage(page, 'Restore Me From Trash', 'Restore content');
    if (!pageUrl) return;

    // ── 1. Move to trash via the sidebar context menu ──────────────────────
    await moveToTrash(page, 'Restore Me From Trash');

    // ── 2. Open Trash — the deleted page should be listed ──────────────────
    await openTrash(page);

    const trashEmpty = page.getByText(/Trash is empty/i);
    if (await isVisible(trashEmpty, 2000)) {
      throw new Error('Trash is empty after moving a page to trash');
    }
    await expect(page.getByText('Restore Me From Trash').first()).toBeVisible({ timeout: 10000 });

    // ── 3. Restore the page ────────────────────────────────────────────────
    await page.getByRole('button', { name: 'Restore', exact: true }).first().click();
    await page.waitForTimeout(1500);

    // The page leaves the trash list
    await expect(page.getByText('Restore Me From Trash')).not.toBeVisible({ timeout: 10000 });

    // And is back in the sidebar tree (draft status) from home
    await page.goto('/');
    await page.waitForLoadState('load');
    await expandUncategorized(page);
    await expect(page.locator('aside').getByText('Restore Me From Trash').first()).toBeVisible({
      timeout: 10000,
    });
  });

  test('permanently delete a page from trash', async ({ page }) => {
    const pageUrl = await createPage(page, 'Permanent Delete Me', 'Permanent content');
    if (!pageUrl) return;

    // ── 1. Move to trash via the sidebar context menu ──────────────────────
    await moveToTrash(page, 'Permanent Delete Me');

    // ── 2. Open Trash → permanent Delete ───────────────────────────────────
    await openTrash(page);

    await expect(page.getByText('Permanent Delete Me').first()).toBeVisible({ timeout: 10000 });

    // Native confirm('Permanently delete this page? ...') — must accept it.
    page.once('dialog', (d) => d.accept());
    await page.getByRole('button', { name: 'Delete', exact: true }).first().click();
    await page.waitForTimeout(1500);

    // Gone from trash
    await expect(page.getByText('Permanent Delete Me')).not.toBeVisible({ timeout: 10000 });
  });
});
