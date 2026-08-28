import { useEffect, useMemo, useState } from 'react';
import {
  Pencil,
  Trash2,
  Plus,
  GraduationCap,
  X,
  AlertCircle,
  FileText,
  Search,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import { fetchUniversities, createUniversity, deleteUniversity, updateUniversity } from '../services/api';
import ExportButton from './ExportButton';

const ITEMS_PER_PAGE = 10;

const initialForm = {
  fullName: '',
  shortForm: '',
  country: '',
  establishedYear: '',
};

export default function UniversitiesManagement() {
  const [universities, setUniversities] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm] = useState(initialForm);
  const [editingId, setEditingId] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);

  const filteredUniversities = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    if (!q) return universities;
    return universities.filter((u) =>
      (u.fullName || '').toLowerCase().includes(q) ||
      (u.shortForm || '').toLowerCase().includes(q) ||
      (u.country || '').toLowerCase().includes(q) ||
      String(u.establishedYear || '').includes(q)
    );
  }, [universities, searchQuery]);

  const totalPages = Math.ceil(filteredUniversities.length / ITEMS_PER_PAGE);

  const paginatedUniversities = useMemo(() => {
    const start = (currentPage - 1) * ITEMS_PER_PAGE;
    return filteredUniversities.slice(start, start + ITEMS_PER_PAGE);
  }, [filteredUniversities, currentPage]);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery]);

  useEffect(() => {
    refreshUniversities();
  }, []);

  async function refreshUniversities() {
    setLoading(true);
    setError('');
    try {
      setUniversities(await fetchUniversities());
    } catch (err) {
      setUniversities([]);
      if (err.status !== 404) {
        setError(err.message || 'Unable to load universities.');
      }
    } finally {
      setLoading(false);
    }
  }

  function openModal(existingUniversity) {
    setEditingId(existingUniversity?.universityId ?? null);
    setForm(existingUniversity ? {
      fullName: existingUniversity.fullName || '',
      shortForm: existingUniversity.shortForm || '',
      country: existingUniversity.country || '',
      establishedYear: existingUniversity.establishedYear || '',
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

    if (!form.fullName.trim()) {
      setError('University name is required.');
      return;
    }
    if (!form.shortForm.trim()) {
      setError('Short form / abbreviation is required.');
      return;
    }

    setLoading(true);
    try {
      const payload = {
        fullName: form.fullName.trim(),
        shortForm: form.shortForm.trim(),
        country: form.country.trim() || 'Uganda',
        establishedYear: form.establishedYear ? parseInt(form.establishedYear, 10) : null,
      };

      if (editingId) {
        await updateUniversity(editingId, payload);
      } else {
        await createUniversity(payload);
      }

      await refreshUniversities();
      closeModal();
    } catch (err) {
      setError(err.message || 'Unable to save university.');
    } finally {
      setLoading(false);
    }
  }

  async function handleDelete(id) {
    if (!window.confirm('Delete this university?')) return;
    setLoading(true);
    try {
      await deleteUniversity(id);
      await refreshUniversities();
    } catch (err) {
      setError(err.message || 'Unable to delete university.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-6 max-w-7xl mx-auto">

      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2 text-[11px] font-semibold text-teal-700/70 uppercase tracking-wider mb-1.5">
            <span>Administration</span>
            <span className="text-slate-400">/</span>
            <span>Universities</span>
          </div>
        </div>
        <div className="flex flex-col sm:flex-row sm:items-center gap-2.5 w-full sm:w-auto">
          <div className="relative flex-1 sm:flex-none">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search universities..."
              className="w-full sm:w-52 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 text-xs rounded-xl border border-slate-300 dark:border-slate-700 pl-9 pr-3 py-2 focus:border-teal-600 focus:ring-2 focus:ring-teal-600/20 focus:outline-none transition-all shadow-xs font-medium placeholder:text-slate-400"
              aria-label="Search universities"
            />
          </div>
          <div className="flex items-center gap-2.5">
            <ExportButton data={universities} fileName="universities" exportUrl="/api/universities/export/csv" />
            <button
              type="button"
              onClick={() => openModal(null)}
              className="h-9 px-3.5 py-2 rounded-xl bg-primary hover:bg-primary text-white text-xs font-bold shadow-xs transition-all flex items-center gap-1.5 focus-visible:ring-2 focus-visible:ring-teal-600 focus-visible:outline-none"
            >
              <Plus className="w-4 h-4" />
              <span>Add University</span>
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
        <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400 font-medium">
          <div className="w-4 h-4 border-2 border-teal-600 border-t-transparent rounded-full animate-spin" />
          <span>Loading universities...</span>
        </div>
      )}

      {/* Table */}
      <section id="universities-table-container" aria-labelledby="universities-table-title" className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs overflow-hidden">
        <div className="overflow-x-auto custom-scrollbar">
          <table className="w-full text-left border-collapse" style={{ minWidth: '800px' }} aria-label="Universities list">
            <thead>
              <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-50/90 dark:bg-slate-800/60 text-[11px] font-bold tracking-wider text-slate-800 dark:text-slate-200">
                <th scope="col" className="py-3.5 px-3 pl-5">ID</th>
                <th scope="col" className="py-3.5 px-3">University Name</th>
                <th scope="col" className="py-3.5 px-3">Short Form</th>
                <th scope="col" className="py-3.5 px-3">Country</th>
                <th scope="col" className="py-3.5 px-3">Est. Year</th>
                <th scope="col" className="py-3.5 px-3 pr-5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-sm">
              {paginatedUniversities.length > 0 ? paginatedUniversities.map((university) => (
                <tr key={university.universityId} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/60 transition-colors">
                  <td className="py-3.5 px-3 pl-5 text-xs font-medium text-slate-500 dark:text-slate-400">{university.universityId}</td>
                  <td className="py-3.5 px-3">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg bg-teal-50 text-teal-700 border border-teal-200 flex items-center justify-center shrink-0 shadow-xs">
                        <GraduationCap className="w-4 h-4" />
                      </div>
                      <span className="font-bold text-slate-900 dark:text-slate-100">{university.fullName}</span>
                    </div>
                  </td>
                  <td className="py-3.5 px-3">
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-800">
                      {university.shortForm || '—'}
                    </span>
                  </td>
                  <td className="py-3.5 px-3 text-xs text-slate-600 dark:text-slate-400">{university.country || '—'}</td>
                  <td className="py-3.5 px-3 text-xs text-slate-600 dark:text-slate-400">{university.establishedYear || '—'}</td>
                  <td className="py-3.5 px-3 pr-5 text-right">
                    <ul className="flex items-center justify-end gap-1 list-none p-0 m-0">
                      <li>
                        <button
                          type="button"
                          onClick={() => openModal(university)}
                          className="p-1.5 text-emerald-600 hover:text-emerald-800 hover:bg-emerald-50 rounded-lg transition-colors focus-visible:ring-2 focus-visible:ring-emerald-600 focus-visible:outline-none"
                          aria-label={`Edit ${university.fullName}`}
                          title="Edit"
                        >
                          <Pencil className="w-4 h-4" />
                        </button>
                      </li>
                      <li>
                        <button
                          type="button"
                          onClick={() => handleDelete(university.universityId)}
                          className="p-1.5 text-rose-600 hover:text-rose-800 hover:bg-rose-50 rounded-lg transition-colors focus-visible:ring-2 focus-visible:ring-rose-600 focus-visible:outline-none"
                          aria-label={`Delete ${university.fullName}`}
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
                  <td colSpan={6} className="py-12 px-4 text-center">
                    <div className="max-w-sm mx-auto flex flex-col items-center">
                      <div className="w-12 h-12 rounded-full bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-800 flex items-center justify-center text-slate-400 mb-3">
                        {searchQuery ? <Search className="w-6 h-6" /> : <FileText className="w-6 h-6" />}
                      </div>
                      <h3 className="text-base font-bold text-slate-800 dark:text-slate-200">
                        {searchQuery ? 'No results found' : 'No universities found'}
                      </h3>
                      <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 mb-4">
                        {searchQuery ? (
                          <>No universities match &ldquo;<strong>{searchQuery}</strong>&rdquo;. Try a different search term.</>
                        ) : (
                          <>Click &ldquo;Add University&rdquo; to register a new institution.</>
                        )}
                      </p>
                      {!searchQuery && (
                        <button
                          type="button"
                          onClick={() => openModal(null)}
                          className="px-3.5 py-2 bg-primary hover:bg-primary text-white font-bold text-xs rounded-xl transition-colors shadow-xs focus-visible:ring-2 focus-visible:ring-teal-600 focus-visible:outline-none"
                        >
                          Add University
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
        {filteredUniversities.length > ITEMS_PER_PAGE && (
          <div className="px-5 py-3 border-t border-slate-200 dark:border-slate-800 bg-slate-50/90 dark:bg-slate-800/60 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-600 dark:text-slate-400">
            <span>
              Showing {((currentPage - 1) * ITEMS_PER_PAGE) + 1}–{Math.min(currentPage * ITEMS_PER_PAGE, filteredUniversities.length)} of {filteredUniversities.length} universities
            </span>
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                className="p-1.5 rounded-lg text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:bg-slate-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
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
                          ? 'bg-primary text-white'
                          : 'text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:bg-slate-700'
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
                className="p-1.5 rounded-lg text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:bg-slate-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
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
          aria-labelledby="university-modal-title"
          className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 sm:p-6 animate-in fade-in duration-150"
          onClick={closeModal}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="bg-white dark:bg-slate-900 w-full max-w-lg rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden flex flex-col max-h-[90vh] animate-in zoom-in-95 duration-150"
          >
            {/* Modal Header */}
            <div className="p-4 sm:p-5 bg-slate-50 dark:bg-slate-800/40 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between gap-4">
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-10 h-10 rounded-xl bg-teal-50 border border-teal-200 flex items-center justify-center text-teal-800 shrink-0">
                  <GraduationCap className="w-5 h-5" />
                </div>
                <h3 id="university-modal-title" className="text-base font-bold text-slate-900 dark:text-slate-100">
                  {editingId ? 'Edit University' : 'Add University'}
                </h3>
              </div>
              <button
                type="button"
                onClick={closeModal}
                className="p-2 text-slate-400 hover:text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:bg-slate-700 rounded-lg transition-colors focus-visible:ring-2 focus-visible:ring-teal-600 focus-visible:outline-none"
                aria-label="Close modal"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Form */}
            <form onSubmit={handleSubmit} className="flex flex-col flex-1 min-h-0">
              <div className="p-6 space-y-5 overflow-y-auto flex-1">
                <div>
                  <label htmlFor="uni-fullName" className="block text-xs font-bold uppercase tracking-wider text-slate-800 dark:text-slate-200 mb-1.5">
                    University Name <span className="text-rose-600" aria-hidden="true">*</span>
                  </label>
                  <input
                    id="uni-fullName"
                    type="text"
                    value={form.fullName}
                    onChange={(e) => setForm({ ...form, fullName: e.target.value })}
                    placeholder="e.g. Makerere University"
                    required
                    className="w-full bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 text-xs rounded-xl border border-slate-300 dark:border-slate-700 px-3.5 py-2.5 focus:border-teal-600 focus:ring-2 focus:ring-teal-600/20 focus:outline-none transition-all shadow-xs font-medium"
                  />
                </div>
                <div>
                  <label htmlFor="uni-shortForm" className="block text-xs font-bold uppercase tracking-wider text-slate-800 dark:text-slate-200 mb-1.5">
                    Short Form / Abbreviation <span className="text-rose-600" aria-hidden="true">*</span>
                  </label>
                  <input
                    id="uni-shortForm"
                    type="text"
                    value={form.shortForm}
                    onChange={(e) => setForm({ ...form, shortForm: e.target.value })}
                    placeholder="e.g. MAK"
                    required
                    className="w-full bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 text-xs rounded-xl border border-slate-300 dark:border-slate-700 px-3.5 py-2.5 focus:border-teal-600 focus:ring-2 focus:ring-teal-600/20 focus:outline-none transition-all shadow-xs font-medium"
                  />
                </div>
                <div>
                  <label htmlFor="uni-country" className="block text-xs font-bold uppercase tracking-wider text-slate-800 dark:text-slate-200 mb-1.5">
                    Country
                  </label>
                  <input
                    id="uni-country"
                    type="text"
                    value={form.country}
                    onChange={(e) => setForm({ ...form, country: e.target.value })}
                    placeholder="e.g. Uganda"
                    className="w-full bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 text-xs rounded-xl border border-slate-300 dark:border-slate-700 px-3.5 py-2.5 focus:border-teal-600 focus:ring-2 focus:ring-teal-600/20 focus:outline-none transition-all shadow-xs font-medium"
                  />
                </div>
                <div>
                  <label htmlFor="uni-establishedYear" className="block text-xs font-bold uppercase tracking-wider text-slate-800 dark:text-slate-200 mb-1.5">
                    Established Year
                  </label>
                  <input
                    id="uni-establishedYear"
                    type="number"
                    value={form.establishedYear}
                    onChange={(e) => setForm({ ...form, establishedYear: e.target.value })}
                    placeholder="e.g. 1922"
                    min="1800"
                    max="2100"
                    className="w-full bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 text-xs rounded-xl border border-slate-300 dark:border-slate-700 px-3.5 py-2.5 focus:border-teal-600 focus:ring-2 focus:ring-teal-600/20 focus:outline-none transition-all shadow-xs font-medium"
                  />
                </div>
              </div>

              {/* Modal Footer */}
              <div className="p-4 sm:p-5 bg-slate-50 dark:bg-slate-800/40 border-t border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-3">
                <div />
                <div className="flex items-center gap-2.5 w-full sm:w-auto">
                  <button
                    type="button"
                    onClick={closeModal}
                    className="flex-1 sm:flex-none px-3.5 py-2 rounded-xl bg-white dark:bg-slate-900 hover:bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs font-semibold border border-slate-300 dark:border-slate-700 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={loading}
                    className="flex-1 sm:flex-none px-4 py-2 rounded-xl bg-primary hover:bg-primary text-white text-xs font-bold transition-all flex items-center justify-center gap-1.5 shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {loading ? 'Saving...' : editingId ? 'Save Changes' : 'Create University'}
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
