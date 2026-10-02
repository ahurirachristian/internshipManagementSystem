/**
 * PC12 chart 7: where the company's vacancy applications currently sit.
 *
 * <p>Source is GET /api/applications, which the applications tab already loads,
 * so this adds no backend work and no extra request.
 *
 * <p>Named as a distribution rather than a funnel on purpose. A true funnel is
 * cumulative — it answers "how many reached at least this stage" — and that is
 * not derivable here: Application records store the status they are in, not the
 * path they took, so an application that was shortlisted and then rejected
 * appears only as REJECTED. Rendering these six buckets as a tapering funnel
 * would imply a drop-off that the data cannot support, so the counts are shown
 * for what they are: the current status of every application in scope.
 *
 * <p>PC9's /api/applications/funnel returns the same per-status counts and is
 * deliberately not used: it would be a second request for data already held, and
 * reconciling two sources for one chart is how the two drift apart.
 */
import { useTheme } from '../../context/ThemeContext';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { chartColor } from '../../charts/colors';
import { ChartCard, ChartEmpty, chartThemeFor } from '../../charts/ChartCard';

// Declaration order, not alphabetical: the reader scans a pipeline left to
// right, and the chart is a pipeline-shaped question even though the counts are
// a snapshot.
const STAGES = ['SUBMITTED', 'REVIEWING', 'SHORTLISTED', 'ACCEPTED', 'REJECTED', 'WITHDRAWN'];

const LABELS = {
  SUBMITTED: 'Submitted',
  REVIEWING: 'Reviewing',
  SHORTLISTED: 'Shortlisted',
  ACCEPTED: 'Accepted',
  REJECTED: 'Rejected',
  WITHDRAWN: 'Withdrawn',
};

export default function ApplicationsFunnelChart({ applications, error, loading }) {
  const { isDark } = useTheme();
  const { grid, tickProps, tooltipStyle, labelStyle } = chartThemeFor(isDark);
  if (error) {
    return (
      <ChartCard title="Applications by Status" subtitle="Every application you can see, by current status">
        <div role="alert" className="h-48 flex items-center justify-center text-xs text-rose-600 dark:text-rose-400">
          {error}
        </div>
      </ChartCard>
    );
  }

  const counts = new Map(STAGES.map((s) => [s, 0]));
  let unknown = 0;
  for (const a of applications) {
    const s = a?.status;
    if (counts.has(s)) counts.set(s, counts.get(s) + 1);
    else unknown++;
  }

  const rows = STAGES
    .map((status) => ({ status, label: LABELS[status], count: counts.get(status) }))
    .filter((r) => r.count > 0);

  const total = rows.reduce((t, r) => t + r.count, 0);
  const open = (counts.get('SUBMITTED') || 0) + (counts.get('REVIEWING') || 0) + (counts.get('SHORTLISTED') || 0);
  const accepted = counts.get('ACCEPTED') || 0;

  // Every bucket is named, including the zero ones that were filtered out of the
  // bars, so the sentence is a complete account of the pipeline rather than only
  // the stages that happened to have entries.
  const summary = total
    ? `${total} ${total === 1 ? 'application' : 'applications'}: ${STAGES.map(
      (s) => `${LABELS[s]} ${counts.get(s)}`,
    ).join(', ')}. ${open} still open, ${accepted} accepted.${unknown ? ` ${unknown} had a status outside the expected set and are not charted.` : ''}`
    : null;

  return (
    <ChartCard
      title="Applications by Status"
      subtitle="Every application you can see, by current status"
      summary={summary}
      loading={loading}
    >
      {total ? (
        <ResponsiveContainer width="100%" height={260}>
          <BarChart data={rows} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke={grid} />
            <XAxis dataKey="label" tick={{ ...tickProps, fontSize: 10 }} interval={0} />
            <YAxis allowDecimals={false} tick={tickProps} />
            <Tooltip contentStyle={tooltipStyle} labelStyle={labelStyle} />
            <Bar dataKey="count" radius={[6, 6, 0, 0]}>
              {/* Positional from the full stage list, so a stage keeps its
                  colour whether or not the stages before it have any entries —
                  a status turning green must not depend on the pipeline state. */}
              {rows.map((r) => (
                <Cell key={r.status} fill={chartColor(STAGES.indexOf(r.status), isDark)} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      ) : (
        <ChartEmpty message="Nothing to chart by status yet" />
      )}
    </ChartCard>
  );
}
