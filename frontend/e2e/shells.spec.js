import { test, expect } from '@playwright/test';

test.describe('Champions Club - Shells Navigation & Zero Console Errors', () => {
  test.beforeEach(async ({ page }) => {
    // Seed authenticated staff/owner session for protected shells
    await page.addInitScript(() => {
      localStorage.setItem(
        'champions_user',
        JSON.stringify({
          id: 'u-e2e',
          email: 'admin@championsclub.com',
          fullName: 'Alex Rodriguez',
          role: 'OWNER',
          status: 'ACTIVE',
        })
      );
      localStorage.setItem('champions_token', 'mock-token-e2e');
    });
  });

  test('navigates Public, Member, and Staff shells without console errors', async ({ page }, testInfo) => {
    const isMobile = testInfo.project.name.includes('mobile');
    const consoleErrors = [];

    page.on('console', (msg) => {
      if (
        msg.type() === 'error' &&
        !msg.text().includes('ERR_CONNECTION_REFUSED') &&
        !msg.text().includes('Failed to load resource')
      ) {
        consoleErrors.push(`[Console Error]: ${msg.text()}`);
      }
    });

    page.on('pageerror', (exception) => {
      consoleErrors.push(`[Page Uncaught Error]: ${exception.message}`);
    });

    // 1. Public Shell
    await page.goto('/');
    await expect(page.locator('h1')).toContainText(/Champions Club/i);
    if (!isMobile) {
      await expect(page.locator('#member-portal-nav-btn, #staff-console-nav-btn')).toHaveCount(2);
    } else {
      await expect(page.locator('#staff-console-nav-btn')).toBeVisible();
    }

    // 2. Styleguide Showcase
    await page.goto('/styleguide');
    await expect(page.locator('h1')).toContainText(/Component Styleguide & Tokens/i);
    await expect(page.getByText(/Buttons & Variants/i)).toBeVisible();
    await expect(page.getByText(/Form Controls & Inputs/i)).toBeVisible();

    // 3. Member Portal Shell
    await page.goto('/app');
    await expect(page.locator('h1')).toContainText(/Member Dashboard/i);
    await expect(page.getByText('$175.50')).toBeVisible();
    if (!isMobile) {
      await expect(page.getByText('Alex Rodriguez').first()).toBeVisible();
    } else {
      await expect(page.getByRole('navigation', { name: /Mobile Navigation/i })).toBeVisible();
    }

    // 4. Staff Console Shell
    await page.goto('/console');
    await expect(page.getByRole('heading', { name: /Operations Command Center/i })).toBeVisible();
    if (!isMobile) {
      await expect(page.getByText('Current Role')).toBeVisible();
    }

    // Test Command Palette shortcut button if visible
    const searchBtn = page.getByRole('button', { name: /Search anything/i });
    if (await searchBtn.isVisible()) {
      await searchBtn.click();
      await expect(page.getByPlaceholder(/Type a command or jump to/i)).toBeVisible();
      // Press Escape to dismiss
      await page.keyboard.press('Escape');
    }

    // 5. 404 Status Page
    await page.goto('/random-nonexistent-route');
    await expect(page.getByText('404')).toBeVisible();
    await expect(page.locator('h1')).toContainText(/Out of Bounds!/i);

    // Verify zero console errors were emitted
    expect(consoleErrors).toEqual([]);
  });

  test('handles 320px ultra-compact mobile viewport seamlessly', async ({ page }) => {
    const consoleErrors = [];

    page.on('console', (msg) => {
      if (
        msg.type() === 'error' &&
        !msg.text().includes('ERR_CONNECTION_REFUSED') &&
        !msg.text().includes('Failed to load resource')
      ) {
        consoleErrors.push(`[Console Error]: ${msg.text()}`);
      }
    });

    page.on('pageerror', (exception) => {
      consoleErrors.push(`[Page Uncaught Error]: ${exception.message}`);
    });

    // Set 320px viewport
    await page.setViewportSize({ width: 320, height: 640 });

    // Public Home on mobile
    await page.goto('/');
    await expect(page.locator('h1')).toBeVisible();

    // Member Layout on mobile (should show bottom tab bar)
    await page.goto('/app');
    await expect(page.getByRole('navigation', { name: /Mobile Navigation/i })).toBeVisible();

    // Staff Console on mobile
    await page.goto('/console');
    await expect(page.locator('main')).toBeVisible();

    expect(consoleErrors).toEqual([]);
  });
});
