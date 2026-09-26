import { test, expect } from '@playwright/test';
import { login } from './helpers';

// Block 2 — the Admin Dashboard page:
//   * KPI strip (Registered Students / Day Diary Logs Submitted / Active Students / Avg Logs per Student)
//   * Students / Day Diary Logs / System tab switching (tab bar restored in 95f0ba3)
//   * header search box wired to the student filter
//   * student row actions: View (ui/Modal, closes on Escape), Edit (StudentEditModal, X button),
//     Delete (window.confirm, Cancel path)
//   * diaries tab empty state (seeded DB has no entries; review modal is covered in the diaries block)

const STUDENTS_TABLE = 'table[aria-label="Registered students"]';

test.describe('02 admin dashboard', () => {
  test.beforeEach(async ({ page }) => {
    await login(page, 'admin', 'admin123');
    await page.goto('/admin/dashboard');
    await expect(page.getByRole('heading', { name: 'Admin Dashboard' })).toBeVisible();
    await expect(page.getByRole('tab', { name: /Students/ })).toBeVisible();
    await expect(page.locator(`${STUDENTS_TABLE} tbody tr`)).toHaveCount(3, { timeout: 15_000 });
  });

  test('KPI strip renders the four metrics and the Students pill matches the row count', async ({ page }) => {
    await expect(page.getByText('Registered Students').first()).toBeVisible();
    await expect(page.getByText('Day Diary Logs Submitted').first()).toBeVisible();
    await expect(page.getByText('Active Students').first()).toBeVisible();
    await expect(page.getByText('Avg Logs per Student').first()).toBeVisible();

    const rows = await page.locator(`${STUDENTS_TABLE} tbody tr`).count();
    const pillText = await page.getByRole('tab', { name: /Students/ }).innerText();
    const pillCount = Number(pillText.replace(/\D+/g, ''));
    expect(pillCount).toBe(rows);
  });

  test('the Actions column is icon-only, matching the User Management reference', async ({ page }) => {
    const row = page.locator(`${STUDENTS_TABLE} tbody tr`).first();
    const buttons = row.getByRole('button');
    await expect(buttons).toHaveCount(3);

    // no visible labels: the eye / pencil / trash icons carry the actions
    for (const text of await buttons.allInnerTexts()) expect(text.trim()).toBe('');
    for (let i = 0; i < 3; i += 1) {
      await expect(buttons.nth(i).locator('svg')).toHaveCount(1);
    }

    // meaning is kept for accessibility and for the existing click tests
    await expect(buttons.nth(0)).toHaveAttribute('title', 'View');
    await expect(buttons.nth(1)).toHaveAttribute('title', 'Edit');
    await expect(buttons.nth(2)).toHaveAttribute('title', 'Delete');
    await expect(buttons.nth(0)).toHaveAttribute('aria-label', /^View /);
    await expect(buttons.nth(1)).toHaveAttribute('aria-label', /^Edit /);
    await expect(buttons.nth(2)).toHaveAttribute('aria-label', /^Delete /);
  });

  test('tab switching: Students -> Day Diary Logs -> System -> back to Students', async ({ page }) => {
    // Students is the default tab
    await expect(page.getByRole('tab', { name: /Students/ })).toHaveAttribute('aria-selected', 'true');
    await expect(page.getByRole('heading', { name: 'Registered Students' })).toBeVisible();

    // Day Diary Logs
    await page.getByRole('tab', { name: /Day Diary Logs/ }).click();
    await expect(page.getByRole('heading', { name: 'Day Diary Logs' })).toBeVisible();

    // System (scope to .content: the sidebar has links with the same names)
    await page.getByRole('tab', { name: 'System' }).click();
    const content = page.locator('.content');
    await expect(content.getByRole('link', { name: /Company Management/ })).toBeVisible();
    await expect(content.getByRole('link', { name: /University Settings/ })).toBeVisible();
    await expect(content.getByRole('link', { name: /Placement Approvals/ })).toBeVisible();
    await expect(content.getByRole('link', { name: /Audit Logs/ })).toBeVisible();
    await expect(content.getByRole('link', { name: /User Management/ })).toBeVisible();

    // Back to Students restores the list
    await page.getByRole('tab', { name: /Students/ }).click();
    await expect(page.getByRole('heading', { name: 'Registered Students' })).toBeVisible();
  });

  test('System tab control links point at their routes', async ({ page }) => {
    await page.getByRole('tab', { name: 'System' }).click();
    const content = page.locator('.content');
    const expected = [
      { name: /Company Management/, href: '/company' },
      { name: /University Settings/, href: '/admin/universities' },
      { name: /Placement Approvals/, href: '/admin/placements' },
      { name: /Audit Logs/, href: '/admin/audit-logs' },
      { name: /User Management/, href: '/admin/users' },
    ];
    for (const { name, href } of expected) {
      await expect(content.getByRole('link', { name })).toHaveAttribute('href', href);
    }
  });

  test('header search filters the student table live', async ({ page }) => {
    const table = page.locator(STUDENTS_TABLE);

    await page.getByPlaceholder('Search dashboard...').fill('zzzz-no-such-student');
    await expect(page.getByText('No students match your search criteria.')).toBeVisible();

    await page.getByPlaceholder('Search dashboard...').fill('Kasagga');
    await expect(table.locator('tbody tr')).toHaveCount(1);
    await expect(table.locator('tbody tr').first()).toContainText('Kasagga Fred');

    await page.getByPlaceholder('Search dashboard...').fill('');
    await expect(table.locator('tbody tr')).toHaveCount(3);
  });

  test('View opens the Student Details modal and Escape closes it', async ({ page }) => {
    await page.locator(`${STUDENTS_TABLE} tbody tr`).first().getByRole('button', { name: 'View' }).click();

    const heading = page.getByRole('heading', { name: 'Student Details' });
    await expect(heading).toBeVisible();
    const modal = page.locator('div.relative.w-full.max-w-xl');
    await expect(modal.getByText('Full Name', { exact: true })).toBeVisible();
    await expect(modal.getByText('Kasagga Fred')).toBeVisible();

    await page.keyboard.press('Escape');
    await expect(heading).toBeHidden();
  });

  test('Edit opens the multi-step modal and the X button closes it without changes', async ({ page }) => {
    await page.locator(`${STUDENTS_TABLE} tbody tr`).first().getByRole('button', { name: 'Edit' }).click();

    const dialog = page.locator('[role="dialog"]');
    await expect(dialog).toBeVisible();
    await expect(dialog.getByText('Step 1 of 4')).toBeVisible();

    await dialog.getByRole('button', { name: 'Close modal' }).click();
    await expect(page.locator('[role="dialog"]')).toHaveCount(0);
    await expect(page.locator(`${STUDENTS_TABLE} tbody tr`)).toHaveCount(3);
  });

  test('Delete asks for confirmation and dismissing the dialog keeps the student', async ({ page }) => {
    page.once('dialog', (d) => d.dismiss());
    await page.locator(`${STUDENTS_TABLE} tbody tr`).first().getByRole('button', { name: 'Delete' }).click();
    await page.waitForTimeout(600);
    await expect(page.locator(`${STUDENTS_TABLE} tbody tr`)).toHaveCount(3);
  });

  test('diaries tab shows the empty state when no entries exist', async ({ page }) => {
    await page.getByRole('tab', { name: /Day Diary Logs/ }).click();
    await expect(page.getByText('No diary entries')).toBeVisible();
    await expect(page.getByText('No day diary entries have been submitted yet.')).toBeVisible();
  });
});
