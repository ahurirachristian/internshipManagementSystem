import { useMemo, useState } from 'react';
import {
  FolderOpen, Loader2, CheckCircle, Clock, BarChart3, PieChart, ListTodo, TrendingUp,
} from 'lucide-react';
import { useStudentData } from '../../context/StudentDataContext';

const STATUS_COLORS = {
  Completed: '#16a34a',
  'In Progress': '#f59e0b',
  Uncompleted: '#ef4444',
};

function Legend() {
  return (
    <div className="flex flex-wrap items-center gap-4 text-xs font-medium text-slate-600 dark:text-slate-300">
      <span className="inline-flex items-center gap-2">
        <span className="w-3 h-3 rounded-sm" style={{ background: STATUS_COLORS.Completed }}></span>
        Completed
      </span>
      <span className="inline-flex items-center gap-2">
        <span className="w-3 h-3 rounded-sm" style={{ background: STATUS_COLORS['In Progress'] }}></span>
        In Progress
      </span>
      <span className="inline-flex items-center gap-2">
        <span className="w-3 h-3 rounded-sm" style={{ background: STATUS_COLORS.Uncompleted }}></span>
        Uncompleted
      </span>
    </div>
  );
}

function StatusHeadings({ totals }) {
  const cards = [
    { label: 'Completed', value: totals.Completed, cls: 'bg-emerald-50 text-emerald-900 border-emerald-200', strong: 'text-emerald-950' },
    { label: 'In Progress', value: totals['In Progress'], cls: 'bg-amber-50 text-amber-900 border-amber-200', strong: 'text-amber-950' },
    { label: 'Uncompleted', value: totals.Uncompleted, cls: 'bg-rose-50 text-rose-900 border-rose-200', strong: 'text-rose-950' },
  ];
  return (
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 my-3">
      {cards.map((c) => (
        <div key={c.label} className={`flex items-center justify-between px-4 py-2.5 rounded-xl border text-xs font-bold uppercase tracking-wider ${c.cls}`}>
          <span>{c.label}</span>
          <span className={`text-base font-extrabold ${c.strong}`}>{c.value}</span>
        </div>
      ))}
    </div>
  );
}

function StackedBarChart({ data }) {
  const maxValue = useMemo(() => {
    const m = data.reduce((acc, d) => Math.max(acc, d.completed + d.inProgress + d.uncompleted), 0);
    return Math.max(m, 1);
  }, [data]);

  return (
    <div className="grid grid-cols-6 gap-4 items-end h-72 p-4 rounded-2xl bg-gradient-to-b from-slate-50 to-indigo-50/40">
      {data.map((item) => {
        const total = item.completed + item.inProgress + item.uncompleted;
        const heightPct = (total / maxValue) * 100;
        const totalForShare = total || 1;
        return (
          <div key={item.day} className="flex flex-col items-center justify-end h-full gap-2">
            <div className="text-[11px] font-bold text-slate-700 dark:text-slate-200">{total}</div>
            <div className="w-full max-w-[56px] flex-1 bg-slate-200 dark:bg-slate-700 rounded-xl overflow-hidden flex items-end">
              <div
                className="w-full flex flex-col justify-end rounded-xl overflow-hidden transition-all duration-500"
                style={{ height: `${heightPct}%` }}
              >
                <div className="bg-gradient-to-b from-emerald-400 to-emerald-600" style={{ flexBasis: `${(item.completed / totalForShare) * 100}%` }} title={`${item.day}: ${item.completed} completed`}></div>
                <div className="bg-gradient-to-b from-amber-400 to-amber-600" style={{ flexBasis: `${(item.inProgress / totalForShare) * 100}%` }} title={`${item.day}: ${item.inProgress} in progress`}></div>
                <div className="bg-gradient-to-b from-rose-400 to-rose-600 rounded-b-xl" style={{ flexBasis: `${(item.uncompleted / totalForShare) * 100}%` }} title={`${item.day}: ${item.uncompleted} uncompleted`}></div>
              </div>
            </div>
            <div className="text-xs font-semibold text-slate-600 dark:text-slate-300">{item.day}</div>
          </div>
        );
      })}
    </div>
  );
}

