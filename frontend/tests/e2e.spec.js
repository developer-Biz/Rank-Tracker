import { test, expect } from '@playwright/test';

test.describe('Rank Tracker Auth & Routing', () => {
    test('should redirect unauthenticated users to login', async ({ page }) => {
        await page.goto('http://localhost:5173/');
        await expect(page).toHaveURL(/.*\/login/);
    });

    test('should display login form', async ({ page }) => {
        await page.goto('http://localhost:5173/login');
        await expect(page.locator('h2')).toContainText('Sign In');
        await expect(page.locator('input[type="email"]')).toBeVisible();
        await expect(page.locator('input[type="password"]')).toBeVisible();
        await expect(page.locator('button[type="submit"]')).toContainText('Sign In');
    });

    test('should show error on invalid login', async ({ page }) => {
        await page.goto('http://localhost:5173/login');
        await page.fill('input[type="email"]', 'wrong@example.com');
        await page.fill('input[type="password"]', 'badpassword');
        await page.click('button[type="submit"]');

        const errorMsg = page.locator('.login-error');
        await expect(errorMsg).toBeVisible();
        await expect(errorMsg).toContainText('Invalid login credentials');
    });
});
