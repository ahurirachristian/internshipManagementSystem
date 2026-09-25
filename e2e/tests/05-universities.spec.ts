import { test, expect, type Page } from '@playwright/test';
import { login, API } from './helpers';

// Block 5 — University Management (/admin/universities):
//   * 51 seeded universities, paginated 10 per page
//   * search incl. no-results state
//   * Add University modal: native required validation + create + cancel paths
//   * Edit modal: pre-filled fields, rename persists through reload
//   * Delete: dismiss keeps, accept removes permanently
//   * pagination next/previous page navigation
//   * Export button visible (download wiring verified in Block 11)

const TABLE = 'table[aria-label="Universities list"]';
const PAGE_URL = '/admin/universities';

/** Search narrows the full server list, so name lookups go through the search box. */
async function searchFor(page: Page, term: string) {
  await page.getByLabel('Search universities').fill(term);
  // client-side filter commits on the next React tick
  await page.waitForTimeout(400);
}

async function createUniversity(page: Page, name: string, short = 'E2E') {
  await searchFor(page, '');
  await page.getByRole('button', { name: 'Add University' }).first().click();
  await page.locator('#uni-fullName').fill(name);
  await page.locator('#uni-shortForm').fill(short);
  await page.getByRole('button', { name: 'Create University' }).click();
  await expect(page.locator('#university-modal-title')).toBeHidden();
}

/**
 * Existence assertions must key off the row's action buttons: when a search has
 * no match the empty-state row embeds the search term in its message and would
 * otherwise look like a data row.
 */
function editButton(page: Page, name: string) {
  return page.locator(`${TABLE} tbody tr`, { hasText: name }).getByRole('button', { name: `Edit ${name}` });
}

async function expectNoDataRowNamed(page: Page, name: string) {
  await expect(
    page.locator(`${TABLE} tbody tr`, { hasText: name }).getByRole('button', { name: /^(Edit|Delete) / })
  ).toHaveCount(0);
}

async function deleteUniversityByName(page: Page, name: string) {
  await searchFor(page, name);
  // key off the Delete button, NOT the row: the empty-state row embeds the search
  // term in its message and has no actions
  const delBtn = page.locator(`${TABLE} tbody tr`, { hasText: name }).getByRole('button', { name: `Delete ${name}` });
  if ((await delBtn.count()) > 0) {
    page.once('dialog', (d) => d.accept());
    await delBtn.first().click();
    await expect(delBtn).toHaveCount(0, { timeout: 10_000 });
  }
  await searchFor(page, '');
}

/**
 * Deletes leftover rows by exact name via the API (admin cookie already in the
 * context). Avoids all UI/state cross-test coupling.
 */
async function apiDeleteByName(page: Page, name: string) {
  const resp = await page.request.get(`${API}/api/universities`);
  const list = await resp.json();
  for (const u of list as Array<{ universityId: number; fullName: string }>) {
    if (u.fullName === name) {
      await page.request.delete(`${API}/api/universities/${u.universityId}`);
    }
  }
}

async function createViaUi(page: Page, name: string) {
  await page.getByRole('button', { name: 'Add University' }).first().click();
  await page.locator('#uni-fullName').fill(name);
  await page.locator('#uni-shortForm').fill('E2E');
  await page.getByRole('button', { name: 'Create University' }).click();
  await expect(page.locator('#university-modal-title')).toBeHidden();
}

