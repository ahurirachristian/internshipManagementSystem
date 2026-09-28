<<<<<<< HEAD
import { useEffect, useState } from 'react';
=======
import { useEffect, useMemo, useState } from 'react';
import { AlertCircle, Check, ListTodo, Loader2, Plus } from 'lucide-react';
import { API_ROOT } from '../services/api';
>>>>>>> developer

const MILESTONES = [
  { key: 'startDate', label: 'Orientation / Start Date' },
  { key: 'logbook', label: 'Weekly Logbook Submissions' },
  { key: 'midTerm', label: 'Mid-Term Evaluation' },
  { key: 'finalReport', label: 'Final Report & Completion' },
];

<<<<<<< HEAD
const SAMPLE_TASKS = [
=======
const INITIAL_TASKS = [
>>>>>>> developer
  { id: 1, title: 'Check validation involves making sure all your tags are properly closed and nested.', status: 'In Progress', date: '10 Nov' },
  { id: 2, title: 'Test the outgoing links from all the pages to the specific domain under test.', status: 'Pending', date: '04 Aug' },
  { id: 3, title: 'Test links are used to send emails to admin or other users from web pages.', status: 'Done', date: '25 Feb' },
  { id: 4, title: 'Options to create forms, if any, form deletes a view or modify the forms.', status: 'In Progress', date: '15 Dec' },
  { id: 5, title: 'Wrong inputs in the forms to the fields in the forms.', status: 'Pending', date: '11 Nov' },
  { id: 6, title: 'Check if the instructions provided are perfect to satisfy its purpose.', status: 'Pending', date: '04 Sept' },
  { id: 7, title: 'Application server and Database server interface.', status: 'Done', date: '08 July' },
];

<<<<<<< HEAD
const STATUS_BADGE = {
  Done: 'badge-success',
  'In Progress': 'badge-warning',
  Pending: 'badge-muted',
};

=======
const STATUS_STYLES = {
  Done: {
    badge: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-400',
    indicator: 'bg-emerald-500 border-emerald-500',
    text: 'text-slate-400 dark:text-slate-500',
  },
  Pending: {
    badge: 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400',
    indicator: 'bg-slate-300 border-slate-300 dark:bg-slate-600 dark:border-slate-600',
    text: 'text-slate-900 dark:text-slate-100',
  },
  'In Progress': {
    badge: 'bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-400',
    indicator: 'bg-amber-400 border-amber-400',
    text: 'text-slate-900 dark:text-slate-100',
  },
};

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sept', 'Oct', 'Nov', 'Dec'];

function formatDate(date = new Date()) {
  return `${String(date.getDate()).padStart(2, '0')} ${MONTHS[date.getMonth()]}`;
}

>>>>>>> developer
export default function InternshipProgress() {
  const [progress, setProgress] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
<<<<<<< HEAD
  const [tasks, setTasks] = useState(SAMPLE_TASKS);
  const [newTask, setNewTask] = useState('');
=======
  const [tasks, setTasks] = useState(INITIAL_TASKS);
  const [newTask, setNewTask] = useState('');
  const [nextTaskId, setNextTaskId] = useState(INITIAL_TASKS.length + 1);
>>>>>>> developer

  useEffect(() => {
    async function loadProgress() {
      setLoading(true);
      setError('');
      try {
        const response = await fetch('/api/students/me/progress', {
          credentials: 'include',
        });
        if (!response.ok) {
          throw new Error('Failed to load progress');
        }
        setProgress(await response.json());
      } catch (err) {
        setError(err.message || 'Unable to load progress.');
      } finally {
        setLoading(false);
      }
    }

    loadProgress();
  }, []);

  const diaryCount = progress?.diaryCount ?? 0;
  const steps = useMemo(() => [
    Boolean(progress?.startDate),
    diaryCount > 0,
    Boolean(progress?.midTerm) || diaryCount >= 5,
    Boolean(progress?.finalReport) || diaryCount >= 10,
  ], [progress, diaryCount]);

  const completedCount = steps.filter(Boolean).length;
  const activeIndex = steps.findIndex((step) => !step);
<<<<<<< HEAD
  const activeStep = activeIndex === -1 ? 4 : activeIndex + 1;
  const percentage = Math.round((completedCount / 4) * 100);
  const lineWidth = `${Math.min(completedCount / 3, 1) * 100}%`;

  if (loading) {
    return <div className="status-message">Loading progress...</div>;
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      <div className="card-panel">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', flexWrap: 'wrap', gap: '8px' }}>
          <div>
            <h2 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 600 }}>Internship Progress</h2>
            <p style={{ margin: 0, opacity: 0.7, fontSize: '0.875rem', marginTop: '4px', color: '#64748b' }}>
              {completedCount} of {MILESTONES.length} milestones completed
            </p>
          </div>
          <div style={{ fontSize: '1.5rem', fontWeight: 800, color: '#0f766e' }}>
=======
  const percentage = Math.round((completedCount / MILESTONES.length) * 100);
  const lineWidth = `${Math.min(completedCount / (MILESTONES.length - 1), 1) * 100}%`;
  const counts = useMemo(() => ({
    all: tasks.length,
    completed: tasks.filter((task) => task.status === 'Done').length,
    inProgress: tasks.filter((task) => task.status === 'In Progress').length,
  }), [tasks]);

  function addTask(event) {
    event.preventDefault();
    const title = newTask.trim();
    if (!title) return;

    setTasks((currentTasks) => [
      ...currentTasks,
      { id: nextTaskId, title, status: 'Pending', date: formatDate() },
    ]);
    setNextTaskId((id) => id + 1);
    setNewTask('');
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-5 h-5 text-teal-600 animate-spin" />
        <span className="ml-2 text-sm text-slate-500">Loading progress...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <section className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xs p-5" aria-labelledby="progress-title">
        <div className="flex items-center justify-between mb-5 flex-wrap gap-2">
          <div>
            <div className="flex items-center gap-2">
              <ListTodo className="w-5 h-5 text-teal-700 dark:text-teal-400" />
              <h2 id="progress-title" className="text-base font-bold text-slate-900 dark:text-slate-100">Internship Progress</h2>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1.5">
              {completedCount} of {MILESTONES.length} milestones completed
              {diaryCount > 0 && ` · ${diaryCount} diary ${diaryCount === 1 ? 'entry' : 'entries'}`}
            </p>
          </div>
          <div className="text-2xl font-bold text-teal-700 dark:text-teal-400" aria-label={`${percentage}% complete`}>
>>>>>>> developer
            {percentage}%
          </div>
        </div>

<<<<<<< HEAD
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', position: 'relative', padding: '0 12px' }}>
          <div style={{ position: 'absolute', top: '20px', left: '24px', right: '24px', height: '4px', background: '#e2e8f0', borderRadius: '2px' }} />
          <div style={{ position: 'absolute', top: '20px', left: '24px', height: '4px', background: '#0f766e', borderRadius: '2px', width: lineWidth }} />

          {MILESTONES.map((milestone, index) => {
            const isCompleted = steps[index];
            const isActive = index === activeIndex;

            return (
              <div key={milestone.key} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '10px', position: 'relative', zIndex: 1, flex: 1 }}>
                <div
                  style={{
                    width: '40px',
                    height: '40px',
                    borderRadius: '50%',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    background: isCompleted ? '#0f766e' : '#ffffff',
                    border: `3px solid ${isCompleted ? '#0f766e' : isActive ? '#0f766e' : '#cbd5e1'}`,
                    color: isCompleted ? '#ffffff' : isActive ? '#0f766e' : '#64748b',
                    fontWeight: 700,
                    fontSize: '0.875rem',
                    boxShadow: isActive ? '0 0 0 4px rgba(15, 118, 110, 0.15)' : 'none',
                  }}
                >
                  {isCompleted ? (
                    <i className="fa-solid fa-check" style={{ fontSize: '0.875rem' }} />
                  ) : (
                    index + 1
                  )}
                </div>
                <div
                  style={{
                    textAlign: 'center',
                    fontSize: '0.75rem',
                    fontWeight: isActive || isCompleted ? 600 : 400,
                    color: isCompleted || isActive ? '#0f172a' : '#64748b',
                    maxWidth: '100px',
                    lineHeight: 1.3,
                  }}
                >
                  {milestone.label}
=======
        {error && (
          <div role="alert" className="mb-5 p-3.5 bg-rose-50 border border-rose-200 rounded-xl flex items-start gap-2.5 text-rose-900 text-sm">
            <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <div className="relative px-3 pt-2">
          <div className="absolute top-5 left-6 right-6 h-1 bg-slate-200 dark:bg-slate-700 rounded-full" aria-hidden="true" />
          <div
            className="absolute top-5 left-6 h-1 bg-teal-700 dark:bg-teal-500 rounded-full transition-all duration-500"
            style={{ width: lineWidth }}
            aria-hidden="true"
          />

          <div className="flex items-start justify-between relative z-10">
            {MILESTONES.map((milestone, index) => {
              const isCompleted = steps[index];
              const isActive = index === activeIndex;

              return (
                <div key={milestone.key} className="flex flex-col items-center gap-2.5 relative flex-1 min-w-0">
                  <div
                    className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold border-[3px] transition-all shrink-0 ${
                      isCompleted
                        ? 'bg-teal-700 text-white border-teal-700'
                        : isActive
                          ? 'bg-white dark:bg-slate-900 text-teal-700 border-teal-700 ring-4 ring-teal-700/15'
                          : 'bg-white dark:bg-slate-900 text-slate-500 border-slate-300 dark:border-slate-600'
                    }`}
                    aria-label={`${milestone.label}: ${isCompleted ? 'completed' : isActive ? 'in progress' : 'pending'}`}
                  >
                    {isCompleted ? <Check className="w-4 h-4" /> : index + 1}
                  </div>
                  <div
                    className={`text-center text-[11px] max-w-[110px] leading-tight ${
                      isActive || isCompleted ? 'font-semibold text-slate-900 dark:text-slate-100' : 'font-normal text-slate-500 dark:text-slate-400'
                    }`}
                  >
                    {milestone.label}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      <section className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xs p-6" aria-labelledby="todo-title">
        <div className="flex items-center gap-2 mb-1">
          <ListTodo className="w-5 h-5 text-teal-700 dark:text-teal-400" />
          <h2 id="todo-title" className="text-base font-bold text-slate-900 dark:text-slate-100">To Do List</h2>
        </div>
        <p className="text-xs text-slate-500 dark:text-slate-400 mb-4">Track your internship tasks and current status.</p>

        <div className="flex flex-wrap gap-2 mb-5" aria-label="Task counts">
          <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400">
            All Task <span className="min-w-[1.25rem] text-center rounded-full bg-white dark:bg-slate-900 px-1.5 py-0.5">{counts.all}</span>
          </span>
          <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-400">
            Completed <span className="min-w-[1.25rem] text-center rounded-full bg-white dark:bg-slate-900 px-1.5 py-0.5">{counts.completed}</span>
          </span>
          <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-400">
            In Process <span className="min-w-[1.25rem] text-center rounded-full bg-white dark:bg-slate-900 px-1.5 py-0.5">{counts.inProgress}</span>
          </span>
        </div>

        <div className="space-y-3" aria-live="polite">
          {tasks.map((task) => {
            const styles = STATUS_STYLES[task.status] || STATUS_STYLES.Pending;
            return (
              <div
                key={task.id}
                className="flex items-center justify-between gap-4 p-4 border border-slate-200 dark:border-slate-800 rounded-xl bg-slate-50/40 dark:bg-slate-800/20"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div
                    className={`w-4 h-4 rounded-full border-2 flex items-center justify-center shrink-0 ${styles.indicator}`}
                    aria-hidden="true"
                  >
                    {task.status === 'Done' && <Check className="w-2.5 h-2.5 text-white" />}
                  </div>
                  <span className={`text-sm font-medium break-words ${styles.text} ${task.status === 'Done' ? 'line-through' : ''}`}>
                    {task.title}
                  </span>
                </div>
                <div className="flex items-center gap-3 shrink-0">
                  <span className={`px-2.5 py-1 rounded-full text-[11px] font-bold whitespace-nowrap ${styles.badge}`}>{task.status}</span>
                  <span className="text-xs text-slate-500 dark:text-slate-400 whitespace-nowrap">{task.date}</span>
>>>>>>> developer
                </div>
              </div>
            );
          })}
          {tasks.length === 0 && (
            <div className="py-8 text-center text-sm text-slate-500 dark:text-slate-400 border border-dashed border-slate-300 dark:border-slate-700 rounded-xl">
              No tasks yet. Add your first task below.
            </div>
          )}
        </div>
<<<<<<< HEAD
      </div>

      <div className="card-panel">
        <h2 style={{ margin: 0, fontSize: '1.15rem', fontWeight: 600, marginBottom: '4px' }}>To Do List</h2>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px', marginBottom: '18px' }}>
          <span className="badge badge-muted">All Task {tasks.length}</span>
          <span className="badge badge-success">Completed {tasks.filter((t) => t.status === 'Done').length}</span>
          <span className="badge badge-muted">Pending {tasks.filter((t) => t.status === 'Pending').length}</span>
          <span className="badge badge-warning">In Process {tasks.filter((t) => t.status === 'In Progress').length}</span>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          {tasks.map((task) => (
            <div
              key={task.id}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: '12px',
                padding: '12px 14px',
                border: '1px solid #e2e8f0',
                borderRadius: '10px',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <span
                  style={{
                    width: '18px',
                    height: '18px',
                    borderRadius: '50%',
                    border: `2px solid ${task.status === 'Done' ? '#0f766e' : '#cbd5e1'}`,
                    background: task.status === 'Done' ? '#0f766e' : 'transparent',
                    display: 'inline-flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: '#fff',
                    fontSize: '0.7rem',
                    flexShrink: 0,
                  }}
                >
                  {task.status === 'Done' && <i className="fa-solid fa-check" style={{ fontSize: '0.6rem' }} />}
                </span>
                <span style={{ fontWeight: 500 }}>{task.title}</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '14px', whiteSpace: 'nowrap' }}>
                <span className={`badge ${STATUS_BADGE[task.status]}`}>{task.status}</span>
                <span style={{ fontSize: '0.8rem', color: '#64748b' }}>{task.date}</span>
              </div>
            </div>
          ))}
        </div>

        <form
          style={{ display: 'flex', gap: '10px', marginTop: '18px' }}
          onSubmit={(e) => {
            e.preventDefault();
            if (!newTask.trim()) return;
            setTasks((prev) => [
              ...prev,
              { id: Date.now(), title: newTask.trim(), status: 'Pending', date: '—' },
            ]);
            setNewTask('');
          }}
        >
          <input
            className="form-input"
            style={{ flex: 1 }}
            placeholder="Enter new task here. . ."
            value={newTask}
            onChange={(e) => setNewTask(e.target.value)}
          />
          <button type="submit" className="primary-button" style={{ padding: '10px 18px' }}>Add</button>
        </form>
      </div>
=======

        <form className="flex flex-col sm:flex-row gap-3 mt-5" onSubmit={addTask}>
          <input
            type="text"
            aria-label="New task"
            className="flex-1 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 text-xs rounded-xl border border-slate-300 dark:border-slate-700 px-3.5 py-2.5 focus:border-teal-600 focus:ring-2 focus:ring-teal-600/20 focus:outline-none transition-all shadow-xs font-medium"
            placeholder="Enter new task here"
            value={newTask}
            onChange={(event) => setNewTask(event.target.value)}
          />
          <button
            type="submit"
            disabled={!newTask.trim()}
            className="inline-flex items-center justify-center gap-1.5 px-4 py-2 rounded-xl bg-teal-700 hover:bg-teal-800 disabled:opacity-50 disabled:cursor-not-allowed text-white text-xs font-bold transition-colors shrink-0"
          >
            <Plus className="w-3.5 h-3.5" />
            Add Task
          </button>
        </form>
      </section>
>>>>>>> developer
    </div>
  );
}
