import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import DashboardLayout from '../DashboardLayout';
import StudentEditModal from '../StudentEditModal';
import { useAuth } from '../../context/AuthContext';
import {
  deleteStudent,
  fetchUniversityStudents,
  fetchCompanies,
  fetchSupervisors,
  fetchUniversityProfile,
  fetchSchools,
  fetchDepartments,
  fetchProgrammes,
  fetchUniversitySupervisors,
  fetchIndustrialSupervisors,
  fetchUniversityStats,
  submitDiaryFeedback,
  updateStudent,
} from '../../services/api';
import {
  Pencil,
  Trash2,
  GraduationCap,
  X,
  AlertCircle,
  CheckCircle,
  Building2,
  UserPlus,
  ChevronDown,
  ChevronRight,
  School,
  List,
  ListChecks,
  BookOpen,
  Star,
  ClipboardCheck,
  FileText,
  Briefcase,
} from 'lucide-react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  PieChart,
  Pie,
  Cell,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
} from 'recharts';

const emptyAssignForm = {
  studentId: '',
  internshipCompanyId: '',
  uniSupervisorId: '',
  indSupervisorId: '',
};

const CHART_COLORS = ['#0d9488', '#f59e0b', '#8b5cf6', '#e11d48', '#0ea5e9', '#84cc16', '#f97316', '#14b8a6'];

