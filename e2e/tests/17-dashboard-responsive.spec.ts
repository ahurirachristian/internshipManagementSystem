import { test, expect, type Page } from '@playwright/test';
import { loginAs } from './helpers';

// Block 17 — responsiveness of the student dashboard. Every widget named in the
// review (KPIs, Level of Progress, Status by Day, Overall Distribution, Trend
// Across the Week, To-Do List) must fit desktop, tablet and phone widths without
// a horizontal page scrollbar and without any text spilling out of its box.

const VIEWPORTS: Array<{ name: string; width: number; height: number }> = [
  { name: 'desktop 1440', width: 1440, height: 900 },
  { name: 'laptop 1024', width: 1024, height: 768 },
  { name: 'tablet 768', width: 768, height: 1024 },
  { name: 'phone 390', width: 390, height: 844 },
];

/** Text nodes that must never be clipped by their own box. */
const TEXT_SELECTORS = [
  '.page-title',
  '.page-subtitle',
  '.kpi-card-label',
  '.kpi-card-value',
  '.progress-chart-header h2',
  '.progress-chart-header p',
  '.progress-chart-heading',
  '.progress-chart-heading strong',
  '.progress-chart-legend-item',
  '.chart-subtitle',
  '.donut-label',
  '.donut-value',
  '.todo-tab',
  '.todo-toolbar',
  '.todo-card-title',
  '.todo-chip',
  '.todo-badge',
  '.todo-fact-value',
];

/** Shell check that also works below the 900px breakpoint, where the fixed
 *  sidebar is display:none rather than visible. */
async function expectDashboard(page: Page): Promise<void> {
  await expect(page.locator('.topbar')).toBeVisible();
  await expect(page.locator('h1.page-title')).toHaveText('Dashboard');
}

async function clippedText(page: Page): Promise<string[]> {
  return page.evaluate((selectors) => {
    const out: string[] = [];
    for (const selector of selectors) {
      document.querySelectorAll(selector).forEach((el) => {
        const overflowX = getComputedStyle(el).overflowX;
        // Only elements that would visually clip or spill matter.
        if (overflowX === 'visible') return;
        if (el.scrollWidth > el.clientWidth + 1) {
          out.push(`${selector}: ${el.scrollWidth} > ${el.clientWidth}`);
        }
      });
    }
    return out;
  }, TEXT_SELECTORS);
}

test.describe('17 dashboard responsiveness', () => {
  test.beforeEach(async ({ page }) => {
    await loginAs(page, 'STUDENT');
  });

  test('no viewport causes a horizontal page scrollbar', async ({ page }) => {
    test.setTimeout(120_000);
    for (const vp of VIEWPORTS) {
      await page.setViewportSize({ width: vp.width, height: vp.height });
      await page.goto('/student/dashboard');
      await expectDashboard(page);

      const overflow = await page.evaluate(() => {
        const doc = document.documentElement;
        return { scrollWidth: doc.scrollWidth, clientWidth: doc.clientWidth };
      });
      expect(
        overflow.scrollWidth,
        `${vp.name}: page is ${overflow.scrollWidth}px wide in a ${overflow.clientWidth}px viewport`
      ).toBeLessThanOrEqual(overflow.clientWidth + 1);
    }
  });

  test('every dashboard widget stays inside the viewport', async ({ page }) => {
    test.setTimeout(120_000);
    const widgets = [
      '.project-management-hero',
      '.kpi-card',
      '.progress-chart-card',
    ];

    for (const vp of VIEWPORTS) {
      await page.setViewportSize({ width: vp.width, height: vp.height });
      await page.goto('/student/dashboard');
      await expectDashboard(page);

      for (const selector of widgets) {
        const boxes = await page.locator(selector).evaluateAll((els) =>
          els.map((el) => {
            const r = el.getBoundingClientRect();
            return { left: r.left, right: r.right, width: r.width };
          })
        );
        expect(boxes.length, `${selector} present at ${vp.name}`).toBeGreaterThan(0);
        for (const box of boxes) {
          expect(box.left, `${selector} left at ${vp.name}`).toBeGreaterThanOrEqual(-1);
          expect(box.right, `${selector} right at ${vp.name}`).toBeLessThanOrEqual(vp.width + 1);
        }
      }
    }
  });

  test('no dashboard text overflows its box', async ({ page }) => {
    test.setTimeout(120_000);
    for (const vp of VIEWPORTS) {
      await page.setViewportSize({ width: vp.width, height: vp.height });
      await page.goto('/student/dashboard');
      await expectDashboard(page);
      await expect(page.locator('.todo-card').first()).toBeVisible();

      expect(await clippedText(page), `clipped text at ${vp.name}`).toEqual([]);
    }
  });
});
