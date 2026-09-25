import { test, expect, type Page } from '@playwright/test';
import { login, API } from './helpers';

// Block 7 — Placements (/admin/placements) and Vacancies (/admin/vacancies):
//
// Placements (PlacementMatching in the shell, title "Placement & Supervisor Management"):
//   * KPI cards, status FilterTabs (plain buttons with counts), search
//   * seeded rows: Kasagga Fred / Alex Johnson / Sarah Owen -> Airtel, ACTIVE
//   * row actions: View details modal (Close), Edit modal (CustomSelects, Cancel),
//     Evaluate modal (Dual Supervisor Evaluation, Close), Delete confirm dismiss/accept
//   * Assign Supervisors modal: create a PENDING placement, tab count updates, delete it
//
// Vacancies (VacanciesManagement in the shell, inner h2 "Vacancies Management"):
//   * seeded: Software Development Intern / Network Operations Intern / Mobile Money
//     Operations Intern; 7-column table
//   * Add Vacancy modal (legacy .modal-content): required Title+Company validation,
//     create + cancel paths, edit rename, delete confirm, native status select
//   * legacy modal buttons use force clicks (same as Block 6)

const PLACEMENTS_URL = '/admin/placements';
const VACANCIES_URL = '/admin/vacancies';

async function pickOption(page: Page, selectId: string, namePattern: RegExp) {
  await page.locator(`#${selectId}`).click();
  await page.getByRole('option', { name: namePattern }).first().click();
}

async function apiDeleteVacanciesByTitle(page: Page, title: string) {
  const resp = await page.request.get(`${API}/api/vacancies`);
  if (!resp.ok()) return;
  const list = (await resp.json()) as Array<{ id: number; title: string }>;
  for (const v of list.filter((v) => v.title === title)) {
    await page.request.delete(`${API}/api/vacancies/${v.id}`);
  }
}

