import { useState } from 'react';
import { submitDiaryFeedback } from '../services/api';

const STATUS_OPTIONS = ['PENDING', 'APPROVED', 'NEEDS_REVISION', 'REJECTED'];

export default function DiaryReviewModal({ diary, onClose, onSaved }) {
  const [feedback, setFeedback] = useState(diary.feedback || '');
  const [status, setStatus] = useState(diary.status || 'PENDING');
<<<<<<< HEAD
  const [industrialComment, setIndustrialComment] = useState(diary.industrialSupervisorComment || '');
  const [universityComment, setUniversityComment] = useState(diary.universitySupervisorComment || '');
=======
  const [industrialSupervisorComment, setIndustrialSupervisorComment] = useState(diary.industrialSupervisorComment || '');
  const [universitySupervisorComment, setUniversitySupervisorComment] = useState(diary.universitySupervisorComment || '');
>>>>>>> developer
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const studentProfile = diary.studentProfile || {};
  const studentName = studentProfile
    ? `${studentProfile.firstName || ''} ${studentProfile.lastName || ''}`.trim() ||
      studentProfile.username ||
      '—'
    : diary.studentName || '—';

  async function handleSubmit(event) {
    event.preventDefault();
    setError('');
    setBusy(true);
    try {
<<<<<<< HEAD
      await submitDiaryFeedback(diary.id, {
        feedback,
        status,
        industrialSupervisorComment: industrialComment,
        universitySupervisorComment: universityComment,
      });
=======
      await submitDiaryFeedback(diary.id, { feedback, status, industrialSupervisorComment, universitySupervisorComment });
>>>>>>> developer
      onSaved();
      onClose();
    } catch (err) {
      setError(err.message || 'Unable to save feedback.');
    } finally {
      setBusy(false);
    }
  }

<<<<<<< HEAD
=======
  const detailItems = [
    { label: 'Date', value: diary.date, full: false },
    { label: 'Student', value: studentName, full: false },
    { label: 'Account Number', value: diary.accountNumber, full: false },
    { label: 'Daily Activities', value: diary.dailyActivities, full: true },
    { label: 'Action', value: diary.action, full: true },
    { label: 'Knowledge & Skills Gained', value: diary.knowledgeAndSkillsGained, full: true },
    { label: 'Technology / Tools Used', value: diary.technologyTools, full: true },
    { label: 'Accomplishments', value: diary.accomplishments, full: true },
  ];

>>>>>>> developer
  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>Review Diary Entry</h2>
          <button className="close-button" onClick={onClose}>
            ×
          </button>
        </div>
        {error && <div className="alert alert-error">{error}</div>}

        <form onSubmit={handleSubmit} className="modal-form">
          <div className="modal-body">
            <div className="diary-details detail-grid">
              <div className="detail-item">
                <span className="detail-label">Date</span>
                <span className="detail-value">{diary.date || '—'}</span>
              </div>
              <div className="detail-item">
                <span className="detail-label">Student</span>
                <span className="detail-value">{studentName}</span>
              </div>
              <div className="detail-item full">
                <span className="detail-label">Daily Activities</span>
                <span className="detail-value">{diary.dailyActivities || '—'}</span>
              </div>
              <div className="detail-item full">
                <span className="detail-label">Knowledge &amp; Skills Gained</span>
                <span className="detail-value">{diary.knowledgeAndSkillsGained || '—'}</span>
              </div>
              <div className="detail-item full">
                <span className="detail-label">Accomplishments</span>
                <span className="detail-value">{diary.accomplishments || '—'}</span>
              </div>
              <div className="detail-item full">
                <span className="detail-label">Account Number</span>
                <span className="detail-value">{diary.accountNumber || '—'}</span>
              </div>
              <div className="detail-item full">
                <span className="detail-label">Action</span>
                <span className="detail-value">{diary.action || '—'}</span>
              </div>
              <div className="detail-item full">
                <span className="detail-label">Technology / Tools Used</span>
                <span className="detail-value">{diary.technologyTools || '—'}</span>
              </div>
            </div>

            <label>
              Feedback / Remarks
              <textarea
                rows="4"
                value={feedback}
                onChange={(e) => setFeedback(e.target.value)}
                placeholder="Enter your remarks or feedback here..."
              />
            </label>
            <label>
              Industrial Supervisor Comment
              <textarea
                rows="3"
                value={industrialComment}
                onChange={(e) => setIndustrialComment(e.target.value)}
                placeholder="Enter industrial supervisor comment..."
              />
            </label>
            <label>
              University Supervisor Comment
              <textarea
                rows="3"
                value={universityComment}
                onChange={(e) => setUniversityComment(e.target.value)}
                placeholder="Enter university supervisor comment..."
              />
            </label>
            <label>
              Status
              <select value={status} onChange={(e) => setStatus(e.target.value)}>
                {STATUS_OPTIONS.map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </select>
            </label>
          </div>

          <div className="modal-footer">
            <button type="button" className="secondary-button" onClick={onClose} disabled={busy}>
              Cancel
            </button>
            <button type="submit" className="primary-button" disabled={busy}>
              {busy ? 'Saving...' : 'Save Feedback'}
            </button>
          </div>

          <div>
            <label htmlFor="industrial-supervisor-comment" className="block text-xs font-bold uppercase tracking-wider text-slate-800 dark:text-slate-200 mb-1.5">
              Industrial Supervisor Comment
            </label>
            <textarea
              id="industrial-supervisor-comment"
              rows="3"
              value={industrialSupervisorComment}
              onChange={(e) => setIndustrialSupervisorComment(e.target.value)}
              placeholder="Enter industrial supervisor comment..."
              className="w-full bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 text-xs rounded-xl border border-slate-300 dark:border-slate-700 px-3.5 py-2.5 focus:border-teal-600 focus:ring-2 focus:ring-teal-600/20 focus:outline-none transition-all shadow-xs font-medium min-h-[60px] resize-y"
            />
          </div>

          <div>
            <label htmlFor="university-supervisor-comment" className="block text-xs font-bold uppercase tracking-wider text-slate-800 dark:text-slate-200 mb-1.5">
              University Supervisor Comment
            </label>
            <textarea
              id="university-supervisor-comment"
              rows="3"
              value={universitySupervisorComment}
              onChange={(e) => setUniversitySupervisorComment(e.target.value)}
              placeholder="Enter university supervisor comment..."
              className="w-full bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 text-xs rounded-xl border border-slate-300 dark:border-slate-700 px-3.5 py-2.5 focus:border-teal-600 focus:ring-2 focus:ring-teal-600/20 focus:outline-none transition-all shadow-xs font-medium min-h-[60px] resize-y"
            />
          </div>
        </form>
      </div>
    </div>
  );
}
