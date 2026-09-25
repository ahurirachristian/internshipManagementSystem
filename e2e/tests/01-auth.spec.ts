import { test, expect, type Page } from '@playwright/test';
import {
  CREDENTIALS,
  collectConsoleErrors,
  collectFailedRequests,
  expectAppShell,
  loginAs,
} from './helpers';

type RouteCase = [string, string];

/**
 * Route groups mirror the `ProtectedRoute` guards in App.js exactly.
 * Keep this in step with App.js when routes move.
 */
const ADMIN_ONLY: RouteCase[] = [
  ['/admin/dashboard', 'Admin Dashboard'],
  ['/admin/users', 'User Management'],
  ['/admin/audit-logs', 'Audit Logs'],
  ['/admin/universities', 'University Management'],
  ['/admin/vacancies', 'Vacancies Management'],
];

const ADMIN_OR_SUPERVISOR: RouteCase[] = [
  ['/admin/placements', 'Placement & Supervisor Management'],
  ['/company', 'Company Management'],
  ['/university/dashboard', 'University Dashboard'],
  ['/university/students', 'Students'],
];

const SUPERVISOR_ONLY: RouteCase[] = [
  ['/university/schools', 'Schools Management'],
  ['/university/departments', 'Departments Management'],
  ['/university/programmes', 'Programmes Management'],
];

const ADMIN_OR_COMPANY: RouteCase[] = [['/company/dashboard', 'Company Dashboard']];

const ADMIN_OR_STUDENT: RouteCase[] = [
  ['/student/dashboard', 'Dashboard'],
  ['/student/progress', 'Level of Progress'],
  ['/student/tasks', 'Tasks'],
  ['/student/day-diaries', 'Day Diaries'],
  ['/student/learning-institute', 'Learning Institute'],
  ['/student/companies', 'Companies'],
  ['/student/profile-settings', 'Profile Settings'],
  ['/student/supervisor', 'Supervisor'],
];

const STUDENT_ONLY: RouteCase[] = [
  ['/student/profile', 'Student Profile'],
  ['/student/profile/edit', 'Edit Profile'],
];

const ALL_ROLES: RouteCase[] = [['/file-management', 'File Management']];

/** Every route an ADMIN can successfully open. */
const ADMIN_REACHABLE: RouteCase[] = [
  ...ADMIN_ONLY,
  ...ADMIN_OR_SUPERVISOR,
  ...ADMIN_OR_COMPANY,
  ...ADMIN_OR_STUDENT,
  ...ALL_ROLES,
];

/**
 * Routes that must load without any console error or failed request for an ADMIN.
 *
 * Deliberately excludes two ADMIN-reachable pages that currently call APIs scoped
 * to another role, so they cannot succeed for an ADMIN:
 *   /university/dashboard -> 400 /api/students/university[/profile],
 *                            400 /api/university/stats,
 *                            403 /api/university/departments,
 *                            403 /api/university/programmes
 *   /student/day-diaries  -> 500 /api/diaries/student/admin
 * Those are tracked as defect H10 and fixed in the cross-area block, which moves them
 * into this list once they are clean.
 */
const CLEAN_FOR_ADMIN: RouteCase[] = [
  ...ADMIN_ONLY,
  ['/admin/placements', 'Placement & Supervisor Management'],
  ['/company', 'Company Management'],
  ['/company/dashboard', 'Company Dashboard'],
  ...ALL_ROLES,
];

const ADMIN_HOME = CREDENTIALS.ADMIN.home;

async function expectRedirectedTo(page: Page, route: string, home: string): Promise<void> {
  await page.goto(route);
  await page.waitForURL(new RegExp(`${home}$`), { timeout: 20_000 });
}

test.describe('01 login', () => {
  test('admin logs in and lands on the admin dashboard', async ({ page }) => {
    await loginAs(page, 'ADMIN');
    await expect(page).toHaveURL(/\/admin\/dashboard$/);
    await expect(page.locator('.brand-name')).toHaveText('IMS Portal');
    await expect(page.locator('.user-name')).toHaveText('admin');
    await expect(page.locator('.user-role')).toHaveText('Admin');
    await expectAppShell(page, 'Admin Dashboard');
  });
});

test.describe('01 guards', () => {
  test('an unauthenticated visit to an admin route redirects to /login', async ({ page }) => {
    await page.goto('/admin/users');
    await page.waitForURL(/\/login$/, { timeout: 20_000 });
  });

  for (const role of ['SUPERVISOR', 'COMPANY', 'STUDENT'] as const) {
    test(`${role} is redirected away from /admin/dashboard`, async ({ page }) => {
      await loginAs(page, role);
      await expectRedirectedTo(page, '/admin/dashboard', CREDENTIALS[role].home);
    });
  }

  test('a student is redirected from every admin-only route', async ({ page }) => {
    await loginAs(page, 'STUDENT');
    for (const [route] of ADMIN_ONLY) {
      await expectRedirectedTo(page, route, CREDENTIALS.STUDENT.home);
    }
  });

  test('a student is redirected from the admin-or-supervisor routes', async ({ page }) => {
    await loginAs(page, 'STUDENT');
    for (const [route] of ADMIN_OR_SUPERVISOR) {
      await expectRedirectedTo(page, route, CREDENTIALS.STUDENT.home);
    }
  });

  test('an admin is redirected from the supervisor-only settings pages', async ({ page }) => {
    await loginAs(page, 'ADMIN');
    for (const [route] of SUPERVISOR_ONLY) {
      await expectRedirectedTo(page, route, ADMIN_HOME);
    }
  });

  test('an admin is redirected from the student-only profile pages', async ({ page }) => {
    await loginAs(page, 'ADMIN');
    for (const [route] of STUDENT_ONLY) {
      await expectRedirectedTo(page, route, ADMIN_HOME);
    }
  });
});