export default function UniversityDashboard() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState('students');
  const [allStudents, setAllStudents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [assignForm, setAssignForm] = useState(emptyAssignForm);
  const [assignLoading, setAssignLoading] = useState(false);
  const [uniSupervisorRows, setUniSupervisorRows] = useState([]);
  const [indSupervisorRows, setIndSupervisorRows] = useState([]);
  const [editStudent, setEditStudent] = useState(null);
  const [companies, setCompanies] = useState([]);
  const [supervisors, setSupervisors] = useState([]);
  const [university, setUniversity] = useState(null);
  const [studentsViewMode, setStudentsViewMode] = useState('all');
  const [schools, setSchools] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [programmes, setProgrammes] = useState([]);
  const [expandedUnits, setExpandedUnits] = useState({});
  const [searchParams] = useSearchParams();
  const selectedUnitId = searchParams.get('unitId');
  const [stats, setStats] = useState(null);
  const [reviewDiary, setReviewDiary] = useState(null);
  const [reviewForm, setReviewForm] = useState({ status: 'APPROVED', feedback: '' });

  useEffect(() => {
    loadStudents();
    loadCompanies();
    loadSupervisors();
    loadUniversity();
    loadAcademicUnits();
    loadDepartments();
    loadProgrammes();
    loadUniSupervisorRows();
    loadIndSupervisorRows();
    loadStats();
  }, []);

  async function loadStats() {
    try {
      setStats(await fetchUniversityStats());
    } catch (err) {
      console.error('Failed to load university stats', err);
    }
  }

  async function loadStudents() {
    setLoading(true);
    setError('');
    try {
      setAllStudents(await fetchUniversityStudents());
    } catch (err) {
      setError(err.message || 'Unable to load students.');
    } finally {
      setLoading(false);
    }
  }

  async function loadCompanies() {
    try {
      const data = await fetchCompanies();
      setCompanies(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error('Failed to load companies', err);
      setCompanies([]);
    }
  }

  async function loadUniSupervisorRows() {
    try {
      const data = await fetchUniversitySupervisors();
      setUniSupervisorRows(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error('Failed to load university supervisors', err);
      setUniSupervisorRows([]);
    }
  }

  async function loadIndSupervisorRows() {
    try {
      const data = await fetchIndustrialSupervisors();
      setIndSupervisorRows(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error('Failed to load industrial supervisors', err);
      setIndSupervisorRows([]);
    }
  }

  async function loadSupervisors() {
    try {
      const data = await fetchSupervisors('UNIVERSITY');
      setSupervisors(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error('Failed to load supervisors', err);
      setSupervisors([]);
    }
  }

  async function loadUniversity() {
    try {
      const data = await fetchUniversityProfile();
      setUniversity(data);
    } catch (err) {
      console.error('Failed to load university', err);
    }
  }

  async function loadAcademicUnits() {
    try {
      if (user.universityId) {
        const data = await fetchSchools();
        setSchools(Array.isArray(data) ? data : []);
      }
    } catch (err) {
      console.error('Failed to load academic units', err);
    }
  }

  async function loadDepartments() {
    try {
      const data = await fetchDepartments();
      setDepartments(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error('Failed to load departments', err);
    }
  }

  async function loadProgrammes() {
    try {
      const data = await fetchProgrammes();
      setProgrammes(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error('Failed to load programmes', err);
    }
  }

  function toggleUnit(unitId) {
    setExpandedUnits((prev) => ({ ...prev, [unitId]: !prev[unitId] }));
  }

  function getUnitName(unitId) {
    if (!unitId) return 'Unassigned';
    const unit = schools.find((u) => u.schoolId === unitId);
    return unit ? unit.schoolName : `Unit ${unitId}`;
  }

  const topUnits = useMemo(
    () => schools.filter((u) => !u.parentSchoolId),
    [schools]
  );

  const childUnitsMap = useMemo(() => {
    const map = {};
    schools.forEach((u) => {
      if (u.parentSchoolId) {
        if (!map[u.parentSchoolId]) map[u.parentSchoolId] = [];
        map[u.parentSchoolId].push(u);
      }
    });
    return map;
  }, [schools]);

  const includedUnitIds = useMemo(() => {
    if (!selectedUnitId) return null;
    const ids = new Set([String(selectedUnitId)]);
    schools.forEach((u) => {
      if (String(u.parentSchoolId) === String(selectedUnitId)) {
        ids.add(String(u.schoolId));
      }
    });
    return ids;
  }, [selectedUnitId, schools]);

  const students = useMemo(
    () => allStudents,
    [allStudents]
  );

  const filteredStudents = useMemo(() => {
    if (!includedUnitIds) return students;
    return students.filter((s) => includedUnitIds.has(String(s.schoolId)));
  }, [students, includedUnitIds]);

  const studentsByUnit = useMemo(() => {
    const map = {};
    filteredStudents.forEach((s) => {
      const key = s.schoolId || 'unassigned';
      if (!map[key]) map[key] = [];
      map[key].push(s);
    });
    return map;
  }, [filteredStudents]);

  const universityDetails = university ? [
    ['University Name', university.fullName],
    ['Short Form', university.shortForm],
    ['Country', university.country],
    ['Established', university.establishedYear ? `${university.establishedYear}` : '—'],
  ] : [];

  const counts = useMemo(() => {
    const assigned = filteredStudents.filter((s) => s.internshipCompanyId != null).length;
    return {
      total: filteredStudents.length,
      assigned,
      pending: filteredStudents.length - assigned,
    };
  }, [filteredStudents]);

  async function handleAssignSubmit(event) {
    event.preventDefault();
    setError('');
    setNotice('');
    setAssignLoading(true);
    try {
      await updateStudent(assignForm.studentId, {
        internshipCompanyId: assignForm.internshipCompanyId || null,
        uniSupervisorId: assignForm.uniSupervisorId || null,
        indSupervisorId: assignForm.indSupervisorId || null,
      });
      setAssignForm(emptyAssignForm);
      setNotice('Placement assigned successfully.');
      await loadStudents();
    } catch (err) {
      setError(err.message || 'Unable to assign placement.');
    } finally {
      setAssignLoading(false);
    }
  }

  async function handleEditSave(payload) {
    await updateStudent(editStudent.id, payload);
    setNotice('Student updated successfully.');
    await loadStudents();
  }

  async function handleDelete(id) {
    if (!window.confirm('Delete this student?')) return;
    setError('');
    setNotice('');
    try {
      await deleteStudent(id);
      setNotice('Student deleted successfully.');
      await loadStudents();
    } catch (err) {
      setError(err.message || 'Unable to delete student.');
    }
  }

  function getCompanyName(student) {
    if (!student.internshipCompanyId) return '—';
    const match = companies.find((c) => String(c.id) === String(student.internshipCompanyId));
    return match ? match.name : `Company #${student.internshipCompanyId}`;
  }

  function renderStudentRow(student) {
    return (
      <tr key={student.id} className="hover:bg-slate-50/80 transition-colors">
        <td className="py-3.5 px-3 pl-5">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-teal-50 text-teal-700 border border-teal-200 flex items-center justify-center shrink-0 shadow-xs">
              <GraduationCap className="w-4 h-4" />
            </div>
            <span className="font-bold text-slate-900">{student.fullName}</span>
          </div>
        </td>
        <td className="py-3.5 px-3 text-xs text-slate-600">{student.username}</td>
        <td className="py-3.5 px-3 text-xs text-slate-600">{student.studentNumber}</td>
        <td className="py-3.5 px-3 text-xs text-slate-600">{student.degreeProgram}</td>
        <td className="py-3.5 px-3 text-xs text-slate-600">{student.yearOfStudy}</td>
        <td className="py-3.5 px-3">
          {student.internshipCompanyId ? (
            <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-700">
              <Building2 className="w-3.5 h-3.5 text-slate-400" />
              {getCompanyName(student)}
            </span>
          ) : (
            <span className="text-xs text-slate-400">—</span>
          )}
        </td>
        <td className="py-3.5 px-3 pr-5 text-right">
          <ul className="flex items-center justify-end gap-1 list-none p-0 m-0">
            <li>
              <button
                type="button"
                onClick={() => setEditStudent(student)}
                className="p-1.5 text-emerald-600 hover:text-emerald-800 hover:bg-emerald-50 rounded-lg transition-colors focus-visible:ring-2 focus-visible:ring-emerald-600 focus-visible:outline-none"
                aria-label="Edit student"
                title="Edit"
              >
                <Pencil className="w-4 h-4" />
              </button>
            </li>
            <li>
              <button
                type="button"
                onClick={() => handleDelete(student.id)}
                className="p-1.5 text-rose-600 hover:text-rose-800 hover:bg-rose-50 rounded-lg transition-colors focus-visible:ring-2 focus-visible:ring-rose-600 focus-visible:outline-none"
                aria-label="Delete student"
                title="Delete"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </li>
          </ul>
        </td>
      </tr>
    );
  }

  function renderAllStudentsTable(list) {
    return (
      <div className="overflow-x-auto custom-scrollbar">
        <table className="w-full text-left border-collapse" style={{ minWidth: '850px' }} aria-label="Students list">
          <thead>
            <tr className="border-b border-slate-200 bg-slate-50/90 text-[11px] font-bold tracking-wider text-slate-800">
              <th scope="col" className="py-3.5 px-3 pl-5">Name</th>
              <th scope="col" className="py-3.5 px-3">Username</th>
              <th scope="col" className="py-3.5 px-3">Student Number</th>
              <th scope="col" className="py-3.5 px-3">Program</th>
              <th scope="col" className="py-3.5 px-3">Year</th>
              <th scope="col" className="py-3.5 px-3">Company</th>
              <th scope="col" className="py-3.5 px-3 pr-5 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 text-sm">
            {list.length > 0 ? (
              list.map((student) => renderStudentRow(student))
            ) : (
              <tr>
                <td colSpan={7} className="py-12 px-4 text-center">
                  <div className="max-w-sm mx-auto flex flex-col items-center">
                    <div className="w-12 h-12 rounded-full bg-slate-100 border border-slate-200 flex items-center justify-center text-slate-400 mb-3">
                      <GraduationCap className="w-6 h-6" />
                    </div>
                    <h3 className="text-base font-bold text-slate-800">No students</h3>
                    <p className="text-xs text-slate-500 mt-1">No students found.</p>
                  </div>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    );
  }

  function renderBySchool() {
    return (
      <div className="space-y-3">
        {topUnits.length > 0 ? (
          topUnits.map((unit) => {
            const children = childUnitsMap[unit.schoolId] || [];
            const unitStudents = studentsByUnit[String(unit.schoolId)] || [];
            const childStudentCount = children.reduce(
              (sum, child) => sum + (studentsByUnit[String(child.schoolId)] || []).length, 0
            );
            const totalCount = unitStudents.length + childStudentCount;
            const isExpanded = expandedUnits[unit.schoolId];

            return (
              <div key={unit.schoolId} className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
                <button
                  type="button"
                  onClick={() => toggleUnit(unit.schoolId)}
                  className="w-full px-5 py-4 flex items-center justify-between hover:bg-slate-50/80 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-700 border border-blue-200 flex items-center justify-center">
                      <School className="w-4 h-4" />
                    </div>
                    <div className="text-left">
                      <div className="text-sm font-bold text-slate-900">{unit.schoolName}</div>
                      <div className="text-[11px] text-slate-500">
                        {unit.schoolCode} &middot; {totalCount} student{totalCount !== 1 ? 's' : ''}
                      </div>
                    </div>
                  </div>
                  {isExpanded ? <ChevronDown className="w-4 h-4 text-slate-400" /> : <ChevronRight className="w-4 h-4 text-slate-400" />}
                </button>

                {isExpanded && (
                  <div className="border-t border-slate-200">
                    {unitStudents.length > 0 ? (
                      renderAllStudentsTable(unitStudents)
                    ) : (
                      <div className="py-6 text-center text-xs text-slate-400">No students in this school</div>
                    )}

                    {children.map((child) => {
                      const childStudents = studentsByUnit[String(child.schoolId)] || [];
                      const childExpanded = expandedUnits[child.schoolId];
                      return (
                        <div key={child.schoolId} className="border-t border-slate-100">
                          <button
                            type="button"
                            onClick={() => toggleUnit(child.schoolId)}
                            className="w-full px-5 py-3 flex items-center justify-between hover:bg-slate-50/80 transition-colors pl-12"
                          >
                            <div className="flex items-center gap-2">
                              <div className="text-xs font-bold text-slate-700">{child.schoolName}</div>
                              <span className="text-[10px] text-slate-400">({childStudents.length})</span>
                            </div>
                            {childExpanded ? <ChevronDown className="w-3 h-3 text-slate-400" /> : <ChevronRight className="w-3 h-3 text-slate-400" />}
                          </button>
                          {childExpanded && childStudents.length > 0 && (
                            renderAllStudentsTable(childStudents)
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })
        ) : (
          renderAllStudentsTable(filteredStudents)
        )}

        {(studentsByUnit['unassigned'] || []).length > 0 && (
          <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
            <div className="px-5 py-4 border-b border-slate-200">
              <h3 className="text-sm font-bold text-slate-900">Unassigned Students</h3>
              <p className="text-[11px] text-slate-500">Students not yet assigned to an academic unit</p>
            </div>
            {renderAllStudentsTable(studentsByUnit['unassigned'])}
          </div>
        )}
      </div>
    );
  }

  function renderStudents() {
    if (loading) {
      return (
        <div className="flex items-center gap-2 text-xs text-slate-500 font-medium">
          <div className="w-4 h-4 border-2 border-teal-600 border-t-transparent rounded-full animate-spin" />
          <span>Loading students...</span>
        </div>
      );
    }
    return (
      <>
        <div className="grid grid-cols-3 gap-4">
          <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs">
            <div className="text-2xl font-extrabold text-slate-900">{counts.total}</div>
            <div className="text-xs font-semibold text-slate-500">Total Students</div>
          </div>
          <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs">
            <div className="text-2xl font-extrabold text-slate-900">{counts.assigned}</div>
            <div className="text-xs font-semibold text-slate-500">Assigned to a Company</div>
          </div>
          <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs">
            <div className="text-2xl font-extrabold text-slate-900">{counts.pending}</div>
            <div className="text-xs font-semibold text-slate-500">Awaiting Placement</div>
          </div>
        </div>

        <div className="grid grid-cols-4 gap-4">
          <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs">
            <div className="text-2xl font-extrabold text-teal-700">{schools.length}</div>
            <div className="text-xs font-semibold text-slate-500">Schools</div>
          </div>
          <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs">
            <div className="text-2xl font-extrabold text-teal-700">{departments.length}</div>
            <div className="text-xs font-semibold text-slate-500">Departments</div>
          </div>
          <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs">
            <div className="text-2xl font-extrabold text-teal-700">{programmes.length}</div>
            <div className="text-xs font-semibold text-slate-500">Programmes</div>
          </div>
          <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs">
            <div className="text-2xl font-extrabold text-teal-700">{counts.total > 0 ? Math.round((counts.assigned / counts.total) * 100) : 0}%</div>
            <div className="text-xs font-semibold text-slate-500">Placement Rate</div>
          </div>
        </div>

        <section className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
          <div className="px-5 py-4 border-b border-slate-200">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-teal-50 border border-teal-200 flex items-center justify-center text-teal-700">
                  <GraduationCap className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900">My Students</h3>
                  <p className="text-[11px] text-slate-500">Students assigned under your supervision</p>
                </div>
              </div>
              <div className="flex items-center bg-slate-100 rounded-xl p-1">
                <button
                  type="button"
                  onClick={() => setStudentsViewMode('all')}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                    studentsViewMode === 'all'
                      ? 'bg-[#063b33] text-white shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <List className="w-3.5 h-3.5" />
                  All Students
                </button>
                <button
                  type="button"
                  onClick={() => setStudentsViewMode('bySchool')}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                    studentsViewMode === 'bySchool'
                      ? 'bg-[#063b33] text-white shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <School className="w-3.5 h-3.5" />
                  By School
                </button>
              </div>
            </div>
          </div>

          {selectedUnitId && (
            <div className="px-5 py-2 bg-teal-50/60 border-b border-teal-200/50 flex items-center gap-2">
              <span className="text-xs font-semibold text-teal-800">
                Filtered by: {getUnitName(parseInt(selectedUnitId, 10))}
              </span>
              <a href="/university/dashboard" className="text-xs font-bold text-teal-600 hover:text-teal-800 underline">Clear filter</a>
            </div>
          )}

          {studentsViewMode === 'all' ? renderAllStudentsTable(filteredStudents) : renderBySchool()}
        </section>
      </>
    );
  }

  function renderCredentials() {
    const selectClass = "w-full bg-white text-slate-900 text-xs rounded-xl border border-slate-300 px-3.5 py-2.5 focus:border-teal-600 focus:ring-2 focus:ring-teal-600/20 focus:outline-none transition-all shadow-xs font-medium";
    return (
      <section className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-xl bg-teal-50 border border-teal-200 flex items-center justify-center text-teal-700">
            <UserPlus className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-slate-900">Assign Student Placement</h3>
            <p className="text-[11px] text-slate-500">Attach a registered student to a company and supervisors.</p>
          </div>
        </div>
        {allStudents.length === 0 ? (
          <p className="text-xs text-slate-500">No students available to assign yet.</p>
        ) : (
        <form onSubmit={handleAssignSubmit} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label htmlFor="assign-student" className="block text-xs font-bold uppercase tracking-wider text-slate-800 mb-1.5">
                Student <span className="text-rose-600">*</span>
              </label>
              <select
                id="assign-student"
                value={assignForm.studentId}
                onChange={(e) => setAssignForm({ ...assignForm, studentId: e.target.value })}
                required
                className={selectClass}
              >
                <option value="">Select student…</option>
                {allStudents.map((st) => (
                  <option key={st.id} value={st.id}>
                    {(st.fullName || [st.firstName, st.lastName].filter(Boolean).join(' '))} ({st.studentNumber})
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label htmlFor="assign-company" className="block text-xs font-bold uppercase tracking-wider text-slate-800 mb-1.5">
                Company
              </label>
              <select
                id="assign-company"
                value={assignForm.internshipCompanyId}
                onChange={(e) => setAssignForm({ ...assignForm, internshipCompanyId: e.target.value })}
                className={selectClass}
              >
                <option value="">None (pending)</option>
                {companies.map((c) => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label htmlFor="assign-uni-supervisor" className="block text-xs font-bold uppercase tracking-wider text-slate-800 mb-1.5">
                University Supervisor
              </label>
              <select
                id="assign-uni-supervisor"
                value={assignForm.uniSupervisorId}
                onChange={(e) => setAssignForm({ ...assignForm, uniSupervisorId: e.target.value })}
                className={selectClass}
              >
                <option value="">None</option>
                {uniSupervisorRows.map((sup) => (
                  <option key={sup.id} value={sup.id}>{sup.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label htmlFor="assign-ind-supervisor" className="block text-xs font-bold uppercase tracking-wider text-slate-800 mb-1.5">
                Industrial Supervisor
              </label>
              <select
                id="assign-ind-supervisor"
                value={assignForm.indSupervisorId}
                onChange={(e) => setAssignForm({ ...assignForm, indSupervisorId: e.target.value })}
                className={selectClass}
              >
                <option value="">None</option>
                {indSupervisorRows.map((sup) => (
                  <option key={sup.id} value={sup.id}>{sup.name}</option>
                ))}
              </select>
            </div>
          </div>
          <div className="flex justify-end pt-2">
            <button
              type="submit"
              disabled={assignLoading || !assignForm.studentId}
              className="h-9 px-3.5 py-2 rounded-xl bg-[#063b33] hover:bg-[#042823] text-white text-xs font-bold shadow-xs transition-all flex items-center gap-1.5 focus-visible:ring-2 focus-visible:ring-teal-600 focus-visible:outline-none disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <UserPlus className="w-4 h-4" />
              {assignLoading ? 'Saving...' : 'Assign Placement'}
            </button>
          </div>
        </form>
        )}
      </section>
    );
  }

  function renderAcademicStructure() {
    return (
      <div className="space-y-6">
        <section className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
          <div className="px-5 py-4 border-b border-slate-200">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-blue-50 border border-blue-200 flex items-center justify-center text-blue-700">
                <School className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-900">Schools</h3>
                <p className="text-[11px] text-slate-500">{schools.length} school{schools.length !== 1 ? 's' : ''} registered</p>
              </div>
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50/90 text-[11px] font-bold tracking-wider text-slate-800">
                  <th className="py-3 px-4">ID</th>
                  <th className="py-3 px-4">Name</th>
                  <th className="py-3 px-4">Code</th>
                  <th className="py-3 px-4">Type</th>
                  <th className="py-3 px-4">Students</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-sm">
                {schools.map((s) => (
                  <tr key={s.schoolId} className="hover:bg-slate-50/80">
                    <td className="py-3 px-4 text-xs text-slate-600">{s.schoolId}</td>
                    <td className="py-3 px-4 text-xs font-semibold text-slate-900">{s.schoolName}</td>
                    <td className="py-3 px-4 text-xs text-slate-600">{s.schoolCode || '—'}</td>
                    <td className="py-3 px-4 text-xs text-slate-600">{s.type || '—'}</td>
                    <td className="py-3 px-4 text-xs text-slate-600">
                      {allStudents.filter((st) => String(st.schoolId) === String(s.schoolId)).length}
                    </td>
                  </tr>
                ))}
                {schools.length === 0 && (
                  <tr><td colSpan={5} className="py-8 text-center text-xs text-slate-400">No schools found</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </section>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <section className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
            <div className="px-5 py-4 border-b border-slate-200">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-violet-50 border border-violet-200 flex items-center justify-center text-violet-700">
                  <ListChecks className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900">Departments</h3>
                  <p className="text-[11px] text-slate-500">{departments.length} department{departments.length !== 1 ? 's' : ''}</p>
                </div>
              </div>
            </div>
            <div className="max-h-72 overflow-y-auto">
              <table className="w-full text-left border-collapse">
                <thead className="sticky top-0 bg-slate-50/90">
                  <tr className="border-b border-slate-200 text-[11px] font-bold tracking-wider text-slate-800">
                    <th className="py-2.5 px-4">Name</th>
                    <th className="py-2.5 px-4">School</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-sm">
                  {departments.map((d) => {
                    const school = schools.find((s) => String(s.schoolId) === String(d.schoolId));
                    return (
                      <tr key={d.departmentId} className="hover:bg-slate-50/80">
                        <td className="py-2.5 px-4 text-xs font-semibold text-slate-900">{d.departmentName}</td>
                        <td className="py-2.5 px-4 text-xs text-slate-600">{school ? school.schoolName : '—'}</td>
                      </tr>
                    );
                  })}
                  {departments.length === 0 && (
                    <tr><td colSpan={2} className="py-6 text-center text-xs text-slate-400">No departments</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </section>

          <section className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
            <div className="px-5 py-4 border-b border-slate-200">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-amber-50 border border-amber-200 flex items-center justify-center text-amber-700">
                  <BookOpen className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900">Programmes</h3>
                  <p className="text-[11px] text-slate-500">{programmes.length} programme{programmes.length !== 1 ? 's' : ''}</p>
                </div>
              </div>
            </div>
            <div className="max-h-72 overflow-y-auto">
              <table className="w-full text-left border-collapse">
                <thead className="sticky top-0 bg-slate-50/90">
                  <tr className="border-b border-slate-200 text-[11px] font-bold tracking-wider text-slate-800">
                    <th className="py-2.5 px-4">Name</th>
                    <th className="py-2.5 px-4">Code</th>
                    <th className="py-2.5 px-4">Level</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-sm">
                  {programmes.map((p) => (
                    <tr key={p.programmeId} className="hover:bg-slate-50/80">
                      <td className="py-2.5 px-4 text-xs font-semibold text-slate-900">{p.programmeName}</td>
                      <td className="py-2.5 px-4 text-xs text-slate-600">{p.programmeCode}</td>
                      <td className="py-2.5 px-4 text-xs text-slate-600">{p.programmeLevel}</td>
                    </tr>
                  ))}
                  {programmes.length === 0 && (
                    <tr><td colSpan={3} className="py-6 text-center text-xs text-slate-400">No programmes</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </section>
        </div>
      </div>
    );
  }

  async function handleDiaryReview(event) {
    event.preventDefault();
    if (!reviewDiary) return;
    setError('');
    setNotice('');
    try {
      await submitDiaryFeedback(reviewDiary.id, {
        status: reviewForm.status,
        feedback: reviewForm.feedback,
      });
      setNotice('Diary review saved.');
      setReviewDiary(null);
      setReviewForm({ status: 'APPROVED', feedback: '' });
      await loadStats();
    } catch (err) {
      setError(err.message || 'Unable to save diary review.');
    }
  }

  function renderCompaniesAndPlacements() {
    const companies = stats?.companies?.companies || [];
    const byStatus = stats?.placements?.byStatus || {};
    const statuses = ['ACTIVE', 'COMPLETED', 'PENDING', 'ASSIGNED', 'CANCELLED'];
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <section className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
            <div className="px-5 py-4 border-b border-slate-200">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-teal-50 border border-teal-200 flex items-center justify-center text-teal-700">
                  <Briefcase className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900">Companies Hosting Interns</h3>
                  <p className="text-[11px] text-slate-500">
                    {stats?.companies?.distinctCompanies || 0} distinct company/companies
                  </p>
                </div>
              </div>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50/90 text-[11px] font-bold tracking-wider text-slate-800">
                    <th className="py-3 px-4">Company</th>
                    <th className="py-3 px-4">Interns</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-sm">
                  {companies.length > 0 ? companies.map((c) => (
                    <tr key={c.id} className="hover:bg-slate-50/80">
                      <td className="py-3 px-4 text-xs font-semibold text-slate-900">{c.companyName}</td>
                      <td className="py-3 px-4 text-xs text-slate-600">{c.internCount}</td>
                    </tr>
                  )) : (
                    <tr><td colSpan={2} className="py-8 text-center text-xs text-slate-400">No companies hosting interns yet</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </section>

          <section className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
            <div className="px-5 py-4 border-b border-slate-200">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-amber-50 border border-amber-200 flex items-center justify-center text-amber-700">
                  <ClipboardCheck className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900">Placement Status</h3>
                  <p className="text-[11px] text-slate-500">Distribution across the internship lifecycle</p>
                </div>
              </div>
            </div>
            <div className="p-5 space-y-3">
              {statuses.map((s) => {
                const n = byStatus[s] || 0;
                return (
                  <div key={s} className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-slate-700 uppercase">{s}</span>
                    <span className="inline-flex items-center justify-center min-w-9 px-2.5 py-1 text-xs font-extrabold text-slate-800 bg-slate-100 rounded-lg">{n}</span>
                  </div>
                );
              })}
              <div className="pt-2 flex items-center justify-between border-t border-slate-100">
                <span className="text-xs font-bold text-slate-900">Placement Rate</span>
                <span className="text-xs font-extrabold text-teal-700">{stats?.rosters?.placementRatePct ?? 0}%</span>
              </div>
              {Object.keys(byStatus).length === 0 && (
                <p className="text-xs text-slate-400">No placement data yet.</p>
              )}
            </div>
          </section>
        </div>
      </div>
    );
  }

  function renderAnalytics() {
    const a = stats?.analytics || {};
    const byYear = a.byYearOfStudy || [];
    const bySchool = a.bySchool || [];
    const byProgramme = a.byProgramme || [];
    const byCompany = a.byCompany || [];
    const byGender = a.byGender || [];
    const placementStatus = a.placementStatus || {};
    const diaryStatus = a.diaryStatus || {};
    const avgScores = a.avgScores || {};

    const placementPie = Object.entries(placementStatus)
      .map(([status, v]) => ({ name: status, value: typeof v === 'object' ? (v.count || 0) : (v || 0) }))
      .filter((d) => d.value > 0);
    const diaryPie = Object.entries(diaryStatus)
      .map(([status, v]) => ({ name: status, value: typeof v === 'object' ? (v.count || 0) : (v || 0) }))
      .filter((d) => d.value > 0);
    const scoreRadar = [
      { metric: 'Punctuality', value: avgScores.punctuality ?? 0 },
      { metric: 'Work Ethics', value: avgScores.practicalWorkEthics ?? 0 },
      { metric: 'Attendance', value: avgScores.attendance ?? 0 },
      { metric: 'Performance', value: avgScores.workplacePerformance ?? 0 },
    ];
    const hasScores = scoreRadar.some((d) => d.value > 0);

    const card = (title, subtitle, children) => (
      <section className="bg-white rounded-2xl border border-slate-200 shadow-xs p-5">
        <h3 className="text-sm font-bold text-slate-900 mb-0.5">{title}</h3>
        <p className="text-[11px] text-slate-500 mb-4">{subtitle}</p>
        {children}
      </section>
    );

    const empty = (msg) => (
      <div className="h-48 flex items-center justify-center text-xs text-slate-400">{msg}</div>
    );

    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {card('Students by Year of Study', 'Headcount per academic year', (
            byYear.length ? (
              <ResponsiveContainer width="100%" height={240}>
                <BarChart data={byYear} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                  <XAxis dataKey="year" tick={{ fontSize: 12 }} />
                  <YAxis allowDecimals={false} tick={{ fontSize: 12 }} />
                  <Tooltip />
                  <Bar dataKey="count" fill="#0d9488" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : empty('No student data yet')
          ))}

          {card('Gender Breakdown', 'Male / female split of your interns', (
            byGender.length ? (
              <ResponsiveContainer width="100%" height={240}>
                <PieChart>
                  <Pie data={byGender} dataKey="count" nameKey="gender" cx="50%" cy="50%" outerRadius={90} label>
                    {byGender.map((_, i) => <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />)}
                  </Pie>
                  <Tooltip />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            ) : empty('No gender data yet')
          ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {card('Students by School', 'Placed vs total per school', (
            bySchool.length ? (
              <ResponsiveContainer width="100%" height={260}>
                <BarChart data={bySchool} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                  <XAxis dataKey="name" tick={{ fontSize: 10 }} interval={0} />
                  <YAxis allowDecimals={false} tick={{ fontSize: 12 }} />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey="count" name="Total" fill="#f59e0b" radius={[6, 6, 0, 0]} />
                  <Bar dataKey="assigned" name="Placed" fill="#0d9488" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : empty('No school data yet')
          ))}

          {card('Students by Programme', 'Headcount per programme', (
            byProgramme.length ? (
              <ResponsiveContainer width="100%" height={260}>
                <BarChart data={byProgramme} layout="vertical" margin={{ top: 5, right: 20, left: 10, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                  <XAxis type="number" allowDecimals={false} tick={{ fontSize: 12 }} />
                  <YAxis type="category" dataKey="programme" width={150} tick={{ fontSize: 10 }} />
                  <Tooltip />
                  <Bar dataKey="count" fill="#8b5cf6" radius={[0, 6, 6, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : empty('No programme data yet')
          ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {card('Interns per Company', 'Hosting companies ranked by intern count', (
            byCompany.length ? (
              <ResponsiveContainer width="100%" height={240}>
                <BarChart data={byCompany} layout="vertical" margin={{ top: 5, right: 20, left: 10, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                  <XAxis type="number" allowDecimals={false} tick={{ fontSize: 12 }} />
                  <YAxis type="category" dataKey="company" width={120} tick={{ fontSize: 10 }} />
                  <Tooltip />
                  <Bar dataKey="interns" fill="#0ea5e9" radius={[0, 6, 6, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : empty('No company data yet')
          ))}

          {card('Placement Status', 'Internship lifecycle distribution', (
            placementPie.length ? (
              <ResponsiveContainer width="100%" height={240}>
                <PieChart>
                  <Pie data={placementPie} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={90} label>
                    {placementPie.map((_, i) => <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />)}
                  </Pie>
                  <Tooltip />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            ) : empty('No placement data yet')
          ))}

          {card('Diary Review Status', 'Logbook entries by review state', (
            diaryPie.length ? (
              <ResponsiveContainer width="100%" height={240}>
                <PieChart>
                  <Pie data={diaryPie} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={90} label>
                    {diaryPie.map((_, i) => <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />)}
                  </Pie>
                  <Tooltip />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            ) : empty('No diary data yet')
          ))}
        </div>

        {card('Average Evaluation Scores', 'Mean scores across evaluation criteria (0-10)', (
          hasScores ? (
            <ResponsiveContainer width="100%" height={280}>
              <RadarChart data={scoreRadar} outerRadius={110}>
                <PolarGrid />
                <PolarAngleAxis dataKey="metric" tick={{ fontSize: 12 }} />
                <PolarRadiusAxis angle={30} domain={[0, 10]} />
                <Radar dataKey="value" stroke="#0d9488" fill="#0d9488" fillOpacity={0.4} />
                <Tooltip />
              </RadarChart>
            </ResponsiveContainer>
          ) : empty('No evaluation scores yet')
        ))}
      </div>
    );
  }

  function renderDiaries() {    const d = stats?.diaries || { totalEntries: 0, pendingReview: 0, reviewed: 0, recent: [] };
    const statCards = [
      ['Total Entries', d.totalEntries],
      ['Pending Review', d.pendingReview],
      ['Reviewed', d.reviewed],
    ];
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-3 gap-4">
          {statCards.map(([label, value]) => (
            <div key={label} className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs">
              <div className="text-2xl font-extrabold text-slate-900">{value}</div>
              <div className="text-xs font-semibold text-slate-500">{label}</div>
            </div>
          ))}
        </div>

        <section className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
          <div className="px-5 py-4 border-b border-slate-200">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-rose-50 border border-rose-200 flex items-center justify-center text-rose-700">
                <FileText className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-900">Recent Diary Submissions</h3>
                <p className="text-[11px] text-slate-500">Latest logbook entries from your students</p>
              </div>
            </div>
          </div>
          <div className="overflow-x-auto custom-scrollbar">
            <table className="w-full text-left border-collapse" style={{ minWidth: '700px' }} aria-label="Diary submissions">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50/90 text-[11px] font-bold tracking-wider text-slate-800">
                  <th className="py-3 px-4">Student</th>
                  <th className="py-3 px-4">Student No</th>
                  <th className="py-3 px-4">Date</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4">Feedback</th>
                  <th className="py-3 px-4 pr-5 text-right">Review</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-sm">
                {d.recent.length > 0 ? d.recent.map((row) => (
                  <tr key={row.id} className="hover:bg-slate-50/80">
                    <td className="py-3 px-4 text-xs font-semibold text-slate-900">{row.studentName}</td>
                    <td className="py-3 px-4 text-xs text-slate-600">{row.studentNo}</td>
                    <td className="py-3 px-4 text-xs text-slate-600">{row.date}</td>
                    <td className="py-3 px-4">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                        row.status === 'PENDING' ? 'bg-amber-50 text-amber-700'
                        : row.status === 'APPROVED' ? 'bg-emerald-50 text-emerald-700'
                        : 'bg-violet-50 text-violet-700'
                      }`}>
                        {row.status || 'PENDING'}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-xs text-slate-600">{row.hasFeedback ? 'Yes' : '—'}</td>
                    <td className="py-3 px-4 pr-5 text-right">
                      <button
                        type="button"
                        onClick={() => { setReviewDiary(row); setReviewForm({ status: row.status && row.status !== 'PENDING' ? row.status : 'APPROVED', feedback: '' }); }}
                        className="p-1.5 text-teal-600 hover:text-teal-800 hover:bg-teal-50 rounded-lg transition-colors"
                        aria-label="Review diary"
                        title="Review"
                      >
                        <ClipboardCheck className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                )) : (
                  <tr><td colSpan={6} className="py-10 text-center text-xs text-slate-400">No diary submissions yet</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    );
  }

  function renderEvaluations() {
    const e = stats?.evaluations || { totalEvaluations: 0, evaluatedStudents: 0, midTermReady: 0, finalReportReady: 0, byStudent: [], averageScores: {} };
    const statCards = [
      ['Evaluated Students', e.evaluatedStudents],
      ['Evaluations', e.totalEvaluations],
      ['Mid-term Ready', e.midTermReady],
      ['Final Report Ready', e.finalReportReady],
    ];
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {statCards.map(([label, value]) => (
            <div key={label} className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs">
              <div className="text-2xl font-extrabold text-slate-900">{value}</div>
              <div className="text-xs font-semibold text-slate-500">{label}</div>
            </div>
          ))}
        </div>

        <section className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
          <div className="px-5 py-4 border-b border-slate-200">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-violet-50 border border-violet-200 flex items-center justify-center text-violet-700">
                <Star className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-900">Evaluation & Progress</h3>
                <p className="text-[11px] text-slate-500">Per-student evaluation status and report milestones (5 = mid-term, 10 = final)</p>
              </div>
            </div>
          </div>
          <div className="overflow-x-auto custom-scrollbar">
            <table className="w-full text-left border-collapse" style={{ minWidth: '820px' }} aria-label="Evaluations">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50/90 text-[11px] font-bold tracking-wider text-slate-800">
                  <th className="py-3 px-4">Student</th>
                  <th className="py-3 px-4">Student No</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4">Diaries</th>
                  <th className="py-3 px-4">Mid-term</th>
                  <th className="py-3 px-4">Final Report</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-sm">
                {e.byStudent.length > 0 ? e.byStudent.map((s) => (
                  <tr key={s.studentId} className="hover:bg-slate-50/80">
                    <td className="py-3 px-4 text-xs font-semibold text-slate-900">{s.studentName}</td>
                    <td className="py-3 px-4 text-xs text-slate-600">{s.studentNo}</td>
                    <td className="py-3 px-4">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                        s.evaluated ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-600'
                      }`}>
                        {s.evaluated ? 'Evaluated' : 'Not Evaluated'}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-xs text-slate-600">{s.diaryCount}</td>
                    <td className="py-3 px-4 text-xs text-slate-600">{s.midTermReady ? '✓' : '—'}</td>
                    <td className="py-3 px-4 text-xs text-slate-600">{s.finalReportReady ? '✓' : '—'}</td>
                  </tr>
                )) : (
                  <tr><td colSpan={6} className="py-10 text-center text-xs text-slate-400">No students to show</td></tr>
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
      title="University Dashboard"
      subtitle={university ? `Welcome, ${university.fullName}` : 'Welcome,'}
      tabs={[
        { id: 'students', label: 'Students' },
        { id: 'analytics', label: 'Analytics' },
        { id: 'placements', label: 'Placements & Companies' },
        { id: 'diaries', label: 'Diaries' },
        { id: 'evaluations', label: 'Evaluations' },
        { id: 'academic', label: 'Academic Structure' },
      ]}
      activeTab={activeTab}
      onTabChange={setActiveTab}
    >
      <div className="space-y-6 max-w-7xl mx-auto">

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

        {university && (
          <section className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-xl bg-teal-50 border border-teal-200 flex items-center justify-center text-teal-700">
                <Building2 className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-900">{university.fullName}</h3>
                <p className="text-[11px] text-slate-500">University Profile</p>
              </div>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              {universityDetails.map(([label, value]) => (
                <div key={label} className="bg-slate-50 rounded-xl p-3 border border-slate-200">
                  <div className="text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1">{label}</div>
                  <div className="text-sm font-bold text-slate-900">{value || '—'}</div>
                </div>
              ))}
            </div>
          </section>
        )}

        {activeTab === 'students' && renderStudents()}
        {activeTab === 'analytics' && renderAnalytics()}
        {activeTab === 'placements' && (<>
          {renderCompaniesAndPlacements()}
          {renderCredentials()}
        </>)}
        {activeTab === 'diaries' && renderDiaries()}
        {activeTab === 'evaluations' && renderEvaluations()}
        {activeTab === 'academic' && renderAcademicStructure()}
      </div>

      {editStudent && (
        <StudentEditModal
          student={editStudent}
          title={`Edit Student: ${editStudent.fullName}`}
          onClose={() => setEditStudent(null)}
          onSubmit={handleEditSave}
          companies={companies}
          supervisors={supervisors}
        />
      )}

      {reviewDiary && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/40" onClick={() => setReviewDiary(null)} />
          <form onSubmit={handleDiaryReview} className="relative w-full max-w-lg bg-white rounded-2xl border border-slate-200 shadow-xl p-6 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-teal-50 border border-teal-200 flex items-center justify-center text-teal-700">
                  <ClipboardCheck className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900">Review Diary</h3>
                  <p className="text-[11px] text-slate-500">{reviewDiary.studentName} · {reviewDiary.date}</p>
                </div>
              </div>
              <button type="button" onClick={() => setReviewDiary(null)} className="text-slate-400 hover:text-slate-700 p-1 rounded" aria-label="Close">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-800 mb-1.5">Status</label>
              <select
                value={reviewForm.status}
                onChange={(e) => setReviewForm({ ...reviewForm, status: e.target.value })}
                className="w-full bg-white text-slate-900 text-xs rounded-xl border border-slate-300 px-3.5 py-2.5 focus:border-teal-600 focus:ring-2 focus:ring-teal-600/20 focus:outline-none transition-all shadow-xs font-medium"
              >
                <option value="APPROVED">Approved</option>
                <option value="NEEDS_REVISION">Needs Revision</option>
                <option value="PENDING">Pending</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-800 mb-1.5">Feedback</label>
              <textarea
                value={reviewForm.feedback}
                onChange={(e) => setReviewForm({ ...reviewForm, feedback: e.target.value })}
                rows={4}
                placeholder="Feedback to the student..."
                className="w-full bg-white text-slate-900 text-xs rounded-xl border border-slate-300 px-3.5 py-2.5 focus:border-teal-600 focus:ring-2 focus:ring-teal-600/20 focus:outline-none transition-all shadow-xs font-medium"
              />
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <button type="button" onClick={() => setReviewDiary(null)} className="h-9 px-3.5 py-2 rounded-xl border border-slate-300 text-slate-700 text-xs font-bold hover:bg-slate-50 transition-all">
                Cancel
              </button>
              <button type="submit" className="h-9 px-3.5 py-2 rounded-xl bg-[#063b33] hover:bg-[#042823] text-white text-xs font-bold shadow-xs transition-all flex items-center gap-1.5">
                <ClipboardCheck className="w-4 h-4" />
                Save Review
              </button>
            </div>
          </form>
        </div>
      )}
    </DashboardLayout>
  );
}
