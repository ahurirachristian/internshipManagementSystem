import { useEffect, useMemo, useRef, useState } from 'react';
import { chartTheme, STATUS_COLORS, STATUS_COLORS_DARK } from './colors';

const DAY_ABBR = { Monday: 'Mon', Tuesday: 'Tue', Wednesday: 'Wed', Thursday: 'Thu', Friday: 'Fri', Saturday: 'Sat', Sunday: 'Sun' };

function abbreviate(day) {
  return DAY_ABBR[day] || String(day).slice(0, 3);
}

/** Sum every status on a row so charts work with any number of segments. */
function rowTotal(row) {
  return Object.keys(row).reduce((acc, key) => (key === 'day' ? acc : acc + (row[key] || 0)), 0);
}

export function Legend({ statuses, isDark }) {
  const colors = isDark ? STATUS_COLORS_DARK : STATUS_COLORS;
  return (
    <div className="flex flex-wrap items-center gap-4 text-xs font-medium text-slate-600 dark:text-slate-300">
      {statuses.map((status) => (
        <span key={status} className="inline-flex items-center gap-2">
          <span className="w-3 h-3 rounded-sm" style={{ background: colors[status] }}></span>
          {status}
        </span>
      ))}
    </div>
  );
}

export function StatusHeadings({ totals, statuses }) {
  // Same review-state vocabulary as STATUS_COLORS; keep the keys aligned.
  const TONE = {
    Reviewed: { box: 'bg-emerald-50 text-emerald-900 border-emerald-200', strong: 'text-emerald-950' },
    'Awaiting review': { box: 'bg-amber-50 text-amber-900 border-amber-200', strong: 'text-amber-950' },
  };
  return (
    <div className={`grid grid-cols-1 gap-3 my-3 ${statuses.length === 3 ? 'sm:grid-cols-3' : 'sm:grid-cols-2'}`}>
      {statuses.map((status) => {
        const tone = TONE[status] || { box: 'bg-slate-50 text-slate-900 border-slate-200', strong: 'text-slate-950' };
        return (
          <div
            key={status}
            className={`flex items-center justify-between px-4 py-2.5 rounded-xl border text-xs font-bold uppercase tracking-wider ${tone.box}`}
          >
            <span>{status}</span>
            <span className={`text-base font-extrabold ${tone.strong}`}>{totals[status] ?? 0}</span>
          </div>
        );
      })}
    </div>
  );
}

export function StackedBarChart({ data, statuses, isDark, centerLabel = 'total tasks' }) {
  const colors = isDark ? STATUS_COLORS_DARK : STATUS_COLORS;
  const maxValue = useMemo(
    () => Math.max(...data.map(rowTotal), 1),
    [data]
  );

  return (
    <div className="grid grid-cols-6 gap-4 items-end h-72 p-4 rounded-2xl bg-gradient-to-b from-slate-50 to-indigo-50/40 dark:from-slate-900 dark:to-slate-900/40">
      {data.map((row) => {
        const total = rowTotal(row);
        const heightPct = (total / maxValue) * 100;
        const divisor = total || 1;
        return (
          <div key={row.day} className="flex flex-col items-center justify-end h-full gap-2">
            <div className="text-[11px] font-bold text-slate-700 dark:text-slate-200">{total}</div>
            <div className="w-full max-w-[56px] flex-1 bg-slate-200 dark:bg-slate-700 rounded-xl overflow-hidden flex items-end">
              <div
                className="w-full flex flex-col justify-end rounded-xl overflow-hidden transition-all duration-500"
                style={{ height: `${heightPct}%` }}
              >
                {statuses.map((status, i) => (
                  <div
                    key={status}
                    className={i === statuses.length - 1 ? 'rounded-b-xl' : ''}
                    style={{
                      background: colors[status],
                      flexBasis: `${((row[status] || 0) / divisor) * 100}%`,
                    }}
                    title={`${row.day}: ${row[status] || 0} ${status.toLowerCase()}`}
                  ></div>
                ))}
              </div>
            </div>
            <div className="text-xs font-semibold text-slate-600 dark:text-slate-300">{abbreviate(row.day)}</div>
          </div>
        );
      })}
    </div>
  );
}

/**
 * Donut built from an arbitrary number of segments. `entries` is
 * `[{ key, value, color? }]`; `color` defaults to the categorical palette.
 */
