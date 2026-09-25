import { test, expect, request } from '@playwright/test';
import { API, collectConsoleErrors } from './helpers';

test.describe('00 smoke', () => {
  test('backend health endpoint reports UP', async () => {
    const ctx = await request.newContext();
    const response = await ctx.get(`${API}/actuator/health`);
    expect(response.status()).toBe(200);
    const body = await response.json();
    expect(body.status).toBe('UP');
    await ctx.dispose();
  });

  test('frontend login page renders', async ({ page }) => {
    const errors = collectConsoleErrors(page);
    await page.goto('/login');
    await expect(page.locator('#username')).toBeVisible();
    await expect(page.locator('#password')).toBeVisible();
    await expect(page.locator('#login-role')).toBeVisible();
    expect(errors).toEqual([]);
  });
});
