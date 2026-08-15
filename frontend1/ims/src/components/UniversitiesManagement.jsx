import { useEffect, useState } from 'react';
import { fetchUniversities, createUniversity, deleteUniversity, updateUniversity } from '../services/api';
import ExportButton from './ExportButton';

const initialForm = {
  name: '',
  code: '',
  location: '',
  email: '',
};

export default function UniversitiesManagement() {
  const [universities, setUniversities] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm] = useState(initialForm);
  const [editingId, setEditingId] = useState(null);

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
    setEditingId(existingUniversity?.id ?? null);
    setForm(existingUniversity ? {
      name: existingUniversity.name || '',
      code: existingUniversity.code || '',
      location: existingUniversity.location || '',
      email: existingUniversity.email || '',
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
      setError('University name is required.');
      return;
    }

    setLoading(true);
    try {
      const payload = {
        name: form.name.trim(),
        code: form.code.trim(),
        location: form.location.trim(),
        email: form.email.trim(),
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

  const tableRows = universities.map((university) => (
    <tr key={university.id}>
      <td>{university.id}</td>
      <td>{university.name}</td>
      <td>{university.code || '—'}</td>
      <td>{university.location || '—'}</td>
      <td>{university.email || '—'}</td>
      <td>
        <button className="icon-button edit" onClick={() => openModal(university)}>
          Edit
        </button>
        <button className="icon-button delete" onClick={() => handleDelete(university.id)}>
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
            <h2 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 600 }}>University Management</h2>
            <p style={{ margin: 0, opacity: 0.7, fontSize: '0.875rem', marginTop: '0.25rem' }}>
              Manage universities and their details from the backend.
            </p>
          </div>
          <ExportButton data={universities} fileName="universities" exportUrl="/api/universities/export/csv" />
          <button className="secondary-button" onClick={() => openModal(null)}>
            Add New University
          </button>
        </div>
      </div>

      {error && <div className="alert alert-error">{error}</div>}
      {loading && <div className="status-message">Loading...</div>}

      <div className="table-wrapper">
        <table>
          <thead>
            <tr>
              <th>ID</th>
              <th>University Name</th>
              <th>Code / Abbreviation</th>
              <th>Location / Address</th>
              <th>Contact Email</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {universities.length > 0 ? tableRows : (
              <tr>
                <td colSpan="6" className="empty-row">
                  No universities found. Click "Add New University" to create one.
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
              <h2>{editingId ? 'Edit University' : 'Add University'}</h2>
              <button className="close-button" onClick={closeModal}>
                ×
              </button>
            </div>
            <form onSubmit={handleSubmit} className="modal-form">
              <label>
                University Name
                <input
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                />
              </label>
              <label>
                Code / Abbreviation
                <input
                  value={form.code}
                  onChange={(e) => setForm({ ...form, code: e.target.value })}
                />
              </label>
              <label>
                Location / Address
                <input
                  value={form.location}
                  onChange={(e) => setForm({ ...form, location: e.target.value })}
                />
              </label>
              <label>
                Contact Email
                <input
                  type="email"
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                />
              </label>
              <div className="modal-actions">
                <button type="button" className="secondary-button" onClick={closeModal}>
                  Cancel
                </button>
                <button type="submit" className="primary-button">
                  {editingId ? 'Save Changes' : 'Create University'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
