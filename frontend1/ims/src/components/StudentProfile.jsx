import React, { useState, useEffect } from 'react';
import DashboardLayout from './DashboardLayout';
import {
  User,
  BookOpen,
  ClipboardCheck,
  Edit2,
  Download,
  CheckCircle2,
  CreditCard,
  Check,
  X,
  XCircle,
  Shield,
  Printer,
  RotateCcw,
  FileText,
  Info,
  Briefcase,
  Globe,
  Users,
} from 'lucide-react';
import {
  fetchMyProfile,
  fetchMyDiaries,
  fetchMyPlacement,
  fetchMyEvaluations,
  saveMyProfile,
  updateMyAccount,
} from '../services/api';

const DASH = '—';

function initialsOf(firstName, lastName) {
  const first = (firstName || '').trim().charAt(0);
  const last = (lastName || '').trim().charAt(0);
  return `${first}${last}`.toUpperCase() || DASH;
}

function ordinalYear(year) {
  const n = Number(year);
  if (!Number.isInteger(n) || n <= 0) return DASH;
  const suffix =
    n % 100 >= 11 && n % 100 <= 13
      ? 'th'
      : { 1: 'st', 2: 'nd', 3: 'rd' }[n % 10] || 'th';
  return `${n}${suffix} Year`;
}

function formatDepartment(name) {
  if (!name) return DASH;
  return /department$/i.test(name.trim()) ? name.trim() : `${name.trim()} Department`;
}

function asArray(list) {
  if (Array.isArray(list)) return list;
  return Array.isArray(list && list.content) ? list.content : [];
}

function placeholderStudent() {
  return {
    fullName: DASH,
    studentId: DASH,
    registrationNumber: DASH,
    initials: DASH,
    department: DASH,
    program: DASH,
    year: DASH,
    gender: DASH,
    email: DASH,
    universityName: DASH,
    companyName: DASH,
    companyBranch: DASH,
    companyAddress: DASH,
    companyWebsite: DASH,
    universitySupervisor: DASH,
    universitySupervisorPhone: DASH,
    industrialSupervisor: DASH,
    industrialSupervisorPhone: DASH,
  };
}

function buildStudent(p, placement) {
  const base = placeholderStudent();
  if (!p) return base;
  return {
    ...base,
    fullName: p.fullName || DASH,
    studentId: p.studentNumber || DASH,
    registrationNumber: p.registrationNumber || DASH,
    initials: initialsOf(p.firstName, p.lastName),
    department: formatDepartment(p.departmentName),
    program: p.degreeProgram || DASH,
    year: ordinalYear(p.yearOfStudy),
    gender: p.gender || DASH,
    email: p.email || DASH,
    universityName: p.universityName || DASH,
    companyName: p.companyName || DASH,
    companyBranch: p.companyBranch || DASH,
    companyAddress: p.companyAddress || DASH,
    companyWebsite: p.companyWebsite || DASH,
    universitySupervisor: p.universitySupervisor || DASH,
    universitySupervisorPhone: p.universitySupervisorPhone || DASH,
    industrialSupervisor: p.industrialSupervisor || DASH,
    industrialSupervisorPhone: p.industrialSupervisorPhone || DASH,
  };
}

const inputClass =
  'w-full bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 text-xs rounded-xl border border-slate-300 dark:border-slate-700 px-3.5 py-2.5 focus:border-teal-600 focus:ring-2 focus:ring-teal-600/20 focus:outline-none transition-all shadow-xs font-medium';
const labelClass =
  'block text-xs font-bold uppercase tracking-wider text-slate-800 dark:text-slate-200 mb-1.5';

