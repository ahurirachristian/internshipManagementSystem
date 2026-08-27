import { useEffect, useMemo, useState } from 'react';
import {
  Building2,
  Pencil,
  Trash2,
  Plus,
  X,
  AlertCircle,
  FileText,
  Search,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import { createCompany, deleteCompany, fetchCompanies, updateCompany } from '../services/api';
import ExportButton from './ExportButton';

const ITEMS_PER_PAGE = 10;

const initialForm = {
  name: '',
  industry: '',
  country: '',
  city: '',
  email: '',
  website: '',
  phone: '',
  registrationNumber: '',
  postalAddress: '',
  physicalAddress: '',
  description: '',
};

export default function CompanyPage() {
  const [companies, setCompanies] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm] = useState(initialForm);
  const [editingId, setEditingId] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);

  const filteredCompanies = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    if (!q) return companies;
    return companies.filter((c) =>
      (c.name || '').toLowerCase().includes(q) ||
      (c.country || '').toLowerCase().includes(q) ||
      (c.city || '').toLowerCase().includes(q) ||
      (c.industry || '').toLowerCase().includes(q) ||
      (c.email || '').toLowerCase().includes(q) ||
      (c.website || '').toLowerCase().includes(q)
    );
  }, [companies, searchQuery]);

  const totalPages = Math.ceil(filteredCompanies.length / ITEMS_PER_PAGE);

  const paginatedCompanies = useMemo(() => {
    const start = (currentPage - 1) * ITEMS_PER_PAGE;
    return filteredCompanies.slice(start, start + ITEMS_PER_PAGE);
  }, [filteredCompanies, currentPage]);

  useEffect(() => {
    refreshCompanies();
  }, []);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery]);

  async function refreshCompanies() {
    setLoading(true);
    setError('');
    try {
      setCompanies(await fetchCompanies());
    } catch (err) {
      setCompanies([]);
      if (err.status !== 404) {
        setError(err.message || 'Unable to load companies.');
      }
    } finally {
      setLoading(false);
    }
  }

  function openModal(existingCompany) {
    setEditingId(existingCompany?.id ?? null);
    setForm(existingCompany ? {
      name: existingCompany.name || '',
      industry: existingCompany.industry || '',
      country: existingCompany.country || '',
      city: existingCompany.city || '',
      email: existingCompany.email || '',
      website: existingCompany.website || '',
      phone: existingCompany.phone || '',
      registrationNumber: existingCompany.registrationNumber || '',
      postalAddress: existingCompany.postalAddress || '',
      physicalAddress: existingCompany.physicalAddress || '',
      description: existingCompany.description || '',
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

    if (!form.name.trim()) {
      setError('Company name is required.');
      return;
    }

    setLoading(true);
    try {
      const payload = {
        name: form.name.trim(),
        industry: form.industry.trim(),
        country: form.country.trim(),
        city: form.city.trim(),
        email: form.email.trim(),
        website: form.website.trim(),
        phone: form.phone.trim(),
        registrationNumber: form.registrationNumber.trim(),
        postalAddress: form.postalAddress.trim(),
        physicalAddress: form.physicalAddress.trim(),
        description: form.description.trim(),
      };

      if (editingId) {
        await updateCompany(editingId, payload);
      } else {
        await createCompany(payload);
      }

      await refreshCompanies();
      closeModal();
    } catch (err) {
      setError(err.message || 'Unable to save company.');
    } finally {
      setLoading(false);
    }
  }

  async function handleDelete(id) {
    if (!window.confirm('Delete this company?')) return;
    setLoading(true);
    try {
      await deleteCompany(id);
      await refreshCompanies();
    } catch (err) {
      setError(err.message || 'Unable to delete company.');
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
            <span>Companies</span>
          </div>
        </div>
        <div className="flex flex-col sm:flex-row sm:items-center gap-2.5 w-full sm:w-auto">
          <div className="relative flex-1 sm:flex-none">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search companies..."
              className="w-full sm:w-52 bg-white text-slate-900 text-xs rounded-xl border border-slate-300 pl-9 pr-3 py-2 focus:border-teal-600 focus:ring-2 focus:ring-teal-600/20 focus:outline-none transition-all shadow-xs font-medium placeholder:text-slate-400"
              aria-label="Search companies"
            />
          </div>
          <div className="flex items-center gap-2.5">
            <div className="[&_button]:h-9 [&_button]:px-3.5 [&_button]:py-2 [&_button]:rounded-xl [&_button]:text-xs [&_button]:font-bold [&_button]:border-slate-300 [&_button]:bg-white [&_button]:text-slate-700 [&_button]:hover:bg-slate-100 [&_button]:transition-colors [&_button]:flex [&_button]:items-center [&_button]:gap-1.5 [&_button]:shadow-xs [&_button]:border [&_button]:disabled:opacity-50 [&_button]:disabled:cursor-not-allowed">
              <ExportButton data={companies} fileName="companies" exportUrl="/api/companies/export/csv" />
            </div>
            <button
              type="button"
              onClick={() => openModal(null)}
              className="h-9 px-3.5 py-2 rounded-xl bg-primary hover:bg-primary text-white text-xs font-bold shadow-xs transition-all flex items-center gap-1.5 focus-visible:ring-2 focus-visible:ring-teal-600 focus-visible:outline-none"
            >
              <Plus className="w-4 h-4" />
              <span>Add Company</span>
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
          <span>Loading companies...</span>
        </div>
      )}

      {/* Table */}
      <section className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="overflow-x-auto custom-scrollbar">
          <table className="w-full text-left border-collapse" style={{ minWidth: '900px' }} aria-label="Companies list">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50/90 text-[11px] font-bold tracking-wider text-slate-800">
                <th scope="col" className="py-3.5 px-3 pl-5">Company Name</th>
                <th scope="col" className="py-3.5 px-3">Industry</th>
                <th scope="col" className="py-3.5 px-3">Country</th>
                <th scope="col" className="py-3.5 px-3">City</th>
                <th scope="col" className="py-3.5 px-3">Email</th>
                <th scope="col" className="py-3.5 px-3">Website</th>
                <th scope="col" className="py-3.5 px-3 pr-5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-sm">
              {paginatedCompanies.length > 0 ? paginatedCompanies.map((company) => (
                <tr key={company.id} className="hover:bg-slate-50/80 transition-colors">
                  <td className="py-3.5 px-3 pl-5">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg bg-teal-50 text-teal-700 border border-teal-200 flex items-center justify-center shrink-0 shadow-xs">
                        <Building2 className="w-4 h-4" />
                      </div>
                      <span className="font-bold text-slate-900">{company.name}</span>
                    </div>
                  </td>
                  <td className="py-3.5 px-3 text-xs text-slate-600">{company.industry || '—'}</td>
                  <td className="py-3.5 px-3 text-xs text-slate-600">{company.country || '—'}</td>
                  <td className="py-3.5 px-3 text-xs text-slate-600">{company.city || '—'}</td>
                  <td className="py-3.5 px-3 text-xs text-slate-600">{company.email || '—'}</td>
                  <td className="py-3.5 px-3">
                    {company.website ? (
                      <a href={company.website.startsWith('http') ? company.website : `https://${company.website}`} target="_blank" rel="noreferrer" className="text-xs text-teal-700 hover:text-teal-900 hover:underline transition-colors">
                        {company.website}
                      </a>
                    ) : <span className="text-xs text-slate-600">—</span>}
                  </td>
                  <td className="py-3.5 px-3 pr-5 text-right">
                    <ul className="flex items-center justify-end gap-1 list-none p-0 m-0">
                      <li>
                        <button
                          type="button"
                          onClick={() => openModal(company)}
                          className="p-1.5 text-emerald-600 hover:text-emerald-800 hover:bg-emerald-50 rounded-lg transition-colors focus-visible:ring-2 focus-visible:ring-emerald-600 focus-visible:outline-none"
                          aria-label={`Edit ${company.name}`}
                          title="Edit"
                        >
                          <Pencil className="w-4 h-4" />
                        </button>
                      </li>
                      <li>
                        <button
                          type="button"
                          onClick={() => handleDelete(company.id)}
                          className="p-1.5 text-rose-600 hover:text-rose-800 hover:bg-rose-50 rounded-lg transition-colors focus-visible:ring-2 focus-visible:ring-rose-600 focus-visible:outline-none"
                          aria-label={`Delete ${company.name}`}
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
                        {searchQuery ? 'No results found' : 'No companies found'}
                      </h3>
                      <p className="text-xs text-slate-500 mt-1 mb-4">
                        {searchQuery ? (
                          <>No companies match &ldquo;<strong>{searchQuery}</strong>&rdquo;. Try a different search term.</>
                        ) : (
                          <>Click &ldquo;Add Company&rdquo; to register a new company.</>
                        )}
                      </p>
                      {!searchQuery && (
                        <button
                          type="button"
                          onClick={() => openModal(null)}
                          className="px-3.5 py-2 bg-primary hover:bg-primary text-white font-bold text-xs rounded-xl transition-colors shadow-xs focus-visible:ring-2 focus-visible:ring-teal-600 focus-visible:outline-none"
                        >
                          Add Company
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
        {filteredCompanies.length >= ITEMS_PER_PAGE && (
          <div className="px-5 py-3 border-t border-slate-200 bg-slate-50/90 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-600">
            <span>
              Showing {((currentPage - 1) * ITEMS_PER_PAGE) + 1}–{Math.min(currentPage * ITEMS_PER_PAGE, filteredCompanies.length)} of {filteredCompanies.length} companies
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
                          ? 'bg-primary text-white'
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
          aria-labelledby="company-modal-title"
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
                  <Building2 className="w-5 h-5" />
                </div>
                <h3 id="company-modal-title" className="text-base font-bold text-slate-900">
                  {editingId ? 'Edit Company' : 'Add Company'}
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
                  <label htmlFor="co-name" className="block text-xs font-bold uppercase tracking-wider text-slate-800 mb-1.5">
                    Company Name <span className="text-rose-600" aria-hidden="true">*</span>
                  </label>
                  <input
                    id="co-name"
                    type="text"
                    value={form.name}
                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                    placeholder="e.g. Airtel Uganda"
                    required
                    className="w-full bg-white text-slate-900 text-xs rounded-xl border border-slate-300 px-3.5 py-2.5 focus:border-teal-600 focus:ring-2 focus:ring-teal-600/20 focus:outline-none transition-all shadow-xs font-medium"
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label htmlFor="co-industry" className="block text-xs font-bold uppercase tracking-wider text-slate-800 mb-1.5">
                      Industry
                    </label>
                    <input
                      id="co-industry"
                      type="text"
                      value={form.industry}
                      onChange={(e) => setForm({ ...form, industry: e.target.value })}
                      placeholder="e.g. Telecommunications"
                      className="w-full bg-white text-slate-900 text-xs rounded-xl border border-slate-300 px-3.5 py-2.5 focus:border-teal-600 focus:ring-2 focus:ring-teal-600/20 focus:outline-none transition-all shadow-xs font-medium"
                    />
                  </div>
                  <div>
                    <label htmlFor="co-registrationNumber" className="block text-xs font-bold uppercase tracking-wider text-slate-800 mb-1.5">
                      Registration No.
                    </label>
                    <input
                      id="co-registrationNumber"
                      type="text"
                      value={form.registrationNumber}
                      onChange={(e) => setForm({ ...form, registrationNumber: e.target.value })}
                      placeholder="e.g. UBS-2010-12345"
                      className="w-full bg-white text-slate-900 text-xs rounded-xl border border-slate-300 px-3.5 py-2.5 focus:border-teal-600 focus:ring-2 focus:ring-teal-600/20 focus:outline-none transition-all shadow-xs font-medium"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label htmlFor="co-country" className="block text-xs font-bold uppercase tracking-wider text-slate-800 mb-1.5">
                      Country
                    </label>
                    <input
                      id="co-country"
                      type="text"
                      value={form.country}
                      onChange={(e) => setForm({ ...form, country: e.target.value })}
                      placeholder="e.g. Uganda"
                      className="w-full bg-white text-slate-900 text-xs rounded-xl border border-slate-300 px-3.5 py-2.5 focus:border-teal-600 focus:ring-2 focus:ring-teal-600/20 focus:outline-none transition-all shadow-xs font-medium"
                    />
                  </div>
                  <div>
                    <label htmlFor="co-city" className="block text-xs font-bold uppercase tracking-wider text-slate-800 mb-1.5">
                      City
                    </label>
                    <input
                      id="co-city"
                      type="text"
                      value={form.city}
                      onChange={(e) => setForm({ ...form, city: e.target.value })}
                      placeholder="e.g. Kampala"
                      className="w-full bg-white text-slate-900 text-xs rounded-xl border border-slate-300 px-3.5 py-2.5 focus:border-teal-600 focus:ring-2 focus:ring-teal-600/20 focus:outline-none transition-all shadow-xs font-medium"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label htmlFor="co-email" className="block text-xs font-bold uppercase tracking-wider text-slate-800 mb-1.5">
                      Email
                    </label>
                    <input
                      id="co-email"
                      type="email"
                      value={form.email}
                      onChange={(e) => setForm({ ...form, email: e.target.value })}
                      placeholder="e.g. info@company.co.ug"
                      className="w-full bg-white text-slate-900 text-xs rounded-xl border border-slate-300 px-3.5 py-2.5 focus:border-teal-600 focus:ring-2 focus:ring-teal-600/20 focus:outline-none transition-all shadow-xs font-medium"
                    />
                  </div>
                  <div>
                    <label htmlFor="co-phone" className="block text-xs font-bold uppercase tracking-wider text-slate-800 mb-1.5">
                      Phone
                    </label>
                    <input
                      id="co-phone"
                      type="text"
                      value={form.phone}
                      onChange={(e) => setForm({ ...form, phone: e.target.value })}
                      placeholder="e.g. 0700000000"
                      className="w-full bg-white text-slate-900 text-xs rounded-xl border border-slate-300 px-3.5 py-2.5 focus:border-teal-600 focus:ring-2 focus:ring-teal-600/20 focus:outline-none transition-all shadow-xs font-medium"
                    />
                  </div>
                </div>
                <div>
                  <label htmlFor="co-website" className="block text-xs font-bold uppercase tracking-wider text-slate-800 mb-1.5">
                    Website
                  </label>
                  <input
                    id="co-website"
                    type="url"
                    value={form.website}
                    onChange={(e) => setForm({ ...form, website: e.target.value })}
                    placeholder="e.g. www.company.co.ug"
                    className="w-full bg-white text-slate-900 text-xs rounded-xl border border-slate-300 px-3.5 py-2.5 focus:border-teal-600 focus:ring-2 focus:ring-teal-600/20 focus:outline-none transition-all shadow-xs font-medium"
                  />
                </div>
                <div>
                  <label htmlFor="co-postal" className="block text-xs font-bold uppercase tracking-wider text-slate-800 mb-1.5">
                    Postal Address
                  </label>
                  <input
                    id="co-postal"
                    type="text"
                    value={form.postalAddress}
                    onChange={(e) => setForm({ ...form, postalAddress: e.target.value })}
                    placeholder="e.g. P.O. Box 12345, Kampala"
                    className="w-full bg-white text-slate-900 text-xs rounded-xl border border-slate-300 px-3.5 py-2.5 focus:border-teal-600 focus:ring-2 focus:ring-teal-600/20 focus:outline-none transition-all shadow-xs font-medium"
                  />
                </div>
                <div>
                  <label htmlFor="co-physical" className="block text-xs font-bold uppercase tracking-wider text-slate-800 mb-1.5">
                    Physical Address
                  </label>
                  <input
                    id="co-physical"
                    type="text"
                    value={form.physicalAddress}
                    onChange={(e) => setForm({ ...form, physicalAddress: e.target.value })}
                    placeholder="e.g. Plot 1, Airtel Road, Nakawa"
                    className="w-full bg-white text-slate-900 text-xs rounded-xl border border-slate-300 px-3.5 py-2.5 focus:border-teal-600 focus:ring-2 focus:ring-teal-600/20 focus:outline-none transition-all shadow-xs font-medium"
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
                    className="flex-1 sm:flex-none px-4 py-2 rounded-xl bg-primary hover:bg-primary text-white text-xs font-bold transition-all flex items-center justify-center gap-1.5 shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {loading ? 'Saving...' : editingId ? 'Save Changes' : 'Create Company'}
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
