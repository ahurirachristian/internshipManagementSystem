import { useEffect, useMemo, useState } from 'react';
import DashboardLayout from '../DashboardLayout';
import { fetchDiaries, fetchStudents } from '../../services/api';

function formatDate(dateString) {
  if (!dateString) return '—';
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

  // Build notifications derived from data
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
        message: `${name} (${latestStudent.studentNumber || '—'}) joined the system.`,
        time: 'Recently',
      });
    }
    return items;
  }, [students, diaries]);

  // Filter students based on search query
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

  // Filter diaries based on search query
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

  function renderStudents() {
    return (
      <div className="card">
        <div className="card-header">
          <span className="card-title"><i className="fa-solid fa-user-graduate"></i> Registered Students</span>
          <span className="card-hint">All registered student profiles and their diary activity</span>
        </div>
        <div className="table-responsive">
          <table className="table">
            <thead>
              <tr>
                <th>Student</th>
                <th>Student No.</th>
                <th>Email</th>
                <th>Degree Program</th>
                <th>Internship Company</th>
                <th>Diary Entries</th>
                <th>Status</th>
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
                      <td>{student.studentNumber}</td>
                      <td>{student.email}</td>
                      <td>{student.degreeProgram}</td>
                      <td>{student.internshipCompany || '—'}</td>
                      <td>
                        <span className="count-chip">{count}</span>
                      </td>
                      <td>
                        <span className={`badge${count > 0 ? ' badge-success' : ' badge-warning'}`}>
                          <span className="dot"></span>
                          {count > 0 ? 'Active' : 'No Activity'}
                        </span>
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan="7">
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
        <div className="card-header">
          <span className="card-title"><i className="fa-solid fa-book-open"></i> Day Diary Logs</span>
          <span className="card-hint">All submitted day diary entries across every student</span>
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
                      <td>{entry.dailyActivities || '—'}</td>
                      <td>{entry.knowledgeAndSkillsGained || '—'}</td>
                      <td>{entry.accomplishments || '—'}</td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan="5">
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
          {/* Summary Metrics */}
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
        </>
      )}
    </DashboardLayout>
  );
}