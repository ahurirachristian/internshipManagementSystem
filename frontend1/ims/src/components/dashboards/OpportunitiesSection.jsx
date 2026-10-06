import { useCallback, useEffect, useState } from 'react';
import { AlertCircle, CheckCircle } from 'lucide-react';
import {
  applyToVacancy,
  fetchApplications,
  fetchOpportunityFeed,
} from '../../services/api';
import OpportunityCard from '../ui/OpportunityCard';

/**
 * S7.2 (opportunity plan §8.8): the student's opportunity tab — the scoped
 * S6.4 feed, rendered through the S7.1 card, replacing
 * `VacanciesSection`'s role in the dashboard.
 *
 * <p>The load path *is* the security change: this section calls
 * `GET /api/opportunities`, which the server scopes to my university's live
 * shares, never `GET /api/vacancies` — the legacy list answers every
 * logged-in user with every advert across companies (D1), and S7.4 tightens
 * it. A test asserts with a fetch spy that `fetchVacancies` is never touched
 * from here, because "the code looks repointed" is not evidence.
 *
 * <p>Two server rules shape the UI rather than the reverse (kept from
 * PC9/VacanciesSection):
 *
 * <ul>
 *   <li><b>One application per vacancy</b> — the feed's `applied` flag hides
 *       the button once filed, so the student never earns the 409.</li>
 *   <li><b>The feed only carries live, published, in-audience adverts</b> —
 *       closed shares and withdrawn adverts never arrive, so Apply can only
 *       ever appear on something the server still accepts. Both rules are
 *       re-checked server-side regardless; this is courtesy, not security.</li>
 * </ul>
 */
export default function OpportunitiesSection() {
  const [feed, setFeed] = useState([]);
  const [applications, setApplications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [applyingId, setApplyingId] = useState(null);

  const loadAll = useCallback(async function loadAll() {
    setLoading(true);
    setError('');
    try {
      const [feedRows, applicationRows] = await Promise.all([
        fetchOpportunityFeed(),
        fetchApplications(),
      ]);
      setFeed(Array.isArray(feedRows) ? feedRows : []);
      setApplications(Array.isArray(applicationRows) ? applicationRows : []);
    } catch (err) {
      setError(err.message || 'Unable to load opportunities.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadAll();
  }, [loadAll]);

  async function handleApply(item) {
    setApplyingId(item.id);
    setError('');
    setNotice('');
    try {
      await applyToVacancy(item.id);
      setNotice(`Applied for "${item.title}".`);
      await loadAll();
    } catch (err) {
      setError(err.message || 'Unable to submit your application.');
    } finally {
      setApplyingId(null);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12" role="status">
        <div className="w-5 h-5 border-2 border-teal-600 border-t-transparent rounded-full animate-spin" />
        <span className="ml-2 text-sm text-slate-500">Loading opportunities...</span>
      </div>
    );
  }

  const appliedVacancyIds = new Set(
    applications.map((application) => String(application.vacancyId)),
  );

  return (
    <div className="space-y-6">
      {notice && (
        <div role="status" className="p-3.5 bg-emerald-50 border border-emerald-200 rounded-xl flex items-center gap-2.5 text-emerald-950 text-sm">
          <CheckCircle className="w-5 h-5 text-emerald-700 shrink-0" />
          <span className="font-medium">{notice}</span>
        </div>
      )}
      {error && (
        <div role="alert" className="p-3.5 bg-rose-50 border border-rose-200 rounded-xl flex items-center gap-2.5 text-rose-900 text-sm">
          <AlertCircle className="w-5 h-5 text-rose-700 shrink-0" />
          <span className="font-medium">{error}</span>
        </div>
      )}

      <section className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xs p-6">
        <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100 mb-1">
          Opportunities shared with you
        </h2>
        <p className="text-xs text-slate-500 mb-5">
          Internship roles your university shared, matching your programme and year.
        </p>

        {feed.length === 0 ? (
          <p className="text-sm text-slate-500">
            No opportunities have been shared with you yet.
          </p>
        ) : (
          <ul aria-label="Opportunities shared with you" className="space-y-4">
            {feed.map((item) => {
              const alreadyApplied = item.applied
                || appliedVacancyIds.has(String(item.id));
              return (
                <li key={`${item.shareId ?? 'share'}-${item.id}`}>
                  <OpportunityCard opportunity={item} audience="STUDENT">
                    <div className="flex justify-end">
                      <button
                        type="button"
                        disabled={alreadyApplied || applyingId === item.id}
                        onClick={() => handleApply(item)}
                        aria-label={`Apply for ${item.title}`}
                        className="px-4 py-2 rounded-xl bg-teal-600 text-white text-xs font-bold disabled:opacity-50 disabled:cursor-not-allowed hover:bg-teal-700"
                      >
                        {alreadyApplied
                          ? 'Applied'
                          : applyingId === item.id
                            ? 'Applying...'
                            : 'Apply'}
                      </button>
                    </div>
                  </OpportunityCard>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      <section className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xs p-6">
        <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100 mb-1">My applications</h2>
        <p className="text-xs text-slate-500 mb-5">Every application you have submitted, and where it stands.</p>

        {applications.length === 0 ? (
          <p className="text-sm text-slate-500">You have not applied to any opportunity yet.</p>
        ) : (
          <ul aria-label="My applications" className="space-y-3">
            {applications.map((application) => (
              <li
                key={application.id}
                className="flex flex-wrap items-center justify-between gap-3 bg-slate-50 dark:bg-slate-800/40 rounded-xl p-4 border border-slate-200 dark:border-slate-800"
              >
                <div>
                  <p className="text-sm font-bold text-slate-900 dark:text-slate-100">
                    {application.vacancyTitle || `Vacancy #${application.vacancyId}`}
                  </p>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                    Submitted {application.createdAt ? String(application.createdAt).slice(0, 10) : '—'}
                  </p>
                </div>
                <span className="px-2.5 py-1 rounded-full bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-[11px] font-bold text-slate-700 dark:text-slate-300">
                  {application.status}
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
