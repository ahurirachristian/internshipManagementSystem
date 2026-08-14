import { useEffect, useState } from 'react';
import { createCompany, deleteCompany, fetchCompanies, updateCompany } from '../services/api';

const initialForm = {
  name: '',
  country: '',
  branch: '',
  email: '',
  website: '',
  postalAddress: '',
  physicalAddress: '',
};

export default function CompanyPage({ onLogout }) {
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
      physicalAddress: existingCompany.profile?.split(' | ')[1] || '',
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
        physicalAddress: form.physicalAddress.trim(),
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
      const [postalAddress, physicalAddress] = company.profile?.split(' | ') || ['', ''];
      return (
        <tr key={company.id}>
          <td>{company.name}</td>
          <td>{company.location}</td>
          <td>{company.department}</td>
          <td>{company.email}</td>
          <td>
            <a href={company.website} target="_blank" rel="noreferrer">
              {company.website}
            </a>
          </td>
          <td>{postalAddress}</td>
          <td>{physicalAddress}</td>
          <td>
            <button className="icon-button edit" onClick={() => openModal(company)}>
              Edit
            </button>
            <button className="icon-button delete" onClick={() => handleDelete(company.id)}>
              Delete
            </button>
          </td>
        </tr>
      );
    }
  );

  return (
    <div className="page-shell company-page">
      <header className="company-header">
        <div>
          <h1>Company Management</h1>
          <p>Manage companies and their details from the backend.</p>
        </div>
        <div className="company-actions">
          <button className="secondary-button" onClick={() => openModal(null)}>
            Add Company
          </button>
          <button className="secondary-button" onClick={onLogout}>
            Logout
          </button>
        </div>
      </header>

      {error && <div className="alert alert-error">{error}</div>}
      {loading && <div className="status-message">Loading...</div>}

      <div className="table-wrapper">
        <table>
          <thead>
            <tr>
              <th>Company Name</th>
              <th>Country</th>
              <th>Branch</th>
              <th>Email</th>
              <th>Website</th>
              <th>Postal Address</th>
              <th>Physical Address</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {companies.length > 0 ? tableRows : (
              <tr>
                <td colSpan="8" className="empty-row">
                  No companies found. Add one to get started.
                </td>
              </tr>
            )}
          </tbody>
        </table>
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
              <label>
                Physical Address
                <input
                  value={form.physicalAddress}
                  onChange={(e) => setForm({ ...form, physicalAddress: e.target.value })}
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
