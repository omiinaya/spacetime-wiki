import { test, expect } from './fixtures';
import { signInAsAdmin, isVisible } from './helpers';

/**
 * Image upload + lightbox E2E tests.
 *
 * Uploads a real image into the editor via the file input / drop path, then
 * verifies it renders as an <img> in the editor (proving the upload → blob →
 * insert pipeline works against live STDB).
 */

const PNG_1PX =
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';

test.describe('Editor — image upload', () => {
  test.beforeEach(async ({ page }) => {
    await signInAsAdmin(page);
  });

  test('uploading an image via the editor file input inserts an <img>', async ({ page }) => {
    await page.goto('/new');
    await page.waitForLoadState('load');

    // Editor loads
    await expect(page.locator('.ProseMirror')).toBeVisible({ timeout: 20000 });

    // The editor exposes a hidden file input for images (accept=image/*)
    const fileInput = page.locator('input[type="file"][accept*="image"]').first();
    if (!(await isVisible(fileInput, 5000))) {
      // Fallback: some builds use a generic file input
      const anyFileInput = page.locator('input[type="file"]').first();
      await expect(anyFileInput).toBeVisible({ timeout: 5000 });
    }

    const input = page.locator('input[type="file"]').first();
    await input.setInputFiles({
      name: 'e2e-pixel.png',
      mimeType: 'image/png',
      buffer: Buffer.from(PNG_1PX, 'base64'),
    });
    await page.waitForTimeout(4000);

    // The image should render in the editor (either as an <img> or as an
    // attachment URL). The ProseMirror content contains the inserted image.
    const imgInEditor = page.locator('.ProseMirror img').first();
    const hasImg = await isVisible(imgInEditor, 8000);
    expect(hasImg).toBe(true);
  });
});
