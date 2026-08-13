import { useEffect, useMemo, useState } from 'react';
import DashboardLayout from '../DashboardLayout';
import { fetchDiaries, fetchStudents } from '../../services/api';

export default function AdminDashboard() {
  const [activeTab, setActiveTab] = useState('overview');
  const [students, setStudents] = useState([]);
  const [diaries, setDiaries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

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
      diaries
        .map((d) => d.studentProfile?.username)
        .filter(Boolean)
    ).size;
    const average = totalStudents > 0 ? totalDiaryEntries / totalStudents : 0;

    const diaryCounts = {};
    diaries.forEach((d) => {
      const username = d.studentProfile?.username;
      if (username) diaryCounts[username] = (diaryCounts[username] || 0) + 1;
    });

    return { totalStudents, totalDiaryEntries, activeStudents, average, diaryCounts };
  }, [students, diaries]);

  function renderOverview() {
    const countRows = Object.entries(stats.diaryCounts).sort((a, b) => b[1] - a[1]);
    return (
      <>
        <div className="stat-grid">
          <div className="stat-card">
            <div className="stat-number">{stats.totalStudents}</div>
            <div className="stat-label">Total Students</div>
          </div>
          <div className="stat-card">
            <div className="stat-number">{stats.totalDiaryEntries}</div>
            <div className="stat-label">Total Diary Entries</div>
          </div>
          <div className="stat-card">
            <div className="stat-number">{stats.activeStudents}</div>
            <div className="stat-label">Active Students</div>
          </div>
          <div className="stat-card">
            <div className="stat-number">{stats.average.toFixed(2)}</div>
            <div className="stat-label">Avg Entries per Student</div>
          </div>
        </div>
        <div className="card-panel">
          <h2>Diary Entries per Student</h2>
          <p>Number of diary entries submitted by each student.</p>
          {countRows.length > 0 ? (
            <div className="table-wrapper">
              <table>
                <thead>
                  <tr>
                    <th>Student</th>
                    <th>Diary Entries</th>
                  </tr>
                </thead>
                <tbody>
                  {countRows.map(([username, count]) => (
                    <tr key={username}>
                      <td>{username}</td>
                      <td>{count}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p>No diary entries recorded yet.</p>
          )}
        </div>
      </>
    );
  }

  function renderStudents() {
    return (
      <div className="table-wrapper">
        <table>
          <thead>
            <tr>
              <th>Name</th>
              <th>Username</th>
              <th>Email</th>
              <th>Student Number</th>
              <th>Degree Program</th>
              <th>Year</th>
              <th>Company ID</th>
            </tr>
          </thead>
          <tbody>
            {students.length > 0 ? (
              students.map((student) => (
                <tr key={student.id}>
                  <td>
                    {student.firstName} {student.lastName}
                  </td>
                  <td>{student.username}</td>
                  <td>{student.email}</td>
                  <td>{student.studentNumber}</td>
                  <td>{student.degreeProgram}</td>
                  <td>{student.yearOfStudy}</td>
                  <td>{student.companyId ?? '—'}</td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan="7" className="empty-row">
                  No students registered yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    );
  }

  function renderDiaries() {
    return (
      <div className="table-wrapper">
        <table>
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
            {diaries.length > 0 ? (
              diaries.map((diary) => (
                <tr key={diary.id}>
                  <td>{diary.date}</td>
                  <td>{diary.studentProfile?.username || '—'}</td>
                  <td>{diary.dailyActivities || '—'}</td>
                  <td>{diary.knowledgeAndSkillsGained || '—'}</td>
                  <td>{diary.accomplishments || '—'}</td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan="5" className="empty-row">
                  No diary entries recorded yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    );
  }

  return (
    <DashboardLayout
      title="Admin Dashboard"
      subtitle="Welcome,"
      tabs={[
        { id: 'overview', label: 'Overview' },
        { id: 'students', label: 'Students' },
        { id: 'diaries', label: 'Diaries' },
      ]}
      activeTab={activeTab}
      onTabChange={setActiveTab}
    >
      {loading && <div className="status-message">Loading dashboard...</div>}
      {error && <div className="alert alert-error">{error}</div>}
      {!loading && activeTab === 'overview' && renderOverview()}
      {!loading && activeTab === 'students' && renderStudents()}
      {!loading && activeTab === 'diaries' && renderDiaries()}
    </DashboardLayout>
  );
}
