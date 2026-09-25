import { test, expect, type Page } from '@playwright/test';
import { login, loginAs, API, collectFailedRequests } from './helpers';

// Block 9 — Diary review + feedback flow:
//
//   seed: one DayDiary for student 2400101003 (Kasagga Fred) via POST /api/diaries
//         (the SPA has no diary-create form; the API is the real entry point)
//   admin: /admin/dashboard → Day Diary Logs tab → Review modal → feedback save
//          → status/remarks/both supervisor comments persist (verified via API)
//          → reopening the modal shows the saved values (regression for the stale
//            list bug: the dashboard now refetches after a save)
//   student: /student/day-diaries shows the real entry + supervisor comments
//          (previously the page fetched /api/diaries/student/<studentNo> which
//            403'd for its owner and silently fell back to mock data)
//          and no longer offers a comment form that could only ever 403
//            (POST /api/diaries/{id}/feedback is ADMIN/SUPERVISOR only)

const MARKER = 'E2E diary marker activity Block 9';
const REMARKS = 'E2E remarks: solid, verifiable log entry.';
const INDUSTRIAL_COMMENT = 'E2E industrial comment: good engagement on site.';
const UNIVERSITY_COMMENT = 'E2E university comment: tie this to your learning outcomes.';

let diaryId: number | undefined;

async function openDiariesTab(page: Page) {
  await page.goto('/admin/dashboard');
  // wait for data before trusting tab counts / switching tabs
  await expect(page.locator('table tbody tr', { hasText: 'Kasagga Fred' })).toBeVisible({ timeout: 15_000 });
  await page.getByRole('tab', { name: /Day Diary Logs/ }).click();
  await expect(page.locator('h3', { hasText: 'Day Diary Logs' })).toBeVisible();
  const row = page.locator('table tbody tr', { hasText: MARKER });
  await expect(row).toBeVisible({ timeout: 10_000 });
  return row;
}

