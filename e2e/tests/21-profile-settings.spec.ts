import { test, expect, type Page } from '@playwright/test';
import { API, loginAs } from './helpers';

// Block 21 — Profile Settings (/student/profile-settings) was the last page built
// from raw browser controls: a native <select className="form-input"> for the
// theme plus bare <input type="checkbox"> toggles (the .settings-grid / .toggle
// classes it referenced were defined nowhere, so the whole page rendered bare).
// It now uses the design system: the shared CustomSelect (the same control as the
// Audit Logs / User Management / Placement filters) and role="switch" controls in
// the teal palette.
//
// Settings persist per username through GET/PUT /api/students/me/settings, so the
// mutating test captures the original values and restores them.

const PAGE_URL = '/student/profile-settings';

interface Settings {
  emailNotifications: boolean;
  smsNotifications: boolean;
  diaryReminders: boolean;
  theme: string;
}

async function readSettings(page: Page): Promise<Settings> {
  const response = await page.request.get(`${API}/api/students/me/settings`);
  expect(response.ok()).toBeTruthy();
  return response.json();
}

async function restoreSettings(page: Page, settings: Settings): Promise<void> {
  await page.request.put(`${API}/api/students/me/settings`, { data: settings });
}

test.describe('21 profile settings design', () => {
  test.beforeEach(async ({ page }) => {
    await loginAs(page, 'STUDENT');
    await page.goto(PAGE_URL);
    await expect(page.locator('h1.page-title')).toHaveText('Profile Settings');
  });

  test('the page uses the design-system controls, not native form controls', async ({ page }) => {
    await expect(page.locator('#settings-theme')).toBeVisible();

    // no native <select> anywhere on the page
    await expect(page.locator('select')).toHaveCount(0);
    // no bare checkboxes either
    await expect(page.locator('input[type="checkbox"]')).toHaveCount(0);

    // the theme control is the shared CustomSelect (button + listbox)
    const theme = page.locator('#settings-theme');
    await expect(theme).toHaveAttribute('aria-haspopup', 'listbox');
    await expect(theme).toHaveAttribute('aria-expanded', 'false');

    await theme.click();
    await expect(theme).toHaveAttribute('aria-expanded', 'true');

    const options = page.getByRole('listbox').getByRole('option');
    await expect(options).toHaveCount(3);
    await expect(options.nth(0)).toHaveText('Light');
    await expect(options.nth(1)).toHaveText('Dark');
    await expect(options.nth(2)).toHaveText('System');

    await page.keyboard.press('Escape');
    await expect(theme).toHaveAttribute('aria-expanded', 'false');
    await expect(page.getByRole('listbox')).toHaveCount(0);

    // the notification controls are real switches
    await expect(page.getByRole('switch')).toHaveCount(3);
  });

  test('the theme dropdown and switches save and survive a reload, then restore', async ({ page }) => {
    const original = await readSettings(page);
    try {
      await page.goto(PAGE_URL);
      const theme = page.locator('#settings-theme');
      await expect(theme).toBeVisible();

      // pick a theme that differs from the stored value
      const target = original.theme === 'dark' ? 'Light' : 'Dark';
      await theme.click();
      await page.getByRole('option', { name: target, exact: true }).click();

      await expect(theme).toContainText(target);
      await expect(page.getByRole('status')).toContainText('Settings saved successfully.');

      await page.reload();
      await expect(page.locator('#settings-theme')).toContainText(target);

      // flip the first switch and confirm it persists
      const firstSwitch = page.getByRole('switch').first();
      const before = await firstSwitch.getAttribute('aria-checked');
      const after = before === 'true' ? 'false' : 'true';
      await firstSwitch.click();
      await expect(firstSwitch).toHaveAttribute('aria-checked', after);

      await page.reload();
      await expect(page.getByRole('switch').first()).toHaveAttribute('aria-checked', after);
    } finally {
      // hygiene: leave the account exactly as the suite found it
      await restoreSettings(page, original);
      expect(await readSettings(page)).toEqual(original);
    }
  });
});
