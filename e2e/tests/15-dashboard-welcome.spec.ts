import { test, expect } from '@playwright/test';
import { CREDENTIALS, expectAppShell, login, loginAs } from './helpers';

// Block 15 — the dashboard greeting read "Welcome," with nobody named.
//
// Every dashboard layout renders its greeting through DashboardLayout's
// `subtitle`, so the defect was the same literal on each page. The greeting now
// interpolates the authenticated username from AuthContext. The university
// dashboard already named its university, so it is checked for contrast.

test.describe('15 dashboard welcome greeting', () => {
  test('student dashboard welcomes the signed-in student by username', async ({ page }) => {
    await loginAs(page, 'STUDENT');
    await expectAppShell(page, 'Dashboard');
    await expect(page.locator('.page-subtitle')).toHaveText(
      `Welcome, ${CREDENTIALS.STUDENT.username}`
    );
  });

  test('admin sees their own name on the student dashboard and user management', async ({ page }) => {
    await loginAs(page, 'ADMIN');

    await page.goto('/student/dashboard');
    await expectAppShell(page, 'Dashboard');
    await expect(page.locator('.page-subtitle')).toHaveText(
      `Welcome, ${CREDENTIALS.ADMIN.username}`
    );

    await page.goto('/admin/users');
    await expectAppShell(page, 'User Management');
    await expect(page.locator('.page-subtitle')).toHaveText(
      `Welcome, ${CREDENTIALS.ADMIN.username}`
    );
  });

  test('company dashboard welcomes the signed-in company by username', async ({ page }) => {
    await loginAs(page, 'COMPANY');
    await expectAppShell(page, 'Company Dashboard');
    await expect(page.locator('.page-subtitle')).toHaveText(
      `Welcome, ${CREDENTIALS.COMPANY.username}`
    );
  });

  test('the university dashboard keeps naming the linked university', async ({ page }) => {
    await login(
      page,
      CREDENTIALS.SUPERVISOR.username,
      CREDENTIALS.SUPERVISOR.password,
      'SUPERVISOR'
    );
    await expectAppShell(page, 'University Dashboard');
    await expect(page.locator('.page-subtitle')).toContainText('Welcome,');
    await expect(page.locator('.page-subtitle')).not.toHaveText('Welcome,');
  });
});
