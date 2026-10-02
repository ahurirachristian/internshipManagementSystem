/**
 * PC12 chart 6: diary review backlog per university, for the admin.
 *
 * <p>Reads GET /api/admin/analytics/diary-backlog.
 *
 * <p>The chart plots only the awaiting-review half of each university's diaries.
 * That is a deliberate choice rather than a convenience: a stacked
 * reviewed/awaiting bar would be dominated by whichever university has filed the
 * most diaries in total, which is a fact about diary volume rather than about
 * review pressure. The backlog is the question the chart is asked to answer, so
 * backlog is what it shows, with the reviewed count kept in the tooltip and the
 * accessible description so the denominator is never lost.
 */
import { useEffect, useState } from 'react';
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
import { fetchAdminDiaryBacklog } from '../../services/api';

export default function DiaryBacklogChart() {
  const { isDark } = useTheme();
  const { grid, tickProps, tooltipStyle, labelStyle } = chartThemeFor(isDark);
  const [stats, setStats] = useState(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let live = true;
    fetchAdminDiaryBacklog()
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
        if (live) setError(e.message || 'Unable to load the diary backlog.');
      });
    return () => {
      live = false;
    };
  }, []);

  if (error) {
    return (
      <ChartCard title="Diary Review Backlog" subtitle="Where supervisor reviews are piling up">
        <div role="alert" className="h-48 flex items-center justify-center text-xs text-rose-600 dark:text-rose-400">
          {error}
        </div>
      </ChartCard>
    );
  }

  const rows = (stats?.byUniversity || []).map((r) => ({
    name: r.name,
    awaiting: Number(r.awaitingReview) || 0,
    reviewed: Number(r.reviewed) || 0,
    total: Number(r.total) || 0,
    reviewedPct: Number(r.reviewedPct) || 0,
  }));

  const totalAwaiting = rows.reduce((t, r) => t + r.awaiting, 0);

  const summary = rows.length
    ? `${totalAwaiting} ${totalAwaiting === 1 ? 'diary awaits' : 'diaries await'} a university supervisor's review across ${
        rows.length
      } ${rows.length === 1 ? 'university' : 'universities'}. ` +
      rows
        .map(
          (r) =>
            `${r.name}: ${r.awaiting} awaiting review of ${r.total} filed (${r.reviewed} reviewed, ${r.reviewedPct}%).`,
        )
        .join(' ')
    : null;

  return (
    <ChartCard
      title="Diary Review Backlog"
      subtitle="Where supervisor reviews are piling up"
      summary={summary}
      loading={loading}
    >
      {rows.length ? (
        <ResponsiveContainer width="100%" height={Math.max(240, rows.length * 38)}>
          <BarChart data={rows} layout="vertical" margin={{ top: 5, right: 40, left: 8, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke={grid} horizontal={false} />
            <XAxis type="number" allowDecimals={false} tick={tickProps} />
            <YAxis type="category" dataKey="name" width={140} tick={tickProps} />
            <Tooltip
              contentStyle={tooltipStyle}
              labelStyle={labelStyle}
              formatter={(value, _name, entry) => [
                `${value} awaiting review of ${entry.payload.total} filed (${entry.payload.reviewed} already reviewed)`,
                'Awaiting review',
              ]}
            />
            <Bar dataKey="awaiting" radius={[0, 6, 6, 0]}>
              {rows.map((row) => (
                <Cell
                  key={row.name}
                  // A university with nothing waiting is drawn in the calmer hue so
                  // the eye goes to the rows that actually need action.
                  fill={seriesColor(row.awaiting === 0 ? 'sky' : 'accent', isDark)}
                />
              ))}
              <LabelList
                dataKey="awaiting"
                position="right"
                fill={isDark ? '#cbd5e1' : '#475569'}
                fontSize={12}
              />
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      ) : (
        <ChartEmpty message="No diaries filed yet" />
      )}
    </ChartCard>
  );
}
