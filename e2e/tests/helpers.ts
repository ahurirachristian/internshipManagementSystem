import { expect, type Page } from '@playwright/test';

export const API = 'http://localhost:8082';
export const APP = 'http://localhost:3000';

export interface Credentials {
  username: string;
  password: string;
  role: 'ADMIN' | 'SUPERVISOR' | 'COMPANY' | 'STUDENT';
  home: string;
}

export const CREDENTIALS: Record<string, Credentials> = {
  ADMIN: { username: 'admin', password: 'admin123', role: 'ADMIN', home: '/admin/dashboard' },
  SUPERVISOR: {
    username: 'university',
    password: 'university123',
    role: 'SUPERVISOR',
    home: '/university/dashboard',
  },
  COMPANY: { username: 'airtel', password: 'company123', role: 'COMPANY', home: '/company/dashboard' },
  STUDENT: {
    username: '2400101003',
    password: 'Student@123',
    role: 'STUDENT',
    home: '/student/dashboard',
  },
};

/**
 * Drives the login page. The role picker is a CustomSelect (a button with
 * aria-haspopup="listbox"), not a native <select>.
 */
export async function login(
  page: Page,
  username: string,
  password: string,
  role: Credentials['role'] = 'ADMIN'
): Promise<void> {
  await page.goto('/login');
  await page.locator('#username').fill(username);
  await page.locator('#password').fill(password);
  await page.locator('#login-role').click();
  await page.getByRole('option', { name: role, exact: true }).click();
  await page.getByRole('button', { name: /sign in|log in|login/i }).click();
  await page.waitForURL((url) => !url.pathname.startsWith('/login'), { timeout: 15_000 });
}

export async function loginAs(page: Page, role: keyof typeof CREDENTIALS): Promise<void> {
  const c = CREDENTIALS[role];
  await login(page, c.username, c.password, c.role);
}

/** Chooses an option in a CustomSelect by its element id. */
export async function pickCustomSelect(page: Page, selectId: string, optionLabel: string): Promise<void> {
  await page.locator(`#${selectId}`).click();
  await page.getByRole('option', { name: optionLabel, exact: true }).click();
}

/** Collects console errors emitted by the page. */
export function collectConsoleErrors(page: Page): string[] {
  const errors: string[] = [];
  page.on('console', (msg) => {
    if (msg.type() === 'error') errors.push(msg.text());
  });
  page.on('pageerror', (err) => errors.push(String(err)));
  return errors;
}

/** Collects responses with a status >= 400 (URL + status). */
export function collectFailedRequests(page: Page): string[] {
  const failures: string[] = [];
  page.on('response', (response) => {
    if (response.status() >= 400) {
      failures.push(`${response.status()} ${response.url()}`);
    }
  });
  return failures;
}

/**
 * The app shell every protected route must render. See plan H11.
 */
export async function expectAppShell(page: Page, expectedTitle?: string): Promise<void> {
  await expect(page.locator('.dashboard-shell .sidebar')).toBeVisible();
  await expect(page.locator('.topbar')).toBeVisible();
  const title = page.locator('h1.page-title');
  await expect(title).toBeVisible();
  if (expectedTitle) {
    await expect(title).toHaveText(expectedTitle);
  } else {
    await expect(title).not.toHaveText('');
  }
}
