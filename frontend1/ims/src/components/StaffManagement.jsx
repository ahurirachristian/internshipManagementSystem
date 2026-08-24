import { useEffect, useMemo, useState } from 'react';
import {
  Pencil,
  Trash2,
  Plus,
  Users,
  X,
  AlertCircle,
  FileText,
  Search,
} from 'lucide-react';
import {
  fetchUniversityStaff,
  createUniversityStaff,
  updateUniversityStaff,
  deleteUniversityStaff,
  fetchUniversityAcademicUnits,
} from '../services/api';
import ExportButton from './ExportButton';
import Pagination from './Pagination';

const ITEMS_PER_PAGE = 10;

const initialForm = {
  fullName: '',
  contact: '',
  email: '',
  role: '',
  unitId: '',
};

export default function StaffManagement() {
  const [staffMembers, setStaffMembers] = useState([]);
  const [units, setUnits] = useState([]);
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

  const filteredStaff = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    if (!q) return staffMembers;
    return staffMembers.filter((member) =>
      (member.fullName || '').toLowerCase().includes(q) ||
      (member.role || '').toLowerCase().includes(q) ||
      (member.email || '').toLowerCase().includes(q) ||
      (member.contact || '').toLowerCase().includes(q)
    );
  }, [staffMembers, searchQuery]);

  const totalPages = Math.ceil(filteredStaff.length / ITEMS_PER_PAGE);

  const paginatedStaff = useMemo(() => {
    const start = (currentPage - 1) * ITEMS_PER_PAGE;
    return filteredStaff.slice(start, start + ITEMS_PER_PAGE);
  }, [filteredStaff, currentPage]);

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
      const [staffData, unitsData] = await Promise.all([
        fetchUniversityStaff(),
        fetchUniversityAcademicUnits(),
      ]);
      setStaffMembers(Array.isArray(staffData) ? staffData : []);
      setUnits(Array.isArray(unitsData) ? unitsData : []);
    } catch (err) {
      setStaffMembers([]);
      setError(err.message || 'Unable to load staff.');
    } finally {
      setLoading(false);
    }
  }

  function getUnitName(unitId) {
    if (!unitId) return '—';
    return unitById[unitId]?.unitName || `Unit ${unitId}`;
  }

  function openModal(existingMember) {
    setEditingId(existingMember?.staffId ?? null);
    setForm(existingMember ? {
      fullName: existingMember.fullName || '',
      contact: existingMember.contact || '',
      email: existingMember.email || '',
      role: existingMember.role || '',
      unitId: existingMember.unitId != null ? String(existingMember.unitId) : '',
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

  function getUnitOptions() {
    return [...units].sort((a, b) => a.unitName.localeCompare(b.unitName));
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setError('');

    if (!form.fullName.trim()) {
      setError('Full name is required.');
      return;
    }
    if (form.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim())) {
      setError('Please enter a valid email address.');
      return;
    }

    setLoading(true);
    try {
      const payload = {
        fullName: form.fullName.trim(),
        contact: form.contact.trim() || null,
        email: form.email.trim() || null,
        role: form.role.trim() || null,
        unitId: form.unitId ? parseInt(form.unitId, 10) : null,
      };

      if (editingId) {
        await updateUniversityStaff(editingId, payload);
      } else {
        await createUniversityStaff(payload);
      }

      closeModal();
      await refresh();
    } catch (err) {
      setError(err.message || 'Unable to save staff member.');
    } finally {
      setLoading(false);
    }
  }

  async function handleDelete(member) {
    if (!window.confirm(`Delete "${member.fullName}"? Students supervised by them will be unassigned.`)) return;
    setLoading(true);
    setError('');
    try {
      await deleteUniversityStaff(member.staffId);
      await refresh();
    } catch (err) {
      setError(err.message || 'Unable to delete staff member.');
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
            <span>Staff</span>
          </div>
        </div>
        <div className="flex flex-col sm:flex-row sm:items-center gap-2.5 w-full sm:w-auto">
          <div className="relative flex-1 sm:flex-none">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search staff..."
              className="w-full sm:w-52 bg-white text-slate-900 text-xs rounded-xl border border-slate-300 pl-9 pr-3 py-2 focus:border-teal-600 focus:ring-2 focus:ring-teal-600/20 focus:outline-none transition-all shadow-xs font-medium placeholder:text-slate-400"
              aria-label="Search staff"
            />
          </div>
          <div className="flex items-center gap-2.5">
            <ExportButton data={staffMembers} fileName="staff" exportUrl="/api/university/staff/export/csv" />
            <button
              type="button"
              onClick={() => openModal(null)}
              className="h-9 px-3.5 py-2 rounded-xl bg-[#063b33] hover:bg-[#042823] text-white text-xs font-bold shadow-xs transition-all flex items-center gap-1.5 focus-visible:ring-2 focus-visible:ring-teal-600 focus-visible:outline-none"
            >
              <Plus className="w-4 h-4" />
              <span>Add Staff</span>
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
          <span>Loading staff...</span>
        </div>
      )}

      {/* Table */}
      <section id="staff-table-container" aria-labelledby="staff-table-title" className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="overflow-x-auto custom-scrollbar">
          <table className="w-full text-left border-collapse" style={{ minWidth: '850px' }} aria-label="Staff list">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50/90 text-[11px] font-bold tracking-wider text-slate-800">
                <th scope="col" className="py-3.5 px-3 pl-5">ID</th>
                <th scope="col" className="py-3.5 px-3">Full Name</th>
                <th scope="col" className="py-3.5 px-3">Role</th>
                <th scope="col" className="py-3.5 px-3">Contact</th>
                <th scope="col" className="py-3.5 px-3">Email</th>
                <th scope="col" className="py-3.5 px-3">Unit</th>
                <th scope="col" className="py-3.5 px-3 pr-5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-sm">
              {paginatedStaff.length > 0 ? paginatedStaff.map((member) => (
                <tr key={member.staffId} className="hover:bg-slate-50/80 transition-colors">
                  <td className="py-3.5 px-3 pl-5 text-xs font-medium text-slate-500">{member.staffId}</td>
                  <td className="py-3.5 px-3">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg bg-violet-50 text-violet-700 border border-violet-200 flex items-center justify-center shrink-0 shadow-xs">
                        <Users className="w-4 h-4" />
                      </div>
                      <span className="font-bold text-slate-900">{member.fullName}</span>
                    </div>
                  </td>
                  <td className="py-3.5 px-3">
                    {member.role ? (
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-teal-50 text-teal-800 border border-teal-200">
                        {member.role}
                      </span>
                    ) : (
                      <span className="text-xs text-slate-400">—</span>
                    )}
                  </td>
                  <td className="py-3.5 px-3 text-xs text-slate-600">{member.contact || '—'}</td>
                  <td className="py-3.5 px-3 text-xs text-slate-600">{member.email || '—'}</td>
                  <td className="py-3.5 px-3 text-xs text-slate-600">{getUnitName(member.unitId)}</td>
                  <td className="py-3.5 px-3 pr-5 text-right">
                    <ul className="flex items-center justify-end gap-1 list-none p-0 m-0">
                      <li>
                        <button
                          type="button"
                          onClick={() => openModal(member)}
                          className="p-1.5 text-emerald-600 hover:text-emerald-800 hover:bg-emerald-50 rounded-lg transition-colors focus-visible:ring-2 focus-visible:ring-emerald-600 focus-visible:outline-none"
                          aria-label={`Edit ${member.fullName}`}
                          title="Edit"
                        >
                          <Pencil className="w-4 h-4" />
                        </button>
                      </li>
                      <li>
                        <button
                          type="button"
                          onClick={() => handleDelete(member)}
                          className="p-1.5 text-rose-600 hover:text-rose-800 hover:bg-rose-50 rounded-lg transition-colors focus-visible:ring-2 focus-visible:ring-rose-600 focus-visible:outline-none"
                          aria-label={`Delete ${member.fullName}`}
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
                        {searchQuery ? 'No results found' : 'No staff found'}
                      </h3>
                      <p className="text-xs text-slate-500 mt-1 mb-4">
                        {searchQuery ? (
                          <>No staff match &ldquo;<strong>{searchQuery}</strong>&rdquo;. Try a different search term.</>
                        ) : (
                          <>Click &ldquo;Add Staff&rdquo; to register academic supervisors.</>
                        )}
                      </p>
                      {!searchQuery && (
                        <button
                          type="button"
                          onClick={() => openModal(null)}
                          className="px-3.5 py-2 bg-[#063b33] hover:bg-[#042823] text-white font-bold text-xs rounded-xl transition-colors shadow-xs focus-visible:ring-2 focus-visible:ring-teal-600 focus-visible:outline-none"
                        >
                          Add Staff
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
        {filteredStaff.length > ITEMS_PER_PAGE && (
          <div className="px-5 py-3 border-t border-slate-200 bg-slate-50/90 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-600">
            <span>
              Showing {((currentPage - 1) * ITEMS_PER_PAGE) + 1}–{Math.min(currentPage * ITEMS_PER_PAGE, filteredStaff.length)} of {filteredStaff.length} staff
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
          aria-labelledby="staff-modal-title"
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
                <div className="w-10 h-10 rounded-xl bg-violet-50 border border-violet-200 flex items-center justify-center text-violet-800 shrink-0">
                  <Users className="w-5 h-5" />
                </div>
                <h3 id="staff-modal-title" className="text-base font-bold text-slate-900">
                  {editingId ? 'Edit Staff Member' : 'Add Staff Member'}
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
                <div>
                  <label htmlFor="st-fullName" className={labelClass}>
                    Full Name <span className="text-rose-600" aria-hidden="true">*</span>
                  </label>
                  <input
                    id="st-fullName"
                    type="text"
                    value={form.fullName}
                    onChange={(e) => handleFieldChange('fullName', e.target.value)}
                    placeholder="e.g. Ssemaganda Shuraim"
                    required
                    className={selectClass}
                  />
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label htmlFor="st-contact" className={labelClass}>Contact</label>
                    <input
                      id="st-contact"
                      type="tel"
                      value={form.contact}
                      onChange={(e) => handleFieldChange('contact', e.target.value)}
                      placeholder="e.g. 075887005"
                      className={selectClass}
                    />
                  </div>
                  <div>
                    <label htmlFor="st-role" className={labelClass}>Role</label>
                    <input
                      id="st-role"
                      type="text"
                      value={form.role}
                      onChange={(e) => handleFieldChange('role', e.target.value)}
                      placeholder="e.g. Academic Supervisor"
                      list="staff-role-options"
                      className={selectClass}
                    />
                    <datalist id="staff-role-options">
                      <option value="Academic Supervisor" />
                      <option value="Field Supervisor" />
                      <option value="Head of Department" />
                      <option value="Dean" />
                    </datalist>
                  </div>
                </div>
                <div>
                  <label htmlFor="st-email" className={labelClass}>Email</label>
                  <input
                    id="st-email"
                    type="email"
                    value={form.email}
                    onChange={(e) => handleFieldChange('email', e.target.value)}
                    placeholder="e.g. shuraim@nkumba.ac.ug"
                    className={selectClass}
                  />
                </div>
                <div>
                  <label htmlFor="st-unitId" className={labelClass}>Academic Unit</label>
                  <select
                    id="st-unitId"
                    value={form.unitId}
                    onChange={(e) => handleFieldChange('unitId', e.target.value)}
                    className={selectClass}
                  >
                    <option value="">No unit assigned</option>
                    {getUnitOptions().map((unit) => (
                      <option key={unit.unitId} value={unit.unitId}>{unit.unitName}</option>
                    ))}
                  </select>
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
                    {loading ? 'Saving...' : editingId ? 'Save Changes' : 'Create Staff'}
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
