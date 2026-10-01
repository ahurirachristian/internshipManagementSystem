/**
 * PC7.5: the field supervisor's own dashboard.
 *
 * <p>This persona had no dashboard at all before PC7 — a SUPERVISOR account
 * wearing a company id was routed to the university dashboard, which rejected
 * it on every request (plan §1.4). The dashboard reuses the PC4 overview
 * components rather than duplicating charts, and answers only questions the
 * data can answer: who am I supervising, are they filing diaries, have I
 * completed their evaluations.
 */
import { useEffect, useState } from 'react';
import DashboardLayout from '../DashboardLayout';
import { KpiTile, InternProgressRow } from './CompanyDashboard';
import { GraduationCap, ListTodo, ClipboardCheck } from 'lucide-react';

export default function IndustrialSupervisorDashboard() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true);
      setError('');
      try {
        const response = await fetch('/api/industrial/me/overview', { credentials: 'include' });
        if (!response.ok) {
          const body = await response.json().catch(() => ({}));
          throw new Error(body.error || 'Unable to load your overview.');
        }
        if (!cancelled) setData(await response.json());
      } catch (err) {
        if (!cancelled) setError(err.message || 'Unable to load your overview.');
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <DashboardLayout
      title="Field Supervisor Dashboard"
      subtitle="The interns you supervise at your company"
      tabs={[{ id: 'overview', label: 'Overview' }]}
      activeTab="overview"
      onTabChange={() => {}}
    >
      <div className="space-y-6">
        {error && (
          <div role="alert" className="p-3.5 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900 rounded-xl flex items-start gap-2.5 text-rose-900 dark:text-rose-200 text-sm">
            {error}
          </div>
        )}

        {loading && <div className="p-6 text-sm text-slate-500">Loading overview…</div>}

        {!loading && data && (
          <>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <KpiTile
                label="My Interns"
                value={data.internCount}
                sub={data.companyName ? `At ${data.companyName}` : 'No company linked'}
                icon={GraduationCap}
                iconCls="bg-blue-50 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800"
              />
              <KpiTile
                label="Filing Diaries"
                value={data.internsFiling}
                sub={`${data.internCount - data.internsFiling} yet to file`}
                icon={ListTodo}
                iconCls="bg-amber-50 dark:bg-amber-900/40 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800"
              />
              <KpiTile
                label="Evaluated by Me"
                value={data.evaluatedByMe}
                sub={`${data.internCount - data.evaluatedByMe} awaiting evaluation`}
                icon={ClipboardCheck}
                iconCls="bg-emerald-50 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800"
              />
            </div>

            {data.interns.length === 0 ? (
              <div className="p-8 text-center text-sm text-slate-500 dark:text-slate-400 border border-dashed border-slate-300 dark:border-slate-700 rounded-2xl">
                No interns are placed at your company yet.
              </div>
            ) : (
              <section className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs p-5">
                <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100 mb-4">My Interns</h3>
                <ul className="space-y-3">
                  {data.interns.map((intern) => (
                    <InternProgressRow
                      key={intern.studentId}
                      intern={{
                        firstName: intern.name.split(' ')[0],
                        lastName: intern.name.split(' ').slice(1).join(' '),
                        degreeProgram: intern.studentNumber,
                        placementStatus: intern.status,
                        started: Boolean(intern.latestDiaryDate),
                        startDate: intern.latestDiaryDate,
                        evaluated: intern.evaluatedByMe,
                        averageGrade: null,
                        progressPercent: Math.min(intern.diaryCount * 10, 100),
                      }}
                    />
                  ))}
                </ul>
              </section>
            )}
          </>
        )}
      </div>
    </DashboardLayout>
  );
}
