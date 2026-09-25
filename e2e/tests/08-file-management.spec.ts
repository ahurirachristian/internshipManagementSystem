import { test, expect, type Page } from '@playwright/test';
import { login } from './helpers';

// Block 8 — File Management (/file-management):
//
// The page is a static mock (hardcoded folders/files, illustrative storage bar,
// no backend storage). Per the test plan (Option A) the per-file Preview /
// Download / More controls are disabled rather than silently doing nothing, so
// a user cannot believe a download happened. This spec asserts the working
// behaviour and the honesty of the disabled controls.

const URL = '/file-management';

/** Collects requests to the backend API (excluding the AuthContext /api/me bootstrap). */
function collectApiRequests(page: Page): string[] {
  const requests: string[] = [];
  page.on('request', (request) => {
    const url = request.url();
    if (url.includes(':8082/') && !url.includes('/api/me')) {
      requests.push(`${request.method()} ${url}`);
    }
  });
  return requests;
}

test.describe('08 file management', () => {
  test.beforeEach(async ({ page }) => {
    await login(page, 'admin', 'admin123');
    await page.goto(URL);
    await expect(page.locator('h1.page-title')).toHaveText('File Management');
  });

  test('plan card, storage bar, quick access, folders and files render', async ({ page }) => {
    // Plan card: trial tier with illustrative capacity
    await expect(page.getByText('Trial Version')).toBeVisible();
    await expect(page.locator('.plan-badge')).toHaveText('FREE');
    await expect(page.getByText('100 GB Space')).toBeVisible();

    // Storage bar: 25% fill with the "25 GB of 100 GB used" caption
    const fill = page.locator('.storage-bar-fill');
    await expect(fill).toBeVisible();
    await expect(fill).toHaveAttribute('style', /width:\s*25%/); // 25 of 100 GB
    await expect(page.getByText('25 GB of 100 GB used')).toBeVisible();

    // Quick Access items
    const quickAccess = page.locator('.file-management-quickaccess button');
    await expect(quickAccess).toHaveCount(8);
    for (const label of ['Videos', 'Apps', 'Document', 'Music', 'Download', 'Folder', 'Zip File', 'Trash']) {
      await expect(page.locator('.file-management-quickaccess button', { hasText: label })).toBeVisible();
    }

    // Folders and files (seeded mock data)
    for (const folder of ['Tivo admin', 'Viho admin', 'Unice admin', 'Koho admin']) {
      await expect(page.locator('.folder-name', { hasText: folder })).toBeVisible();
    }
    for (const file of ['Logo.psd', 'Backend.xls', 'Project.zip', 'Report.txt']) {
      await expect(page.locator('.file-name', { hasText: file })).toBeVisible();
    }
    await expect(page.locator('.files-count')).toHaveText('4 items');
  });

  test('quick access selection moves the active highlight and file list is unchanged', async ({ page }) => {
    const activeLinks = page.locator('.file-management-quickaccess button.active');
    await expect(activeLinks).toHaveCount(1);
    await expect(activeLinks.first()).toHaveText(/Folder/);

    await page.locator('.file-management-quickaccess button', { hasText: 'Videos' }).click();
    await expect(activeLinks.first()).toHaveText(/Videos/);

    // Documented behaviour: Quick Access is a highlight toggle only — the file
    // list is a static mock and does not change.
    await expect(page.locator('.files-count')).toHaveText('4 items');
    for (const file of ['Logo.psd', 'Backend.xls', 'Project.zip', 'Report.txt']) {
      await expect(page.locator('.file-name', { hasText: file })).toBeVisible();
    }
  });

  test('search filters both folders and files and shows no-match messages', async ({ page }) => {
    const search = page.getByLabel('Search files');

    // Folder-only term
    await search.fill('Viho');
    await expect(page.locator('.folder-name')).toHaveCount(1);
    await expect(page.locator('.folder-name', { hasText: 'Viho admin' })).toBeVisible();
    await expect(page.locator('.file-name', { hasText: 'Backend.xls' })).toHaveCount(0);
    await expect(page.locator('.file-management-files .folder-empty')).toHaveText('No files match "Viho".');

    // File-only term
    await search.fill('Report');
    await expect(page.locator('.file-name')).toHaveCount(1);
    await expect(page.locator('.file-name', { hasText: 'Report.txt' })).toBeVisible();
    await expect(page.locator('.folder-empty', { hasText: 'No folders match' })).toBeVisible();

    // Nonsense term
    await search.fill('zzz-nothing');
    await expect(page.locator('.file-management-folders .folder-empty')).toHaveText('No folders match "zzz-nothing".');
    await expect(page.locator('.file-management-files .folder-empty')).toHaveText('No files match "zzz-nothing".');
    await expect(page.locator('.files-count')).toHaveText('0 items');

    // Clearing restores everything
    await search.fill('');
    await expect(page.locator('.folder-name')).toHaveCount(4);
    await expect(page.locator('.file-name')).toHaveCount(4);
    await expect(page.locator('.files-count')).toHaveText('4 items');
  });

  test('per-file Preview, Download and More controls are disabled (no phantom downloads)', async ({ page }) => {
    const row = page.locator('.file-row', { hasText: 'Logo.psd' });
    for (const title of ['Preview', 'Download', 'More']) {
      const button = row.locator(`button[title="${title}"]`);
      await expect(button).toBeVisible();
      await expect(button).toBeDisabled();
    }

    // Clicking the disabled Download control must not trigger a download event.
    let downloadFired = false;
    page.on('download', () => {
      downloadFired = true;
    });
    await row.locator('button[title="Download"]').click({ force: true, trial: false }).catch(() => {
      // Browsers drop clicks on disabled controls; either way no download may fire.
    });
    await page.waitForTimeout(300);
    expect(downloadFired).toBeFalsy();
  });

  test('the page issues no backend storage requests', async ({ page }) => {
    const apiRequests = collectApiRequests(page);
    await page.goto(URL);
    await expect(page.locator('h1.page-title')).toHaveText('File Management');

    // Interact with everything that is interactive.
    await page.getByLabel('Search files').fill('Report');
    await page.getByLabel('Search files').fill('');
    await page.locator('.file-management-quickaccess button', { hasText: 'Trash' }).click();

    // The only expected call is the auth bootstrap /api/me, which is filtered out.
    expect(apiRequests).toEqual([]);
  });
});