function GroupedBarChart({ data }) {
  const maxValue = useMemo(() => {
    const m = data.reduce((acc, d) => Math.max(acc, d.completed, d.inProgress, d.uncompleted), 0);
    return Math.max(m, 1);
  }, [data]);

  return (
    <div className="grid grid-cols-6 gap-4 items-end h-72 p-4 rounded-2xl bg-gradient-to-b from-slate-50 to-indigo-50/40">
      {data.map((item) => (
        <div key={item.day} className="flex flex-col items-center justify-end h-full gap-2">
          <div className="text-[10px] font-bold flex gap-1 text-slate-700 dark:text-slate-200">
            <span style={{ color: STATUS_COLORS.Completed }}>{item.completed}</span>
            <span>/</span>
            <span style={{ color: STATUS_COLORS['In Progress'] }}>{item.inProgress}</span>
            <span>/</span>
            <span style={{ color: STATUS_COLORS.Uncompleted }}>{item.uncompleted}</span>
          </div>
          <div className="w-full max-w-[96px] flex-1 grid grid-cols-3 gap-1 items-end">
            {[
              { v: item.completed, cls: 'bg-gradient-to-b from-emerald-400 to-emerald-600' },
              { v: item.inProgress, cls: 'bg-gradient-to-b from-amber-400 to-amber-600' },
              { v: item.uncompleted, cls: 'bg-gradient-to-b from-rose-400 to-rose-600' },
            ].map((bar, i) => (
              <div key={i} className="h-full bg-slate-200 dark:bg-slate-700 rounded-md overflow-hidden flex items-end">
                <div
                  className={`w-full ${bar.cls} rounded-md flex items-start justify-center pt-0.5 transition-all duration-500`}
                  style={{ height: `${(bar.v / maxValue) * 100}%` }}
                >
                  <span className="text-[9px] font-bold text-white bg-slate-900/40 rounded px-1">{bar.v}</span>
                </div>
              </div>
            ))}
          </div>
          <div className="text-xs font-semibold text-slate-600 dark:text-slate-300">{item.day}</div>
          <div className="grid grid-cols-3 gap-1 w-full max-w-[96px] text-[9px] text-slate-400 text-center font-bold">
            <span>C</span><span>I</span><span>U</span>
          </div>
        </div>
      ))}
    </div>
  );
}