test.describe('09 diary review', () => {
  test.beforeAll(async ({ request }) => {
    // admin session: remove leftovers from earlier runs
    const adminLogin = await request.post(`${API}/api/login`, {
      form: { username: 'admin', password: 'admin123', role: 'ADMIN' },
    });
    expect(adminLogin.ok()).toBeTruthy();
    const list = await request.get(`${API}/api/diaries`);
    if (list.ok()) {
      for (const d of (await list.json()) as Array<{ id: number; dailyActivities: string }>) {
        if (d.dailyActivities === MARKER) {
          await request.delete(`${API}/api/diaries/${d.id}`);
        }
      }
    }

    // student session: the creator must resolve to a Student row, so seed as the student
    const studentLogin = await request.post(`${API}/api/login`, {
      form: { username: '2400101003', password: 'Student@123', role: 'STUDENT' },
    });
    expect(studentLogin.ok()).toBeTruthy();
    const created = await request.post(`${API}/api/diaries`, {
      data: {
        date: '2026-09-24',
        dailyActivities: MARKER,
        knowledgeAndSkillsGained: 'Regression testing of the diary feedback flow.',
        accomplishments: 'Seeded by the Block 9 E2E spec.',
        accountNumber: 'IMS-E2E9',
        action: 'Created by automated test.',
        technologyTools: 'Playwright',
        status: 'PENDING',
      },
    });
    expect(created.status()).toBe(201);
    diaryId = ((await created.json()) as { id: number }).id;
    expect(diaryId).toBeDefined();
  });

  test.afterAll(async ({ request }) => {
    if (diaryId !== undefined) {
      const adminLogin = await request.post(`${API}/api/login`, {
        form: { username: 'admin', password: 'admin123', role: 'ADMIN' },
      });
      if (adminLogin.ok()) {
        await request.delete(`${API}/api/diaries/${diaryId}`);
      }
    }
  });

  test.beforeEach(async ({ page }) => {
    await login(page, 'admin', 'admin123');
  });

  test('admin dashboard students tab marks the diary-active student as Active', async ({ page }) => {
    await page.goto('/admin/dashboard');
    const row = page.locator('table tbody tr', { hasText: 'Kasagga Fred' });
    await expect(row).toBeVisible({ timeout: 15_000 });
    await expect(row.getByText('Active', { exact: true })).toBeVisible();
  });

  test('seeded diary appears in the Day Diary Logs tab', async ({ page }) => {
    await openDiariesTab(page);
  });

  test('review modal shows the entry details and Cancel saves nothing', async ({ page }) => {
    const row = await openDiariesTab(page);
    await row.getByRole('button', { name: 'Review diary entry' }).click();
    await expect(page.locator('.modal-content h2')).toHaveText('Review Diary Entry');

    const activities = page
      .locator('.modal-content .detail-item', { hasText: 'Daily Activities' })
      .locator('.detail-value');
    await expect(activities).toHaveText(MARKER);

    await page.getByRole('button', { name: 'Cancel' }).click({ force: true });
    await expect(page.locator('.modal-content h2')).toHaveCount(0);

    // status unchanged on the server
    const resp = await page.request.get(`${API}/api/diaries/${diaryId}`);
    expect(resp.ok()).toBeTruthy();
    expect(((await resp.json()) as { status: string }).status).toBe('PENDING');
  });

  test('feedback save persists status, remarks and both supervisor comments', async ({ page }) => {
    const failures = collectFailedRequests(page);
    const row = await openDiariesTab(page);
    await row.getByRole('button', { name: 'Review diary entry' }).click();

    await page
      .locator('.modal-content label', { hasText: 'Feedback / Remarks' })
      .locator('textarea')
      .fill(REMARKS);
    await page
      .locator('.modal-content label', { hasText: 'Industrial Supervisor Comment' })
      .locator('textarea')
      .fill(INDUSTRIAL_COMMENT);
    await page
      .locator('.modal-content label', { hasText: 'University Supervisor Comment' })
      .locator('textarea')
      .fill(UNIVERSITY_COMMENT);
    await page.locator('.modal-content select').selectOption('APPROVED');

    await page.getByRole('button', { name: 'Save Feedback' }).click({ force: true });
    await expect(page.locator('.modal-content h2')).toHaveCount(0);

    const resp = await page.request.get(`${API}/api/diaries/${diaryId}`);
    expect(resp.ok()).toBeTruthy();
    const saved = (await resp.json()) as {
      status: string;
      feedback: string;
      industrialSupervisorComment: string;
      universitySupervisorComment: string;
    };
    expect(saved.status).toBe('APPROVED');
    expect(saved.feedback).toBe(REMARKS);
    expect(saved.industrialSupervisorComment).toBe(INDUSTRIAL_COMMENT);
    expect(saved.universitySupervisorComment).toBe(UNIVERSITY_COMMENT);
    expect(failures).toEqual([]);
  });

  test('reopening the review modal shows the saved values (list is refreshed after save)', async ({ page }) => {
    const row = await openDiariesTab(page);
    await row.getByRole('button', { name: 'Review diary entry' }).click();

    await expect(
      page.locator('.modal-content label', { hasText: 'Feedback / Remarks' }).locator('textarea')
    ).toHaveValue(REMARKS);
    await expect(
      page.locator('.modal-content label', { hasText: 'Industrial Supervisor Comment' }).locator('textarea')
    ).toHaveValue(INDUSTRIAL_COMMENT);
    await expect(
      page.locator('.modal-content label', { hasText: 'University Supervisor Comment' }).locator('textarea')
    ).toHaveValue(UNIVERSITY_COMMENT);
    await expect(page.locator('.modal-content select')).toHaveValue('APPROVED');

    await page.getByRole('button', { name: 'Cancel' }).click({ force: true });
    await expect(page.locator('.modal-content h2')).toHaveCount(0);
    await expect(page.locator('table tbody tr', { hasText: MARKER })).toBeVisible();
  });

  test('student sees the real entry and supervisor comments — no mock fallback, no dead form', async ({ page }) => {
    // beforeEach left an admin session in this context; drop it so /login renders the form
    await page.context().clearCookies();
    await loginAs(page, 'STUDENT');
    const failures = collectFailedRequests(page);
    await page.goto('/student/day-diaries');
    await expect(page.locator('h1.page-title')).toHaveText('Day Diaries');

    // real data loaded: exactly the seeded entry, no mock pool items, no error banner
    await expect(page.locator('.files-count')).toHaveText('1 entries');
    await expect(page.locator('table tbody tr', { hasText: MARKER })).toBeVisible();
    await expect(page.getByText('Unable to load diary entries')).toHaveCount(0);
    await expect(
      page.getByText('Reviewed pull requests and merged feature branches into staging.')
    ).toHaveCount(0);

    // supervisor panels show the feedback saved by the admin earlier in this suite
    await expect(page.locator('.supervisor-industrial').getByText(INDUSTRIAL_COMMENT)).toBeVisible();
    await expect(page.locator('.supervisor-institute').getByText(UNIVERSITY_COMMENT)).toBeVisible();

    // the dead comment form is gone (it could only ever hit a 403)
    await expect(page.getByRole('button', { name: 'Submit Comment' })).toHaveCount(0);
    await expect(
      page.getByText('Comments on diary entries are provided by your industrial and university supervisors after review.')
    ).toBeVisible();

    // the details modal shows the remark
    await page.locator('table tbody tr', { hasText: MARKER }).getByRole('button', { name: 'View' }).click();
    await expect(page.locator('.modal-content h2')).toHaveText('Diary Entry Details');
    await expect(
      page.locator('.modal-content .detail-item', { hasText: 'Remark' }).locator('.detail-value')
    ).toHaveText(REMARKS);
    await page.locator('.modal-content .close-button').click({ force: true });
    await expect(page.locator('.modal-content h2')).toHaveCount(0);

    expect(failures).toEqual([]);
  });
});
