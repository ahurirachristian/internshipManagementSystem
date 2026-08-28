import { useEffect, useMemo, useState } from 'react';
import {
  ArrowRightLeft,
  Pencil,
  Trash2,
  ClipboardCheck,
  Plus,
  X,
  AlertCircle,
  FileText,
  Search,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import { fetchStudents, fetchCompanies, fetchSupervisors, fetchPlacements, createPlacement, updatePlacement, deletePlacement } from '../services/api';
import EvaluationFormModal from './EvaluationForm';
import ExportButton from './ExportButton';
import CustomSelect from './CustomSelect';

const ITEMS_PER_PAGE = 10;

const initialForm = {
  studentId: '',
  companyId: '',
  universitySupervisor: '',
  companySupervisor: '',
  status: 'PENDING',
};

const statusStyles = {
  PENDING: 'bg-amber-50 text-amber-700 border border-amber-200',
  ASSIGNED: 'bg-blue-50 text-blue-700 border border-blue-200',
  ACTIVE: 'bg-emerald-50 text-emerald-700 border border-emerald-200',
  COMPLETED: 'bg-slate-100 text-slate-600 border border-slate-200',
  CANCELLED: 'bg-rose-50 text-rose-700 border border-rose-200',
};

export default function PlacementMatching() {
  const [placements, setPlacements] = useState([]);
  const [students, setStudents] = useState([]);
  const [companies, setCompanies] = useState([]);
  const [universitySupervisors, setUniversitySupervisors] = useState([]);
  const [companySupervisors, setCompanySupervisors] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm] = useState(initialForm);
  const [editingId, setEditingId] = useState(null);
  const [evaluationPlacement, setEvaluationPlacement] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);

  const filteredPlacements = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    if (!q) return placements;
    return placements.filter((p) => {
      const student = students.find((s) => String(s.id) === String(p.studentId));
      const company = companies.find((c) => String(c.id) === String(p.companyId));
      const studentName = student ? (student.fullName || `${student.firstName || ''} ${student.lastName || ''}`.trim()) : '';
      const companyName = company ? company.name : '';
      return (
        studentName.toLowerCase().includes(q) ||
        companyName.toLowerCase().includes(q) ||
        (p.universitySupervisor || '').toLowerCase().includes(q) ||
        (p.companySupervisor || '').toLowerCase().includes(q) ||
        (p.status || '').toLowerCase().includes(q)
      );
    });
  }, [placements, students, companies, searchQuery]);

  const totalPages = Math.ceil(filteredPlacements.length / ITEMS_PER_PAGE);

  const paginatedPlacements = useMemo(() => {
    const start = (currentPage - 1) * ITEMS_PER_PAGE;
    return filteredPlacements.slice(start, start + ITEMS_PER_PAGE);
  }, [filteredPlacements, currentPage]);

  useEffect(() => {
    refreshPlacements();
    loadStudents();
    loadCompanies();
    loadSupervisors();
  }, []);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery]);

  async function refreshPlacements() {
    setLoading(true);
    setError('');
    try {
      const res = await fetchPlacements();
      const data = Array.isArray(res) ? res : (res?.content || []);
      setPlacements(data);
    } catch (err) {
      setPlacements([]);
      if (err.status !== 404) {
        setError(err.message || 'Unable to load placements.');
      }
    } finally {
      setLoading(false);
    }
  }

  async function loadStudents() {
    try {
      setStudents(await fetchStudents());
    } catch (err) {
      console.error('Failed to load students', err);
    }
  }

  async function loadCompanies() {
    try {
      setCompanies(await fetchCompanies());
    } catch (err) {
      console.error('Failed to load companies', err);
    }
  }

  async function loadSupervisors() {
    try {
      const uni = await fetchSupervisors('UNIVERSITY');
      setUniversitySupervisors(Array.isArray(uni) ? uni : []);
    } catch (err) {
      console.error('Failed to load university supervisors', err);
      setUniversitySupervisors([]);
    }

    try {
      const comp = await fetchSupervisors('COMPANY');
      setCompanySupervisors(Array.isArray(comp) ? comp : []);
    } catch (err) {
      console.error('Failed to load company supervisors', err);
      setCompanySupervisors([]);
    }
  }

  function openModal(existingPlacement) {
    setEditingId(existingPlacement?.id ?? null);
    setForm(existingPlacement ? {
      studentId: String(existingPlacement.studentId ?? ''),
      companyId: String(existingPlacement.companyId ?? ''),
      universitySupervisor: existingPlacement.universitySupervisor || '',
      companySupervisor: existingPlacement.companySupervisor || '',
      status: existingPlacement.status || 'PENDING',
    } : initialForm);
    setModalOpen(true);
  }

  function closeModal() {
    setModalOpen(false);
    setEditingId(null);
    setForm(initialForm);
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setError('');

    if (!form.studentId || !form.companyId) {
      setError('Student and Company are required.');
      return;
    }

    setLoading(true);
    try {
      const payload = {
        studentId: Number(form.studentId),
        companyId: Number(form.companyId),
        universitySupervisor: form.universitySupervisor || '',
        companySupervisor: form.companySupervisor || '',
        status: form.status,
      };

      if (editingId) {
        await updatePlacement(editingId, payload);
      } else {
        await createPlacement(payload);
      }

      await refreshPlacements();
      closeModal();
    } catch (err) {
      setError(err.message || 'Unable to save placement.');
    } finally {
      setLoading(false);
    }
  }

  async function handleDelete(id) {
    if (!window.confirm('Delete this placement?')) return;
    setLoading(true);
    try {
      await deletePlacement(id);
      await refreshPlacements();
    } catch (err) {
      setError(err.message || 'Unable to delete placement.');
    } finally {
      setLoading(false);
    }
  }

  function openEvaluation(placement) {
    setEvaluationPlacement(placement);
  }

  function closeEvaluation() {
    setEvaluationPlacement(null);
  }

  function getStudentName(studentId) {
    const student = students.find((s) => String(s.id) === String(studentId));
    return student ? (student.fullName || `${student.firstName || ''} ${student.lastName || ''}`.trim()) : 'Unknown';
  }

  function getCompanyName(companyId) {
    const company = companies.find((c) => String(c.id) === String(companyId));
    return company ? company.name : 'Unknown';
  }

  return (
    <div className="space-y-6 max-w-7xl mx-auto">

      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2 text-[11px] font-semibold text-teal-700/70 uppercase tracking-wider mb-1.5">
            <span>Administration</span>
            <span className="text-slate-400">/</span>
            <span>Placements</span>
          </div>
        </div>
        <div className="flex flex-col sm:flex-row sm:items-center gap-2.5 w-full sm:w-auto">
          <div className="relative flex-1 sm:flex-none">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search placements..."
              className="w-full sm:w-52 bg-white text-slate-900 text-xs rounded-xl border border-slate-300 pl-9 pr-3 py-2 focus:border-teal-600 focus:ring-2 focus:ring-teal-600/20 focus:outline-none transition-all shadow-xs font-medium placeholder:text-slate-400"
              aria-label="Search placements"
            />
          </div>
          <div className="flex items-center gap-2.5">
            <ExportButton data={placements} fileName="placements" exportUrl="/api/placements/export/csv" />
            <button
              type="button"
              onClick={() => openModal(null)}
              className="h-9 px-3.5 py-2 rounded-xl bg-[#063b33] hover:bg-[#042823] text-white text-xs font-bold shadow-xs transition-all flex items-center gap-1.5 focus-visible:ring-2 focus-visible:ring-teal-600 focus-visible:outline-none"
            >
              <Plus className="w-4 h-4" />
              <span>Assign Supervisors</span>
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
          <span>Loading placements...</span>
        </div>
      )}

      {/* Table */}
      <section className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="overflow-x-auto custom-scrollbar">
          <table className="w-full text-left border-collapse" style={{ minWidth: '950px' }} aria-label="Placements list">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50/90 text-[11px] font-bold tracking-wider text-slate-800">
                <th scope="col" className="py-3.5 px-3 pl-5">Student Name</th>
                <th scope="col" className="py-3.5 px-3">Company</th>
                <th scope="col" className="py-3.5 px-3">University Supervisor</th>
                <th scope="col" className="py-3.5 px-3">Company Supervisor</th>
                <th scope="col" className="py-3.5 px-3">Status</th>
                <th scope="col" className="py-3.5 px-3 pr-5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-sm">
              {paginatedPlacements.length > 0 ? paginatedPlacements.map((placement) => (
                <tr key={placement.id} className="hover:bg-slate-50/80 transition-colors">
                  <td className="py-3.5 px-3 pl-5">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg bg-teal-50 text-teal-700 border border-teal-200 flex items-center justify-center shrink-0 shadow-xs">
                        <ArrowRightLeft className="w-4 h-4" />
                      </div>
                      <span className="font-bold text-slate-900">{getStudentName(placement.studentId)}</span>
                    </div>
                  </td>
                  <td className="py-3.5 px-3 text-xs text-slate-600">{getCompanyName(placement.companyId)}</td>
                  <td className="py-3.5 px-3 text-xs text-slate-600">{placement.universitySupervisor || 'Unassigned'}</td>
                  <td className="py-3.5 px-3 text-xs text-slate-600">{placement.companySupervisor || 'Unassigned'}</td>
                  <td className="py-3.5 px-3">
                    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold ${statusStyles[placement.status] || 'bg-slate-100 text-slate-600 border border-slate-200'}`}>
                      {placement.status}
                    </span>
                  </td>
                  <td className="py-3.5 px-3 pr-5 text-right">
                    <ul className="flex items-center justify-end gap-1 list-none p-0 m-0">
                      <li>
                        <button
                          type="button"
                          onClick={() => openModal(placement)}
                          className="p-1.5 text-emerald-600 hover:text-emerald-800 hover:bg-emerald-50 rounded-lg transition-colors focus-visible:ring-2 focus-visible:ring-emerald-600 focus-visible:outline-none"
                          aria-label={`Edit placement`}
                          title="Edit"
                        >
                          <Pencil className="w-4 h-4" />
                        </button>
                      </li>
                      <li>
                        <button
                          type="button"
                          onClick={() => handleDelete(placement.id)}
                          className="p-1.5 text-rose-600 hover:text-rose-800 hover:bg-rose-50 rounded-lg transition-colors focus-visible:ring-2 focus-visible:ring-rose-600 focus-visible:outline-none"
                          aria-label="Delete placement"
                          title="Delete"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </li>
                      <li>
                        <button
                          type="button"
                          onClick={() => openEvaluation(placement)}
                          className="p-1.5 text-teal-600 hover:text-teal-800 hover:bg-teal-50 rounded-lg transition-colors focus-visible:ring-2 focus-visible:ring-teal-600 focus-visible:outline-none"
                          aria-label="Evaluate placement"
                          title="Evaluate"
                        >
                          <ClipboardCheck className="w-4 h-4" />
                        </button>
                      </li>
                    </ul>
                  </td>
                </tr>
              )) : (
                <tr>
                  <td colSpan={6} className="py-12 px-4 text-center">
                    <div className="max-w-sm mx-auto flex flex-col items-center">
                      <div className="w-12 h-12 rounded-full bg-slate-100 border border-slate-200 flex items-center justify-center text-slate-400 mb-3">
                        {searchQuery ? <Search className="w-6 h-6" /> : <FileText className="w-6 h-6" />}
                      </div>
                      <h3 className="text-base font-bold text-slate-800">
                        {searchQuery ? 'No results found' : 'No placements found'}
                      </h3>
                      <p className="text-xs text-slate-500 mt-1 mb-4">
                        {searchQuery ? (
                          <>No placements match &ldquo;<strong>{searchQuery}</strong>&rdquo;. Try a different search term.</>
                        ) : (
                          <>Click &ldquo;Assign Supervisors&rdquo; to create a placement.</>
                        )}
                      </p>
                      {!searchQuery && (
                        <button
                          type="button"
                          onClick={() => openModal(null)}
                          className="px-3.5 py-2 bg-[#063b33] hover:bg-[#042823] text-white font-bold text-xs rounded-xl transition-colors shadow-xs focus-visible:ring-2 focus-visible:ring-teal-600 focus-visible:outline-none"
                        >
                          Assign Supervisors
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
        {filteredPlacements.length >= ITEMS_PER_PAGE && (
          <div className="px-5 py-3 border-t border-slate-200 bg-slate-50/90 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-600">
            <span>
              Showing {((currentPage - 1) * ITEMS_PER_PAGE) + 1}–{Math.min(currentPage * ITEMS_PER_PAGE, filteredPlacements.length)} of {filteredPlacements.length} placements
            </span>
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                className="p-1.5 rounded-lg text-slate-600 hover:bg-slate-200 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                aria-label="Previous page"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              {Array.from({ length: totalPages }, (_, i) => i + 1)
                .filter((page) => {
                  if (totalPages <= 5) return true;
                  if (page === 1 || page === totalPages) return true;
                  if (Math.abs(page - currentPage) <= 1) return true;
                  return false;
                })
                .reduce((acc, page, i, arr) => {
                  if (i > 0 && page - arr[i - 1] > 1) acc.push('...');
                  acc.push(page);
                  return acc;
                }, [])
                .map((page, i) =>
                  page === '...' ? (
                    <span key={`ellipsis-${i}`} className="px-1.5 text-slate-400">...</span>
                  ) : (
                    <button
                      type="button"
                      key={page}
                      onClick={() => setCurrentPage(page)}
                      className={`min-w-[28px] h-7 rounded-lg text-xs font-semibold transition-colors ${
                        currentPage === page
                          ? 'bg-[#063b33] text-white'
                          : 'text-slate-600 hover:bg-slate-200'
                      }`}
                    >
                      {page}
                    </button>
                  )
                )}
              <button
                type="button"
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
                className="p-1.5 rounded-lg text-slate-600 hover:bg-slate-200 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                aria-label="Next page"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </section>

      {/* Modal */}
      {modalOpen && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="placement-modal-title"
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
                <div className="w-10 h-10 rounded-xl bg-teal-50 border border-teal-200 flex items-center justify-center text-teal-800 shrink-0">
                  <ArrowRightLeft className="w-5 h-5" />
                </div>
                <h3 id="placement-modal-title" className="text-base font-bold text-slate-900">
                  {editingId ? 'Edit Placement' : 'Assign Supervisors'}
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
                  <label htmlFor="pl-student" className="block text-xs font-bold uppercase tracking-wider text-slate-800 mb-1.5">
                    Student <span className="text-rose-600" aria-hidden="true">*</span>
                  </label>
                  <CustomSelect
                    id="pl-student"
                    value={form.studentId}
                    onChange={(value) => setForm({ ...form, studentId: value })}
                    options={students.map((student) => ({
                      value: String(student.id),
                      label: `${student.studentName} (${student.studentNo})`,
                    }))}
                    placeholder="Select student"
                    required
                  />
                </div>
                <div>
                  <label htmlFor="pl-company" className="block text-xs font-bold uppercase tracking-wider text-slate-800 mb-1.5">
                    Company <span className="text-rose-600" aria-hidden="true">*</span>
                  </label>
                  <CustomSelect
                    id="pl-company"
                    value={form.companyId}
                    onChange={(value) => setForm({ ...form, companyId: value })}
                    options={companies.map((company) => ({
                      value: String(company.id),
                      label: company.name,
                    }))}
                    placeholder="Select company"
                    required
                  />
                </div>
                <div>
                  <label htmlFor="pl-uni-sup" className="block text-xs font-bold uppercase tracking-wider text-slate-800 mb-1.5">
                    University Supervisor
                  </label>
                  <CustomSelect
                    id="pl-uni-sup"
                    value={form.universitySupervisor}
                    onChange={(value) => setForm({ ...form, universitySupervisor: value })}
                    options={universitySupervisors.map((supervisor) => ({
                      value: supervisor.username,
                      label: supervisor.username,
                    }))}
                    placeholder="Unassigned"
                  />
                </div>
                <div>
                  <label htmlFor="pl-co-sup" className="block text-xs font-bold uppercase tracking-wider text-slate-800 mb-1.5">
                    Company Supervisor
                  </label>
                  <CustomSelect
                    id="pl-co-sup"
                    value={form.companySupervisor}
                    onChange={(value) => setForm({ ...form, companySupervisor: value })}
                    options={companySupervisors.map((supervisor) => ({
                      value: supervisor.username,
                      label: supervisor.username,
                    }))}
                    placeholder="Select company supervisor"
                  />
                </div>
                <div>
                  <label htmlFor="pl-status" className="block text-xs font-bold uppercase tracking-wider text-slate-800 mb-1.5">
                    Status
                  </label>
                  <CustomSelect
                    id="pl-status"
                    value={form.status}
                    onChange={(value) => setForm({ ...form, status: value })}
                    options={[
                      { value: 'PENDING', label: 'Pending' },
                      { value: 'ASSIGNED', label: 'Assigned' },
                      { value: 'ACTIVE', label: 'Active' },
                      { value: 'COMPLETED', label: 'Completed' },
                      { value: 'CANCELLED', label: 'Cancelled' },
                    ]}
                  />
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
                    {loading ? 'Saving...' : editingId ? 'Save Changes' : 'Create Placement'}
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Evaluation Modal */}
      {evaluationPlacement && (
        <EvaluationFormModal
          placement={evaluationPlacement}
          onClose={closeEvaluation}
          onSaved={refreshPlacements}
        />
      )}
    </div>
  );
}
