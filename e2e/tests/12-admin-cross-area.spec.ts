import { test, expect, type Page } from '@playwright/test';
import {
  login,
  expectAppShell,
  collectConsoleErrors,
  collectFailedRequests,
} from './helpers';

// Block 12 — Cross-role defects (H9, H10, H13 and the university-area 400/403s):
//
//   * every sidebar destination an ADMIN can reach renders the full shell with
//     its expected page title, with no console errors and no failed requests
//   * /university/dashboard previously fired 400 x3 (stats, students/university
//     [/profile]) and 403 x2 (departments, programmes) for an ADMIN account
//     with no linked university; those loads are now gated on the viewer's
//     universityId (the pattern loadAcademicUnits already used) and the page
//     surfaces the reason via its existing error banner instead
//   * /student/progress fetched a relative URL (answered by the dev server with
//     index.html, so real progress never loaded for ANY user) and silently
//     swallowed errors (the `error` state was never rendered); it now calls the
//     absolute API, treats 404 as the not-started state, and renders its alert
//   * H9: /admin/vacancies had no sidebar entry — it now does (existing markup)
//   * H10: the student pages render gracefully for an ADMIN (shell + title, no
//     errors), which the route audit plus this spec locks in
//   * H13: AuditLogs imports the shared API_ROOT constant
//
// Documented allowlist: /api/students/me/progress answers 404 for a viewer
// without a student profile — that single probe (and Chrome's matching console
// note) is the only tolerated failure.

const ROUTES: Array<[string, string]> = [
  ['/student/dashboard', 'Dashboard'],
  ['/student/progress', 'Level of Progress'],
  ['/student/tasks', 'Tasks'],
  ['/student/day-diaries', 'Day Diaries'],
  ['/student/learning-institute', 'Learning Institute'],
  ['/student/companies', 'Companies'],
  ['/student/profile-settings', 'Profile Settings'],
  ['/student/supervisor', 'Supervisor'],
  ['/university/dashboard', 'University Dashboard'],
  ['/university/students', 'Students'],
  ['/company/dashboard', 'Company Dashboard'],
];

/** The deliberate no-student-profile probe (see header comment). */
function isAllowlisted(text: string): boolean {
  return text.includes('/api/students/me/progress');
}

test.describe('12 admin cross-area', () => {
  test.beforeEach(async ({ page }) => {
    await login(page, 'admin', 'admin123');
  });

  test('every cross-area route renders the shell with no console errors or failed requests', async ({ page }) => {
    test.setTimeout(120_000);
    for (const [route, title] of ROUTES) {
      const consoleErrors = collectConsoleErrors(page);
      const failed = collectFailedRequests(page);

      await page.goto(route);
      await expectAppShell(page, title);

      const unexpectedErrors = consoleErrors.filter((e) => {
        // Chrome's failed-resource note carries no URL — scope it to the route
        // that deliberately probes the missing student profile.
        if (route === '/student/progress' && e.includes('Failed to load resource')) return false;
        return !isAllowlisted(e);
      });
      const unexpectedFailures = failed.filter((f) => !isAllowlisted(f));
      expect(unexpectedErrors, `console errors on ${route}`).toEqual([]);
      expect(unexpectedFailures, `failed requests on ${route}`).toEqual([]);
    }
  });

  test('progress page shows the not-started state (not an error) for a viewer without a profile', async ({ page }) => {
    await page.goto('/student/progress');
    await expectAppShell(page, 'Level of Progress');
    // no raw parse garbage, no thrown-message banner
    await expect(page.getByRole('alert')).toHaveCount(0);
    await expect(page.getByText('0%', { exact: true })).toBeVisible();
  });

  test('university dashboard degrades gracefully for an account with no linked university', async ({ page }) => {
    const consoleErrors = collectConsoleErrors(page);
    const failed = collectFailedRequests(page);

    await page.goto('/university/dashboard');
    await expectAppShell(page, 'University Dashboard');

    // the existing error banner states the reason, instead of 400/403 spam
    await expect(page.getByRole('alert')).toContainText('Your account is not linked to a university.');

    expect(consoleErrors).toEqual([]);
    expect(failed).toEqual([]);
  });

  test('H9: the admin sidebar links to /admin/vacancies and it opens', async ({ page }) => {
    await page.goto('/admin/dashboard');
    await expect(page.locator('.sidebar')).toBeVisible();

    await page.locator('.sidebar').getByRole('link', { name: 'Vacancies' }).click();
    await page.waitForURL('**/admin/vacancies');
    await expect(page.locator('h1.page-title')).toHaveText('Vacancies Management');
  });
});
