import { useMemo, useState } from 'react';
import DashboardLayout from '../DashboardLayout';
<<<<<<< HEAD
import { useStudentData } from '../../context/StudentDataContext';

const STATUS_COLORS = {
  Completed: '#16a34a',
  'In Progress': '#f59e0b',
  Uncompleted: '#ef4444',
=======
import StudentEditModal from '../StudentEditModal';
import InternshipProgress from '../InternshipProgress';
import DiaryReviewModal from '../DiaryReviewModal';
import OverviewSection from './OverviewSection';
import StudentDataProvider from '../../context/StudentDataContext';
import {
  createDiary,
  deleteDiary,
  fetchMyProfile,
  fetchMyDiaries,
  fetchCompanies,
  fetchSupervisors,
  saveMyProfile,
  updateDiary,
  fetchMyLearningInstitute,
  fetchMyCompany,
  fetchMyIndustrialSupervisor,
  fetchMyUniversitySupervisor,
  fetchMySettings,
  updateMySettings,
} from '../../services/api';
import LearningInstituteSection from './LearningInstituteSection';
import CompaniesSection from './CompaniesSection';
import IndustrialSupervisorSection from './IndustrialSupervisorSection';
import UniversitySupervisorSection from './UniversitySupervisorSection';
import SettingsSection from './SettingsSection';

const emptyDiaryForm = {
  date: new Date().toISOString().split('T')[0],
  dailyActivities: '',
  knowledgeAndSkillsGained: '',
  accomplishments: '',
  accountNumber: '',
  action: '',
  technologyTools: '',
>>>>>>> developer
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
<<<<<<< HEAD
  const { tasks, dailyProgress, statusTotals } = useStudentData();
=======
  const [activeTab, setActiveTab] = useState('overview');
  const [profile, setProfile] = useState(null);
  const [profileLoading, setProfileLoading] = useState(true);
  const [profileError, setProfileError] = useState('');
  const [profileNotice, setProfileNotice] = useState('');
  const [profileModalOpen, setProfileModalOpen] = useState(false);
  const [diaries, setDiaries] = useState([]);
  const [diaryLoading, setDiaryLoading] = useState(false);
  const [diaryError, setDiaryError] = useState('');
  const [diaryNotice, setDiaryNotice] = useState('');
  const [diaryForm, setDiaryForm] = useState(emptyDiaryForm);
  const [editingDiaryId, setEditingDiaryId] = useState(null);
  const [reviewDiary, setReviewDiary] = useState(null);
  const [companies, setCompanies] = useState([]);
  const [supervisors, setSupervisors] = useState([]);
>>>>>>> developer

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

<<<<<<< HEAD
  return (
    <DashboardLayout title="Dashboard" subtitle="Welcome,">
      <div className="project-management-hero">
        <div className="project-management-hero-title">
          <h2>Project Management</h2>
          <p>Project-Management</p>
=======
  async function loadProfile() {
    setProfileLoading(true);
    setProfileError('');
    try {
      const result = await fetchMyProfile();
      setProfile(result);
    } catch (err) {
      if (err.status === 404) {
        setProfile(null);
      } else {
        setProfileError(err.message || 'Unable to load profile.');
      }
    } finally {
      setProfileLoading(false);
    }
  }

  async function loadCompanies() {
    try {
      const data = await fetchCompanies();
      setCompanies(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error('Failed to load companies', err);
      setCompanies([]);
    }
  }

  async function loadSupervisors() {
    try {
      const data = await fetchSupervisors('UNIVERSITY');
      setSupervisors(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error('Failed to load supervisors', err);
      setSupervisors([]);
    }
  }

  function openProfileModal() {
    setProfileModalOpen(true);
  }

  async function handleProfileSave(payload) {
    const saved = await saveMyProfile(payload);
    setProfile(saved);
    setProfileNotice('Profile saved successfully.');
  }

  async function handleDiarySubmit(event) {
    event.preventDefault();
    setDiaryError('');
    setDiaryNotice('');
    if (!diaryForm.date || !diaryForm.dailyActivities.trim()) {
      setDiaryError('Date and daily activities are required.');
      return;
    }
    setDiaryLoading(true);
    try {
      if (editingDiaryId) {
        await updateDiary(editingDiaryId, diaryForm);
        setDiaryNotice('Diary entry updated successfully.');
      } else {
        await createDiary(diaryForm);
        setDiaryNotice('Diary entry saved successfully.');
      }
      setDiaryForm(emptyDiaryForm);
      setEditingDiaryId(null);
      await loadDiaries();
    } catch (err) {
      setDiaryError(err.message || 'Unable to save diary entry.');
    } finally {
      setDiaryLoading(false);
    }
  }

  function startEditDiary(entry) {
    setDiaryForm({
      date: entry.date,
      dailyActivities: entry.dailyActivities,
      knowledgeAndSkillsGained: entry.knowledgeAndSkillsGained,
      accomplishments: entry.accomplishments,
      accountNumber: entry.accountNumber || '',
      action: entry.action || '',
      technologyTools: entry.technologyTools || '',
    });
    setEditingDiaryId(entry.id);
    setDiaryError('');
    setDiaryNotice('');
    document.getElementById('diary-form')?.scrollIntoView({ behavior: 'smooth' });
  }

  function cancelEditDiary() {
    setDiaryForm(emptyDiaryForm);
    setEditingDiaryId(null);
    setDiaryError('');
  }

  async function handleDeleteDiary(id) {
    if (!window.confirm('Delete this diary entry?')) return;
    setDiaryLoading(true);
    try {
      await deleteDiary(id);
      await loadDiaries();
    } catch (err) {
      setDiaryError(err.message || 'Unable to delete diary entry.');
    } finally {
      setDiaryLoading(false);
    }
  }

  function renderProfile() {
    if (profileLoading) {
      return (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-5 h-5 text-teal-600 animate-spin" />
          <span className="ml-2 text-sm text-slate-500 dark:text-slate-400">Loading profile...</span>
>>>>>>> developer
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

<<<<<<< HEAD
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
=======
  function renderDiary() {
    return (
      <>
        <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xs p-6">
          <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100 mb-1">{editingDiaryId ? 'Edit Day Diary Entry' : 'New Day Diary Entry'}</h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mb-5">
            {editingDiaryId
              ? 'Update the activities and skills gained for this day.'
              : 'Record the activities and skills gained for a day.'}
          </p>
          <form id="diary-form" onSubmit={handleDiarySubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label htmlFor="diary-date" className={labelClass}>Date <span className="text-rose-600" aria-hidden="true">*</span></label>
                <input
                  id="diary-date"
                  type="date"
                  value={diaryForm.date}
                  onChange={(e) => setDiaryForm({ ...diaryForm, date: e.target.value })}
                  className={inputClass}
                />
              </div>
              <div>
                <label htmlFor="diary-account" className={labelClass}>Account Number</label>
                <input
                  id="diary-account"
                  type="text"
                  value={diaryForm.accountNumber}
                  onChange={(e) => setDiaryForm({ ...diaryForm, accountNumber: e.target.value })}
                  className={inputClass}
                  placeholder="Enter account number"
                />
              </div>
            </div>
            <div>
              <label htmlFor="diary-activities" className={labelClass}>Daily Activities <span className="text-rose-600" aria-hidden="true">*</span></label>
              <textarea
                id="diary-activities"
                rows="4"
                value={diaryForm.dailyActivities}
                onChange={(e) => setDiaryForm({ ...diaryForm, dailyActivities: e.target.value })}
                className={`${inputClass} min-h-[80px] resize-y`}
              />
            </div>
            <div>
              <label htmlFor="diary-skills" className={labelClass}>Knowledge &amp; Skills Gained</label>
              <textarea
                id="diary-skills"
                rows="3"
                value={diaryForm.knowledgeAndSkillsGained}
                onChange={(e) => setDiaryForm({ ...diaryForm, knowledgeAndSkillsGained: e.target.value })}
                className={`${inputClass} min-h-[60px] resize-y`}
              />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label htmlFor="diary-action" className={labelClass}>Action</label>
                <textarea
                  id="diary-action"
                  rows="3"
                  value={diaryForm.action}
                  onChange={(e) => setDiaryForm({ ...diaryForm, action: e.target.value })}
                  className={`${inputClass} min-h-[60px] resize-y`}
                  placeholder="Describe the action taken"
                />
              </div>
              <div>
                <label htmlFor="diary-tech" className={labelClass}>Technology / Tools Used</label>
                <textarea
                  id="diary-tech"
                  rows="3"
                  value={diaryForm.technologyTools}
                  onChange={(e) => setDiaryForm({ ...diaryForm, technologyTools: e.target.value })}
                  className={`${inputClass} min-h-[60px] resize-y`}
                  placeholder="List technologies or tools used"
                />
              </div>
            </div>
            <div>
              <label htmlFor="diary-accomplishments" className={labelClass}>Accomplishments</label>
              <textarea
                id="diary-accomplishments"
                rows="3"
                value={diaryForm.accomplishments}
                onChange={(e) => setDiaryForm({ ...diaryForm, accomplishments: e.target.value })}
                className={`${inputClass} min-h-[60px] resize-y`}
              />
            </div>
            <div className="flex items-center justify-end gap-3 pt-2">
              {editingDiaryId && (
                <button type="button" onClick={cancelEditDiary} className="px-3.5 py-2 rounded-xl bg-white dark:bg-slate-900 hover:bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs font-semibold border border-slate-300 dark:border-slate-700 transition-colors shadow-xs">
                  Cancel Edit
                </button>
              )}
              <button
                type="submit"
                className="px-3.5 py-2 rounded-xl bg-primary hover:bg-primary text-white text-xs font-bold transition-all flex items-center gap-1.5 shadow-xs focus-visible:ring-2 focus-visible:ring-teal-600 focus-visible:outline-none"
              >
                {editingDiaryId ? 'Update Entry' : 'Save Entry'}
              </button>
            </div>
          </form>
        </div>

        <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xs p-6">
          <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100 mb-4">My Diary Entries</h2>
          {diaryLoading && (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="w-5 h-5 text-teal-600 animate-spin" />
              <span className="ml-2 text-sm text-slate-500 dark:text-slate-400">Loading entries...</span>
            </div>
          )}
          {!diaryLoading && diaries.length === 0 && (
            <p className="text-sm text-slate-500 dark:text-slate-400 text-center py-8">No diary entries yet. Add your first entry above.</p>
          )}
          {!diaryLoading && diaries.length > 0 && (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-slate-200 dark:border-slate-800">
                    <th className="py-2.5 px-3 font-bold text-slate-800 dark:text-slate-200">Date</th>
                    <th className="py-2.5 px-3 font-bold text-slate-800 dark:text-slate-200">Account Number</th>
                    <th className="py-2.5 px-3 font-bold text-slate-800 dark:text-slate-200">Activities</th>
                    <th className="py-2.5 px-3 font-bold text-slate-800 dark:text-slate-200">Action</th>
                    <th className="py-2.5 px-3 font-bold text-slate-800 dark:text-slate-200">Skills Gained</th>
                    <th className="py-2.5 px-3 font-bold text-slate-800 dark:text-slate-200">Technology / Tools Used</th>
                    <th className="py-2.5 px-3 font-bold text-slate-800 dark:text-slate-200 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {diaries.map((entry) => (
                    <tr key={entry.id} className="border-b border-slate-100 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/40">
                      <td className="py-2.5 px-3 text-slate-700 dark:text-slate-300 whitespace-nowrap">{entry.date}</td>
                      <td className="py-2.5 px-3 text-slate-700 dark:text-slate-300">{entry.accountNumber || '—'}</td>
                      <td className="py-2.5 px-3 text-slate-700 dark:text-slate-300 max-w-[200px] truncate">{entry.dailyActivities || '—'}</td>
                      <td className="py-2.5 px-3 text-slate-700 dark:text-slate-300 max-w-[200px] truncate">{entry.action || '—'}</td>
                      <td className="py-2.5 px-3 text-slate-700 dark:text-slate-300 max-w-[200px] truncate">{entry.knowledgeAndSkillsGained || '—'}</td>
                      <td className="py-2.5 px-3 text-slate-700 dark:text-slate-300 max-w-[200px] truncate">{entry.technologyTools || '—'}</td>
                      <td className="py-2.5 px-3 text-right whitespace-nowrap">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => startEditDiary(entry)}
                            className="p-1.5 text-emerald-600 hover:text-emerald-800 hover:bg-emerald-50 rounded-lg transition-colors focus-visible:ring-2 focus-visible:ring-emerald-600 focus-visible:outline-none"
                            title="Edit"
                          >
                            <Pencil className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleDeleteDiary(entry.id)}
                            className="p-1.5 text-rose-600 hover:text-rose-800 hover:bg-rose-50 rounded-lg transition-colors focus-visible:ring-2 focus-visible:ring-rose-600 focus-visible:outline-none"
                            title="Delete"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => setReviewDiary(entry)}
                            className="px-2.5 py-1.5 text-teal-600 hover:text-teal-800 hover:bg-teal-50 rounded-lg transition-colors focus-visible:ring-2 focus-visible:ring-teal-600 focus-visible:outline-none text-[11px] font-bold"
                            title="View"
                          >
                            View
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {(diaries.length > 0) && (
            <div className="mt-6 space-y-4">
              <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">Supervisor Comments</h3>
              {diaries.map((entry) => (
                <div key={`comments-${entry.id}`} className="bg-slate-50 dark:bg-slate-800/40 rounded-xl p-4 border border-slate-200 dark:border-slate-800">
                  <p className="text-xs font-bold text-slate-800 dark:text-slate-200 mb-2">{entry.date}</p>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <span className="text-[11px] font-bold uppercase tracking-wider text-slate-800 dark:text-slate-200">Industrial Supervisor Comment</span>
                      <p className="text-sm text-slate-700 dark:text-slate-300 mt-1">{entry.industrialSupervisorComment || '—'}</p>
                    </div>
                    <div>
                      <span className="text-[11px] font-bold uppercase tracking-wider text-slate-800 dark:text-slate-200">University Supervisor Comment</span>
                      <p className="text-sm text-slate-700 dark:text-slate-300 mt-1">{entry.universitySupervisorComment || '—'}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
>>>>>>> developer
        </div>

<<<<<<< HEAD
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
=======
  return (
    <DashboardLayout
      title="Student Dashboard"
      subtitle="Welcome,"
      tabs={[
        { id: 'overview', label: 'Overview' },
        { id: 'profile', label: 'Profile' },
        { id: 'progress', label: 'Progress' },
        { id: 'learning-institute', label: 'Learning Institute' },
        { id: 'companies', label: 'Companies' },
        { id: 'industrial-supervisor', label: 'Industrial Supervisor' },
        { id: 'university-supervisor', label: 'University Supervisor' },
        { id: 'settings', label: 'Settings' },
        { id: 'diary', label: 'Day Diary' },
      ]}
      activeTab={activeTab}
      onTabChange={(tab) => {
        setActiveTab(tab);
        if (tab === 'diary') {
          loadDiaries();
        }
      }}
    >
      <InternshipProgress />

      {profileNotice && (
        <div role="status" className="p-3.5 bg-emerald-50 border border-emerald-200 rounded-xl flex items-center gap-2.5 text-emerald-950 text-sm animate-in fade-in">
          <CheckCircle className="w-5 h-5 text-emerald-700 shrink-0" />
          <span className="font-medium">{profileNotice}</span>
>>>>>>> developer
        </div>

<<<<<<< HEAD
        <div className="card-panel progress-chart-card">
          <div className="progress-chart-header">
            <h2>Overall Distribution</h2>
            <p>Total tasks by status</p>
          </div>
          <DonutChart totals={statusTotals} />
        </div>
=======
      {activeTab === 'overview' && (
        <StudentDataProvider>
          <OverviewSection />
        </StudentDataProvider>
      )}
      {activeTab === 'profile' ? renderProfile() : null}
      {activeTab === 'progress' ? <InternshipProgress /> : null}
      {activeTab === 'learning-institute' ? <LearningInstituteSection /> : null}
      {activeTab === 'companies' ? <CompaniesSection /> : null}
      {activeTab === 'industrial-supervisor' ? <IndustrialSupervisorSection /> : null}
      {activeTab === 'university-supervisor' ? <UniversitySupervisorSection /> : null}
      {activeTab === 'settings' ? <SettingsSection /> : null}
      {activeTab === 'diary' ? renderDiary() : null}
>>>>>>> developer

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