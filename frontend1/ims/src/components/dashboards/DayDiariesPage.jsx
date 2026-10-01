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
}

export default function DayDiariesPage() {
  const { user } = useAuth();
  const [diaries, setDiaries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [viewDiary, setViewDiary] = useState(null);
  const [commentForId, setCommentForId] = useState('');
  const [commentText, setCommentText] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [commentMsg, setCommentMsg] = useState('');

  // PC7: the day-diaries page is a STUDENT surface; feedback stays a supervisor
  // capability but the persona check keeps its own boundary per role.
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

  useEffect(() => {
    if (user?.username) {
      loadDiaries();
    }
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
                >
                  <option value="">Select an entry...</option>
                  {diaries.map((entry) => (
                    <option key={entry.id} value={entry.id}>
                      {entry.date || 'No date'} — {entry.accountNumber || 'No account'}
                    </option>
                  ))}
                </select>
              </div>
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
                </button>
              </div>
            </form>
          )}
        </div>
      </div>

      {viewDiary && (
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
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </DashboardLayout>
  );
}
