import { useEffect, useState } from 'react';
import DashboardLayout from '../DashboardLayout';
import CompanyEditModal from '../CompanyEditModal';
import { useAuth } from '../../context/AuthContext';
import {
  fetchCompany,
  fetchStudentsByCompany,
  updateCompany,
  fetchCompanySupervisors,
  createCompanySupervisor,
  resetUserPassword,
} from '../../services/api';
import {
  Building2,
  Pencil,
  GraduationCap,
  AlertCircle,
  X,
  CheckCircle,
  Users,
} from 'lucide-react';

export default function CompanyDashboard() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState('profile');
  const [company, setCompany] = useState(null);
  const [companyLoading, setCompanyLoading] = useState(true);
  const [interns, setInterns] = useState([]);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [editOpen, setEditOpen] = useState(false);
  const [refresh, setRefresh] = useState(0);
  const [supervisors, setSupervisors] = useState([]);
  const [supForm, setSupForm] = useState({ firstName: '', lastName: '', email: '', phone: '', department: '' });

  async function loadSupervisors() {
    setError('');
    try {
      const list = await fetchCompanySupervisors();
      setSupervisors(Array.isArray(list) ? list : []);
    } catch (err) {
      setError(err.message || 'Unable to load field supervisors.');
    }
  }

  async function handleSupervisorCreate(event) {
    event.preventDefault();
    setError('');
    setNotice('');
    try {
      const created = await createCompanySupervisor({
        firstName: supForm.firstName.trim(),
        lastName: supForm.lastName.trim(),
        email: supForm.email.trim(),
        phone: supForm.phone.trim(),
        department: supForm.department.trim(),
      });
      setNotice(`Created field supervisor ${created.username}. Their temporary password is ${created.username}123 — they must change it at first sign-in.`);
      setSupForm({ firstName: '', lastName: '', email: '', phone: '', department: '' });
      loadSupervisors();
    } catch (err) {
      setError(err.message || 'Unable to create the field supervisor.');
    }
  }

  async function handleSupervisorReset(person) {
    if (!window.confirm(`Reset the password for ${person.username}?`)) return;
    setError('');
    try {
      const { tempPassword } = await resetUserPassword(person.id);
      window.prompt('Temporary password (shown once):', tempPassword);
    } catch (err) {
      setError(err.message || 'Unable to reset the password.');
    }
  }

  useEffect(() => {
    if (user.companyId == null) {
      setCompany(null);
      setCompanyLoading(false);
      return;
    }
    setCompanyLoading(true);
    setError('');
    let cancelled = false;
    fetchCompany(user.companyId)
      .then((data) => {
        if (!cancelled) setCompany(data);
      })
      .catch((err) => {
        if (!cancelled) setError(err.message || 'Unable to load company profile.');
      })
      .finally(() => {
        if (!cancelled) setCompanyLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [user.companyId, refresh]);

  async function loadInterns() {
    setError('');
    try {
      setInterns(await fetchStudentsByCompany(user.companyId));
    } catch (err) {
      setError(err.message || 'Unable to load interns.');
    }
  }

  async function handleCompanySave(payload) {
    await updateCompany(user.companyId, payload);
    setNotice('Company profile updated successfully.');
    setRefresh((value) => value + 1);
  }

  function renderProfile() {
    if (companyLoading) {
      return (
        <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400 font-medium">
          <div className="w-4 h-4 border-2 border-teal-600 border-t-transparent rounded-full animate-spin" />
          <span>Loading company profile...</span>
        </div>
      );
    }
    if (user.companyId == null) {
      return (
        <section className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6 shadow-xs">
          <div className="flex flex-col items-center text-center py-4">
            <div className="w-12 h-12 rounded-full bg-amber-50 border border-amber-200 flex items-center justify-center text-amber-600 mb-3">
              <AlertCircle className="w-6 h-6" />
            </div>
            <h3 className="text-base font-bold text-slate-800 dark:text-slate-200">No company linked</h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 max-w-sm">Your account is not linked to a company yet. Please contact an administrator.</p>
          </div>
        </section>
      );
    }
    if (!company) {
      return (
        <div role="alert" className="p-3.5 bg-rose-50 border border-rose-200 rounded-xl flex items-center gap-2.5 text-rose-900 text-sm">
          <AlertCircle className="w-5 h-5 text-rose-600 shrink-0" />
          <span className="font-medium">Company profile not found.</span>
        </div>
      );
    }
    const details = [
      ['Company Name', company.name],
      ['Registration No.', company.registrationNumber],
      ['Industry', company.industry],
      ['Size', company.size],
      ['Country', company.country],
      ['City', company.city],
      ['Email', company.email],
      ['Phone', company.phone],
      ['Website', company.website],
      ['Physical Address', company.physicalAddress],
      ['Postal Address', company.postalAddress],
      ['Description', company.description],
    ];
    return (
      <section className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6 shadow-xs">
        <div className="flex items-center justify-between gap-4 mb-5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-teal-50 border border-teal-200 flex items-center justify-center text-teal-700">
              <Building2 className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">Company Profile</h3>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">Your company details as recorded in the system</p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setEditOpen(true)}
            className="h-9 px-3.5 py-2 rounded-xl bg-primary hover:bg-primary text-white text-xs font-bold shadow-xs transition-all flex items-center gap-1.5 focus-visible:ring-2 focus-visible:ring-teal-600 focus-visible:outline-none"
          >
            <Pencil className="w-4 h-4" />
            <span>Edit Profile</span>
          </button>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
          {details.map(([label, value]) => (
            <div key={label} className="bg-slate-50 dark:bg-slate-800/40 rounded-xl p-3 border border-slate-200 dark:border-slate-800">
              <div className="text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1">{label}</div>
              <div className="text-sm font-bold text-slate-900 dark:text-slate-100">{value || '—'}</div>
            </div>
          ))}
        </div>
      </section>
    );
  }

  function renderInterns() {
    if (user.companyId == null) {
      return (
        <section className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6 shadow-xs">
          <div className="flex flex-col items-center text-center py-4">
            <div className="w-12 h-12 rounded-full bg-amber-50 border border-amber-200 flex items-center justify-center text-amber-600 mb-3">
              <AlertCircle className="w-6 h-6" />
            </div>
            <h3 className="text-base font-bold text-slate-800 dark:text-slate-200">No company linked</h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 max-w-sm">Your account is not linked to a company, so no interns can be listed.</p>
          </div>
        </section>
      );
    }
    return (
      <section className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-200 dark:border-slate-800">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-50 border border-blue-200 flex items-center justify-center text-blue-700">
              <GraduationCap className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">Assigned Interns</h3>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">Students placed at your company</p>
            </div>
          </div>
        </div>
        <div className="overflow-x-auto custom-scrollbar">
          <table className="w-full text-left border-collapse" style={{ minWidth: '750px' }} aria-label="Assigned interns">
            <thead>
              <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-50/90 dark:bg-slate-800/60 text-[11px] font-bold tracking-wider text-slate-800 dark:text-slate-200">
                <th scope="col" className="py-3.5 px-3 pl-5">Name</th>
                <th scope="col" className="py-3.5 px-3">Email</th>
                <th scope="col" className="py-3.5 px-3">Student Number</th>
                <th scope="col" className="py-3.5 px-3">Degree Program</th>
                <th scope="col" className="py-3.5 px-3">Year</th>
                <th scope="col" className="py-3.5 px-3 pr-5">Phone</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-sm">
              {interns.length > 0 ? (
                interns.map((intern) => (
                  <tr key={intern.id} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/60 transition-colors">
                    <td className="py-3.5 px-3 pl-5">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg bg-teal-50 text-teal-700 border border-teal-200 flex items-center justify-center shrink-0 shadow-xs">
                          <GraduationCap className="w-4 h-4" />
                        </div>
                        <span className="font-bold text-slate-900 dark:text-slate-100">{intern.firstName} {intern.lastName}</span>
                      </div>
                    </td>
                    <td className="py-3.5 px-3 text-xs text-slate-600 dark:text-slate-400">{intern.email}</td>
                    <td className="py-3.5 px-3 text-xs text-slate-600 dark:text-slate-400">{intern.studentNumber}</td>
                    <td className="py-3.5 px-3 text-xs text-slate-600 dark:text-slate-400">{intern.degreeProgram}</td>
                    <td className="py-3.5 px-3 text-xs text-slate-600 dark:text-slate-400">{intern.yearOfStudy}</td>
                    <td className="py-3.5 px-3 pr-5 text-xs text-slate-600 dark:text-slate-400">{intern.phoneNumber}</td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={6} className="py-12 px-4 text-center">
                    <div className="max-w-sm mx-auto flex flex-col items-center">
                      <div className="w-12 h-12 rounded-full bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-800 flex items-center justify-center text-slate-400 mb-3">
                        <GraduationCap className="w-6 h-6" />
                      </div>
                      <h3 className="text-base font-bold text-slate-800 dark:text-slate-200">No interns assigned</h3>
                      <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">No interns assigned to your company yet.</p>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
    );
  }

  function renderSupervisors() {
    const inputClass = 'w-full bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100 text-sm rounded-xl border-2 border-slate-200 dark:border-slate-700 px-3.5 py-2.5 focus:border-primary focus:outline-none transition-all font-medium';
    return (
      <div className="space-y-6">
        <section className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-5">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 rounded-xl bg-teal-50 border border-teal-200 flex items-center justify-center text-teal-700">
              <Users className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">Add a field supervisor</h3>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                They get a temporary password <code>username123</code> and must change it at first sign-in.
              </p>
            </div>
          </div>
          <form onSubmit={handleSupervisorCreate} className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <input className={inputClass} placeholder="First name" value={supForm.firstName}
              onChange={(e) => setSupForm({ ...supForm, firstName: e.target.value })} />
            <input className={inputClass} placeholder="Last name" value={supForm.lastName}
              onChange={(e) => setSupForm({ ...supForm, lastName: e.target.value })} />
            <input className={inputClass} type="email" placeholder="Email" value={supForm.email}
              onChange={(e) => setSupForm({ ...supForm, email: e.target.value })} />
            <input className={inputClass} placeholder="Phone (optional)" value={supForm.phone}
              onChange={(e) => setSupForm({ ...supForm, phone: e.target.value })} />
            <input className={inputClass} placeholder="Department (optional)" value={supForm.department}
              onChange={(e) => setSupForm({ ...supForm, department: e.target.value })} />
            <button type="submit" className="px-4 py-2.5 rounded-xl bg-primary text-white text-xs font-bold">
              Create supervisor
            </button>
          </form>
        </section>

        <section className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden">
          <div className="px-5 py-4 border-b border-slate-200 dark:border-slate-800">
            <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">My field supervisors</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs min-w-[560px]">
              <thead>
                <tr className="bg-slate-50 dark:bg-slate-800/60 text-[11px] font-bold uppercase tracking-wider text-slate-600 dark:text-slate-300">
                  <th className="px-5 py-3">User</th>
                  <th className="px-4 py-3">Email</th>
                  <th className="px-4 py-3">Department</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-5 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {supervisors.map((person) => (
                  <tr key={person.id}>
                    <td className="px-5 py-3 font-semibold text-slate-800 dark:text-slate-100">{person.username}</td>
                    <td className="px-4 py-3 text-slate-600 dark:text-slate-300">{person.email || '—'}</td>
                    <td className="px-4 py-3 text-slate-600 dark:text-slate-300">{person.role}</td>
                    <td className="px-4 py-3">
                      <span className={person.enabled ? 'text-emerald-600' : 'text-rose-600'}>
                        {person.enabled ? 'Active' : 'Disabled'}
                      </span>
                    </td>
                    <td className="px-5 py-3 text-right">
                      <button type="button"
                        className="px-2 py-1 rounded-lg border border-amber-200 text-amber-700"
                        onClick={() => handleSupervisorReset(person)}>
                        Reset
                      </button>
                    </td>
                  </tr>
                ))}
                {supervisors.length === 0 && (
                  <tr>
                    <td colSpan={5} className="px-5 py-8 text-center text-slate-500">No field supervisors yet.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    );
  }

  return (
    <DashboardLayout
      title="Company Dashboard"
      subtitle="Welcome,"
      tabs={[
        { id: 'profile', label: 'Profile' },
        { id: 'interns', label: 'Interns' },
        { id: 'supervisors', label: 'Field Supervisors' },
      ]}
      activeTab={activeTab}
      onTabChange={(tab) => {
        setActiveTab(tab);
        if (tab === 'interns' && user.companyId != null) {
          loadInterns();
        }
        if (tab === 'supervisors') {
          loadSupervisors();
        }
      }}
    >
      <div className="space-y-6 max-w-7xl mx-auto">

        {/* Notice Banner */}
        {notice && (
          <div role="status" className="p-3.5 bg-emerald-50 border border-emerald-200 rounded-xl flex items-center justify-between gap-3 text-emerald-900 text-sm animate-in fade-in">
            <div className="flex items-center gap-2.5">
              <CheckCircle className="w-5 h-5 text-emerald-600 shrink-0" />
              <span className="font-medium">{notice}</span>
            </div>
            <button type="button" onClick={() => setNotice('')} className="text-emerald-600 hover:text-emerald-900 p-1 rounded" aria-label="Dismiss">
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* Error Banner */}
        {error && (
          <div role="alert" className="p-3.5 bg-rose-50 border border-rose-200 rounded-xl flex items-center justify-between gap-3 text-rose-900 text-sm animate-in fade-in">
            <div className="flex items-center gap-2.5">
              <AlertCircle className="w-5 h-5 text-rose-600 shrink-0" />
              <span className="font-medium">{error}</span>
            </div>
            <button type="button" onClick={() => setError('')} className="text-rose-600 hover:text-rose-900 p-1 rounded" aria-label="Dismiss error">
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {activeTab === 'profile' && renderProfile()}
        {activeTab === 'interns' && renderInterns()}
        {activeTab === 'supervisors' && renderSupervisors()}
      </div>

      {editOpen && company && (
        <CompanyEditModal
          company={company}
          title="Edit Company Profile"
          onClose={() => setEditOpen(false)}
          onSubmit={handleCompanySave}
        />
      )}
    </DashboardLayout>
  );
}
