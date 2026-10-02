/**
 * PC12 chart 1: the student's own evaluation scores, on the 0-10 scale PC6a
 * established.
 *
 * <p>Source is GET /api/evaluations/me, which already existed and is scoped to
 * the caller's own student record server-side, so there is no backend work in
 * this commit and no way for this chart to read someone else's grades.
 *
 * <p>The one subtlety is nullability. Every criterion is an Integer that a
 * supervisor may legitimately leave blank, and a blank is not a zero. Averaging
 * with a `|| 0` would let an unfinished evaluation pull the mean down and the
 * student would be shown a score they were never given, so a criterion is only
 * included when at least one evaluation actually scored it.
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

const CRITERIA = [
  ['punctuality', 'Punctuality'],
  ['practicalWorkEthics', 'Work Ethics'],
  ['attendance', 'Attendance'],
  ['workplacePerformance', 'Performance'],
  ['logbookQuality', 'Logbook'],
  ['academicReport', 'Academic Report'],
  ['presentation', 'Presentation'],
];

export default function EvaluationScoresChart({ evaluations, error, loading }) {
  const { isDark } = useTheme();
  const { grid, tickProps, tooltipStyle, labelStyle } = chartThemeFor(isDark);

  if (error) {
    return (
      <ChartCard title="My Evaluation Scores" subtitle="Your mean score per criterion (0-10)">
        <div role="alert" className="h-48 flex items-center justify-center text-xs text-rose-600 dark:text-rose-400">
          {error}
        </div>
      </ChartCard>
    );
  }

  // Mean of the evaluations that actually scored each criterion. A criterion
  // nobody has scored yet is absent from the chart rather than plotted as zero.
  const rows = CRITERIA.map(([key, label]) => {
    const scored = evaluations
      .map((e) => e[key])
      .filter((v) => typeof v === 'number' && !Number.isNaN(v));
    return {
      criterion: label,
      mean: scored.length
        ? Math.round((scored.reduce((a, b) => a + b, 0) / scored.length) * 10) / 10
        : null,
      scoredCount: scored.length,
    };
  }).filter((r) => r.mean !== null);

  const summary = rows.length
    ? `Mean scores out of 10: ${rows.map((r) => `${r.criterion} ${r.mean}`).join(', ')}.`
    : null;

  return (
    <ChartCard
      title="My Evaluation Scores"
      subtitle="Your mean score per criterion (0-10)"
      summary={summary}
      loading={loading}
    >
      {rows.length ? (
        <ResponsiveContainer width="100%" height={280}>
          <BarChart data={rows} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke={grid} />
            <XAxis dataKey="criterion" tick={{ ...tickProps, fontSize: 10 }} interval={0} angle={-20} textAnchor="end" height={60} />
            <YAxis domain={[0, 10]} allowDecimals tick={tickProps} />
            <Tooltip contentStyle={tooltipStyle} labelStyle={labelStyle} />
            <Bar dataKey="mean" fill={seriesColor('primary', isDark)} radius={[6, 6, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      ) : (
        <ChartEmpty message="No evaluation scores yet" />
      )}
    </ChartCard>
  );
}
