import { useEffect, useMemo, useState } from 'react';
import {
  Pencil,
  Trash2,
  Plus,
  Network,
  X,
  AlertCircle,
  FileText,
  Search,
} from 'lucide-react';
import {
  fetchUniversityAcademicUnits,
  createUniversityAcademicUnit,
  updateUniversityAcademicUnit,
  deleteUniversityAcademicUnit,
  fetchStudents,
  fetchUniversityStaff,
} from '../services/api';
import ExportButton from './ExportButton';
import Pagination from './Pagination';

const ITEMS_PER_PAGE = 10;

const UNIT_TYPES = [
  'College',
  'School',
  'Faculty',
  'Department',
  'Institute',
  'Directorate',
  'Centre',
];

const initialForm = {
  unitType: '',
  unitName: '',
  shortForm: '',
  parentUnitId: '',
};

export default function AcademicUnitsManagement() {
  const [units, setUnits] = useState([]);
  const [students, setStudents] = useState([]);
  const [staffMembers, setStaffMembers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm] = useState(initialForm);
  const [editingId, setEditingId] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);

  const unitById = useMemo(() => {
    const map = {};
    units.forEach((unit) => { map[unit.unitId] = unit; });
    return map;
  }, [units]);

  const studentCountByUnit = useMemo(() => {
    const map = {};
    students.forEach((student) => {
      if (!student.unitId) return;
      map[student.unitId] = (map[student.unitId] || 0) + 1;
    });
    return map;
  }, [students]);

  const staffCountByUnit = useMemo(() => {
    const map = {};
    staffMembers.forEach((member) => {
      if (!member.unitId) return;
      map[member.unitId] = (map[member.unitId] || 0) + 1;
    });
    return map;
  }, [staffMembers]);

  const descendantIds = useMemo(() => {
    if (!editingId) return new Set();
    const childrenMap = {};
    units.forEach((unit) => {
      if (unit.parentUnitId) {
        if (!childrenMap[unit.parentUnitId]) childrenMap[unit.parentUnitId] = [];
        childrenMap[unit.parentUnitId].push(unit.unitId);
      }
    });
    const descendants = new Set();
    const queue = [editingId];
    while (queue.length > 0) {
      const current = queue.pop();
      (childrenMap[current] || []).forEach((childId) => {
        if (!descendants.has(childId)) {
          descendants.add(childId);
          queue.push(childId);
        }
      });
    }
    return descendants;
  }, [units, editingId]);

  const filteredUnits = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    if (!q) return units;
    return units.filter((unit) =>
      (unit.unitName || '').toLowerCase().includes(q) ||
      (unit.shortForm || '').toLowerCase().includes(q) ||
      (unit.unitType || '').toLowerCase().includes(q)
    );
  }, [units, searchQuery]);

  const totalPages = Math.ceil(filteredUnits.length / ITEMS_PER_PAGE);

  const paginatedUnits = useMemo(() => {
    const start = (currentPage - 1) * ITEMS_PER_PAGE;
    return filteredUnits.slice(start, start + ITEMS_PER_PAGE);
  }, [filteredUnits, currentPage]);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery]);

  useEffect(() => {
    refresh();
  }, []);

  async function refresh() {
    setLoading(true);
    setError('');
    try {
      const [unitsData, studentsData, staffData] = await Promise.all([
        fetchUniversityAcademicUnits(),
        fetchStudents(),
        fetchUniversityStaff(),
      ]);
      setUnits(Array.isArray(unitsData) ? unitsData : []);
      setStudents(Array.isArray(studentsData) ? studentsData : []);
      setStaffMembers(Array.isArray(staffData) ? staffData : []);
    } catch (err) {
      setUnits([]);
      setError(err.message || 'Unable to load academic units.');
    } finally {
      setLoading(false);
    }
  }

  function getParentOptions() {
    return units
      .filter((unit) => !descendantIds.has(unit.unitId))
      .sort((a, b) => a.unitName.localeCompare(b.unitName));
  }

  function openModal(existingUnit) {
    setEditingId(existingUnit?.unitId ?? null);
    setForm(existingUnit ? {
      unitType: existingUnit.unitType || '',
      unitName: existingUnit.unitName || '',
      shortForm: existingUnit.shortForm || '',
      parentUnitId: existingUnit.parentUnitId != null ? String(existingUnit.parentUnitId) : '',
    } : initialForm);
    setModalOpen(true);
  }

  function closeModal() {
    setModalOpen(false);
    setEditingId(null);
    setForm(initialForm);
  }

  function handleFieldChange(name, value) {
    setForm((prev) => ({ ...prev, [name]: value }));
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setError('');

    if (!form.unitType) {
      setError('Please select a unit type.');
      return;
    }
    if (!form.unitName.trim()) {
      setError('Unit name is required.');
      return;
    }

    setLoading(true);
    try {
      const payload = {
        unitType: form.unitType,
        unitName: form.unitName.trim(),
        shortForm: form.shortForm.trim() || null,
        parentUnitId: form.parentUnitId ? parseInt(form.parentUnitId, 10) : null,
      };

      if (editingId) {
        await updateUniversityAcademicUnit(editingId, payload);
      } else {
        await createUniversityAcademicUnit(payload);
      }

      closeModal();
      await refresh();
    } catch (err) {
      setError(err.message || 'Unable to save academic unit.');
    } finally {
      setLoading(false);
    }
  }

  async function handleDelete(unit) {
    if (!window.confirm(`Delete "${unit.unitName}"? Students and staff attached to it will be unassigned.`)) return;
    setLoading(true);
    setError('');
    try {
      await deleteUniversityAcademicUnit(unit.unitId);
      await refresh();
    } catch (err) {
      setError(err.message || 'Unable to delete academic unit.');
    } finally {
      setLoading(false);
    }
  }

  const selectClass = "w-full bg-white text-slate-900 text-xs rounded-xl border border-slate-300 px-3.5 py-2.5 focus:border-teal-600 focus:ring-2 focus:ring-teal-600/20 focus:outline-none transition-all shadow-xs font-medium";
  const labelClass = "block text-xs font-bold uppercase tracking-wider text-slate-800 mb-1.5";

  return (
    <div className="space-y-6 max-w-7xl mx-auto">

      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2 text-[11px] font-semibold text-teal-700/70 uppercase tracking-wider mb-1.5">
            <span>Settings</span>
            <span className="text-slate-400">/</span>
            <span>Academic Units</span>
          </div>
        </div>
        <div className="flex flex-col sm:flex-row sm:items-center gap-2.5 w-full sm:w-auto">
          <div className="relative flex-1 sm:flex-none">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search academic units..."
              className="w-full sm:w-52 bg-white text-slate-900 text-xs rounded-xl border border-slate-300 pl-9 pr-3 py-2 focus:border-teal-600 focus:ring-2 focus:ring-teal-600/20 focus:outline-none transition-all shadow-xs font-medium placeholder:text-slate-400"
              aria-label="Search academic units"
            />
          </div>
          <div className="flex items-center gap-2.5">
            <ExportButton data={units} fileName="academic-units" exportUrl="/api/university/academic-units/export/csv" />
            <button
              type="button"
              onClick={() => openModal(null)}
              className="h-9 px-3.5 py-2 rounded-xl bg-[#063b33] hover:bg-[#042823] text-white text-xs font-bold shadow-xs transition-all flex items-center gap-1.5 focus-visible:ring-2 focus-visible:ring-teal-600 focus-visible:outline-none"
            >
              <Plus className="w-4 h-4" />
              <span>Add Unit</span>
            </button>
          </div>
        </div>
      </div>

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
          <span>Loading academic units...</span>
        </div>
      )}

      {/* Table */}
      <section id="academic-units-table-container" aria-labelledby="academic-units-table-title" className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="overflow-x-auto custom-scrollbar">
          <table className="w-full text-left border-collapse" style={{ minWidth: '820px' }} aria-label="Academic units list">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50/90 text-[11px] font-bold tracking-wider text-slate-800">
                <th scope="col" className="py-3.5 px-3 pl-5">ID</th>
                <th scope="col" className="py-3.5 px-3">Unit Name</th>
                <th scope="col" className="py-3.5 px-3">Type</th>
                <th scope="col" className="py-3.5 px-3">Parent Unit</th>
                <th scope="col" className="py-3.5 px-3">Students</th>
                <th scope="col" className="py-3.5 px-3">Staff</th>
                <th scope="col" className="py-3.5 px-3 pr-5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-sm">
              {paginatedUnits.length > 0 ? paginatedUnits.map((unit) => (
                <tr key={unit.unitId} className="hover:bg-slate-50/80 transition-colors">
                  <td className="py-3.5 px-3 pl-5 text-xs font-medium text-slate-500">{unit.unitId}</td>
                  <td className="py-3.5 px-3">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-700 border border-blue-200 flex items-center justify-center shrink-0 shadow-xs">
                        <Network className="w-4 h-4" />
                      </div>
                      <div>
                        <div className="font-bold text-slate-900">{unit.unitName}</div>
                        {unit.shortForm && (
                          <div className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 border border-slate-200 inline-block mt-0.5">
                            {unit.shortForm}
                          </div>
                        )}
                      </div>
                    </div>
                  </td>
                  <td className="py-3.5 px-3">
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-teal-50 text-teal-800 border border-teal-200">
                      {unit.unitType}
                    </span>
                  </td>
                  <td className="py-3.5 px-3 text-xs text-slate-600">
                    {unit.parentUnitId ? (unitById[unit.parentUnitId]?.unitName || `Unit ${unit.parentUnitId}`) : '—'}
                  </td>
                  <td className="py-3.5 px-3 text-xs text-slate-600">{studentCountByUnit[unit.unitId] || 0}</td>
                  <td className="py-3.5 px-3 text-xs text-slate-600">{staffCountByUnit[unit.unitId] || 0}</td>
                  <td className="py-3.5 px-3 pr-5 text-right">
                    <ul className="flex items-center justify-end gap-1 list-none p-0 m-0">
                      <li>
                        <button
                          type="button"
                          onClick={() => openModal(unit)}
                          className="p-1.5 text-emerald-600 hover:text-emerald-800 hover:bg-emerald-50 rounded-lg transition-colors focus-visible:ring-2 focus-visible:ring-emerald-600 focus-visible:outline-none"
                          aria-label={`Edit ${unit.unitName}`}
                          title="Edit"
                        >
                          <Pencil className="w-4 h-4" />
                        </button>
                      </li>
                      <li>
                        <button
                          type="button"
                          onClick={() => handleDelete(unit)}
                          className="p-1.5 text-rose-600 hover:text-rose-800 hover:bg-rose-50 rounded-lg transition-colors focus-visible:ring-2 focus-visible:ring-rose-600 focus-visible:outline-none"
                          aria-label={`Delete ${unit.unitName}`}
                          title="Delete"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </li>
                    </ul>
                  </td>
                </tr>
              )) : (
                <tr>
                  <td colSpan={7} className="py-12 px-4 text-center">
                    <div className="max-w-sm mx-auto flex flex-col items-center">
                      <div className="w-12 h-12 rounded-full bg-slate-100 border border-slate-200 flex items-center justify-center text-slate-400 mb-3">
                        {searchQuery ? <Search className="w-6 h-6" /> : <FileText className="w-6 h-6" />}
                      </div>
                      <h3 className="text-base font-bold text-slate-800">
                        {searchQuery ? 'No results found' : 'No academic units found'}
                      </h3>
                      <p className="text-xs text-slate-500 mt-1 mb-4">
                        {searchQuery ? (
                          <>No units match &ldquo;<strong>{searchQuery}</strong>&rdquo;. Try a different search term.</>
                        ) : (
                          <>Click &ldquo;Add Unit&rdquo; to create the first academic unit.</>
                        )}
                      </p>
                      {!searchQuery && (
                        <button
                          type="button"
                          onClick={() => openModal(null)}
                          className="px-3.5 py-2 bg-[#063b33] hover:bg-[#042823] text-white font-bold text-xs rounded-xl transition-colors shadow-xs focus-visible:ring-2 focus-visible:ring-teal-600 focus-visible:outline-none"
                        >
                          Add Unit
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {filteredUnits.length > ITEMS_PER_PAGE && (
          <div className="px-5 py-3 border-t border-slate-200 bg-slate-50/90 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-600">
            <span>
              Showing {((currentPage - 1) * ITEMS_PER_PAGE) + 1}–{Math.min(currentPage * ITEMS_PER_PAGE, filteredUnits.length)} of {filteredUnits.length} units
            </span>
            <Pagination currentPage={currentPage} setCurrentPage={setCurrentPage} totalPages={totalPages} />
          </div>
        )}
      </section>

      {/* Modal */}
      {modalOpen && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="academic-unit-modal-title"
          className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 sm:p-6 animate-in fade-in duration-150"
          onClick={closeModal}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="bg-white w-full max-w-lg rounded-2xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[90vh] animate-in zoom-in-95 duration-150"
          >
            {/* Modal Header */}
            <div className="p-4 sm:p-5 bg-slate-50 border-b border-slate-200 flex items-center justify-between gap-4">
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-10 h-10 rounded-xl bg-blue-50 border border-blue-200 flex items-center justify-center text-blue-800 shrink-0">
                  <Network className="w-5 h-5" />
                </div>
                <h3 id="academic-unit-modal-title" className="text-base font-bold text-slate-900">
                  {editingId ? 'Edit Academic Unit' : 'Add Academic Unit'}
                </h3>
              </div>
              <button
                type="button"
                onClick={closeModal}
                className="p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-200 rounded-lg transition-colors focus-visible:ring-2 focus-visible:ring-teal-600 focus-visible:outline-none"
                aria-label="Close modal"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Form */}
            <form onSubmit={handleSubmit} className="flex flex-col flex-1 min-h-0">
              <div className="p-6 space-y-5 overflow-y-auto flex-1">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label htmlFor="au-unitType" className={labelClass}>
                      Unit Type <span className="text-rose-600" aria-hidden="true">*</span>
                    </label>
                    <select
                      id="au-unitType"
                      value={form.unitType}
                      onChange={(e) => handleFieldChange('unitType', e.target.value)}
                      required
                      className={selectClass}
                    >
                      <option value="">Select Type</option>
                      {UNIT_TYPES.map((type) => (
                        <option key={type} value={type}>{type}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label htmlFor="au-shortForm" className={labelClass}>Short Form</label>
                    <input
                      id="au-shortForm"
                      type="text"
                      value={form.shortForm}
                      onChange={(e) => handleFieldChange('shortForm', e.target.value)}
                      placeholder="e.g. COCIS"
                      maxLength={15}
                      className={selectClass}
                    />
                  </div>
                </div>
                <div>
                  <label htmlFor="au-unitName" className={labelClass}>
                    Unit Name <span className="text-rose-600" aria-hidden="true">*</span>
                  </label>
                  <input
                    id="au-unitName"
                    type="text"
                    value={form.unitName}
                    onChange={(e) => handleFieldChange('unitName', e.target.value)}
                    placeholder="e.g. College of Computing and Information Sciences"
                    required
                    className={selectClass}
                  />
                </div>
                <div>
                  <label htmlFor="au-parentUnitId" className={labelClass}>Parent Unit</label>
                  <select
                    id="au-parentUnitId"
                    value={form.parentUnitId}
                    onChange={(e) => handleFieldChange('parentUnitId', e.target.value)}
                    className={selectClass}
                  >
                    <option value="">None (top-level unit)</option>
                    {getParentOptions().map((unit) => (
                      <option key={unit.unitId} value={unit.unitId}>{unit.unitName}</option>
                    ))}
                  </select>
                  <p className="text-[11px] text-slate-500 mt-1">Leave empty for a top-level unit.</p>
                </div>
              </div>

              {/* Modal Footer */}
              <div className="p-4 sm:p-5 bg-slate-50 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-3">
                <div />
                <div className="flex items-center gap-2.5 w-full sm:w-auto">
                  <button
                    type="button"
                    onClick={closeModal}
                    className="flex-1 sm:flex-none px-3.5 py-2 rounded-xl bg-white hover:bg-slate-100 text-slate-700 text-xs font-semibold border border-slate-300 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={loading}
                    className="flex-1 sm:flex-none px-4 py-2 rounded-xl bg-[#063b33] hover:bg-[#042823] text-white text-xs font-bold transition-all flex items-center justify-center gap-1.5 shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {loading ? 'Saving...' : editingId ? 'Save Changes' : 'Create Unit'}
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
