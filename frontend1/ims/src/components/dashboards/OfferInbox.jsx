/**
 * S6.1 (opportunity plan §8.7): the university supervisor's offer inbox.
 *
 * Reads `GET /api/opportunities/offers` (S5.2 — the server forces
 * `universityId` from the session, so this list is only ever *our* university's
 * offers) and answers each one with `POST /{id}/offers/{offerId}/respond`.
 *
 * The decision is binary, matching the server's vocabulary: ACCEPTED or
 * DECLINED, with an optional note (the server caps it at 500 chars and answers
 * 400 beyond that — the client trims but never substitutes for that check).
 * An offer already answered keeps its outcome on screen instead of vanishing:
 * knowing you already declined something is part of the story, and the server
 * would 409 a second answer anyway.
 */
import { useEffect, useState } from 'react';
import DashboardLayout from '../DashboardLayout';
import { AlertCircle, FileText, X } from 'lucide-react';
import { CONTROL_CLASS } from '../ui/formControls';
import { fetchOfferInbox, respondToOffer } from '../../services/api';

const STATUS_STYLES = {
  OFFERED: 'bg-amber-50 text-amber-700 border-amber-200',
  ACCEPTED: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  DECLINED: 'bg-rose-50 text-rose-700 border-rose-200',
  SHARED: 'bg-teal-50 text-teal-700 border-teal-200',
  CLOSED: 'bg-slate-100 text-slate-600 border-slate-200',
};

export default function OfferInbox() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  // One open answer form at a time: { id, advertId, decision } | null.
  const [answering, setAnswering] = useState(null);
  const [note, setNote] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const data = await fetchOfferInbox();
        if (!cancelled) setItems(Array.isArray(data) ? data : []);
      } catch (err) {
        if (!cancelled) setError(err.message || 'Unable to load the offers.');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  function openAnswer(offer, decision) {
    setAnswering({ id: offer.id, advertId: offer.vacancyId, decision });
    setNote('');
    setError('');
    setNotice('');
  }

  function cancelAnswer() {
    setAnswering(null);
    setNote('');
  }

  async function submitAnswer() {
    if (!answering) return;
    setSubmitting(true);
    setError('');
    try {
      const saved = await respondToOffer(
        answering.advertId,
        answering.id,
        answering.decision,
        note.trim() || undefined,
      );
      setItems((prev) =>
        prev.map((offer) =>
          offer.id === answering.id
            ? { ...offer, status: saved?.status || answering.decision }
            : offer,
        ),
      );
      setNotice(
        `Offer ${answering.id} is now ${saved?.status || answering.decision}.`,
      );
      setAnswering(null);
      setNote('');
    } catch (err) {
      // Verbatim: a 404 (someone beat us to it) or 409 (already answered)
      // must read exactly as the server put it.
      setError(err.message || 'The answer could not be recorded.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <DashboardLayout
      title="Offer inbox"
      subtitle="Accept or decline the opportunities offered to your university"
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
            <span>Loading offers...</span>
          </div>
        )}

        {!loading && items.length === 0 && !error && (
          <section className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-10 shadow-xs">
            <div className="max-w-sm mx-auto flex flex-col items-center text-center">
              <div className="w-12 h-12 rounded-full bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-800 flex items-center justify-center text-slate-400 mb-3">
                <FileText className="w-6 h-6" aria-hidden="true" />
              </div>
              <h2 className="text-base font-bold text-slate-800 dark:text-slate-200">
                No opportunities have been offered to your university yet
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                The super admin offers published adverts here. Accepted offers can then be
                shared with your students.
              </p>
            </div>
          </section>
        )}

        {!loading && items.length > 0 && (
          <ul aria-label="Offers for your university" className="space-y-4">
            {items.map((offer) => {
              const formOpen = answering && answering.id === offer.id;
              const answered = offer.status !== 'OFFERED';
              return (
                <li
                  key={offer.id}
                  className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-5 shadow-xs"
                >
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <h2 className="text-sm font-bold text-slate-900 dark:text-slate-100">
                          {offer.title || `Opportunity #${offer.vacancyId}`}
                        </h2>
                        <span
                          className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold border ${
                            STATUS_STYLES[offer.status] || STATUS_STYLES.OFFERED
                          }`}
                        >
                          {offer.status || 'OFFERED'}
                        </span>
                      </div>
                      <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                        Offered {offer.offeredAt ? `on ${offer.offeredAt.slice(0, 10)}` : ''}
                        {offer.note ? ` · ${offer.note}` : ''}
                        {offer.responseNote ? ` · Your note: ${offer.responseNote}` : ''}
                      </p>
                    </div>

                    {!formOpen && !answered && (
                      <div className="flex items-center gap-2 shrink-0">
                        <button
                          type="button"
                          onClick={() => openAnswer(offer, 'ACCEPTED')}
                          aria-label={`Accept offer ${offer.id}`}
                          className="px-3.5 py-2 rounded-xl text-xs font-bold bg-emerald-600 text-white hover:bg-emerald-700 transition-colors"
                        >
                          Accept
                        </button>
                        <button
                          type="button"
                          onClick={() => openAnswer(offer, 'DECLINED')}
                          aria-label={`Decline offer ${offer.id}`}
                          className="px-3.5 py-2 rounded-xl text-xs font-bold bg-rose-600 text-white hover:bg-rose-700 transition-colors"
                        >
                          Decline
                        </button>
                      </div>
                    )}
                  </div>

                  {formOpen && (
                    <div className="mt-4 pt-4 border-t border-slate-200 dark:border-slate-800 space-y-3">
                      <label
                        htmlFor={`answer-note-${offer.id}`}
                        className="block text-xs font-bold uppercase tracking-wider text-slate-800 dark:text-slate-200"
                      >
                        Note
                        <span className="normal-case font-medium text-slate-500 dark:text-slate-400 ml-2">
                          Optional — why you are {answering.decision === 'ACCEPTED' ? 'accepting' : 'declining'}
                        </span>
                      </label>
                      <textarea
                        id={`answer-note-${offer.id}`}
                        rows={3}
                        value={note}
                        onChange={(e) => setNote(e.target.value)}
                        maxLength={500}
                        className={CONTROL_CLASS}
                        placeholder="We will share it with our ICT cohort..."
                      />
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={submitAnswer}
                          disabled={submitting}
                          className={`px-3.5 py-2 rounded-xl text-xs font-bold text-white disabled:opacity-50 disabled:cursor-not-allowed transition-colors ${
                            answering.decision === 'ACCEPTED'
                              ? 'bg-teal-700 hover:bg-teal-800'
                              : 'bg-rose-700 hover:bg-rose-800'
                          }`}
                        >
                          Record {answering.decision === 'ACCEPTED' ? 'acceptance' : 'decline'}
                        </button>
                        <button
                          type="button"
                          onClick={cancelAnswer}
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
