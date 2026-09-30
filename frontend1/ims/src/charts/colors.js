/**
 * Chart palette, the JS mirror of the `--chart-*` token block in App.css.
 *
 * SVG `fill`/`stroke` attributes and recharts `<Cell fill=...>` cannot read CSS
 * custom properties reliably, so charts resolve their colors from here. Keep
 * these values in sync with App.css.
 */

const LIGHT = {
  chart1: '#0d9488',
  chart2: '#f59e0b',
  chart3: '#059669',
  chart4: '#e11d48',
  chart5: '#0284c7',
  chart6: '#7c3aed',
  track: '#e2e8f0',
  text: '#0f172a',
  muted: '#64748b',
  label: '#475569',
  surface: '#ffffff',
};

const DARK = {
  chart1: '#2dd4bf',
  chart2: '#fbbf24',
  chart3: '#34d399',
  chart4: '#fb7185',
  chart5: '#38bdf8',
  chart6: '#a78bfa',
  track: '#1e293b',
  text: '#e2e8f0',
  muted: '#94a3b8',
  label: '#cbd5e1',
  surface: '#0f172a',
};

/** Sequential categorical palette, ordered for maximum adjacent contrast. */
export const CHART = Object.freeze([LIGHT.chart1, LIGHT.chart2, LIGHT.chart3, LIGHT.chart4, LIGHT.chart5, LIGHT.chart6]);

export const CHART_DARK = Object.freeze([DARK.chart1, DARK.chart2, DARK.chart3, DARK.chart4, DARK.chart5, DARK.chart6]);

/**
 * Review-state colors, keyed by the real diary vocabulary from
 * StudentDataContext: `Reviewed` = a university supervisor has commented,
 * `Awaiting review` = everything else.
 *
 * These keys must stay in sync with STATUSES there. `colors.test.js` asserts the
 * contract so the two cannot drift apart again — an earlier revision kept the
 * legacy task-board keys (Completed / In Progress / Uncompleted) and every chart
 * segment silently rendered `undefined`.
 */
export const STATUS_COLORS = Object.freeze({
  Reviewed: LIGHT.chart3,
  'Awaiting review': LIGHT.chart2,
});

export const STATUS_COLORS_DARK = Object.freeze({
  Reviewed: DARK.chart3,
  'Awaiting review': DARK.chart2,
});

export const TRACK = LIGHT.track;
export const TEXT = LIGHT.text;
export const MUTED = LIGHT.muted;

/**
 * Named hues for single-series charts, so a bar's meaning stays stable
 * instead of shifting with its position in a categorical list.
 */
export const SERIES = Object.freeze({
  primary: { light: LIGHT.chart1, dark: DARK.chart1 },
  accent: { light: LIGHT.chart2, dark: DARK.chart2 },
  violet: { light: LIGHT.chart6, dark: DARK.chart6 },
  sky: { light: LIGHT.chart5, dark: DARK.chart5 },
});

/** Resolve a named series hue for the active theme. */
export function seriesColor(name, isDark = false) {
  const entry = SERIES[name] || SERIES.primary;
  return isDark ? entry.dark : entry.light;
}

/** Resolve the theme-aware subset used by the hand-rolled SVG charts. */
export function chartTheme(isDark) {
  return isDark ? DARK : LIGHT;
}

/** Categorical color at `index`, wrapping past the end of the palette. */
export function chartColor(index, isDark = false) {
  const palette = isDark ? CHART_DARK : CHART;
  return palette[((index % palette.length) + palette.length) % palette.length];
}
