/**
 * PC12 chart 3: how many students sit at each "evaluations so far" level, for
 * the university supervisor.
 *
 * <p>Source is the existing GET /api/university/stats, which already carried the
 * per-student evaluation counts PC11 fetched to fix the N+1 — this chart reads
 * that aggregation rather than adding an endpoint, so it costs no new query and
 * cannot drift from the by-student table it is derived from.
 *
 * <p>The chart is ordered least-evaluated first, because the question a
 * supervisor opens this tab with is "who do I need to chase", and that is the
 * left-hand end. Buckets with no students are still plotted, so a healthy cohort
 * reads as a gap rather than as a chart whose axis silently re-scales.
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

export default function UnevaluatedDistributionChart({ buckets, totalStudents, error, loading }) {
  const { isDark } = useTheme();
  const { grid, tickProps, tooltipStyle, labelStyle } = chartThemeFor(isDark);

  if (error) {
    return (
      <ChartCard
        title="Students by Evaluations So Far"
        subtitle="Who still needs evaluating"
      >
        <div role="alert" className="h-48 flex items-center justify-center text-xs text-rose-600 dark:text-rose-400">
          {error}
        </div>
      </ChartCard>
    );
  }

  const rows = (Array.isArray(buckets) ? buckets : [])
    .map((b) => ({
      label: b.label != null ? b.label : String(b.evaluationCount ?? 0),
      students: Number(b.students) || 0,
      exact: b.label == null,
    }));

  // Cohort size is the backend's figure. If it disagrees with the sum of the
  // buckets the chart would be publishing a distribution that loses students,
  // so the discrepancy is stated instead of being plotted as if it were fine.
  const bucketed = rows.reduce((t, r) => t + r.students, 0);
  const cohort = Number(totalStudents) || 0;
  const mismatch = cohort && bucketed !== cohort;

  const summary = bucketed
    ? `${bucketed} ${bucketed === 1 ? 'student' : 'students'}: ${rows
      .map((r) => `${r.label} ${r.students}`)
      .join(', ')}.${mismatch ? ` Note: these buckets total ${bucketed} but the university has ${cohort} students.` : ''}`
    : null;

  return (
    <ChartCard
      title="Students by Evaluations So Far"
      subtitle="Who still needs evaluating"
      summary={summary}
      loading={loading}
    >
      {rows.length && bucketed ? (
        <ResponsiveContainer width="100%" height={240}>
          <BarChart data={rows} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke={grid} />
            <XAxis dataKey="label" tick={tickProps} interval={0} />
            <YAxis allowDecimals={false} tick={tickProps} />
            <Tooltip contentStyle={tooltipStyle} labelStyle={labelStyle} />
            <Bar dataKey="students" fill={seriesColor('primary', isDark)} radius={[6, 6, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      ) : (
        <ChartEmpty message="No students yet" />
      )}
    </ChartCard>
  );
}
