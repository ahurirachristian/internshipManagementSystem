import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  GraduationCap,
  ChevronDown,
  ChevronRight,
  Plus,
  X,
  AlertCircle,
  CheckCircle,
  Search,
  Building2,
  Pencil,
  Trash2,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import {
  fetchStudents,
  fetchSchools,
  fetchCompanies,
  createStudent,
  updateStudent,
  deleteStudent,
} from '../services/api';
import StudentEditModal from './StudentEditModal';

const emptyStudentForm = {
  studentName: '',
  studentNo: '',
  regNo: '',
  intake: '',
  program: '',
  courseName: '',
  mobileNo: '',
  email: '',
  yearOfStudy: '1',
  academicYear: 'One',
  semester: 'One',
  organisation: '',
  location: '',
  academicSupervisor: '',
  academicSupervisorContact: '',
  fieldSupervisor: '',
  fieldSupervisorContact: '',
  startDate: '',
  endDate: '',
  unitId: '',
  courseId: '',
};

export default function UniversityStudents() {
  const { user } = useAuth();
  const [searchParams] = useSearchParams();
  const selectedUnitId = searchParams.get('unitId');
  const [allStudents, setAllStudents] = useState([]);
  const [schools, setSchools] = useState([]);
  const [companies, setCompanies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedUnits, setExpandedUnits] = useState({});
  const [showAddForm, setShowAddForm] = useState(false);
  const [schoolFilter, setSchoolFilter] = useState(null);
  const [addForm, setAddForm] = useState(emptyStudentForm);
  const [addLoading, setAddLoading] = useState(false);
  const [editStudent, setEditStudent] = useState(null);

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    setLoading(true);
    setError('');
    try {
      const [studentsData, unitsData, companiesData] = await Promise.all([
        fetchStudents(),
        user.universityId ? fetchSchools() : Promise.resolve([]),
        fetchCompanies(),
      ]);
      setAllStudents(Array.isArray(studentsData) ? studentsData : []);
      setSchools(Array.isArray(unitsData) ? unitsData : []);
      setCompanies(Array.isArray(companiesData) ? companiesData : []);
    } catch (err) {
      setError(err.message || 'Unable to load data.');
    } finally {
      setLoading(false);
    }
  }

  // Build set of unit IDs to include (selected unit + its children)
  const includedUnitIds = useMemo(() => {
    if (!selectedUnitId) return null; // null = no filter
    const ids = new Set([String(selectedUnitId)]);
    // Also include child units
    schools.forEach((u) => {
      if (String(u.parentSchoolId) === String(selectedUnitId)) {
        ids.add(String(u.schoolId));
      }
    });
    return ids;
  }, [selectedUnitId, schools]);

  const myStudents = useMemo(() => {
    let list = allStudents;
    if (includedUnitIds) {
      list = list.filter((s) => includedUnitIds.has(String(s.schoolId)));
    }
    return list;
  }, [allStudents, includedUnitIds]);

  const filteredStudents = useMemo(() => {
    let list = myStudents;
    // School filter
    if (schoolFilter) {
      if (schoolFilter === 'unassigned') {
        list = list.filter((s) => !s.schoolId);
      } else {
        const filterId = String(schoolFilter);
        const childIds = schools
          .filter((u) => String(u.parentSchoolId) === filterId)
          .map((u) => String(u.schoolId));
        const includeIds = new Set([filterId, ...childIds]);
        list = list.filter((s) => includeIds.has(String(s.schoolId)));
      }
    }
    // Search filter
    const q = searchQuery.toLowerCase().trim();
    if (q) {
      list = list.filter((s) =>
        ((s.firstName || '') + ' ' + (s.lastName || '')).toLowerCase().includes(q) ||
        (s.studentNumber || '').toLowerCase().includes(q) ||
        (s.username || '').toLowerCase().includes(q) ||
        (s.degreeProgram || '').toLowerCase().includes(q) ||
        (s.internshipCompanyId ? String(s.internshipCompanyId) : '').toLowerCase().includes(q)
      );
    }
    return list;
  }, [myStudents, searchQuery, schoolFilter, schools]);

  const unitsByParent = useMemo(() => {
    const map = {};
    schools.forEach((u) => {
      const key = u.parentSchoolId || 'root';
      if (!map[key]) map[key] = [];
      map[key].push(u);
    });
    return map;
  }, [schools]);

  const studentsByUnit = useMemo(() => {
    const map = {};
    filteredStudents.forEach((s) => {
      const key = s.schoolId || 'unassigned';
      if (!map[key]) map[key] = [];
      map[key].push(s);
    });
    return map;
  }, [filteredStudents]);

  const topUnits = unitsByParent['root'] || [];

  function toggleUnit(unitId) {
    setExpandedUnits((prev) => ({ ...prev, [unitId]: !prev[unitId] }));
  }

  async function handleAddStudent(event) {
    event.preventDefault();
    setError('');
    setNotice('');
    setAddLoading(true);
    try {
      // M3: POST /api/students now speaks the Model-B students table.
      const fullName = (addForm.studentName || '').trim();
      const spaceIdx = fullName.indexOf(' ');
      const payload = {
        username: (addForm.studentNo || '').trim(),
        firstName: spaceIdx > 0 ? fullName.slice(0, spaceIdx) : fullName,
        lastName: spaceIdx > 0 ? fullName.slice(spaceIdx + 1).trim() : '',
        studentNumber: (addForm.studentNo || '').trim(),
        registrationNumber: (addForm.regNo || '').trim() || 'Pending',
        degreeProgram: (addForm.program || '').trim() || 'Undeclared',
        yearOfStudy: addForm.yearOfStudy ? parseInt(addForm.yearOfStudy, 10) : null,
        phoneNumber: (addForm.mobileNo || '').trim() || null,
        intake: (addForm.intake || '').trim() || null,
        academicYear: (addForm.academicYear || '').trim() || null,
        semester: (addForm.semester || '').trim() || null,
        startDate: (addForm.startDate || '').trim() || null,
        endDate: (addForm.endDate || '').trim() || null,
      };

      await createStudent(payload);
      setAddForm(emptyStudentForm);
      setShowAddForm(false);
      setNotice('Student created successfully.');
      await loadData();
    } catch (err) {
      setError(err.message || 'Unable to create student.');
    } finally {
      setAddLoading(false);
    }
  }

  async function handleEditSave(payload) {
    await updateStudent(editStudent.id, payload);
    setNotice('Student updated successfully.');
    setEditStudent(null);
    await loadData();
  }

  async function handleDelete(id) {
    if (!window.confirm('Delete this student?')) return;
    try {
      await deleteStudent(id);
      setNotice('Student deleted successfully.');
      await loadData();
    } catch (err) {
      setError(err.message || 'Unable to delete student.');
    }
  }

  function getUnitName(unitId) {
    if (!unitId) return 'Unassigned';
    const unit = schools.find((u) => u.schoolId === unitId);
    return unit ? unit.unitName : `Unit ${unitId}`;
  }

  function renderStudentRow(student) {
    return (
      <tr key={student.id} className="hover:bg-slate-50/80 transition-colors">
        <td className="py-3 px-4 pl-6">
          <div className="flex items-center gap-3">
            <div className="w-7 h-7 rounded-lg bg-teal-50 text-teal-700 border border-teal-200 flex items-center justify-center shrink-0">
              <GraduationCap className="w-3.5 h-3.5" />
            </div>
            <span className="font-bold text-slate-900 text-sm">{student.fullName}</span>
          </div>
        </td>
        <td className="py-3 px-4 text-xs text-slate-600">{student.studentNumber}</td>
        <td className="py-3 px-4 text-xs text-slate-600">{student.username}</td>
        <td className="py-3 px-4 text-xs text-slate-600">{student.degreeProgram}</td>
        <td className="py-3 px-4 text-xs text-slate-600">{student.internshipCompanyId ? `Company #${student.internshipCompanyId}` : '—'}</td>
        <td className="py-3 px-4 text-right">
          <div className="flex items-center justify-end gap-1">
            <button
              type="button"
              onClick={() => setEditStudent(student)}
              className="p-1.5 text-emerald-600 hover:text-emerald-800 hover:bg-emerald-50 rounded-lg transition-colors"
              title="Edit"
            >
              <Pencil className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              onClick={() => handleDelete(student.id)}
              className="p-1.5 text-rose-600 hover:text-rose-800 hover:bg-rose-50 rounded-lg transition-colors"
              title="Delete"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          </div>
        </td>
      </tr>
    );
  }

  function renderAddForm() {
    return (
      <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-teal-50 border border-teal-200 flex items-center justify-center text-teal-700">
              <Plus className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900">Add New Student</h3>
              <p className="text-[11px] text-slate-500">Fill in all required fields to register a new student</p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setShowAddForm(false)}
            className="p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
        <form onSubmit={handleAddStudent} className="space-y-4">
          {/* Personal Info */}
          <div className="text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1">Personal Information</div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Student Name *</label>
              <input
                value={addForm.studentName}
                onChange={(e) => setAddForm({ ...addForm, studentName: e.target.value })}
                required
                className="w-full text-xs rounded-xl border border-slate-300 px-3 py-2 focus:border-teal-600 focus:ring-2 focus:ring-teal-600/20 focus:outline-none"
                placeholder="e.g. John Doe"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Student Number *</label>
              <input
                value={addForm.studentNo}
                onChange={(e) => setAddForm({ ...addForm, studentNo: e.target.value })}
                required
                className="w-full text-xs rounded-xl border border-slate-300 px-3 py-2 focus:border-teal-600 focus:ring-2 focus:ring-teal-600/20 focus:outline-none"
                placeholder="e.g. 2400101005"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Registration Number *</label>
              <input
                value={addForm.regNo}
                onChange={(e) => setAddForm({ ...addForm, regNo: e.target.value })}
                required
                className="w-full text-xs rounded-xl border border-slate-300 px-3 py-2 focus:border-teal-600 focus:ring-2 focus:ring-teal-600/20 focus:outline-none"
                placeholder="e.g. 2024/AUG/BCS/B23629S/DAY"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Email *</label>
              <input
                type="email"
                value={addForm.email}
                onChange={(e) => setAddForm({ ...addForm, email: e.target.value })}
                required
                className="w-full text-xs rounded-xl border border-slate-300 px-3 py-2 focus:border-teal-600 focus:ring-2 focus:ring-teal-600/20 focus:outline-none"
                placeholder="e.g. john@example.com"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Mobile Number</label>
              <input
                value={addForm.mobileNo}
                onChange={(e) => setAddForm({ ...addForm, mobileNo: e.target.value })}
                className="w-full text-xs rounded-xl border border-slate-300 px-3 py-2 focus:border-teal-600 focus:ring-2 focus:ring-teal-600/20 focus:outline-none"
                placeholder="e.g. 0757402058"
              />
            </div>
          </div>

          {/* Academic Info */}
          <div className="text-[10px] font-bold uppercase tracking-wider text-slate-500 mt-4 mb-1">Academic Information</div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Intake *</label>
              <input
                value={addForm.intake}
                onChange={(e) => setAddForm({ ...addForm, intake: e.target.value })}
                required
                className="w-full text-xs rounded-xl border border-slate-300 px-3 py-2 focus:border-teal-600 focus:ring-2 focus:ring-teal-600/20 focus:outline-none"
                placeholder="e.g. AUG/2024"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Program *</label>
              <input
                value={addForm.program}
                onChange={(e) => setAddForm({ ...addForm, program: e.target.value })}
                required
                className="w-full text-xs rounded-xl border border-slate-300 px-3 py-2 focus:border-teal-600 focus:ring-2 focus:ring-teal-600/20 focus:outline-none"
                placeholder="e.g. BSCCS"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Course Name *</label>
              <input
                value={addForm.courseName}
                onChange={(e) => setAddForm({ ...addForm, courseName: e.target.value })}
                required
                className="w-full text-xs rounded-xl border border-slate-300 px-3 py-2 focus:border-teal-600 focus:ring-2 focus:ring-teal-600/20 focus:outline-none"
                placeholder="e.g. Internship"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Year of Study</label>
              <input
                value={addForm.yearOfStudy}
                onChange={(e) => setAddForm({ ...addForm, yearOfStudy: e.target.value })}
                className="w-full text-xs rounded-xl border border-slate-300 px-3 py-2 focus:border-teal-600 focus:ring-2 focus:ring-teal-600/20 focus:outline-none"
                placeholder="e.g. 3"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Academic Year</label>
              <input
                value={addForm.academicYear}
                onChange={(e) => setAddForm({ ...addForm, academicYear: e.target.value })}
                className="w-full text-xs rounded-xl border border-slate-300 px-3 py-2 focus:border-teal-600 focus:ring-2 focus:ring-teal-600/20 focus:outline-none"
                placeholder="e.g. Three"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Semester</label>
              <input
                value={addForm.semester}
                onChange={(e) => setAddForm({ ...addForm, semester: e.target.value })}
                className="w-full text-xs rounded-xl border border-slate-300 px-3 py-2 focus:border-teal-600 focus:ring-2 focus:ring-teal-600/20 focus:outline-none"
                placeholder="e.g. Two"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Academic Unit</label>
              <select
                value={addForm.unitId}
                onChange={(e) => setAddForm({ ...addForm, unitId: e.target.value })}
                className="w-full text-xs rounded-xl border border-slate-300 px-3 py-2 focus:border-teal-600 focus:ring-2 focus:ring-teal-600/20 focus:outline-none"
              >
                <option value="">Select unit...</option>
                {schools.map((u) => (
                  <option key={u.schoolId} value={u.schoolId}>{u.schoolName}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Start Date</label>
              <input
                type="date"
                value={addForm.startDate}
                onChange={(e) => setAddForm({ ...addForm, startDate: e.target.value })}
                className="w-full text-xs rounded-xl border border-slate-300 px-3 py-2 focus:border-teal-600 focus:ring-2 focus:ring-teal-600/20 focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">End Date</label>
              <input
                type="date"
                value={addForm.endDate}
                onChange={(e) => setAddForm({ ...addForm, endDate: e.target.value })}
                className="w-full text-xs rounded-xl border border-slate-300 px-3 py-2 focus:border-teal-600 focus:ring-2 focus:ring-teal-600/20 focus:outline-none"
              />
            </div>
          </div>

          {/* Placement Info */}
          <div className="text-[10px] font-bold uppercase tracking-wider text-slate-500 mt-4 mb-1">Placement Information</div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Organisation</label>
              <input
                value={addForm.organisation}
                onChange={(e) => setAddForm({ ...addForm, organisation: e.target.value })}
                className="w-full text-xs rounded-xl border border-slate-300 px-3 py-2 focus:border-teal-600 focus:ring-2 focus:ring-teal-600/20 focus:outline-none"
                placeholder="e.g. Airtel Uganda"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Location</label>
              <input
                value={addForm.location}
                onChange={(e) => setAddForm({ ...addForm, location: e.target.value })}
                className="w-full text-xs rounded-xl border border-slate-300 px-3 py-2 focus:border-teal-600 focus:ring-2 focus:ring-teal-600/20 focus:outline-none"
                placeholder="e.g. Kampala"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Academic Supervisor</label>
              <input
                value={addForm.academicSupervisor}
                onChange={(e) => setAddForm({ ...addForm, academicSupervisor: e.target.value })}
                className="w-full text-xs rounded-xl border border-slate-300 px-3 py-2 focus:border-teal-600 focus:ring-2 focus:ring-teal-600/20 focus:outline-none"
                placeholder="Auto-filled with your username"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Field Supervisor</label>
              <input
                value={addForm.fieldSupervisor}
                onChange={(e) => setAddForm({ ...addForm, fieldSupervisor: e.target.value })}
                className="w-full text-xs rounded-xl border border-slate-300 px-3 py-2 focus:border-teal-600 focus:ring-2 focus:ring-teal-600/20 focus:outline-none"
                placeholder="e.g. Pending"
              />
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={() => setShowAddForm(false)}
              className="px-4 py-2 rounded-xl bg-white hover:bg-slate-100 text-slate-700 text-xs font-semibold border border-slate-300 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={addLoading}
              className="px-4 py-2 rounded-xl bg-primary hover:bg-primary text-white text-xs font-bold transition-all flex items-center gap-1.5 shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Plus className="w-4 h-4" />
              {addLoading ? 'Creating...' : 'Create Student'}
            </button>
          </div>
        </form>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="space-y-6 max-w-7xl mx-auto">
        <div className="flex items-center gap-2 text-xs text-slate-500 font-medium">
          <div className="w-4 h-4 border-2 border-teal-600 border-t-transparent rounded-full animate-spin" />
          <span>Loading students...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-7xl mx-auto">

      {/* Notice / Error */}
      {notice && (
        <div className="p-3.5 bg-emerald-50 border border-emerald-200 rounded-xl flex items-center justify-between gap-3 text-emerald-900 text-sm">
          <div className="flex items-center gap-2.5">
            <CheckCircle className="w-5 h-5 text-emerald-600 shrink-0" />
            <span className="font-medium">{notice}</span>
          </div>
          <button onClick={() => setNotice('')} className="text-emerald-600 hover:text-emerald-900 p-1 rounded">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}
      {error && (
        <div className="p-3.5 bg-rose-50 border border-rose-200 rounded-xl flex items-center justify-between gap-3 text-rose-900 text-sm">
          <div className="flex items-center gap-2.5">
            <AlertCircle className="w-5 h-5 text-rose-600 shrink-0" />
            <span className="font-medium">{error}</span>
          </div>
          <button onClick={() => setError('')} className="text-rose-600 hover:text-rose-900 p-1 rounded">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <div className="text-2xl font-extrabold text-slate-900">
            Students
            {selectedUnitId && (
              <span className="text-base font-semibold text-teal-700 ml-2">
                — {getUnitName(parseInt(selectedUnitId, 10))}
              </span>
            )}
          </div>
          <p className="text-sm text-slate-600 mt-1">{myStudents.length} students {selectedUnitId ? `in this unit` : `in this university`}</p>
        </div>
        <div className="flex items-center gap-2.5">
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search students..."
              className="w-52 bg-white text-slate-900 text-xs rounded-xl border border-slate-300 pl-9 pr-3 py-2 focus:border-teal-600 focus:ring-2 focus:ring-teal-600/20 focus:outline-none"
            />
          </div>
          <button
            type="button"
            onClick={() => setShowAddForm(!showAddForm)}
            className="h-9 px-3.5 py-2 rounded-xl bg-primary hover:bg-primary text-white text-xs font-bold shadow-xs transition-all flex items-center gap-1.5"
          >
            <Plus className="w-4 h-4" />
            <span>Add Student</span>
          </button>
        </div>
      </div>

      {/* School Filter Chips */}
      {topUnits.length > 0 && (
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Filter by School:</span>
          <button
            type="button"
            onClick={() => setSchoolFilter(null)}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
              !schoolFilter
                ? 'bg-primary text-white shadow-xs'
                : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
            }`}
          >
            All
          </button>
          {topUnits.map((unit) => (
            <button
              key={unit.unitId}
              type="button"
              onClick={() => setSchoolFilter(schoolFilter === unit.unitId ? null : unit.unitId)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                schoolFilter === unit.unitId
                  ? 'bg-primary text-white shadow-xs'
                  : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
              }`}
            >
              {unit.shortForm || unit.unitName}
            </button>
          ))}
          {(studentsByUnit['unassigned'] || []).length > 0 && (
            <button
              type="button"
              onClick={() => setSchoolFilter(schoolFilter === 'unassigned' ? null : 'unassigned')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                schoolFilter === 'unassigned'
                  ? 'bg-primary text-white shadow-xs'
                  : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
              }`}
            >
              Unassigned
            </button>
          )}
        </div>
      )}

      {/* Add Student Form */}
      {showAddForm && renderAddForm()}

      {/* Students grouped by Academic Unit */}
      {topUnits.length > 0 ? (
        topUnits.map((unit) => {
          const children = unitsByParent[unit.unitId] || [];
          const unitStudents = studentsByUnit[String(unit.unitId)] || [];
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
                    <Building2 className="w-4 h-4" />
                  </div>
                  <div className="text-left">
                    <div className="text-sm font-bold text-slate-900">{unit.unitName}</div>
                    <div className="text-[11px] text-slate-500">
                      {unit.shortForm} &middot; {unitStudents.length} student{unitStudents.length !== 1 ? 's' : ''}
                    </div>
                  </div>
                </div>
                {isExpanded ? <ChevronDown className="w-4 h-4 text-slate-400" /> : <ChevronRight className="w-4 h-4 text-slate-400" />}
              </button>

              {isExpanded && (
                <div className="border-t border-slate-200">
                  {unitStudents.length > 0 ? (
                    <table className="w-full text-left">
                      <thead>
                        <tr className="bg-slate-50/90 text-[10px] font-bold tracking-wider text-slate-600">
                          <th className="py-2 px-4 pl-6">Name</th>
                          <th className="py-2 px-4">Student No.</th>
                          <th className="py-2 px-4">Email</th>
                          <th className="py-2 px-4">Program</th>
                          <th className="py-2 px-4">Company</th>
                          <th className="py-2 px-4 text-right">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {unitStudents.map((s) => renderStudentRow(s))}
                      </tbody>
                    </table>
                  ) : (
                    <div className="py-6 text-center text-xs text-slate-400">No students in this unit</div>
                  )}

                  {/* Sub-units */}
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
                          <table className="w-full text-left">
                            <tbody className="divide-y divide-slate-100">
                              {childStudents.map((s) => renderStudentRow(s))}
                            </tbody>
                          </table>
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
        /* No academic units — show flat list */
        <section className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
          <div className="px-5 py-4 border-b border-slate-200">
            <h3 className="text-sm font-bold text-slate-900">All Students</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50/90 text-[10px] font-bold tracking-wider text-slate-600">
                  <th className="py-3 px-4 pl-6">Name</th>
                  <th className="py-3 px-4">Student No.</th>
                  <th className="py-3 px-4">Email</th>
                  <th className="py-3 px-4">Program</th>
                  <th className="py-3 px-4">Company</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredStudents.length > 0 ? (
                  filteredStudents.map((s) => renderStudentRow(s))
                ) : (
                  <tr>
                    <td colSpan={6} className="py-12 text-center text-xs text-slate-400">No students found</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {/* Unassigned students */}
      {(studentsByUnit['unassigned'] || []).length > 0 && (
        <section className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
          <div className="px-5 py-4 border-b border-slate-200">
            <h3 className="text-sm font-bold text-slate-900">Unassigned Students</h3>
            <p className="text-[11px] text-slate-500">Students not yet assigned to an academic unit</p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50/90 text-[10px] font-bold tracking-wider text-slate-600">
                  <th className="py-3 px-4 pl-6">Name</th>
                  <th className="py-3 px-4">Student No.</th>
                  <th className="py-3 px-4">Email</th>
                  <th className="py-3 px-4">Program</th>
                  <th className="py-3 px-4">Company</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {studentsByUnit['unassigned'].map((s) => renderStudentRow(s))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {/* Edit Modal */}
      {editStudent && (
        <StudentEditModal
          student={editStudent}
          title={`Edit Student: ${editStudent.fullName}`}
          onClose={() => setEditStudent(null)}
          onSubmit={handleEditSave}
          companies={companies}
          supervisors={[]}
        />
      )}
    </div>
  );
}
