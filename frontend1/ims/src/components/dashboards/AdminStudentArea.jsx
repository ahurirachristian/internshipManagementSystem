import { useEffect, useState } from 'react';
import DashboardLayout from '../DashboardLayout';
import StudentEditModal from '../StudentEditModal';
import { deleteStudent, fetchStudents, updateStudent, fetchCompanies, fetchSupervisors } from '../../services/api';

export default function AdminStudentArea() {
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [addOpen, setAddOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [viewStudent, setViewStudent] = useState(null);
  const [editStudent, setEditStudent] = useState(null);
  const [companies, setCompanies] = useState([]);
  const [supervisors, setSupervisors] = useState([]);

  useEffect(() => {
    let cancelled = false;
    fetchStudents()
      .then((data) => {
        if (!cancelled) setStudents(data);
      })
      .catch((err) => {
        if (!cancelled) setError(err.message || 'Unable to load students.');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    let cancelled = false;
    fetchCompanies()
      .then((data) => {
        if (!cancelled) setCompanies(data || []);
      })
      .catch(() => {
        if (!cancelled) setCompanies([]);
      });
    fetchSupervisors()
      .then((data) => {
        if (!cancelled) setSupervisors(data || []);
      })
      .catch(() => {
        if (!cancelled) setSupervisors([]);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  async function handleAddSave(payload) {
    setError('');
    setNotice('');
    try {
      const response = await fetch('/api/students', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(payload),
      });
      if (!response.ok) {
        const text = await response.text();
        throw new Error(text || 'Failed to create student.');
      }
      setNotice('Student added successfully.');
      setAddOpen(false);
      const refreshed = await fetchStudents();
      setStudents(refreshed);
    } catch (err) {
      setError(err.message || 'Unable to add student.');
      throw err;
    }
  }

  async function handleDelete(id) {
    if (!window.confirm('Delete this student?')) return;
    setError('');
    setNotice('');
    try {
      await deleteStudent(id);
      setNotice('Student deleted successfully.');
      setStudents((prev) => prev.filter((s) => s.id !== id));
    } catch (err) {
      setError(err.message || 'Unable to delete student.');
    }
  }

  async function handleEditSave(payload) {
    setError('');
    setNotice('');
    try {
      await updateStudent(editStudent.id, payload);
      setNotice('Student updated successfully.');
      setEditOpen(false);
      setEditStudent(null);
      const refreshed = await fetchStudents();
      setStudents(refreshed);
    } catch (err) {
      setError(err.message || 'Unable to update student.');
      throw err;
    }
  }

  const filtered = students.filter((s) => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return true;
    const fullName = `${s.firstName || ''} ${s.lastName || ''}`.toLowerCase();
    return (
      fullName.includes(q) ||
      (s.studentNumber || '').toLowerCase().includes(q) ||
      (s.email || '').toLowerCase().includes(q) ||
      (s.degreeProgram || '').toLowerCase().includes(q)
    );
  });

  function renderActions(student) {
    return (
      <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
        <button
          type="button"
          className="icon-button"
          onClick={() => setViewStudent(student)}
          title="View profile"
        >
          <i className="fa-solid fa-circle-info" />
        </button>
        <button
          type="button"
          className="icon-button edit"
          onClick={() => {
            setEditStudent(student);
            setEditOpen(true);
          }}
          title="Edit student"
        >
          <i className="fa-solid fa-pen" />
        </button>
        <button
          type="button"
          className="icon-button delete"
          onClick={() => handleDelete(student.id)}
          title="Delete student"
        >
          <i className="fa-solid fa-trash" />
        </button>
      </div>
    );
  }

  return (
    <DashboardLayout
      title="Student Area"
      subtitle="Manage registered students"
      searchable
      onSearch={setSearchQuery}
    >
      {notice && <div className="alert alert-success">{notice}</div>}
      {error && <div className="alert alert-error">{error}</div>}
      {loading && <div className="status-message">Loading students...</div>}

      {!loading && (
        <div className="card">
          <div className="card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <span className="card-title"><i className="fa-solid fa-user-graduate"></i> Registered Students</span>
              <span className="card-hint">All student profiles in the system</span>
            </div>
            <button
              type="button"
              className="primary-button"
              onClick={() => setAddOpen(true)}
              style={{ display: 'inline-flex', alignItems: 'center', gap: '8px' }}
            >
              <i className="fa-solid fa-plus" />
              Add Student
            </button>
          </div>

          <div className="table-responsive">
            <table className="table">
              <thead>
                <tr>
                  <th>Student</th>
                  <th>Reg No</th>
                  <th>Course</th>
                  <th>Company</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.length > 0 ? (
                  filtered.map((student) => {
                    const hasDiary = students.some((s) => s.username === student.username);
                    return (
                      <tr key={student.id}>
                        <td>
                          <div className="cell-user">
                            <div className="avatar">
                              {student.pictureUrl ? (
                                <img src={student.pictureUrl} alt="" />
                              ) : (
                                <i className="fa-solid fa-user" />
                              )}
                            </div>
                            <div>
                              <div className="u-name">
                                {student.firstName} {student.lastName}
                              </div>
                              <div className="u-sub">{student.studentNumber}</div>
                            </div>
                                                   </div>
                        </td>
                        <td>{student.registrationNumber || '—'}</td>
                        <td>{student.degreeProgram || '—'}</td>
                        <td>{student.internshipCompany || '—'}</td>
                        <td>
                          <span className={`badge${hasDiary ? ' badge-success' : ' badge-warning'}`}>
                            <span className="dot" />
                            {hasDiary ? 'Active' : 'No Activity'}
                          </span>
                        </td>
                        <td>{renderActions(student)}</td>
                      </tr>
                    );
                  })
                ) : (
                  <tr>
                    <td colSpan="6">
                      <div className="empty-state">
                        <div className="empty-icon">&#128100;</div>
                        <h3>{searchQuery ? 'No matching students' : 'No registered students'}</h3>
                        <p>
                          {searchQuery
                            ? 'No students match your search criteria.'
                            : 'No registered students found.'}
                        </p>
                      </div>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {addOpen && (
        <StudentEditModal
          student={null}
          title="Add Student"
          onClose={() => setAddOpen(false)}
          onSubmit={handleAddSave}
          companies={[]}
          supervisors={[]}
        />
      )}

      {editOpen && editStudent && (
        <StudentEditModal
          student={editStudent}
          title="Edit Student"
          onClose={() => {
            setEditOpen(false);
            setEditStudent(null);
          }}
          onSubmit={handleEditSave}
          companies={companies}
          supervisors={supervisors}
        />
      )}

      {viewStudent && (
        <div className="modal-overlay" onClick={() => setViewStudent(null)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Student Profile</h2>
              <button className="close-button" onClick={() => setViewStudent(null)}>
                ×
              </button>
            </div>
            <div className="detail-grid">
              {[
                ['Full Name', `${viewStudent.firstName || ''} ${viewStudent.lastName || ''}`.trim()],
                ['Email', viewStudent.email],
                ['Student Number', viewStudent.studentNumber],
                ['Registration Number', viewStudent.registrationNumber],
                ['Degree Program', viewStudent.degreeProgram],
                ['Year of Study', viewStudent.yearOfStudy],
                ['Phone Number', viewStudent.phoneNumber],
                ['Internship Company', viewStudent.internshipCompany],
                ['University Supervisor', viewStudent.universitySupervisor],
                ['Industrial Supervisor ID', viewStudent.industrialSupervisorId],
              ].map(([label, value]) => (
                <div className="detail-item" key={label}>
                  <span className="detail-label">{label}</span>
                  <span className="detail-value">{value || '—'}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </DashboardLayout>
  );
}
