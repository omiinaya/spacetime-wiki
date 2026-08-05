import { test, expect } from './fixtures';
import { signInAsAdmin } from './helpers';

/**
 * Image upload E2E test.
 *
 * Uploads a real image into the editor via the file input, then verifies the
 * attachment was persisted by querying the STDB attachment table (the stable,
 * deterministic signal — the success toast only lasts 3s and the editor
 * stores attachment:// URLs that resolve to <img> at view time only).
 */

const PNG_1PX =
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';

const STDB_HOST = process.env.STDB_HOST || 'localhost:3001';
const DB_NAME = process.env.STDB_DATABASE || process.env.STDB_DB || 'spacetime-wiki-e2e';

/** Query STDB for an attachment row with the given filename. */
async function attachmentExists(filename: string): Promise<boolean> {
  const res = await fetch(`http://${STDB_HOST}/v1/database/${DB_NAME}/sql`, {
    method: 'POST',
    headers: { 'Content-Type': 'text/plain' },
    body: `SELECT id FROM attachment WHERE filename = '${filename.replace(/'/g, "''")}'`,
  });
  if (!res.ok) return false;
  const data = (await res.json()) as Array<{ rows?: unknown[][] }>;
  const rows = data[0]?.rows || [];
  return rows.length > 0;
}

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

    // The upload pipeline persists an attachment row. Poll STDB until the
    // row appears — the deterministic proof the reducer + insert path worked
    // end-to-end.
    let found = false;
    for (let i = 0; i < 20; i++) {
      await page.waitForTimeout(1000);
      if (await attachmentExists(marker)) {
        found = true;
        break;
      }
    }
    expect(found).toBe(true);
  });
});
