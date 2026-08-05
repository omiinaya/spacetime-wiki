import { test, expect } from './fixtures';
import { signInAsAdmin } from './helpers';

/**
 * SSO/OAuth callback routes E2E tests.
 *
 * All four callback routes render a deterministic status surface when called
 * without a valid authorization payload. Testing the error/empty states is
 * hermetic (no external provider needed) and exercises the full route wiring:
 *   - /oauth/google/callback → GoogleCallback
 *   - /oauth/callback        → OAuthCallback
 *   - /oauth/oidc/callback   → OidcCallback
 *   - /auth/saml/callback    → SamlCallback
 *
 * Each shows its failure status in the rendered page (muted-foreground <p>).
 */

test.describe('OAuth callback routes — error surfaces', () => {
  test.beforeEach(async ({ page }) => {
    await signInAsAdmin(page);
  });

  test('google callback without code shows authentication failed', async ({ page }) => {
    await page.goto('/oauth/google/callback');
    await page.waitForLoadState('load');
    await expect(page.getByText(/Authentication failed: No authorization code/i)).toBeVisible({
      timeout: 10000,
    });
  });

  test('google callback with explicit error param shows it', async ({ page }) => {
    await page.goto('/oauth/google/callback?error=access_denied');
    await page.waitForLoadState('load');
    await expect(page.getByText(/Authentication failed: access_denied/i)).toBeVisible({
      timeout: 10000,
    });
  });

  test('generic oauth callback without code shows authentication failed', async ({ page }) => {
    await page.goto('/oauth/callback');
    await page.waitForLoadState('load');
    await expect(page.getByText(/Authentication failed: No authorization code/i)).toBeVisible({
      timeout: 10000,
    });
  });

  test('oidc callback without code shows authentication failed', async ({ page }) => {
    await page.goto('/oauth/oidc/callback');
    await page.waitForLoadState('load');
    await expect(page.getByText(/Authentication failed: No authorization code/i)).toBeVisible({
      timeout: 10000,
    });
  });

  test('saml callback without SAMLResponse shows error status', async ({ page }) => {
    await page.goto('/auth/saml/callback');
    await page.waitForLoadState('load');
    await expect(page.getByText(/No SAMLResponse received/i)).toBeVisible({ timeout: 10000 });
  });
});
