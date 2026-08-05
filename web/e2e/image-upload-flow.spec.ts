import { test, expect } from './fixtures';
import { signInAsAdmin, isVisible } from './helpers';
import { sqlQuery, sqlLit } from '../src/lib/api/client';

/**
 * Image upload E2E test.
 *
 * Uploads a real image into the editor via the file input, then verifies the
 * attachment was persisted by querying the attachment table (the stable,
 * deterministic signal — the success toast only lasts 3s and the editor
 * stores attachment:// URLs that resolve to <img> at view time only).
 */

const PNG_1PX =
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';

test.describe('Editor — image upload', () => {
  test.beforeEach(async ({ page }) => {
    await signInAsAdmin(page);
  });

  test('uploading an image via the editor file input persists an attachment', async ({ page }) => {
    await page.goto('/new');
    await page.waitForLoadState('load');

    // Editor loads
    await expect(page.locator('.ProseMirror')).toBeVisible({ timeout: 20000 });

    // The editor exposes a hidden image input (accept=image/*, aria-label
    // 'Upload image'). setInputFiles works on hidden inputs — target it
    // precisely (the sidebar has other file inputs for imports).
    const input = page.locator('input[type="file"][accept="image/*"]').first();
    const marker = `e2e-pixel-${Date.now()}.png`;
    await input.setInputFiles({
      name: marker,
      mimeType: 'image/png',
      buffer: Buffer.from(PNG_1PX, 'base64'),
    });

    // The upload pipeline persists an attachment row. Poll the attachment
    // table (via the app's own sqlQuery) until the row appears — this is the
    // deterministic proof the reducer + insert path worked end-to-end.
    let found = false;
    for (let i = 0; i < 20; i++) {
      await page.waitForTimeout(1000);
      try {
        const rows = (await sqlQuery(
          `SELECT id, filename FROM attachment WHERE filename = ${sqlLit(marker)}`,
        )) as unknown[][];
        if (rows.length > 0) {
          found = true;
          break;
        }
      } catch {
        // STDB query may race the insert — retry
      }
    }
    expect(found).toBe(true);
  });
});
