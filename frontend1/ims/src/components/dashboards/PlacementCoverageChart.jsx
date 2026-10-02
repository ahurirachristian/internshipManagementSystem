/**
 * PC12 chart 5: placement coverage per university, for the admin.
 *
 * <p>Reads GET /api/admin/analytics/placement-coverage.
 *
 * <p>A stacked bar of covered against uncovered students, ordered by the
 * universities needing attention first — the endpoint already sorts that way,
 * and re-sorting here would be a second place for the ordering to go wrong.
 *
 * <p>The one judgement this chart makes visually is which segment draws first.
 * Uncovered is the actionable half, so it sits closest to the axis where the
 * eye lands; covered fills the remainder. Total bar length is the cohort, so the
 * chart cannot imply that a university with 100 covered out of 105 students is
 * a near-complete success in the way a bare covered-count bar would.
 */
import { useEffect, useState } from 'react';
import { useTheme } from '../../context/ThemeContext';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { seriesColor } from '../../charts/colors';
import { ChartCard, ChartEmpty, chartThemeFor } from '../../charts/ChartCard';
import { fetchAdminPlacementCoverage } from '../../services/api';

export default function PlacementCoverageChart() {
  const { isDark } = useTheme();
  const { grid, tickProps, tooltipStyle, labelStyle } = chartThemeFor(isDark);
  const [stats, setStats] = useState(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let live = true;
    fetchAdminPlacementCoverage()
      .then((data) => {
        if (live) {
          setStats(data);
          setLoading(false);
        }
      })
      .catch((e) => {
        if (live) {
          setLoading(false);
        }
        if (live) setError(e.message || 'Unable to load placement coverage.');
      });
    return () => {
      live = false;
    };
  }, []);

  if (error) {
    return (
      <ChartCard title="Placement Coverage by University" subtitle="Who still needs a placement">
        <div role="alert" className="h-48 flex items-center justify-center text-xs text-rose-600 dark:text-rose-400">
          {error}
        </div>
      </ChartCard>
    );
  }

  const rows = (stats?.byUniversity || []).map((r) => ({
    name: r.name,
    // Uncovered first so the actionable segment is nearest the axis. Either
    // value can be absent from a partial payload, hence the coercion.
    Uncovered: Number(r.uncoveredStudents) || 0,
    Covered: Number(r.coveredStudents) || 0,
    totalStudents: Number(r.totalStudents) || 0,
    coveragePct: Number(r.coveragePct) || 0,
  }));

  const totalUncovered = rows.reduce((t, r) => t + r.Uncovered, 0);
  const overCovered = Number(stats?.overCoveredTotal) || 0;

  const summary = rows.length
    ? `${totalUncovered} ${
        totalUncovered === 1 ? 'student needs' : 'students need'
      } a placement across ${rows.length} ${
        rows.length === 1 ? 'university' : 'universities'
      }. ${
        rows[0].name
      } has the most (${rows[0].Uncovered}). ` +
      // Every university gets its own line in the description, cohort size
      // included. The stacked bar shows proportion; only the counts say how big
      // the proportion is, and "96% covered" is a very different fact at 50
      // students than at 5.
      rows
        .map(
          (r) =>
            `${r.name}: ${r.Covered} of ${r.totalStudents} students covered (${r.coveragePct}%), ${r.Uncovered} still to place.`,
        )
        .join(' ') +
      (overCovered > 0
        ? ` Note: ${overCovered} placed ${
            overCovered === 1 ? 'student is' : 'students are'
          } attributed to a university they do not belong to, so their coverage is not counted here.`
        : '')
    : null;

  return (
    <ChartCard
      title="Placement Coverage by University"
      subtitle="Who still needs a placement"
      summary={summary}
      loading={loading}
    >
      {rows.length ? (
        <ResponsiveContainer width="100%" height={Math.max(240, rows.length * 34)}>
          <BarChart data={rows} layout="vertical" margin={{ top: 5, right: 10, left: 8, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke={grid} horizontal={false} />
            <XAxis type="number" allowDecimals={false} tick={tickProps} />
            <YAxis type="category" dataKey="name" width={140} tick={tickProps} />
            <Tooltip
              contentStyle={tooltipStyle}
              labelStyle={labelStyle}
              formatter={(value, name, entry) => [
                `${value} of ${entry.payload.totalStudents} students (${entry.payload.coveragePct}% covered)`,
                name,
              ]}
            />
            <Legend wrapperStyle={labelStyle} />
            <Bar
              dataKey="Uncovered"
              stackId="coverage"
              fill={seriesColor('accent', isDark)}
              radius={[0, 0, 0, 0]}
            />
            <Bar
              dataKey="Covered"
              stackId="coverage"
              fill={seriesColor('primary', isDark)}
              radius={[0, 6, 6, 0]}
            />
          </BarChart>
        </ResponsiveContainer>
      ) : (
        <ChartEmpty message="No placement data yet" />
      )}
    </ChartCard>
  );
}
