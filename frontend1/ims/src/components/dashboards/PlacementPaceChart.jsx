/**
 * PC12 chart 8: how many placements reached each lifecycle stage, month by
 * month, for the company.
 *
 * <p>Source is GET /api/placements/timeline, built in PC8b and already
 * role-scoped server-side (admin sees everything, a company sees only its own),
 * so this commit adds no backend work and cannot leak another company's pace.
 *
 * <p>The backend emits one bucket per month that actually saw an event, so the
 * months in between are missing entirely. That matters for a line chart more
 * than for bars: plotting only the months that have data would draw a straight
 * segment across a three-month gap and imply placements were steady when
 * nothing happened. Empty months are therefore filled in as explicit zeros and
 * the series is drawn without smoothing, so a flat stretch reads as flat.
 *
 * <p>Each stage is cumulative — a placement offered in March and started in May
 * counts in March's "offered" and May's "started" — so the lines can cross and
 * are not a single narrowing funnel. The description therefore states the totals
 * per stage rather than a conversion rate.
 */
import { useTheme } from '../../context/ThemeContext';
import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { chartColor, seriesColor } from '../../charts/colors';
import { ChartCard, ChartEmpty, chartThemeFor } from '../../charts/ChartCard';

const STAGES = [
  ['offered', 'Offered'],
  ['assigned', 'Assigned'],
  ['started', 'Started'],
  ['completed', 'Completed'],
];

/** Fills the months the backend skipped, so a gap is plotted as a gap. */
function fillMonths(funnel) {
  if (!funnel.length) return [];
  const keys = funnel.map((f) => f.month).sort();
  const byMonth = new Map(funnel.map((f) => [f.month, f]));
  // Destructured as pairs, not scalars: `const [y] = '2026-01'.split('-')` would
  // yield 2026 and silently lose the month, which collapses every range to a
  // single month.
  const [startYear, startMonth] = keys[0].split('-').map(Number);
  const [endYear, endMonth] = keys[keys.length - 1].split('-').map(Number);

  const rows = [];
  let y = startYear;
  let m = startMonth;
  // Guarded so a malformed key cannot spin here forever.
  for (let guard = 0; guard < 240; guard++) {
    const key = `${y}-${String(m).padStart(2, '0')}`;
    const hit = byMonth.get(key);
    rows.push({
      month: key,
      offered: hit ? Number(hit.offered) || 0 : 0,
      assigned: hit ? Number(hit.assigned) || 0 : 0,
      started: hit ? Number(hit.started) || 0 : 0,
      completed: hit ? Number(hit.completed) || 0 : 0,
    });
    if (y === endYear && m === endMonth) break;
    m += 1;
    if (m > 12) {
      m = 1;
      y += 1;
    }
  }
  return rows;
}

export default function PlacementPaceChart({ timeline, error }) {
  const { isDark } = useTheme();
  const { grid, tickProps, tooltipStyle, labelStyle, legendStyle } = chartThemeFor(isDark);

  if (error) {
    return (
      <ChartCard title="Placement Pace" subtitle="Placements reaching each stage, by month">
        <div role="alert" className="h-48 flex items-center justify-center text-xs text-rose-600 dark:text-rose-400">
          {error}
        </div>
      </ChartCard>
    );
  }

  const funnel = Array.isArray(timeline?.funnel) ? timeline.funnel : [];
  const rows = fillMonths(funnel);
  const hasEvents = rows.some((r) => STAGES.some(([k]) => r[k] > 0));

  const totals = STAGES.map(([key, label]) => ({
    key,
    label,
    total: rows.reduce((t, r) => t + r[key], 0),
  }));
  const median = timeline?.medianTimeToPlacementDays;
  const durationSample = timeline?.activeDurationSample ?? 0;

  const summary = hasEvents
    ? `Placements by month over ${rows.length} ${rows.length === 1 ? 'month' : 'months'}. `
      + `Totals: ${totals.map((t) => `${t.label} ${t.total}`).join(', ')}.`
      + (median != null ? ` Median time from created to assigned is ${median} days.` : '')
      + (durationSample ? ` Average active duration is ${timeline.averageActiveDurationDays} days across ${durationSample} placements.` : '')
    : null;

  return (
    <ChartCard
      title="Placement Pace"
      subtitle="Placements reaching each stage, by month (cumulative per stage)"
      summary={summary}
    >
      {hasEvents ? (
        <ResponsiveContainer width="100%" height={280}>
          <LineChart data={rows} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke={grid} />
            <XAxis dataKey="month" tick={{ ...tickProps, fontSize: 10 }} interval={0} angle={-30} textAnchor="end" height={60} />
            <YAxis allowDecimals={false} tick={tickProps} />
            <Tooltip contentStyle={tooltipStyle} labelStyle={labelStyle} />
            <Legend wrapperStyle={legendStyle} />
            {STAGES.map(([key, label], i) => (
              // Not smoothed: a straight line between two distant months would
              // claim a steady trend across a gap that had no placements.
              <Line
                key={key}
                type="linear"
                dataKey={key}
                name={label}
                stroke={i === 0 ? seriesColor('primary', isDark) : chartColor(i, isDark)}
                strokeWidth={2}
                dot={{ r: 3 }}
              />
            ))}
          </LineChart>
        </ResponsiveContainer>
      ) : (
        <ChartEmpty message="No placement activity yet" />
      )}
    </ChartCard>
  );
}
