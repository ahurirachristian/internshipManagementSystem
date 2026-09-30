import { useMemo, useState } from 'react';
import {
  FolderOpen, Loader2, CheckCircle, Clock, BarChart3, PieChart, ListTodo, TrendingUp,
} from 'lucide-react';
import { useStudentData, STATUSES, REVIEWED, AWAITING_REVIEW, isReviewed } from '../../context/StudentDataContext';
import { useTheme } from '../../context/ThemeContext';
import { STATUS_COLORS, STATUS_COLORS_DARK } from '../../charts/colors';
import { Legend, StatusHeadings, StackedBarChart, DonutChart, LineChart } from '../../charts/ProgressCharts';

const REVIEW_STATE = {
  [REVIEWED]: { cls: 'bg-emerald-100 text-emerald-800', label: 'Reviewed' },
  [AWAITING_REVIEW]: { cls: 'bg-amber-100 text-amber-800', label: 'Awaiting review' },
};

function formatDate(value) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return date.toLocaleDateString(undefined, { day: '2-digit', month: 'short', year: 'numeric' });
}

function summarize(entry) {
  return entry.dailyActivities || entry.accomplishments || entry.knowledgeAndSkillsGained || 'Diary entry';
}

function DiaryList({ diaries }) {
  const [activeTab, setActiveTab] = useState('all');

  const counts = useMemo(() => ({
    all: diaries.length,
    reviewed: diaries.filter(isReviewed).length,
    awaiting: diaries.filter((d) => !isReviewed(d)).length,
  }), [diaries]);

  const visible = useMemo(() => {
    if (activeTab === 'reviewed') return diaries.filter(isReviewed);
    if (activeTab === 'awaiting') return diaries.filter((d) => !isReviewed(d));
    return diaries;
  }, [diaries, activeTab]);

  const tabs = [
    { key: 'all', label: 'All Entries' },
    { key: 'reviewed', label: REVIEWED },
    { key: 'awaiting', label: AWAITING_REVIEW },
  ];

  return (
    <div>
      <div className="flex flex-wrap gap-2 mb-4">
        {tabs.map((tab) => (
          <button
            key={tab.key}
            type="button"
            onClick={() => setActiveTab(tab.key)}
            className={`inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full text-xs font-bold transition-all border ${
              activeTab === tab.key
                ? 'bg-indigo-50 border-indigo-200 text-indigo-700'
                : 'bg-slate-100 border-transparent text-slate-600 hover:bg-slate-200'
            }`}
          >
            <span>{tab.label}</span>
            <span className={`px-2 rounded-full text-[11px] font-extrabold ${
              activeTab === tab.key ? 'bg-indigo-600 text-white' : 'bg-white text-slate-600 border border-slate-200'
            }`}>
              {counts[tab.key]}
            </span>
          </button>
        ))}
      </div>
      <ul className="grid gap-2.5">
        {visible.slice(0, 8).map((entry) => {
          const state = isReviewed(entry) ? REVIEWED : AWAITING_REVIEW;
          return (
            <li
              key={entry.id}
              className="flex items-start justify-between gap-4 px-4 py-3 bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-800 rounded-xl hover:bg-slate-100 transition-colors"
            >
              <div className="flex flex-col gap-1.5 min-w-0 flex-1">
                <p className="text-sm text-slate-900 dark:text-slate-100 font-medium leading-snug">{summarize(entry)}</p>
                <span className={`self-start px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${REVIEW_STATE[state].cls}`}>
                  {REVIEW_STATE[state].label}
                </span>
              </div>
              <div className="text-xs text-slate-500 font-semibold whitespace-nowrap pt-1">{formatDate(entry.date)}</div>
            </li>
          );
        })}
        {visible.length === 0 && (
          <li className="text-center text-sm text-slate-500 py-8">No diary entries in this view.</li>
        )}
      </ul>
    </div>
  );
}

function ChartSkeleton() {
  return (
    <div className="flex h-72 items-end gap-4 rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/40 p-4 animate-pulse" aria-hidden="true">
      {[45, 70, 55, 85, 40, 65].map((h, i) => (
        <div key={i} className="flex-1 rounded-xl bg-slate-200 dark:bg-slate-700" style={{ height: `${h}%` }}></div>
      ))}
    </div>
  );
}

function Card({ children, className = '' }) {
  return (
    <div className={`bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs p-6 ${className}`}>
      {children}
    </div>
  );
}

