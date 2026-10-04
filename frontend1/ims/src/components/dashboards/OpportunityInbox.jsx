/**
 * S4.3 (opportunity plan §8.5): the super-admin moderation inbox.
 *
 * Reads `GET /api/opportunities/inbox` (S4.1 — the server has already decided
 * this audience is the super admin) and drives `POST /{id}/transition`
 * (S4.2) for the two verdicts. The note is not optional anywhere: the form
 * will not submit a blank one, and if the server refuses anyway its message
 * is shown verbatim — the client validates for convenience, never instead of
 * the server.
 *
 * The "then offer to universities" half of the plan's S4.3 row deliberately
 * lives at S5.1: the offers endpoint does not exist until then, and a button
 * that 404s would be a broken window between two working commits.
 */
import { useEffect, useState } from 'react';
import DashboardLayout from '../DashboardLayout';
import { AlertCircle, FileText, X } from 'lucide-react';
import { CONTROL_CLASS } from '../ui/formControls';
import { fetchOpportunityInbox, transitionOpportunity } from '../../services/api';

const ORIGIN_LABELS = {
  COMPANY: 'Company',
  SUPERVISOR: 'Supervisor',
  UNIVERSITY: 'University',
  SUPER_ADMIN: 'Super admin',
};

export default function OpportunityInbox() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  // One open verdict form at a time: { id, target } | null.
  const [deciding, setDeciding] = useState(null);
  const [note, setNote] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const data = await fetchOpportunityInbox();
        if (!cancelled) setItems(Array.isArray(data) ? data : []);
      } catch (err) {
        if (!cancelled) setError(err.message || 'Unable to load the inbox.');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  function openDecision(id, target) {
    setDeciding({ id, target });
    setNote('');
    setError('');
    setNotice('');
  }

  function cancelDecision() {
    setDeciding(null);
    setNote('');
  }

  async function submitDecision() {
    if (!deciding || !note.trim()) return;
    setSubmitting(true);
    setError('');
    try {
      const saved = await transitionOpportunity(deciding.id, deciding.target, note.trim());
      const decided = items.find((item) => item.id === deciding.id);
      setItems((prev) => prev.filter((item) => item.id !== deciding.id));
      setNotice(
        `“${decided?.title ?? 'Opportunity'}” is now ${saved?.status || deciding.target}.`,
      );
      setDeciding(null);
      setNote('');
    } catch (err) {
      // Verbatim: the server's reason is the authority on why it refused.
      setError(err.message || 'The verdict could not be recorded.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <DashboardLayout
      title="Opportunity inbox"
      subtitle="Verify or reject the opportunities waiting for a verdict"
      searchable={false}
    >
      <div className="space-y-6 max-w-7xl mx-auto">
        {error && (
          <div
            role="alert"
            className="p-3.5 bg-rose-50 border border-rose-200 rounded-xl flex items-center justify-between gap-3 text-rose-900 text-sm"
          >
            <div className="flex items-center gap-2.5">
              <AlertCircle className="w-5 h-5 text-rose-600 shrink-0" aria-hidden="true" />
              <span className="font-medium">{error}</span>
            </div>
            <button
              type="button"
              onClick={() => setError('')}
              className="text-rose-600 hover:text-rose-900 p-1 rounded"
              aria-label="Dismiss error"
            >
              <X className="w-4 h-4" aria-hidden="true" />
            </button>
          </div>
        )}

        {notice && (
          <div
            role="status"
            className="p-3.5 bg-emerald-50 border border-emerald-200 rounded-xl flex items-center justify-between gap-3 text-emerald-900 text-sm"
          >
            <span className="font-medium">{notice}</span>
            <button
              type="button"
              onClick={() => setNotice('')}
              className="text-emerald-600 hover:text-emerald-900 p-1 rounded"
              aria-label="Dismiss notice"
            >
              <X className="w-4 h-4" aria-hidden="true" />
            </button>
          </div>
        )}

        {loading && (
          <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400 font-medium">
            <div className="w-4 h-4 border-2 border-teal-600 border-t-transparent rounded-full animate-spin" />
            <span>Loading the inbox...</span>
          </div>
        )}

        {!loading && items.length === 0 && !error && (
          <section className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-10 shadow-xs">
            <div className="max-w-sm mx-auto flex flex-col items-center text-center">
              <div className="w-12 h-12 rounded-full bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-800 flex items-center justify-center text-slate-400 mb-3">
                <FileText className="w-6 h-6" aria-hidden="true" />
              </div>
              <h2 className="text-base font-bold text-slate-800 dark:text-slate-200">
                No opportunities are waiting for review
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                Every submission has had a verdict. New company submissions appear here first.
              </p>
            </div>
          </section>
        )}

        {!loading && items.length > 0 && (
          <ul aria-label="Opportunities awaiting review" className="space-y-4">
            {items.map((item) => {
              const formOpen = deciding && deciding.id === item.id;
              return (
                <li
                  key={item.id}
                  className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-5 shadow-xs"
                >
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <h2 className="text-sm font-bold text-slate-900 dark:text-slate-100">
                          {item.title}
                        </h2>
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 text-amber-700 border border-amber-200">
                          {ORIGIN_LABELS[item.origin] || item.origin || 'Unknown origin'}
                        </span>
                      </div>
                      <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                        {item.externalOrgName ||
                          (item.companyId != null ? `Company #${item.companyId}` : 'No company record')}
                        {item.deadline ? ` · Apply by ${item.deadline}` : ''}
                      </p>
                    </div>

                    {!formOpen && (
                      <div className="flex items-center gap-2 shrink-0">
                        <button
                          type="button"
                          onClick={() => openDecision(item.id, 'PUBLISHED')}
                          aria-label={`Verify ${item.title}`}
                          className="px-3.5 py-2 rounded-xl text-xs font-bold bg-emerald-600 text-white hover:bg-emerald-700 transition-colors"
                        >
                          Verify
                        </button>
                        <button
                          type="button"
                          onClick={() => openDecision(item.id, 'REJECTED')}
                          aria-label={`Reject ${item.title}`}
                          className="px-3.5 py-2 rounded-xl text-xs font-bold bg-rose-600 text-white hover:bg-rose-700 transition-colors"
                        >
                          Reject
                        </button>
                      </div>
                    )}
                  </div>

                  {formOpen && (
                    <div className="mt-4 pt-4 border-t border-slate-200 dark:border-slate-800 space-y-3">
                      <label
                        htmlFor={`verdict-note-${item.id}`}
                        className="block text-xs font-bold uppercase tracking-wider text-slate-800 dark:text-slate-200"
                      >
                        Verification note
                        <span className="normal-case font-medium text-slate-500 dark:text-slate-400 ml-2">
                          Required — record why {deciding.target === 'PUBLISHED' ? 'it was approved' : 'it was rejected'}
                        </span>
                      </label>
                      <textarea
                        id={`verdict-note-${item.id}`}
                        rows={3}
                        value={note}
                        onChange={(e) => setNote(e.target.value)}
                        className={CONTROL_CLASS}
                        placeholder="Evidence checked, source reference confirmed..."
                      />
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={submitDecision}
                          disabled={!note.trim() || submitting}
                          className="px-3.5 py-2 rounded-xl text-xs font-bold bg-teal-700 text-white hover:bg-teal-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                        >
                          Record decision
                        </button>
                        <button
                          type="button"
                          onClick={cancelDecision}
                          disabled={submitting}
                          className="px-3.5 py-2 rounded-xl text-xs font-bold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </DashboardLayout>
  );
}
