import { useEffect, useState } from 'react';
import { BookOpen, X } from 'lucide-react';
import { submitDiaryFeedback } from '../services/api';
import CustomSelect from './CustomSelect';

const STATUS_OPTIONS = ['PENDING', 'APPROVED', 'NEEDS_REVISION', 'REJECTED'];

export default function DiaryReviewModal({ diary, onClose, onSaved }) {
  const [feedback, setFeedback] = useState(diary.feedback || '');
  const [status, setStatus] = useState(diary.status || 'PENDING');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const studentName = diary.studentName || diary.studentNumber || '—';

  useEffect(() => {
    function handleKeyDown(e) {
      if (e.key === 'Escape') onClose();
    }
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

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

  const detailItems = [
    { label: 'Date', value: diary.date, full: false },
    { label: 'Student', value: studentName, full: false },
    { label: 'Daily Activities', value: diary.dailyActivities, full: true },
    { label: 'Knowledge & Skills Gained', value: diary.knowledgeAndSkillsGained, full: true },
    { label: 'Accomplishments', value: diary.accomplishments, full: true },
  ];

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="diary-review-modal-title"
      className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 sm:p-6 animate-in fade-in duration-150"
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="bg-white w-full max-w-3xl rounded-2xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[90vh] animate-in zoom-in-95 duration-150"
      >
        <div className="p-4 sm:p-5 bg-slate-50 border-b border-slate-200 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 rounded-xl bg-teal-50 border border-teal-200 flex items-center justify-center text-teal-800 shrink-0">
              <BookOpen className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <h3 id="diary-review-modal-title" className="text-base font-bold text-slate-900 truncate">Review Diary Entry</h3>
              <p className="text-xs text-slate-500 truncate">Review and provide feedback on this entry</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-200 rounded-lg transition-colors focus-visible:ring-2 focus-visible:ring-teal-600 focus-visible:outline-none"
            aria-label="Close modal"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {error && (
          <div role="alert" className="mx-4 sm:mx-5 mt-4 p-3.5 bg-rose-50 border border-rose-200 rounded-xl flex items-center gap-2.5 text-rose-900 text-sm animate-in fade-in">
            <span className="font-medium">{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="p-6 overflow-y-auto space-y-6 flex-1">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {detailItems.map((item) => (
              <div
                key={item.label}
                className={`bg-slate-50 rounded-xl p-3 border border-slate-200 ${item.full ? 'md:col-span-2' : ''}`}
              >
                <span className="text-[11px] font-bold uppercase tracking-wider text-slate-800">{item.label}</span>
                <p className="text-sm text-slate-700 mt-1">{item.value || '—'}</p>
              </div>
            ))}
          </div>

          <div>
            <label htmlFor="diary-feedback" className="block text-xs font-bold uppercase tracking-wider text-slate-800 mb-1.5">
              Feedback / Remarks
            </label>
            <textarea
              id="diary-feedback"
              rows="4"
              value={feedback}
              onChange={(e) => setFeedback(e.target.value)}
              placeholder="Enter your remarks or feedback here..."
              className="w-full bg-white text-slate-900 text-xs rounded-xl border border-slate-300 px-3.5 py-2.5 focus:border-teal-600 focus:ring-2 focus:ring-teal-600/20 focus:outline-none transition-all shadow-xs font-medium min-h-[80px] resize-y"
            />
          </div>

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-800 mb-1.5">
              Status
            </label>
            <CustomSelect
              id="diary-status"
              value={status}
              onChange={setStatus}
              options={STATUS_OPTIONS}
            />
          </div>
        </form>

        <div className="p-4 sm:p-5 bg-slate-50 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            disabled={busy}
            className="px-3.5 py-2 rounded-xl bg-white hover:bg-slate-100 text-slate-700 text-xs font-semibold border border-slate-300 transition-colors shadow-xs disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Cancel
          </button>
          <button
            type="submit"
            onClick={handleSubmit}
            disabled={busy}
            className="px-4 py-2 rounded-xl bg-primary hover:bg-primary text-white text-xs font-bold transition-all flex items-center gap-1.5 shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {busy ? 'Saving...' : 'Save Feedback'}
          </button>
        </div>
      </div>
    </div>
  );
}
