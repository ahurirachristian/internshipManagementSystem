import { test, expect, type Page, type Download } from '@playwright/test';
import * as fs from 'fs';
import { login, API } from './helpers';

// Block 11 — CSV download contract (content + storage location):
//
//   * H1 fixed: ExportButton now prefixes relative exportUrls with API_ROOT, so
//     the browser really requests http://localhost:8082/api/.../export/csv and
//     the server's CSV (with its Content-Disposition filename) is downloaded.
//   * H3 fixed: vacancies have no server CSV endpoint, so that button exports
//     the loaded rows client-side instead of saving JSON as ".csv".
//   * H2 decided: the server diaries export always contains every entry, so the
//     button passes the full list and the spec asserts the full count even with
//     an active search filter.
//
// Storage location: in this harness the download is intercepted by Playwright
// and saved to a temp path it controls; we re-save it under e2e/test-results/
// downloads/ and read it from there. A real user's browser saves to the OS
// Downloads directory — the app itself stores nothing anywhere server-side.

const DOWNLOAD_DIR = 'test-results/downloads';
const DIARY_MARKER = 'E2E diary for export Block 11';

async function saveDownload(download: Download): Promise<string> {
  fs.mkdirSync(DOWNLOAD_DIR, { recursive: true });
  const target = `${DOWNLOAD_DIR}/${download.suggestedFilename()}`;
  await download.saveAs(target);
  return target;
}

/** Triggers the download and records only the requests the click itself issues. */
async function exportAndRead(
  page: Page,
  trigger: () => Promise<void>
): Promise<{ filename: string; content: string; exportRequests: string[] }> {
  const exportRequests: string[] = [];
  const onReq = (r: { url: () => string }) => exportRequests.push(r.url());
  page.on('request', onReq);
  try {
    const [download] = await Promise.all([page.waitForEvent('download'), trigger()]);
    const filename = download.suggestedFilename();
    const path = await saveDownload(download);
    return { filename, content: fs.readFileSync(path, 'utf8'), exportRequests };
  } finally {
    page.off('request', onReq);
  }
}

function csvRows(content: string): string[] {
  return content.trim().split(/\r?\n/);
}

