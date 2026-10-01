import { useCallback, useEffect, useState } from 'react';
import DashboardLayout from '../DashboardLayout';
import CompanyEditModal from '../CompanyEditModal';
import CompanySupervisorModal from '../CompanySupervisorModal';
import { DonutChart } from '../../charts/ProgressCharts';
import { chartColor } from '../../charts/colors';
import { useTheme } from '../../context/ThemeContext';
import { useAuth } from '../../context/AuthContext';
import {
  fetchCompany,
  fetchStudentsByCompany,
  updateCompany,
  fetchCompanySupervisors,
  createCompanySupervisor,
  updateCompanySupervisor,
  fetchCompanyAnalytics,
  resetUserPassword,
  fetchUniversityOptions,
  studentLookup,
  offerPlacement,
} from '../../services/api';
import {
  Building2,
  Pencil,
  GraduationCap,
  AlertCircle,
  X,
  CheckCircle,
  Users,
  Search,
  LayoutDashboard,
  Star,
  CalendarCheck,
} from 'lucide-react';

/**
 * PC4: the six placement statuses, in pipeline order. The backend always returns
 * all six so the donut never has a missing segment; this is only the display
 * order and label casing.
 */
const PLACEMENT_STATUSES = [
  { key: 'PENDING', label: 'Pending', tone: 0 },
  { key: 'OFFERED', label: 'Offered', tone: 1 },
  { key: 'ASSIGNED', label: 'Assigned', tone: 2 },
  { key: 'ACTIVE', label: 'Active', tone: 3 },
  { key: 'COMPLETED', label: 'Completed', tone: 4 },
  { key: 'CANCELLED', label: 'Cancelled', tone: 5 },
];

const EMPTY_ANALYTICS = {
  offers: {},
  interns: [],
  internCount: 0,
  avgEvaluation: null,
  evaluationCount: 0,
};

/**
 * PC4 KPI tile, exported so PC7's field-supervisor dashboard reuses it instead
 * of duplicating the markup. Purely prop-driven.
 */
