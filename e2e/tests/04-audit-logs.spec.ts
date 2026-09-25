import { test, expect } from '@playwright/test';
import { login, collectFailedRequests } from './helpers';

// Block 4 — the Audit Logs page (/admin/audit-logs):
//   * the table loads entries (our own LOGIN is audited, so rows exist)
//   * client-side search over username/action/details incl. "No results found" state
//   * Action CustomSelect narrows to that action and the outgoing request carries ?action=
//   * Start/End date filters refetch with ?startDate=&endDate= (H2 LocalDateTime — observed behaviour)
//   * the range that contains today still shows the LOGIN rows; an ancient range shows the empty state

const TODAY = new Date().toISOString().slice(0, 10);

test.describe('04 audit logs', () => {
  test.beforeEach(async ({ page }) => {
    await login(page, 'admin', 'admin123');
    await page.goto('/admin/audit-logs');
    await expect(page.getByRole('heading', { name: 'Audit Logs' })).toBeVisible();
  });

  test('the audit table renders entries with the seven documented columns', async ({ page }) => {
    const table = page.locator('table[aria-label="Audit logs"]');
    await expect(table).toBeVisible();
    await expect(table.locator('thead th')).toHaveCount(7);
    // our login was audited
    await expect(table.locator('tbody tr').first()).toBeVisible({ timeout: 15_000 });
    await expect(table.locator('tbody tr').first()).toContainText('admin');
  });

  test('search narrows by username and shows the no-results state', async ({ page }) => {
    const table = page.locator('table[aria-label="Audit logs"]');
    await expect(table.locator('tbody tr').first()).toBeVisible({ timeout: 15_000 });

    await page.locator('#audit-search').fill('admin');
    const rows = table.locator('tbody tr');
    const count = await rows.count();
    expect(count).toBeGreaterThan(0);
    for (let i = 0; i < count; i++) {
      await expect(rows.nth(i)).toContainText('admin');
    }

    await page.locator('#audit-search').fill('zzz-no-such-entry');
    await expect(page.getByRole('heading', { name: 'No results found' })).toBeVisible();
  });

  test('action filter narrows rows and the request carries the action param', async ({ page }) => {
    const respPromise = page.waitForResponse((r) => r.url().includes('/api/audit-logs') && r.url().includes('action=LOGIN') && r.status() === 200);

    await page.locator('#audit-action').click();
    await page.getByRole('option', { name: 'Login', exact: true }).click();
    const resp = await respPromise;
    const data = await resp.json();
    expect(data.length).toBeGreaterThan(0);

    const table = page.locator('table[aria-label="Audit logs"]');
    await expect(table.locator('tbody tr')).toHaveCount(data.length);
    for (let i = 0; i < data.length; i++) {
      await expect(table.locator('tbody tr').nth(i).locator('td').nth(3)).toContainText('LOGIN');
    }
  });

  test('date range containing today keeps the LOGIN rows; ancient range shows the empty state', async ({ page }) => {
    const failures = collectFailedRequests(page);
    const table = page.locator('table[aria-label="Audit logs"]');

    // today's range: our login happened today, so rows must remain
    await page.locator('#audit-start').fill(TODAY);
    await page.locator('#audit-end').fill(TODAY);
    const todayResp = page.waitForResponse((r) => r.url().includes('/api/audit-logs') && r.status() === 200);
    await expect(table.locator('tbody tr').first()).toBeVisible({ timeout: 15_000 });
    await todayResp;
    // today's entries include logins (ours did); exact user varies with prior test runs
    await expect(table.locator('tbody tr').first()).toContainText('LOGIN');

    // ancient range: nothing to show
    await page.locator('#audit-start').fill('2020-01-01');
    await page.locator('#audit-end').fill('2020-01-02');
    await expect(page.getByRole('heading', { name: 'No audit logs' })).toBeVisible({ timeout: 15_000 });

    // the date filtering must not produce server errors
    expect(failures, `unexpected failed API calls: ${failures.join(', ')}`).toEqual([]);
  });
});
