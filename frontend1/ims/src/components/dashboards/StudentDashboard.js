import { useMemo, useState } from 'react';
import DashboardLayout from '../DashboardLayout';
import { useStudentData } from '../../context/StudentDataContext';

const STATUS_COLORS = {
  Completed: '#16a34a',
  'In Progress': '#f59e0b',
  Uncompleted: '#ef4444',
};

function Legend() {
  return (
    <div className="progress-chart-legend" aria-label="Legend">
      <span className="progress-chart-legend-item">
        <span className="progress-chart-swatch swatch-completed"></span> Completed
      </span>
      <span className="progress-chart-legend-item">
        <span className="progress-chart-swatch swatch-inprogress"></span> In Progress
      </span>
      <span className="progress-chart-legend-item">
        <span className="progress-chart-swatch swatch-uncompleted"></span> Uncompleted
      </span>
    </div>
  );
}

function StackedBarChart({ data }) {
  const maxValue = useMemo(() => {
    const m = data.reduce(
      (acc, d) => Math.max(acc, d.completed + d.inProgress + d.uncompleted),
      0
    );
    return Math.max(m, 1);
  }, [data]);

  return (
    <div className="progress-chart">
      {data.map((item) => {
        const total = item.completed + item.inProgress + item.uncompleted;
        const heightPct = (total / maxValue) * 100;
        const completedShare = total ? (item.completed / total) * 100 : 0;
        const inProgressShare = total ? (item.inProgress / total) * 100 : 0;
        const uncompletedShare = total ? (item.uncompleted / total) * 100 : 0;
        return (
          <div className="progress-bar-wrapper" key={item.day}>
            <div className="progress-bar-value">{total}</div>
            <div className="progress-bar-track">
              <div
                className="progress-bar-fill stacked"
                style={{ height: `${heightPct}%` }}
              >
                <div
                  className="progress-bar-segment segment-completed"
                  style={{ flexBasis: `${completedShare}%` }}
                  title={`${item.day}: ${item.completed} completed`}
                ></div>
                <div
                  className="progress-bar-segment segment-inprogress"
                  style={{ flexBasis: `${inProgressShare}%` }}
                  title={`${item.day}: ${item.inProgress} in progress`}
                ></div>
                <div
                  className="progress-bar-segment segment-uncompleted"
                  style={{ flexBasis: `${uncompletedShare}%` }}
                  title={`${item.day}: ${item.uncompleted} uncompleted`}
                ></div>
              </div>
            </div>
            <div className="progress-bar-label">{item.day}</div>
          </div>
        );
      })}
    </div>
  );
}

