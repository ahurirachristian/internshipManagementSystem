import { useMemo, useState } from 'react';
import {
  FolderOpen, Loader2, CheckCircle, Clock, BarChart3, PieChart, ListTodo, TrendingUp,
} from 'lucide-react';
import { useStudentData } from '../../context/StudentDataContext';
import { useTheme } from '../../context/ThemeContext';
import { STATUS_COLORS, STATUS_COLORS_DARK } from '../../charts/colors';
import { Legend, StatusHeadings, StackedBarChart, DonutChart, LineChart } from '../../charts/ProgressCharts';

const STATUSES = ['Completed', 'In Progress', 'Uncompleted'];

function TodoList({ tasks }) {
  const [activeTab, setActiveTab] = useState('all');

  const counts = useMemo(() => ({
    all: tasks.length,
    completed: tasks.filter((t) => t.status === 'Completed').length,
    pending: tasks.filter((t) => t.status === 'Uncompleted').length,
    inProcess: tasks.filter((t) => t.status === 'In Progress').length,
  }), [tasks]);

  const visible = useMemo(() => {
    const map = {
      all: null,
      completed: 'Completed',
      pending: 'Uncompleted',
      inProcess: 'In Progress',
    };
    const filter = map[activeTab];
    return filter ? tasks.filter((t) => t.status === filter) : tasks;
  }, [tasks, activeTab]);

  const formatDue = (iso) => {
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sept', 'Oct', 'Nov', 'Dec'];
    const d = new Date(iso);
    return `${String(d.getDate()).padStart(2, '0')} ${months[d.getMonth()]}`;
  };

  const tabs = [
    { key: 'all', label: 'All Task' },
    { key: 'completed', label: 'Completed' },
    { key: 'pending', label: 'Pending' },
    { key: 'inProcess', label: 'In Process' },
  ];

  const statusClass = {
    Completed: 'bg-emerald-100 text-emerald-800',
    'In Progress': 'bg-amber-100 text-amber-800',
    Uncompleted: 'bg-rose-100 text-rose-800',
  };
  const statusLabel = {
    Completed: 'Done',
    'In Progress': 'In Progress',
    Uncompleted: 'Pending',
  };

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
        {visible.slice(0, 8).map((t) => (
          <li
            key={t.id}
            className="flex items-start justify-between gap-4 px-4 py-3 bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-800 rounded-xl hover:bg-slate-100 transition-colors"
          >
            <div className="flex flex-col gap-1.5 min-w-0 flex-1">
              <p className="text-sm text-slate-900 dark:text-slate-100 font-medium leading-snug">{t.title}</p>
              <span className={`self-start px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${statusClass[t.status]}`}>
                {statusLabel[t.status]}
              </span>
            </div>
            <div className="text-xs text-slate-500 font-semibold whitespace-nowrap pt-1">{formatDue(t.dueDate)}</div>
          </li>
        ))}
        {visible.length === 0 && (
          <li className="text-center text-sm text-slate-500 py-8">No tasks in this view.</li>
        )}
      </ul>
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
  const { tasks, dailyProgress, statusTotals } = useStudentData();
  const { isDark } = useTheme();

  const totalProjects = tasks.length;

  const kpis = [
    { label: 'Total Project', value: totalProjects, icon: FolderOpen, iconCls: 'bg-indigo-100 text-indigo-700' },
    { label: 'In Progress', value: statusTotals['In Progress'], icon: Loader2, iconCls: 'bg-amber-100 text-amber-700' },
    { label: 'Complete', value: statusTotals.Completed, icon: CheckCircle, iconCls: 'bg-emerald-100 text-emerald-700' },
    { label: 'Upcoming', value: statusTotals.Uncompleted, icon: Clock, iconCls: 'bg-rose-100 text-rose-700' },
  ];

  return (
    <div className="grid gap-5">
      <div className="rounded-2xl bg-gradient-to-br from-indigo-600 to-purple-600 p-7 text-white shadow-lg shadow-indigo-600/20">
        <div className="flex flex-wrap items-end justify-between gap-3 mb-5">
          <div>
            <h2 className="text-2xl font-bold">Project Management</h2>
            <p className="text-sm text-white/75 mt-1">Project-Management</p>
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

      <div className="grid lg:grid-cols-2 gap-5">
        <Card className="lg:col-span-2">
          <CardHeader title="Level of Progress" subtitle="Weekly breakdown by status — Monday to Saturday" icon={BarChart3} />
          <Legend statuses={STATUSES} isDark={isDark} />
          <StatusHeadings totals={statusTotals} statuses={STATUSES} />
          <h4 className="text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-2">Stacked by status</h4>
          <StackedBarChart data={dailyProgress} statuses={STATUSES} isDark={isDark} />
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader title="Overall Distribution" subtitle="Total tasks by status" icon={PieChart} iconCls="bg-emerald-100 text-emerald-700" />
          <DonutChart
            entries={STATUSES.map((key) => ({ key, value: statusTotals[key] ?? 0, color: (isDark ? STATUS_COLORS_DARK : STATUS_COLORS)[key] }))}
            centerLabel="total tasks"
            isDark={isDark}
          />
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader title="Trend Across the Week" subtitle="Status counts from Monday to Saturday" icon={TrendingUp} iconCls="bg-rose-100 text-rose-700" />
          <Legend statuses={STATUSES} isDark={isDark} />
          <LineChart data={dailyProgress} statuses={STATUSES} isDark={isDark} />
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader title="To-Do List" subtitle="Same source as the Tasks page" icon={ListTodo} iconCls="bg-purple-100 text-purple-700" />
          <TodoList tasks={tasks} />
        </Card>
      </div>
    </div>
  );
}