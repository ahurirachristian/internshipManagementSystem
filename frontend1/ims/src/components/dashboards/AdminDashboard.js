import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import DashboardLayout from '../DashboardLayout';
import ExportButton from '../ExportButton';
import DiaryReviewModal from '../DiaryReviewModal';
import PlacementCoverageChart from './PlacementCoverageChart';
import StudentEditModal from '../StudentEditModal';
import { Modal } from '../ui/Modal';
import { useTheme } from '../../context/ThemeContext';
import { fetchDiaries, fetchStudents, updateStudent, deleteStudent, fetchVacancies, fetchCompanies, fetchAdminStudentsPerUniversity } from '../../services/api';
import { chartTheme, seriesColor } from '../../charts/colors';
import { useMediaQuery } from '../../hooks/useMediaQuery';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
} from 'recharts';
import {
  GraduationCap,
  BookOpen,
  CheckCircle,
  TrendingUp,
  AlertCircle,
  X,
  FileText,
  Search,
  MessageSquare,
  Settings,
  Building2,
  Landmark,
  Briefcase,
  ScrollText,
  Users,
} from 'lucide-react';

function formatDate(dateString) {
  if (!dateString) return '—';
  const date = new Date(dateString);
  if (Number.isNaN(date.getTime())) return dateString;
  return date.toLocaleDateString('en-GB', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

export default function AdminDashboard() {
  const { isDark } = useTheme();
  // Long university names need a wide y-axis to stay readable, but on a 390px
  // phone that width would eat the whole plot. Truncate instead of shrinking the bars.
  const compact = useMediaQuery('(max-width: 640px)');

  // PC6d: the Overview tab (with the PC5 chart) is first in the array; land on it
  // instead of the second tab so the admin's oversight chart is visible on login.
  const [activeTab, setActiveTab] = useState('overview');
  const [students, setStudents] = useState([]);
  const [diaries, setDiaries] = useState([]);
  const [vacancies, setVacancies] = useState([]);
  const [companies, setCompanies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [reviewDiary, setReviewDiary] = useState(null);
  const [editStudent, setEditStudent] = useState(null);
  const [viewStudent, setViewStudent] = useState(null);
  const [uniAnalytics, setUniAnalytics] = useState(null);
  const [uniAnalyticsError, setUniAnalyticsError] = useState('');

  useEffect(() => {
    let cancelled = false;
    Promise.all([fetchStudents(), fetchDiaries(), fetchVacancies(), fetchCompanies()])
      .then(([studentsData, diariesData, vacanciesData, companiesData]) => {
        if (cancelled) return;
        setStudents(studentsData);
        setDiaries(diariesData);
        setVacancies(Array.isArray(vacanciesData) ? vacanciesData : []);
        setCompanies(Array.isArray(companiesData) ? companiesData : []);
      })
      .catch((err) => {
        if (!cancelled) setError(err.message || 'Unable to load admin data.');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    // Loaded separately: a 403 or outage here must not blank the student roster.
    fetchAdminStudentsPerUniversity()
      .then((data) => {
        if (!cancelled) setUniAnalytics(data);
      })
      .catch((err) => {
        if (!cancelled) setUniAnalyticsError(err.message || 'Unable to load university distribution.');
      });

    return () => {
      cancelled = true;
    };
  }, []);

  const stats = useMemo(() => {
    const totalStudents = students.length;
    const totalDiaryEntries = diaries.length;
    const activeStudents = new Set(
      diaries.map((d) => d.studentNumber).filter(Boolean)
    ).size;
    const average = totalStudents > 0 ? totalDiaryEntries / totalStudents : 0;

    const diaryCounts = {};
    diaries.forEach((d) => {
      const studentNumber = d.studentNumber;
      if (studentNumber) diaryCounts[studentNumber] = (diaryCounts[studentNumber] || 0) + 1;
    });

    return { totalStudents, totalDiaryEntries, activeStudents, average, diaryCounts };
  }, [students, diaries]);

  const notifications = useMemo(() => {
    const items = [];
    if (diaries.length > 0) {
      const latest = diaries[0];
      const name = latest.studentName || latest.studentNumber || 'A student';
      items.push({
        icon: 'fa-book-open',
        title: 'New diary entry',
        message: `${name} submitted a day diary log.`,
        time: formatDate(latest.date),
      });
    }
    if (students.length > 0) {
      const latestStudent = students[0];
      items.push({
        icon: 'fa-user-graduate',
        title: 'New student registered',
        message: `${latestStudent.fullName} (${latestStudent.studentNumber || '—'}) joined the system.`,
        time: 'Recently',
      });
    }
    return items;
  }, [students, diaries]);

  const filteredStudents = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return students;
    return students.filter((student) => {
      const name = (student.fullName || '').toLowerCase();
      return (
        name.includes(q) ||
        (student.studentNumber || '').toLowerCase().includes(q) ||
        (student.email || '').toLowerCase().includes(q) ||
        (student.degreeProgram || '').toLowerCase().includes(q) ||
        (student.organisation || '').toLowerCase().includes(q)
      );
    });
  }, [students, searchQuery]);

  const filteredDiaries = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return diaries;
    return diaries.filter((entry) => {
      const name = (entry.studentName || '').toLowerCase();
      return (
        name.includes(q) ||
        (entry.studentNumber || '').toLowerCase().includes(q) ||
        (entry.dailyActivities || '').toLowerCase().includes(q) ||
        (entry.knowledgeAndSkillsGained || '').toLowerCase().includes(q) ||
        (entry.accomplishments || '').toLowerCase().includes(q)
      );
    });
  }, [diaries, searchQuery]);

  async function handleDeleteStudent(id) {
    if (!window.confirm('Delete this student?')) return;
    setError('');
    try {
      await deleteStudent(id);
      setStudents((prev) => prev.filter((s) => s.id !== id));
    } catch (err) {
      setError(err.message || 'Unable to delete student.');
    }
  }

  function renderActions(student) {
    return (
      <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
        <button
          className="px-2.5 py-1 text-xs font-medium rounded-lg border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          onClick={() => setViewStudent(student)}
        >
          View
        </button>
        <button
          className="px-2.5 py-1 text-xs font-medium rounded-lg border border-teal-200 dark:border-teal-800 text-teal-700 dark:text-teal-400 hover:bg-teal-50 dark:hover:bg-teal-900/30 transition-colors"
          onClick={() => setEditStudent(student)}
        >
          Edit
        </button>
        <button
          className="px-2.5 py-1 text-xs font-medium rounded-lg border border-rose-200 dark:border-rose-800 text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-900/30 transition-colors"
          onClick={() => handleDeleteStudent(student.id)}
        >
          Delete
        </button>
      </div>
    );
  }

  function renderOverview() {
    const rows = uniAnalytics?.studentsPerUniversity || [];
    const unassigned = uniAnalytics?.unassignedCount || 0;
    const total = uniAnalytics?.totalStudents || 0;

    // Long university names make a vertical axis unreadable, so bars run horizontally.
    const chartData = rows.map((r) => ({
      name: r.name,
      count: r.count,
    }));
    const maxCount = chartData.reduce((m, r) => Math.max(m, r.count), 0);
    const summary =
      chartData.length === 0
        ? `No students are registered${unassigned > 0 ? ' yet' : ''}.`
        : `${total} ${total === 1 ? 'student' : 'students'} across ${chartData.length} ${
            chartData.length === 1 ? 'university' : 'universities'
          }. ${rows[0].name} has the most (${maxCount}).` +
          (unassigned > 0 ? ` ${unassigned} ${unassigned === 1 ? 'is' : 'are'} not yet assigned to a university.` : '');

    const theme = chartTheme(isDark);
    const chartTooltipStyle = {
      backgroundColor: theme.surface,
      border: `1px solid ${theme.track}`,
      color: theme.text,
      borderRadius: '8px',
      fontSize: '12px',
    };

    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {[
            ['Total Students', total],
            ['Universities', rows.length],
            ['Unassigned', unassigned],
          ].map(([label, value]) => (
            <div key={label} className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-5 shadow-xs">
              <div className="text-2xl font-extrabold text-slate-900 dark:text-slate-100">{value}</div>
              <div className="text-xs font-semibold text-slate-500 dark:text-slate-400">{label}</div>
            </div>
          ))}
        </div>

        <section className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs p-5">
          <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100 mb-0.5">Students by University</h3>
          <p className="text-[11px] text-slate-500 dark:text-slate-400 mb-4">
            Where the student body actually sits, largest first
          </p>

          {uniAnalyticsError ? (
            <div role="alert" className="h-48 flex items-center justify-center text-xs text-rose-600">
              {uniAnalyticsError}
            </div>
          ) : chartData.length === 0 ? (
            <div className="h-48 flex items-center justify-center text-xs text-slate-400">
              No students registered yet
            </div>
          ) : (
            <div
              role="img"
              aria-label={`Students by university, largest first. ${summary}`}
              // The bars are not individually readable by screen reader, and a long
              // label list would be noise, so the chart carries one summary label and
              // the table below carries the exact figures.
            >
              <ResponsiveContainer width="100%" height={Math.max(200, chartData.length * 40)}>
                <BarChart data={chartData} layout="vertical" margin={{ top: 5, right: 20, left: 8, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke={theme.track} horizontal={false} />
                  <XAxis type="number" allowDecimals={false} fontSize={12} fill={theme.muted} />
                  <YAxis
                    type="category"
                    dataKey="name"
                    width={compact ? 92 : 150}
                    fontSize={compact ? 10 : 11}
                    tickFormatter={(name) => (compact && name.length > 14 ? `${name.slice(0, 13)}…` : name)}
                    fill={theme.muted}
                  />
                  <Tooltip contentStyle={chartTooltipStyle} labelStyle={{ color: theme.text }} cursor={{ fill: theme.track, opacity: 0.25 }} />
                  <Bar dataKey="count" fill={seriesColor('primary', isDark)} radius={[0, 6, 6, 0]} barSize={20} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}

          {chartData.length > 0 && (
            <div className="overflow-x-auto custom-scrollbar mt-5">
            <table className="w-full text-left border-collapse" style={{ minWidth: '420px' }} aria-label="Students by university">
              <caption className="sr-only">Student count per university, largest first</caption>
              <thead>
                <tr className="border-b border-slate-200 dark:border-slate-800 text-[11px] font-bold tracking-wider text-slate-800 dark:text-slate-200">
                  <th scope="col" className="py-2 px-3">University</th>
                  <th scope="col" className="py-2 px-3 text-right">Students</th>
                  <th scope="col" className="py-2 px-3 text-right">Share</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-sm">
                {chartData.map((r) => (
                  <tr key={r.universityId ?? r.name}>
                    <td className="py-2.5 px-3 text-xs font-semibold text-slate-900 dark:text-slate-100">{r.name}</td>
                    <td className="py-2.5 px-3 text-xs text-right text-slate-700 dark:text-slate-300">{r.count}</td>
                    <td className="py-2.5 px-3 text-xs text-right text-slate-600 dark:text-slate-400">
                      {total > 0 ? `${Math.round((r.count / total) * 100)}%` : '—'}
                    </td>
                  </tr>
                ))}
                {unassigned > 0 && (
                  <tr>
                    <td className="py-2.5 px-3 text-xs font-semibold text-slate-500 dark:text-slate-400">Not yet assigned</td>
                    <td className="py-2.5 px-3 text-xs text-right text-slate-500 dark:text-slate-400">{unassigned}</td>
                    <td className="py-2.5 px-3 text-xs text-right text-slate-500 dark:text-slate-400">
                      {total > 0 ? `${Math.round((unassigned / total) * 100)}%` : '—'}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
            </div>
          )}
        </section>

        {/* PC12 chart 5. Fetches its own payload so it cannot inherit the
            students-per-university fetch's error state and render a confident
            empty chart because of someone else's failure. */}
        <div className="mt-5">
          <PlacementCoverageChart />
        </div>
      </div>
    );
  }

  function renderStudents() {
    return (
      <section className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-teal-50 border border-teal-200 flex items-center justify-center text-teal-700">
              <GraduationCap className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">Registered Students</h3>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">All registered student profiles and their diary activity</p>
            </div>
          </div>
          <ExportButton data={students} fileName="students" exportUrl="/api/students/export/csv" />
        </div>
        <div className="overflow-x-auto custom-scrollbar">
          <table className="w-full text-left border-collapse" style={{ minWidth: '850px' }} aria-label="Registered students">
            <thead>
              <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-50/90 dark:bg-slate-800/60 text-[11px] font-bold tracking-wider text-slate-800 dark:text-slate-200">
                <th scope="col" className="py-3.5 px-3 pl-5">Student</th>
                <th scope="col" className="py-3.5 px-3">Student No.</th>
                <th scope="col" className="py-3.5 px-3">Email</th>
                <th scope="col" className="py-3.5 px-3">Program</th>
                <th scope="col" className="py-3.5 px-3">Organisation</th>
                <th scope="col" className="py-3.5 px-3">Diary Entries</th>
                <th scope="col" className="py-3.5 px-3 pr-5">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-sm">
              {filteredStudents.length > 0 ? (
                filteredStudents.map((student) => {
                  const count = stats.diaryCounts[student.studentNumber] || 0;
                  return (
                    <tr key={student.id} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/60 transition-colors">
                      <td className="py-3.5 px-3 pl-5">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-lg bg-teal-50 text-teal-700 border border-teal-200 flex items-center justify-center shrink-0 shadow-xs overflow-hidden">
                            <GraduationCap className="w-4 h-4" />
                          </div>
                          <div>
                            <div className="font-bold text-slate-900 dark:text-slate-100">{student.fullName}</div>
                            <div className="text-[11px] text-slate-500 dark:text-slate-400">{student.username}</div>
                          </div>
                        </div>
                      </td>
                      <td className="py-3.5 px-3 text-xs text-slate-600 dark:text-slate-400">{student.username}</td>
                      <td className="py-3.5 px-3 text-xs text-slate-600 dark:text-slate-400">{student.email}</td>
                      <td className="py-3.5 px-3 text-xs text-slate-600 dark:text-slate-400">{student.degreeProgram}</td>
                      <td className="py-3.5 px-3 text-xs text-slate-600 dark:text-slate-400">{student.organisation || '—'}</td>
                      <td className="py-3.5 px-3">
                        <span className="inline-flex items-center justify-center w-7 h-7 rounded-full bg-slate-100 dark:bg-slate-700 text-xs font-bold text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-800">
                          {count}
                        </span>
                      </td>
                      <td className="py-3.5 px-3 pr-5">
                        <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-bold ${count > 0 ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-amber-50 text-amber-700 border border-amber-200'}`}>
                          {count > 0 ? 'Active' : 'No Activity'}
                        </span>
                      </td>
                      <td>{renderActions(student)}</td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={7} className="py-12 px-4 text-center">
                    <div className="max-w-sm mx-auto flex flex-col items-center">
                      <div className="w-12 h-12 rounded-full bg-slate-100 dark:bg-slate-700 border border-slate-200 dark:border-slate-800 flex items-center justify-center text-slate-400 mb-3">
                        {searchQuery ? <Search className="w-6 h-6" /> : <GraduationCap className="w-6 h-6" />}
                      </div>
                      <h3 className="text-base font-bold text-slate-800 dark:text-slate-200">
                        {searchQuery ? 'No matching students' : 'No registered students'}
                      </h3>
                      <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                        {searchQuery
                          ? 'No students match your search criteria.'
                          : 'No registered students found.'}
                      </p>
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

  function renderDiaries() {
    return (
      <section className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-50 border border-blue-200 flex items-center justify-center text-blue-700">
              <BookOpen className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">Day Diary Logs</h3>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">All submitted day diary entries across every student</p>
            </div>
          </div>
          <ExportButton data={filteredDiaries} fileName="diaries" exportUrl="/api/diaries/export/csv" />
        </div>
        <div className="overflow-x-auto custom-scrollbar">
          <table className="w-full text-left border-collapse" style={{ minWidth: '900px' }} aria-label="Day diary logs">
            <thead>
              <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-50/90 dark:bg-slate-800/60 text-[11px] font-bold tracking-wider text-slate-800 dark:text-slate-200">
                <th scope="col" className="py-3.5 px-3 pl-5">Date</th>
                <th scope="col" className="py-3.5 px-3">Student</th>
                <th scope="col" className="py-3.5 px-3">Daily Activities</th>
                <th scope="col" className="py-3.5 px-3">Skills Gained</th>
                <th scope="col" className="py-3.5 px-3">Accomplishments</th>
                <th scope="col" className="py-3.5 px-3 pr-5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-sm">
              {filteredDiaries.length > 0 ? (
                filteredDiaries.map((entry) => {
                  return (
                    <tr key={entry.id} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/60 transition-colors">
                      <td className="py-3.5 px-3 pl-5 font-bold text-slate-900 dark:text-slate-100 text-xs">{formatDate(entry.date)}</td>
                      <td className="py-3.5 px-3">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-lg bg-teal-50 text-teal-700 border border-teal-200 flex items-center justify-center shrink-0 shadow-xs">
                            <GraduationCap className="w-4 h-4" />
                          </div>
                          <div>
                            <div className="font-bold text-slate-900 dark:text-slate-100">{entry.studentName}</div>
                            <div className="text-[11px] text-slate-500 dark:text-slate-400">{entry.studentNumber}</div>
                          </div>
                        </div>
                      </td>
                      <td className="py-3.5 px-3 text-xs text-slate-600 dark:text-slate-400 max-w-[180px] truncate">{entry.dailyActivities || '—'}</td>
                      <td className="py-3.5 px-3 text-xs text-slate-600 dark:text-slate-400 max-w-[180px] truncate">{entry.knowledgeAndSkillsGained || '—'}</td>
                      <td className="py-3.5 px-3 text-xs text-slate-600 dark:text-slate-400 max-w-[180px] truncate">{entry.accomplishments || '—'}</td>
                      <td className="py-3.5 px-3 pr-5 text-right">
                        <ul className="flex items-center justify-end gap-1 list-none p-0 m-0">
                          <li>
                            <button
                              type="button"
                              onClick={() => setReviewDiary(entry)}
                              className="p-1.5 text-teal-600 hover:text-teal-800 hover:bg-teal-50 rounded-lg transition-colors focus-visible:ring-2 focus-visible:ring-teal-600 focus-visible:outline-none"
                              aria-label="Review diary entry"
                              title="Review / Comment"
                            >
                              <MessageSquare className="w-4 h-4" />
                            </button>
                          </li>
                        </ul>
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={6} className="py-12 px-4 text-center">
                    <div className="max-w-sm mx-auto flex flex-col items-center">
                      <div className="w-12 h-12 rounded-full bg-slate-100 dark:bg-slate-700 border border-slate-200 dark:border-slate-800 flex items-center justify-center text-slate-400 mb-3">
                        {searchQuery ? <Search className="w-6 h-6" /> : <FileText className="w-6 h-6" />}
                      </div>
                      <h3 className="text-base font-bold text-slate-800 dark:text-slate-200">
                        {searchQuery ? 'No matching diary entries' : 'No diary entries'}
                      </h3>
                      <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                        {searchQuery
                          ? 'No diary entries match your search criteria.'
                          : 'No day diary entries have been submitted yet.'}
                      </p>
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

  function companyName(companyId) {
    const company = companies.find((c) => String(c.id) === String(companyId));
    return company ? company.name : `Company #${companyId}`;
  }

  const filteredVacancies = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return vacancies;
    return vacancies.filter((vacancy) => {
      const company = companyName(vacancy.companyId).toLowerCase();
      return (
        (vacancy.title || '').toLowerCase().includes(q) ||
        company.includes(q) ||
        (vacancy.location || '').toLowerCase().includes(q) ||
        (vacancy.status || '').toLowerCase().includes(q)
      );
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [vacancies, companies, searchQuery]);

  function renderMarketplace() {
    return (
      <section className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-200 dark:border-slate-800">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-50 border border-emerald-200 flex items-center justify-center text-emerald-700">
              <Briefcase className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">Internship Marketplace</h3>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">Vacancies published by companies across the system</p>
            </div>
          </div>
        </div>
        <div className="overflow-x-auto custom-scrollbar">
          <table className="w-full text-left border-collapse" style={{ minWidth: '750px' }} aria-label="Internship vacancies">
            <thead>
              <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-50/90 dark:bg-slate-800/60 text-[11px] font-bold tracking-wider text-slate-800 dark:text-slate-200">
                <th scope="col" className="py-3.5 px-3 pl-5">Vacancy</th>
                <th scope="col" className="py-3.5 px-3">Company</th>
                <th scope="col" className="py-3.5 px-3">Location</th>
                <th scope="col" className="py-3.5 px-3">Deadline</th>
                <th scope="col" className="py-3.5 px-3 pr-5">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-sm">
              {filteredVacancies.length > 0 ? (
                filteredVacancies.map((vacancy) => (
                  <tr key={vacancy.id} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/60 transition-colors">
                    <td className="py-3.5 px-3 pl-5">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-700 border border-emerald-200 flex items-center justify-center shrink-0 shadow-xs">
                          <Briefcase className="w-4 h-4" />
                        </div>
                        <div>
                          <div className="font-bold text-slate-900 dark:text-slate-100">{vacancy.title}</div>
                          <div className="text-[11px] text-slate-500 dark:text-slate-400 max-w-[240px] truncate">{vacancy.description}</div>
                        </div>
                      </div>
                    </td>
                    <td className="py-3.5 px-3 text-xs text-slate-600 dark:text-slate-400">{companyName(vacancy.companyId)}</td>
                    <td className="py-3.5 px-3 text-xs text-slate-600 dark:text-slate-400">{vacancy.location || '—'}</td>
                    <td className="py-3.5 px-3 text-xs text-slate-600 dark:text-slate-400">{formatDate(vacancy.deadline)}</td>
                    <td className="py-3.5 px-3 pr-5">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold ${vacancy.status === 'OPEN' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-slate-100 text-slate-600 border border-slate-200'}`}>
                        {vacancy.status || '—'}
                      </span>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={5} className="py-12 px-4 text-center">
                    <div className="max-w-sm mx-auto flex flex-col items-center">
                      <div className="w-12 h-12 rounded-full bg-slate-100 dark:bg-slate-700 border border-slate-200 dark:border-slate-800 flex items-center justify-center text-slate-400 mb-3">
                        {searchQuery ? <Search className="w-6 h-6" /> : <Briefcase className="w-6 h-6" />}
                      </div>
                      <h3 className="text-base font-bold text-slate-800 dark:text-slate-200">
                        {searchQuery ? 'No matching vacancies' : 'No vacancies published'}
                      </h3>
                      <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                        {searchQuery
                          ? 'No vacancies match your search criteria.'
                          : 'When companies publish vacancies, they appear here.'}
                      </p>
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

  function renderSystem() {
    const controls = [
      { to: '/company', icon: Building2, title: 'Company Management', desc: 'Add, edit, and manage company profiles and locations.' },
      { to: '/admin/universities', icon: Landmark, title: 'University Settings', desc: 'Configure registered universities and supervisor assignments.' },
      { to: '/admin/placements', icon: Briefcase, title: 'Placement Approvals', desc: 'Review and approve student placement assignments.' },
      { to: '/admin/audit-logs', icon: ScrollText, title: 'Audit Logs', desc: 'Track system activity, access history, and changes.' },
      { to: '/admin/users', icon: Users, title: 'User Management', desc: 'Manage user accounts, roles, and permissions.' },
    ];
    return (
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-5">
        <div className="flex items-center gap-2.5 mb-1">
          <Settings className="w-4 h-4 text-teal-600" />
          <h2 className="text-sm font-semibold text-slate-800 dark:text-slate-100">System Controls</h2>
        </div>
        <p className="text-xs text-slate-500 dark:text-slate-400 mb-4">High-level administration and data management</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {controls.map(({ to, icon: Icon, title, desc }) => (
            <Link
              key={to}
              to={to}
              className="group rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-800/40 p-4 hover:border-teal-300 dark:hover:border-teal-700 hover:shadow-sm transition-all"
            >
              <div className="flex items-center gap-2.5 mb-2">
                <div className="w-8 h-8 rounded-lg bg-teal-50 border border-teal-200 flex items-center justify-center text-teal-700 shrink-0">
                  <Icon className="w-4 h-4" />
                </div>
                <span className="text-sm font-semibold text-slate-800 dark:text-slate-100 group-hover:text-teal-700 dark:group-hover:text-teal-500">
                  {title}
                </span>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">{desc}</p>
            </Link>
          ))}
        </div>
      </div>
    );
  }

  return (
    <DashboardLayout
      title="Admin Dashboard"
      subtitle="Monitor registered students and review all submitted day diary logs"
      tabs={[
        {
          id: 'overview',
          label: 'Overview',
        },
        {
          id: 'students',
          label: 'Students',
          icon: 'fa-user-graduate',
          count: stats.totalStudents,
        },
        {
          id: 'diaries',
          label: 'Day Diary Logs',
          icon: 'fa-book-open',
          count: stats.totalDiaryEntries,
        },
        {
          id: 'marketplace',
          label: 'Marketplace',
          icon: 'fa-briefcase',
          count: vacancies.length,
        },
        {
          id: 'system',
          label: 'System',
          icon: 'fa-gear',
        },
      ]}
      activeTab={activeTab}
      onTabChange={setActiveTab}
      onSearch={setSearchQuery}
      notifications={notifications}
    >
      <div className="space-y-6">

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

        {/* Loading */}
        {loading && (
          <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400 font-medium">
            <div className="w-4 h-4 border-2 border-teal-600 border-t-transparent rounded-full animate-spin" />
            <span>Loading admin dashboard...</span>
          </div>
        )}

        {!loading && (
          <>
            {/* Metric Cards */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-5 shadow-xs flex items-center gap-4">
                <div className="w-10 h-10 rounded-xl bg-teal-50 border border-teal-200 flex items-center justify-center text-teal-700 shrink-0">
                  <GraduationCap className="w-5 h-5" />
                </div>
                <div>
                  <div className="text-2xl font-extrabold text-slate-900 dark:text-slate-100">{stats.totalStudents}</div>
                  <div className="text-xs font-semibold text-slate-500 dark:text-slate-400">Registered Students</div>
                </div>
              </div>
              <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-5 shadow-xs flex items-center gap-4">
                <div className="w-10 h-10 rounded-xl bg-blue-50 border border-blue-200 flex items-center justify-center text-blue-700 shrink-0">
                  <BookOpen className="w-5 h-5" />
                </div>
                <div>
                  <div className="text-2xl font-extrabold text-slate-900 dark:text-slate-100">{stats.totalDiaryEntries}</div>
                  <div className="text-xs font-semibold text-slate-500 dark:text-slate-400">Day Diary Logs Submitted</div>
                </div>
              </div>
              <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-5 shadow-xs flex items-center gap-4">
                <div className="w-10 h-10 rounded-xl bg-emerald-50 border border-emerald-200 flex items-center justify-center text-emerald-700 shrink-0">
                  <CheckCircle className="w-5 h-5" />
                </div>
                <div>
                  <div className="text-2xl font-extrabold text-slate-900 dark:text-slate-100">{stats.activeStudents}</div>
                  <div className="text-xs font-semibold text-slate-500 dark:text-slate-400">Active Students</div>
                </div>
              </div>
              <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-5 shadow-xs flex items-center gap-4">
                <div className="w-10 h-10 rounded-xl bg-amber-50 border border-amber-200 flex items-center justify-center text-amber-700 shrink-0">
                  <TrendingUp className="w-5 h-5" />
                </div>
                <div>
                  <div className="text-2xl font-extrabold text-slate-900 dark:text-slate-100">{stats.average.toFixed(1)}</div>
                  <div className="text-xs font-semibold text-slate-500 dark:text-slate-400">Avg Logs per Student</div>
                </div>
              </div>
            </div>

            {activeTab === 'overview' && renderOverview()}
            {activeTab === 'students' && renderStudents()}
            {activeTab === 'diaries' && renderDiaries()}
            {activeTab === 'marketplace' && renderMarketplace()}
            {activeTab === 'system' && renderSystem()}
          </>
        )}
      </div>

      {reviewDiary && (
        <DiaryReviewModal
          diary={reviewDiary}
          onClose={() => setReviewDiary(null)}
          onSaved={() => {
            setReviewDiary(null);
          }}
        />
      )}

      {editStudent && (
        <StudentEditModal
          student={editStudent}
          title={`Edit Student: ${editStudent.firstName} ${editStudent.lastName}`}
          onClose={() => setEditStudent(null)}
          onSubmit={async (payload) => {
            await updateStudent(editStudent.id, payload);
            setStudents((prev) => prev.map((s) => (s.id === editStudent.id ? { ...s, ...payload } : s)));
            setEditStudent(null);
          }}
          companies={[]}
          supervisors={[]}
        />
      )}

      <Modal
        isOpen={!!viewStudent}
        onClose={() => setViewStudent(null)}
        title="Student Details"
        maxWidth="max-w-xl"
      >
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-4">
          {[
            ['Full Name', `${viewStudent?.firstName || ''} ${viewStudent?.lastName || ''}`.trim()],
            ['Email', viewStudent?.email],
            ['Student Number', viewStudent?.studentNumber],
            ['Registration Number', viewStudent?.registrationNumber],
            ['Degree Program', viewStudent?.degreeProgram],
            ['Year of Study', viewStudent?.yearOfStudy],
            ['Phone Number', viewStudent?.phoneNumber],
            ['Internship Company', viewStudent?.internshipCompany],
            ['University Supervisor', viewStudent?.universitySupervisor],
            ['Industrial Supervisor ID', viewStudent?.industrialSupervisorId],
          ].map(([label, value]) => (
            <div key={label} className="flex flex-col gap-0.5">
              <span className="text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wide">
                {label}
              </span>
              <span className="text-sm text-slate-800 dark:text-slate-100">
                {value || '—'}
              </span>
            </div>
          ))}
        </div>
      </Modal>
    </DashboardLayout>
  );
}
