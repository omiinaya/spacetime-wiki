import { test, expect } from '@playwright/test';
import { signInAsAdmin, navigateToFirstPage } from './helpers';

/**
 * Comment and thread operations E2E tests.
 * Tests viewing, adding, and interacting with comments on pages.
 */

test.describe('Comments — viewing and creating', () => {
  test.beforeEach(async ({ page }) => {
    await signInAsAdmin(page);
  });

  test('page view shows comments section', async ({ page }) => {
    const pageUrl = await navigateToFirstPage(page);
    if (!pageUrl) {
      return;
    }

    // Comments section may be visible
    const commentsHeader = page.getByText(/Comments/).first();
    await expect(commentsHeader).toBeVisible({ timeout: 3000 });
  });

  test('comments section has an input field or add button', async ({ page }) => {
    const pageUrl = await navigateToFirstPage(page);
    if (!pageUrl) {
      return;
    }

    // Try to find a comment input
    const commentInput = page.getByPlaceholder(/comment|write/i);
    const addButton = page.getByRole('button', { name: /add comment|new comment/i });
    await expect(commentInput.or(addButton).first()).toBeVisible({ timeout: 2000 });
  });

  test('can write a comment on a page', async ({ page }) => {
    const pageUrl = await navigateToFirstPage(page);
    if (!pageUrl) {
      return;
    }

    // Try to add a comment
    const commentInput = page.getByPlaceholder(/comment|write|add/i).first();
    const commentInputVisible = await commentInput.isVisible({ timeout: 3000 });
    expect(commentInputVisible).toBeTruthy();
    await commentInput.fill('E2E test comment');
    const submitBtn = page.getByRole('button', { name: /send|submit|post|add/i }).first();
    await expect(submitBtn).toBeVisible({ timeout: 3000 });
    await submitBtn.click();
    await page.waitForTimeout(1000);
    // The comment should appear
    await expect(page.getByText('E2E test comment').first()).toBeVisible({ timeout: 3000 });
  });
});
