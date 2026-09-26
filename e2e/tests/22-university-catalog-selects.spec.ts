import { expect, test, type Page } from '@playwright/test';
import { API, loginAs } from './helpers';

/**
 * The Schools / Departments / Programmes management dialogs used to render native
 * <select> elements that ignored the RIHO design system (see the Audit Logs
 * Filters section for the reference control, CustomSelect). These tests lock the
 * converted modals in: no native <select>, design-system popup buttons, and the
 * selected value actually persisted through the API.
 */

const DEPT_ID = 99011;
const DEPT_NAME = 'E2E Design System Dept';
const SCHOOL_ID = 99021;
const SCHOOL_NAME = 'E2E Design System School';
const SCHOOL_CODE = 'E2E-DS';
const PROG_ID = 99031;
const PROG_NAME = 'E2E Design System Programme';
const PROG_CODE = 'E2E-DS-001';

/** Opens a modal and returns a locator scoped to the visible dialog panel. */
function dialog(page: Page) {
  return page.locator('div.fixed.inset-0').last();
}

/** Opens a CustomSelect, picks the option at `index`, and returns its label. */
async function pickNthOption(page: Page, selectId: string, index: number): Promise<string> {
  await page.locator(`#${selectId}`).click();
  const options = page.getByRole('option');
  const label = (await options.nth(index).innerText()).trim();
  await options.nth(index).click();
  return label;
}

/** Opens a CustomSelect and picks the option with `label`. */
async function pickOption(page: Page, selectId: string, label: string): Promise<void> {
  await page.locator(`#${selectId}`).click();
  await page.getByRole('option', { name: label, exact: true }).click();
}

test.describe('University catalog modals use the design-system dropdowns', () => {
  test.beforeEach(async ({ page }) => {
    await loginAs(page, 'SUPERVISOR');
  });

  // Best-effort cleanup so re-runs stay deterministic (children before parents).
  test.afterEach(async ({ page }) => {
    await page.request.delete(`${API}/api/university/programmes/${PROG_ID}`);
    await page.request.delete(`${API}/api/university/departments/${DEPT_ID}`);
    await page.request.delete(`${API}/api/university/schools/${SCHOOL_ID}`);
  });

  test('Schools dialog replaces the Type select and persists the chosen type', async ({ page }) => {
    await page.goto('/university/schools');
    await page.getByRole('button', { name: 'Add School' }).click();
    const modal = dialog(page);

    await expect(modal.locator('select')).toHaveCount(0);
    const typeSelect = page.locator('#school-type');
    await expect(typeSelect).toHaveAttribute('aria-haspopup', 'listbox');

    const inputs = modal.locator('input');
    await inputs.nth(0).fill(String(SCHOOL_ID));
    await inputs.nth(1).fill(SCHOOL_NAME);
    await inputs.nth(2).fill(SCHOOL_CODE);
    await pickOption(page, 'school-type', 'COLLEGE');
    await expect(typeSelect).toHaveText('COLLEGE');

    await modal.getByRole('button', { name: 'Create' }).click();
    await expect(modal).toHaveCount(0);

    const row = page.locator('table tbody tr', { hasText: SCHOOL_NAME });
    await expect(row).toBeVisible();
    await expect(row).toContainText('COLLEGE');

    const response = await page.request.get(`${API}/api/university/schools`);
    const schools = (await response.json()) as Array<{
      schoolId: number;
      schoolName: string;
      type: string;
    }>;
    const created = schools.find((s) => s.schoolId === SCHOOL_ID);
    expect(created?.schoolName).toBe(SCHOOL_NAME);
    expect(created?.type).toBe('COLLEGE');
  });

  test('Departments dialog validates the design-system school picker inline', async ({ page }) => {
    await page.goto('/university/departments');
    await page.getByRole('button', { name: 'Add Department' }).click();
    const modal = dialog(page);

    await expect(modal.locator('select')).toHaveCount(0);
    const schoolSelect = page.locator('#dept-school');
    await expect(schoolSelect).toHaveAttribute('aria-haspopup', 'listbox');

    const inputs = modal.locator('input');
    await inputs.nth(0).fill(String(DEPT_ID));
    await inputs.nth(1).fill(DEPT_NAME);

    // Saving without a school must surface inside the dialog, not behind it.
    await modal.getByRole('button', { name: 'Create' }).click();
    await expect(modal.getByRole('alert')).toContainText('required');

    const schoolLabel = await pickNthOption(page, 'dept-school', 1);
    await expect(schoolSelect).toHaveText(schoolLabel);

    await modal.getByRole('button', { name: 'Create' }).click();
    await expect(modal).toHaveCount(0);

    const row = page.locator('table tbody tr', { hasText: DEPT_NAME });
    await expect(row).toBeVisible();
    await expect(row).toContainText(schoolLabel);

    const response = await page.request.get(`${API}/api/university/departments`);
    const departments = (await response.json()) as Array<{
      departmentId: number;
      departmentName: string;
      schoolId: number;
    }>;
    const created = departments.find((d) => d.departmentId === DEPT_ID);
    expect(created?.departmentName).toBe(DEPT_NAME);
    // The value chosen in CustomSelect must still reach the API as a number.
    expect(typeof created?.schoolId).toBe('number');
  });

  test('Programmes dialog uses design-system controls for level, school and department', async ({
    page,
  }) => {
    await page.goto('/university/programmes');
    await page.getByRole('button', { name: 'Add Programme' }).click();
    const modal = dialog(page);

    await expect(modal.locator('select')).toHaveCount(0);
    for (const id of ['programme-level', 'programme-school', 'programme-department']) {
      await expect(page.locator(`#${id}`)).toHaveAttribute('aria-haspopup', 'listbox');
    }

    const inputs = modal.locator('input');
    await inputs.nth(0).fill(String(PROG_ID));
    await inputs.nth(1).fill(PROG_CODE);
    await inputs.nth(2).fill(PROG_NAME);
    await inputs.nth(3).fill('3');
    await pickOption(page, 'programme-level', 'Bachelors');
    await pickNthOption(page, 'programme-school', 1);

    await modal.getByRole('button', { name: 'Create' }).click();
    await expect(modal).toHaveCount(0);

    // The list is paginated, so filter down to the record we just created.
    await page.getByPlaceholder('Search programmes...').fill(PROG_NAME);
    const row = page.locator('table tbody tr', { hasText: PROG_NAME });
    await expect(row).toBeVisible();
    await expect(row).toContainText('Bachelors');

    const response = await page.request.get(`${API}/api/university/programmes`);
    const programmes = (await response.json()) as Array<{
      programmeId: number;
      programmeName: string;
      programmeLevel: string;
      durationYears: number;
      schoolId: number;
    }>;
    const created = programmes.find((p) => p.programmeId === PROG_ID);
    expect(created?.programmeName).toBe(PROG_NAME);
    expect(created?.programmeLevel).toBe('Bachelors');
    expect(created?.durationYears).toBe(3);
    expect(typeof created?.schoolId).toBe('number');
  });
});