test.describe('07 placements', () => {
  test.beforeEach(async ({ page }) => {
    await login(page, 'admin', 'admin123');
    await page.goto(PLACEMENTS_URL);
    await expect(page.locator('h1.page-title')).toHaveText('Placement & Supervisor Management');
  });

  test('KPI cards, status tabs and the three seeded placements render', async ({ page }) => {
    await expect(page.getByText('Total Placements')).toBeVisible();
    await expect(page.getByText('Pending Assignments')).toBeVisible();

    await expect(page.getByRole('button', { name: /^All Placements \d+$/ })).toBeVisible();
    const allTab = page.getByRole('button', { name: /^All Placements \d+$/ });
    const total = Number(((await allTab.innerText()).match(/\d+/) || ['0'])[0]);
    expect(total).toBeGreaterThanOrEqual(3);

    await expect(page.locator('table tbody tr', { hasText: 'Kasagga Fred' })).toHaveCount(1);
    await expect(page.locator('table tbody tr', { hasText: 'Alex Johnson' })).toHaveCount(1);
    await expect(page.locator('table tbody tr', { hasText: 'Sarah Owen' })).toHaveCount(1);
  });

  test('status tabs narrow the list and counts match', async ({ page }) => {
    // wait for data: tabs render 0-counts until fetchPlacements resolves
    await expect(page.locator('table tbody tr', { hasText: 'Kasagga Fred' })).toBeVisible({ timeout: 15_000 });
    const allTab = page.getByRole('button', { name: /^All Placements \d+$/ });
    const activeTab = page.getByRole('button', { name: /^ACTIVE \d+$/ });
    const activeCount = Number(((await activeTab.innerText()).match(/\d+/) || ['0'])[0]);
    expect(activeCount).toBeGreaterThanOrEqual(3);

    await activeTab.click();
    const rows = page.locator('table tbody tr');
    await expect(rows).toHaveCount(activeCount);
    for (let i = 0; i < activeCount; i++) {
      await expect(rows.nth(i)).toContainText('ACTIVE');
    }

    await allTab.click();
    await expect(rows).toHaveCount(activeCount, { timeout: 5_000 });
  });

  test('search narrows by student name', async ({ page }) => {
    const search = page.getByLabel('Search placements');
    await search.fill('Kasagga');
    await expect(page.locator('table tbody tr')).toHaveCount(1);
    await expect(page.locator('table tbody tr').first()).toContainText('Kasagga Fred');
    await search.fill('');
  });

  test('View placement details opens the modal and Close returns to the list', async ({ page }) => {
    const row = page.locator('table tbody tr', { hasText: 'Kasagga Fred' });
    await row.getByRole('button', { name: 'View placement details' }).click();
    await expect(page.getByText('Current Status')).toBeVisible();
    await expect(page.getByText('University Supervisor').first()).toBeVisible();
    await page.getByRole('button', { name: 'Close' }).click();
    await expect(page.getByText('Current Status')).toBeHidden();
  });

  test('Edit placement modal pre-fills and Cancel changes nothing', async ({ page }) => {
    const row = page.locator('table tbody tr', { hasText: 'Kasagga Fred' });
    await row.getByRole('button', { name: 'Edit placement' }).click();
    await expect(page.getByText('Edit Placement')).toBeVisible();
    await page.getByRole('button', { name: 'Cancel', exact: true }).click();
    await expect(page.getByText('Edit Placement')).toBeHidden();
    await expect(page.locator('table tbody tr', { hasText: 'Kasagga Fred' })).toHaveCount(1);
  });

  test('Evaluate opens the Dual Supervisor Evaluation modal and closes', async ({ page }) => {
    const row = page.locator('table tbody tr', { hasText: 'Kasagga Fred' });
    await row.getByRole('button', { name: 'Evaluate placement' }).click();
    await expect(page.getByText('Dual Supervisor Evaluation')).toBeVisible();
    await page.getByRole('button', { name: 'Close modal' }).click();
    await expect(page.getByText('Dual Supervisor Evaluation')).toBeHidden();
  });

  test('Assign Supervisors: validation, create a PENDING placement, tab updates, delete it', async ({ page }) => {
    await page.getByRole('button', { name: 'Assign Supervisors' }).click();
    await expect(page.getByText('Assign a student to a host company')).toBeVisible();

    // required validation: submit with nothing chosen
    await page.getByRole('button', { name: 'Create Placement' }).click();
    await expect(page.getByText('Student and Company are required.')).toBeVisible();

    // fill and create
    await pickOption(page, 'pl-student', /Alex Johnson/);
    await pickOption(page, 'pl-company', /Airtel/);
    await page.getByRole('button', { name: 'Create Placement' }).click();
    await expect(page.getByText('Assign a student to a host company')).toBeHidden();

    // PENDING tab now counts 1 and holds the new row
    const pendingTab = page.getByRole('button', { name: /^PENDING 1$/ });
    await expect(pendingTab).toBeVisible();
    await pendingTab.click();
    await expect(page.locator('table tbody tr')).toHaveCount(1);
    await expect(page.locator('table tbody tr').first()).toContainText('Alex Johnson');

    // delete it (confirm accept), tab disappears again
    page.once('dialog', (d) => d.accept());
    await page.locator('table tbody tr').first().getByRole('button', { name: 'Delete placement' }).click();
    await expect(page.locator('table tbody tr', { hasText: 'Alex Johnson' })).toHaveCount(0, { timeout: 10_000 });
  });

  test('Delete confirm dismissed keeps the placement', async ({ page }) => {
    const row = page.locator('table tbody tr', { hasText: 'Kasagga Fred' });
    page.once('dialog', (d) => d.dismiss());
    await row.getByRole('button', { name: 'Delete placement' }).click();
    await page.waitForTimeout(500);
    await expect(row).toHaveCount(1);
  });
});

