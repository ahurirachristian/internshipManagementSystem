import { useState } from 'react';
import { submitDiaryFeedback } from '../services/api';

const STATUS_OPTIONS = ['PENDING', 'APPROVED', 'NEEDS_REVISION', 'REJECTED'];

export default function DiaryReviewModal({ diary, onClose, onSaved }) {
  const [feedback, setFeedback] = useState(diary.feedback || '');
  const [status, setStatus] = useState(diary.status || 'PENDING');
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
      await submitDiaryFeedback(diary.id, { feedback, status });
      onSaved();
      onClose();
    } catch (err) {
      setError(err.message || 'Unable to save feedback.');
    } finally {
      setBusy(false);
    }
  }

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
        </form>
      </div>
    </div>
  );
}