function GroupedBarChart({ data }) {
  const maxValue = useMemo(() => {
    const m = data.reduce(
      (acc, d) =>
        Math.max(acc, d.completed, d.inProgress, d.uncompleted),
      0
    );
    return Math.max(m, 1);
  }, [data]);

  const keys = ['completed', 'inProgress', 'uncompleted'];
  const labels = ['Completed', 'In Progress', 'Uncompleted'];
  const classes = ['grouped-completed', 'grouped-inprogress', 'grouped-uncompleted'];

  return (
    <div className="progress-chart">
      {data.map((item) => {
        return (
          <div className="progress-bar-wrapper" key={item.day}>
            <div className="progress-bar-value">
              <span style={{ color: STATUS_COLORS.Completed }}>{item.completed}</span>
              {' / '}
              <span style={{ color: STATUS_COLORS['In Progress'] }}>{item.inProgress}</span>
              {' / '}
              <span style={{ color: STATUS_COLORS.Uncompleted }}>{item.uncompleted}</span>
            </div>
            <div className="progress-bar-grouped">
              {keys.map((k, i) => {
                const v = item[k];
                const h = (v / maxValue) * 100;
                return (
                  <div className="grouped-bar-track" key={k}>
                    <div
                      className={`grouped-bar-fill ${classes[i]}`}
                      style={{ height: `${h}%` }}
                      title={`${item.day} ${labels[i]}: ${v}`}
                    >
                      <span className="grouped-bar-num">{v}</span>
                    </div>
                  </div>
                );
              })}
            </div>
            <div className="progress-bar-label">{item.day}</div>
            <div className="grouped-axis-hint" aria-hidden="true">
              <span>C</span>
              <span>I</span>
              <span>U</span>
            </div>
          </div>
        );
      })}
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
    <div className="donut-chart">
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} role="img" aria-label="Status distribution">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="#e2e8f0"
          strokeWidth={stroke}
        />
        {segments.map((seg) => {
          const dash = total ? (seg.value / total) * circumference : 0;
          const segment = (
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
              strokeLinecap="butt"
            />
          );
          offset += dash;
          return segment;
        })}
        <text
          x="50%"
          y="48%"
          textAnchor="middle"
          fontSize="28"
          fontWeight="700"
          fill="#0f172a"
          dominantBaseline="middle"
        >
          {total}
        </text>
        <text
          x="50%"
          y="62%"
          textAnchor="middle"
          fontSize="12"
          fill="#64748b"
          dominantBaseline="middle"
        >
          total tasks
        </text>
      </svg>
      <ul className="donut-legend">
        {segments.map((seg) => (
          <li key={seg.key}>
            <span className="donut-swatch" style={{ background: seg.color }}></span>
            <span className="donut-label">{seg.key}</span>
            <span className="donut-value">
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
    <div className="line-chart">
      <svg viewBox={`0 0 ${width} ${height}`} role="img" aria-label="Daily progress line chart">
        {tickValues.map((t, i) => {
          const y = yFor(t);
          return (
            <g key={i}>
              <line
                x1={padX}
                x2={width - padX}
                y1={y}
                y2={y}
                stroke="#e2e8f0"
                strokeDasharray="3 4"
              />
              <text x={padX - 8} y={y + 4} fontSize="11" fill="#64748b" textAnchor="end">
                {t}
              </text>
            </g>
          );
        })}

        {data.map((d, i) => {
          const x = xFor(i);
          return (
            <text
              key={d.day}
              x={x}
              y={height - padY + 18}
              fontSize="11"
              fill="#475569"
              textAnchor="middle"
            >
              {d.day.slice(0, 3)}
            </text>
          );
        })}

        {series.map((s) => {
          const points = data
            .map((d, i) => `${xFor(i)},${yFor(d[s.key])}`)
            .join(' ');
          return (
            <g key={s.key}>
              <polyline
                fill="none"
                stroke={s.color}
                strokeWidth="2.5"
                strokeLinejoin="round"
                strokeLinecap="round"
                points={points}
              />
              {data.map((d, i) => (
                <circle
                  key={`${s.key}-${i}`}
                  cx={xFor(i)}
                  cy={yFor(d[s.key])}
                  r="4"
                  fill="#ffffff"
                  stroke={s.color}
                  strokeWidth="2"
                >
                  <title>
                    {d.day} {s.label}: {d[s.key]}
                  </title>
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

  const counts = useMemo(() => {
    return {
      all: tasks.length,
      completed: tasks.filter((t) => t.status === 'Completed').length,
      pending: tasks.filter((t) => t.status === 'Uncompleted').length,
      inProcess: tasks.filter((t) => t.status === 'In Progress').length,
    };
  }, [tasks]);

  const visible = useMemo(() => {
    if (activeTab === 'all') return tasks;
    const map = {
      completed: 'Completed',
      pending: 'Uncompleted',
      inProcess: 'In Progress',
    };
    return tasks.filter((t) => t.status === map[activeTab]);
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
    Completed: 'pill pill-done',
    'In Progress': 'pill pill-in-progress',
    Uncompleted: 'pill pill-pending',
  };

  const statusLabel = {
    Completed: 'Done',
    'In Progress': 'In Progress',
    Uncompleted: 'Pending',
  };

  return (
    <div className="todo-list">
      <div className="todo-tabs">
        {tabs.map((tab) => (
          <button
            key={tab.key}
            type="button"
            className={`todo-tab${activeTab === tab.key ? ' active' : ''}`}
            onClick={() => setActiveTab(tab.key)}
          >
            <span>{tab.label}</span>
            <span className="todo-tab-count">{counts[tab.key]}</span>
          </button>
        ))}
      </div>

      <ul className="todo-rows">
        {visible.slice(0, 12).map((t) => (
          <li className="todo-row" key={t.id}>
            <div className="todo-row-main">
              <p className="todo-row-title">{t.title.replace(/ #\d+$/, '')}</p>
              <span className={statusClass[t.status]}>{statusLabel[t.status]}</span>
            </div>
            <div className="todo-row-meta">{formatDue(t.dueDate)}</div>
          </li>
        ))}
        {visible.length === 0 && (
          <li className="todo-row-empty">No tasks in this view.</li>
        )}
      </ul>
    </div>
  );
}

export default function StudentDashboard() {
  const { tasks, dailyProgress, statusTotals } = useStudentData();

  const totalProjects = tasks.length;
  const inProgressCount = statusTotals['In Progress'];
  const completeCount = statusTotals.Completed;
  const upcomingCount = statusTotals.Uncompleted;

  const kpis = [
    {
      label: 'Total Project',
      value: totalProjects,
      icon: 'fa-folder-open',
      tone: 'kpi-indigo',
    },
    {
      label: 'In Progress',
      value: inProgressCount,
      icon: 'fa-spinner',
      tone: 'kpi-amber',
    },
    {
      label: 'Complete',
      value: completeCount,
      icon: 'fa-circle-check',
      tone: 'kpi-green',
    },
    {
      label: 'Upcoming',
      value: upcomingCount,
      icon: 'fa-clock',
      tone: 'kpi-red',
    },
  ];

  return (
    <DashboardLayout title="Dashboard" subtitle="Welcome,">
      <div className="project-management-hero">
        <div className="project-management-hero-title">
          <h2>Project Management</h2>
          <p>Project-Management</p>
        </div>
        <div className="kpi-grid">
          {kpis.map((kpi) => (
            <div className={`kpi-card ${kpi.tone}`} key={kpi.label}>
              <div className="kpi-card-icon">
                <i className={`fa-solid ${kpi.icon}`}></i>
              </div>
              <div className="kpi-card-body">
                <div className="kpi-card-label">{kpi.label}</div>
                <div className="kpi-card-value">{kpi.value.toLocaleString()}</div>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="dashboard-grid">
        <div className="card-panel progress-chart-card grid-span-2">
          <div className="progress-chart-header">
            <h2>Level of Progress</h2>
            <p>Weekly breakdown by status — Monday to Saturday</p>
          </div>
          <Legend />
          <div className="progress-chart-headings" aria-label="Status totals">
            <span className="progress-chart-heading heading-completed">
              Completed <strong>{statusTotals.Completed}</strong>
            </span>
            <span className="progress-chart-heading heading-in-progress">
              In Progress <strong>{statusTotals['In Progress']}</strong>
            </span>
            <span className="progress-chart-heading heading-uncompleted">
              Uncompleted <strong>{statusTotals.Uncompleted}</strong>
            </span>
          </div>
          <h3 className="chart-subtitle">Stacked by status</h3>
          <StackedBarChart data={dailyProgress} />
        </div>

        <div className="card-panel progress-chart-card">
          <div className="progress-chart-header">
            <h2>Status by Day</h2>
            <p>Three side-by-side bars per day</p>
          </div>
          <Legend />
          <div className="progress-chart-headings" aria-label="Status totals">
            <span className="progress-chart-heading heading-completed">
              Completed <strong>{statusTotals.Completed}</strong>
            </span>
            <span className="progress-chart-heading heading-in-progress">
              In Progress <strong>{statusTotals['In Progress']}</strong>
            </span>
            <span className="progress-chart-heading heading-uncompleted">
              Uncompleted <strong>{statusTotals.Uncompleted}</strong>
            </span>
          </div>
          <h3 className="chart-subtitle">Grouped (Completed / In Progress / Uncompleted)</h3>
          <GroupedBarChart data={dailyProgress} />
        </div>

        <div className="card-panel progress-chart-card">
          <div className="progress-chart-header">
            <h2>Overall Distribution</h2>
            <p>Total tasks by status</p>
          </div>
          <DonutChart totals={statusTotals} />
        </div>

        <div className="card-panel progress-chart-card grid-span-2">
          <div className="progress-chart-header">
            <h2>Trend Across the Week</h2>
            <p>Status counts from Monday to Saturday</p>
          </div>
          <Legend />
          <LineChart data={dailyProgress} />
        </div>

        <div className="card-panel progress-chart-card grid-span-3">
          <div className="progress-chart-header">
            <h2>To-Do List</h2>
            <p>Same source as the Tasks page</p>
          </div>
          <TodoList tasks={tasks} />
        </div>
      </div>
    </DashboardLayout>
  );
}