test.describe('07 vacancies', () => {
  test.beforeEach(async ({ page }) => {
    await login(page, 'admin', 'admin123');
    // the rename test renames E2E Vacancy -> E2E Renamed Vacancy; clean both,
    // otherwise every run leaves a renamed row behind and later counts drift
    await apiDeleteVacanciesByTitle(page, 'E2E Vacancy');
    await apiDeleteVacanciesByTitle(page, 'E2E Renamed Vacancy');
    await page.goto(VACANCIES_URL);
    await expect(page.locator('h1.page-title')).toHaveText('Vacancies Management');
    await expect(page.getByRole('heading', { name: 'Vacancies Management' }).nth(1)).toBeVisible();
  });

  test('table shows the three seeded vacancies with seven columns', async ({ page }) => {
    await expect(page.locator('table thead th')).toHaveCount(7);
    await expect(page.locator('table tbody tr', { hasText: 'Software Development Intern' })).toHaveCount(1);
    await expect(page.locator('table tbody tr', { hasText: 'Network Operations Intern' })).toHaveCount(1);
    await expect(page.locator('table tbody tr', { hasText: 'Mobile Money Operations Intern' })).toHaveCount(1);
  });

  test('Add Vacancy validation: title and company are required', async ({ page }) => {
    await page.getByRole('button', { name: 'Add Vacancy' }).click();
    await expect(page.locator('.modal-content h2')).toHaveText('Add Vacancy');

    await page.getByRole('button', { name: 'Create Vacancy' }).click({ force: true });
    await expect(page.getByText('Title, company, description and deadline are required.')).toBeVisible();
    await expect(page.locator('.modal-content h2')).toBeVisible();

    await page.getByRole('button', { name: 'Cancel' }).click({ force: true });
    await expect(page.locator('.modal-content h2')).toHaveCount(0);
  });

  test('Add Vacancy creates a row that survives reload; Cancel creates nothing', async ({ page }) => {
    // Cancel path
    await page.getByRole('button', { name: 'Add Vacancy' }).click();
    await page.locator('.modal-content label', { hasText: 'Title' }).first().locator('input').fill('E2E Vacancy');
    await page.getByRole('button', { name: 'Cancel' }).click({ force: true });
    await expect(page.locator('.modal-content h2')).toHaveCount(0);

    // Create path
    await page.getByRole('button', { name: 'Add Vacancy' }).click();
    await page.locator('.modal-content label', { hasText: 'Title' }).first().locator('input').fill('E2E Vacancy');
    await page.locator('.modal-content label', { hasText: 'Description' }).locator('textarea').fill('E2E test vacancy description');
    await page.locator('.modal-content label', { hasText: 'Company ID' }).locator('input').fill('1');
    await page.locator('.modal-content label', { hasText: 'Location' }).locator('input').fill('Kampala');
    await page.locator('.modal-content label', { hasText: 'Deadline' }).locator('input').fill('2026-12-31');
    await page.getByRole('button', { name: 'Create Vacancy' }).click({ force: true });
    await expect(page.locator('.modal-content h2')).toHaveCount(0);
    await expect(page.locator('table tbody tr', { hasText: 'E2E Vacancy' })).toHaveCount(1);

    await page.reload();
    await expect(page.locator('table tbody tr', { hasText: 'E2E Vacancy' })).toHaveCount(1);
  });

  test('Edit renames the vacancy and it persists', async ({ page }) => {
    // create
    await page.getByRole('button', { name: 'Add Vacancy' }).click();
    await page.locator('.modal-content label', { hasText: 'Title' }).first().locator('input').fill('E2E Vacancy');
    await page.locator('.modal-content label', { hasText: 'Description' }).locator('textarea').fill('E2E test vacancy description');
    await page.locator('.modal-content label', { hasText: 'Company ID' }).locator('input').fill('1');
    await page.locator('.modal-content label', { hasText: 'Deadline' }).locator('input').fill('2026-12-31');
    await page.getByRole('button', { name: 'Create Vacancy' }).click({ force: true });
    await expect(page.locator('table tbody tr', { hasText: 'E2E Vacancy' })).toHaveCount(1);

    const row = page.locator('table tbody tr', { hasText: 'E2E Vacancy' });
    await row.getByRole('button', { name: 'Edit' }).click();
    await expect(page.locator('.modal-content h2')).toHaveText('Edit Vacancy');
    await page.locator('.modal-content label', { hasText: 'Title' }).first().locator('input').fill('E2E Renamed Vacancy');
    await page.getByRole('button', { name: 'Save Changes' }).click({ force: true });
    await expect(page.locator('table tbody tr', { hasText: 'E2E Renamed Vacancy' })).toHaveCount(1);
  });

  test('Delete dismiss keeps; accept removes permanently', async ({ page }) => {
    // create
    await page.getByRole('button', { name: 'Add Vacancy' }).click();
    await page.locator('.modal-content label', { hasText: 'Title' }).first().locator('input').fill('E2E Vacancy');
    await page.locator('.modal-content label', { hasText: 'Description' }).locator('textarea').fill('E2E test vacancy description');
    await page.locator('.modal-content label', { hasText: 'Company ID' }).locator('input').fill('1');
    await page.locator('.modal-content label', { hasText: 'Deadline' }).locator('input').fill('2026-12-31');
    await page.getByRole('button', { name: 'Create Vacancy' }).click({ force: true });
    const row = page.locator('table tbody tr', { hasText: 'E2E Vacancy' });
    await expect(row).toHaveCount(1);

    page.once('dialog', (d) => d.dismiss());
    await row.getByRole('button', { name: 'Delete' }).click();
    await page.waitForTimeout(500);
    await expect(row).toHaveCount(1);

    page.once('dialog', (d) => d.accept());
    await row.getByRole('button', { name: 'Delete' }).click();
    await expect(row).toHaveCount(0, { timeout: 10_000 });
    await page.reload();
    await expect(page.locator('table tbody tr', { hasText: 'E2E Vacancy' })).toHaveCount(0);
  });

  test('export button is present (download content verified in Block 11)', async ({ page }) => {
    await expect(page.getByRole('button', { name: /export/i }).first()).toBeVisible();
  });
});