test.describe('05 universities', () => {
  test.beforeEach(async ({ page }) => {
    await login(page, 'admin', 'admin123');
    await page.goto(PAGE_URL);
    await expect(page.locator(TABLE)).toBeVisible();
    await expect(page.getByText(/of \d+ universities/)).toBeVisible({ timeout: 15_000 });
    await apiDeleteByName(page, 'E2E Test University');
    await apiDeleteByName(page, 'E2E Renamed University');
    await page.reload();
    await expect(page.getByText(/of \d+ universities/)).toBeVisible({ timeout: 15_000 });
  });

  test('table renders six columns and the seeded Makerere row on page 1', async ({ page }) => {
    await expect(page.locator(`${TABLE} thead th`)).toHaveCount(6);
    const row = page.locator(`${TABLE} tbody tr`, { hasText: 'Makerere' });
    await expect(row).toHaveCount(1);
    await expect(row).toContainText('MAK');
  });

  test('the seeded dataset paginates 10 per page and Next/Previous work', async ({ page }) => {
    const status = page.getByText(/of \d+ universities/);
    const total = Number(((await status.innerText()).match(/of (\d+)/) || [])[1]);
    expect(total).toBeGreaterThanOrEqual(50);
    await expect(page.locator(`${TABLE} tbody tr`)).toHaveCount(10);

    await page.getByRole('button', { name: 'Next page' }).click();
    await expect(status).toContainText(`11–20 of ${total}`);
    await expect(page.locator(`${TABLE} tbody tr`)).toHaveCount(10);

    await page.getByRole('button', { name: 'Previous page' }).click();
    await expect(status).toContainText(`1–10 of ${total}`);
  });

  test('search narrows across the whole dataset and shows the no-results state', async ({ page }) => {
    await searchFor(page, 'Nkumba');
    await expect(page.locator(`${TABLE} tbody tr`, { hasText: 'Nkumba' })).toHaveCount(1);

    await searchFor(page, 'zzz-no-such-uni');
    await expect(page.getByRole('heading', { name: 'No results found' })).toBeVisible();

    await searchFor(page, '');
    await expect(page.locator(`${TABLE} tbody tr`)).toHaveCount(10);
  });

  test('Add University: native required validation blocks an empty short form', async ({ page }) => {
    await searchFor(page, '');
    await page.getByRole('button', { name: 'Add University' }).first().click();
    await expect(page.locator('#university-modal-title')).toBeVisible();

    await page.locator('#uni-fullName').fill('E2E Test University');
    // shortForm left empty — the browser blocks submission
    await page.getByRole('button', { name: 'Create University' }).click();
    await expect(page.locator('#university-modal-title')).toBeVisible();
    const validity = await page.locator('#uni-shortForm').evaluate((el) => (el as HTMLInputElement).checkValidity());
    expect(validity).toBe(false);
    await page.getByRole('button', { name: 'Cancel' }).click();

    await searchFor(page, 'E2E Test University');
    await expectNoDataRowNamed(page, 'E2E Test University');
  });

  test('Add University creates a row that survives a full page reload', async ({ page }) => {
    await createUniversity(page, 'E2E Test University');

    await searchFor(page, 'E2E Test University');
    await expect(editButton(page, 'E2E Test University')).toHaveCount(1);

    await page.reload();
    await expect(page.locator(TABLE)).toBeVisible();
    await searchFor(page, 'E2E Test University');
    await expect(editButton(page, 'E2E Test University')).toHaveCount(1);
  });

  test('Add University Cancel creates nothing', async ({ page }) => {
    await page.getByRole('button', { name: 'Add University' }).first().click();
    await page.locator('#uni-fullName').fill('E2E Test University');
    await page.locator('#uni-shortForm').fill('E2E');
    await page.getByRole('button', { name: 'Cancel' }).click();
    await expect(page.locator('#university-modal-title')).toBeHidden();

    await searchFor(page, 'E2E Test University');
    await expectNoDataRowNamed(page, 'E2E Test University');
  });

  test('Edit pre-fills the modal and a rename persists', async ({ page }) => {
    await createUniversity(page, 'E2E Test University');

    await searchFor(page, 'E2E Test University');
    const row = page.locator(`${TABLE} tbody tr`, { hasText: 'E2E Test University' });
    await row.getByRole('button', { name: 'Edit E2E Test University' }).click();
    await expect(page.locator('#uni-fullName')).toHaveValue('E2E Test University');
    await expect(page.locator('#uni-shortForm')).toHaveValue('E2E');

    await page.locator('#uni-fullName').fill('E2E Renamed University');
    await page.getByRole('button', { name: 'Save Changes' }).click();
    await expect(page.locator('#university-modal-title')).toBeHidden();

    await searchFor(page, 'E2E Renamed University');
    await expect(editButton(page, 'E2E Renamed University')).toHaveCount(1);

    await page.reload();
    await searchFor(page, 'E2E Renamed University');
    await expect(editButton(page, 'E2E Renamed University')).toHaveCount(1);
  });

  test('Delete dismiss keeps the row; accept removes it permanently', async ({ page }) => {
    await createViaUi(page, 'E2E Test University');

    await searchFor(page, 'E2E Test University');
    const row = page.locator(`${TABLE} tbody tr`, { hasText: 'E2E Test University' }).filter({ has: page.getByRole('button', { name: 'Delete E2E Test University' }) });
    await expect(row).toHaveCount(1);

    // dismiss keeps it
    page.once('dialog', (d) => d.dismiss());
    await row.getByRole('button', { name: 'Delete E2E Test University' }).click();
    await page.waitForTimeout(500);
    await expect(editButton(page, 'E2E Test University')).toHaveCount(1);

    // accept removes it, proven server-side by a reload
    page.once('dialog', (d) => d.accept());
    await row.getByRole('button', { name: 'Delete E2E Test University' }).click();
    await expect(row).toHaveCount(0, { timeout: 10_000 });
    await page.reload();
    await searchFor(page, 'E2E Test University');
    await expectNoDataRowNamed(page, 'E2E Test University');
  });

  test('export button is present (download content verified in Block 11)', async ({ page }) => {
    await expect(page.getByRole('button', { name: /export/i }).first()).toBeVisible();
  });
});