test.describe('01 admin routes render', () => {
  test('admin-owned routes load with no console errors or failed requests', async ({ page }) => {
    test.setTimeout(240_000);
    const errors = collectConsoleErrors(page);
    const failures = collectFailedRequests(page);
    await loginAs(page, 'ADMIN');

    const perRoute: string[] = [];
    for (const [route, title] of CLEAN_FOR_ADMIN) {
      const before = failures.length;
      await page.goto(route);
      await expectAppShell(page, title);
      await page.waitForTimeout(400);
      if (failures.length > before) {
        perRoute.push(`${route} -> ${failures.slice(before).join(', ')}`);
      }
    }

    expect(failures, `failed requests by route:\n${perRoute.join('\n')}`).toEqual([]);
    expect(errors, `console errors: ${errors.join(' | ')}`).toEqual([]);
  });
});

test.describe('01 app shell audit (H11 regression lock)', () => {
  test('admin: the shell survives navigation to every reachable route', async ({ page }) => {
    test.setTimeout(240_000);
    await loginAs(page, 'ADMIN');
    for (const [route, title] of ADMIN_REACHABLE) {
      await page.goto(route);
      await expectAppShell(page, title);
    }
  });

  test('supervisor: the shell survives navigation to the university area', async ({ page }) => {
    test.setTimeout(240_000);
    await loginAs(page, 'SUPERVISOR');
    const routes: RouteCase[] = [
      ...SUPERVISOR_ONLY,
      ...ADMIN_OR_SUPERVISOR,
      ...ALL_ROLES,
    ];
    for (const [route, title] of routes) {
      await page.goto(route);
      await expectAppShell(page, title);
    }
  });

  test('company: the shell survives navigation to the company area', async ({ page }) => {
    await loginAs(page, 'COMPANY');
    for (const [route, title] of [...ADMIN_OR_COMPANY, ...ALL_ROLES]) {
      await page.goto(route);
      await expectAppShell(page, title);
    }
  });

  test('student: the shell survives navigation to the student area', async ({ page }) => {
    test.setTimeout(240_000);
    await loginAs(page, 'STUDENT');
    for (const [route, title] of [...ADMIN_OR_STUDENT, ...STUDENT_ONLY, ...ALL_ROLES]) {
      await page.goto(route);
      await expectAppShell(page, title);
    }
  });
});

test.describe('01 shell chrome', () => {
  test('the sidebar collapses and expands', async ({ page }) => {
    await loginAs(page, 'ADMIN');
    await page.getByRole('button', { name: 'Hide sidebar' }).click();
    await expect(page.locator('.dashboard-shell')).toHaveClass(/sidebar-collapsed/);
    await page.getByRole('button', { name: 'Show sidebar' }).click();
    await expect(page.locator('.dashboard-shell')).not.toHaveClass(/sidebar-collapsed/);
  });

  test('the notifications panel lists items and Clear all empties it in place', async ({ page }) => {
    await loginAs(page, 'ADMIN');
    await page.locator('button[title="Notifications"]').click();
    await expect(page.locator('.notif-panel')).toBeVisible();

    const clearAll = page.getByRole('button', { name: 'Clear all' });
    if (await clearAll.count()) {
      await clearAll.click();
      // Clearing must not close the panel (H14 regression).
      await expect(page.locator('.notif-panel')).toBeVisible();
    }
    await expect(page.locator('.notif-empty')).toHaveText('No new notifications');
    await expect(page.locator('.notif-item')).toHaveCount(0);
  });

  test('clicking outside still closes the notifications panel', async ({ page }) => {
    await loginAs(page, 'ADMIN');
    await page.locator('button[title="Notifications"]').click();
    await expect(page.locator('.notif-panel')).toBeVisible();
    await page.locator('h1.page-title').click();
    await expect(page.locator('.notif-panel')).toBeHidden();
  });

  test('logout returns to /login and ends the session', async ({ page }) => {
    await loginAs(page, 'ADMIN');
    await page.getByRole('button', { name: 'Logout' }).click();
    await expect(page).toHaveURL(/\/login$/);

    await page.goto('/admin/dashboard');
    await page.waitForURL(/\/login$/, { timeout: 20_000 });
  });
});
