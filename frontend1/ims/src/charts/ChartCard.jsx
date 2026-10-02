/**
 * PC12: the shared chart card, empty state and theme, extracted from
 * UniversityDashboard so the eight new charts do not each grow their own copy.
 *
 * <p>The markup is byte-for-byte what UniversityDashboard has been rendering
 * since PC5, including the accessibility contract, so extracting it is a move
 * rather than a redesign. The point is that an accessibility fix or a token
 * change has one home instead of nine.
 */
import { chartTheme } from './colors';

/**
 * A chart is a picture as far as assistive tech is concerned, so each one
 * carries the sentence a sighted user reads off the axes. Without it the SVG
 * surfaces as an unlabelled graphic and the numbers are unreachable.
 *
 * <p>The surrounding section keeps its heading, so the label describes the
 * visual rather than replacing the title.
 */
export function ChartCard({ title, subtitle, summary, children }) {
  return (
    <section className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs p-5">
      <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100 mb-0.5">{title}</h3>
      <p className="text-[11px] text-slate-500 dark:text-slate-400 mb-4">{subtitle}</p>
      {/* No summary means there is nothing plotted, so the empty state's own text
          is left readable rather than hidden behind an image role. */}
      {summary ? (
        <div role="img" aria-label={summary}>{children}</div>
      ) : (
        children
      )}
    </section>
  );
}

/** The "nothing to plot" state. Distinct from zero, which is a real reading. */
export function ChartEmpty({ message }) {
  return (
    <div className="h-48 flex items-center justify-center text-xs text-slate-400">{message}</div>
  );
}

/**
 * The axis, grid and tooltip styles every chart needs, derived once per render
 * instead of being restated inside each chart. Keeps the PC1 dark-mode tokens
 * in a single place: a chart cannot forget to honour the theme.
 */
export function chartThemeFor(isDark) {
  const theme = chartTheme(isDark);
  return {
    // The muted ink itself, for the charts that need a different tick size.
    tick: theme.muted,
    grid: theme.track,
    tickProps: { fontSize: 12, fill: theme.muted },
    tooltipStyle: {
      backgroundColor: theme.surface,
      border: `1px solid ${theme.track}`,
      color: theme.text,
      borderRadius: '8px',
      fontSize: '12px',
    },
    labelStyle: { color: theme.text },
    legendStyle: { color: theme.label },
  };
}
