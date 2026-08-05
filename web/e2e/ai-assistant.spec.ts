import { test, expect } from './fixtures';
import { signInAsAdmin, isVisible } from './helpers';

/**
 * AI Assistant panel E2E tests.
 *
 * The assistant opens from the sidebar, shows the chat surface with an input
 * and send button, and its settings gear opens the config panel.
 */

test.describe('AI Assistant', () => {
  test.beforeEach(async ({ page }) => {
    await signInAsAdmin(page);
    await page.goto('/');
    await page.waitForLoadState('load');
  });

  test('opens from sidebar and shows the chat surface', async ({ page }) => {
    const assistantBtn = page.locator('aside').getByRole('button', { name: 'AI Assistant' });
    await expect(assistantBtn).toBeVisible({ timeout: 10000 });
    await assistantBtn.click();
    await page.waitForTimeout(800);

    await expect(page.getByText('AI Assistant').first()).toBeVisible({ timeout: 5000 });
    const sendBtn = page.getByRole('button', { name: 'Send message' });
    await expect(sendBtn).toBeVisible({ timeout: 5000 });
  });

  test('settings gear opens the config panel', async ({ page }) => {
    const assistantBtn = page.locator('aside').getByRole('button', { name: 'AI Assistant' });
    await assistantBtn.click();
    await page.waitForTimeout(800);

    const settingsBtn = page.locator('button[title="AI Settings"]');
    await expect(settingsBtn).toBeVisible({ timeout: 5000 });
    await settingsBtn.click();
    await page.waitForTimeout(500);

    // Provider select + API URL input appear
    await expect(page.getByText('Provider').first()).toBeVisible({ timeout: 5000 });
    await expect(page.getByPlaceholder('http://localhost:11434').first()).toBeVisible({
      timeout: 5000,
    });
  });

  test('closes via the close button', async ({ page }) => {
    const assistantBtn = page.locator('aside').getByRole('button', { name: 'AI Assistant' });
    await assistantBtn.click();
    await page.waitForTimeout(800);

    const closeBtn = page.locator('button[title="Close"]').first();
    await expect(closeBtn).toBeVisible({ timeout: 5000 });
    await closeBtn.click();
    await page.waitForTimeout(500);

    await expect(page.getByRole('button', { name: 'Send message' })).not.toBeVisible();
  });
});