export function StudentProfile({ defaultEditing = false }) {
  const [isEditing, setIsEditing] = useState(defaultEditing);
  const [editTab, setEditTab] = useState('basic');
  const [activeTab, setActiveTab] = useState('overview');
  const [isReportModalOpen, setIsReportModalOpen] = useState(false);
  const [reportSuccess, setReportSuccess] = useState(false);
  const [accountUpdateSuccess, setAccountUpdateSuccess] = useState(false);
  const [formNotice, setFormNotice] = useState('');

  const [student, setStudent] = useState(placeholderStudent);
  const [profile, setProfile] = useState(null);
  const [placement, setPlacement] = useState(null);
  const [diaries, setDiaries] = useState([]);
  const [evaluations, setEvaluations] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState('');

  useEffect(() => {
    setIsEditing(defaultEditing);
  }, [defaultEditing]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setIsLoading(true);
      setLoadError('');
      try {
        const [p, d, pl, ev] = await Promise.all([
          fetchMyProfile(),
          fetchMyDiaries().catch(() => []),
          fetchMyPlacement().catch(() => null),
          fetchMyEvaluations().catch(() => []),
        ]);
        if (cancelled) return;
        setProfile(p);
        setPlacement(pl || null);
        setDiaries(asArray(d));
        setEvaluations(asArray(ev));
        setStudent(buildStudent(p, pl));
      } catch (err) {
        if (!cancelled && err?.status === 404) {
          setProfile(null);
          setStudent(placeholderStudent());
        } else if (!cancelled) {
          setLoadError('Could not load your profile. Please try again.');
        }
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  const reloadProfile = async () => {
    try {
      const [p, pl, ev] = await Promise.all([
        fetchMyProfile(),
        fetchMyPlacement().catch(() => null),
        fetchMyEvaluations().catch(() => []),
      ]);
      setProfile(p);
      setPlacement(pl || null);
      setEvaluations(asArray(ev));
      setStudent(buildStudent(p, pl));
      return p;
    } catch {
      return null;
    }
  };

  const [editFormData, setEditFormData] = useState({
    fullName: '',
    registrationNumber: '',
    degreeProgram: '',
    gender: 'Male',
    yearOfStudy: '',
    email: '',
    phoneNumber: '',
    username: '',
  });

  const freshFormData = () => ({
    fullName: student.fullName === DASH ? '' : student.fullName,
    registrationNumber: profile?.registrationNumber || '',
    degreeProgram: profile?.degreeProgram || '',
    gender: student.gender === DASH ? 'Male' : student.gender,
    yearOfStudy: profile?.yearOfStudy || '',
    email: student.email === DASH ? '' : student.email,
    phoneNumber: profile?.phoneNumber || '',
    username: profile?.username || '',
  });

  const flashNotice = (msg) => {
    setFormNotice(msg);
    setTimeout(() => setFormNotice(''), 4000);
  };

  const handleOpenEdit = () => {
    setEditFormData(freshFormData());
    setFormNotice('');
    setIsEditing(true);
  };

  const handleCancelEdit = () => {
    setIsEditing(false);
    setFormNotice('');
  };

  const handleResetAccountChanges = () => {
    setEditFormData(freshFormData());
    setFormNotice('');
  };

  const handleUpdateBasicInfo = (e) => {
    e.preventDefault();
    const name = (editFormData.fullName || '').trim();
    const spaceIdx = name.indexOf(' ');
    const firstName = spaceIdx === -1 ? name : name.slice(0, spaceIdx).trim();
    const lastName = spaceIdx === -1 ? '' : name.slice(spaceIdx + 1).replace(/\s+/g, ' ').trim();

    const payload = {};
    if (firstName) payload.firstName = firstName;
    if (lastName !== undefined) payload.lastName = lastName;
    if (editFormData.gender) payload.gender = editFormData.gender;
    if (editFormData.yearOfStudy) payload.yearOfStudy = Number(editFormData.yearOfStudy);
    if (student.studentId !== DASH) payload.studentNumber = student.studentId;
    const regNo = (editFormData.registrationNumber || '').trim();
    if (regNo) payload.registrationNumber = regNo;
    const program = (editFormData.degreeProgram || '').trim();
    if (program) payload.degreeProgram = program;
    const phone = (editFormData.phoneNumber || '').trim();
    if (phone) payload.phoneNumber = phone;

    saveMyProfile(payload)
      .then(async () => {
        await reloadProfile();
        setIsEditing(false);
      })
      .catch(() => flashNotice('Could not save your profile. Please try again.'));
  };

  const handleUpdateAccountInfo = (e) => {
    e.preventDefault();
    if (!editFormData.email || !/^\S+@\S+\.\S+$/.test(editFormData.email)) {
      flashNotice('Please enter a valid email address.');
      return;
    }
    updateMyAccount({ email: editFormData.email })
      .then(() => {
        setStudent((prev) => ({ ...prev, email: editFormData.email }));
        setAccountUpdateSuccess(true);
        setTimeout(() => setAccountUpdateSuccess(false), 4000);
      })
      .catch(() => flashNotice('Could not update your email. Please try again.'));
  };

  const reportDiaryLine =
    diaries.length > 0
      ? `${diaries.length} diary entr${diaries.length === 1 ? 'y' : 'ies'} recorded`
      : DASH;

  const TABS = [
    { id: 'overview', label: 'Overview' },
    { id: 'placement', label: 'Placement & Company' },
    { id: 'diary', label: 'Diary Log', count: diaries.length },
    { id: 'evaluations', label: 'Evaluations', count: evaluations.length },
  ];

  if (isLoading) {
    return (
      <DashboardLayout title="Student Profile" subtitle="Loading...">
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 p-6 shadow-xs flex items-center gap-3 text-sm text-slate-500 dark:text-slate-400">
          <span className="inline-block w-4 h-4 rounded-full border-2 border-slate-300 dark:border-slate-600 border-t-transparent animate-spin" />
          Loading profile...
        </div>
      </DashboardLayout>
    );
  }

  if (loadError) {
    return (
      <DashboardLayout title="Student Profile" subtitle="Error">
        <div
          role="alert"
          className="p-3.5 bg-rose-50 border border-rose-200 rounded-xl flex items-center gap-2.5 text-rose-900 text-sm"
        >
          <XCircle className="w-5 h-5 text-rose-600 shrink-0" />
          <span className="font-medium">{loadError}</span>
        </div>
      </DashboardLayout>
    );
  }

  if (isEditing) {
    return (
      <DashboardLayout title="Edit Profile" subtitle={student.fullName}>
        <div className="max-w-4xl mx-auto space-y-6">
          {/* Breadcrumb */}
          <div className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400">
            <button
              type="button"
              onClick={handleCancelEdit}
              className="text-teal-600 dark:text-teal-400 hover:underline font-medium cursor-pointer"
            >
              Student Profile
            </button>
            <span className="text-slate-400">/</span>
            <span className="text-slate-500 dark:text-slate-400">Edit student</span>
          </div>

          {/* Header */}
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-3.5">
              <div className="w-12 h-12 rounded-full bg-primary text-white font-bold text-base flex items-center justify-center shrink-0 shadow-xs">
                {student.initials}
              </div>
              <div>
                <h2 className="text-xl font-bold text-slate-900 dark:text-slate-100 tracking-tight leading-tight">
                  Edit Student - {student.fullName}
                </h2>
                <p className="text-xs text-slate-500 dark:text-slate-400 font-normal mt-0.5">
                  Student ID: {student.studentId} | {student.department}
                </p>
              </div>
            </div>
            <span className="inline-flex items-center px-2.5 py-0.5 rounded text-xs font-semibold bg-emerald-600 text-white shadow-xs">
              Active
            </span>
          </div>

          {/* Edit Card */}
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 p-6 shadow-xs space-y-6">
            {accountUpdateSuccess && (
              <div className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-200 text-xs">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
                <span>Account information updated successfully!</span>
              </div>
            )}
            {formNotice && (
              <div className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-teal-50 dark:bg-teal-950/40 border border-teal-200 dark:border-teal-800 text-teal-800 dark:text-teal-200 text-xs">
                <Info className="w-4 h-4 text-teal-600 dark:text-teal-400 shrink-0" />
                <span>{formNotice}</span>
              </div>
            )}

            {/* Tabs */}
            <div className="flex items-center gap-2 overflow-x-auto pb-3 border-b border-slate-200 dark:border-slate-800">
              <button
                type="button"
                onClick={() => setEditTab('basic')}
                className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-medium transition-all whitespace-nowrap cursor-pointer ${
                  editTab === 'basic'
                    ? 'border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 shadow-xs'
                    : 'border border-transparent text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
                }`}
              >
                <User className="w-3.5 h-3.5" />
                <span>Basic Information</span>
              </button>

              <button
                type="button"
                onClick={() => setEditTab('account')}
                className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-medium transition-all whitespace-nowrap cursor-pointer ${
                  editTab === 'account'
                    ? 'border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 shadow-xs'
                    : 'border border-transparent text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
                }`}
              >
                <Shield className="w-3.5 h-3.5" />
                <span>Account Information</span>
              </button>
            </div>

            {/* TAB 1: BASIC INFORMATION */}
            {editTab === 'basic' && (
              <form onSubmit={handleUpdateBasicInfo} className="space-y-5">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  <div>
                    <label className={labelClass}>
                      Full Name <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={editFormData.fullName}
                      onChange={(e) => setEditFormData({ ...editFormData, fullName: e.target.value })}
                      className={inputClass}
                      required
                    />
                  </div>
                  <div>
                    <label className={labelClass}>
                      Student ID <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={student.studentId}
                      disabled
                      className={`${inputClass} bg-slate-50 dark:bg-slate-800/40 text-slate-500 dark:text-slate-400 cursor-not-allowed`}
                    />
                    <p className="text-[11px] text-slate-400 dark:text-slate-500 mt-1">
                      Student ID cannot be changed
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  <div>
                    <label className={labelClass}>Registration Number</label>
                    <input
                      type="text"
                      value={editFormData.registrationNumber}
                      onChange={(e) => setEditFormData({ ...editFormData, registrationNumber: e.target.value })}
                      className={inputClass}
                    />
                  </div>
                  <div>
                    <label className={labelClass}>Department</label>
                    <input
                      type="text"
                      value={student.department}
                      disabled
                      className={`${inputClass} bg-slate-50 dark:bg-slate-800/40 text-slate-500 dark:text-slate-400 cursor-not-allowed`}
                    />
                    <p className="text-[11px] text-slate-400 dark:text-slate-500 mt-1">
                      Department is managed by administration
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  <div>
                    <label className={labelClass}>Program</label>
                    <input
                      type="text"
                      value={editFormData.degreeProgram}
                      onChange={(e) => setEditFormData({ ...editFormData, degreeProgram: e.target.value })}
                      className={inputClass}
                    />
                  </div>
                  <div>
                    <label className={labelClass}>Year of Study</label>
                    <select
                      value={editFormData.yearOfStudy}
                      onChange={(e) => setEditFormData({ ...editFormData, yearOfStudy: e.target.value })}
                      className={inputClass}
                    >
                      <option value="">Select year</option>
                      {[1, 2, 3, 4, 5, 6, 7].map((y) => (
                        <option key={y} value={y}>{ordinalYear(y)}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  <div>
                    <label className={labelClass}>Gender</label>
                    <select
                      value={editFormData.gender}
                      onChange={(e) => setEditFormData({ ...editFormData, gender: e.target.value })}
                      className={inputClass}
                    >
                      <option value="Male">Male</option>
                      <option value="Female">Female</option>
                      <option value="Other">Other</option>
                    </select>
                  </div>
                  <div>
                    <label className={labelClass}>Phone Number</label>
                    <input
                      type="text"
                      value={editFormData.phoneNumber}
                      onChange={(e) => setEditFormData({ ...editFormData, phoneNumber: e.target.value })}
                      className={inputClass}
                    />
                  </div>
                </div>

                <div className="flex items-center gap-3 pt-2">
                  <button
                    type="submit"
                    className="px-4 py-2 rounded-xl bg-primary hover:bg-primary text-white text-xs font-bold transition-all flex items-center gap-1.5 shadow-xs"
                  >
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    Update Basic Information
                  </button>
                  <button
                    type="button"
                    onClick={handleCancelEdit}
                    className="px-4 py-2 rounded-xl bg-slate-200 hover:bg-slate-300 dark:bg-slate-700 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-200 text-xs font-semibold transition-colors flex items-center gap-1.5 shadow-xs"
                  >
                    <XCircle className="w-3.5 h-3.5" />
                    Cancel
                  </button>
                </div>
              </form>
            )}

            {/* TAB 2: ACCOUNT INFORMATION */}
            {editTab === 'account' && (
              <form onSubmit={handleUpdateAccountInfo} className="space-y-5">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  <div>
                    <label className={labelClass}>
                      Email Address <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="email"
                      value={editFormData.email}
                      onChange={(e) => setEditFormData({ ...editFormData, email: e.target.value })}
                      className={inputClass}
                      required
                    />
                  </div>
                  <div>
                    <label className={labelClass}>
                      Username <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={editFormData.username}
                      disabled
                      className={`${inputClass} bg-slate-50 dark:bg-slate-800/40 text-slate-500 dark:text-slate-400 cursor-not-allowed`}
                    />
                    <p className="text-[11px] text-slate-400 dark:text-slate-500 mt-1">
                      Username cannot be changed
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  <div>
                    <label className={labelClass}>Account Status</label>
                    <input
                      type="text"
                      value="Active"
                      disabled
                      className={`${inputClass} bg-slate-50 dark:bg-slate-800/40 text-slate-500 dark:text-slate-400 cursor-not-allowed`}
                    />
                  </div>
                  <div>
                    <label className={labelClass}>Role</label>
                    <input
                      type="text"
                      value="Student"
                      disabled
                      className={`${inputClass} bg-slate-50 dark:bg-slate-800/40 text-slate-500 dark:text-slate-400 cursor-not-allowed`}
                    />
                  </div>
                </div>

                <div className="flex items-center gap-3 pt-2">
                  <button
                    type="submit"
                    className="px-4 py-2 rounded-xl bg-primary hover:bg-primary text-white text-xs font-bold transition-all flex items-center gap-1.5 shadow-xs"
                  >
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    Update Account Information
                  </button>
                  <button
                    type="button"
                    onClick={handleResetAccountChanges}
                    className="px-4 py-2 rounded-xl bg-slate-200 hover:bg-slate-300 dark:bg-slate-700 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-200 text-xs font-semibold transition-colors flex items-center gap-1.5 shadow-xs"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    Reset Changes
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout
      title="Student Profile"
      subtitle={`${student.fullName} — ${student.studentId}`}
      tabs={TABS}
      activeTab={activeTab}
      onTabChange={setActiveTab}
    >
      {/* IDENTITY CARD */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 p-6 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6">
          <div className="flex items-center gap-5">
            <div className="w-20 h-20 rounded-full bg-primary text-white font-bold text-2xl tracking-wider flex items-center justify-center shrink-0 shadow-md">
              {student.initials}
            </div>
            <div className="min-w-0">
              <h2 className="text-2xl font-bold text-slate-900 dark:text-slate-100 tracking-tight">
                {student.fullName}
              </h2>
              <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">
                {student.department}
              </p>
              <div className="flex flex-wrap items-center gap-2 mt-2.5">
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md text-xs font-semibold bg-primary text-white shadow-xs">
                  <CreditCard className="w-3.5 h-3.5" />
                  <span>{student.studentId}</span>
                </span>
                <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-md text-xs font-semibold bg-emerald-600 text-white shadow-xs">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>Active</span>
                </span>
                <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-md text-xs font-semibold bg-teal-600 text-white shadow-xs">
                  <CreditCard className="w-3.5 h-3.5" />
                  <span>{student.year}</span>
                </span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3 self-start sm:self-center shrink-0">
            <button
              type="button"
              onClick={handleOpenEdit}
              className="px-3.5 py-2 rounded-xl bg-white dark:bg-slate-900 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs font-semibold border border-emerald-400 dark:border-emerald-600 transition-colors shadow-xs inline-flex items-center gap-1.5"
            >
              <Edit2 className="w-3.5 h-3.5 text-emerald-600" />
              Edit Profile
            </button>
            <button
              type="button"
              onClick={() => setIsReportModalOpen(true)}
              className="px-3.5 py-2 rounded-xl bg-white dark:bg-slate-900 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs font-semibold border border-slate-300 dark:border-slate-700 transition-colors shadow-xs inline-flex items-center gap-1.5"
            >
              <Download className="w-3.5 h-3.5" />
              Download Report
            </button>
          </div>
        </div>
      </div>

      {/* KPI CARDS */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 p-5 shadow-xs flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-blue-50 dark:bg-blue-950/40 text-blue-500 flex items-center justify-center shrink-0">
            <BookOpen className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">Diary Entries</p>
            <p className="text-2xl font-bold text-slate-900 dark:text-slate-100 mt-0.5">{diaries.length}</p>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 p-5 shadow-xs flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 text-emerald-500 flex items-center justify-center shrink-0">
            <Briefcase className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">Placement Status</p>
            <p className="text-2xl font-bold text-slate-900 dark:text-slate-100 mt-0.5">
              {placement?.status || DASH}
            </p>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 p-5 shadow-xs flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-amber-50 dark:bg-amber-950/40 text-amber-500 flex items-center justify-center shrink-0">
            <ClipboardCheck className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">Evaluations</p>
            <p className="text-2xl font-bold text-slate-900 dark:text-slate-100 mt-0.5">{evaluations.length}</p>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 p-5 shadow-xs flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-cyan-50 dark:bg-cyan-950/40 text-cyan-500 flex items-center justify-center shrink-0">
            <CreditCard className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">Year of Study</p>
            <p className="text-2xl font-bold text-slate-900 dark:text-slate-100 mt-0.5">{student.year}</p>
          </div>
        </div>
      </div>

      {/* TAB CONTENT */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-xs overflow-hidden">
        <div className="p-6 sm:p-8">
          {/* OVERVIEW TAB */}
          {activeTab === 'overview' && (
            <div className="space-y-8">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-16">
                {/* Left: Personal Information */}
                <div>
                  <h3 className="text-base font-bold text-slate-900 dark:text-slate-100 mb-5">
                    Personal Information
                  </h3>
                  <div className="space-y-3.5 text-sm">
                    {[
                      ['Full Name', student.fullName],
                      ['Student ID', student.studentId],
                      ['Registration No.', student.registrationNumber],
                      ['Gender', student.gender],
                      ['Email', student.email],
                    ].map(([label, value]) => (
                      <div key={label} className="grid grid-cols-[140px_1fr] sm:grid-cols-[160px_1fr] items-baseline gap-2">
                        <span className="text-slate-500 dark:text-slate-400">{label}:</span>
                        {label === 'Email' ? (
                          <a href={`mailto:${value}`} className="text-teal-600 dark:text-teal-400 hover:underline font-normal truncate">
                            {value}
                          </a>
                        ) : (
                          <span className="text-slate-800 dark:text-slate-200 font-normal">{value}</span>
                        )}
                      </div>
                    ))}
                  </div>
                </div>

                {/* Right: Academic Information */}
                <div>
                  <h3 className="text-base font-bold text-slate-900 dark:text-slate-100 mb-5">
                    Academic Information
                  </h3>
                  <div className="space-y-3.5 text-sm">
                    {[
                      ['Department', student.department],
                      ['Program', student.program],
                      ['Year', student.year],
                      ['University', student.universityName],
                    ].map(([label, value]) => (
                      <div key={label} className="grid grid-cols-[140px_1fr] sm:grid-cols-[160px_1fr] items-baseline gap-2">
                        <span className="text-slate-500 dark:text-slate-400">{label}:</span>
                        <span className="text-slate-800 dark:text-slate-200 font-normal">{value}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              <div className="border-t border-slate-100 dark:border-slate-800" />

              {/* Supervisor Contacts */}
              <div>
                <h3 className="text-base font-bold text-slate-900 dark:text-slate-100 mb-5">
                  Supervisor Contacts
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-sm">
                  <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-700 space-y-2">
                    <p className="font-semibold text-slate-800 dark:text-slate-100 flex items-center gap-2">
                      <Users className="w-4 h-4 text-teal-600" />
                      University Supervisor
                    </p>
                    <p className="text-slate-700 dark:text-slate-300">{student.universitySupervisor}</p>
                    <p className="text-xs text-slate-500 dark:text-slate-400">{student.universitySupervisorPhone}</p>
                  </div>
                  <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-700 space-y-2">
                    <p className="font-semibold text-slate-800 dark:text-slate-100 flex items-center gap-2">
                      <Briefcase className="w-4 h-4 text-teal-600" />
                      Industrial Supervisor
                    </p>
                    <p className="text-slate-700 dark:text-slate-300">{student.industrialSupervisor}</p>
                    <p className="text-xs text-slate-500 dark:text-slate-400">{student.industrialSupervisorPhone}</p>
                  </div>
                </div>
              </div>

              <div className="border-t border-slate-100 dark:border-slate-800" />

              {/* Company Block */}
              <div>
                <h3 className="text-base font-bold text-slate-900 dark:text-slate-100 mb-5">
                  Company
                </h3>
                <div className="space-y-3.5 text-sm">
                  {[
                    ['Company Name', student.companyName],
                    ['Branch', student.companyBranch],
                    ['Address', student.companyAddress],
                  ].map(([label, value]) => (
                    <div key={label} className="grid grid-cols-[140px_1fr] sm:grid-cols-[160px_1fr] items-baseline gap-2">
                      <span className="text-slate-500 dark:text-slate-400">{label}:</span>
                      <span className="text-slate-800 dark:text-slate-200 font-normal">{value}</span>
                    </div>
                  ))}
                  {student.companyWebsite !== DASH && (
                    <div className="grid grid-cols-[140px_1fr] sm:grid-cols-[160px_1fr] items-baseline gap-2">
                      <span className="text-slate-500 dark:text-slate-400">Website:</span>
                      <a
                        href={student.companyWebsite}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-teal-600 dark:text-teal-400 hover:underline font-normal inline-flex items-center gap-1"
                      >
                        <Globe className="w-3.5 h-3.5" />
                        {student.companyWebsite}
                      </a>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* PLACEMENT & COMPANY TAB */}
          {activeTab === 'placement' && (
            <div className="space-y-6">
              <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">
                Placement Record
              </h3>

              {!placement ? (
                <div className="py-12 flex flex-col items-center justify-center text-center">
                  <Briefcase className="w-8 h-8 text-slate-300 dark:text-slate-600 mb-3" />
                  <p className="text-sm text-slate-500 dark:text-slate-400">
                    No placement record found. Your supervisor will assign a placement when ready.
                  </p>
                </div>
              ) : (
                <div className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-sm">
                    <div className="space-y-3.5">
                      <h4 className="font-semibold text-slate-800 dark:text-slate-100">Placement Details</h4>
                      {[
                        ['Status', placement.status || DASH],
                        ['Start Date', placement.startDate || DASH],
                        ['End Date', placement.endDate || DASH],
                      ].map(([label, value]) => (
                        <div key={label} className="grid grid-cols-[130px_1fr] items-baseline gap-2">
                          <span className="text-slate-500 dark:text-slate-400">{label}:</span>
                          <span className="text-slate-800 dark:text-slate-200 font-normal">{value}</span>
                        </div>
                      ))}
                    </div>
                    <div className="space-y-3.5">
                      <h4 className="font-semibold text-slate-800 dark:text-slate-100">Supervisors</h4>
                      {[
                        ['University', placement.universitySupervisor || student.universitySupervisor],
                        ['Company', placement.companySupervisor || student.industrialSupervisor],
                      ].map(([label, value]) => (
                        <div key={label} className="grid grid-cols-[130px_1fr] items-baseline gap-2">
                          <span className="text-slate-500 dark:text-slate-400">{label}:</span>
                          <span className="text-slate-800 dark:text-slate-200 font-normal">{value}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="border-t border-slate-100 dark:border-slate-800" />

                  <div>
                    <h4 className="font-semibold text-slate-800 dark:text-slate-100 mb-4">Company Details</h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-sm">
                      {[
                        ['Company Name', student.companyName],
                        ['Branch', student.companyBranch],
                        ['Address', student.companyAddress],
                      ].map(([label, value]) => (
                        <div key={label} className="grid grid-cols-[130px_1fr] items-baseline gap-2">
                          <span className="text-slate-500 dark:text-slate-400">{label}:</span>
                          <span className="text-slate-800 dark:text-slate-200 font-normal">{value}</span>
                        </div>
                      ))}
                      {student.companyWebsite !== DASH && (
                        <div className="grid grid-cols-[130px_1fr] items-baseline gap-2">
                          <span className="text-slate-500 dark:text-slate-400">Website:</span>
                          <a
                            href={student.companyWebsite}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-teal-600 dark:text-teal-400 hover:underline font-normal inline-flex items-center gap-1"
                          >
                            <Globe className="w-3.5 h-3.5" />
                            {student.companyWebsite}
                          </a>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* DIARY LOG TAB */}
          {activeTab === 'diary' && (
            <div className="space-y-6">
              <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">
                Diary Log
              </h3>

              {diaries.length === 0 ? (
                <div className="py-12 flex flex-col items-center justify-center text-center">
                  <BookOpen className="w-8 h-8 text-slate-300 dark:text-slate-600 mb-3" />
                  <p className="text-sm text-slate-500 dark:text-slate-400">
                    No diary entries recorded yet. Start logging your daily activities from the dashboard.
                  </p>
                </div>
              ) : (
                <div className="overflow-x-auto -mx-6 sm:mx-0">
                  <table className="w-full text-left border-collapse text-sm min-w-[600px]">
                    <thead>
                      <tr className="border-b border-slate-200 dark:border-slate-800 text-slate-900 dark:text-slate-100 font-bold text-sm">
                        <th className="py-3 px-4 font-bold">Date</th>
                        <th className="py-3 px-4 font-bold">Activities</th>
                        <th className="py-3 px-4 font-bold">Skills Gained</th>
                        <th className="py-3 px-4 font-bold">Accomplishments</th>
                      </tr>
                    </thead>
                    <tbody>
                      {diaries.map((d, idx) => (
                        <tr
                          key={d.id || idx}
                          className="border-b border-slate-100 dark:border-slate-800/70 hover:bg-slate-50/70 dark:hover:bg-slate-800/40 transition-colors"
                        >
                          <td className="py-3.5 px-4 text-slate-800 dark:text-slate-200 font-normal whitespace-nowrap">
                            {d.date || DASH}
                          </td>
                          <td className="py-3.5 px-4 text-slate-700 dark:text-slate-300 font-normal max-w-[200px] truncate">
                            {d.dailyActivities || DASH}
                          </td>
                          <td className="py-3.5 px-4 text-slate-700 dark:text-slate-300 font-normal max-w-[200px] truncate">
                            {d.knowledgeAndSkillsGained || DASH}
                          </td>
                          <td className="py-3.5 px-4 text-slate-700 dark:text-slate-300 font-normal max-w-[200px] truncate">
                            {d.accomplishments || DASH}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {/* EVALUATIONS TAB */}
          {activeTab === 'evaluations' && (
            <div className="space-y-6">
              <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">
                Evaluations
              </h3>

              {evaluations.length === 0 ? (
                <div className="py-12 flex flex-col items-center justify-center text-center">
                  <ClipboardCheck className="w-8 h-8 text-slate-300 dark:text-slate-600 mb-3" />
                  <p className="text-sm text-slate-500 dark:text-slate-400">
                    No evaluations recorded yet. Your supervisors will submit evaluations during your internship.
                  </p>
                </div>
              ) : (
                <div className="overflow-x-auto -mx-6 sm:mx-0">
                  <table className="w-full text-left border-collapse text-sm min-w-[500px]">
                    <thead>
                      <tr className="border-b border-slate-200 dark:border-slate-800 text-slate-900 dark:text-slate-100 font-bold text-sm">
                        <th className="py-3 px-4 font-bold">Type</th>
                        <th className="py-3 px-4 font-bold">Supervisor</th>
                        <th className="py-3 px-4 font-bold">Grade</th>
                        <th className="py-3 px-4 font-bold">Date</th>
                      </tr>
                    </thead>
                    <tbody>
                      {evaluations.map((ev, idx) => (
                        <tr
                          key={ev.id || idx}
                          className="border-b border-slate-100 dark:border-slate-800/70 hover:bg-slate-50/70 dark:hover:bg-slate-800/40 transition-colors"
                        >
                          <td className="py-3.5 px-4 text-slate-800 dark:text-slate-200 font-normal capitalize">
                            {ev.supervisorType || DASH}
                          </td>
                          <td className="py-3.5 px-4 text-slate-700 dark:text-slate-300 font-normal">
                            {ev.supervisorName || ev.supervisorUsername || DASH}
                          </td>
                          <td className="py-3.5 px-4">
                            {ev.overallGrade != null ? (
                              <span className="inline-flex items-center justify-center text-xs font-bold text-white px-2 py-0.5 rounded bg-teal-600 min-w-[26px]">
                                {ev.overallGrade}%
                              </span>
                            ) : (
                              <span className="text-slate-400">{DASH}</span>
                            )}
                          </td>
                          <td className="py-3.5 px-4 text-slate-700 dark:text-slate-300 font-normal">
                            {ev.evaluationDate || ev.createdAt || DASH}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* REPORT MODAL */}
      {isReportModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white dark:bg-slate-900 rounded-2xl max-w-xl w-full p-6 shadow-2xl border border-slate-200 dark:border-slate-800 space-y-4 print-area">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-xl bg-teal-50 dark:bg-teal-950/40 text-teal-600">
                  <FileText className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100">
                    Official Internship Record
                  </h3>
                  <p className="text-xs text-slate-500">
                    Generated for {student.fullName} ({student.studentId})
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsReportModalOpen(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-5 rounded-xl border border-slate-200/80 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/50 space-y-3 text-xs">
              <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-3">
                <div className="font-bold text-sm text-slate-900 dark:text-white">
                  {student.universityName === DASH ? 'IMS ARCHIVES' : student.universityName.toUpperCase()}
                </div>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
                  CERTIFIED
                </span>
              </div>

              <div className="grid grid-cols-2 gap-2 text-slate-600 dark:text-slate-300">
                {[
                  ['Candidate', student.fullName],
                  ['Matriculation', student.studentId],
                  ['Reg. No.', student.registrationNumber],
                  ['Program', student.program],
                  ['University', student.universityName],
                  ['Standing', student.year],
                  ['Company', `${student.companyName}${student.companyBranch !== DASH ? ` (${student.companyBranch})` : ''}`],
                  ['Company Location', student.companyAddress],
                  ['University Supervisor', student.universitySupervisor],
                  ['Industrial Supervisor', student.industrialSupervisor],
                  ['Placement Status', placement?.status || DASH],
                  ['Diary Log', reportDiaryLine],
                ].map(([label, value]) => (
                  <div key={label}>
                    <strong className="text-slate-800 dark:text-slate-100">{label}:</strong> {value}
                  </div>
                ))}
              </div>

              {evaluations.length > 0 && (
                <div className="border-t border-slate-200 dark:border-slate-800 pt-2 space-y-1">
                  {evaluations.map((ev, idx) => (
                    <div key={idx} className="flex items-center justify-between">
                      <span className="font-semibold text-slate-800 dark:text-slate-100 capitalize">
                        {ev.supervisorType || 'Evaluation'}:
                      </span>
                      <span className="text-slate-600 dark:text-slate-300">
                        {ev.overallGrade != null ? `${ev.overallGrade}%` : DASH}
                      </span>
                    </div>
                  ))}
                </div>
              )}

              <p className="text-[11px] text-slate-400 pt-2 italic">
                This document certifies that the internship placement, company assignment,
                supervisor, diary and evaluation records contained herein reflect the true and
                official records of the named student.
              </p>
            </div>

            {reportSuccess && (
              <div className="p-3 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 text-xs font-semibold flex items-center gap-2">
                <Check className="w-4 h-4" />
                <span>Report downloaded successfully as PDF!</span>
              </div>
            )}

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setIsReportModalOpen(false)}
                className="px-4 py-2 rounded-lg text-sm text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                Close
              </button>
              <button
                type="button"
                onClick={() => {
                  window.print();
                  setReportSuccess(true);
                  setTimeout(() => setReportSuccess(false), 3000);
                }}
                className="px-4 py-2 rounded-lg text-sm font-semibold bg-primary hover:bg-primary text-white shadow-xs inline-flex items-center gap-2"
              >
                <Printer className="w-4 h-4" />
                <span>Print / Save PDF</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </DashboardLayout>
  );
}

export default StudentProfile;
