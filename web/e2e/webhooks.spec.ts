import { test, expect } from './fixtures';
import { signInAsAdmin, isVisible } from './helpers';

/**
 * Webhook settings CRUD E2E tests.
 *
 * Regression coverage for the create_webhook reducer fix (missing
 * #[reducer] attribute) — creating a webhook through the Admin → Webhooks
 * UI must succeed end-to-end (previously callReducer('create_webhook')
 * failed at runtime with 'unknown reducer').
 */

async function openWebhooksTab(page: import('@playwright/test').Page): Promise<void> {
  await page.goto('/');
  await page.waitForLoadState('load');
  await page.locator('aside').getByRole('button', { name: 'Admin' }).click();
  await page.waitForTimeout(1000);
  await page.getByRole('button').filter({ hasText: /^Webhooks$/ }).first().click();
  await page.waitForTimeout(1000);
}

test.describe('Webhooks — create via UI', () => {
  test.beforeEach(async ({ page }) => {
    await signInAsAdmin(page);
  });

  test('creates a webhook and it appears in the list', async ({ page }) => {
    await openWebhooksTab(page);

    // "New webhook" button opens the create form
    const newBtn = page.getByRole('button', { name: /New webhook/i });
    await expect(newBtn).toBeVisible({ timeout: 10000 });
    await newBtn.click();
    await page.waitForTimeout(500);

    const nameInput = page.getByPlaceholder('My webhook');
    await expect(nameInput).toBeVisible({ timeout: 5000 });
    const webhookName = `E2E Webhook ${Date.now()}`;
    await nameInput.fill(webhookName);
    await page.getByPlaceholder(/hooks\.example\.com|https:\/\//i).fill('https://example.com/e2e-hook');
    // Secret optional — leave empty

    const saveBtn = page.getByRole('button', { name: /Save|Create/i }).last();
    if (await isVisible(saveBtn, 2000)) {
      await saveBtn.click();
    }
    await page.waitForTimeout(2000);

    // The webhook appears in the list
    await expect(page.getByText(webhookName).first()).toBeVisible({ timeout: 10000 });
  });
});
