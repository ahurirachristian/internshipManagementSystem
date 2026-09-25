import { test, expect, type Page } from '@playwright/test';
import { login, expectAppShell, collectConsoleErrors, collectFailedRequests, API } from './helpers';

// Block 13 — cross-cutting sweep (the final gate):
//
//   1. every admin-owned route renders the shell with zero console errors and
//      zero failed requests (fresh collectors per route)
//   2. a modal gauntlet: each admin modal type opens and closes in silence —
//      ui/Modal (View student), StudentEditModal, DiaryReviewModal, the inline
//      Add University modal, and the legacy .modal-content modals for company,
//      vacancy and placement flows (force clicks per Blocks 6/7/9)
//   3. logout ends the session and blocks /admin/dashboard
//
// Documented allowlist: none — every request this sweep can provoke is
// expected to succeed. The single /student/progress 404 probe for a viewer
// without a student profile lives in spec 12, which owns that page.

const ADMIN_ROUTES: Array<[string, string]> = [
  ['/admin/dashboard', 'Admin Dashboard'],
  ['/admin/users', 'User Management'],
  ['/admin/audit-logs', 'Audit Logs'],
  ['/admin/universities', 'University Management'],
  ['/admin/vacancies', 'Vacancies Management'],
  ['/admin/placements', 'Placement & Supervisor Management'],
  ['/company', 'Company Management'],
  ['/company/dashboard', 'Company Dashboard'],
  ['/university/dashboard', 'University Dashboard'],
  ['/university/students', 'Students'],
  ['/file-management', 'File Management'],
];

const STUDENTS_TABLE = 'table[aria-label="Registered students"]';
const DIARY_MARKER = 'E2E diary for sweep Block 13';

let seededDiaryId: number | undefined;

