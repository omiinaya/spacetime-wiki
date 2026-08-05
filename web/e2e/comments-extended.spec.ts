import { test, expect } from './fixtures';
import { signInAsAdmin, createPage, isVisible } from './helpers';

/**
 * Comments — extended interactions E2E tests.
 *
 * The base comments.spec.ts covers viewing + creating a comment. These tests
 * cover the interaction surface on top: reply, resolve, react, and delete.
 */

test.describe('Comments — extended interactions', () => {
  test.beforeEach(async ({ page }) => {
    await signInAsAdmin(page);
  });

  test('can reply to a comment', async ({ page }) => {
    const pageUrl = await createPage(page, 'Comment Reply Page', 'Comment reply content');
    if (!pageUrl) return;

    // Add a top-level comment first
    const commentInput = page.getByPlaceholder(/Add a comment/i);
    await expect(commentInput).toBeVisible({ timeout: 10000 });
    await commentInput.fill('Top level comment for reply test');
    await page.getByRole('button', { name: 'Send comment' }).click();
    await page.waitForTimeout(1500);

    // Click Reply on the comment
    const replyBtn = page.getByRole('button', { name: 'Reply', exact: true }).first();
    await replyBtn.click();
    await page.waitForTimeout(500);

    // Reply input appears
    const replyInput = page.getByPlaceholder(/Write a reply/i).first();
    await expect(replyInput).toBeVisible({ timeout: 5000 });
    await replyInput.fill('This is a reply to the comment');
    // The reply send button is typically next to the reply input
    await replyInput.press('Enter');
    await page.waitForTimeout(1500);

    await expect(page.getByText('This is a reply to the comment').first()).toBeVisible({
      timeout: 10000,
    });
  });

  test('can resolve a comment', async ({ page }) => {
    const pageUrl = await createPage(page, 'Comment Resolve Page', 'Comment resolve content');
    if (!pageUrl) return;

    const commentInput = page.getByPlaceholder(/Add a comment/i);
    await expect(commentInput).toBeVisible({ timeout: 10000 });
    await commentInput.fill('This comment will be resolved');
    await page.getByRole('button', { name: 'Send comment' }).click();
    await page.waitForTimeout(1500);

    const resolveBtn = page.getByRole('button', { name: 'Resolve', exact: true }).first();
    await expect(resolveBtn).toBeVisible({ timeout: 5000 });
    await resolveBtn.click();
    await page.waitForTimeout(1500);

    // Resolved badge appears
    await expect(page.getByText('Resolved').first()).toBeVisible({ timeout: 10000 });
  });

  test('can react to a comment with an emoji', async ({ page }) => {
    const pageUrl = await createPage(page, 'Comment React Page', 'Comment react content');
    if (!pageUrl) return;

    const commentInput = page.getByPlaceholder(/Add a comment/i);
    await expect(commentInput).toBeVisible({ timeout: 10000 });
    await commentInput.fill('React to this comment');
    await page.getByRole('button', { name: 'Send comment' }).click();
    await page.waitForTimeout(1500);

    // First reaction emoji button (e.g. 👍) — title="React with ..."
    const reactBtn = page.locator('button[title^="React with"]').first();
    await expect(reactBtn).toBeVisible({ timeout: 5000 });
    await reactBtn.click();
    await page.waitForTimeout(1200);

    // The reaction count badge increments (the button shows count)
    await expect(reactBtn).toContainText(/1/);
  });

  test('can delete a comment', async ({ page }) => {
    const pageUrl = await createPage(page, 'Comment Delete Page', 'Comment delete content');
    if (!pageUrl) return;

    const commentInput = page.getByPlaceholder(/Add a comment/i);
    await expect(commentInput).toBeVisible({ timeout: 10000 });
    await commentInput.fill('This comment will be deleted');
    await page.getByRole('button', { name: 'Send comment' }).click();
    await page.waitForTimeout(1500);

    await expect(page.getByText('This comment will be deleted').first()).toBeVisible({
      timeout: 5000,
    });

    const deleteBtn = page.getByRole('button', { name: 'Delete', exact: true }).first();
    await deleteBtn.click();
    await page.waitForTimeout(1500);

    // Comment disappears (no confirm dialog — immediate delete)
    await expect(page.getByText('This comment will be deleted')).not.toBeVisible({
      timeout: 10000,
    });
  });
});
