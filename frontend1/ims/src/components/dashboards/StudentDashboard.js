import { useEffect, useState, useCallback } from 'react';
import DashboardLayout from '../DashboardLayout';
import StudentEditModal from '../StudentEditModal';
import InternshipProgress from '../InternshipProgress';
import DiaryReviewModal from '../DiaryReviewModal';
import { useAuth } from '../../context/AuthContext';
import {
  createDiary,
  deleteDiary,
  fetchMyProfile,
  fetchStudentDiaries,
  fetchCompanies,
  fetchSupervisors,
  saveMyProfile,
  updateDiary,
} from '../../services/api';

const emptyDiaryForm = {
  date: new Date().toISOString().split('T')[0],
  dailyActivities: '',
  knowledgeAndSkillsGained: '',
  accomplishments: '',
};

export default function StudentDashboard() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState('profile');
  const [profile, setProfile] = useState(null);
  const [profileLoading, setProfileLoading] = useState(true);
  const [profileError, setProfileError] = useState('');
  const [profileNotice, setProfileNotice] = useState('');
  const [profileModalOpen, setProfileModalOpen] = useState(false);
  const [diaries, setDiaries] = useState([]);
  const [diaryLoading, setDiaryLoading] = useState(false);
  const [diaryError, setDiaryError] = useState('');
  const [diaryNotice, setDiaryNotice] = useState('');
  const [diaryForm, setDiaryForm] = useState(emptyDiaryForm);
  const [editingDiaryId, setEditingDiaryId] = useState(null);
  const [reviewDiary, setReviewDiary] = useState(null);
  const [companies, setCompanies] = useState([]);
  const [supervisors, setSupervisors] = useState([]);

  const loadDiaries = useCallback(async function loadDiaries() {
    setDiaryLoading(true);
    setDiaryError('');
    try {
      setDiaries(await fetchStudentDiaries(user.username));
    } catch (err) {
      setDiaryError(err.message || 'Unable to load diary entries.');
    } finally {
      setDiaryLoading(false);
    }
  }, [user.username]);

  useEffect(() => {
    loadProfile();
    loadCompanies();
    loadSupervisors();
    loadDiaries();
  }, [loadDiaries]);

  async function loadProfile() {
    setProfileLoading(true);
    setProfileError('');
    try {
      const result = await fetchMyProfile();
      setProfile(result);
    } catch (err) {
      if (err.status === 404) {
        setProfile(null);
      } else {
        setProfileError(err.message || 'Unable to load profile.');
      }
    } finally {
      setProfileLoading(false);
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

  function openProfileModal() {
    setProfileModalOpen(true);
  }

  async function handleProfileSave(payload) {
    const saved = await saveMyProfile(payload);
    setProfile(saved);
    setProfileNotice('Profile saved successfully.');
  }

  async function handleDiarySubmit(event) {
    event.preventDefault();
    setDiaryError('');
    setDiaryNotice('');
    if (!diaryForm.date || !diaryForm.dailyActivities.trim()) {
      setDiaryError('Date and daily activities are required.');
      return;
    }
    setDiaryLoading(true);
    try {
      if (editingDiaryId) {
        await updateDiary(editingDiaryId, diaryForm);
        setDiaryNotice('Diary entry updated successfully.');
      } else {
        await createDiary(diaryForm);
        setDiaryNotice('Diary entry saved successfully.');
      }
      setDiaryForm(emptyDiaryForm);
      setEditingDiaryId(null);
      await loadDiaries();
    } catch (err) {
      setDiaryError(err.message || 'Unable to save diary entry.');
    } finally {
      setDiaryLoading(false);
    }
  }

  function startEditDiary(entry) {
    setDiaryForm({
      date: entry.date,
      dailyActivities: entry.dailyActivities,
      knowledgeAndSkillsGained: entry.knowledgeAndSkillsGained,
      accomplishments: entry.accomplishments,
    });
    setEditingDiaryId(entry.id);
    setDiaryError('');
    setDiaryNotice('');
    document.getElementById('diary-form')?.scrollIntoView({ behavior: 'smooth' });
  }

  function cancelEditDiary() {
    setDiaryForm(emptyDiaryForm);
    setEditingDiaryId(null);
    setDiaryError('');
  }

  async function handleDeleteDiary(id) {
    if (!window.confirm('Delete this diary entry?')) return;
    setDiaryLoading(true);
    try {
      await deleteDiary(id);
      await loadDiaries();
    } catch (err) {
      setDiaryError(err.message || 'Unable to delete diary entry.');
    } finally {
      setDiaryLoading(false);
    }
  }

  function renderProfile() {
    if (profileLoading) {
      return <div className="status-message">Loading profile...</div>;
    }
    if (profileError && !profile) {
      return <div className="alert alert-error">{profileError}</div>;
    }
    if (!profile) {
      return (
        <div className="card-panel">
          <h2>Complete your profile</h2>
          <p>You do not have a student profile yet. Create one to get started.</p>
          <div className="inline-actions">
            <button className="primary-button" onClick={openProfileModal}>
              Create Profile
            </button>
          </div>
        </div>
      );
    }
    const details = [
      ['Full Name', `${profile.firstName || ''} ${profile.lastName || ''}`.trim()],
      ['Email', profile.email],
      ['Student Number', profile.studentNumber],
      ['Registration Number', profile.registrationNumber],
      ['Degree Program', profile.degreeProgram],
      ['Year of Study', profile.yearOfStudy],
      ['Phone Number', profile.phoneNumber],
      ['Internship Company', profile.internshipCompany],
      ['University Supervisor', profile.universitySupervisor],
      ['Industrial Supervisor ID', profile.industrialSupervisorId],
    ];
    return (
      <div className="card-panel">
        <h2>My Profile</h2>
        <p>Your student details as recorded in the system.</p>
        <div className="detail-grid">
          {details.map(([label, value]) => (
            <div className="detail-item" key={label}>
              <span className="detail-label">{label}</span>
              <span className="detail-value">{value || '—'}</span>
            </div>
          ))}
        </div>
        <div className="inline-actions">
          <button className="primary-button" onClick={openProfileModal}>
            Edit Profile
          </button>
        </div>
      </div>
    );
  }

  function renderDiary() {
    return (
      <>
        <div className="card-panel">
          <h2>{editingDiaryId ? 'Edit Day Diary Entry' : 'New Day Diary Entry'}</h2>
          <p>
            {editingDiaryId
              ? 'Update the activities and skills gained for this day.'
              : 'Record the activities and skills gained for a day.'}
          </p>
          <form id="diary-form" onSubmit={handleDiarySubmit} className="modal-form">
            <label>
              Date
              <input
                type="date"
                value={diaryForm.date}
                onChange={(e) => setDiaryForm({ ...diaryForm, date: e.target.value })}
              />
            </label>
            <label>
              Daily Activities
              <textarea
                rows="4"
                value={diaryForm.dailyActivities}
                onChange={(e) =>
                  setDiaryForm({ ...diaryForm, dailyActivities: e.target.value })
                }
              />
            </label>
            <label>
              Knowledge &amp; Skills Gained
              <textarea
                rows="3"
                value={diaryForm.knowledgeAndSkillsGained}
                onChange={(e) =>
                  setDiaryForm({ ...diaryForm, knowledgeAndSkillsGained: e.target.value })
                }
              />
            </label>
            <label>
              Accomplishments
              <textarea
                rows="3"
                value={diaryForm.accomplishments}
                onChange={(e) =>
                  setDiaryForm({ ...diaryForm, accomplishments: e.target.value })
                }
              />
            </label>
            <div className="modal-actions">
              {editingDiaryId && (
                <button type="button" className="secondary-button" onClick={cancelEditDiary}>
                  Cancel Edit
                </button>
              )}
              <button type="submit" className="primary-button">
                {editingDiaryId ? 'Update Entry' : 'Save Entry'}
              </button>
            </div>
          </form>
        </div>

        <div className="card-panel">
          <h2>My Diary Entries</h2>
          {diaryLoading && <div className="status-message">Loading entries...</div>}
          {diaries.length === 0 && !diaryLoading && (
            <p>No diary entries yet. Add your first entry above.</p>
          )}
          {diaries.map((entry) => (
            <div className="diary-entry" key={entry.id}>
              <h3>{entry.date}</h3>
              <h4>Daily Activities</h4>
              <p>{entry.dailyActivities || '—'}</p>
              <h4>Knowledge &amp; Skills Gained</h4>
              <p>{entry.knowledgeAndSkillsGained || '—'}</p>
              <h4>Accomplishments</h4>
              <p>{entry.accomplishments || '—'}</p>
              <div className="inline-actions">
                <button className="icon-button edit" onClick={() => startEditDiary(entry)}>
                  Edit
                </button>
                <button
                  className="icon-button delete"
                  onClick={() => handleDeleteDiary(entry.id)}
                >
                  Delete
                </button>
                <button className="icon-button" onClick={() => setReviewDiary(entry)}>
                  Review / Comment
                </button>
              </div>
            </div>
          ))}
        </div>
      </>
    );
  }

  return (
    <DashboardLayout
      title="Student Dashboard"
      subtitle="Welcome,"
      tabs={[
        { id: 'profile', label: 'Profile' },
        { id: 'diary', label: 'Day Diary' },
      ]}
      activeTab={activeTab}
      onTabChange={(tab) => {
        setActiveTab(tab);
        if (tab === 'diary') {
          loadDiaries();
        }
      }}
    >
      <InternshipProgress />

      {profileNotice && <div className="alert alert-success">{profileNotice}</div>}
      {diaryNotice && <div className="alert alert-success">{diaryNotice}</div>}
      {profileError && <div className="alert alert-error">{profileError}</div>}
      {diaryError && <div className="alert alert-error">{diaryError}</div>}
      {activeTab === 'profile' ? renderProfile() : renderDiary()}

      {profileModalOpen && (
        <StudentEditModal
          student={profile}
          title={profile ? 'Edit Profile' : 'Create Profile'}
          onClose={() => setProfileModalOpen(false)}
          onSubmit={handleProfileSave}
          companies={companies}
          supervisors={supervisors}
        />
      )}

      {reviewDiary && (
        <DiaryReviewModal
          diary={reviewDiary}
          onClose={() => setReviewDiary(null)}
          onSaved={loadDiaries}
        />
      )}
    </DashboardLayout>
  );
}
