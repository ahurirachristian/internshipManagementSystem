import { useEffect, useState, useCallback } from 'react';
import { Pencil, Trash2, Loader2, CheckCircle, AlertCircle } from 'lucide-react';
import DashboardLayout from '../DashboardLayout';
import StudentEditModal from '../StudentEditModal';
import InternshipProgress from '../InternshipProgress';
import DiaryReviewModal from '../DiaryReviewModal';
import StudentDataProvider from '../../context/StudentDataContext';
import OverviewSection from './OverviewSection';
import SettingsSection from './SettingsSection';
import LearningInstituteSection from './LearningInstituteSection';
import CompaniesSection from './CompaniesSection';
import IndustrialSupervisorSection from './IndustrialSupervisorSection';
import UniversitySupervisorSection from './UniversitySupervisorSection';
import {
  createDiary,
  deleteDiary,
  fetchMyProfile,
  fetchMyDiaries,
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
  accountNumber: '',
  action: '',
  technologyTools: '',
};

const inputClass = "w-full bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 text-xs rounded-xl border border-slate-300 dark:border-slate-700 px-3.5 py-2.5 focus:border-teal-600 focus:ring-2 focus:ring-teal-600/20 focus:outline-none transition-all shadow-xs font-medium";
const labelClass = "block text-xs font-bold uppercase tracking-wider text-slate-800 dark:text-slate-200 mb-1.5";

