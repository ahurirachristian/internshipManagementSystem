import { test, expect } from '@playwright/test';
import { expectAppShell, loginAs } from './helpers';

// Block 16 — the student dashboard was painted in an indigo/violet palette
// (#4f46e5, #7c3aed, #6366f1, #4338ca, #eef2ff) that has nothing to do with the
// RIHO theme (deep emerald #0a4d4c + success/warning/danger semantic tokens).
// The hero, KPI icons, chart surfaces, trend swatches and active To-Do tab now
// use the theme tokens; status colours match --riho-success / --riho-warning /
// --riho-danger so the custom SVG charts line up with the rest of the app.

/** rgb() fragments from the old indigo/violet palette — none may survive. */
const INDIGO = [
  '99, 102, 241', // #6366f1
  '79, 70, 229', // #4f46e5
  '124, 58, 237', // #7c3aed
  '67, 56, 202', // #4338ca
  '238, 242, 255', // #eef2ff
  '199, 210, 254', // #c7d2fe
];

const TEAL_PRIMARY = '10, 77, 76'; // #0a4d4c

test.describe('16 dashboard theme colours', () => {
  test.beforeEach(async ({ page }) => {
    await loginAs(page, 'STUDENT');
    await page.goto('/student/dashboard');
    await expectAppShell(page, 'Dashboard');
  });

  test('the hero banner uses the emerald theme, not the indigo gradient', async ({ page }) => {
    const hero = page.locator('.project-management-hero');
    const background = await hero.evaluate((el) => getComputedStyle(el).backgroundImage);

    expect(background).toContain(TEAL_PRIMARY);
    for (const indigo of INDIGO) expect(background).not.toContain(indigo);
  });

  test('every KPI icon is painted in a theme colour', async ({ page }) => {
    const icons = page.locator('.kpi-card-icon');
    await expect(icons).toHaveCount(4);

    for (let i = 0; i < 4; i += 1) {
      const background = await icons.nth(i).evaluate((el) => getComputedStyle(el).backgroundImage);
      for (const indigo of INDIGO) expect(background, `KPI ${i}`).not.toContain(indigo);
    }

    // the first card (Total Project) is the teal accent
    const first = await icons.first().evaluate((el) => getComputedStyle(el).backgroundImage);
    expect(first).toContain('15, 118, 110'); // #0f766e
  });

  test('chart surfaces and the active To-Do tab stay on the theme', async ({ page }) => {
    const chart = await page
      .locator('.progress-chart')
      .first()
      .evaluate((el) => getComputedStyle(el).backgroundImage);
    expect(chart).toContain('230, 242, 241'); // #e6f2f1 teal tint
    for (const indigo of INDIGO) expect(chart).not.toContain(indigo);

    const tab = page.locator('.todo-tab').first();
    await tab.click();
    const tabStyle = await tab.evaluate((el) => {
      const s = getComputedStyle(el);
      return `${s.backgroundColor} ${s.color} ${s.borderColor}`;
    });
    for (const indigo of INDIGO) expect(tabStyle).not.toContain(indigo);
  });

  test('status colours use the project emerald/teal chart ramp', async ({ page }) => {
    const swatches = page.locator('.donut-swatch');
    await expect(swatches).toHaveCount(3);

    // --chart-completed / --chart-inprogress / --chart-uncompleted
    const expected = ['rgb(10, 77, 76)', 'rgb(13, 148, 136)', 'rgb(45, 212, 191)'];
    for (let i = 0; i < expected.length; i += 1) {
      await expect(swatches.nth(i)).toHaveCSS('background-color', expected[i]);
    }
  });
});
