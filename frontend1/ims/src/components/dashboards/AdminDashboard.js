import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import DashboardLayout from '../DashboardLayout';
import ExportButton from '../ExportButton';
import DiaryReviewModal from '../DiaryReviewModal';
import { fetchDiaries, fetchStudents } from '../../services/api';
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
  const [activeTab, setActiveTab] = useState('students');
  const [students, setStudents] = useState([]);
  const [diaries, setDiaries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [reviewDiary, setReviewDiary] = useState(null);
  const [editStudent, setEditStudent] = useState(null);
  const [viewStudent, setViewStudent] = useState(null);

  useEffect(() => {
    let cancelled = false;
    Promise.all([fetchStudents(), fetchDiaries()])
      .then(([studentsData, diariesData]) => {
        if (cancelled) return;
        setStudents(studentsData);
        setDiaries(diariesData);
      })
      .catch((err) => {
        if (!cancelled) setError(err.message || 'Unable to load admin data.');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
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
        <button className="icon-button" onClick={() => setViewStudent(student)}>View</button>
        <button className="icon-button edit" onClick={() => setEditStudent(student)}>Edit</button>
        <button className="icon-button delete" onClick={() => handleDeleteStudent(student.id)}>Delete</button>
      </div>
    );
  }

  function renderStudents() {
    return (
      <section className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-teal-50 border border-teal-200 flex items-center justify-center text-teal-700">
              <GraduationCap className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900">Registered Students</h3>
              <p className="text-[11px] text-slate-500">All registered student profiles and their diary activity</p>
            </div>
          </div>
          <ExportButton data={students} fileName="students" exportUrl="/api/students/export/csv" />
        </div>
        <div className="overflow-x-auto custom-scrollbar">
          <table className="w-full text-left border-collapse" style={{ minWidth: '850px' }} aria-label="Registered students">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50/90 text-[11px] font-bold tracking-wider text-slate-800">
                <th scope="col" className="py-3.5 px-3 pl-5">Student</th>
                <th scope="col" className="py-3.5 px-3">Student No.</th>
                <th scope="col" className="py-3.5 px-3">Email</th>
                <th scope="col" className="py-3.5 px-3">Program</th>
                <th scope="col" className="py-3.5 px-3">Organisation</th>
                <th scope="col" className="py-3.5 px-3">Diary Entries</th>
                <th scope="col" className="py-3.5 px-3 pr-5">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-sm">
              {filteredStudents.length > 0 ? (
                filteredStudents.map((student) => {
                  const count = stats.diaryCounts[student.studentNumber] || 0;
                  return (
                    <tr key={student.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="py-3.5 px-3 pl-5">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-lg bg-teal-50 text-teal-700 border border-teal-200 flex items-center justify-center shrink-0 shadow-xs overflow-hidden">
                            <GraduationCap className="w-4 h-4" />
                          </div>
                          <div>
                            <div className="font-bold text-slate-900">{student.fullName}</div>
                            <div className="text-[11px] text-slate-500">{student.username}</div>
                          </div>
                        </div>
                      </td>
                      <td className="py-3.5 px-3 text-xs text-slate-600">{student.username}</td>
                      <td className="py-3.5 px-3 text-xs text-slate-600">{student.email}</td>
                      <td className="py-3.5 px-3 text-xs text-slate-600">{student.degreeProgram}</td>
                      <td className="py-3.5 px-3 text-xs text-slate-600">{student.organisation || '—'}</td>
                      <td className="py-3.5 px-3">
                        <span className="inline-flex items-center justify-center w-7 h-7 rounded-full bg-slate-100 text-xs font-bold text-slate-700 border border-slate-200">
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
                      <div className="w-12 h-12 rounded-full bg-slate-100 border border-slate-200 flex items-center justify-center text-slate-400 mb-3">
                        {searchQuery ? <Search className="w-6 h-6" /> : <GraduationCap className="w-6 h-6" />}
                      </div>
                      <h3 className="text-base font-bold text-slate-800">
                        {searchQuery ? 'No matching students' : 'No registered students'}
                      </h3>
                      <p className="text-xs text-slate-500 mt-1">
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
      <section className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-50 border border-blue-200 flex items-center justify-center text-blue-700">
              <BookOpen className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900">Day Diary Logs</h3>
              <p className="text-[11px] text-slate-500">All submitted day diary entries across every student</p>
            </div>
          </div>
          <ExportButton data={filteredDiaries} fileName="diaries" exportUrl="/api/diaries/export/csv" />
        </div>
        <div className="overflow-x-auto custom-scrollbar">
          <table className="w-full text-left border-collapse" style={{ minWidth: '900px' }} aria-label="Day diary logs">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50/90 text-[11px] font-bold tracking-wider text-slate-800">
                <th scope="col" className="py-3.5 px-3 pl-5">Date</th>
                <th scope="col" className="py-3.5 px-3">Student</th>
                <th scope="col" className="py-3.5 px-3">Daily Activities</th>
                <th scope="col" className="py-3.5 px-3">Skills Gained</th>
                <th scope="col" className="py-3.5 px-3">Accomplishments</th>
                <th scope="col" className="py-3.5 px-3 pr-5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-sm">
              {filteredDiaries.length > 0 ? (
                filteredDiaries.map((entry) => {
                  return (
                    <tr key={entry.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="py-3.5 px-3 pl-5 font-bold text-slate-900 text-xs">{formatDate(entry.date)}</td>
                      <td className="py-3.5 px-3">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-lg bg-teal-50 text-teal-700 border border-teal-200 flex items-center justify-center shrink-0 shadow-xs">
                            <GraduationCap className="w-4 h-4" />
                          </div>
                          <div>
                            <div className="font-bold text-slate-900">{entry.studentName}</div>
                            <div className="text-[11px] text-slate-500">{entry.studentNumber}</div>
                          </div>
                        </div>
                      </td>
                      <td className="py-3.5 px-3 text-xs text-slate-600 max-w-[180px] truncate">{entry.dailyActivities || '—'}</td>
                      <td className="py-3.5 px-3 text-xs text-slate-600 max-w-[180px] truncate">{entry.knowledgeAndSkillsGained || '—'}</td>
                      <td className="py-3.5 px-3 text-xs text-slate-600 max-w-[180px] truncate">{entry.accomplishments || '—'}</td>
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
                      <div className="w-12 h-12 rounded-full bg-slate-100 border border-slate-200 flex items-center justify-center text-slate-400 mb-3">
                        {searchQuery ? <Search className="w-6 h-6" /> : <FileText className="w-6 h-6" />}
                      </div>
                      <h3 className="text-base font-bold text-slate-800">
                        {searchQuery ? 'No matching diary entries' : 'No diary entries'}
                      </h3>
                      <p className="text-xs text-slate-500 mt-1">
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

  function renderSystem() {
    return (
      <div className="card">
        <div className="card-header">
          <span className="card-title"><i className="fa-solid fa-gear"></i> System Controls</span>
          <span className="card-hint">High-level administration and data management</span>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '16px', marginTop: '16px' }}>
          <Link to="/company" className="card" style={{ textDecoration: 'none', color: 'inherit' }}>
            <div className="card-header">
              <span className="card-title"><i className="fa-solid fa-building"></i> Company Management</span>
            </div>
            <p style={{ opacity: 0.7, fontSize: '0.875rem' }}>Add, edit, and manage company profiles and locations.</p>
          </Link>
          <Link to="/admin/universities" className="card" style={{ textDecoration: 'none', color: 'inherit' }}>
            <div className="card-header">
              <span className="card-title"><i className="fa-solid fa-university"></i> University Settings</span>
            </div>
            <p style={{ opacity: 0.7, fontSize: '0.875rem' }}>Configure registered universities and supervisor assignments.</p>
          </Link>
          <Link to="/admin/placements" className="card" style={{ textDecoration: 'none', color: 'inherit' }}>
            <div className="card-header">
              <span className="card-title"><i className="fa-solid fa-users-rectangle"></i> Placement Approvals</span>
            </div>
            <p style={{ opacity: 0.7, fontSize: '0.875rem' }}>Review and approve student placement assignments.</p>
          </Link>
          <Link to="/admin/audit-logs" className="card" style={{ textDecoration: 'none', color: 'inherit' }}>
            <div className="card-header">
              <span className="card-title"><i className="fa-solid fa-list-check"></i> Audit Logs</span>
            </div>
            <p style={{ opacity: 0.7, fontSize: '0.875rem' }}>Track system activity, access history, and changes.</p>
          </Link>
          <Link to="/admin/users" className="card" style={{ textDecoration: 'none', color: 'inherit' }}>
            <div className="card-header">
              <span className="card-title"><i className="fa-solid fa-users"></i> User Management</span>
            </div>
            <p style={{ opacity: 0.7, fontSize: '0.875rem' }}>Manage user accounts, roles, and permissions.</p>
          </Link>
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
          <div className="flex items-center gap-2 text-xs text-slate-500 font-medium">
            <div className="w-4 h-4 border-2 border-teal-600 border-t-transparent rounded-full animate-spin" />
            <span>Loading admin dashboard...</span>
          </div>
        )}

        {!loading && (
          <>
            {/* Metric Cards */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs flex items-center gap-4">
                <div className="w-10 h-10 rounded-xl bg-teal-50 border border-teal-200 flex items-center justify-center text-teal-700 shrink-0">
                  <GraduationCap className="w-5 h-5" />
                </div>
                <div>
                  <div className="text-2xl font-extrabold text-slate-900">{stats.totalStudents}</div>
                  <div className="text-xs font-semibold text-slate-500">Registered Students</div>
                </div>
              </div>
              <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs flex items-center gap-4">
                <div className="w-10 h-10 rounded-xl bg-blue-50 border border-blue-200 flex items-center justify-center text-blue-700 shrink-0">
                  <BookOpen className="w-5 h-5" />
                </div>
                <div>
                  <div className="text-2xl font-extrabold text-slate-900">{stats.totalDiaryEntries}</div>
                  <div className="text-xs font-semibold text-slate-500">Day Diary Logs Submitted</div>
                </div>
              </div>
              <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs flex items-center gap-4">
                <div className="w-10 h-10 rounded-xl bg-emerald-50 border border-emerald-200 flex items-center justify-center text-emerald-700 shrink-0">
                  <CheckCircle className="w-5 h-5" />
                </div>
                <div>
                  <div className="text-2xl font-extrabold text-slate-900">{stats.activeStudents}</div>
                  <div className="text-xs font-semibold text-slate-500">Active Students</div>
                </div>
              </div>
              <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs flex items-center gap-4">
                <div className="w-10 h-10 rounded-xl bg-amber-50 border border-amber-200 flex items-center justify-center text-amber-700 shrink-0">
                  <TrendingUp className="w-5 h-5" />
                </div>
                <div>
                  <div className="text-2xl font-extrabold text-slate-900">{stats.average.toFixed(1)}</div>
                  <div className="text-xs font-semibold text-slate-500">Avg Logs per Student</div>
                </div>
              </div>
            </div>

            {activeTab === 'students' && renderStudents()}
            {activeTab === 'diaries' && renderDiaries()}
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

      {viewStudent && (
        <div className="modal-overlay" onClick={() => setViewStudent(null)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Student Details</h2>
              <button className="close-button" onClick={() => setViewStudent(null)}>
                ×
              </button>
            </div>
            <div className="detail-grid">
              {[
                ['Full Name', `${viewStudent.firstName || ''} ${viewStudent.lastName || ''}`.trim()],
                ['Email', viewStudent.email],
                ['Student Number', viewStudent.studentNumber],
                ['Registration Number', viewStudent.registrationNumber],
                ['Degree Program', viewStudent.degreeProgram],
                ['Year of Study', viewStudent.yearOfStudy],
                ['Phone Number', viewStudent.phoneNumber],
                ['Internship Company', viewStudent.internshipCompany],
                ['University Supervisor', viewStudent.universitySupervisor],
                ['Industrial Supervisor ID', viewStudent.industrialSupervisorId],
              ].map(([label, value]) => (
                <div className="detail-item" key={label}>
                  <span className="detail-label">{label}</span>
                  <span className="detail-value">{value || '—'}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </DashboardLayout>
  );
}