export default function StudentDashboard() {
  const [activeTab, setActiveTab] = useState('overview');
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
      setDiaries(await fetchMyDiaries());
    } catch (err) {
      setDiaryError(err.message || 'Unable to load diary entries.');
    } finally {
      setDiaryLoading(false);
    }
  }, []);

  useEffect(() => {
    loadProfile();
    loadCompanies();
    loadSupervisors();
    loadDiaries();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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
      accountNumber: entry.accountNumber || '',
      action: entry.action || '',
      technologyTools: entry.technologyTools || '',
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
      return (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-5 h-5 text-teal-600 animate-spin" />
          <span className="ml-2 text-sm text-slate-500 dark:text-slate-400">Loading profile...</span>
        </div>
      );
    }
    if (profileError && !profile) {
      return (
        <div role="alert" className="p-3.5 bg-rose-50 border border-rose-200 rounded-xl flex items-center gap-2.5 text-rose-900 text-sm animate-in fade-in">
          <AlertCircle className="w-5 h-5 text-rose-600 shrink-0" />
          <span className="font-medium">{profileError}</span>
        </div>
      );
    }
    if (!profile) {
      return (
        <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xs p-6">
          <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100 mb-2">Complete your profile</h2>
          <p className="text-sm text-slate-600 dark:text-slate-400 mb-4">You do not have a student profile yet. Create one to get started.</p>
          <button
            onClick={openProfileModal}
            className="px-3.5 py-2 rounded-xl bg-primary hover:bg-primary text-white text-xs font-bold transition-all flex items-center gap-1.5 shadow-xs focus-visible:ring-2 focus-visible:ring-teal-600 focus-visible:outline-none"
          >
            Create Profile
          </button>
        </div>
      );
    }
    const details = [
      ['Student Name', profile.fullName],
      ['Student No.', profile.studentNumber],
      ['Registration No.', profile.registrationNumber],
      ['Email', profile.email],
      ['Intake', profile.intake],
      ['Program', profile.degreeProgram],
      ['Course Name', profile.courseName],
      ['Mobile No.', profile.phoneNumber],
      ['Year of Study', profile.yearOfStudy],
      ['Academic Year', profile.academicYear],
      ['Semester', profile.semester],
      ['Organisation', profile.organisation],
      ['Location', profile.location],
      ['Academic Supervisor', profile.academicSupervisor],
      ['Field Supervisor', profile.fieldSupervisor],
      ['Start Date', profile.startDate],
      ['End Date', profile.endDate],
    ];
    return (
      <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xs p-6">
        <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100 mb-1">My Profile</h2>
        <p className="text-xs text-slate-500 dark:text-slate-400 mb-5">Your student details as recorded in the system.</p>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-5">
          {details.map(([label, value]) => (
            <div key={label} className="bg-slate-50 dark:bg-slate-800/40 rounded-xl p-3 border border-slate-200 dark:border-slate-800">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-800 dark:text-slate-200">{label}</span>
              <p className="text-sm text-slate-700 dark:text-slate-300 mt-1">{value || '—'}</p>
            </div>
          ))}
        </div>
        <button
          onClick={openProfileModal}
          className="px-3.5 py-2 rounded-xl bg-primary hover:bg-primary text-white text-xs font-bold transition-all flex items-center gap-1.5 shadow-xs focus-visible:ring-2 focus-visible:ring-teal-600 focus-visible:outline-none"
        >
          <Pencil className="w-3.5 h-3.5" />
          Edit Profile
        </button>
      </div>
    );
  }

  function renderDiary() {
    return (
      <>
        <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xs p-6">
          <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100 mb-1">{editingDiaryId ? 'Edit Day Diary Entry' : 'New Day Diary Entry'}</h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mb-5">
            {editingDiaryId
              ? 'Update the activities and skills gained for this day.'
              : 'Record the activities and skills gained for a day.'}
          </p>
          <form id="diary-form" onSubmit={handleDiarySubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label htmlFor="diary-date" className={labelClass}>Date <span className="text-rose-600" aria-hidden="true">*</span></label>
                <input
                  id="diary-date"
                  type="date"
                  value={diaryForm.date}
                  onChange={(e) => setDiaryForm({ ...diaryForm, date: e.target.value })}
                  className={inputClass}
                />
              </div>
              <div>
                <label htmlFor="diary-account" className={labelClass}>Account Number</label>
                <input
                  id="diary-account"
                  type="text"
                  value={diaryForm.accountNumber}
                  onChange={(e) => setDiaryForm({ ...diaryForm, accountNumber: e.target.value })}
                  className={inputClass}
                  placeholder="Enter account number"
                />
              </div>
            </div>
            <div>
              <label htmlFor="diary-activities" className={labelClass}>Daily Activities <span className="text-rose-600" aria-hidden="true">*</span></label>
              <textarea
                id="diary-activities"
                rows="4"
                value={diaryForm.dailyActivities}
                onChange={(e) => setDiaryForm({ ...diaryForm, dailyActivities: e.target.value })}
                className={`${inputClass} min-h-[80px] resize-y`}
              />
            </div>
            <div>
              <label htmlFor="diary-skills" className={labelClass}>Knowledge &amp; Skills Gained</label>
              <textarea
                id="diary-skills"
                rows="3"
                value={diaryForm.knowledgeAndSkillsGained}
                onChange={(e) => setDiaryForm({ ...diaryForm, knowledgeAndSkillsGained: e.target.value })}
                className={`${inputClass} min-h-[60px] resize-y`}
              />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label htmlFor="diary-action" className={labelClass}>Action</label>
                <textarea
                  id="diary-action"
                  rows="3"
                  value={diaryForm.action}
                  onChange={(e) => setDiaryForm({ ...diaryForm, action: e.target.value })}
                  className={`${inputClass} min-h-[60px] resize-y`}
                  placeholder="Describe the action taken"
                />
              </div>
              <div>
                <label htmlFor="diary-tech" className={labelClass}>Technology / Tools Used</label>
                <textarea
                  id="diary-tech"
                  rows="3"
                  value={diaryForm.technologyTools}
                  onChange={(e) => setDiaryForm({ ...diaryForm, technologyTools: e.target.value })}
                  className={`${inputClass} min-h-[60px] resize-y`}
                  placeholder="List technologies or tools used"
                />
              </div>
            </div>
            <div>
              <label htmlFor="diary-accomplishments" className={labelClass}>Accomplishments</label>
              <textarea
                id="diary-accomplishments"
                rows="3"
                value={diaryForm.accomplishments}
                onChange={(e) => setDiaryForm({ ...diaryForm, accomplishments: e.target.value })}
                className={`${inputClass} min-h-[60px] resize-y`}
              />
            </div>
            <div className="flex items-center justify-end gap-3 pt-2">
              {editingDiaryId && (
                <button type="button" onClick={cancelEditDiary} className="px-3.5 py-2 rounded-xl bg-white dark:bg-slate-900 hover:bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs font-semibold border border-slate-300 dark:border-slate-700 transition-colors shadow-xs">
                  Cancel Edit
                </button>
              )}
              <button
                type="submit"
                className="px-3.5 py-2 rounded-xl bg-primary hover:bg-primary text-white text-xs font-bold transition-all flex items-center gap-1.5 shadow-xs focus-visible:ring-2 focus-visible:ring-teal-600 focus-visible:outline-none"
              >
                {editingDiaryId ? 'Update Entry' : 'Save Entry'}
              </button>
            </div>
          </form>
        </div>

        <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xs p-6">
          <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100 mb-4">My Diary Entries</h2>
          {diaryLoading && (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="w-5 h-5 text-teal-600 animate-spin" />
              <span className="ml-2 text-sm text-slate-500 dark:text-slate-400">Loading entries...</span>
            </div>
          )}
          {!diaryLoading && diaries.length === 0 && (
            <p className="text-sm text-slate-500 dark:text-slate-400 text-center py-8">No diary entries yet. Add your first entry above.</p>
          )}
          {!diaryLoading && diaries.length > 0 && (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-slate-200 dark:border-slate-800">
                    <th className="py-2.5 px-3 font-bold text-slate-800 dark:text-slate-200">Date</th>
                    <th className="py-2.5 px-3 font-bold text-slate-800 dark:text-slate-200">Account Number</th>
                    <th className="py-2.5 px-3 font-bold text-slate-800 dark:text-slate-200">Activities</th>
                    <th className="py-2.5 px-3 font-bold text-slate-800 dark:text-slate-200">Action</th>
                    <th className="py-2.5 px-3 font-bold text-slate-800 dark:text-slate-200">Skills Gained</th>
                    <th className="py-2.5 px-3 font-bold text-slate-800 dark:text-slate-200">Technology / Tools Used</th>
                    <th className="py-2.5 px-3 font-bold text-slate-800 dark:text-slate-200 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {diaries.map((entry) => (
                    <tr key={entry.id} className="border-b border-slate-100 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/40">
                      <td className="py-2.5 px-3 text-slate-700 dark:text-slate-300 whitespace-nowrap">{entry.date}</td>
                      <td className="py-2.5 px-3 text-slate-700 dark:text-slate-300">{entry.accountNumber || '—'}</td>
                      <td className="py-2.5 px-3 text-slate-700 dark:text-slate-300 max-w-[200px] truncate">{entry.dailyActivities || '—'}</td>
                      <td className="py-2.5 px-3 text-slate-700 dark:text-slate-300 max-w-[200px] truncate">{entry.action || '—'}</td>
                      <td className="py-2.5 px-3 text-slate-700 dark:text-slate-300 max-w-[200px] truncate">{entry.knowledgeAndSkillsGained || '—'}</td>
                      <td className="py-2.5 px-3 text-slate-700 dark:text-slate-300 max-w-[200px] truncate">{entry.technologyTools || '—'}</td>
                      <td className="py-2.5 px-3 text-right whitespace-nowrap">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => startEditDiary(entry)}
                            className="p-1.5 text-emerald-600 hover:text-emerald-800 hover:bg-emerald-50 rounded-lg transition-colors focus-visible:ring-2 focus-visible:ring-emerald-600 focus-visible:outline-none"
                            title="Edit"
                          >
                            <Pencil className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleDeleteDiary(entry.id)}
                            className="p-1.5 text-rose-600 hover:text-rose-800 hover:bg-rose-50 rounded-lg transition-colors focus-visible:ring-2 focus-visible:ring-rose-600 focus-visible:outline-none"
                            title="Delete"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => setReviewDiary(entry)}
                            className="px-2.5 py-1.5 text-teal-600 hover:text-teal-800 hover:bg-teal-50 rounded-lg transition-colors focus-visible:ring-2 focus-visible:ring-teal-600 focus-visible:outline-none text-[11px] font-bold"
                            title="View"
                          >
                            View
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {(diaries.length > 0) && (
            <div className="mt-6 space-y-4">
              <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">Supervisor Comments</h3>
              {diaries.map((entry) => (
                <div key={`comments-${entry.id}`} className="bg-slate-50 dark:bg-slate-800/40 rounded-xl p-4 border border-slate-200 dark:border-slate-800">
                  <p className="text-xs font-bold text-slate-800 dark:text-slate-200 mb-2">{entry.date}</p>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <span className="text-[11px] font-bold uppercase tracking-wider text-slate-800 dark:text-slate-200">Industrial Supervisor Comment</span>
                      <p className="text-sm text-slate-700 dark:text-slate-300 mt-1">{entry.industrialSupervisorComment || '—'}</p>
                    </div>
                    <div>
                      <span className="text-[11px] font-bold uppercase tracking-wider text-slate-800 dark:text-slate-200">University Supervisor Comment</span>
                      <p className="text-sm text-slate-700 dark:text-slate-300 mt-1">{entry.universitySupervisorComment || '—'}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </>
    );
  }

  return (
    <DashboardLayout
      title="Student Dashboard"
      subtitle="Welcome,"
      tabs={[
        { id: 'overview', label: 'Overview' },
        { id: 'profile', label: 'Profile' },
        { id: 'learning-institute', label: 'Learning Institute' },
        { id: 'companies', label: 'Companies' },
        { id: 'industrial-supervisor', label: 'Industrial Supervisor' },
        { id: 'university-supervisor', label: 'University Supervisor' },
        { id: 'settings', label: 'Settings' },
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

      {profileNotice && (
        <div role="status" className="p-3.5 bg-emerald-50 border border-emerald-200 rounded-xl flex items-center gap-2.5 text-emerald-950 text-sm animate-in fade-in">
          <CheckCircle className="w-5 h-5 text-emerald-700 shrink-0" />
          <span className="font-medium">{profileNotice}</span>
        </div>
      )}
      {diaryNotice && (
        <div role="status" className="p-3.5 bg-emerald-50 border border-emerald-200 rounded-xl flex items-center gap-2.5 text-emerald-950 text-sm animate-in fade-in">
          <CheckCircle className="w-5 h-5 text-emerald-700 shrink-0" />
          <span className="font-medium">{diaryNotice}</span>
        </div>
      )}
      {profileError && (
        <div role="alert" className="p-3.5 bg-rose-50 border border-rose-200 rounded-xl flex items-center gap-2.5 text-rose-900 text-sm animate-in fade-in">
          <AlertCircle className="w-5 h-5 text-rose-600 shrink-0" />
          <span className="font-medium">{profileError}</span>
        </div>
      )}
      {diaryError && (
        <div role="alert" className="p-3.5 bg-rose-50 border border-rose-200 rounded-xl flex items-center gap-2.5 text-rose-900 text-sm animate-in fade-in">
          <AlertCircle className="w-5 h-5 text-rose-600 shrink-0" />
          <span className="font-medium">{diaryError}</span>
        </div>
      )}

      {activeTab === 'overview' && (
        <StudentDataProvider>
          <OverviewSection />
        </StudentDataProvider>
      )}
      {activeTab === 'profile' && renderProfile()}
      {activeTab === 'learning-institute' && <LearningInstituteSection />}
      {activeTab === 'companies' && <CompaniesSection />}
      {activeTab === 'industrial-supervisor' && <IndustrialSupervisorSection />}
      {activeTab === 'university-supervisor' && <UniversitySupervisorSection />}
      {activeTab === 'settings' && <SettingsSection />}
      {activeTab === 'diary' && renderDiary()}

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
