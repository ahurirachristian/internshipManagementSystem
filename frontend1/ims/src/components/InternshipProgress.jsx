import { useEffect, useState } from 'react';

const MILESTONES = [
  { key: 'startDate', label: 'Orientation / Start Date' },
  { key: 'logbook', label: 'Weekly Logbook Submissions' },
  { key: 'midTerm', label: 'Mid-Term Evaluation' },
  { key: 'finalReport', label: 'Final Report & Completion' },
];

const SAMPLE_TASKS = [
  { id: 1, title: 'Check validation involves making sure all your tags are properly closed and nested.', status: 'In Progress', date: '10 Nov' },
  { id: 2, title: 'Test the outgoing links from all the pages to the specific domain under test.', status: 'Pending', date: '04 Aug' },
  { id: 3, title: 'Test links are used to send emails to admin or other users from web pages.', status: 'Done', date: '25 Feb' },
  { id: 4, title: 'Options to create forms, if any, form deletes a view or modify the forms.', status: 'In Progress', date: '15 Dec' },
  { id: 5, title: 'Wrong inputs in the forms to the fields in the forms.', status: 'Pending', date: '11 Nov' },
  { id: 6, title: 'Check if the instructions provided are perfect to satisfy its purpose.', status: 'Pending', date: '04 Sept' },
  { id: 7, title: 'Application server and Database server interface.', status: 'Done', date: '08 July' },
];

const STATUS_BADGE = {
  Done: 'badge-success',
  'In Progress': 'badge-warning',
  Pending: 'badge-muted',
};

export default function InternshipProgress() {
  const [progress, setProgress] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [tasks, setTasks] = useState(SAMPLE_TASKS);
  const [newTask, setNewTask] = useState('');

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
        const data = await response.json();
        setProgress(data);
      } catch (err) {
        setError(err.message || 'Unable to load progress.');
      } finally {
        setLoading(false);
      }
    }
    loadProgress();
  }, []);

  const startDate = progress?.startDate ?? false;
  const diaryCount = progress?.diaryCount ?? 0;
  const midTerm = progress?.midTerm ?? diaryCount >= 5;
  const finalReport = progress?.finalReport ?? diaryCount >= 10;

  const steps = [startDate, diaryCount >= 5, midTerm, finalReport];
  const completedCount = steps.filter(Boolean).length;
  const activeIndex = steps.findIndex((step) => !step);
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
            {percentage}%
          </div>
        </div>

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
                </div>
              </div>
            );
          })}
        </div>
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
    </div>
  );
}
