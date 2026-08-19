import { useEffect, useState } from 'react';
import { createCompany, deleteCompany, fetchCompanies, updateCompany } from '../services/api';
import ExportButton from './ExportButton';

const initialForm = {
  name: '',
  country: '',
  branch: '',
  email: '',
  website: '',
  postalAddress: '',
};

export default function CompanyPage() {
  const [companies, setCompanies] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm] = useState(initialForm);
  const [editingId, setEditingId] = useState(null);

  useEffect(() => {
    refreshCompanies();
  }, []);

  async function refreshCompanies() {
    setLoading(true);
    setError('');
    try {
      setCompanies(await fetchCompanies());
    } catch (err) {
      setError(err.message || 'Unable to load companies.');
    } finally {
      setLoading(false);
    }
  }

  function openModal(existingCompany) {
    setEditingId(existingCompany?.id ?? null);
    setForm(existingCompany ? {
      name: existingCompany.name || '',
      country: existingCompany.location || '',
      branch: existingCompany.department || '',
      email: existingCompany.email || '',
      website: existingCompany.website || '',
      postalAddress: existingCompany.profile?.split(' | ')[0] || '',
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

    if (!form.name.trim() || !form.email.trim() || !form.website.trim()) {
      setError('Name, email and website are required.');
      return;
    }

    setLoading(true);
    try {
      const payload = {
        name: form.name.trim(),
        country: form.country.trim(),
        branch: form.branch.trim(),
        email: form.email.trim(),
        website: form.website.trim(),
        postalAddress: form.postalAddress.trim(),
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

  const tableRows = companies.map((company) => {
      const [postalAddress] = company.profile?.split(' | ') || [''];
      return (
        <tr key={company.id} style={{ borderBottom: '1px solid #f3f4f6' }}>
          <td style={{ padding: '16px 24px', fontSize: '0.875rem', color: '#111827' }}>{company.name}</td>
          <td style={{ padding: '16px 24px', fontSize: '0.875rem', color: '#374151' }}>{company.location}</td>
          <td style={{ padding: '16px 24px', fontSize: '0.875rem', color: '#374151' }}>{company.department}</td>
          <td style={{ padding: '16px 24px', fontSize: '0.875rem', color: '#374151' }}>{company.email}</td>
          <td style={{ padding: '16px 24px', fontSize: '0.875rem', color: '#374151' }}>
            <a href={company.website} target="_blank" rel="noreferrer" style={{ color: '#065f46', textDecoration: 'none' }}>
              {company.website}
            </a>
          </td>
          <td style={{ padding: '16px 24px', fontSize: '0.875rem', color: '#374151' }}>{postalAddress}</td>
          <td style={{ padding: '16px 24px', fontSize: '0.875rem' }}>
            <div style={{ display: 'flex', gap: '8px' }}>
              <button className="icon-button edit" onClick={() => openModal(company)}>
                Edit
              </button>
              <button className="icon-button delete" onClick={() => handleDelete(company.id)}>
                Delete
              </button>
            </div>
          </td>
        </tr>
      );
    }
  );

  return (
    <div className="flex-1 flex flex-col w-full p-6 bg-gray-50 min-h-screen">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-6 w-full gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Company Management</h1>
          <p className="text-sm text-gray-500">Manage companies and their details from the backend.</p>
        </div>
        <div className="flex gap-3">
          <ExportButton data={companies} fileName="companies" exportUrl="/api/companies/export/csv" />
          <button
            className="bg-emerald-700 hover:bg-emerald-800 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
            onClick={() => openModal(null)}
          >
            + Add Company
          </button>
        </div>
      </div>

      {error && <div className="alert alert-error">{error}</div>}
      {loading && <div className="status-message">Loading...</div>}

      <div className="w-full bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto w-full">
          <table className="w-full text-left text-sm border-collapse">
            <thead>
              <tr style={{ borderBottom: '1px solid #e5e7eb' }}>
                <th style={{ padding: '16px 24px', fontSize: '0.875rem', fontWeight: 600, color: '#374151' }}>Company Name</th>
                <th style={{ padding: '16px 24px', fontSize: '0.875rem', fontWeight: 600, color: '#374151' }}>Country</th>
                <th style={{ padding: '16px 24px', fontSize: '0.875rem', fontWeight: 600, color: '#374151' }}>Branch</th>
                <th style={{ padding: '16px 24px', fontSize: '0.875rem', fontWeight: 600, color: '#374151' }}>Email</th>
                <th style={{ padding: '16px 24px', fontSize: '0.875rem', fontWeight: 600, color: '#374151' }}>Website</th>
                <th style={{ padding: '16px 24px', fontSize: '0.875rem', fontWeight: 600, color: '#374151' }}>Postal Address</th>
                <th style={{ padding: '16px 24px', fontSize: '0.875rem', fontWeight: 600, color: '#374151' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {companies.length > 0 ? tableRows : (
                <tr>
                  <td colSpan="7" className="empty-row" style={{ padding: '24px' }}>
                    No companies found. Add one to get started.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {modalOpen && (
        <div className="modal-overlay" onClick={closeModal}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>{editingId ? 'Edit Company' : 'Add Company'}</h2>
              <button className="close-button" onClick={closeModal}>
                ×
              </button>
            </div>
            <form onSubmit={handleSubmit} className="modal-form">
              <label>
                Company Name
                <input
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                />
              </label>
              <label>
                Country
                <input
                  value={form.country}
                  onChange={(e) => setForm({ ...form, country: e.target.value })}
                />
              </label>
              <label>
                Branch
                <input
                  value={form.branch}
                  onChange={(e) => setForm({ ...form, branch: e.target.value })}
                />
              </label>
              <label>
                Company Email
                <input
                  type="email"
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                />
              </label>
              <label>
                Website
                <input
                  value={form.website}
                  onChange={(e) => setForm({ ...form, website: e.target.value })}
                />
              </label>
              <label>
                Postal Address
                <input
                  value={form.postalAddress}
                  onChange={(e) => setForm({ ...form, postalAddress: e.target.value })}
                />
              </label>
              <div className="modal-actions">
                <button type="button" className="secondary-button" onClick={closeModal}>
                  Cancel
                </button>
                <button type="submit" className="primary-button">
                  {editingId ? 'Save Changes' : 'Create Company'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
