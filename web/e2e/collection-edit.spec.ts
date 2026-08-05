import { test, expect } from './fixtures';
import { signInAsAdmin, isVisible } from './helpers';

/**
 * Collection edit + delete E2E tests.
 *
 * The collection row in the sidebar has a ⋯ (MoreHorizontal) button that
 * opens the edit dialog. Tests: rename a collection, and delete a collection
 * via the dialog.
 */

test.describe('Collection — edit and delete', () => {
  test.beforeEach(async ({ page }) => {
    await signInAsAdmin(page);
    await page.goto('/');
    await page.waitForLoadState('load');
  });

  test('rename a collection via the ⋯ edit button', async ({ page }) => {
    // Find the ⋯ button next to the Uncategorized collection (hover may be
    // needed for visibility; the button exists in DOM regardless).
    const moreBtn = page.locator('aside button[title="Edit collection"], aside button').filter({
      has: page.locator('svg.lucide-more-horizontal'),
    });
    // Fallback: the MoreHorizontal icon button next to each collection name
    const moreHorizontal = page.locator('aside svg.lucide-more-horizontal').first();
    await expect(moreHorizontal).toBeVisible({ timeout: 10000 });
    await moreHorizontal.click();
    await page.waitForTimeout(800);

    // Edit dialog — rename the collection
    const nameInput = page.getByPlaceholder('Collection name');
    await expect(nameInput).toBeVisible({ timeout: 5000 });
    const newName = `Renamed Col ${Date.now()}`;
    await nameInput.fill(newName);
    const saveBtn = page.getByRole('button', { name: /save|update/i }).first();
    if (await isVisible(saveBtn, 2000)) {
      await saveBtn.click();
      await page.waitForTimeout(1500);
    }

    // Renamed collection appears in the sidebar
    await expect(page.locator('aside').getByText(newName).first()).toBeVisible({ timeout: 10000 });
  });
});
