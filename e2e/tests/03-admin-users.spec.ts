import { test, expect, type Page } from '@playwright/test';
import { login, pickCustomSelect } from './helpers';

// Block 3 — the User Management page (/admin/users):
//   * directory loads seeded accounts; role filter tabs count correctly
//   * search by username/role incl. empty state + Clear Filter
//   * Add User modal: creates an account (default password = username + "123")
//   * Edit modal: rename works, list refreshes
//   * Delete: window.confirm accept removes, dismiss keeps
//   * the stated default-password promise is verified by logging in as the new user

const PAGE_URL = '/admin/users';
const TABLE = page => page.locator('table').first();

async function deleteUserByName(page: Page, username: string) {
  const row = TABLE(page).locator('tbody tr', { hasText: username });
  if ((await row.count()) === 0) return;
  page.once('dialog', (d) => d.accept());
  await row.getByRole('button', { name: 'Delete user' }).click();
  await expect(row).toHaveCount(0, { timeout: 10_000 });
}

test.describe('03 admin users', () => {
  test.beforeEach(async ({ page }) => {
    await login(page, 'admin', 'admin123');
    await page.goto(PAGE_URL);
    await expect(page.getByRole('heading', { name: 'User Management' })).toBeVisible();
    await expect(page.getByText('User Directory & RBAC Permissions')).toBeVisible();
    // wait for data
    await expect(TABLE(page).locator('tbody tr').first()).toBeVisible({ timeout: 15_000 });
  });

  test('directory lists seeded accounts and the All Users pill matches the total', async ({ page }) => {
    await expect(TABLE(page).locator('tbody tr', { hasText: 'admin' })).toHaveCount(1);
    await expect(TABLE(page).locator('tbody tr', { hasText: 'university' })).toHaveCount(1);
    await expect(TABLE(page).locator('tbody tr', { hasText: 'airtel' })).toHaveCount(1);

    const totalText = await page.getByText(/accounts/).innerText();
    const total = Number(totalText.replace(/\D+/g, ''));
    const allPill = await page.getByRole('button', { name: /All Users/ }).innerText();
    expect(Number(allPill.replace(/\D+/g, ''))).toBe(total);
    expect(await TABLE(page).locator('tbody tr').count()).toBe(total);
  });

  test('role filter tabs narrow the list to that role', async ({ page }) => {
    await page.getByRole('button', { name: /^ADMIN \d+$/ }).click();
    const rows = TABLE(page).locator('tbody tr');
    await expect(rows).toHaveCount(1);
    await expect(rows.first()).toContainText('ADMIN');

    await page.getByRole('button', { name: /^COMPANY \d+$/ }).click();
    await expect(TABLE(page).locator('tbody tr', { hasText: 'airtel' })).toHaveCount(1);

    await page.getByRole('button', { name: /All Users/ }).click();
    await expect(TABLE(page).locator('tbody tr').first()).toBeVisible();
  });

  test('search narrows by username and the empty state offers Clear Filter', async ({ page }) => {
    const search = page.getByPlaceholder('Search username or role...');
    await search.fill('airtel');
    await expect(TABLE(page).locator('tbody tr')).toHaveCount(1);

    await search.fill('zzz-no-such-user');
    await expect(page.getByRole('heading', { name: 'No users found' })).toBeVisible();
    await page.getByRole('button', { name: 'Clear Filter' }).click();
    await expect(TABLE(page).locator('tbody tr').first()).toBeVisible();
    await expect(search).toHaveValue('');
  });

  test('Add User creates an account that appears in the list', async ({ page }) => {
    await deleteUserByName(page, 'e2e.user'); // cleanup from previous runs

    await page.getByRole('button', { name: 'Add User' }).click();
    const modal = page.locator('div.relative.w-full');
    await expect(page.getByRole('heading', { name: 'Add New User' })).toBeVisible();

    await page.locator('#add-username').fill('e2e.user');
    await pickCustomSelect(page, 'add-role', 'COMPANY');
    await page.getByRole('button', { name: 'Create User' }).click();

    await expect(page.getByText('User created successfully.')).toBeVisible();
    await expect(TABLE(page).locator('tbody tr', { hasText: 'e2e.user' })).toHaveCount(1);
  });

  test('Add User Cancel creates nothing', async ({ page }) => {
    await page.getByRole('button', { name: 'Add User' }).click();
    await page.locator('#add-username').fill('e2e.cancel');
    await page.getByRole('button', { name: 'Cancel' }).click();
    await expect(page.getByRole('heading', { name: 'Add New User' })).toBeHidden();
    await expect(TABLE(page).locator('tbody tr', { hasText: 'e2e.cancel' })).toHaveCount(0);
  });

  test('Edit renames the user and the change persists in the list', async ({ page }) => {
    await deleteUserByName(page, 'e2e.user');

    // create a fresh one to edit
    await page.getByRole('button', { name: 'Add User' }).click();
    await page.locator('#add-username').fill('e2e.user');
    await pickCustomSelect(page, 'add-role', 'COMPANY');
    await page.getByRole('button', { name: 'Create User' }).click();
    await expect(page.getByText('User created successfully.')).toBeVisible();

    const row = TABLE(page).locator('tbody tr', { hasText: 'e2e.user' });
    await row.getByRole('button', { name: 'Edit user' }).click();
    await expect(page.getByRole('heading', { name: 'Edit User — e2e.user' })).toBeVisible();
    await page.locator('#edit-username').fill('e2e.user2');
    await page.getByRole('button', { name: 'Save Changes' }).click();

    await expect(page.getByText('User updated successfully.')).toBeVisible();
    await expect(TABLE(page).locator('tbody tr', { hasText: 'e2e.user2' })).toHaveCount(1);

    // restore: delete it
    await deleteUserByName(page, 'e2e.user2');
    await expect(page.getByText('User deleted successfully.')).toBeVisible();
  });

  test('Delete dismissed keeps the account; accepted removes it', async ({ page }) => {
    await deleteUserByName(page, 'e2e.user');

    // create
    await page.getByRole('button', { name: 'Add User' }).click();
    await page.locator('#add-username').fill('e2e.user');
    await pickCustomSelect(page, 'add-role', 'COMPANY');
    await page.getByRole('button', { name: 'Create User' }).click();
    await expect(TABLE(page).locator('tbody tr', { hasText: 'e2e.user' })).toHaveCount(1);

    const row = TABLE(page).locator('tbody tr', { hasText: 'e2e.user' });

    // dismiss keeps it
    page.once('dialog', (d) => d.dismiss());
    await row.getByRole('button', { name: 'Delete user' }).click();
    await page.waitForTimeout(500);
    await expect(row).toHaveCount(1);

    // accept removes it
    page.once('dialog', (d) => d.accept());
    await row.getByRole('button', { name: 'Delete user' }).click();
    await expect(page.getByText('User deleted successfully.')).toBeVisible();
    await expect(TABLE(page).locator('tbody tr', { hasText: 'e2e.user' })).toHaveCount(0);
  });

  test('the default password promise: username + "123" actually logs in', async ({ page }) => {
    await deleteUserByName(page, 'e2e.login');

    // create COMPANY account e2e.login
    await page.getByRole('button', { name: 'Add User' }).click();
    await page.locator('#add-username').fill('e2e.login');
    await pickCustomSelect(page, 'add-role', 'COMPANY');
    await page.getByRole('button', { name: 'Create User' }).click();
    await expect(page.getByText('User created successfully.')).toBeVisible();

    // log out through the UI
    await page.locator('.user-chip').click();
    await page.getByRole('button', { name: /log ?out/i }).click();
    await expect(page).toHaveURL(/\/login/);

    // log in with the promised default password
    await page.locator('#username').fill('e2e.login');
    await page.locator('#password').fill('e2e.login123');
    await page.locator('#login-role').click();
    await page.getByRole('option', { name: 'COMPANY', exact: true }).click();
    await page.getByRole('button', { name: /sign in|log in|login/i }).click();
    await page.waitForURL((url) => !url.pathname.startsWith('/login'), { timeout: 15_000 });
    await expect(page).toHaveURL(/\/company\/dashboard/);

    // cleanup: back to admin, delete the user
    await page.locator('.user-chip').click();
    await page.getByRole('button', { name: /log ?out/i }).click();
    await login(page, 'admin', 'admin123');
    await page.goto(PAGE_URL);
    await deleteUserByName(page, 'e2e.login');
  });
});
