import { test, expect, type Page } from '@playwright/test';
import { login, API } from './helpers';

// Block 14 — modal audit (dialog integrity):
//
// User-reported: the Company edit dialog and the Add Vacancy dialog broke —
// their fields (Phone, Postal Address, Physical Address, …) and the
// Save/Cancel buttons painted OUTSIDE the dialog box, because both modals
// clamp .modal-content at max-height: 90vh while their forms have no internal
// scroll wrapper. Both now use the .modal-body pattern DiaryReviewModal
// already uses, with every field kept (they map to real database columns).
//
// The audit below opens every admin modal at 1280x720 and 800x600 and asserts
// that each input/select/textarea/button can be fully contained within the
// modal's bounding box after scrolling — i.e. nothing paints outside the
// dialog. Round-trips on a throwaway company and vacancy prove the full field
// set is intact end-to-end (create -> value -> edit -> value -> delete).

const VIEWPORTS = [
  { width: 1280, height: 720 },
  { width: 800, height: 600 },
];

const COMPANY_NAME = 'E2E Audit Company';
const VACANCY_TITLE = 'E2E Audit Vacancy';

type ModalSpec = {
  name: string;
  page: string;
  open: (page: Page) => Promise<void>;
  close: (page: Page) => Promise<void>;
  container: string;
};

const MODALS: ModalSpec[] = [
  {
    name: 'Company Add (legacy modal)',
    page: '/company',
    open: async (page) => {
      await page.getByRole('button', { name: '+ Add Company' }).click();
    },
    close: async (page) => {
      await page.getByRole('button', { name: 'Cancel' }).click({ force: true });
    },
    container: '.modal-content',
  },
  {
    name: 'Vacancy Add (legacy modal)',
    page: '/admin/vacancies',
    open: async (page) => {
      await page.getByRole('button', { name: 'Add Vacancy' }).click();
    },
    close: async (page) => {
      await page.getByRole('button', { name: 'Cancel' }).click({ force: true });
    },
    container: '.modal-content',
  },
  {
    name: 'Diary Review (legacy modal)',
    page: '(admin dashboard diaries tab)',
    open: async (page) => {
      await page.goto('/admin/dashboard');
      await expect(page.locator('table tbody tr', { hasText: 'Kasagga Fred' })).toBeVisible({ timeout: 15_000 });
      await page.getByRole('tab', { name: /Day Diary Logs/ }).click();
      const row = page.locator('table[aria-label="Day diary logs"] tbody tr').first();
      await expect(row).toBeVisible({ timeout: 10_000 });
      await row.getByRole('button', { name: 'Review diary entry' }).click();
    },
    close: async (page) => {
      await page.getByRole('button', { name: 'Cancel' }).click({ force: true });
    },
    container: '.modal-content',
  },
  {
    name: 'View student (ui/Modal)',
    page: '/admin/dashboard',
    open: async (page) => {
      await expect(page.locator('table tbody tr').first()).toBeVisible({ timeout: 15_000 });
      await page.locator('table tbody tr').first().getByRole('button', { name: 'View' }).click();
    },
    close: async (page) => {
      await page.keyboard.press('Escape');
    },
    container: 'div.relative.w-full.max-w-xl',
  },
  {
    name: 'Student edit 4-step (StudentEditModal)',
    page: '/admin/dashboard',
    open: async (page) => {
      await expect(page.locator('table tbody tr').first()).toBeVisible({ timeout: 15_000 });
      await page.locator('table tbody tr').first().getByRole('button', { name: 'Edit' }).click();
    },
    close: async (page) => {
      await page.locator('[role="dialog"]').getByRole('button', { name: 'Close modal' }).click();
    },
    container: '[role="dialog"] > div',
  },
  {
    name: 'Add University (inline dialog)',
    page: '/admin/universities',
    open: async (page) => {
      await page.getByRole('button', { name: 'Add University' }).first().click();
    },
    close: async (page) => {
      await page.getByRole('button', { name: 'Cancel' }).click();
    },
    container: '[role="dialog"] > div',
  },
  {
    name: 'Add User (ui/Modal)',
    page: '/admin/users',
    open: async (page) => {
      await page.getByRole('button', { name: /Add User|Add user/ }).first().click();
    },
    close: async (page) => {
      await page.keyboard.press('Escape');
    },
    container: 'div.relative.w-full.max-w-lg',
  },
  {
    name: 'Placement Assign Supervisors (ui/Modal)',
    page: '/admin/placements',
    open: async (page) => {
      await expect(page.locator('table tbody tr').first()).toBeVisible({ timeout: 15_000 });
      await page.getByRole('button', { name: 'Assign Supervisors' }).click();
    },
    close: async (page) => {
      await page.getByRole('button', { name: 'Cancel', exact: true }).click();
    },
    container: 'div.relative.w-full.max-w-lg',
  },
];

