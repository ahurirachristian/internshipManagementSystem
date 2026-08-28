import { useEffect, useState } from 'react';
import { createVacancy, deleteVacancy, fetchVacancies, updateVacancy } from '../services/api';
import ExportButton from './ExportButton';

const initialForm = {
  title: '',
  description: '',
  companyId: '',
  location: '',
  requirements: '',
  status: 'OPEN',
};

export default function VacanciesManagement() {
  const [vacancies, setVacancies] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm] = useState(initialForm);
  const [editingId, setEditingId] = useState(null);

  useEffect(() => {
    refreshVacancies();
  }, []);

  async function refreshVacancies() {
    setLoading(true);
    setError('');
    try {
      setVacancies(await fetchVacancies());
    } catch (err) {
      setError(err.message || 'Unable to load vacancies.');
    } finally {
      setLoading(false);
    }
  }

  function openModal(existingVacancy) {
    setEditingId(existingVacancy?.id ?? null);
    setForm(existingVacancy ? {
      title: existingVacancy.title || '',
      description: existingVacancy.description || '',
      companyId: String(existingVacancy.companyId ?? ''),
      location: existingVacancy.location || '',
      requirements: existingVacancy.requirements || '',
      status: existingVacancy.status || 'OPEN',
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

    if (!form.title.trim() || !form.companyId) {
      setError('Title and company are required.');
      return;
    }

    setLoading(true);
    try {
      const payload = {
        title: form.title.trim(),
        description: form.description.trim(),
        companyId: Number(form.companyId),
        location: form.location.trim(),
        requirements: form.requirements.trim(),
        status: form.status,
      };

      if (editingId) {
        await updateVacancy(editingId, payload);
      } else {
        await createVacancy(payload);
      }

      await refreshVacancies();
      closeModal();
    } catch (err) {
      setError(err.message || 'Unable to save vacancy.');
    } finally {
      setLoading(false);
    }
  }

  async function handleDelete(id) {
    if (!window.confirm('Delete this vacancy?')) return;
    setLoading(true);
    try {
      await deleteVacancy(id);
      await refreshVacancies();
    } catch (err) {
      setError(err.message || 'Unable to delete vacancy.');
    } finally {
      setLoading(false);
    }
  }

  const tableRows = vacancies.map((vacancy) => (
    <tr key={vacancy.id}>
      <td>{vacancy.title}</td>
      <td>{vacancy.description}</td>
      <td>{vacancy.companyId}</td>
      <td>{vacancy.location}</td>
      <td>{vacancy.requirements}</td>
      <td>{vacancy.status}</td>
      <td>
        <button className="icon-button edit" onClick={() => openModal(vacancy)}>
          Edit
        </button>
        <button className="icon-button delete" onClick={() => handleDelete(vacancy.id)}>
          Delete
        </button>
      </td>
    </tr>
  ));

  return (
    <div className="w-full max-w-7xl mx-auto">
      <div className="card" style={{ marginBottom: '1.5rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
          <div>
            <h2 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 600 }}>Vacancies Management</h2>
            <p style={{ margin: 0, opacity: 0.7, fontSize: '0.875rem', marginTop: '0.25rem' }}>
              Manage internship vacancies from the backend.
            </p>
          </div>
          <ExportButton data={vacancies} fileName="vacancies" exportUrl="/api/vacancies" />
          <button className="secondary-button" onClick={() => openModal(null)}>
            Add Vacancy
          </button>
        </div>
      </div>

      {error && <div className="alert alert-error">{error}</div>}
      {loading && <div className="status-message">Loading...</div>}

      <div className="table-wrapper">
        <table>
          <thead>
            <tr>
              <th>Title</th>
              <th>Description</th>
              <th>Company ID</th>
              <th>Location</th>
              <th>Requirements</th>
              <th>Status</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {vacancies.length > 0 ? tableRows : (
              <tr>
                <td colSpan="7" className="empty-row">
                  No vacancies found. Click "Add Vacancy" to create one.
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
              <h2>{editingId ? 'Edit Vacancy' : 'Add Vacancy'}</h2>
              <button className="close-button" onClick={closeModal}>
                ×
              </button>
            </div>
            <form onSubmit={handleSubmit} className="modal-form">
              <label>
                Title
                <input
                  value={form.title}
                  onChange={(e) => setForm({ ...form, title: e.target.value })}
                />
              </label>
              <label>
                Description
                <textarea
                  rows="3"
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                />
              </label>
              <label>
                Company ID
                <input
                  type="number"
                  value={form.companyId}
                  onChange={(e) => setForm({ ...form, companyId: e.target.value })}
                />
              </label>
              <label>
                Location
                <input
                  value={form.location}
                  onChange={(e) => setForm({ ...form, location: e.target.value })}
                />
              </label>
              <label>
                Requirements
                <textarea
                  rows="3"
                  value={form.requirements}
                  onChange={(e) => setForm({ ...form, requirements: e.target.value })}
                />
              </label>
              <label>
                Status
                <select
                  value={form.status}
                  onChange={(e) => setForm({ ...form, status: e.target.value })}
                >
                  <option value="OPEN">Open</option>
                  <option value="CLOSED">Closed</option>
                  <option value="FILLED">Filled</option>
                </select>
              </label>
              <div className="modal-actions">
                <button type="button" className="secondary-button" onClick={closeModal}>
                  Cancel
                </button>
                <button type="submit" className="primary-button">
                  {editingId ? 'Save Changes' : 'Create Vacancy'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
