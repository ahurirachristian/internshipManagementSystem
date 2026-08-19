import { useEffect, useState } from 'react';
import { fetchStudents, fetchCompanies, fetchSupervisors, fetchPlacements, createPlacement, updatePlacement, deletePlacement } from '../services/api';
import EvaluationFormModal from './EvaluationForm';
import ExportButton from './ExportButton';

const initialForm = {
  studentId: '',
  companyId: '',
  universitySupervisor: '',
  companySupervisor: '',
  status: 'PENDING',
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

  useEffect(() => {
    refreshPlacements();
    loadStudents();
    loadCompanies();
    loadSupervisors();
  }, []);

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
    return student ? `${student.firstName} ${student.lastName}` : 'Unknown';
  }

  function getCompanyName(companyId) {
    const company = companies.find((c) => String(c.id) === String(companyId));
    return company ? company.name : 'Unknown';
  }

  const tableRows = Array.isArray(placements) ? placements.map((placement) => (
    <tr key={placement.id}>
      <td>{getStudentName(placement.studentId)}</td>
      <td>{getCompanyName(placement.companyId)}</td>
      <td>{placement.universitySupervisor || 'Unassigned'}</td>
      <td>{placement.companySupervisor || 'Unassigned'}</td>
      <td>
        <span className={`badge${placement.status === 'ACTIVE' ? ' badge-success' : placement.status === 'PENDING' ? ' badge-warning' : ''}`}>
          {placement.status}
        </span>
      </td>
      <td>
        <button className="icon-button edit" onClick={() => openModal(placement)}>
          Edit
        </button>
        <button className="icon-button delete" onClick={() => handleDelete(placement.id)}>
          Delete
        </button>
        <button className="icon-button" onClick={() => openEvaluation(placement)}>
          Evaluate
        </button>
      </td>
    </tr>
  )) : [];

  return (
    <div className="w-full max-w-7xl mx-auto">
      <div className="card" style={{ marginBottom: '1.5rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
          <div>
            <h2 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 600 }}>Placement & Supervisor Management</h2>
            <p style={{ margin: 0, opacity: 0.7, fontSize: '0.875rem', marginTop: '0.25rem' }}>
              Manage student placements and supervisor assignments.
            </p>
          </div>
          <ExportButton data={placements} fileName="placements" exportUrl="/api/placements/export/csv" />
          <button className="secondary-button" onClick={() => openModal(null)}>
            Assign Supervisors
          </button>
        </div>
      </div>

      {error && <div className="alert alert-error">{error}</div>}
      {loading && <div className="status-message">Loading...</div>}

      <div className="table-wrapper">
        <table>
          <thead>
            <tr>
              <th>Student Name</th>
              <th>Company</th>
              <th>University Supervisor</th>
              <th>Company Supervisor</th>
              <th>Placement Status</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {placements.length > 0 ? tableRows : (
              <tr>
                <td colSpan="6" className="empty-row">
                  No placements found. Click "Assign Supervisors" to create one.
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
              <h2>{editingId ? 'Edit Placement' : 'Assign Supervisors'}</h2>
              <button className="close-button" onClick={closeModal}>
                ×
              </button>
            </div>
            <form onSubmit={handleSubmit} className="modal-form">
              <label>
                Student
                <select
                  value={form.studentId}
                  onChange={(e) => setForm({ ...form, studentId: e.target.value })}
                >
                  <option value="">Select student</option>
                  {students.map((student) => (
                    <option key={student.id} value={student.id}>
                      {student.firstName} {student.lastName} ({student.studentNumber})
                    </option>
                  ))}
                </select>
              </label>
              <label>
                Company
                <select
                  value={form.companyId}
                  onChange={(e) => setForm({ ...form, companyId: e.target.value })}
                >
                  <option value="">Select company</option>
                  {companies.map((company) => (
                    <option key={company.id} value={company.id}>
                      {company.name}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                University Supervisor
                <select
                  value={form.universitySupervisor}
                  onChange={(e) => setForm({ ...form, universitySupervisor: e.target.value })}
                >
                  <option value="">Unassigned</option>
                  {universitySupervisors.map((supervisor) => (
                    <option key={supervisor.id} value={supervisor.username}>
                      {supervisor.username}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                Company Supervisor
                <select
                  value={form.companySupervisor}
                  onChange={(e) => setForm({ ...form, companySupervisor: e.target.value })}
                >
                  <option value="">Select company supervisor</option>
                  {companySupervisors.map((supervisor) => (
                    <option key={supervisor.id} value={supervisor.username}>
                      {supervisor.username}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                Status
                <select
                  value={form.status}
                  onChange={(e) => setForm({ ...form, status: e.target.value })}
                >
                  <option value="PENDING">Pending</option>
                  <option value="ASSIGNED">Assigned</option>
                  <option value="ACTIVE">Active</option>
                  <option value="COMPLETED">Completed</option>
                  <option value="CANCELLED">Cancelled</option>
                </select>
              </label>
              <div className="modal-actions">
                <button type="button" className="secondary-button" onClick={closeModal}>
                  Cancel
                </button>
                <button type="submit" className="primary-button">
                  {editingId ? 'Save Changes' : 'Create Placement'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

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
