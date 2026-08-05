import { test, expect } from './fixtures';
import { signInAsAdmin } from './helpers';

/**
 * Page editor E2E tests — work with any DB state.
 */
test.describe('Page editor — new page', () => {
  test.beforeEach(async ({ page }) => {
    // The editor requires an authenticated session — guest /new shows a
    // loading/login state and never mounts the title input.
    await signInAsAdmin(page);
    await page.goto('/new');
  });

  test('renders the ProseMirror editor', async ({ page }) => {
    await expect(page.locator('.ProseMirror')).toBeVisible({ timeout: 20000 });
  });

  test('shows title input for the page', async ({ page }) => {
    await expect(page.getByPlaceholder('Untitled')).toBeVisible({ timeout: 15000 });
  });

  test('allows typing in the editor', async ({ page }) => {
    await expect(page.locator('.ProseMirror')).toBeVisible({ timeout: 20000 });
    const editor = page.locator('.ProseMirror');
    await editor.fill('Hello, this is a real E2E test page!');
    await expect(editor).toContainText('Hello, this is a real E2E test page!');
  });

  test('allows setting a page title', async ({ page }) => {
    const titleInput = page.getByPlaceholder('Untitled');
    await expect(titleInput).toBeVisible({ timeout: 15000 });
    await titleInput.fill('E2E Test Page Title');
    await expect(titleInput).toHaveValue('E2E Test Page Title');
  });
});
