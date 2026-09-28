<<<<<<< HEAD
import { useEffect, useMemo, useState } from 'react';
import DashboardLayout from '../DashboardLayout';
import { useAuth } from '../../context/AuthContext';
import { fetchStudentDiaries, submitDiaryFeedback } from '../../services/api';

const ACTIVITY_POOL = [
  'Reviewed pull requests and merged feature branches into staging.',
  'Implemented REST endpoints for the new reporting module.',
  'Migrated legacy data from CSV exports into the new schema.',
  'Designed wireframes and shared them with the product owner.',
  'Wrote unit and integration tests for the authentication flow.',
  'Debugged performance bottleneck in the dashboard query.',
  'Configured CI pipeline to run lint, test, and build stages.',
  'Set up staging environment and verified deployment scripts.',
  'Prepared weekly status report and presented to supervisors.',
  'Refactored shared component library to use the new design tokens.',
  'Documented the onboarding flow for new interns joining the team.',
  'Performed security review of public API endpoints.',
  'Optimized SQL queries and added appropriate indexes.',
  'Conducted usability testing sessions with three pilot users.',
];

const SKILL_POOL = [
  'Problem solving', 'Version control (Git)', 'REST API design',
  'Test-driven development', 'Agile communication', 'Time management',
  'Code review', 'Database modelling', 'Technical writing',
];

const TOOL_POOL = [
  'React', 'Node.js', 'PostgreSQL', 'Docker', 'GitHub Actions',
  'Figma', 'Jira', 'VS Code', 'Postman', 'Spring Boot',
];

const ACTION_POOL = [
  'Submitted via the daily diary form.',
  'Reviewed and approved by the lead engineer.',
  'Awaiting supervisor feedback.',
  'Discussed during the weekly sync.',
];

function seedRand(seed) {
  let s = seed % 2147483647;
  if (s <= 0) s += 2147483646;
  return () => {
    s = (s * 16807) % 2147483647;
    return (s - 1) / 2147483646;
  };
}

function buildMockDiaries(accountNumber, count = 28) {
  const rand = seedRand(2026 + (accountNumber?.length || 0));
  const start = new Date(2026, 8, 1);
  const list = [];
  for (let i = 0; i < count; i += 1) {
    const d = new Date(start);
    d.setDate(d.getDate() + i * 1);
    if (d.getDay() === 0) continue;
    list.push({
      id: `mock-${i}-${accountNumber}`,
      date: d.toISOString().slice(0, 10),
      accountNumber,
      dailyActivities: ACTIVITY_POOL[Math.floor(rand() * ACTIVITY_POOL.length)],
      action: ACTION_POOL[Math.floor(rand() * ACTION_POOL.length)],
      knowledgeAndSkillsGained: SKILL_POOL[Math.floor(rand() * SKILL_POOL.length)],
      technologyTools: TOOL_POOL[Math.floor(rand() * TOOL_POOL.length)],
      accomplishments: 'Delivered the planned tasks for the day within the agreed timeline.',
      supervisorFeedback: '',
      industrialSupervisorComment: i % 3 === 0
        ? 'Great initiative today — keep up the consistent documentation.'
        : '',
      universitySupervisorComment: i % 4 === 0
        ? 'Reflect on the trade-offs made during the refactor in your next logbook entry.'
        : '',
    });
  }
  return list;
=======
import { useCallback, useEffect, useMemo, useState } from 'react';
import { Eye, Loader2, X } from 'lucide-react';
import DashboardLayout from '../DashboardLayout';
import { useAuth } from '../../context/AuthContext';
import { fetchDiaries, fetchMyDiaries, submitDiaryFeedback } from '../../services/api';

const headerCellClass =
  'text-left text-[11px] font-bold uppercase tracking-wider text-slate-600 dark:text-slate-300 px-6 py-3 border-b border-slate-200 dark:border-slate-800 border border-l border-slate-200 dark:border-slate-800';

const bodyCellClass =
  'px-6 py-4 text-sm text-slate-700 dark:text-slate-300 border-b border-slate-200 dark:border-slate-800 border border-l border-slate-200 dark:border-slate-800 last:border-b-0';

function DetailBlock({ label, value, full = false }) {
  return (
    <div className={full ? 'md:col-span-2' : ''}>
      <span className="text-[11px] font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400">{label}</span>
      <p className="text-sm text-slate-700 dark:text-slate-300 mt-1 break-words">{value || '—'}</p>
    </div>
  );
>>>>>>> developer
}

export default function DayDiariesPage() {
  const { user } = useAuth();
  const [diaries, setDiaries] = useState([]);
<<<<<<< HEAD
  const [diaryLoading, setDiaryLoading] = useState(false);
  const [diaryError, setDiaryError] = useState('');
  const [viewDiary, setViewDiary] = useState(null);
  const [commentForId, setCommentForId] = useState('');
  const [commentText, setCommentText] = useState('');
  const [commentSubmitting, setCommentSubmitting] = useState(false);
  const [commentMessage, setCommentMessage] = useState('');
=======
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [viewDiary, setViewDiary] = useState(null);
  const [commentForId, setCommentForId] = useState('');
  const [commentText, setCommentText] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [commentMsg, setCommentMsg] = useState('');

  const canComment = user?.role === 'ADMIN' || user?.role === 'SUPERVISOR';
  const selectedDiary = useMemo(
    () => diaries.find((entry) => String(entry.id) === String(commentForId)),
    [diaries, commentForId]
  );

  const loadDiaries = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const data = user?.role === 'STUDENT' ? await fetchMyDiaries() : await fetchDiaries();
      setDiaries(Array.isArray(data) ? data : []);
      setCommentForId('');
      setCommentText('');
      setCommentMsg('');
    } catch (err) {
      setError(err.message || 'Unable to load diary entries.');
      setDiaries([]);
    } finally {
      setLoading(false);
    }
  }, [user?.role]);
