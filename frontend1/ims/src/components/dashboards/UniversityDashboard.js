import { useEffect, useMemo, useState } from 'react';
import DashboardLayout from '../DashboardLayout';
import StudentEditModal from '../StudentEditModal';
import { useAuth } from '../../context/AuthContext';
import {
  createStudentCredential,
  deleteStudent,
  fetchStudents,
  fetchCompanies,
  fetchSupervisors,
  updateStudent,
} from '../../services/api';

const emptyCredentialForm = {
  fullName: '',
  email: '',
  studentId: '',
  department: '',
};

export default function UniversityDashboard() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState('students');
  const [allStudents, setAllStudents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [credentialForm, setCredentialForm] = useState(emptyCredentialForm);
  const [credentialLoading, setCredentialLoading] = useState(false);
  const [editStudent, setEditStudent] = useState(null);
  const [companies, setCompanies] = useState([]);
  const [supervisors, setSupervisors] = useState([]);

  useEffect(() => {
    loadStudents();
    loadCompanies();
    loadSupervisors();
  }, []);

  async function loadStudents() {
    setLoading(true);
    setError('');
    try {
      setAllStudents(await fetchStudents());
    } catch (err) {
      setError(err.message || 'Unable to load students.');
    } finally {
      setLoading(false);
    }
  }

  async function loadCompanies() {
    try {
      const data = await fetchCompanies();
      setCompanies(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error('Failed to load companies', err);
      setCompanies([]);
    }
  }

  async function loadSupervisors() {
    try {
      const data = await fetchSupervisors('UNIVERSITY');
      setSupervisors(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error('Failed to load supervisors', err);
      setSupervisors([]);
    }
  }

  const students = useMemo(
    () => allStudents.filter((s) => s.universitySupervisor === user.username),
    [allStudents, user.username]
  );

  const counts = useMemo(() => {
    const assigned = students.filter((s) => s.companyId != null).length;
    return {
      total: students.length,
      assigned,
      pending: students.length - assigned,
    };
  }, [students]);

  async function handleCredentialSubmit(event) {
    event.preventDefault();
    setError('');
    setNotice('');
    setCredentialLoading(true);
    try {
      await createStudentCredential({
        fullName: credentialForm.fullName.trim(),
        email: credentialForm.email.trim(),
        studentId: credentialForm.studentId.trim(),
        department: credentialForm.department.trim(),
      });
      setCredentialForm(emptyCredentialForm);
      setNotice('Student credentials created successfully.');
      await loadStudents();
    } catch (err) {
      setError(err.message || 'Unable to create student credentials.');
    } finally {
      setCredentialLoading(false);
    }
  }

  async function handleEditSave(payload) {
    await updateStudent(editStudent.id, payload);
    setNotice('Student updated successfully.');
    await loadStudents();
  }

  async function handleDelete(id) {
    if (!window.confirm('Delete this student?')) return;
    setError('');
    setNotice('');
    try {
      await deleteStudent(id);
      setNotice('Student deleted successfully.');
      await loadStudents();
    } catch (err) {
      setError(err.message || 'Unable to delete student.');
    }
  }

  function renderStudents() {
    if (loading) {
      return <div className="status-message">Loading students...</div>;
    }
    return (
      <>
        <div className="stat-grid">
          <div className="stat-card">
            <div className="stat-number">{counts.total}</div>
            <div className="stat-label">Students Assigned to You</div>
          </div>
          <div className="stat-card">
            <div className="stat-number">{counts.assigned}</div>
            <div className="stat-label">Assigned to a Company</div>
          </div>
          <div className="stat-card">
            <div className="stat-number">{counts.pending}</div>
            <div className="stat-label">Awaiting Placement</div>
          </div>
        </div>
        <div className="table-wrapper">
          <table>
            <thead>
              <tr>
                <th>Name</th>
                <th>Email</th>
                <th>Student Number</th>
                <th>Degree Program</th>
                <th>Year</th>
                <th>Company ID</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {students.length > 0 ? (
                students.map((student) => (
                  <tr key={student.id}>
                    <td>
                      {student.firstName} {student.lastName}
                    </td>
                    <td>{student.email}</td>
                    <td>{student.studentNumber}</td>
                    <td>{student.degreeProgram}</td>
                    <td>{student.yearOfStudy}</td>
                    <td>{student.companyId ?? '—'}</td>
                    <td>
                      <button
                        className="icon-button edit"
                        onClick={() => setEditStudent(student)}
                      >
                        Edit
                      </button>
                      <button
                        className="icon-button delete"
                        onClick={() => handleDelete(student.id)}
                      >
                        Delete
                      </button>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="7" className="empty-row">
                    No students assigned to you yet. Create credentials to add one.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </>
    );
  }

  function renderCredentials() {
    return (
      <div className="card-panel">
        <h2>Generate Student Credentials</h2>
        <p>Create a student account and profile. Default password is Student@123.</p>
        <form onSubmit={handleCredentialSubmit} className="modal-form">
          <label>
            Full Name
            <input
              value={credentialForm.fullName}
              onChange={(e) => setCredentialForm({ ...credentialForm, fullName: e.target.value })}
            />
          </label>
          <label>
            Email
            <input
              type="email"
              value={credentialForm.email}
              onChange={(e) => setCredentialForm({ ...credentialForm, email: e.target.value })}
            />
          </label>
          <label>
            Student ID
            <input
              value={credentialForm.studentId}
              onChange={(e) => setCredentialForm({ ...credentialForm, studentId: e.target.value })}
            />
          </label>
          <label>
            Department
            <input
              value={credentialForm.department}
              onChange={(e) =>
                setCredentialForm({ ...credentialForm, department: e.target.value })
              }
            />
          </label>
          <div className="modal-actions">
            <button type="submit" className="primary-button" disabled={credentialLoading}>
              {credentialLoading ? 'Creating...' : 'Create Credentials'}
            </button>
          </div>
        </form>
      </div>
    );
  }

  return (
    <DashboardLayout
      title="University Dashboard"
      subtitle="Welcome,"
      tabs={[
        { id: 'students', label: 'Students' },
        { id: 'credentials', label: 'Credentials' },
      ]}
      activeTab={activeTab}
      onTabChange={setActiveTab}
    >
      {notice && <div className="alert alert-success">{notice}</div>}
      {error && <div className="alert alert-error">{error}</div>}
      {activeTab === 'students' ? renderStudents() : renderCredentials()}

      {editStudent && (
        <StudentEditModal
          student={editStudent}
          title={`Edit Student: ${editStudent.firstName} ${editStudent.lastName}`}
          onClose={() => setEditStudent(null)}
          onSubmit={handleEditSave}
          companies={companies}
          supervisors={supervisors}
        />
      )}
    </DashboardLayout>
  );
}
