import { test, expect, type Page } from '@playwright/test';
import { loginAs } from './helpers';

// Block 20 — the Status by Day grouped chart lived in a single dashboard column
// (~300px), so its per-day value string "12 / 5 / 3" and the number badges inside
// the bars ran into the next day. The card now spans the full grid row and each
// day renders its total above the group with one count directly under each bar.
//
// This spec measures real bounding boxes: no day column may overlap the next, and
// every value/label must stay inside its own column, at four viewports.

const VIEWPORTS: Array<{ name: string; width: number; height: number }> = [
  { name: 'desktop 1440', width: 1440, height: 900 },
  { name: 'laptop 1024', width: 1024, height: 768 },
  { name: 'tablet 768', width: 768, height: 1024 },
  { name: 'phone 390', width: 390, height: 844 },
];

interface Column {
  left: number;
  right: number;
  top: number;
  bottom: number;
  texts: Array<{ text: string; left: number; right: number }>;
}

async function dayColumns(page: Page): Promise<Column[]> {
  return page.locator('.status-by-day .progress-bar-wrapper').evaluateAll((els) =>
    els.map((el) => {
      const r = el.getBoundingClientRect();
      const texts = Array.from(
        el.querySelectorAll('.progress-bar-value, .grouped-bar-count, .progress-bar-label')
      ).map((t) => {
        const tr = t.getBoundingClientRect();
        return { text: (t.textContent || '').trim(), left: tr.left, right: tr.right };
      });
      return { left: r.left, right: r.right, top: r.top, bottom: r.bottom, texts };
    })
  );
}

/** Below 720px the chart wraps to two rows of three, so only siblings that share
 *  a row (their vertical extents intersect) can actually collide. */
function sharesRow(a: Column, b: Column): boolean {
  return a.top < b.bottom - 0.5 && b.top < a.bottom - 0.5;
}

async function openDashboard(page: Page, width: number, height: number): Promise<void> {
  await page.setViewportSize({ width, height });
  await page.goto('/student/dashboard');
  await expect(page.locator('.status-by-day .progress-bar-wrapper').first()).toBeVisible();
}

test.describe('20 Status by Day layout', () => {
  test.beforeEach(async ({ page }) => {
    await loginAs(page, 'STUDENT');
  });

  test('the card spans the grid so its six columns have room', async ({ page }) => {
    await openDashboard(page, 1440, 900);
    const grid = await page.locator('.dashboard-grid').boundingBox();
    const card = await page.locator('.status-by-day').boundingBox();
    expect(card!.width).toBeGreaterThan(grid!.width * 0.9);
  });

  test('no day column overlaps the next at any viewport', async ({ page }) => {
    test.setTimeout(120_000);
    for (const vp of VIEWPORTS) {
      await openDashboard(page, vp.width, vp.height);

      const columns = await dayColumns(page);
      expect(columns.length, `six day columns at ${vp.name}`).toBe(6);

      for (let i = 1; i < columns.length; i += 1) {
        if (!sharesRow(columns[i - 1], columns[i])) continue;
        expect(
          columns[i].left,
          `${vp.name}: ${i} overlaps the previous day column`
        ).toBeGreaterThanOrEqual(columns[i - 1].right - 0.5);
      }

      for (const column of columns) {
        for (const t of column.texts) {
          expect(t.text, `empty label at ${vp.name}`).not.toBe('');
          expect(t.left, `"${t.text}" spills left at ${vp.name}`).toBeGreaterThanOrEqual(
            column.left - 0.5
          );
          expect(t.right, `"${t.text}" spills right at ${vp.name}`).toBeLessThanOrEqual(
            column.right + 0.5
          );
        }
      }
    }
  });

  test('each day has a total plus one count per bar, and the old hint is gone', async ({ page }) => {
    await openDashboard(page, 1440, 900);

    const wrappers = page.locator('.status-by-day .progress-bar-wrapper');
    await expect(wrappers).toHaveCount(6);

    await expect(page.locator('.status-by-day .progress-bar-value')).toHaveCount(6);
    await expect(page.locator('.status-by-day .grouped-bar-values')).toHaveCount(6);
    await expect(page.locator('.status-by-day .grouped-bar-count')).toHaveCount(18);
    await expect(page.locator('.status-by-day .grouped-axis-hint')).toHaveCount(0);
    await expect(page.locator('.status-by-day .grouped-bar-num')).toHaveCount(0);

    // each count grid must sit directly under its bar group, same column rhythm
    const first = wrappers.first();
    const bars = await first.locator('.progress-bar-grouped').boundingBox();
    const counts = await first.locator('.grouped-bar-values').boundingBox();
    expect(counts!.x).toBeCloseTo(bars!.x, 0);
    expect(counts!.width).toBeCloseTo(bars!.width, 0);
  });
});
