import { test, expect, type Page } from '@playwright/test';
import { login, API } from './helpers';

// Block 6 — Company Management (/company):
//   * the route wraps CompanyPage in DashboardLayout (title "Company Management")
//   * 8-column table + Add Company modal with the 8 fields and Cancel/Create buttons
//   * custom validation: name, email, website required (component checks before submit)
//   * create/edit/delete with confirm dialog; persistence proven via reload
//   * export button presence (download content verified in Block 11)
//
// Clicks inside .modal-content use force: the riho backdrop-filter/transform
// animation keeps elements perpetually "unstable" for the default check;

const PAGE_URL = '/company';
const MODAL_TITLE = '.modal-content h2';

async function apiDeleteByName(page: Page, name: string) {
  const resp = await page.request.get(`${API}/api/companies`);
  const list = (await resp.json()) as Array<{ id: number; name: string }>;
  for (const c of list.filter((c) => c.name === name)) {
    await page.request.delete(`${API}/api/companies/${c.id}`);
  }
}

test.describe('06 companies', () => {
  test.beforeEach(async ({ page }) => {
    await login(page, 'admin', 'admin123');
    await page.goto(PAGE_URL);
    // NOTE: the page shows two "Company Management" h1s — the shell's plus
    // CompanyPage's own header (which carries the Add/Export buttons).
    await expect(page.locator('h1.page-title')).toHaveText('Company Management');
    // the rename test renames E2E Test Company -> E2E Renamed Company; clean
    // both, otherwise the next run hits the unique name constraint on save
    await apiDeleteByName(page, 'E2E Test Company');
    await apiDeleteByName(page, 'E2E Renamed Company');
    await page.reload();
    await expect(page.locator('table')).toBeVisible();
    await expect(page.locator('table tbody tr').first()).toBeVisible({ timeout: 15_000 });
  });

  test('table shows the seeded Airtel row with all eight columns', async ({ page }) => {
    await expect(page.locator('table thead th')).toHaveCount(8);
    await expect(page.locator('table tbody tr', { hasText: 'Airtel' })).toHaveCount(1);
  });

  test('the actions column is icon-only, matching the User Management reference', async ({ page }) => {
    const row = page.locator('table tbody tr').first();
    await expect(row).toBeVisible();
    const buttons = row.locator('td').last().getByRole('button');
    await expect(buttons).toHaveCount(2);

    // no visible label — the icon alone carries the action
    for (const text of await buttons.allInnerTexts()) expect(text.trim()).toBe('');
    await expect(buttons.nth(0).locator('svg')).toHaveCount(1);
    await expect(buttons.nth(1).locator('svg')).toHaveCount(1);

    // meaning is kept for accessibility and for the existing click tests
    await expect(buttons.nth(0)).toHaveAttribute('title', 'Edit');
    await expect(buttons.nth(1)).toHaveAttribute('title', 'Delete');
    await expect(buttons.nth(0)).toHaveAttribute('aria-label', /^Edit /);
    await expect(buttons.nth(1)).toHaveAttribute('aria-label', /^Delete /);
  });

  test('modal validation: missing name/email/website is rejected by the component', async ({ page }) => {
    await page.getByRole('button', { name: '+ Add Company' }).click();
    await expect(page.locator(MODAL_TITLE)).toHaveText('Add Company');

    await page.getByRole('button', { name: 'Create Company' }).click({ force: true });
    // the alert renders inside the dialog (it used to sit behind the overlay)
    await expect(page.locator('.modal-content').getByText('Name, email and website are required.')).toBeVisible();
    await expect(page.locator(MODAL_TITLE)).toBeVisible(); // modal stays open

    await page.getByRole('button', { name: 'Cancel' }).click();
    await expect(page.locator(MODAL_TITLE)).toHaveCount(0);
  });

  test('Add Company creates a row that survives a reload; Cancel creates nothing', async ({ page }) => {
    // Cancel path
    await page.getByRole('button', { name: '+ Add Company' }).click();
    await page.locator('.modal-content label', { hasText: 'Company Name' }).locator('input').fill('E2E Test Company');
    await page.getByRole('button', { name: 'Cancel' }).click();
    await expect(page.locator(MODAL_TITLE)).toHaveCount(0);

    // Create path
    await page.getByRole('button', { name: '+ Add Company' }).click();
    await page.locator('.modal-content label', { hasText: 'Company Name' }).locator('input').fill('E2E Test Company');
    await page.locator('.modal-content label', { hasText: 'Country' }).locator('input').fill('Uganda');
    await page.locator('.modal-content label', { hasText: 'City' }).locator('input').fill('Kampala');
    await page.locator('.modal-content label', { hasText: 'Company Email' }).locator('input').fill('e2e@testco.ug');
    await page.locator('.modal-content label', { hasText: 'Website' }).locator('input').fill('https://testco.ug');
    await page.getByRole('button', { name: 'Create Company' }).click({ force: true });
    await expect(page.locator(MODAL_TITLE)).toHaveCount(0);
    await expect(page.locator('table tbody tr', { hasText: 'E2E Test Company' })).toBeVisible();

    await page.reload();
    await expect(page.locator('table tbody tr', { hasText: 'E2E Test Company' })).toBeVisible();
  });

  test('Edit pre-fills and a rename persists through reload', async ({ page }) => {
    // create the target
    await page.getByRole('button', { name: '+ Add Company' }).click();
    await page.locator('.modal-content label', { hasText: 'Company Name' }).locator('input').fill('E2E Test Company');
    await page.locator('.modal-content label', { hasText: 'City' }).locator('input').fill('Kampala');
    await page.locator('.modal-content label', { hasText: 'Company Email' }).locator('input').fill('e2e@testco.ug');
    await page.locator('.modal-content label', { hasText: 'Website' }).locator('input').fill('https://testco.ug');
    await page.getByRole('button', { name: 'Create Company' }).click({ force: true });
    await expect(page.locator('table tbody tr', { hasText: 'E2E Test Company' })).toBeVisible();

    const row = page.locator('table tbody tr', { hasText: 'E2E Test Company' });
    await row.getByRole('button', { name: 'Edit' }).click();
    await expect(page.locator(MODAL_TITLE)).toHaveText('Edit Company');
    await expect(
      page.locator('.modal-content label', { hasText: 'Company Name' }).locator('input')
    ).toHaveValue('E2E Test Company');
    // the edit dialog pre-fills from the real DB columns
    await expect(
      page.locator('.modal-content label', { hasText: 'City' }).locator('input')
    ).toHaveValue('Kampala');

    await page.locator('.modal-content label', { hasText: 'Company Name' }).locator('input').fill('E2E Renamed Company');
    await page.getByRole('button', { name: 'Save Changes' }).click({ force: true });
    await expect(page.locator(MODAL_TITLE)).toHaveCount(0);
    await expect(page.locator('table tbody tr', { hasText: 'E2E Renamed Company' })).toBeVisible();

    await page.reload();
    await expect(page.locator('table tbody tr', { hasText: 'E2E Renamed Company' })).toBeVisible();
  });

  test('Delete dismiss keeps the company; accept removes it permanently', async ({ page }) => {
    // create the target
    await page.getByRole('button', { name: '+ Add Company' }).click();
    await page.locator('.modal-content label', { hasText: 'Company Name' }).locator('input').fill('E2E Test Company');
    await page.locator('.modal-content label', { hasText: 'Company Email' }).locator('input').fill('e2e@testco.ug');
    await page.locator('.modal-content label', { hasText: 'Website' }).locator('input').fill('https://testco.ug');
    await page.getByRole('button', { name: 'Create Company' }).click({ force: true });
    await expect(page.locator('table tbody tr', { hasText: 'E2E Test Company' })).toBeVisible();
    const row = page.locator('table tbody tr', { hasText: 'E2E Test Company' });

    // dismiss
    page.once('dialog', (d) => d.dismiss());
    await row.getByRole('button', { name: 'Delete' }).click();
    await page.waitForTimeout(500);
    await expect(row).toBeVisible();

    // accept + reload proves server-side deletion
    page.once('dialog', (d) => d.accept());
    await row.getByRole('button', { name: 'Delete' }).click();
    await expect(row).toHaveCount(0, { timeout: 10_000 });
    await page.reload();
    await expect(page.locator('table tbody tr', { hasText: 'E2E Test Company' })).toHaveCount(0);
  });

  test('export button is present (download content verified in Block 11)', async ({ page }) => {
    await expect(page.getByRole('button', { name: /export/i }).first()).toBeVisible();
  });
});