export function KpiTile({ label, value, sub, icon: Icon, iconCls }) {
  return (
    // Labelled so the tile reads as one unit to a screen reader instead of
    // three unconnected fragments of text.
    <div
      role="group"
      aria-label={`${label}: ${value}`}
      className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-4 shadow-xs"
    >
      <div className="flex items-center gap-3">
        <div className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${iconCls}`}>
          <Icon className="w-4.5 h-4.5" aria-hidden="true" />
        </div>
        <div className="min-w-0">
          <div className="text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">{label}</div>
          <div className="text-xl font-extrabold text-slate-900 dark:text-slate-100">{value}</div>
        </div>
      </div>
      {sub && <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-2">{sub}</div>}
    </div>
  );
}

/**
 * PC4 intern progress row, exported for the same reason. The developer's
 * renderProgress concept, kept list-first as the plan requires.
 */
export function InternProgressRow({ intern }) {
  const facts = [
    { done: intern.started, label: intern.started ? `Started ${formatDay(intern.startDate)}` : 'Start date not set' },
    { done: intern.evaluated, label: intern.evaluated ? `Evaluated (${intern.averageGrade}/10)` : 'Not yet evaluated' },
  ];
  return (
    <li className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-4 shadow-xs">
      <div className="flex items-center justify-between gap-3 mb-2.5 flex-wrap">
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-9 h-9 rounded-lg bg-blue-50 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800 flex items-center justify-center shrink-0">
            <GraduationCap className="w-4 h-4" aria-hidden="true" />
          </div>
          <div className="min-w-0">
            <div className="text-sm font-bold text-slate-900 dark:text-slate-100 truncate">
              {intern.firstName} {intern.lastName}
            </div>
            <div className="text-[11px] text-slate-500 dark:text-slate-400 truncate">
              {intern.degreeProgram || 'Intern'}
              {intern.placementStatus ? ` · ${intern.placementStatus}` : ''}
            </div>
          </div>
        </div>
        <div className="text-lg font-bold text-teal-700 dark:text-teal-400">{intern.progressPercent}%</div>
      </div>
      <div className="h-2 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
        <div className="h-full bg-teal-600 dark:bg-teal-500 rounded-full transition-all duration-500" style={{ width: `${intern.progressPercent}%` }} />
      </div>
      <div className="flex flex-wrap gap-4 mt-3 text-[11px] text-slate-600 dark:text-slate-400">
        {facts.map((fact) => (
          <span key={fact.label} className="flex items-center gap-1.5">
            <span className={`w-2 h-2 rounded-full ${fact.done ? 'bg-teal-600 dark:bg-teal-400' : 'bg-slate-300 dark:bg-slate-600'}`} aria-hidden="true" />
            {fact.label}
          </span>
        ))}
        {intern.endDate && (
          <span className="flex items-center gap-1.5">
            <CalendarCheck className="w-3 h-3" aria-hidden="true" />
            Ends {formatDay(intern.endDate)}
          </span>
        )}
      </div>
    </li>
  );
}

function formatDay(value) {
  if (!value) return '—';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? String(value) : date.toLocaleDateString();
}

export default function CompanyDashboard() {  const { user } = useAuth();
  const { isDark } = useTheme();
  const [activeTab, setActiveTab] = useState('overview');
  const [company, setCompany] = useState(null);
  const [companyLoading, setCompanyLoading] = useState(true);
  const [interns, setInterns] = useState([]);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [editOpen, setEditOpen] = useState(false);
  const [refresh, setRefresh] = useState(0);
  const [supervisors, setSupervisors] = useState([]);
  const [supModal, setSupModal] = useState(null);
  const [analytics, setAnalytics] = useState(null);
  const [analyticsLoading, setAnalyticsLoading] = useState(true);
  const [analyticsError, setAnalyticsError] = useState('');
  const [universities, setUniversities] = useState([]);
  const [lookupForm, setLookupForm] = useState({ universityId: '', studentNumber: '' });
  const [lookupResult, setLookupResult] = useState(null);
  const [offerNote, setOfferNote] = useState('');

  async function loadSupervisors() {
    setError('');
    try {
      const list = await fetchCompanySupervisors();
      setSupervisors(Array.isArray(list) ? list : []);
    } catch (err) {
      setError(err.message || 'Unable to load field supervisors.');
    }
  }

  async function handleLookup(event) {
    event.preventDefault();
    setError('');
    setNotice('');
    setLookupResult(null);
    try {
      const student = await studentLookup(lookupForm.universityId, lookupForm.studentNumber.trim());
      setLookupResult(student);
    } catch (err) {
      setError(err.message || 'Student not found.');
    }
  }

  async function handleOffer() {
    if (!lookupResult) return;
    setError('');
    setNotice('');
    try {
      await offerPlacement(lookupResult.studentId, offerNote.trim());
      setNotice(`Offer sent for ${lookupResult.firstName} ${lookupResult.lastName}. The university will assign a supervisor.`);
      setLookupResult(null);
      setOfferNote('');
      setLookupForm({ universityId: '', studentNumber: '' });
    } catch (err) {
      setError(err.message || 'Unable to send the offer.');
    }
  }

  const loadAnalytics = useCallback(async () => {
    if (user.companyId == null) {
      setAnalytics(null);
      setAnalyticsLoading(false);
      return;
    }
    setAnalyticsLoading(true);
    setAnalyticsError('');
    try {
      setAnalytics(await fetchCompanyAnalytics());
    } catch (err) {
      setAnalyticsError(err.message || 'Unable to load company analytics.');
    } finally {
      setAnalyticsLoading(false);
    }
  }, [user.companyId]);

  async function handleSupervisorSubmit(payload) {
    setError('');
    setNotice('');
    // The modal closes itself on success and renders its own error on failure, so
    // the target is captured rather than cleared here.
    const target = supModal;

    if (target?.mode === 'edit') {
      // Names are not editable: the login username is derived from them.
      const updated = await updateCompanySupervisor(target.supervisor.id, {
        email: payload.email,
        phone: payload.phone,
        department: payload.department,
      });
      setNotice(`Updated field supervisor ${updated.username}.`);
    } else {
      const created = await createCompanySupervisor(payload);
      setNotice(`Created field supervisor ${created.username}. Their temporary password is ${created.username}123 — they must change it at first sign-in.`);
    }
    await loadSupervisors();
  }

  async function handleSupervisorReset(person) {
    if (!window.confirm(`Reset the password for ${person.username}?`)) return;
    setError('');
    try {
      const { tempPassword } = await resetUserPassword(person.id);
      window.prompt('Temporary password (shown once):', tempPassword);
    } catch (err) {
      setError(err.message || 'Unable to reset the password.');
    }
  }

  useEffect(() => {
    if (user.companyId == null) {
      setCompany(null);
      setCompanyLoading(false);
      setAnalytics(null);
      setAnalyticsLoading(false);
      return;
    }
    setCompanyLoading(true);
    setError('');
    let cancelled = false;
    fetchCompany(user.companyId)
      .then((data) => {
        if (!cancelled) setCompany(data);
      })
      .catch((err) => {
        if (!cancelled) setError(err.message || 'Unable to load company profile.');
      })
      .finally(() => {
        if (!cancelled) setCompanyLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [user.companyId, refresh]);

  // PC4: the Overview tab is the landing tab, so analytics load with the dashboard
  // rather than on first click. Cached across refreshes of the other tabs.
  useEffect(() => {
    if (user.companyId == null || analytics !== null) return;
    loadAnalytics();
  }, [user.companyId, analytics, loadAnalytics]);

  async function loadInterns() {
    setError('');
    try {
      setInterns(await fetchStudentsByCompany(user.companyId));
    } catch (err) {
      setError(err.message || 'Unable to load interns.');
    }
  }

  async function handleCompanySave(payload) {
    await updateCompany(user.companyId, payload);
    setNotice('Company profile updated successfully.');
    setRefresh((value) => value + 1);
  }

  /** The developer's renderProgress concept, kept list-first as the plan requires. */

  function renderOverview() {
    if (user.companyId == null) {
      return (
        <section className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6 shadow-xs">
          <div className="flex flex-col items-center text-center py-4">
            <div className="w-12 h-12 rounded-full bg-amber-50 border border-amber-200 flex items-center justify-center text-amber-600 mb-3">
              <AlertCircle className="w-6 h-6" />
            </div>
            <h3 className="text-base font-bold text-slate-800 dark:text-slate-200">No company linked</h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 max-w-sm">Your account is not linked to a company, so there is nothing to summarise yet.</p>
          </div>
        </section>
      );
    }

    if (analyticsError) {
      return (
        <div role="alert" className="p-3.5 bg-rose-50 border border-rose-200 rounded-xl flex items-center justify-between gap-3 text-rose-900 text-sm">
          <span className="font-medium flex items-center gap-2">
            <AlertCircle className="w-5 h-5 text-rose-600 shrink-0" />
            {analyticsError}
          </span>
          <button type="button" onClick={() => loadAnalytics()} className="px-3 py-1.5 rounded-lg bg-white border border-rose-200 text-rose-700 text-xs font-bold hover:bg-rose-100">
            Retry
          </button>
        </div>
      );
    }

    const data = analytics || EMPTY_ANALYTICS;
    const offers = data.offers || {};
    const offerEntries = PLACEMENT_STATUSES.map((status) => ({
      key: status.label,
      value: offers[status.key] ?? 0,
      color: chartColor(status.tone, isDark),
    }));
    const pipelineTotal = offerEntries
      .filter((entry) => entry.key !== 'Cancelled')
      .reduce((sum, entry) => sum + entry.value, 0);

    const kpis = [
      {
        label: 'Pipeline',
        value: pipelineTotal,
        sub: 'Placements not cancelled',
        icon: LayoutDashboard,
        iconCls: 'bg-teal-50 dark:bg-teal-900/40 text-teal-700 dark:text-teal-300 border border-teal-200 dark:border-teal-800',
      },
      {
        label: 'Interns',
        value: data.internCount ?? 0,
        sub: `${(data.interns || []).filter((i) => i.evaluated).length} evaluated so far`,
        icon: Users,
        iconCls: 'bg-blue-50 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800',
      },
      {
        label: 'Avg Evaluation',
        value: data.avgEvaluation == null ? '—' : `${data.avgEvaluation}/10`,
        sub: `${data.evaluationCount ?? 0} evaluation${data.evaluationCount === 1 ? '' : 's'} recorded`,
        icon: Star,
        iconCls: 'bg-amber-50 dark:bg-amber-900/40 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800',
      },
      {
        label: 'Offers Made',
        value: (offers.OFFERED ?? 0) + (offers.ACTIVE ?? 0) + (offers.COMPLETED ?? 0),
        sub: 'Offered, active or completed',
        icon: CalendarCheck,
        iconCls: 'bg-emerald-50 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800',
      },
    ];

    const interns = data.interns || [];

    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
          {kpis.map((kpi) => (
            <KpiTile key={kpi.label} {...kpi} />
          ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
          <section className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-5 shadow-xs">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-10 h-10 rounded-xl bg-teal-50 dark:bg-teal-900/40 border border-teal-200 dark:border-teal-800 flex items-center justify-center text-teal-700 dark:text-teal-300">
                <LayoutDashboard className="w-5 h-5" aria-hidden="true" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">Offers Pipeline</h3>
                <p className="text-[11px] text-slate-500 dark:text-slate-400">Where your placements stand right now</p>
              </div>
            </div>
            {analyticsLoading ? (
              <div className="h-64 animate-pulse rounded-2xl bg-slate-100 dark:bg-slate-800/60" aria-hidden="true" />
            ) : (
              <DonutChart
                entries={offerEntries}
                centerLabel="placements"
                isDark={isDark}
              />
            )}
          </section>

          <section className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-5 shadow-xs">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-xl bg-blue-50 dark:bg-blue-900/40 border border-blue-200 dark:border-blue-800 flex items-center justify-center text-blue-700 dark:text-blue-300">
                <GraduationCap className="w-5 h-5" aria-hidden="true" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">Intern Onboarding</h3>
                <p className="text-[11px] text-slate-500 dark:text-slate-400">Start date recorded and evaluation filed</p>
              </div>
            </div>
            {analyticsLoading ? (
              <div className="space-y-3">
                {[0, 1, 2].map((i) => (
                  <div key={i} className="h-24 animate-pulse rounded-2xl bg-slate-100 dark:bg-slate-800/60" aria-hidden="true" />
                ))}
              </div>
            ) : interns.length === 0 ? (
              <p className="text-sm text-slate-500 dark:text-slate-400 py-8 text-center">
                No interns placed at your company yet.
              </p>
            ) : (
              <ul className="space-y-3">
                {interns.map((intern) => (
                  <InternProgressRow key={intern.studentId} intern={intern} />
                ))}
              </ul>
            )}
          </section>
        </div>
      </div>
    );
  }

  function renderProfile() {
    if (companyLoading) {
      return (
        <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400 font-medium">
          <div className="w-4 h-4 border-2 border-teal-600 border-t-transparent rounded-full animate-spin" />
          <span>Loading company profile...</span>
        </div>
      );
    }
    if (user.companyId == null) {
      return (
        <section className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6 shadow-xs">
          <div className="flex flex-col items-center text-center py-4">
            <div className="w-12 h-12 rounded-full bg-amber-50 border border-amber-200 flex items-center justify-center text-amber-600 mb-3">
              <AlertCircle className="w-6 h-6" />
            </div>
            <h3 className="text-base font-bold text-slate-800 dark:text-slate-200">No company linked</h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 max-w-sm">Your account is not linked to a company yet. Please contact an administrator.</p>
          </div>
        </section>
      );
    }
    if (!company) {
      return (
        <div role="alert" className="p-3.5 bg-rose-50 border border-rose-200 rounded-xl flex items-center gap-2.5 text-rose-900 text-sm">
          <AlertCircle className="w-5 h-5 text-rose-600 shrink-0" />
          <span className="font-medium">Company profile not found.</span>
        </div>
      );
    }
    const details = [
      ['Company Name', company.name],
      ['Registration No.', company.registrationNumber],
      ['Industry', company.industry],
      ['Size', company.size],
      ['Country', company.country],
      ['City', company.city],
      ['Email', company.email],
      ['Phone', company.phone],
      ['Website', company.website],
      ['Physical Address', company.physicalAddress],
      ['Postal Address', company.postalAddress],
      ['Description', company.description],
    ];
    return (
      <section className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6 shadow-xs">
        <div className="flex items-center justify-between gap-4 mb-5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-teal-50 border border-teal-200 flex items-center justify-center text-teal-700">
              <Building2 className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">Company Profile</h3>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">Your company details as recorded in the system</p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setEditOpen(true)}
            className="h-9 px-3.5 py-2 rounded-xl bg-primary hover:bg-primary text-white text-xs font-bold shadow-xs transition-all flex items-center gap-1.5 focus-visible:ring-2 focus-visible:ring-teal-600 focus-visible:outline-none"
          >
            <Pencil className="w-4 h-4" />
            <span>Edit Profile</span>
          </button>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
          {details.map(([label, value]) => (
            <div key={label} className="bg-slate-50 dark:bg-slate-800/40 rounded-xl p-3 border border-slate-200 dark:border-slate-800">
              <div className="text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1">{label}</div>
              <div className="text-sm font-bold text-slate-900 dark:text-slate-100">{value || '—'}</div>
            </div>
          ))}
        </div>
      </section>
    );
  }

  function renderInterns() {
    if (user.companyId == null) {
      return (
        <section className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6 shadow-xs">
          <div className="flex flex-col items-center text-center py-4">
            <div className="w-12 h-12 rounded-full bg-amber-50 border border-amber-200 flex items-center justify-center text-amber-600 mb-3">
              <AlertCircle className="w-6 h-6" />
            </div>
            <h3 className="text-base font-bold text-slate-800 dark:text-slate-200">No company linked</h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 max-w-sm">Your account is not linked to a company, so no interns can be listed.</p>
          </div>
        </section>
      );
    }
    return (
      <section className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-200 dark:border-slate-800">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-50 border border-blue-200 flex items-center justify-center text-blue-700">
              <GraduationCap className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">Assigned Interns</h3>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">Students placed at your company</p>
            </div>
          </div>
        </div>
        <div className="overflow-x-auto custom-scrollbar">
          <table className="w-full text-left border-collapse" style={{ minWidth: '750px' }} aria-label="Assigned interns">
            <thead>
              <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-50/90 dark:bg-slate-800/60 text-[11px] font-bold tracking-wider text-slate-800 dark:text-slate-200">
                <th scope="col" className="py-3.5 px-3 pl-5">Name</th>
                <th scope="col" className="py-3.5 px-3">Email</th>
                <th scope="col" className="py-3.5 px-3">Student Number</th>
                <th scope="col" className="py-3.5 px-3">Degree Program</th>
                <th scope="col" className="py-3.5 px-3">Year</th>
                <th scope="col" className="py-3.5 px-3 pr-5">Phone</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-sm">
              {interns.length > 0 ? (
                interns.map((intern) => (
                  <tr key={intern.id} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/60 transition-colors">
                    <td className="py-3.5 px-3 pl-5">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg bg-teal-50 text-teal-700 border border-teal-200 flex items-center justify-center shrink-0 shadow-xs">
                          <GraduationCap className="w-4 h-4" />
                        </div>
                        <span className="font-bold text-slate-900 dark:text-slate-100">{intern.firstName} {intern.lastName}</span>
                      </div>
                    </td>
                    <td className="py-3.5 px-3 text-xs text-slate-600 dark:text-slate-400">{intern.email}</td>
                    <td className="py-3.5 px-3 text-xs text-slate-600 dark:text-slate-400">{intern.studentNumber}</td>
                    <td className="py-3.5 px-3 text-xs text-slate-600 dark:text-slate-400">{intern.degreeProgram}</td>
                    <td className="py-3.5 px-3 text-xs text-slate-600 dark:text-slate-400">{intern.yearOfStudy}</td>
                    <td className="py-3.5 px-3 pr-5 text-xs text-slate-600 dark:text-slate-400">{intern.phoneNumber}</td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={6} className="py-12 px-4 text-center">
                    <div className="max-w-sm mx-auto flex flex-col items-center">
                      <div className="w-12 h-12 rounded-full bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-800 flex items-center justify-center text-slate-400 mb-3">
                        <GraduationCap className="w-6 h-6" />
                      </div>
                      <h3 className="text-base font-bold text-slate-800 dark:text-slate-200">No interns assigned</h3>
                      <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">No interns assigned to your company yet.</p>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
    );
  }

  function renderOffers() {
    const inputClass = 'w-full bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100 text-sm rounded-xl border-2 border-slate-200 dark:border-slate-700 px-3.5 py-2.5 focus:border-primary focus:outline-none transition-all font-medium';
    return (
      <div className="space-y-6">
        <section className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-5">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 rounded-xl bg-blue-50 border border-blue-200 flex items-center justify-center text-blue-700">
              <Search className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">Find a student</h3>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                Look up a student by university and student number, then send them an internship offer.
              </p>
            </div>
          </div>
          <form onSubmit={handleLookup} className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <select
              className={inputClass}
              value={lookupForm.universityId}
              onChange={(e) => setLookupForm({ ...lookupForm, universityId: e.target.value })}
            >
              <option value="">Select university</option>
              {universities.map((uni) => (
                <option key={uni.id} value={uni.id}>{uni.fullName || uni.shortForm}</option>
              ))}
            </select>
            <input
              className={inputClass}
              placeholder="Student number"
              value={lookupForm.studentNumber}
              onChange={(e) => setLookupForm({ ...lookupForm, studentNumber: e.target.value })}
            />
            <button type="submit" className="px-4 py-2.5 rounded-xl bg-primary text-white text-xs font-bold">
              Look up student
            </button>
          </form>

          {lookupResult && (
            <div className="mt-4 p-4 rounded-xl border border-teal-200 bg-teal-50/60 dark:bg-slate-800/60">
              <div className="flex items-center justify-between gap-3 flex-wrap">
                <div>
                  <div className="text-sm font-bold text-slate-900 dark:text-slate-100">
                    {lookupResult.firstName} {lookupResult.lastName}
                  </div>
                  <div className="text-xs text-slate-600 dark:text-slate-300">
                    {lookupResult.studentNumber} · {lookupResult.degreeProgram} · Year {lookupResult.yearOfStudy ?? '—'}
                  </div>
                  <div className="text-[11px] text-slate-500 dark:text-slate-400">
                    Reg. {lookupResult.registrationNumber} · Phone {lookupResult.phoneNumber || '—'}
                  </div>
                </div>
              </div>
              <div className="mt-3 grid grid-cols-1 sm:grid-cols-3 gap-3">
                <input
                  className={inputClass}
                  placeholder="Offer note (optional)"
                  value={offerNote}
                  onChange={(e) => setOfferNote(e.target.value)}
                />
                <button
                  type="button"
                  onClick={handleOffer}
                  className="px-4 py-2.5 rounded-xl bg-primary text-white text-xs font-bold"
                >
                  Send internship offer
                </button>
              </div>
            </div>
          )}
        </section>
      </div>
    );
  }

  function renderSupervisors() {
    return (
      <div className="space-y-6">
        <section className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-5">
          <div className="flex items-center justify-between gap-4 flex-wrap">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-teal-50 dark:bg-teal-900/40 border border-teal-200 dark:border-teal-800 flex items-center justify-center text-teal-700 dark:text-teal-300">
                <Users className="w-5 h-5" aria-hidden="true" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">Field supervisors</h3>
                <p className="text-[11px] text-slate-500 dark:text-slate-400">
                  They get a temporary password <code>username123</code> and must change it at first sign-in.
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setSupModal({ mode: 'create', supervisor: null })}
              className="px-4 py-2.5 rounded-xl bg-primary text-white text-xs font-bold hover:opacity-90 focus-visible:ring-2 focus-visible:ring-teal-600 focus-visible:outline-none"
            >
              Add field supervisor
            </button>
          </div>
        </section>

        <section className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden">
          <div className="px-5 py-4 border-b border-slate-200 dark:border-slate-800">
            <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">My field supervisors</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs min-w-[560px]">
              <thead>
                <tr className="bg-slate-50 dark:bg-slate-800/60 text-[11px] font-bold uppercase tracking-wider text-slate-600 dark:text-slate-300">
                  <th className="px-5 py-3">User</th>
                  <th className="px-4 py-3">Email</th>
                  <th className="px-4 py-3">Department</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-5 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {supervisors.map((person) => (
                  <tr key={person.id}>
                    <td className="px-5 py-3 font-semibold text-slate-800 dark:text-slate-100">{person.username}</td>
                    <td className="px-4 py-3 text-slate-600 dark:text-slate-300">{person.email || '—'}</td>
                    <td className="px-4 py-3 text-slate-600 dark:text-slate-300">{person.role}</td>
                    <td className="px-4 py-3">
                      <span className={person.enabled ? 'text-emerald-600' : 'text-rose-600'}>
                        {person.enabled ? 'Active' : 'Disabled'}
                      </span>
                    </td>
                    <td className="px-5 py-3">
                      <div className="flex justify-end gap-2">
                        <button type="button" aria-label={`Edit ${person.username}`}
                          className="px-2 py-1 rounded-lg border border-slate-300 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
                          onClick={() => setSupModal({ mode: 'edit', supervisor: person })}>
                          Edit
                        </button>
                        <button type="button"
                          className="px-2 py-1 rounded-lg border border-amber-200 text-amber-700"
                          onClick={() => handleSupervisorReset(person)}>
                          Reset
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
                {supervisors.length === 0 && (
                  <tr>
                    <td colSpan={5} className="px-5 py-8 text-center text-slate-500">No field supervisors yet.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    );
  }

  return (
    <DashboardLayout
      title="Company Dashboard"
      subtitle="Welcome,"
      tabs={[
        { id: 'overview', label: 'Overview' },
        { id: 'profile', label: 'Profile' },
        { id: 'interns', label: 'Interns' },
        { id: 'offers', label: 'Offers' },
        { id: 'supervisors', label: 'Field Supervisors' },
      ]}
      activeTab={activeTab}
      onTabChange={(tab) => {
        setActiveTab(tab);
        if (tab === 'interns' && user.companyId != null) {
          loadInterns();
        }
        if (tab === 'supervisors') {
          loadSupervisors();
        }
        if (tab === 'offers' && universities.length === 0) {
          fetchUniversityOptions().then((list) => setUniversities(Array.isArray(list) ? list : [])).catch(() => {});
        }
      }}
    >
      <div className="space-y-6 max-w-7xl mx-auto">

        {/* Notice Banner */}
        {notice && (
          <div role="status" className="p-3.5 bg-emerald-50 border border-emerald-200 rounded-xl flex items-center justify-between gap-3 text-emerald-900 text-sm animate-in fade-in">
            <div className="flex items-center gap-2.5">
              <CheckCircle className="w-5 h-5 text-emerald-600 shrink-0" />
              <span className="font-medium">{notice}</span>
            </div>
            <button type="button" onClick={() => setNotice('')} className="text-emerald-600 hover:text-emerald-900 p-1 rounded" aria-label="Dismiss">
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* Error Banner */}
        {error && (
          <div role="alert" className="p-3.5 bg-rose-50 border border-rose-200 rounded-xl flex items-center justify-between gap-3 text-rose-900 text-sm animate-in fade-in">
            <div className="flex items-center gap-2.5">
              <AlertCircle className="w-5 h-5 text-rose-600 shrink-0" />
              <span className="font-medium">{error}</span>
            </div>
            <button type="button" onClick={() => setError('')} className="text-rose-600 hover:text-rose-900 p-1 rounded" aria-label="Dismiss error">
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {activeTab === 'overview' && renderOverview()}
        {activeTab === 'profile' && renderProfile()}
        {activeTab === 'interns' && renderInterns()}
        {activeTab === 'offers' && renderOffers()}
        {activeTab === 'supervisors' && renderSupervisors()}
      </div>

      {supModal && (
        <CompanySupervisorModal
          supervisor={supModal.supervisor}
          title={supModal.mode === 'edit' ? `Edit ${supModal.supervisor.username}` : 'Add Field Supervisor'}
          onClose={() => setSupModal(null)}
          onSubmit={handleSupervisorSubmit}
        />
      )}

      {editOpen && company && (
        <CompanyEditModal
          company={company}
          title="Edit Company Profile"
          onClose={() => setEditOpen(false)}
          onSubmit={handleCompanySave}
        />
      )}
    </DashboardLayout>
  );
}
