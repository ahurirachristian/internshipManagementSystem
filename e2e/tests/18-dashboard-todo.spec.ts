import { test, expect } from '@playwright/test';
import { expectAppShell, loginAs } from './helpers';

// Block 18 — the To-Do List section was a flat list with three pill counts. It
// is now a summary banner (completion ring + totals) over a filterable card
// list that carries type / assignee / due date / priority and a progress bar for
// in-flight work. The source is unchanged (useStudentData, 1000 tasks).
//
// Tab order: All Tasks, In Progress, Completed, Pending.
// Summary fact order: Total, Completed, In Progress, Pending.

const toNumber = (text: string) => Number(text.replace(/[^0-9]/g, ''));

test.describe('18 dashboard To-Do redesign', () => {
  test.beforeEach(async ({ page }) => {
    await loginAs(page, 'STUDENT');
    await page.goto('/student/dashboard');
    await expectAppShell(page, 'Dashboard');
    await expect(page.locator('.todo-card').first()).toBeVisible();
  });

  test('the summary reconciles with the tab counts and renders a completion ring', async ({ page }) => {
    const tabCounts = (await page.locator('.todo-tab-count').allTextContents()).map(toNumber);
    expect(tabCounts).toHaveLength(4);
    const [all, inProgress, completed, pending] = tabCounts;

    expect(all).toBe(1000);
    expect(inProgress + completed + pending).toBe(all);

    const facts = (await page.locator('.todo-fact-value').allTextContents()).map(toNumber);
    expect(facts).toEqual([all, completed, inProgress, pending]);

    const pct = Math.round((completed / all) * 100);
    await expect(page.locator('.todo-summary-value')).toHaveText(`${pct}%`);
    await expect(page.locator('.todo-summary-ring')).toHaveAttribute(
      'aria-label',
      `${pct}% of tasks completed`
    );

    // theme: the banner is the deep-emerald gradient, not an off-theme colour
    const background = await page
      .locator('.todo-summary')
      .evaluate((el) => getComputedStyle(el).backgroundImage);
    expect(background).toContain('10, 77, 76');
  });

  test('the All Tasks tab pages the full list', async ({ page }) => {
    await expect(page.locator('.todo-tab.active')).toContainText('All Tasks');
    await expect(page.locator('.todo-card')).toHaveCount(12);
    await expect(page.locator('.todo-count')).toHaveText('Showing 12 of 1,000');
  });

  test('the Completed filter shows only done tasks and hides progress bars', async ({ page }) => {
    await page.locator('.todo-tab').filter({ hasText: 'Completed' }).click();

    await expect(page.locator('.todo-tab.active')).toContainText('Completed');
    await expect(page.locator('.todo-card')).toHaveCount(12);
    await expect(page.locator('.todo-badge-completed')).toHaveCount(12);
    await expect(page.locator('.todo-progress')).toHaveCount(0);
  });

  test('the In Progress filter shows a progress bar on every card', async ({ page }) => {
    await page.locator('.todo-tab').filter({ hasText: 'In Progress' }).click();

    await expect(page.locator('.todo-tab.active')).toContainText('In Progress');
    const cards = page.locator('.todo-card');
    await expect(cards).toHaveCount(12);
    await expect(page.locator('.todo-badge-inprogress')).toHaveCount(12);
    await expect(page.locator('.todo-progress')).toHaveCount(12);
  });

  test('the Pending filter maps to the Uncompleted status', async ({ page }) => {
    await page.locator('.todo-tab').filter({ hasText: 'Pending' }).click();

    await expect(page.locator('.todo-tab.active')).toContainText('Pending');
    await expect(page.locator('.todo-card')).toHaveCount(12);
    await expect(page.locator('.todo-badge-uncompleted')).toHaveCount(12);
    await expect(page.locator('.todo-progress')).toHaveCount(0);
    await expect(page.locator('.todo-empty')).toHaveCount(0);
  });

  test('each card carries its type, assignee, due date and priority', async ({ page }) => {
    const first = page.locator('.todo-card').first();
    await expect(first.locator('.todo-chip')).toHaveCount(3);
    await expect(first.locator('.todo-chip').nth(0)).toContainText(/\w/);
    await expect(first.locator('.todo-chip').nth(2)).toContainText('Due ');
    await expect(first.locator('.todo-priority')).toHaveText(/Low|Medium|High/);
  });
});
