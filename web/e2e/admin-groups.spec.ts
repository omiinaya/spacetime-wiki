import { test, expect } from './fixtures';
import { signInAsAdmin, isVisible } from './helpers';

/**
 * Admin Groups panel E2E test — create a group via the UI.
 */

async function openGroupsTab(page: import('@playwright/test').Page): Promise<void> {
  // signInAsAdmin already landed on '/' with the shell mounted.
  await page.locator('aside').getByRole('button', { name: 'Admin' }).click();
  // Wait for the tab bar
  await page.getByRole('heading', { name: /Admin/i }).first().waitFor({ state: 'visible', timeout: 10000 });
  const groupsTab = page.getByRole('button').filter({ hasText: /^Groups$/ }).first();
  await groupsTab.click();
  await page.waitForTimeout(1200);
}

test.describe('Admin Groups — create', () => {
  test.beforeEach(async ({ page }) => {
    await signInAsAdmin(page);
  });

  test('creates a group and it appears in the list', async ({ page }) => {
    await openGroupsTab(page);

    // "New Group" button opens the create dialog
    const newBtn = page.getByRole('button', { name: /New Group/i });
    await expect(newBtn).toBeVisible({ timeout: 10000 });
    await newBtn.click();
    await page.waitForTimeout(500);

    const nameInput = page.getByPlaceholder('Group name');
    await expect(nameInput).toBeVisible({ timeout: 5000 });
    const groupName = `E2E Group ${Date.now()}`;
    await nameInput.fill(groupName);
    await page.getByPlaceholder(/Description \(optional\)/i).fill('Created by E2E test');
    await page.getByRole('button', { name: /^Create$/ }).click();
    await page.waitForTimeout(1500);

    await expect(page.getByText(groupName).first()).toBeVisible({ timeout: 10000 });
  });
});