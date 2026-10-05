/**
 * S6.1/S6.3 (opportunity plan §8.7): the university supervisor's inbox —
 * offers in, proposals reviewed, opportunities out to the students.
 *
 * Three lists, one page, all session-scoped by the server:
 *
 * - **Offers** (`GET /api/opportunities/offers`, S5.2) answered with
 *   `POST /{id}/offers/{offerId}/respond` — binary ACCEPTED/DECLINED plus an
 *   optional note. An answered offer keeps its outcome on screen instead of
 *   vanishing: knowing you already declined something is part of the story,
 *   and the server would 409 a second answer anyway. An ACCEPTED offer gains
 *   the "Share with students" action — an offer that was never accepted has
 *   no share button at all, because the server would refuse it (409) and the
 *   UI does not offer moves that cannot land.
 *
 * - **Proposals** (`GET /api/opportunities/submissions`, S6.2) reviewed with
 *   `POST /{id}/submissions/{submissionId}/respond` — APPROVED or REJECTED.
 *   The verdict is what unlocks sharing for an R6 proposal (S6.3), so an
 *   approved row gains the same share action.
 *
 * - **Sharing** (`POST /{id}/share`, S6.3) with optional targeting: programme
 *   ids, department ids and years of study, comma-separated. Empty targeting
 *   means the whole university — but only the server decides whether that is
 *   still inside the offered audience [§5.8], so every refusal (400 narrowing,
 *   404 someone else's advert, 409 wrong state) is shown **verbatim** with the
 *   form left open. The client parses and trims; it never substitutes for a
 *   server check.
 */
import { useEffect, useState } from 'react';
import DashboardLayout from '../DashboardLayout';
import { AlertCircle, FileText, X } from 'lucide-react';
import { CONTROL_CLASS } from '../ui/formControls';
import {
  fetchOfferInbox,
  fetchSubmissionQueue,
  respondToOffer,
  respondToSubmission,
  shareOpportunity,
} from '../../services/api';

const STATUS_STYLES = {
  OFFERED: 'bg-amber-50 text-amber-700 border-amber-200',
  PENDING: 'bg-sky-50 text-sky-700 border-sky-200',
  ACCEPTED: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  APPROVED: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  DECLINED: 'bg-rose-50 text-rose-700 border-rose-200',
  REJECTED: 'bg-rose-50 text-rose-700 border-rose-200',
  SHARED: 'bg-teal-50 text-teal-700 border-teal-200',
  CLOSED: 'bg-slate-100 text-slate-600 border-slate-200',
};

/** "1, 2 ,3" → ['1', '2', '3']; blank → undefined (whole university). */
function parseIds(raw) {
  const trimmed = (raw || '').trim();
  if (!trimmed) return undefined;
  return trimmed
    .split(',')
    .map((part) => part.trim())
    .filter(Boolean);
}

function buildTarget(programmeIds, departmentIds, yearsOfStudy) {
  const target = {};
  const programmes = parseIds(programmeIds);
  const departments = parseIds(departmentIds);
  const years = parseIds(yearsOfStudy);
  if (programmes) target.programmeIds = programmes;
  if (departments) target.departmentIds = departments;
  if (years) target.yearsOfStudy = years;
  return Object.keys(target).length > 0 ? target : undefined;
}

