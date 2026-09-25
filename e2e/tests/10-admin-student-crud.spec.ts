import { test, expect, type Page } from '@playwright/test';
import { login, API } from './helpers';

// Block 10 — Student CRUD from the admin dashboard Students tab:
//
//   * H5: the students table header now includes the missing Actions cell, so
//     header cell count matches row cell count
//   * H8: StudentEditModal receives the real industrial-supervisor list, so
//     Field Supervisor renders the CustomSelect picker, not a raw id input
//   * full 4-step edit flow on a throwaway student (created + deleted via API,
//     seed data untouched): validation gating, review step, Save persistence
//   * delete with confirm accepted / dismissed
//
// The seeded students must never be mutated or deleted, hence the throwaway.

const STUDENTS_TABLE = 'table[aria-label="Registered students"]';
const FIRST = 'E2E';
const LAST = 'Throwaway';
const STUDENT_NO = 'E2E-9001';
const REG_NO = 'E2E-REG-9001';
const USERNAME = 'e2e-throwaway-9001';
const PHONE_A = '+256700000001';
const PHONE_B = '+256700000002';

async function openEditModal(page: Page): Promise<ReturnType<Page['locator']>> {
  // the table renders username (not the student number), so key rows on username
  const row = page.locator(`${STUDENTS_TABLE} tbody tr`, { hasText: USERNAME });
  await row.getByRole('button', { name: 'Edit' }).click();
  const dialog = page.locator('[role="dialog"]');
  await expect(dialog).toBeVisible();
  await expect(dialog.getByText('Step 1 of 4')).toBeVisible();
  return dialog;
}

async function goToStep4(dialog: ReturnType<Page['locator']>) {
  await dialog.locator('#edit-phoneNumber').fill(PHONE_B);
  await dialog.getByRole('button', { name: 'Next' }).click(); // step 2
  await dialog.getByRole('button', { name: 'Next' }).click(); // step 3
  await dialog.getByRole('button', { name: 'Next' }).click(); // step 4
  await expect(dialog.getByText('Step 4 of 4')).toBeVisible();
}