test.describe('11 csv downloads', () => {
  let seededDiaryId: number | undefined;

  test.beforeAll(async ({ request }) => {
    // admin session for cleanup/listing
    const admin = await request.post(`${API}/api/login`, {
      form: { username: 'admin', password: 'admin123', role: 'ADMIN' },
    });
    expect(admin.ok()).toBeTruthy();

    // sweep leftovers from earlier runs
    const existing = await request.get(`${API}/api/diaries`);
    if (existing.ok()) {
      for (const d of (await existing.json()) as Array<{ id: number; dailyActivities: string }>) {
        if (d.dailyActivities === DIARY_MARKER) {
          await request.delete(`${API}/api/diaries/${d.id}`);
        }
      }
    }

    // the diaries export needs at least one entry to be meaningful — seed as the student
    const student = await request.post(`${API}/api/login`, {
      form: { username: '2400101003', password: 'Student@123', role: 'STUDENT' },
    });
    expect(student.ok()).toBeTruthy();
    const created = await request.post(`${API}/api/diaries`, {
      data: {
        date: '2026-09-25',
        dailyActivities: DIARY_MARKER,
        knowledgeAndSkillsGained: 'Export contract verification.',
        accomplishments: 'Seeded by the Block 11 E2E spec.',
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

  test.beforeEach(async ({ page }) => {
    await login(page, 'admin', 'admin123');
  });

  test('students export: server CSV fetched, correct name, real content, row count matches', async ({ page }) => {
    await page.goto('/admin/dashboard');
    const table = page.locator('table[aria-label="Registered students"]');
    await expect(table.locator('tbody tr')).toHaveCount(3, { timeout: 15_000 });

    // the button lives in the card header, above the table — scope to the page
    const { filename, content, exportRequests } = await exportAndRead(page, () =>
      page.getByRole('button', { name: /Export CSV/ }).first().click()
    );

    expect(filename).toBe('students.csv');
    // H1 proof: the click itself requested the absolute backend URL
    expect(exportRequests).toContain(`${API}/api/students/export/csv`);
    // not an HTML file wearing a .csv name
    expect(content.trimStart().startsWith('<')).toBe(false);
    const rows = csvRows(content);
    expect(rows[0]).toBe(
      'ID,FullName,StudentNumber,RegistrationNumber,Phone,DegreeProgram,InternshipCompanyId,UniSupervisorId,IndSupervisorId,StartDate,EndDate'
    );
    expect(rows).toHaveLength(1 + 3); // header + one row per student on screen
    expect(content).toContain('Kasagga Fred');
  });

  test('diaries export: server CSV with the full entry set (H2 decided: export all)', async ({ page }) => {
    const listResp = await page.request.get(`${API}/api/diaries`);
    const all = (await listResp.json()) as Array<Record<string, unknown>>;
    expect(all.length).toBeGreaterThanOrEqual(1);

    await page.goto('/admin/dashboard');
    await page.getByRole('tab', { name: /Day Diary Logs/ }).click();
    await expect(page.locator('table[aria-label="Day diary logs"] tbody tr').first()).toBeVisible({ timeout: 15_000 });

    // even with an active search filter the export contains every entry
    await page.getByPlaceholder('Search dashboard...').fill('Kasagga');

    const { filename, content, exportRequests } = await exportAndRead(page, () =>
      page.getByRole('button', { name: /Export CSV/ }).first().click()
    );

    expect(filename).toBe('diaries.csv');
    expect(exportRequests).toContain(`${API}/api/diaries/export/csv`);
    expect(content.trimStart().startsWith('<')).toBe(false);
    const rows = csvRows(content);
    expect(rows[0]).toBe('ID,Date,Student,StudentNo,DailyActivities,KnowledgeAndSkillsGained,Accomplishments');
    expect(rows).toHaveLength(1 + all.length);
    expect(content).toContain('Kasagga Fred');
  });

  test('universities export: server CSV fetched with the projected columns', async ({ page }) => {
    await page.goto('/admin/universities');
    await expect(page.locator('h1.page-title')).toHaveText('University Management');
    await expect(page.locator('table tbody tr').first()).toBeVisible({ timeout: 15_000 });

    const { filename, content, exportRequests } = await exportAndRead(page, () =>
      page.getByRole('button', { name: /Export CSV/ }).click()
    );

    expect(filename).toBe('universities.csv');
    expect(exportRequests).toContain(`${API}/api/universities/export/csv`);
    expect(content.trimStart().startsWith('<')).toBe(false);
    const rows = csvRows(content);
    expect(rows[0]).toBe('ID,ShortForm,FullName,Country,EstablishedYear');
    expect(rows.length).toBeGreaterThan(10); // 51 seeded universities
    expect(content).toContain('Makerere');
  });

  test('companies export: server CSV fetched with header and Airtel row', async ({ page }) => {
    await page.goto('/company');
    await expect(page.locator('h1.page-title')).toHaveText('Company Management');

    const { filename, content, exportRequests } = await exportAndRead(page, () =>
      page.getByRole('button', { name: /Export CSV/ }).first().click()
    );

    expect(filename).toBe('companies.csv');
    expect(exportRequests).toContain(`${API}/api/companies/export/csv`);
    expect(content.trimStart().startsWith('<')).toBe(false);
    const rows = csvRows(content);
    expect(rows[0]).toBe('ID,Name,Country,City,Email,Website,Postal Address,Physical Address');
    expect(content).toContain('Airtel');
  });

  test('placements export: server CSV fetched with header and seeded rows', async ({ page }) => {
    await page.goto('/admin/placements');
    await expect(page.locator('h1.page-title')).toHaveText('Placement & Supervisor Management');
    await expect(page.locator('table tbody tr', { hasText: 'Kasagga Fred' })).toBeVisible({ timeout: 15_000 });

    const { filename, content, exportRequests } = await exportAndRead(page, () =>
      page.getByRole('button', { name: /Export CSV/ }).first().click()
    );

    expect(filename).toBe('placements.csv');
    expect(exportRequests.some((u) => u.includes('/api/placements/export/csv'))).toBe(true);
    expect(content.trimStart().startsWith('<')).toBe(false);
    const rows = csvRows(content);
    expect(rows[0]).toBe('ID,StudentId,CompanyId,UniversitySupervisor,CompanySupervisor,Status');
    expect(content).toContain('ACTIVE');
  });

  test('vacancies export: client-side CSV of the loaded rows (H3 fixed)', async ({ page }) => {
    await page.goto('/admin/vacancies');
    await expect(page.getByRole('heading', { name: 'Vacancies Management' }).nth(1)).toBeVisible();
    await expect(page.locator('table tbody tr', { hasText: 'Software Development Intern' })).toBeVisible({ timeout: 15_000 });

    const { filename, content, exportRequests } = await exportAndRead(page, () =>
      page.getByRole('button', { name: /Export CSV/ }).click()
    );

    expect(filename).toBe('vacancies.csv');
    // the click itself issued no request at all — the CSV is built in the browser
    expect(exportRequests.filter((u) => u.includes('/api/vacancies'))).toEqual([]);
    expect(content.trimStart().startsWith('<')).toBe(false);
    const rows = csvRows(content);
    expect(rows[0]).toBe('title,description,companyId,location,requirements,status,deadline,createdAt,id');
    expect(rows).toHaveLength(1 + 3); // the three seeded vacancies
    expect(content).toContain('Software Development Intern');
  });
});