export function DonutChart({ entries, total, centerLabel = 'total', isDark, size = 220 }) {
  const theme = chartTheme(isDark);
  const stroke = 28;
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  const sum = total ?? entries.reduce((acc, e) => acc + (e.value || 0), 0);

  let offset = 0;
  return (
    <div className="flex flex-wrap items-center justify-center gap-6 p-3">
      <svg
        width={size}
        height={size}
        viewBox={`0 0 ${size} ${size}`}
        className="max-w-[220px]"
        role="img"
        aria-label={`${centerLabel} by category: ${entries.map((e) => `${e.key} ${e.value || 0}`).join(', ')}`}
      >
        <circle cx={size / 2} cy={size / 2} r={radius} fill="none" stroke={theme.track} strokeWidth={stroke} />
        {entries.map((entry, i) => {
          const dash = sum ? ((entry.value || 0) / sum) * circumference : 0;
          const circle = (
            <circle
              key={entry.key}
              cx={size / 2}
              cy={size / 2}
              r={radius}
              fill="none"
              stroke={entry.color || theme.chart1}
              strokeWidth={stroke}
              strokeDasharray={`${dash} ${circumference - dash}`}
              strokeDashoffset={-offset}
              transform={`rotate(-90 ${size / 2} ${size / 2})`}
            />
          );
          offset += dash;
          return circle;
        })}
        <text x="50%" y="48%" textAnchor="middle" fontSize="28" fontWeight="700" fill={theme.text} dominantBaseline="middle">
          {sum.toLocaleString()}
        </text>
        <text x="50%" y="62%" textAnchor="middle" fontSize="12" fill={theme.muted} dominantBaseline="middle">
          {centerLabel}
        </text>
      </svg>
      <ul className="grid gap-2.5 min-w-[180px]">
        {entries.map((entry) => (
          <li key={entry.key} className="grid grid-cols-[16px_1fr_auto] gap-2.5 items-center text-sm text-slate-600 dark:text-slate-300">
            <span className="w-3.5 h-3.5 rounded" style={{ background: entry.color || theme.chart1 }}></span>
            <span>{entry.key}</span>
            <span className="font-bold text-slate-900 dark:text-slate-100">
              {entry.value || 0} ({sum ? Math.round(((entry.value || 0) / sum) * 100) : 0}%)
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}

/** Measures its own width so the plot is not letterboxed on narrow screens. */
function useMeasuredWidth(fallback) {
  const ref = useRef(null);
  const [width, setWidth] = useState(fallback);

  useEffect(() => {
    const node = ref.current;
    if (!node || typeof ResizeObserver === 'undefined') return undefined;
    const observer = new ResizeObserver((entries) => {
      const next = entries[0]?.contentRect?.width;
      if (next) setWidth((prev) => (Math.abs(next - prev) > 1 ? next : prev));
    });
    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  return [ref, Math.max(width, 240)];
}

export function LineChart({ data, statuses, isDark }) {
  const theme = chartTheme(isDark);
  const colors = isDark ? STATUS_COLORS_DARK : STATUS_COLORS;
  const [ref, width] = useMeasuredWidth(560);

  const height = 280;
  const padX = 48;
  const padY = 32;
  const maxValue = Math.max(...data.flatMap(row => statuses.map((s) => row[s] || 0)), 1);
  const step = data.length > 1 ? (width - padX * 2) / (data.length - 1) : 0;
  const xFor = (i) => padX + i * step;
  const yFor = (v) => height - padY - (v / maxValue) * (height - padY * 2);

  const ticks = 5;
  const tickValues = Array.from({ length: ticks + 1 }, (_, i) => Math.round((maxValue / ticks) * i));

  return (
    <div className="w-full" ref={ref}>
      <svg
        width={width}
        height={height}
        viewBox={`0 0 ${width} ${height}`}
        className="w-full h-auto max-h-72"
        role="img"
        aria-label={`Trend across ${data.length} days: ${statuses
          .map((s) => `${s} peaks at ${Math.max(...data.map((d) => d[s] || 0))}`)
          .join(', ')}`}
      >
        {tickValues.map((t, i) => {
          const y = yFor(t);
          return (
            <g key={i}>
              <line x1={padX} x2={width - padX} y1={y} y2={y} stroke={theme.track} strokeDasharray="3 4" />
              <text x={padX - 8} y={y + 4} fontSize="11" fill={theme.muted} textAnchor="end">
                {t}
              </text>
            </g>
          );
        })}
        {data.map((d, i) => (
          <text key={d.day} x={xFor(i)} y={height - padY + 18} fontSize="11" fill={theme.label} textAnchor="middle">
            {abbreviate(d.day)}
          </text>
        ))}
        {statuses.map((status) => {
          const points = data.map((d, i) => `${xFor(i)},${yFor(d[status] || 0)}`).join(' ');
          return (
            <g key={status}>
              <polyline fill="none" stroke={colors[status]} strokeWidth="2.5" strokeLinejoin="round" strokeLinecap="round" points={points} />
              {data.map((d, i) => (
                <circle key={`${status}-${i}`} cx={xFor(i)} cy={yFor(d[status] || 0)} r="4" fill={theme.surface} stroke={colors[status]} strokeWidth="2">
                  <title>{`${d.day} ${status}: ${d[status] || 0}`}</title>
                </circle>
              ))}
            </g>
          );
        })}
      </svg>
    </div>
  );
}
