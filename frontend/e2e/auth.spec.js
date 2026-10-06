import { test, expect } from '@playwright/test';

test.describe('Champions Club - Authentication & RBAC E2E Flows', () => {
  test.beforeEach(async ({ page }) => {
    // Clear localStorage before each test
    await page.addInitScript(() => {
      localStorage.clear();
    });
  });

  test('Protected route redirects unauthenticated visitor to /login with redirect parameter', async ({ page }) => {
    await page.goto('/console');
    await expect(page).toHaveURL(/\/login\?redirect=%2Fconsole/);
    await expect(page.getByRole('heading', { name: /Sign In to Champions Club/i })).toBeVisible();

    await page.goto('/app');
    await expect(page).toHaveURL(/\/login\?redirect=%2Fapp/);
    await expect(page.getByRole('heading', { name: /Sign In to Champions Club/i })).toBeVisible();
  });

  test('Displays generic error banner when entering invalid credentials (wrong password)', async ({ page }) => {
    // Mock 401 response from backend
    await page.route('**/auth/login', async (route) => {
      await route.fulfill({
        status: 401,
        contentType: 'application/json',
        body: JSON.stringify({
          status: 401,
          message: 'Invalid email or password.',
          timestamp: new Date().toISOString(),
        }),
      });
    });

    await page.goto('/login');
    await page.fill('#login-email', 'owner@championsclub.com');
    await page.fill('#login-password', 'IncorrectPassword123');

    await page.getByRole('button', { name: /Sign In$/i }).click();

    // Verify error banner
    const alertBox = page.getByRole('alert');
    await expect(alertBox).toBeVisible();
    await expect(alertBox).toContainText(/Invalid email or password/i);

    // Verify user stays on login page
    await expect(page).toHaveURL(/\/login/);
  });

  test('Logs in successfully with credentials and redirects to intended destination', async ({ page }) => {
    // Mock successful login response
    await page.route('**/auth/login', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          accessToken: 'mock-jwt-token-xyz',
          refreshToken: 'mock-refresh-token-xyz',
          user: {
            id: '99999999-9999-9999-9999-999999999999',
            email: 'owner@championsclub.com',
            fullName: 'Alexander Owner',
            role: 'OWNER',
            status: 'ACTIVE',
          },
        }),
      });
    });

    await page.goto('/login');

    // Click quick demo pill for Owner
    await page.getByRole('button', { name: 'Owner' }).click();
    await expect(page.locator('#login-email')).toHaveValue('owner@championsclub.com');
    await expect(page.locator('#login-password')).toHaveValue('Champions@123');

    // Submit form
    await page.getByRole('button', { name: /Sign In$/i }).click();

    // Verify redirect to staff console
    await expect(page).toHaveURL(/\/console/);
    await expect(page.getByRole('heading', { name: /Operations Command Center/i })).toBeVisible();

    // Verify tokens were stored in localStorage
    const token = await page.evaluate(() => localStorage.getItem('champions_token'));
    expect(token).toBe('mock-jwt-token-xyz');
  });

  test('Logs out user, revokes session and blocks browser back-button access', async ({ page }, testInfo) => {
    const isMobile = testInfo.project.name.includes('mobile');

    // Mock logout endpoint
    await page.route('**/auth/logout', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ message: 'Logged out successfully' }),
      });
    });

    // Seed authenticated staff session
    await page.addInitScript(() => {
      localStorage.setItem(
        'champions_user',
        JSON.stringify({
          id: '88888888-8888-8888-8888-888888888888',
          email: 'owner@championsclub.com',
          fullName: 'Alexander Owner',
          role: 'OWNER',
          status: 'ACTIVE',
        })
      );
      localStorage.setItem('champions_token', 'mock-active-session-token');
    });

    // Navigate to /login first then /console to ensure history stack for back button test
    await page.goto('/login');
    await page.goto('/console');
    await expect(page.getByRole('heading', { name: /Operations Command Center/i })).toBeVisible();

    // Sign out using responsive header button
    await page.locator('#staff-header-logout-btn').click();

    // Verify redirected to login
    await expect(page).toHaveURL(/\/login/);
    await expect(page.getByRole('heading', { name: /Sign In to Champions Club/i })).toBeVisible();

    // Verify localStorage cleared
    const storedToken = await page.evaluate(() => localStorage.getItem('champions_token'));
    expect(storedToken).toBeNull();

    // Back button behavior: navigating back should redirect back to /login because session is cleared
    await page.goBack();
    await expect(page).toHaveURL(/\/login/);
    await expect(page.getByRole('heading', { name: /Sign In to Champions Club/i })).toBeVisible();
  });
});
