import { useCallback, useEffect, useState } from 'react';
import { AlertCircle, CheckCircle } from 'lucide-react';
import {
  applyToVacancy,
  fetchApplications,
  fetchVacancies,
} from '../../services/api';

/**
 * PC9: the student side of the vacancy marketplace — browse open vacancies and
 * apply, plus a read-only view of every application already filed.
 *
 * <p>Two server rules shape this UI rather than the reverse:
 * <ul>
 *   <li><b>One application per vacancy.</b> The server answers a duplicate with
 *       409, so we hide the button once the vacancy appears in the student's own
 *       list instead of letting them earn the error.</li>
 *   <li><b>Closed vacancies refuse applications.</b> They are filtered out of
 *       this list entirely, so the "Apply" button can only ever appear on an
 *       OPEN row.</li>
 * </ul>
 * Both are re-checked server-side regardless — this is courtesy, not security.
 *
 * <p>The student only ever sees their own applications: {@code GET
 * /api/applications} is scoped from the session.
 */
export default function VacanciesSection() {
  const [vacancies, setVacancies] = useState([]);
  const [applications, setApplications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [applyingId, setApplyingId] = useState(null);

  const loadAll = useCallback(async function loadAll() {
    setLoading(true);
    setError('');
    try {
      const [vacancyRows, applicationRows] = await Promise.all([
        fetchVacancies(),
        fetchApplications(),
      ]);
      setVacancies(Array.isArray(vacancyRows) ? vacancyRows : []);
      setApplications(Array.isArray(applicationRows) ? applicationRows : []);
    } catch (err) {
      setError(err.message || 'Unable to load vacancies.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadAll();
  }, [loadAll]);

  async function handleApply(vacancy) {
    setApplyingId(vacancy.id);
    setError('');
    setNotice('');
    try {
      await applyToVacancy(vacancy.id);
      setNotice(`Applied for "${vacancy.title}".`);
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
        <span className="ml-2 text-sm text-slate-500">Loading vacancies...</span>
      </div>
    );
  }

  const openVacancies = vacancies.filter(
    (vacancy) => String(vacancy.status || '').toUpperCase() === 'OPEN',
  );
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
        <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100 mb-1">Open vacancies</h2>
        <p className="text-xs text-slate-500 mb-5">Internship roles currently accepting applications.</p>

        {openVacancies.length === 0 ? (
          <p className="text-sm text-slate-500">No vacancies are open right now.</p>
        ) : (
          <ul className="space-y-4">
            {openVacancies.map((vacancy) => {
              const alreadyApplied = appliedVacancyIds.has(String(vacancy.id));
              return (
                <li
                  key={vacancy.id}
                  className="bg-slate-50 dark:bg-slate-800/40 rounded-xl p-4 border border-slate-200 dark:border-slate-800"
                >
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="min-w-0">
                      <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">{vacancy.title}</h3>
                      <p className="text-xs text-slate-600 dark:text-slate-300 mt-1 whitespace-pre-wrap">
                        {vacancy.description || 'No description provided.'}
                      </p>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-2">
                        {vacancy.location || 'Location not specified'}
                        {vacancy.deadline ? ` · Closes ${vacancy.deadline}` : ''}
                      </p>
                    </div>
                    <button
                      type="button"
                      disabled={alreadyApplied || applyingId === vacancy.id}
                      onClick={() => handleApply(vacancy)}
                      className="px-4 py-2 rounded-xl bg-teal-600 text-white text-xs font-bold disabled:opacity-50 disabled:cursor-not-allowed hover:bg-teal-700"
                    >
                      {alreadyApplied
                        ? 'Applied'
                        : applyingId === vacancy.id
                          ? 'Applying...'
                          : 'Apply'}
                    </button>
                  </div>
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
          <p className="text-sm text-slate-500">You have not applied to any vacancy yet.</p>
        ) : (
          <ul className="space-y-3">
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
