/**
 * PC12 chart 2: how consistently the student files diaries, week by week.
 *
 * <p>Source is GET /api/diaries/me, which the StudentDashboard already loads for
 * the diary tab, so this adds no backend work and no extra request — the chart
 * reads the same state the tab already has.
 *
 * <p>Cadence is bucketed by ISO week rather than plotted per day, because a
 * single missing day is invisible on a daily axis while a missed week is
 * obvious, and because a student filing 40 entries across 12 weeks should not
 * get 12 mostly-zero columns. Weeks with no entries are still plotted as zero:
 * the gap between two bursts is the whole point of a cadence chart, and dropping
 * empty weeks would compress the timeline and hide exactly the habit the chart
 * is for.
 */
import { useTheme } from '../../context/ThemeContext';
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { seriesColor } from '../../charts/colors';
import { ChartCard, ChartEmpty, chartThemeFor } from '../../charts/ChartCard';

/**
 * ISO week start (Monday) for a YYYY-MM-DD string, plus a sortable key.
 *
 * <p>Parsed by hand rather than via `new Date(string)` because that treats
 * YYYY-MM-DD as UTC midnight, and a timezone behind UTC would slide the date into
 * the previous week — quietly shifting a diary into the wrong bucket.
 */
function isoWeek(dateStr) {
  const [y, m, d] = String(dateStr).split('-').map(Number);
  if (!y || !m || !d) return null;
  const dt = new Date(y, m - 1, d);
  if (Number.isNaN(dt.getTime())) return null;
  const day = (dt.getDay() + 6) % 7; // Monday = 0
  dt.setDate(dt.getDate() - day);
  const pad = (n) => String(n).padStart(2, '0');
  return {
    key: `${dt.getFullYear()}-${pad(dt.getMonth() + 1)}-${pad(dt.getDate())}`,
    label: `${pad(dt.getDate())}/${pad(dt.getMonth() + 1)}`,
  };
}

export default function DiaryCadenceChart({ diaries, error }) {
  const { isDark } = useTheme();
  const { grid, tickProps, tooltipStyle, labelStyle } = chartThemeFor(isDark);

  if (error) {
    return (
      <ChartCard title="Diary Filing Cadence" subtitle="Entries per week">
        <div role="alert" className="h-48 flex items-center justify-center text-xs text-rose-600 dark:text-rose-400">
          {error}
        </div>
      </ChartCard>
    );
  }

  const weeks = new Map();
  let unparsed = 0;
  for (const d of diaries) {
    const w = isoWeek(d?.date);
    if (!w) {
      unparsed++;
      continue;
    }
    weeks.set(w.key, (weeks.get(w.key) || 0) + 1);
  }

  const rows = [...weeks.entries()]
    .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0))
    .map(([key, count]) => ({ key, count, label: isoWeek(key).label }));

  const total = rows.reduce((t, r) => t + r.count, 0);
  const busiest = rows.reduce((a, b) => (b.count > a.count ? b : a), rows[0]);
  const avg = rows.length ? Math.round((total / rows.length) * 10) / 10 : 0;

  // An entry whose date cannot be read is counted in the sentence rather than
  // dropped: a malformed date is a backend problem, and hiding it would make the
  // chart look complete while quietly omitting filings.
  const summary = rows.length
    ? `${total} ${total === 1 ? 'entry' : 'entries'} across ${rows.length} ${rows.length === 1 ? 'week' : 'weeks'}, averaging ${avg} per week. Busiest week began ${busiest.label} with ${busiest.count}.${unparsed ? ` ${unparsed} entries had an unreadable date and are not plotted.` : ''}`
    : null;

  return (
    <ChartCard
      title="Diary Filing Cadence"
      subtitle="Entries per week (weeks start Monday)"
      summary={summary}
    >
      {rows.length ? (
        <ResponsiveContainer width="100%" height={240}>
          <BarChart data={rows} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke={grid} />
            <XAxis dataKey="label" tick={{ ...tickProps, fontSize: 10 }} interval={0} angle={-30} textAnchor="end" height={60} />
            <YAxis allowDecimals={false} tick={tickProps} />
            <Tooltip contentStyle={tooltipStyle} labelStyle={labelStyle} />
            <Bar dataKey="count" fill={seriesColor('primary', isDark)} radius={[6, 6, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      ) : (
        <ChartEmpty message="No diary entries yet" />
      )}
    </ChartCard>
  );
}