function DonutChart({ totals }) {
  const size = 220;
  const stroke = 28;
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  const total = totals.Completed + totals['In Progress'] + totals.Uncompleted;

  const segments = [
    { key: 'Completed', value: totals.Completed, color: STATUS_COLORS.Completed },
    { key: 'In Progress', value: totals['In Progress'], color: STATUS_COLORS['In Progress'] },
    { key: 'Uncompleted', value: totals.Uncompleted, color: STATUS_COLORS.Uncompleted },
  ];

  let offset = 0;
  return (
    <div className="flex flex-wrap items-center justify-center gap-6 p-3">
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="max-w-[220px]">
        <circle cx={size / 2} cy={size / 2} r={radius} fill="none" stroke="#e2e8f0" strokeWidth={stroke} />
        {segments.map((seg) => {
          const dash = total ? (seg.value / total) * circumference : 0;
          const circle = (
            <circle
              key={seg.key}
              cx={size / 2}
              cy={size / 2}
              r={radius}
              fill="none"
              stroke={seg.color}
              strokeWidth={stroke}
              strokeDasharray={`${dash} ${circumference - dash}`}
              strokeDashoffset={-offset}
              transform={`rotate(-90 ${size / 2} ${size / 2})`}
            />
          );
          offset += dash;
          return circle;
        })}
        <text x="50%" y="48%" textAnchor="middle" fontSize="28" fontWeight="700" fill="#0f172a" dominantBaseline="middle">{total}</text>
        <text x="50%" y="62%" textAnchor="middle" fontSize="12" fill="#64748b" dominantBaseline="middle">total tasks</text>
      </svg>
      <ul className="grid gap-2.5 min-w-[180px]">
        {segments.map((seg) => (
          <li key={seg.key} className="grid grid-cols-[16px_1fr_auto] gap-2.5 items-center text-sm text-slate-600 dark:text-slate-300">
            <span className="w-3.5 h-3.5 rounded" style={{ background: seg.color }}></span>
            <span>{seg.key}</span>
            <span className="font-bold text-slate-900 dark:text-slate-100">
              {seg.value} ({total ? Math.round((seg.value / total) * 100) : 0}%)
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}

function LineChart({ data }) {
  const width = 560;
  const height = 280;
  const padX = 48;
  const padY = 32;
  const allValues = data.flatMap((d) => [d.completed, d.inProgress, d.uncompleted]);
  const maxValue = Math.max(...allValues, 1);
  const xFor = (i) => padX + (i * (width - padX * 2)) / (data.length - 1);
  const yFor = (v) => height - padY - (v / maxValue) * (height - padY * 2);

  const series = [
    { key: 'completed', label: 'Completed', color: STATUS_COLORS.Completed },
    { key: 'inProgress', label: 'In Progress', color: STATUS_COLORS['In Progress'] },
    { key: 'uncompleted', label: 'Uncompleted', color: STATUS_COLORS.Uncompleted },
  ];
  const ticks = 5;
  const tickValues = Array.from({ length: ticks + 1 }, (_, i) => Math.round((maxValue / ticks) * i));

  return (
    <div className="w-full">
      <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-auto max-h-72">
        {tickValues.map((t, i) => {
          const y = yFor(t);
          return (
            <g key={i}>
              <line x1={padX} x2={width - padX} y1={y} y2={y} stroke="#e2e8f0" strokeDasharray="3 4" />
              <text x={padX - 8} y={y + 4} fontSize="11" fill="#64748b" textAnchor="end">{t}</text>
            </g>
          );
        })}
        {data.map((d, i) => (
          <text key={d.day} x={xFor(i)} y={height - padY + 18} fontSize="11" fill="#475569" textAnchor="middle">
            {d.day.slice(0, 3)}
          </text>
        ))}
        {series.map((s) => {
          const points = data.map((d, i) => `${xFor(i)},${yFor(d[s.key])}`).join(' ');
          return (
            <g key={s.key}>
              <polyline fill="none" stroke={s.color} strokeWidth="2.5" strokeLinejoin="round" strokeLinecap="round" points={points} />
              {data.map((d, i) => (
                <circle key={`${s.key}-${i}`} cx={xFor(i)} cy={yFor(d[s.key])} r="4" fill="#ffffff" stroke={s.color} strokeWidth="2">
                  <title>{`${d.day} ${s.label}: ${d[s.key]}`}</title>
                </circle>
              ))}
            </g>
          );
        })}
      </svg>
    </div>
  );
}

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
          <Legend />
          <StatusHeadings totals={statusTotals} />
          <h4 className="text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-2">Stacked by status</h4>
          <StackedBarChart data={dailyProgress} />
        </Card>

        <Card>
          <CardHeader title="Status by Day" subtitle="Three side-by-side bars per day" icon={BarChart3} iconCls="bg-amber-100 text-amber-700" />
          <Legend />
          <StatusHeadings totals={statusTotals} />
          <h4 className="text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-2">Grouped (Completed / In Progress / Uncompleted)</h4>
          <GroupedBarChart data={dailyProgress} />
        </Card>

        <Card>
          <CardHeader title="Overall Distribution" subtitle="Total tasks by status" icon={PieChart} iconCls="bg-emerald-100 text-emerald-700" />
          <DonutChart totals={statusTotals} />
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader title="Trend Across the Week" subtitle="Status counts from Monday to Saturday" icon={TrendingUp} iconCls="bg-rose-100 text-rose-700" />
          <Legend />
          <LineChart data={dailyProgress} />
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader title="To-Do List" subtitle="Same source as the Tasks page" icon={ListTodo} iconCls="bg-purple-100 text-purple-700" />
          <TodoList tasks={tasks} />
        </Card>
      </div>
    </div>
  );
}