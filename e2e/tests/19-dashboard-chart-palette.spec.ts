import { test, expect, type Page } from '@playwright/test';
import { expectAppShell, loginAs } from './helpers';

// Block 19 — the four chart sections (Level of Progress, Status by Day, Overall
// Distribution, Trend Across the Week) still carried a green/amber/red status
// trio that belongs to no part of the product. They now use the RIHO emerald/teal
// ramp:
//   Completed    #0a4d4c  (--riho-primary, deep emerald)
//   In Progress  #0d9488  (teal-600 accent)
//   Uncompleted  #2dd4bf  (teal-400)
// mirrored in App.css as --chart-completed / --chart-inprogress /
// --chart-uncompleted and in STATUS_COLORS (StudentDashboard.js).

const RAMP = {
  completed: { hex: '#0a4d4c', rgb: 'rgb(10, 77, 76)' },
  inprogress: { hex: '#0d9488', rgb: 'rgb(13, 148, 136)' },
  uncompleted: { hex: '#2dd4bf', rgb: 'rgb(45, 212, 191)' },
};

const TRACK_RGB = 'rgb(207, 227, 224)';

/** Legacy green / amber / red status colours — none may survive in a chart. */
const LEGACY = [
  '22, 163, 74', // #16a34a
  '22, 101, 52', // green-800
  '217, 119, 6', // #d97706
  '245, 158, 11', // #f59e0b
  '146, 64, 14', // amber-800
  '220, 38, 38', // #dc2626
  '239, 68, 68', // #ef4444
  '153, 27, 27', // red-800
];

async function styleOf(page: Page, selector: string, prop: string): Promise<string> {
  return page.locator(selector).first().evaluate(
    (el, p) => getComputedStyle(el).getPropertyValue(p as string),
    prop
  );
}

test.describe('19 dashboard chart palette', () => {
  test.beforeEach(async ({ page }) => {
    await loginAs(page, 'STUDENT');
    await page.goto('/student/dashboard');
    await expectAppShell(page, 'Dashboard');
  });

  test('legend, heading pills and donut all use the emerald/teal ramp', async ({ page }) => {
    const expected = [RAMP.completed.rgb, RAMP.inprogress.rgb, RAMP.uncompleted.rgb];

    const swatches = page.locator('.progress-chart-swatch');
    expect(await swatches.count()).toBeGreaterThanOrEqual(3);
    for (let i = 0; i < 3; i += 1) {
      await expect(swatches.nth(i)).toHaveCSS('background-color', expected[i]);
    }

    const donut = page.locator('.donut-swatch');
    await expect(donut).toHaveCount(3);
    for (let i = 0; i < 3; i += 1) {
      await expect(donut.nth(i)).toHaveCSS('background-color', expected[i]);
    }

    const headings = page.locator('.progress-chart-heading');
    await expect(headings).toHaveCount(6); // two chart cards x three statuses
    for (let i = 0; i < 6; i += 1) {
      await expect(headings.nth(i)).toHaveCSS('background-color', expected[i % 3]);
    }
  });

  test('bars and chart surfaces are theme-tinted, with no legacy status colour left', async ({ page }) => {
    // themed rail behind the bars
    await expect(page.locator('.progress-bar-track').first()).toHaveCSS('background-color', TRACK_RGB);
    await expect(page.locator('.grouped-bar-track').first()).toHaveCSS('background-color', TRACK_RGB);

    // stacked segments + grouped fills carry the ramp
    const segments: Array<[string, string]> = [
      ['.segment-completed', RAMP.completed.rgb],
      ['.segment-inprogress', RAMP.inprogress.rgb],
      ['.segment-uncompleted', RAMP.uncompleted.rgb],
    ];
    for (const [selector, rgb] of segments) {
      expect(await styleOf(page, selector, 'background-image')).toContain(rgb);
    }
    const grouped: Array<[string, string]> = [
      ['.grouped-completed', RAMP.completed.rgb],
      ['.grouped-inprogress', RAMP.inprogress.rgb],
      ['.grouped-uncompleted', RAMP.uncompleted.rgb],
    ];
    for (const [selector, rgb] of grouped) {
      expect(await styleOf(page, selector, 'background-image')).toContain(rgb);
    }

    // sweep the chart chrome for any surviving green/amber/red
    const blob = await page.evaluate((selectors) => {
      return selectors
        .map((s) => {
          const el = document.querySelector(s);
          if (!el) return '';
          const cs = getComputedStyle(el);
          return `${cs.backgroundColor} ${cs.backgroundImage} ${cs.color}`;
        })
        .join(' | ');
    }, ['.progress-chart', '.progress-chart-heading', '.donut-chart', '.todo-summary', '.segment-completed']);
    for (const legacy of LEGACY) expect(blob).not.toContain(legacy);
  });

  test('the trend line series are drawn in the ramp', async ({ page }) => {
    const strokes = await page
      .locator('.line-chart polyline')
      .evaluateAll((els) => els.map((el) => el.getAttribute('stroke')));
    expect(strokes).toEqual([RAMP.completed.hex, RAMP.inprogress.hex, RAMP.uncompleted.hex]);
  });
});
