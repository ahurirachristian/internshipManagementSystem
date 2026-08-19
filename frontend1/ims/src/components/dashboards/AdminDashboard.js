import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import DashboardLayout from '../DashboardLayout';
import ExportButton from '../ExportButton';
import DiaryReviewModal from '../DiaryReviewModal';
import StudentEditModal from '../StudentEditModal';
import { deleteStudent, fetchDiaries, fetchStudents, updateStudent } from '../../services/api';

function formatDate(dateString) {
  if (!dateString) return 'â€”';
  const date = new Date(dateString);
  if (Number.isNaN(date.getTime())) return dateString;
  return date.toLocaleDateString('en-GB', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

export default function AdminDashboard() {
  const [activeTab, setActiveTab] = useState('students');
  const [students, setStudents] = useState([]);
  const [diaries, setDiaries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [reviewDiary, setReviewDiary] = useState(null);
  const [editStudent, setEditStudent] = useState(null);
  const [viewStudent, setViewStudent] = useState(null);

  useEffect(() => {
    let cancelled = false;
    Promise.all([fetchStudents(), fetchDiaries()])
      .then(([studentsData, diariesData]) => {
        if (cancelled) return;
        setStudents(studentsData);
        setDiaries(diariesData);
      })
      .catch((err) => {
        if (!cancelled) setError(err.message || 'Unable to load admin data.');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const stats = useMemo(() => {
    const totalStudents = students.length;
    const totalDiaryEntries = diaries.length;
    const activeStudents = new Set(
      diaries.map((d) => d.studentProfile?.username).filter(Boolean)
    ).size;
    const average = totalStudents > 0 ? totalDiaryEntries / totalStudents : 0;

    const diaryCounts = {};
    diaries.forEach((d) => {
      const username = d.studentProfile?.username;
      if (username) diaryCounts[username] = (diaryCounts[username] || 0) + 1;
    });

    return { totalStudents, totalDiaryEntries, activeStudents, average, diaryCounts };
  }, [students, diaries]);

  const notifications = useMemo(() => {
    const items = [];
    if (diaries.length > 0) {
      const latest = diaries[diaries.length - 1];
      const name = latest.studentProfile
        ? `${latest.studentProfile.firstName || ''} ${latest.studentProfile.lastName || ''}`.trim()
        : latest.studentProfile?.username || 'A student';
      items.push({
        icon: 'fa-book-open',
        title: 'New diary entry',
        message: `${name} submitted a day diary log.`,
        time: formatDate(latest.date),
      });
    }
    if (students.length > 0) {
      const latestStudent = students[students.length - 1];
      const name = `${latestStudent.firstName || ''} ${latestStudent.lastName || ''}`.trim();
      items.push({
        icon: 'fa-user-graduate',
        title: 'New student registered',
        message: `${name} (${latestStudent.studentNumber || 'â€”'}) joined the system.`,
        time: 'Recently',
      });
    }
    return items;
  }, [students, diaries]);

  const filteredStudents = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return students;
    return students.filter((student) => {
      const fullName = `${student.firstName || ''} ${student.lastName || ''}`.toLowerCase();
      return (
        fullName.includes(q) ||
        (student.studentNumber || '').toLowerCase().includes(q) ||
        (student.email || '').toLowerCase().includes(q) ||
        (student.degreeProgram || '').toLowerCase().includes(q) ||
        (student.internshipCompany || '').toLowerCase().includes(q)
      );
    });
  }, [students, searchQuery]);

  const filteredDiaries = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return diaries;
    return diaries.filter((entry) => {
      const sp = entry.studentProfile || {};
      const fullName = `${sp.firstName || ''} ${sp.lastName || ''}`.toLowerCase();
      return (
        fullName.includes(q) ||
        (sp.studentNumber || '').toLowerCase().includes(q) ||
        (entry.dailyActivities || '').toLowerCase().includes(q) ||
        (entry.knowledgeAndSkillsGained || '').toLowerCase().includes(q) ||
        (entry.accomplishments || '').toLowerCase().includes(q)
      );
    });
  }, [diaries, searchQuery]);

  async function handleDeleteStudent(id) {
    if (!window.confirm('Delete this student?')) return;
    setError('');
    try {
      await deleteStudent(id);
      setStudents((prev) => prev.filter((s) => s.id !== id));
    } catch (err) {
      setError(err.message || 'Unable to delete student.');
    }
  }

  function renderActions(student) {
    return (
      <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
        <button className="icon-button" onClick={() => setViewStudent(student)}>View</button>
        <button className="icon-button edit" onClick={() => setEditStudent(student)}>Edit</button>
        <button className="icon-button delete" onClick={() => handleDeleteStudent(student.id)}>Delete</button>
      </div>
    );
  }

  function renderStudents() {
    return (
      <div className="card">
        <div className="card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <span className="card-title"><i className="fa-solid fa-user-graduate"></i> Registered Students</span>
            <span className="card-hint">All registered student profiles and their diary activity</span>
          </div>
          <ExportButton data={students} fileName="students" exportUrl="/api/students/export/csv" />
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
              {filteredStudents.length > 0 ? (
                filteredStudents.map((student) => {
                  const count = stats.diaryCounts[student.username] || 0;
                  return (
                    <tr key={student.id}>
                      <td>
                        <div className="cell-user">
                          <div className="avatar">
                            {student.pictureUrl ? (
                              <img src={student.pictureUrl} alt="" />
                            ) : (
                              <i className="fa-solid fa-user"></i>
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
                        <span className={`badge${count > 0 ? ' badge-success' : ' badge-warning'}`}>
                          <span className="dot"></span>
                          {count > 0 ? 'Active' : 'No Activity'}
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
    );
  }

  function renderDiaries() {
    return (
      <div className="card">
        <div className="card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <span className="card-title"><i className="fa-solid fa-book-open"></i> Day Diary Logs</span>
            <span className="card-hint">All submitted day diary entries across every student</span>
          </div>
          <ExportButton data={filteredDiaries} fileName="diaries" exportUrl="/api/diaries/export/csv" />
        </div>
        <div className="table-responsive">
          <table className="table">
            <thead>
              <tr>
                <th>Date</th>
                <th>Student</th>
                <th>Daily Activities</th>
                <th>Skills Gained</th>
                <th>Accomplishments</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredDiaries.length > 0 ? (
                filteredDiaries.map((entry) => {
                  const sp = entry.studentProfile || {};
                  return (
                    <tr key={entry.id}>
                      <td className="u-name">{formatDate(entry.date)}</td>
                      <td>
                        <div className="cell-user">
                          <div className="avatar"><i className="fa-solid fa-user"></i></div>
                          <div>
                            <div className="u-name">
                              {sp.firstName} {sp.lastName}
                            </div>
                            <div className="u-sub">{sp.studentNumber}</div>
                          </div>
                        </div>
                      </td>
                      <td>{entry.dailyActivities || 'â€”'}</td>
                      <td>{entry.knowledgeAndSkillsGained || 'â€”'}</td>
                      <td>{entry.accomplishments || 'â€”'}</td>
                      <td>
                        <button className="icon-button" onClick={() => setReviewDiary(entry)}>
                          Review / Comment
                        </button>
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan="6">
                    <div className="empty-state">
                      <div className="empty-icon">&#128221;</div>
                      <h3>{searchQuery ? 'No matching diary entries' : 'No diary entries'}</h3>
                      <p>
                        {searchQuery
                          ? 'No diary entries match your search criteria.'
                          : 'No day diary entries have been submitted yet.'}
                      </p>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    );
  }

  function renderSystem() {
    return (
      <div className="card">
        <div className="card-header">
          <span className="card-title"><i className="fa-solid fa-gear"></i> System Controls</span>
          <span className="card-hint">High-level administration and data management</span>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '16px', marginTop: '16px' }}>
          <Link to="/company" className="card" style={{ textDecoration: 'none', color: 'inherit' }}>
            <div className="card-header">
              <span className="card-title"><i className="fa-solid fa-building"></i> Company Management</span>
            </div>
            <p style={{ opacity: 0.7, fontSize: '0.875rem' }}>Add, edit, and manage company profiles and locations.</p>
          </Link>
          <Link to="/admin/universities" className="card" style={{ textDecoration: 'none', color: 'inherit' }}>
            <div className="card-header">
              <span className="card-title"><i className="fa-solid fa-university"></i> University Settings</span>
            </div>
            <p style={{ opacity: 0.7, fontSize: '0.875rem' }}>Configure registered universities and supervisor assignments.</p>
          </Link>
          <Link to="/admin/placements" className="card" style={{ textDecoration: 'none', color: 'inherit' }}>
            <div className="card-header">
              <span className="card-title"><i className="fa-solid fa-users-rectangle"></i> Placement Approvals</span>
            </div>
            <p style={{ opacity: 0.7, fontSize: '0.875rem' }}>Review and approve student placement assignments.</p>
          </Link>
          <Link to="/admin/audit-logs" className="card" style={{ textDecoration: 'none', color: 'inherit' }}>
            <div className="card-header">
              <span className="card-title"><i className="fa-solid fa-list-check"></i> Audit Logs</span>
            </div>
            <p style={{ opacity: 0.7, fontSize: '0.875rem' }}>Track system activity, access history, and changes.</p>
          </Link>
          <Link to="/admin/users" className="card" style={{ textDecoration: 'none', color: 'inherit' }}>
            <div className="card-header">
              <span className="card-title"><i className="fa-solid fa-users"></i> User Management</span>
            </div>
            <p style={{ opacity: 0.7, fontSize: '0.875rem' }}>Manage user accounts, roles, and permissions.</p>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <DashboardLayout
      title="Admin Dashboard"
      subtitle="Monitor registered students and review all submitted day diary logs"
      tabs={[
        {
          id: 'students',
          label: 'Students',
          icon: 'fa-user-graduate',
          count: stats.totalStudents,
        },
        {
          id: 'diaries',
          label: 'Day Diary Logs',
          icon: 'fa-book-open',
          count: stats.totalDiaryEntries,
        },
        {
          id: 'system',
          label: 'System',
          icon: 'fa-gear',
        },
      ]}
      activeTab={activeTab}
      onTabChange={setActiveTab}
      onSearch={setSearchQuery}
      notifications={notifications}
    >
      {error && <div className="alert alert-error">{error}</div>}
      {loading && <div className="status-message">Loading admin dashboard...</div>}

      {!loading && (
        <>
          <div className="metric-grid">
            <div className="card metric-card">
              <div className="metric-icon brand"><i className="fa-solid fa-user-graduate"></i></div>
              <div>
                <div className="metric-value">{stats.totalStudents}</div>
                <div className="metric-label">Registered Students</div>
              </div>
            </div>
            <div className="card metric-card">
              <div className="metric-icon blue"><i className="fa-solid fa-book-open"></i></div>
              <div>
                <div className="metric-value">{stats.totalDiaryEntries}</div>
                <div className="metric-label">Day Diary Logs Submitted</div>
              </div>
            </div>
            <div className="card metric-card">
              <div className="metric-icon green"><i className="fa-solid fa-circle-check"></i></div>
              <div>
                <div className="metric-value">{stats.activeStudents}</div>
                <div className="metric-label">Active Students</div>
              </div>
            </div>
            <div className="card metric-card">
              <div className="metric-icon amber"><i className="fa-solid fa-chart-line"></i></div>
              <div>
                <div className="metric-value">{stats.average.toFixed(1)}</div>
                <div className="metric-label">Avg Logs per Student</div>
              </div>
            </div>
          </div>

          {activeTab === 'students' && renderStudents()}
          {activeTab === 'diaries' && renderDiaries()}
          {activeTab === 'system' && renderSystem()}
        </>
      )}

      {reviewDiary && (
        <DiaryReviewModal
          diary={reviewDiary}
          onClose={() => setReviewDiary(null)}
          onSaved={() => {
            setReviewDiary(null);
          }}
        />
      )}

      {editStudent && (
        <StudentEditModal
          student={editStudent}
          title={`Edit Student: ${editStudent.firstName} ${editStudent.lastName}`}
          onClose={() => setEditStudent(null)}
          onSubmit={async (payload) => {
            await updateStudent(editStudent.id, payload);
            setStudents((prev) => prev.map((s) => (s.id === editStudent.id ? { ...s, ...payload } : s)));
            setEditStudent(null);
          }}
          companies={[]}
          supervisors={[]}
        />
      )}

      {viewStudent && (
        <div className="modal-overlay" onClick={() => setViewStudent(null)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Student Details</h2>
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