test.describe('10 admin student CRUD', () => {
  let studentId: number | undefined;

  test.beforeAll(async ({ request }) => {
    // admin session
    const loginResp = await request.post(`${API}/api/login`, {
      form: { username: 'admin', password: 'admin123', role: 'ADMIN' },
    });
    expect(loginResp.ok()).toBeTruthy();

    // clean leftovers from previous runs (by unique username match)
    const list = await request.get(`${API}/api/students`);
    if (list.ok()) {
      for (const s of (await list.json()) as Array<{ id: number; username?: string; studentNumber?: string }>) {
        if (s.username === USERNAME || s.studentNumber === STUDENT_NO) {
          await request.delete(`${API}/api/students/${s.id}`);
        }
      }
    }

    // create the throwaway student (backend provisions username + "<username>123")
    const created = await request.post(`${API}/api/students`, {
      data: {
        firstName: FIRST,
        lastName: LAST,
        studentNumber: STUDENT_NO,
        registrationNumber: REG_NO,
        username: USERNAME,
        degreeProgram: 'BSc E2E Testing',
        intake: 'AUG/2026',
        yearOfStudy: 3,
      },
    });
    expect(created.status()).toBe(201);
    studentId = ((await created.json()) as { id: number }).id;
    expect(studentId).toBeDefined();

    // give it a known phone so step 1 of the edit flow has a stable start value
    const patched = await request.put(`${API}/api/students/${studentId}`, {
      data: { phoneNumber: PHONE_A },
    });
    expect(patched.ok()).toBeTruthy();
  });

  test.afterAll(async ({ request }) => {
    const loginResp = await request.post(`${API}/api/login`, {
      form: { username: 'admin', password: 'admin123', role: 'ADMIN' },
    });
    if (loginResp.ok()) {
      const list = await request.get(`${API}/api/students`);
      if (list.ok()) {
        for (const s of (await list.json()) as Array<{ id: number; username?: string; studentNumber?: string }>) {
          if (s.username === USERNAME || s.studentNumber === STUDENT_NO) {
            await request.delete(`${API}/api/students/${s.id}`);
          }
        }
      }
    }
  });

  test.beforeEach(async ({ page }) => {
    await login(page, 'admin', 'admin123');
    await page.goto('/admin/dashboard');
    await expect(
      page.locator(`${STUDENTS_TABLE} tbody tr`, { hasText: USERNAME })
    ).toBeVisible({ timeout: 15_000 });
  });

  test('H5: header cell count matches row cell count (Actions header exists)', async ({ page }) => {
    const headerCount = await page.locator(`${STUDENTS_TABLE} thead th`).count();
    const rowCount = await page.locator(`${STUDENTS_TABLE} tbody tr`).first().locator('td').count();
    expect(headerCount).toBe(rowCount);
    await expect(
      page.locator(`${STUDENTS_TABLE} thead th`, { hasText: 'Actions' })
    ).toBeVisible();
  });

  test('Edit modal pre-fills saved values and validation gates each step', async ({ page }) => {
    const dialog = await openEditModal(page);
    await expect(dialog.getByText(`Edit Student: ${FIRST} ${LAST}`)).toBeVisible();

    // pre-filled from the API record
    expect(await dialog.locator('#edit-studentNumber').inputValue()).toBe(STUDENT_NO);
    expect(await dialog.locator('#edit-registrationNumber').inputValue()).toBe(REG_NO);
    expect(await dialog.locator('#edit-phoneNumber').inputValue()).toBe(PHONE_A);

    // username is locked on edit
    expect(await dialog.locator('#edit-username').isDisabled()).toBe(true);

    // clear required fields -> Next must refuse to advance
    await dialog.locator('#edit-firstName').fill('');
    await dialog.locator('#edit-studentNumber').fill('');
    await dialog.locator('#edit-registrationNumber').fill('');
    await dialog.getByRole('button', { name: 'Next' }).click();
    await expect(dialog.getByRole('alert')).toContainText('First name, student number, registration number');

    // restore and advance
    await dialog.locator('#edit-firstName').fill(FIRST);
    await dialog.locator('#edit-studentNumber').fill(STUDENT_NO);
    await dialog.locator('#edit-registrationNumber').fill(REG_NO);
    await dialog.getByRole('button', { name: 'Next' }).click();
    await expect(dialog.getByText('Step 2 of 4')).toBeVisible();

    // step 2 validation gate
    await dialog.locator('#edit-intake').fill('');
    await dialog.locator('#edit-degreeProgram').fill('');
    await dialog.getByRole('button', { name: 'Next' }).click();
    await expect(dialog.getByRole('alert')).toContainText('Intake, degree program and year of study');

    // Cancel exits with no changes
    await dialog.getByRole('button', { name: 'Close modal' }).click();
    await expect(page.locator('[role="dialog"]')).toHaveCount(0);
  });

  test('full 4-step edit flow saves and the new phone number persists', async ({ page }) => {
    const dialog = await openEditModal(page);
    await goToStep4(dialog);

    // review step shows the changed phone
    const reviewCard = dialog.locator('div', { hasText: 'Phone Number' }).locator('p', { hasText: PHONE_B });
    await expect(reviewCard.first()).toBeVisible();

    await dialog.getByRole('button', { name: 'Save Student' }).click();
    await expect(page.locator('[role="dialog"]')).toHaveCount(0);

    // persisted on the server
    const resp = await page.request.get(`${API}/api/students/${studentId}`);
    expect(resp.ok()).toBeTruthy();
    expect(((await resp.json()) as { phoneNumber: string }).phoneNumber).toBe(PHONE_B);

    // and pre-filled when the modal is reopened
    const reopened = await openEditModal(page);
    expect(await reopened.locator('#edit-phoneNumber').inputValue()).toBe(PHONE_B);
    await reopened.getByRole('button', { name: 'Close modal' }).click();
    await expect(page.locator('[role="dialog"]')).toHaveCount(0);

    // restore the original value
    const d2 = await openEditModal(page);
    await d2.locator('#edit-phoneNumber').fill(PHONE_A);
    await d2.getByRole('button', { name: 'Next' }).click();
    await d2.getByRole('button', { name: 'Next' }).click();
    await d2.getByRole('button', { name: 'Next' }).click();
    await d2.getByRole('button', { name: 'Save Student' }).click();
    await expect(page.locator('[role="dialog"]')).toHaveCount(0);
    const check = await page.request.get(`${API}/api/students/${studentId}`);
    expect(((await check.json()) as { phoneNumber: string }).phoneNumber).toBe(PHONE_A);
  });

  test('H8: Field Supervisor renders the CustomSelect picker with real rows', async ({ page }) => {
    const dialog = await openEditModal(page);
    await dialog.getByRole('button', { name: 'Next' }).click(); // step 2
    await dialog.getByRole('button', { name: 'Next' }).click(); // step 3

    const pickerButton = dialog.locator('#edit-indSupervisorId[aria-haspopup="listbox"]');
    await expect(pickerButton).toBeVisible();

    // the picker carries a real supervisor row (seed data includes one)
    const label = (await pickerButton.innerText()).trim();
    expect(label).not.toBe('');
    expect(label).not.toMatch(/^—?$/);

    // open it and pick an option; value tracks the selection
    await pickerButton.click();
    const options = page.getByRole('option');
    await expect(options.first()).toBeVisible();
    await page.getByRole('option', { name: /Unassigned/ }).click();
    await expect(pickerButton).toContainText('Unassigned');
  });

  test('delete with confirm accepted removes the student; dismiss keeps it', async ({ page }) => {
    // dismiss keeps the row
    page.once('dialog', (d) => d.dismiss());
    await page.locator(`${STUDENTS_TABLE} tbody tr`, { hasText: USERNAME }).getByRole('button', { name: 'Delete' }).click();
    await page.waitForTimeout(600);
    await expect(page.locator(`${STUDENTS_TABLE} tbody tr`, { hasText: USERNAME })).toHaveCount(1);

    // accept removes it
    page.once('dialog', (d) => d.accept());
    await page.locator(`${STUDENTS_TABLE} tbody tr`, { hasText: USERNAME }).getByRole('button', { name: 'Delete' }).click();
    await expect(page.locator(`${STUDENTS_TABLE} tbody tr`, { hasText: USERNAME })).toHaveCount(0, { timeout: 10_000 });

    // gone from the server
    const resp = await page.request.get(`${API}/api/students/${studentId}`);
    expect(resp.status()).toBe(404);
    studentId = undefined; // afterAll sweep already handled
  });
});