>>>>>>> developer

  useEffect(() => {
    if (user?.username) {
      loadDiaries();
    }
<<<<<<< HEAD
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.username]);

  async function loadDiaries() {
    setDiaryLoading(true);
    setDiaryError('');
    try {
      const data = await fetchStudentDiaries(user.username);
      const list = Array.isArray(data) ? data : [];
      if (list.length === 0) {
        setDiaries(buildMockDiaries(user.username));
      } else {
        setDiaries(list);
      }
    } catch (err) {
      setDiaryError(err.message || 'Unable to load diary entries.');
      setDiaries(buildMockDiaries(user.username));
    } finally {
      setDiaryLoading(false);
    }
  }

  const accountNumber = useMemo(() => {
    if (!user?.username) return 'IMS-0000';
    return `IMS-${user.username.replace(/[^a-zA-Z0-9]/g, '').toUpperCase().padEnd(4, '0').slice(0, 4)}`;
  }, [user?.username]);

  return (
    <DashboardLayout title="Day Diaries" subtitle="Daily logbook entries for your internship">
      <div className="card-panel">
        <div className="day-diaries-header">
          <div>
            <h2>Day Diaries</h2>
            <p>Daily log of your internship activities.</p>
          </div>
          <span className="files-count">{diaries.length} entries</span>
        </div>
        {diaryLoading && <div className="status-message">Loading entries...</div>}
        {diaryError && <div className="alert alert-error">{diaryError}</div>}
        {!diaryLoading && (
          <div className="table-wrapper">
            <table className="table table-grid">
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Account Number</th>
                  <th>Activities</th>
                  <th>Action</th>
                  <th>Skills Gained</th>
                  <th>Technology / Tools Used</th>
                  <th>View</th>
                </tr>
              </thead>
              <tbody>
                {diaries.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="status-message">No diary entries yet.</td>
                  </tr>
                ) : (
                  diaries.map((entry) => (
                    <tr key={entry.id}>
                      <td>{entry.date || '—'}</td>
                      <td>{entry.accountNumber || accountNumber}</td>
                      <td className="day-diary-cell-truncate">{entry.dailyActivities || '—'}</td>
                      <td>{entry.action || '—'}</td>
                      <td>{entry.knowledgeAndSkillsGained || '—'}</td>
                      <td>{entry.technologyTools || '—'}</td>
                      <td>
                        <button
                          type="button"
                          className="icon-button view"
                          onClick={() => setViewDiary(entry)}
                        >
                          <i className="fa-regular fa-eye"></i> View
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <div className="card-panel day-diary-supervisor-card">
        <h2>Supervisor Comments</h2>
        <p>Feedback from the industrial and institute supervisors on your logbook entries.</p>

        <div className="supervisor-grid">
          <div className="supervisor-panel supervisor-industrial">
            <div className="supervisor-panel-header">
              <i className="fa-solid fa-industry"></i>
              <h3>Industrial Supervisor Comment</h3>
            </div>
            <ul className="supervisor-list">
              {diaries.filter((d) => d.industrialSupervisorComment).slice(0, 5).map((d) => (
                <li key={d.id}>
                  <span className="supervisor-date">{d.date}</span>
                  <p>{d.industrialSupervisorComment}</p>
                </li>
              ))}
              {diaries.every((d) => !d.industrialSupervisorComment) && (
                <li className="supervisor-empty">No industrial supervisor comments yet.</li>
              )}
            </ul>
          </div>

          <div className="supervisor-panel supervisor-institute">
            <div className="supervisor-panel-header">
              <i className="fa-solid fa-university"></i>
              <h3>Institute Supervisor Comment</h3>
            </div>
            <ul className="supervisor-list">
              {diaries.filter((d) => d.universitySupervisorComment).slice(0, 5).map((d) => (
                <li key={d.id}>
                  <span className="supervisor-date">{d.date}</span>
                  <p>{d.universitySupervisorComment}</p>
                </li>
              ))}
              {diaries.every((d) => !d.universitySupervisorComment) && (
                <li className="supervisor-empty">No institute supervisor comments yet.</li>
              )}
            </ul>
          </div>
        </div>

        <div className="supervisor-comment-form">
          <h3>Add a Comment</h3>
          {commentMessage && <div className="alert alert-success">{commentMessage}</div>}
          {diaries.length === 0 ? (
            <p>No diary entries available to comment on.</p>
          ) : (
            <form
              className="modal-form"
              onSubmit={async (e) => {
                e.preventDefault();
                if (!commentForId || !commentText.trim()) {
                  setCommentMessage('');
                  return;
                }
                setCommentSubmitting(true);
                try {
                  await submitDiaryFeedback(commentForId, {
                    feedback: commentText,
                    status: 'REVIEWED',
                  });
                  setCommentMessage('Comment submitted successfully.');
                  setCommentText('');
                  await loadDiaries();
                } catch (err) {
                  setCommentMessage(err.message || 'Unable to submit comment.');
                } finally {
                  setCommentSubmitting(false);
                }
              }}
            >
              <div className="form-row">
                <label className="form-label">Diary Entry</label>
                <select
                  className="form-input"
                  value={commentForId}
                  onChange={(e) => setCommentForId(e.target.value)}
=======
  }, [loadDiaries, user?.username]);

  async function handleCommentSubmit(event) {
    event.preventDefault();
    if (!selectedDiary || !commentText.trim() || !canComment) return;

    setSubmitting(true);
    setCommentMsg('');
    try {
      await submitDiaryFeedback(selectedDiary.id, {
        feedback: commentText,
        status: selectedDiary.status || 'PENDING',
      });
      setCommentMsg('Comment submitted successfully.');
      setCommentText('');
      await loadDiaries();
    } catch (err) {
      setCommentMsg(err.message || 'Unable to submit comment.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <DashboardLayout title="Day Diaries" subtitle={`Welcome, ${user?.username || ''}`}>
      <div className="space-y-6">
        <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xs overflow-hidden">
          <div className="p-6 border-b border-slate-200 dark:border-slate-800">
            <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100">Day Diaries</h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">View and review submitted diary entries.</p>
          </div>

          {loading && (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-5 h-5 text-teal-600 animate-spin" />
              <span className="ml-2 text-sm text-slate-500">Loading entries...</span>
            </div>
          )}

          {error && (
            <div className="p-6">
              <div role="alert" className="p-3.5 bg-rose-50 border border-rose-200 rounded-xl text-rose-900 text-sm">{error}</div>
            </div>
          )}

          {!loading && (
            <div className="overflow-x-auto">
              <table className="w-full border-collapse border border-slate-200 dark:border-slate-800 min-w-[900px]">
                <thead>
                  <tr className="bg-slate-50 dark:bg-slate-800/50">
                    <th scope="col" className={headerCellClass}>Activities</th>
                    <th scope="col" className={headerCellClass}>Account Number</th>
                    <th scope="col" className={headerCellClass}>Action</th>
                    <th scope="col" className={headerCellClass}>Skills Gained</th>
                    <th scope="col" className={headerCellClass}>Remark</th>
                    <th scope="col" className={headerCellClass}>Tools/Technology Used</th>
                    <th scope="col" className={`${headerCellClass} text-center`}>View</th>
                  </tr>
                </thead>
                <tbody>
                  {diaries.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="px-6 py-10 text-center text-sm text-slate-500 dark:text-slate-400 border-b border-slate-200 dark:border-slate-800 border border-l border-slate-200 dark:border-slate-800">
                        No diary entries yet.
                      </td>
                    </tr>
                  ) : (
                    diaries.map((entry) => (
                      <tr key={entry.id} className="border-b border-slate-200 dark:border-slate-800 last:border-b-0 hover:bg-slate-50 dark:hover:bg-slate-800/30 transition-colors">
                        <td className={bodyCellClass}>{entry.dailyActivities || '—'}</td>
                        <td className={bodyCellClass}>{entry.accountNumber || '—'}</td>
                        <td className={bodyCellClass}>{entry.action || '—'}</td>
                        <td className={bodyCellClass}>{entry.knowledgeAndSkillsGained || '—'}</td>
                        <td className={bodyCellClass}>{entry.supervisorFeedback || '—'}</td>
                        <td className={bodyCellClass}>{entry.technologyTools || '—'}</td>
                        <td className={`${bodyCellClass} text-center`}>
                          <button
                            type="button"
                            onClick={() => setViewDiary(entry)}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-teal-600 hover:bg-teal-700 text-white text-xs font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-600"
                          >
                            <Eye className="w-3.5 h-3.5" />
                            View
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>

        <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xs p-6">
          <div className="flex items-start justify-between gap-4 mb-1">
            <div>
              <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100">Supervisor Comments</h2>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">Select a diary entry and leave feedback for the student.</p>
            </div>
            {!canComment && diaries.length > 0 && (
              <span className="inline-flex shrink-0 items-center rounded-full bg-amber-50 border border-amber-200 px-3 py-1 text-[11px] font-bold text-amber-800">
                Read-only access
              </span>
            )}
          </div>

          {commentMsg && (
            <div role="status" className="mb-4 p-3.5 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-900 text-sm">{commentMsg}</div>
          )}

          {diaries.length === 0 ? (
            <p className="text-sm text-slate-500 mt-4">No diary entries available to comment on.</p>
          ) : (
            <form onSubmit={handleCommentSubmit} className="space-y-4 mt-5">
              <div>
                <label htmlFor="diary-entry" className="block text-xs font-bold uppercase tracking-wider text-slate-800 dark:text-slate-200 mb-1.5">Diary Entry</label>
                <select
                  id="diary-entry"
                  value={commentForId}
                  onChange={(event) => {
                    setCommentForId(event.target.value);
                    setCommentMsg('');
                  }}
                  disabled={!canComment}
                  className="w-full bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 text-xs rounded-xl border border-slate-300 dark:border-slate-700 px-3.5 py-2.5 focus:border-teal-600 focus:ring-2 focus:ring-teal-600/20 focus:outline-none transition-all shadow-xs font-medium disabled:opacity-60 disabled:cursor-not-allowed"
>>>>>>> developer
                >
                  <option value="">Select an entry...</option>
                  {diaries.map((entry) => (
                    <option key={entry.id} value={entry.id}>
<<<<<<< HEAD
                      {entry.date || 'No date'} — {entry.accountNumber || accountNumber}
=======
                      {entry.date || 'No date'} — {entry.accountNumber || 'No account'}
>>>>>>> developer
                    </option>
                  ))}
                </select>
              </div>
<<<<<<< HEAD
              <div className="form-row">
                <label className="form-label">Comment</label>
                <textarea
                  className="form-input"
                  rows="4"
                  value={commentText}
                  onChange={(e) => setCommentText(e.target.value)}
                  placeholder="Write a comment for this diary entry..."
                />
              </div>
              <div className="modal-actions">
                <button type="submit" className="primary-button" disabled={commentSubmitting}>
                  {commentSubmitting ? 'Submitting...' : 'Submit Comment'}
=======
              <div>
                <label htmlFor="supervisor-comment" className="block text-xs font-bold uppercase tracking-wider text-slate-800 dark:text-slate-200 mb-1.5">Comment</label>
                <textarea
                  id="supervisor-comment"
                  rows="4"
                  value={commentText}
                  onChange={(event) => {
                    setCommentText(event.target.value);
                    setCommentMsg('');
                  }}
                  placeholder="Write a comment for this diary entry..."
                  disabled={!canComment}
                  className="w-full bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 text-xs rounded-xl border border-slate-300 dark:border-slate-700 px-3.5 py-2.5 focus:border-teal-600 focus:ring-2 focus:ring-teal-600/20 focus:outline-none transition-all shadow-xs font-medium min-h-[80px] resize-y disabled:opacity-60 disabled:cursor-not-allowed"
                />
              </div>
              {!canComment && (
                <p className="text-xs text-slate-500 dark:text-slate-400">Students can view supervisor feedback. Sign in as a supervisor or administrator to submit a comment.</p>
              )}
              <div className="flex justify-end">
                <button
                  type="submit"
                  disabled={submitting || !canComment || !selectedDiary || !commentText.trim()}
                  className="px-4 py-2 rounded-xl bg-teal-700 hover:bg-teal-800 disabled:opacity-50 disabled:cursor-not-allowed text-white text-xs font-bold transition-colors"
                >
                  {submitting ? 'Submitting...' : 'Submit Comment'}
>>>>>>> developer
                </button>
              </div>
            </form>
          )}
        </div>
      </div>

      {viewDiary && (
<<<<<<< HEAD
        <div className="modal-overlay" onClick={() => setViewDiary(null)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Diary Entry Details</h2>
              <button className="close-button" onClick={() => setViewDiary(null)}>×</button>
            </div>
            <div className="modal-body">
              <div className="diary-details detail-grid">
                <div className="detail-item">
                  <span className="detail-label">Date</span>
                  <span className="detail-value">{viewDiary.date || '—'}</span>
                </div>
                <div className="detail-item">
                  <span className="detail-label">Account Number</span>
                  <span className="detail-value">{viewDiary.accountNumber || accountNumber}</span>
                </div>
                <div className="detail-item full">
                  <span className="detail-label">Activities</span>
                  <span className="detail-value">{viewDiary.dailyActivities || '—'}</span>
                </div>
                <div className="detail-item full">
                  <span className="detail-label">Action</span>
                  <span className="detail-value">{viewDiary.action || '—'}</span>
                </div>
                <div className="detail-item full">
                  <span className="detail-label">Skills Gained</span>
                  <span className="detail-value">{viewDiary.knowledgeAndSkillsGained || '—'}</span>
                </div>
                <div className="detail-item full">
                  <span className="detail-label">Technology / Tools Used</span>
                  <span className="detail-value">{viewDiary.technologyTools || '—'}</span>
                </div>
                <div className="detail-item full">
                  <span className="detail-label">Remark</span>
                  <span className="detail-value">{viewDiary.supervisorFeedback || '—'}</span>
                </div>
                <div className="detail-item full">
                  <span className="detail-label">Accomplishments</span>
                  <span className="detail-value">{viewDiary.accomplishments || '—'}</span>
                </div>
                <div className="detail-item full">
                  <span className="detail-label">Industrial Supervisor Comment</span>
                  <span className="detail-value">{viewDiary.industrialSupervisorComment || 'No comment yet.'}</span>
                </div>
                <div className="detail-item full">
                  <span className="detail-label">University / Institute Supervisor Comment</span>
                  <span className="detail-value">{viewDiary.universitySupervisorComment || 'No comment yet.'}</span>
                </div>
              </div>
            </div>
            <div className="modal-footer">
              <button type="button" className="secondary-button" onClick={() => setViewDiary(null)}>
=======
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={() => setViewDiary(null)}>
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="diary-details-title"
            className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl w-full max-w-3xl max-h-[90vh] overflow-y-auto"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="flex items-center justify-between p-6 border-b border-slate-200 dark:border-slate-800">
              <div>
                <h2 id="diary-details-title" className="text-lg font-bold text-slate-900 dark:text-slate-100">Diary Entry Details</h2>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">Complete information for this diary entry.</p>
              </div>
              <button type="button" onClick={() => setViewDiary(null)} aria-label="Close diary details" className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-6 space-y-5">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <DetailBlock label="Date" value={viewDiary.date} />
                <DetailBlock label="Account Number" value={viewDiary.accountNumber} />
                <DetailBlock label="Status" value={viewDiary.status || 'PENDING'} />
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <DetailBlock label="Student" value={viewDiary.studentName || viewDiary.studentNumber} />
                <DetailBlock label="Student Number" value={viewDiary.studentNumber} />
              </div>
              <div className="grid grid-cols-1 gap-4">
                <DetailBlock label="Activities" value={viewDiary.dailyActivities} full />
                <DetailBlock label="Action" value={viewDiary.action} full />
                <DetailBlock label="Skills Gained" value={viewDiary.knowledgeAndSkillsGained} full />
                <DetailBlock label="Tools/Technology Used" value={viewDiary.technologyTools} full />
                <DetailBlock label="Accomplishments" value={viewDiary.accomplishments} full />
                <DetailBlock label="Remark" value={viewDiary.supervisorFeedback} full />
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4 border-t border-slate-200 dark:border-slate-800">
                <DetailBlock label="Industrial Supervisor Comment" value={viewDiary.industrialSupervisorComment} />
                <DetailBlock label="University Supervisor Comment" value={viewDiary.universitySupervisorComment} />
              </div>
            </div>
            <div className="p-6 border-t border-slate-200 dark:border-slate-800 flex justify-end">
              <button type="button" onClick={() => setViewDiary(null)} className="px-4 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 text-xs font-semibold transition-colors">
>>>>>>> developer
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </DashboardLayout>
  );
<<<<<<< HEAD
}
=======
}
>>>>>>> developer