async function assertContained(page: Page, container: string, viewport: { width: number; height: number }) {
  const box = await page.locator(container).first().boundingBox();
  expect(box, `${container} renders`).not.toBeNull();
  const controls = page.locator(
    `${container} input, ${container} select, ${container} textarea, ${container} button`
  );
  const count = await controls.count();
  expect(count, `${container} has controls`).toBeGreaterThan(0);
  for (let i = 0; i < count; i++) {
    const control = controls.nth(i);
    await control.scrollIntoViewIfNeeded().catch(() => {});
    const cb = await control.boundingBox();
    expect(
      cb,
      `control #${i} in ${container} renders`
    ).not.toBeNull();
    const outside =
      cb!.y < box!.y - 2 ||
      cb!.y + cb!.height > box!.y + box!.height + 2 ||
      cb!.x < box!.x - 2 ||
      cb!.x + cb!.width > box!.x + box!.width + 2;
    expect(outside, `control #${i} escapes the ${container} box (y=${Math.round(cb!.y)}, boxBottom=${Math.round(box!.y + box!.height)})`).toBe(false);
  }
}

test.describe('14 modal audit', () => {
  let seededDiaryId: number | undefined;

  test.beforeAll(async ({ request }) => {
    // admin session first: the listing/deletion calls below need it
    const admin = await request.post(`${API}/api/login`, {
      form: { username: 'admin', password: 'admin123', role: 'ADMIN' },
    });
    expect(admin.ok()).toBeTruthy();

    // one diary row so the Review modal can be opened
    const existing = await request.get(`${API}/api/diaries`);
    if (existing.ok()) {
      for (const d of (await existing.json()) as Array<{ id: number; dailyActivities: string }>) {
        if (d.dailyActivities === 'E2E diary for modal audit') {
          await request.delete(`${API}/api/diaries/${d.id}`);
        }
      }
    }
    const student = await request.post(`${API}/api/login`, {
      form: { username: '2400101003', password: 'Student@123', role: 'STUDENT' },
    });
    expect(student.ok()).toBeTruthy();
    const created = await request.post(`${API}/api/diaries`, {
      data: {
        date: '2026-09-26',
        dailyActivities: 'E2E diary for modal audit',
        knowledgeAndSkillsGained: 'modal audit',
        accomplishments: 'seeded by the modal audit',
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

  test('every admin modal contains its controls at both test viewports', async ({ page }) => {
    test.setTimeout(240_000);
    for (const viewport of VIEWPORTS) {
      await page.setViewportSize(viewport);
      for (const spec of MODALS) {
        if (spec.page.startsWith('(')) {
          await spec.open(page);
        } else {
          await page.goto(spec.page);
          await spec.open(page);
        }
        await expect(page.locator(spec.container).first()).toBeVisible();
        await assertContained(page, spec.container, viewport);
        await spec.close(page);
        await expect(page.locator(spec.container).first()).toHaveCount(0);
      }
    }
  });

  test('company dialog: all eight fields survive a create -> edit -> verify round-trip', async ({ page }) => {
    test.setTimeout(120_000);
    // cleanup + create through the dialog itself (force clicks per Block 6)
    await page.goto('/company');
    const row = page.locator('table tbody tr', { hasText: COMPANY_NAME });
    if (await row.count()) {
      page.once('dialog', (d) => d.accept());
      await row.getByRole('button', { name: 'Delete' }).click();
      await expect(row).toHaveCount(0, { timeout: 10_000 });
    }

    const label = (text: string) => page.locator('.modal-content label', { hasText: text }).locator('input');
    const modal = page.locator('.modal-content');

    // create with a value in every field
    await page.getByRole('button', { name: '+ Add Company' }).click();
    await label('Company Name').fill(COMPANY_NAME);
    await label('Country').fill('Uganda');
    await label('City').fill('Kampala');
    await label('Company Email').fill('audit@e2e.example');
    await label('Website').fill('https://e2e.example');
    await label('Phone').fill('+256700000777');
    await label('Postal Address').fill('P.O. Box 777');
    await label('Physical Address').fill('777 Audit Road');
    await modal.getByRole('button', { name: 'Create Company' }).click({ force: true });
    await expect(row).toBeVisible({ timeout: 10_000 });

    // every field still holds its value in the Edit dialog (nothing was lost)
    await row.getByRole('button', { name: 'Edit' }).click();
    await expect(modal).toBeVisible();
    expect(await label('Company Name').inputValue()).toBe(COMPANY_NAME);
    expect(await label('Country').inputValue()).toBe('Uganda');
    expect(await label('City').inputValue()).toBe('Kampala');
    expect(await label('Company Email').inputValue()).toBe('audit@e2e.example');
    expect(await label('Website').inputValue()).toBe('https://e2e.example');
    expect(await label('Phone').inputValue()).toBe('+256700000777');
    expect(await label('Postal Address').inputValue()).toBe('P.O. Box 777');
    expect(await label('Physical Address').inputValue()).toBe('777 Audit Road');

    // change the last two (the reported-broken ones) and save
    await label('Postal Address').fill('P.O. Box 778');
    await label('Physical Address').fill('778 Audit Road');
    await modal.getByRole('button', { name: 'Save Changes' }).click({ force: true });
    await expect(modal).toHaveCount(0);

    // persisted on the server
    const companies = await page.request.get(`${API}/api/companies`);
    expect(companies.ok()).toBeTruthy();
    const saved = ((await companies.json()) as Array<Record<string, unknown>>).find(
      (c) => c.name === COMPANY_NAME
    );
    expect(saved).toBeDefined();
    expect(saved!['postalAddress']).toBe('P.O. Box 778');
    expect(saved!['physicalAddress']).toBe('778 Audit Road');

    // cleanup
    page.once('dialog', (d) => d.accept());
    await page.locator('table tbody tr', { hasText: COMPANY_NAME }).getByRole('button', { name: 'Delete' }).click();
    await expect(page.locator('table tbody tr', { hasText: COMPANY_NAME })).toHaveCount(0, { timeout: 10_000 });
  });

  test('vacancy dialog: all seven fields survive a create -> edit -> verify round-trip', async ({ page }) => {
    test.setTimeout(120_000);
    await page.goto('/admin/vacancies');
    // hygiene: sweep leftovers under either title
    const vacancies = await page.request.get(`${API}/api/vacancies`);
    if (vacancies.ok()) {
      for (const v of (await vacancies.json()) as Array<{ id: number; title: string }>) {
        if (v.title === VACANCY_TITLE || v.title === 'E2E Audit Vacancy Renamed') {
          await page.request.delete(`${API}/api/vacancies/${v.id}`);
        }
      }
    }

    const modal = page.locator('.modal-content');
    const label = (text: string) => page.locator('.modal-content label', { hasText: text });

    await page.getByRole('button', { name: 'Add Vacancy' }).click();
    await label('Title').locator('input').fill(VACANCY_TITLE);
    await label('Description').locator('textarea').fill('Audit round-trip vacancy.');
    await label('Company ID').locator('input').fill('1');
    await label('Location').locator('input').fill('Kampala');
    await label('Requirements').locator('textarea').fill('Playwright.');
    await label('Deadline').locator('input').fill('2026-12-31');
    await label('Status').locator('select').selectOption('OPEN');
    await modal.getByRole('button', { name: 'Create Vacancy' }).click({ force: true });

    const row = page.locator('table tbody tr', { hasText: VACANCY_TITLE });
    await expect(row).toBeVisible({ timeout: 10_000 });

    // all values pre-fill the Edit dialog
    await row.getByRole('button', { name: 'Edit' }).click();
    await expect(modal).toBeVisible();
    expect(await label('Title').locator('input').inputValue()).toBe(VACANCY_TITLE);
    expect(await label('Description').locator('textarea').inputValue()).toBe('Audit round-trip vacancy.');
    expect(await label('Company ID').locator('input').inputValue()).toBe('1');
    expect(await label('Location').locator('input').inputValue()).toBe('Kampala');
    expect(await label('Requirements').locator('textarea').inputValue()).toBe('Playwright.');
    expect(await label('Deadline').locator('input').inputValue()).toBe('2026-12-31');

    // change the deadline (a reported-broken-overflow field) and save
    await label('Deadline').locator('input').fill('2027-01-31');
    await modal.getByRole('button', { name: 'Save Changes' }).click({ force: true });
    await expect(modal).toHaveCount(0);

    // persisted on the server
    const check = await page.request.get(`${API}/api/vacancies`);
    const saved = ((await check.json()) as Array<{ title: string; deadline: string }>).find(
      (v) => v.title === VACANCY_TITLE
    );
    expect(saved).toBeDefined();
    expect(saved!.deadline).toBe('2027-01-31');

    // cleanup
    page.once('dialog', (d) => d.accept());
    await row.getByRole('button', { name: 'Delete' }).click();
    await expect(row).toHaveCount(0, { timeout: 10_000 });
  });
});