function CardHeader({ title, subtitle, icon: Icon, iconCls = 'bg-indigo-100 text-indigo-700' }) {
  return (
    <div className="flex items-start justify-between gap-3 mb-4">
      <div>
        <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100">{title}</h3>
        {subtitle && <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">{subtitle}</p>}
      </div>
      {Icon && (
        <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${iconCls}`}>
          <Icon className="w-5 h-5" />
        </div>
      )}
    </div>
  );
}

export default function OverviewSection() {
  const { diaries, dailyProgress, statusTotals, loading, error, reload } = useStudentData();
  const { isDark } = useTheme();

  const totalEntries = diaries.length;
  const thisWeek = dailyProgress.reduce((acc, day) => acc + day[REVIEWED] + day[AWAITING_REVIEW], 0);

  const kpis = [
    { label: 'Total Entries', value: totalEntries, icon: FolderOpen, iconCls: 'bg-indigo-100 text-indigo-700' },
    { label: 'Awaiting Review', value: statusTotals[AWAITING_REVIEW], icon: Loader2, iconCls: 'bg-amber-100 text-amber-700' },
    { label: 'Reviewed', value: statusTotals[REVIEWED], icon: CheckCircle, iconCls: 'bg-emerald-100 text-emerald-700' },
    { label: 'This Week', value: thisWeek, icon: Clock, iconCls: 'bg-rose-100 text-rose-700' },
  ];

  return (
    <div className="grid gap-5">
      <div className="rounded-2xl bg-gradient-to-br from-indigo-600 to-purple-600 p-7 text-white shadow-lg shadow-indigo-600/20">
        <div className="flex flex-wrap items-end justify-between gap-3 mb-5">
          <div>
            <h2 className="text-2xl font-bold">Internship Progress</h2>
            <p className="text-sm text-white/75 mt-1">Diary review overview</p>
          </div>
        </div>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {kpis.map((kpi) => (
            <div key={kpi.label} className="bg-white/95 rounded-2xl p-4 flex items-center gap-3 shadow-sm hover:shadow-md transition-shadow">
              <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${kpi.iconCls}`}>
                <kpi.icon className="w-5 h-5" />
              </div>
              <div className="flex flex-col gap-0.5 min-w-0">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">{kpi.label}</span>
                <span className="text-2xl font-extrabold text-slate-900 leading-tight">{kpi.value.toLocaleString()}</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {error && (
        <div role="alert" className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-rose-200 bg-rose-50 px-5 py-4 text-sm text-rose-800">
          <span>{error}</span>
          <button
            type="button"
            onClick={reload}
            className="rounded-lg border border-rose-300 bg-white px-3 py-1.5 text-xs font-bold text-rose-700 hover:bg-rose-100"
          >
            Try again
          </button>
        </div>
      )}

      <div className="grid lg:grid-cols-2 gap-5">
        <Card className="lg:col-span-2">
          <CardHeader title="Level of Progress" subtitle="Diary entries this week by review status — Monday to Saturday" icon={BarChart3} />
          <Legend statuses={STATUSES} isDark={isDark} />
          <StatusHeadings totals={statusTotals} statuses={STATUSES} />
          <h4 className="text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-2">Stacked by review status</h4>
          {loading ? <ChartSkeleton /> : <StackedBarChart data={dailyProgress} statuses={STATUSES} isDark={isDark} />}
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader title="Overall Distribution" subtitle="All entries by review status" icon={PieChart} iconCls="bg-emerald-100 text-emerald-700" />
          {loading ? <ChartSkeleton /> : (
            <DonutChart
              entries={STATUSES.map((key) => ({ key, value: statusTotals[key] ?? 0, color: (isDark ? STATUS_COLORS_DARK : STATUS_COLORS)[key] }))}
              centerLabel="total entries"
              isDark={isDark}
            />
          )}
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader title="Trend Across the Week" subtitle="Review status from Monday to Saturday" icon={TrendingUp} iconCls="bg-rose-100 text-rose-700" />
          <Legend statuses={STATUSES} isDark={isDark} />
          {loading ? <ChartSkeleton /> : <LineChart data={dailyProgress} statuses={STATUSES} isDark={isDark} />}
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader title="Recent Diary Entries" subtitle="Your day-diary submissions and their review state" icon={ListTodo} iconCls="bg-purple-100 text-purple-700" />
          {loading ? <ChartSkeleton /> : <DiaryList diaries={diaries} />}
        </Card>
      </div>
    </div>
  );
}