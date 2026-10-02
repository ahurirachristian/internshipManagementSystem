/**
 * PC12 chart 4: placement rate per programme, for the university supervisor.
 *
 * <p>Reads `rosters.programmePlacementRates` off the stats endpoint this tab
 * already loads, so it adds no request.
 *
 * <p>The decision worth explaining is the empty row. Programmes with no students
 * are dropped by the backend rather than rendered at 0%, because a 0% bar for a
 * programme nobody attends reads as a placement failure. The bar length is
 * always the placed count rather than the rate, with the rate printed on the
 * axis labels: rate-only bars make a 3-student programme look as consequential
 * as a 300-student one, which is exactly the comparison this chart exists to
 * let a supervisor make anyway — but with the cohort size visible next to it.
 */
import { useTheme } from '../../context/ThemeContext';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  LabelList,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { seriesColor } from '../../charts/colors';
import { ChartCard, ChartEmpty, chartThemeFor } from '../../charts/ChartCard';

export default function ProgrammePlacementRateChart({ rates, error }) {
  const { isDark } = useTheme();
  const { grid, tickProps, tooltipStyle, labelStyle } = chartThemeFor(isDark);

  if (error) {
    return (
      <ChartCard
        title="Placement Rate by Programme"
        subtitle="Where placements are landing, and where they are not"
      >
        <div role="alert" className="h-48 flex items-center justify-center text-xs text-rose-600 dark:text-rose-400">
          {error}
        </div>
      </ChartCard>
    );
  }

  const rows = (Array.isArray(rates) ? rates : [])
    .map((r) => ({
      name: r.programmeName || r.programmeCode || 'Unnamed programme',
      placed: Number(r.placed) || 0,
      total: Number(r.total) || 0,
      rate: Number(r.placementRatePct) || 0,
    }));

  const withStudents = rows.filter((r) => r.total > 0);

  const summary = withStudents.length
    ? withStudents
        .map((r) => `${r.name}: ${r.rate}% of ${r.total} students, ${r.placed} placed`)
        .join('. ')
    : null;

  return (
    <ChartCard
      title="Placement Rate by Programme"
      subtitle="Where placements are landing, and where they are not"
      summary={summary}
    >
      {withStudents.length ? (
        <ResponsiveContainer width="100%" height={Math.max(240, withStudents.length * 38)}>
          <BarChart
            data={withStudents}
            layout="vertical"
            margin={{ top: 5, right: 56, left: 8, bottom: 0 }}
          >
            <CartesianGrid strokeDasharray="3 3" stroke={grid} horizontal={false} />
            <XAxis type="number" allowDecimals={false} tick={tickProps} />
            <YAxis type="category" dataKey="name" width={140} tick={tickProps} />
            <Tooltip
              contentStyle={tooltipStyle}
              labelStyle={labelStyle}
              formatter={(value, _name, entry) => [
                `${value} placed of ${entry.payload.total} students (${entry.payload.rate}%)`,
                'Placed',
              ]}
            />
            <Bar dataKey="placed" radius={[0, 6, 6, 0]}>
              {withStudents.map((row) => (
                <Cell
                  key={row.name}
                  fill={seriesColor(row.rate === 100 ? 'accent' : 'primary', isDark)}
                />
              ))}
              <LabelList
                dataKey="rate"
                position="right"
                formatter={(v) => `${v}%`}
                fill={isDark ? '#cbd5e1' : '#475569'}
                fontSize={12}
              />
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      ) : (
        <ChartEmpty message="No programme data yet" />
      )}
    </ChartCard>
  );
}
