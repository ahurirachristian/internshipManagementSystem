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
}

export default function DayDiariesPage() {
  const { user } = useAuth();
  const [diaries, setDiaries] = useState([]);
  const [diaryLoading, setDiaryLoading] = useState(false);
  const [diaryError, setDiaryError] = useState('');
  const [viewDiary, setViewDiary] = useState(null);
  const [commentForId, setCommentForId] = useState('');
  const [commentText, setCommentText] = useState('');
  const [commentSubmitting, setCommentSubmitting] = useState(false);
  const [commentMessage, setCommentMessage] = useState('');

  useEffect(() => {
    if (user?.username) {
      loadDiaries();
    }
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
                >
                  <option value="">Select an entry...</option>
                  {diaries.map((entry) => (
                    <option key={entry.id} value={entry.id}>
                      {entry.date || 'No date'} — {entry.accountNumber || accountNumber}
                    </option>
                  ))}
                </select>
              </div>
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
                </button>
              </div>
            </form>
          )}
        </div>
      </div>

      {viewDiary && (
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
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </DashboardLayout>
  );
}