export default function OfferInbox() {
  const [items, setItems] = useState([]);
  const [submissions, setSubmissions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  // One open answer form at a time: { id, advertId, decision } | null.
  const [answering, setAnswering] = useState(null);
  // One open review form at a time: { id, advertId, decision } | null.
  const [reviewing, setReviewing] = useState(null);
  // One open share form at a time: { kind: 'offer'|'submission', id, advertId } | null.
  const [sharing, setSharing] = useState(null);
  const [note, setNote] = useState('');
  const [shareNote, setShareNote] = useState('');
  const [programmeIds, setProgrammeIds] = useState('');
  const [departmentIds, setDepartmentIds] = useState('');
  const [yearsOfStudy, setYearsOfStudy] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const [offersData, submissionsData] = await Promise.all([
          fetchOfferInbox(),
          fetchSubmissionQueue(),
        ]);
        if (!cancelled) {
          setItems(Array.isArray(offersData) ? offersData : []);
          setSubmissions(Array.isArray(submissionsData) ? submissionsData : []);
        }
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

  function openAnswer(offer, decision) {
    setReviewing(null);
    setSharing(null);
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

  function openReview(submission, decision) {
    setAnswering(null);
    setSharing(null);
    setReviewing({ id: submission.id, advertId: submission.vacancyId, decision });
    setNote('');
    setError('');
    setNotice('');
  }

  function cancelReview() {
    setReviewing(null);
    setNote('');
  }

  async function submitReview() {
    if (!reviewing) return;
    setSubmitting(true);
    setError('');
    try {
      const saved = await respondToSubmission(
        reviewing.advertId,
        reviewing.id,
        reviewing.decision,
        note.trim() || undefined,
      );
      setSubmissions((prev) =>
        prev.map((row) =>
          row.id === reviewing.id
            ? { ...row, status: saved?.status || reviewing.decision }
            : row,
        ),
      );
      setNotice(
        `Submission ${reviewing.id} is now ${saved?.status || reviewing.decision}.`,
      );
      setReviewing(null);
      setNote('');
    } catch (err) {
      setError(err.message || 'The verdict could not be recorded.');
    } finally {
      setSubmitting(false);
    }
  }

  function openShare(kind, id, advertId) {
    setAnswering(null);
    setReviewing(null);
    setSharing({ kind, id, advertId });
    setShareNote('');
    setProgrammeIds('');
    setDepartmentIds('');
    setYearsOfStudy('');
    setError('');
    setNotice('');
  }

  function closeShare() {
    setSharing(null);
  }

  async function submitShare() {
    if (!sharing) return;
    setSubmitting(true);
    setError('');
    try {
      const target = buildTarget(programmeIds, departmentIds, yearsOfStudy);
      await shareOpportunity(
        sharing.advertId,
        target,
        shareNote.trim() || undefined,
      );
      if (sharing.kind === 'offer') {
        // The server moves an accepted offer to SHARED on the way through.
        setItems((prev) =>
          prev.map((offer) =>
            offer.id === sharing.id ? { ...offer, status: 'SHARED' } : offer,
          ),
        );
      } else {
        setSubmissions((prev) =>
          prev.map((row) =>
            row.id === sharing.id ? { ...row, shared: true } : row,
          ),
        );
      }
      setNotice(
        `Opportunity #${sharing.advertId} is now shared with your students.`,
      );
      setSharing(null);
    } catch (err) {
      // Verbatim: a 400 from the narrowing rule [§5.8] or a 404 from another
      // university's advert must read exactly as the server put it.
      setError(err.message || 'The share could not be recorded.');
    } finally {
      setSubmitting(false);
    }
  }

  const shareForm = sharing ? (
    <div className="mt-4 pt-4 border-t border-slate-200 dark:border-slate-800 space-y-3">
      <label
        htmlFor="share-note"
        className="block text-xs font-bold uppercase tracking-wider text-slate-800 dark:text-slate-200"
      >
        Share note
        <span className="normal-case font-medium text-slate-500 dark:text-slate-400 ml-2">
          Optional — context for this share
        </span>
      </label>
      <textarea
        id="share-note"
        rows={2}
        value={shareNote}
        onChange={(e) => setShareNote(e.target.value)}
        maxLength={500}
        className={CONTROL_CLASS}
        placeholder="Shared with our ICT cohort..."
      />
      <div className="grid gap-3 sm:grid-cols-3">
        <div>
          <label
            htmlFor="share-programmes"
            className="block text-xs font-bold uppercase tracking-wider text-slate-800 dark:text-slate-200"
          >
            Programme ids
          </label>
          <input
            id="share-programmes"
            type="text"
            value={programmeIds}
            onChange={(e) => setProgrammeIds(e.target.value)}
            className={CONTROL_CLASS}
            placeholder="e.g. 93201,93202"
          />
        </div>
        <div>
          <label
            htmlFor="share-departments"
            className="block text-xs font-bold uppercase tracking-wider text-slate-800 dark:text-slate-200"
          >
            Department ids
          </label>
          <input
            id="share-departments"
            type="text"
            value={departmentIds}
            onChange={(e) => setDepartmentIds(e.target.value)}
            className={CONTROL_CLASS}
            placeholder="e.g. 93101"
          />
        </div>
        <div>
          <label
            htmlFor="share-years"
            className="block text-xs font-bold uppercase tracking-wider text-slate-800 dark:text-slate-200"
          >
            Years of study
          </label>
          <input
            id="share-years"
            type="text"
            value={yearsOfStudy}
            onChange={(e) => setYearsOfStudy(e.target.value)}
            className={CONTROL_CLASS}
            placeholder="e.g. 3,4"
          />
        </div>
      </div>
      <p className="text-[11px] text-slate-500 dark:text-slate-400">
        Empty targeting shares with the whole university — the server refuses
        anything wider than what the advert itself targets.
      </p>
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={submitShare}
          disabled={submitting}
          className="px-3.5 py-2 rounded-xl text-xs font-bold text-white bg-teal-700 hover:bg-teal-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          Share with students
        </button>
        <button
          type="button"
          onClick={closeShare}
          disabled={submitting}
          className="px-3.5 py-2 rounded-xl text-xs font-bold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
        >
          Cancel
        </button>
      </div>
    </div>
  ) : null;

  return (
    <DashboardLayout
      title="Offer inbox"
      subtitle="Accept offers, review proposals, and share opportunities with your students"
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

        {!loading && items.length === 0 && submissions.length === 0 && !error && (
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
              const shareOpen = sharing && sharing.kind === 'offer' && sharing.id === offer.id;
              const answered = offer.status !== 'OFFERED';
              const canShare = offer.status === 'ACCEPTED';
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

                    {!formOpen && !shareOpen && (
                      <div className="flex items-center gap-2 shrink-0">
                        {!answered && (
                          <>
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
                          </>
                        )}
                        {canShare && (
                          <button
                            type="button"
                            onClick={() => openShare('offer', offer.id, offer.vacancyId)}
                            aria-label={`Share opportunity ${offer.vacancyId} with students`}
                            className="px-3.5 py-2 rounded-xl text-xs font-bold bg-teal-700 text-white hover:bg-teal-800 transition-colors"
                          >
                            Share with students
                          </button>
                        )}
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

                  {shareOpen && shareForm}
                </li>
              );
            })}
          </ul>
        )}

        {!loading && submissions.length > 0 && (
          <section className="space-y-4">
            <h2 className="text-sm font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
              Proposals awaiting your review
            </h2>
            <ul aria-label="Submissions awaiting review" className="space-y-4">
              {submissions.map((row) => {
                const formOpen = reviewing && reviewing.id === row.id;
                const shareOpen =
                  sharing && sharing.kind === 'submission' && sharing.id === row.id;
                const decided = row.status !== 'PENDING';
                const canShare = row.status === 'APPROVED' && !row.shared;
                return (
                  <li
                    key={row.id}
                    className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-5 shadow-xs"
                  >
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">
                            {row.title || `Opportunity #${row.vacancyId}`}
                          </h3>
                          <span
                            className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold border ${
                              STATUS_STYLES[row.status] || STATUS_STYLES.PENDING
                            }`}
                          >
                            {row.status || 'PENDING'}
                          </span>
                          {row.shared && (
                            <span
                              className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold border ${STATUS_STYLES.SHARED}`}
                            >
                              SHARED
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                          Submitted{' '}
                          {row.submittedAt ? `on ${row.submittedAt.slice(0, 10)}` : ''}
                          {row.note ? ` · ${row.note}` : ''}
                          {row.reviewNote ? ` · Review note: ${row.reviewNote}` : ''}
                        </p>
                      </div>

                      {!formOpen && !shareOpen && (
                        <div className="flex items-center gap-2 shrink-0">
                          {!decided && (
                            <>
                              <button
                                type="button"
                                onClick={() => openReview(row, 'APPROVED')}
                                aria-label={`Approve submission ${row.id}`}
                                className="px-3.5 py-2 rounded-xl text-xs font-bold bg-emerald-600 text-white hover:bg-emerald-700 transition-colors"
                              >
                                Approve
                              </button>
                              <button
                                type="button"
                                onClick={() => openReview(row, 'REJECTED')}
                                aria-label={`Reject submission ${row.id}`}
                                className="px-3.5 py-2 rounded-xl text-xs font-bold bg-rose-600 text-white hover:bg-rose-700 transition-colors"
                              >
                                Reject
                              </button>
                            </>
                          )}
                          {canShare && (
                            <button
                              type="button"
                              onClick={() => openShare('submission', row.id, row.vacancyId)}
                              aria-label={`Share opportunity ${row.vacancyId} with students`}
                              className="px-3.5 py-2 rounded-xl text-xs font-bold bg-teal-700 text-white hover:bg-teal-800 transition-colors"
                            >
                              Share with students
                            </button>
                          )}
                        </div>
                      )}
                    </div>

                    {formOpen && (
                      <div className="mt-4 pt-4 border-t border-slate-200 dark:border-slate-800 space-y-3">
                        <label
                          htmlFor={`review-note-${row.id}`}
                          className="block text-xs font-bold uppercase tracking-wider text-slate-800 dark:text-slate-200"
                        >
                          Note
                          <span className="normal-case font-medium text-slate-500 dark:text-slate-400 ml-2">
                            Optional — why you are {reviewing.decision === 'APPROVED' ? 'approving' : 'rejecting'}
                          </span>
                        </label>
                        <textarea
                          id={`review-note-${row.id}`}
                          rows={3}
                          value={note}
                          onChange={(e) => setNote(e.target.value)}
                          maxLength={500}
                          className={CONTROL_CLASS}
                          placeholder="Approved for sharing with year 4..."
                        />
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={submitReview}
                            disabled={submitting}
                            className={`px-3.5 py-2 rounded-xl text-xs font-bold text-white disabled:opacity-50 disabled:cursor-not-allowed transition-colors ${
                              reviewing.decision === 'APPROVED'
                                ? 'bg-teal-700 hover:bg-teal-800'
                                : 'bg-rose-700 hover:bg-rose-800'
                            }`}
                          >
                            Record {reviewing.decision === 'APPROVED' ? 'approval' : 'rejection'}
                          </button>
                          <button
                            type="button"
                            onClick={cancelReview}
                            disabled={submitting}
                            className="px-3.5 py-2 rounded-xl text-xs font-bold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
                          >
                            Cancel
                          </button>
                        </div>
                      </div>
                    )}

                    {shareOpen && shareForm}
                  </li>
                );
              })}
            </ul>
          </section>
        )}
      </div>
    </DashboardLayout>
  );
}