test.describe('99 sweep', () => {
  test.beforeAll(async ({ request }) => {
    // admin session for the sweep's own seed/cleanup
    const admin = await request.post(`${API}/api/login`, {
      form: { username: 'admin', password: 'admin123', role: 'ADMIN' },
    });
    expect(admin.ok()).toBeTruthy();

    const existing = await request.get(`${API}/api/diaries`);
    if (existing.ok()) {
      for (const d of (await existing.json()) as Array<{ id: number; dailyActivities: string }>) {
        if (d.dailyActivities === DIARY_MARKER) {
          await request.delete(`${API}/api/diaries/${d.id}`);
        }
      }
    }

    // the modal gauntlet needs a diary row to click Review on — seed as the student
    const student = await request.post(`${API}/api/login`, {
      form: { username: '2400101003', password: 'Student@123', role: 'STUDENT' },
    });
    expect(student.ok()).toBeTruthy();
    const created = await request.post(`${API}/api/diaries`, {
      data: {
        date: '2026-09-26',
        dailyActivities: DIARY_MARKER,
        knowledgeAndSkillsGained: 'Sweep modal coverage.',
        accomplishments: 'Seeded by the Block 13 sweep.',
        status: 'PENDING',
      },
    });
    expect(created.status()).toBe(201);
    seededDiaryId = ((await created.json()) as { id: number }).id;
  });

  test.afterAll(async ({ request }) => {
    if (seededDiaryId !== undefined) {
      const admin = await request.post(`${API}/api/login`, {
        form: { username: 'admin', password: 'admin123', role: 'ADMIN' },
      });
      if (admin.ok()) {
        await request.delete(`${API}/api/diaries/${seededDiaryId}`);
      }
    }
  });

  test('every admin route renders with no console errors or failed requests', async ({ page }) => {
    test.setTimeout(180_000);
    await login(page, 'admin', 'admin123');

    for (const [route, title] of ADMIN_ROUTES) {
      const consoleErrors = collectConsoleErrors(page);
      const failed = collectFailedRequests(page);

      await page.goto(route);
      await expectAppShell(page, title);
      await page.waitForTimeout(400); // let stragglers surface

      expect(consoleErrors, `console errors on ${route}`).toEqual([]);
      expect(failed, `failed requests on ${route}`).toEqual([]);
    }
  });

  test('modal gauntlet: every admin modal type opens and closes in silence', async ({ page }) => {
    test.setTimeout(120_000);
    await login(page, 'admin', 'admin123');
    const consoleErrors = collectConsoleErrors(page);
    const failed = collectFailedRequests(page);

    // students tab: ui/Modal (View) + StudentEditModal (Edit)
    await page.goto('/admin/dashboard');
    await expect(page.locator(`${STUDENTS_TABLE} tbody tr`)).toHaveCount(3, { timeout: 15_000 });
    await page.locator(`${STUDENTS_TABLE} tbody tr`).first().getByRole('button', { name: 'View' }).click();
    await expect(page.getByRole('heading', { name: 'Student Details' })).toBeVisible();
    await page.keyboard.press('Escape');
    await expect(page.getByRole('heading', { name: 'Student Details' })).toHaveCount(0);

    await page.locator(`${STUDENTS_TABLE} tbody tr`).first().getByRole('button', { name: 'Edit' }).click();
    await expect(page.locator('[role="dialog"]').getByText('Step 1 of 4')).toBeVisible();
    await page.locator('[role="dialog"]').getByRole('button', { name: 'Close modal' }).click();
    await expect(page.locator('[role="dialog"]')).toHaveCount(0);

    // diaries tab: DiaryReviewModal (legacy modal, force clicks)
    await page.getByRole('tab', { name: /Day Diary Logs/ }).click();
    const diaryRow = page.locator('table[aria-label="Day diary logs"] tbody tr', { hasText: DIARY_MARKER });
    await expect(diaryRow).toBeVisible({ timeout: 10_000 });
    await diaryRow.getByRole('button', { name: 'Review diary entry' }).click();
    await expect(page.locator('.modal-content h2')).toHaveText('Review Diary Entry');
    await page.getByRole('button', { name: 'Cancel' }).click({ force: true });
    await expect(page.locator('.modal-content h2')).toHaveCount(0);

    // universities: inline Add University modal
    await page.goto('/admin/universities');
    await page.getByRole('button', { name: 'Add University' }).first().click();
    await expect(page.locator('#uni-fullName')).toBeVisible();
    await page.getByRole('button', { name: 'Cancel' }).click();
    await expect(page.locator('#uni-fullName')).toHaveCount(0);

    // companies: legacy modal
    await page.goto('/company');
    await page.getByRole('button', { name: '+ Add Company' }).click();
    await expect(page.locator('.modal-content h2')).toHaveText('Add Company');
    await page.getByRole('button', { name: 'Cancel' }).click();
    await expect(page.locator('.modal-content h2')).toHaveCount(0);

    // vacancies: legacy modal
    await page.goto('/admin/vacancies');
    await page.getByRole('button', { name: 'Add Vacancy' }).click();
    await expect(page.locator('.modal-content h2')).toHaveText('Add Vacancy');
    await page.getByRole('button', { name: 'Cancel' }).click({ force: true });
    await expect(page.locator('.modal-content h2')).toHaveCount(0);

    // placements: Assign Supervisors modal + View details modal
    await page.goto('/admin/placements');
    await expect(page.locator('table tbody tr', { hasText: 'Kasagga Fred' })).toBeVisible({ timeout: 15_000 });
    await page.getByRole('button', { name: 'Assign Supervisors' }).click();
    await expect(page.getByText('Assign a student to a host company')).toBeVisible();
    await page.getByRole('button', { name: 'Cancel', exact: true }).click();
    await expect(page.getByText('Assign a student to a host company')).toHaveCount(0);

    await page.locator('table tbody tr', { hasText: 'Kasagga Fred' }).getByRole('button', { name: 'View placement details' }).click();
    await expect(page.getByText('Current Status')).toBeVisible();
    await page.getByRole('button', { name: 'Close' }).click();
    await expect(page.getByText('Current Status')).toHaveCount(0);

    expect(consoleErrors, `console errors: ${consoleErrors.join(' | ')}`).toEqual([]);
    expect(failed, `failed requests: ${failed.join(' | ')}`).toEqual([]);
  });

  test('logout ends the session and blocks the admin dashboard', async ({ page }) => {
    await login(page, 'admin', 'admin123');
    await page.getByRole('button', { name: 'Logout' }).click();
    await expect(page).toHaveURL(/\/login$/);

    await page.goto('/admin/dashboard');
    await page.waitForURL(/\/login$/, { timeout: 20_000 });
  });
});
