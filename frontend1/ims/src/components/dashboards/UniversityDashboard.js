import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import DashboardLayout from '../DashboardLayout';
import StudentEditModal from '../StudentEditModal';
import { useAuth } from '../../context/AuthContext';
import {
  deleteStudent,
  fetchStudents,
  fetchCompanies,
  fetchSupervisors,
  fetchUniversity,
  fetchAcademicUnits,
  fetchUniversitySupervisors,
  fetchIndustrialSupervisors,
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
} from 'lucide-react';

const emptyAssignForm = {
  studentId: '',
  internshipCompanyId: '',
  uniSupervisorId: '',
  indSupervisorId: '',
};

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
  const [academicUnits, setAcademicUnits] = useState([]);
  const [expandedUnits, setExpandedUnits] = useState({});
  const [searchParams] = useSearchParams();
  const selectedUnitId = searchParams.get('unitId');

  useEffect(() => {
    loadStudents();
    loadCompanies();
    loadSupervisors();
    loadUniversity();
    loadAcademicUnits();
    loadUniSupervisorRows();
    loadIndSupervisorRows();
  }, []);

  async function loadStudents() {
    setLoading(true);
    setError('');
    try {
      setAllStudents(await fetchStudents());
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
      if (user.universityId) {
        const data = await fetchUniversity(user.universityId);
        setUniversity(data);
      }
    } catch (err) {
      console.error('Failed to load university', err);
    }
  }

  async function loadAcademicUnits() {
    try {
      if (user.universityId) {
        const data = await fetchAcademicUnits(user.universityId);
        setAcademicUnits(Array.isArray(data) ? data : []);
      }
    } catch (err) {
      console.error('Failed to load academic units', err);
    }
  }

  function toggleUnit(unitId) {
    setExpandedUnits((prev) => ({ ...prev, [unitId]: !prev[unitId] }));
  }

  function getUnitName(unitId) {
    if (!unitId) return 'Unassigned';
    const unit = academicUnits.find((u) => u.unitId === unitId);
    return unit ? unit.unitName : `Unit ${unitId}`;
  }

  const topUnits = useMemo(
    () => academicUnits.filter((u) => !u.parentUnitId),
    [academicUnits]
  );

  const childUnitsMap = useMemo(() => {
    const map = {};
    academicUnits.forEach((u) => {
      if (u.parentUnitId) {
        if (!map[u.parentUnitId]) map[u.parentUnitId] = [];
        map[u.parentUnitId].push(u);
      }
    });
    return map;
  }, [academicUnits]);

  const includedUnitIds = useMemo(() => {
    if (!selectedUnitId) return null;
    const ids = new Set([String(selectedUnitId)]);
    academicUnits.forEach((u) => {
      if (String(u.parentUnitId) === String(selectedUnitId)) {
        ids.add(String(u.unitId));
      }
    });
    return ids;
  }, [selectedUnitId, academicUnits]);

  const students = useMemo(
    () => allStudents,
    [allStudents]
  );

  const filteredStudents = useMemo(() => {
    if (!includedUnitIds) return students;
    return students.filter((s) => includedUnitIds.has(String(s.unitId)));
  }, [students, includedUnitIds]);

  const studentsByUnit = useMemo(() => {
    const map = {};
    filteredStudents.forEach((s) => {
      const key = s.unitId || 'unassigned';
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
    const assigned = filteredStudents.filter((s) => s.organisation && s.organisation !== 'Pending').length;
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
              <th scope="col" className="py-3.5 px-3">Email</th>
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
            const children = childUnitsMap[unit.unitId] || [];
            const unitStudents = studentsByUnit[String(unit.unitId)] || [];
            const childStudentCount = children.reduce(
              (sum, child) => sum + (studentsByUnit[String(child.unitId)] || []).length, 0
            );
            const totalCount = unitStudents.length + childStudentCount;
            const isExpanded = expandedUnits[unit.unitId];

            return (
              <div key={unit.unitId} className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
                <button
                  type="button"
                  onClick={() => toggleUnit(unit.unitId)}
                  className="w-full px-5 py-4 flex items-center justify-between hover:bg-slate-50/80 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-700 border border-blue-200 flex items-center justify-center">
                      <School className="w-4 h-4" />
                    </div>
                    <div className="text-left">
                      <div className="text-sm font-bold text-slate-900">{unit.unitName}</div>
                      <div className="text-[11px] text-slate-500">
                        {unit.shortForm} &middot; {totalCount} student{totalCount !== 1 ? 's' : ''}
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
                      <div className="py-6 text-center text-xs text-slate-400">No students in this unit</div>
                    )}

                    {children.map((child) => {
                      const childStudents = studentsByUnit[String(child.unitId)] || [];
                      const childExpanded = expandedUnits[child.unitId];
                      return (
                        <div key={child.unitId} className="border-t border-slate-100">
                          <button
                            type="button"
                            onClick={() => toggleUnit(child.unitId)}
                            className="w-full px-5 py-3 flex items-center justify-between hover:bg-slate-50/80 transition-colors pl-12"
                          >
                            <div className="flex items-center gap-2">
                              <div className="text-xs font-bold text-slate-700">{child.unitName}</div>
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
            <div className="text-xs font-semibold text-slate-500">Students Assigned to You</div>
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

  return (
    <DashboardLayout
      title="University Dashboard"
      subtitle={university ? `Welcome, ${university.fullName}` : 'Welcome,'}
      tabs={[
        { id: 'students', label: 'Students' },
        { id: 'credentials', label: 'Placements' },
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

        {activeTab === 'students' ? renderStudents() : renderCredentials()}
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
    </DashboardLayout>
  );
}
